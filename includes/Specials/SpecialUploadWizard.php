<?php

namespace MediaWiki\Extension\UploadWizard\Specials;

use BitmapHandler;
use LogicException;
use MediaWiki\ChangeTags\ChangeTags;
use MediaWiki\Context\DerivativeContext;
use MediaWiki\Exception\PermissionsError;
use MediaWiki\Exception\UserBlockedError;
use MediaWiki\Extension\UploadWizard\Campaign;
use MediaWiki\Extension\UploadWizard\Config;
use MediaWiki\Extension\UploadWizard\Hooks;
use MediaWiki\Extension\UploadWizard\Tutorial;
use MediaWiki\Html\Html;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use MediaWiki\User\User;
use UploadBase;
use UploadFromUrl;

/**
 * Special:UploadWizard
 *
 * Easy to use multi-file upload page.
 *
 * @file
 * @ingroup SpecialPage
 * @ingroup Upload
 */

class SpecialUploadWizard extends SpecialPage {
	/**
	 * The name of the upload wizard campaign, or null when none is specified.
	 *
	 * @since 1.2
	 * @var string|null
	 */
	protected $campaign = null;

	/** @var UserOptionsLookup */
	private $userOptionsLookup;

	/**
	 * @param UserOptionsLookup $userOptionsLookup
	 */
	public function __construct( UserOptionsLookup $userOptionsLookup ) {
		$this->userOptionsLookup = $userOptionsLookup;
		parent::__construct( 'UploadWizard', 'upload' );
	}

	/**
	 * Replaces default execute method
	 * Checks whether uploading enabled, user permissions okay,
	 * @param string|null $subPage subpage, e.g. the "foo" in Special:UploadWizard/foo.
	 */
	public function execute( $subPage ) {
		// side effects: if we can't upload, will print error page to wgOut
		// and return false
		if ( !( $this->isUploadAllowed() && $this->isUserUploadAllowed( $this->getUser() ) ) ) {
			return;
		}

		$this->setHeaders();
		$this->outputHeader();

		$req = $this->getRequest();

		$urlArgs = [ 'caption', 'description', 'lat', 'lon', 'alt' ];

		$urlDefaults = [];
		foreach ( $urlArgs as $arg ) {
			$value = $req->getText( $arg );
			if ( $value ) {
				$urlDefaults[$arg] = $value;
			}
		}

		$categories = $req->getText( 'categories' );
		if ( $categories ) {
			$urlDefaults['categories'] = explode( '|', $categories );
		}

		$urlDefaults['objref'] = $req->getText( 'objref' ) ?: '';
		$urlDefaults['updateList'] = $req->getText( 'updateList' ) ?: '';

		Config::setUrlSetting( 'defaults', $urlDefaults );

		$fields = $req->getArray( 'fields' );
		$fieldDefaults = [];

		# Support id and id2 for field0 and field1
		# Legacy support for old URL structure. They override fields[]
		if ( $req->getText( 'id' ) ) {
			$fields[0] = $req->getText( 'id' );
		}

		if ( $req->getText( 'id2' ) ) {
			$fields[1] = $req->getText( 'id2' );
		}

		if ( $fields ) {
			foreach ( $fields as $index => $value ) {
				$fieldDefaults[$index]['initialValue'] = $value;
			}
		}

		Config::setUrlSetting( 'fields', $fieldDefaults );

		$this->handleCampaign();

		$out = $this->getOutput();

		// fallback for non-JS
		$out->addHTML( '<div class="mwe-upwiz-unavailable">' );
		$out->addHTML(
			Html::errorBox(
				$this->msg( 'mwe-upwiz-unavailable' )->parse()
			)
		);
		// create a simple form for non-JS fallback, which targets the old Special:Upload page.
		// at some point, if we completely subsume its functionality, change that to point here again,
		// but then we'll need to process non-JS uploads in the same way Special:Upload does.
		$derivativeContext = new DerivativeContext( $this->getContext() );
		$derivativeContext->setTitle( SpecialPage::getTitleFor( 'Upload' ) );
		$simpleForm = new UploadWizardSimpleForm( [], $derivativeContext, $this->getLinkRenderer() );
		$simpleForm->show();
		$out->addHTML( '</div>' );

		// global javascript variables
		$this->addJsVars( $subPage );

		// dependencies (css, js)
		$out->addModules( 'ext.uploadWizard.page' );
		// load spinner styles early
		$out->addModuleStyles( [ 'ext.uploadWizard.page.styles', 'jquery.spinner.styles' ] );

		// where the uploadwizard will go
		// TODO import more from UploadWizard's createInterface call.
		$out->addHTML( $this->getWizardHtml() );
	}

	/**
	 * Handles the campaign parameter.
	 *
	 * @since 1.2
	 */
	protected function handleCampaign() {
		$campaignName = $this->getRequest()->getVal( 'campaign' ) ??
			Config::getSetting( 'defaultCampaign' );

		if ( $campaignName !== null && $campaignName !== '' ) {
			$campaign = Campaign::newFromName( $campaignName );

			if ( $campaign === false ) {
				$this->displayError( $this->msg( 'mwe-upwiz-error-nosuchcampaign', $campaignName )->parse() );
			} elseif ( $campaign->getIsEnabled() ) {
				$this->campaign = $campaignName;
			} else {
				$this->displayError( $this->msg( 'mwe-upwiz-error-campaigndisabled', $campaignName )->parse() );
			}
		}
	}

	/**
	 * Display an error message.
	 *
	 * @since 1.2
	 *
	 * @param string $message
	 */
	protected function displayError( $message ) {
		$this->getOutput()->addHTML(
			Html::errorBox(
				$message
			)
		);
	}

	/**
	 * Adds some global variables for our use, as well as initializes the UploadWizard
	 *
	 * TODO once bug https://bugzilla.wikimedia.org/show_bug.cgi?id=26901
	 * is fixed we should package configuration with the upload wizard instead of
	 * in uploadWizard output page.
	 *
	 * @param string $subPage subpage, e.g. the "foo" in Special:UploadWizard/foo
	 */
	public function addJsVars( $subPage ) {
		$config = Config::getConfig( $this->campaign );

		if ( array_key_exists( 'trackingCategory', $config ) ) {
			if ( array_key_exists( 'campaign', $config['trackingCategory'] ) ) {
				if ( $this->campaign !== null ) {
					$config['trackingCategory']['campaign'] = str_replace(
						'$1',
						$this->campaign,
						$config['trackingCategory']['campaign']
					);
				} else {
					unset( $config['trackingCategory']['campaign'] );
				}
			}
		}
		// UploadFromUrl parameter set to true only if the user is allowed to upload a file
		// from a URL which we need to check in our Javascript implementation.
		if ( UploadFromUrl::isEnabled() && UploadFromUrl::isAllowed( $this->getUser() ) === true ) {
			$config['UploadFromUrl'] = true;
		} else {
			$config['UploadFromUrl'] = false;
		}

		// Get the user's default license. This will usually be 'default', but
		// can be a specific license like 'ownwork-cc-zero'.
		$userDefaultLicense = $this->userOptionsLookup->getOption( $this->getUser(), 'upwiz_deflicense' );

		if ( $userDefaultLicense !== 'default' ) {
			[ $userLicenseType, $userDefaultLicense ] = explode( '-', $userDefaultLicense, 2 );

			// Determine if the user's default license is valid for this campaign
			switch ( $config['licensing']['ownWorkDefault'] ) {
				case "own":
					$defaultInAllowedLicenses = in_array(
						$userDefaultLicense, $config['licensing']['ownWork']['licenses']
					);
					break;
				case "notown":
					$defaultInAllowedLicenses = in_array(
						$userDefaultLicense, Config::getThirdPartyLicenses()
					);
					break;
				case "choice":
					$defaultInAllowedLicenses = ( in_array(
							$userDefaultLicense, $config['licensing']['ownWork']['licenses']
						) ||
						in_array( $userDefaultLicense, Config::getThirdPartyLicenses() ) );
					break;
				default:
					throw new LogicException( 'Bad ownWorkDefault config' );
			}

			if ( $defaultInAllowedLicenses ) {
				if ( $userLicenseType === 'ownwork' ) {
					$userLicenseGroup = 'ownWork';
				} else {
					$userLicenseGroup = 'thirdParty';
				}
				$config['licensing'][$userLicenseGroup]['defaults'] = [ $userDefaultLicense ];
				$config['licensing']['defaultType'] = $userLicenseType;

				if ( $userDefaultLicense === 'custom' ) {
					$config['licenses']['custom']['defaultText'] =
						$this->userOptionsLookup->getOption( $this->getUser(), 'upwiz_deflicense_custom' );
				}
			}
		}

		// add an 'uploadwizard' tag, but only if it'll be allowed
		Hooks::addListDefinedTags( $tags );
		$status = ChangeTags::canAddTagsAccompanyingChange( $tags, $this->getUser() );
		$config['CanAddTags'] = $status->isOK();

		// Upload comment should be localized with respect to the wiki's language
		$config['uploadComment'] = [
			'ownWork' => $this->msg( 'mwe-upwiz-upload-comment-own-work' )
				->inContentLanguage()->plain(),
			'thirdParty' => $this->msg( 'mwe-upwiz-upload-comment-third-party' )
				->inContentLanguage()->plain()
		];

		$bitmapHandler = new BitmapHandler();
		$this->getOutput()->addJsConfigVars(
			[
				'UploadWizardConfig' => $config,
				'wgFileCanRotate' => $bitmapHandler->canRotate(),
			]
		);
	}

	/**
	 * Check if anyone can upload (or if other sitewide config prevents this)
	 * Side effect: will print error page to wgOut if cannot upload.
	 * @return bool true if can upload
	 */
	private function isUploadAllowed() {
		// Check uploading enabled
		if ( !UploadBase::isEnabled() ) {
			$this->getOutput()->showErrorPage( 'uploaddisabled', 'uploaddisabledtext' );
			return false;
		}

		// Check whether we actually want to allow changing stuff
		$this->checkReadOnly();

		// we got all the way here, so it must be okay to upload
		return true;
	}

	/**
	 * Check if the user can upload
	 * Side effect: will print error page to wgOut if cannot upload.
	 * @param User $user
	 * @throws PermissionsError
	 * @throws UserBlockedError
	 * @return bool true if can upload
	 */
	private function isUserUploadAllowed( User $user ) {
		// Check permissions
		$permissionRequired = UploadBase::isAllowed( $user );
		if ( $permissionRequired !== true ) {
			throw new PermissionsError( $permissionRequired );
		}

		// Check blocks
		if ( $user->isBlockedFromUpload() ) {
			// If the user is blocked from uploading then there is a block
			// @phan-suppress-next-line PhanTypeMismatchArgumentNullable
			throw new UserBlockedError( $user->getBlock() );
		}

		// we got all the way here, so it must be okay to upload
		return true;
	}

	/**
	 * Return the basic HTML structure for the entire page
	 * Will be enhanced by the javascript to actually do stuff
	 * @return string html
	 */
	protected function getWizardHtml() {
		$config = Config::getConfig( $this->campaign );

		if ( array_key_exists(
			'display', $config ) && array_key_exists( 'headerLabel', $config['display'] )
		) {
			$this->getOutput()->addHTML( $config['display']['headerLabel'] );
		}

		if ( array_key_exists( 'fallbackToAltUploadForm', $config )
			&& array_key_exists( 'altUploadForm', $config )
			&& $config['altUploadForm'] != ''
			&& $config[ 'fallbackToAltUploadForm' ]
		) {
			$linkHtml = '';
			$altUploadForm = Title::newFromText( $config[ 'altUploadForm' ] );
			if ( $altUploadForm instanceof Title ) {
				$linkHtml = Html::rawElement( 'p', [ 'style' => 'text-align: center;' ],
					Html::element( 'a', [ 'href' => $altUploadForm->getLocalURL() ],
						$config['altUploadForm']
					)
				);
			}

			return Html::rawElement(
				'div',
				[],
				Html::element(
					'p',
					[ 'style' => 'text-align: center' ],
					$this->msg( 'mwe-upwiz-extension-disabled' )->text()
				) . $linkHtml
			);
		}

		// always load the html: even if the tutorial is skipped, users can
		// still move back to view it
		$tutorialHtml = Tutorial::getHtml( $this->campaign );

		// TODO move this into UploadWizard.js or some other javascript resource so the upload wizard
		// can be dynamically included ( for example the add media wizard )
		return '<div id="upload-wizard" class="upload-section">' .
			'<div id="mwe-upwiz-tutorial-html" style="display:none;">' .
				$tutorialHtml .
			'</div>' .
			'<div class="mwe-first-spinner">' .
				new \MediaWiki\Widget\SpinnerWidget( [ 'size' => 'large' ] ) .
			'</div>' .
		'</div>';
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		return 'media';
	}
}
