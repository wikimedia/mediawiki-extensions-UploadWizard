<?php
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
	// the HTML form without javascript
	private $simpleForm;

	/**
	 * The name of the upload wizard campaign, or null when none is specified.
	 *
	 * @since 1.2
	 * @var string|null
	 */
	protected $campaign = null;

	// $request is the request (usually wgRequest)
	// $par is everything in the URL after Special:UploadWizard. Not sure what we can use it for
	public function __construct( $request = null, $par = null ) {
		parent::__construct( 'UploadWizard', 'upload' );

		// create a simple form for non-JS fallback, which targets the old Special:Upload page.
		// at some point, if we completely subsume its functionality, change that to point here again,
	 	// but then we'll need to process non-JS uploads in the same way Special:Upload does.
		$this->simpleForm = new UploadWizardSimpleForm();
		$this->simpleForm->setTitle(
			SpecialPage::getTitleFor( 'Upload' )
		);
	}

	/**
	 * Replaces default execute method
	 * Checks whether uploading enabled, user permissions okay,
	 * @param $subPage, e.g. the "foo" in Special:UploadWizard/foo.
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

		// if query string includes 'skiptutorial=true' set config variable to true
		$skipTutorial = $req->getCheck( 'skiptutorial' );
		if ( $skipTutorial ) {
			$skip = in_array( $skipTutorial, array( '1', 'true' ) );
			UploadWizardConfig::setUrlSetting( 'skipTutorial', $skip );
		}

		$categories = $req->getText( 'categories' );
		if ( $categories ) {
			UploadWizardConfig::setUrlSetting( 'defaultCategories', explode( '|', $categories ) );
		}

		$ulrArgs = array(
			'id' => 'idFieldInitialValue',
			'description' => 'defaultDescription',
			'lat' => 'defaultLat',
			'lon' => 'defaultLon',
			'alt' => 'defaultAlt',
		);

		foreach ( $ulrArgs as $arg => $setting ) {
			$value = $req->getText( $arg );
			if ( $value ) {
				UploadWizardConfig::setUrlSetting( $setting, $value );
			}
		}

		$this->handleCampaign();

		$out = $this->getOutput();

		// fallback for non-JS
		$out->addHTML( '<noscript>' );
		$out->addHTML( '<p class="errorbox">' . $this->msg( 'mwe-upwiz-js-off' )->escaped() . '</p>' );
		$this->simpleForm->show();
		$out->addHTML( '</noscript>' );


		// global javascript variables
		$this->addJsVars( $subPage );

		// dependencies (css, js)
		$out->addModuleStyles( 'ext.uploadWizard' );
		$out->addModules( 'ext.uploadWizard' );

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
		$campaignName = $this->getRequest()->getVal( 'campaign' );

		if ( !is_null( $campaignName ) && $campaignName !== '' ) {
			$campaign = UploadWizardCampaigns::singleton()->selectRow( 'enabled', array( 'name' => $campaignName ) );

			if ( $campaign === false ) {
				$this->displayError( $this->msg( 'mwe-upwiz-error-nosuchcampaign', $campaignName )->text() );
			}
			else {
				if ( $campaign->getIsEnabled() ) {
					$this->campaign = $campaignName;
				}
				else {
					$this->displayError( $this->msg( 'mwe-upwiz-error-campaigndisabled', $campaignName )->text() );
				}
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
		$this->getOutput()->addHTML( Html::element(
			'span',
			array( 'class' => 'errorbox' ),
			$message
		) . '<br /><br /><br />' );
	}

	/**
	 * Adds some global variables for our use, as well as initializes the UploadWizard
	 *
	 * TODO once bug https://bugzilla.wikimedia.org/show_bug.cgi?id=26901
	 * is fixed we should package configuration with the upload wizard instead of
	 * in uploadWizard output page.
	 *
	 * @param subpage, e.g. the "foo" in Special:UploadWizard/foo
	 */
	public function addJsVars( $subPage ) {
		global $wgSitename;

		$config = UploadWizardConfig::getConfig( $this->campaign );

		$labelPageContent = $this->getPageContent( $config['idFieldLabelPage'] );
		if ( $labelPageContent !== false ) {
			$config['idFieldLabel'] = $labelPageContent;
		}

		$config['thanksLabel'] = $this->getPageContent( $config['thanksLabelPage'], true );

		$defaultLicense = $this->getUser()->getOption( 'upwiz_deflicense' );

		if ( $defaultLicense !== 'default' ) {
			$defaultLicense = explode( '-', $defaultLicense, 2 );
			$licenseType = $defaultLicense[0];
			$defaultLicense = $defaultLicense[1];

			if ( in_array( $defaultLicense, $config['licensesOwnWork']['licenses'] )
				|| in_array( $defaultLicense,  UploadWizardConfig::getThirdPartyLicenses() ) ) {

				$licenseGroup = $licenseType === 'ownwork' ? 'licensesOwnWork' : 'licensesThirdParty';
				$config[$licenseGroup]['defaults'] = array( $defaultLicense );
				$config['defaultLicenseType'] = $licenseType;
			}
		}

		if ( $config['enableChunked'] === 'opt-in' ) {
			// Respect individual user's opt-in settings
			$config['enableChunked'] = (bool)$this->getUser()->getOption( 'upwiz-chunked' );
		}

		$this->getOutput()->addScript(
			Skin::makeVariablesScript(
				array(
					'UploadWizardConfig' => $config
				) +
				// Site name is a true global not specific to Upload Wizard
				array(
					'wgSiteName' => $wgSitename
				)
			)
		);
	}

	/**
	 * Gets content of the specified page, or false if there is no such page.
	 * '$1' in $pageName is replaced by the code of the current language.
	 *
	 * @since 1.2
	 *
	 * @param string $pageName
	 * @param boolean $parse
	 * @param string $langCode
	 *
	 * @return string|false
	 */
	protected function getPageContent( $pageName, $parse = false, $langCode = null ) {
		$content = false;

		if ( trim( $pageName ) !== '' ) {
			if ( is_null( $langCode ) ) {
				$langCode = $this->getLanguage()->getCode();
			}

			$page = Title::newFromText( str_replace( '$1', $langCode, $pageName ) );

			if ( !is_null( $page ) && $page->exists() ) {
				$article = new Article( $page, 0 );
				$content = $article->getContent();

				if ( $parse ) {
					$content = $this->getOutput()->parse( $content );
				}
			}
		}

		// If no page was found, and the lang is not en, then see if there in an en version.
		if ( $content === false && $langCode != 'en' ) {
			$content = $this->getPageContent( $pageName, $parse, 'en' );
		}

		return $content;
	}

	/**
	 * Check if anyone can upload (or if other sitewide config prevents this)
	 * Side effect: will print error page to wgOut if cannot upload.
	 * @return boolean -- true if can upload
	 */
	private function isUploadAllowed() {
		// Check uploading enabled
		if ( !UploadBase::isEnabled() ) {
			$this->getOutput()->showErrorPage( 'uploaddisabled', 'uploaddisabledtext' );
			return false;
		}

		// XXX does wgEnableAPI affect all uploads too?

		// Check whether we actually want to allow changing stuff
		if ( wfReadOnly() ) {
			$this->getOutput()->readOnlyPage();
			return false;
		}

		// we got all the way here, so it must be okay to upload
		return true;
	}

	/**
	 * Check if the user can upload
	 * Side effect: will print error page to wgOut if cannot upload.
	 * @param User
	 * @return boolean -- true if can upload
	 */
	private function isUserUploadAllowed( $user ) {
		global $wgGroupPermissions;

		if ( !$user->isAllowed( 'upload' ) ) {
			if ( !$user->isLoggedIn() && ( $wgGroupPermissions['user']['upload']
				|| $wgGroupPermissions['autoconfirmed']['upload'] ) ) {
				// Custom message if logged-in users without any special rights can upload
				$returnstr = $this->getTitle();
				$values = $this->getRequest()->getValues();
				if ( isset( $values['title'] ) ) {
					unset( $values['title'] );
				}
				$rtq = wfArrayToCgi( $values );
				if ( $rtq && $rtq != '' ) {
					$returnstr .= '&returntoquery=' . $rtq;
				}
				$this->getOutput()->showErrorPage( 'uploadnologin', 'mwe-upwiz-error-nologin', $returnstr );
			} else {
				throw new  PermissionsError( 'upload' );
			}
			return false;
		}

		// Check blocks
		if ( $user->isBlocked() ) {
			throw new UserBlockedError( $this->getUser()->mBlock );
		}

		// we got all the way here, so it must be okay to upload
		return true;
	}

	/**
	 * Return the basic HTML structure for the entire page
	 * Will be enhanced by the javascript to actually do stuff
	 * @return {String} html
	 */
	protected function getWizardHtml() {
		global $wgExtensionAssetsPath;

		$globalConf = UploadWizardConfig::getConfig( $this->campaign );

		$headerContent = $this->getPageContent( $globalConf['headerLabelPage'] );
		if ( $headerContent !== false ) {
			$this->getOutput()->addWikiText( $headerContent );
		}

		if ( array_key_exists( 'fallbackToAltUploadForm', $globalConf )
			&& array_key_exists( 'altUploadForm', $globalConf )
			&& $globalConf['altUploadForm'] != ''
			&& $globalConf[ 'fallbackToAltUploadForm' ] 			) {

			$linkHtml = '';
			$altUploadForm = Title::newFromText( $globalConf[ 'altUploadForm' ] );
			if ( $altUploadForm instanceof Title ) {
				$linkHtml = Html::rawElement( 'p', array( 'style' => 'text-align: center;' ),
					Html::rawElement( 'a', array( 'href' => $altUploadForm->getLocalURL() ),
						$globalConf['altUploadForm']
					)
				);
			}

			return
				Html::rawElement( 'div', array( 'id' => 'upload-wizard', 'class' => 'upload-section' ),
					Html::rawElement( 'p', array( 'style' => 'text-align: center' ), wfMessage( 'mwe-upwiz-extension-disabled' )->text() )
					. $linkHtml
				);

		}

		$tutorialHtml = '';
		// only load the tutorial HTML if we aren't skipping the first step
		if ( !$this->getUser()->getBoolOption( 'upwiz_skiptutorial' ) && !$globalConf['skipTutorial'] ) {
			$tutorialHtml = UploadWizardTutorial::getHtml( $this->campaign );
		}

		// TODO move this into UploadWizard.js or some other javascript resource so the upload wizard
		// can be dynamically included ( for example the add media wizard )
		return
		  '<div id="upload-wizard" class="upload-section">'

			// if loading takes > 2 seconds display spinner. Note we are evading Resource Loader here, and linking directly. Because we want an image to appear if RL's package is late.
			// using some &nbsp;'s which is a bit of superstition, to make sure jQuery will hide this (it seems that it doesn't sometimes, when it has no content)
			// the min-width & max-width is copied from the #uploadWizard properties, so in nice browsers the spinner is right where the button will go.
		.	'<div id="mwe-first-spinner" style="min-width:750px; max-width:900px; height:200px; line-height:200px; text-align:center;">'
		.	'&nbsp;<img src="' . $wgExtensionAssetsPath . '/UploadWizard/resources/images/24px-spinner-0645ad.gif" width="24" height="24" />&nbsp;'
		.	'</div>'

		    // the arrow steps - hide until styled
		.   '<ul id="mwe-upwiz-steps" style="display:none;">'
		.     '<li id="mwe-upwiz-step-tutorial"><div>' . $this->msg( 'mwe-upwiz-step-tutorial' )->escaped() . '</div></li>'
		.     '<li id="mwe-upwiz-step-file"><div>' . $this->msg( 'mwe-upwiz-step-file' )->escaped() . '</div></li>'
		.     '<li id="mwe-upwiz-step-deeds"><div>'  . $this->msg( 'mwe-upwiz-step-deeds' )->escaped()  . '</div></li>'
		.     '<li id="mwe-upwiz-step-details"><div>'  . $this->msg( 'mwe-upwiz-step-details' )->escaped()  . '</div></li>'
		.     '<li id="mwe-upwiz-step-thanks"><div>'   . $this->msg( 'mwe-upwiz-step-thanks' )->escaped()  .  '</div></li>'
		.   '</ul>'

		    // the individual steps, all at once - hide until needed
		.   '<div id="mwe-upwiz-content">'

		.     '<div class="mwe-upwiz-stepdiv" id="mwe-upwiz-stepdiv-tutorial" style="display:none;">'
		.       '<div id="mwe-upwiz-tutorial">'
		.         $tutorialHtml
		.       '</div>'
		.       '<div class="mwe-upwiz-buttons">'
		.          '<input type="checkbox" id="mwe-upwiz-skip" value="1" name="skip">'
		.          '<label for="mwe-upwiz-skip">' . $this->msg('mwe-upwiz-skip-tutorial-future')->text() . '</label>'
		.          '<button class="mwe-upwiz-button-next">' . $this->msg( "mwe-upwiz-next" )->text()  . '</button>'
		.       '</div>'
		.     '</div>'

		.     '<div class="mwe-upwiz-stepdiv ui-helper-clearfix" id="mwe-upwiz-stepdiv-file" style="display:none;">'
		.       '<div id="mwe-upwiz-files">'
		.         '<div id="mwe-upwiz-filelist" class="ui-corner-all"></div>'
		.         '<div id="mwe-upwiz-upload-ctrls" class="mwe-upwiz-file ui-helper-clearfix">'
		.            '<div id="mwe-upwiz-add-file-container" class="mwe-upwiz-add-files-0">'
		.              '<button id="mwe-upwiz-add-file">' . $this->msg( "mwe-upwiz-add-file-0-free" )->text() . '</button>'
		.  	     '</div>'
		.        '<div id="mwe-upwiz-upload-ctrl-container">'
		.           '<button id="mwe-upwiz-upload-ctrl">' . $this->msg( "mwe-upwiz-upload" )->text() . '</button>'
		.         '</div>'
		.         '</div>'
		.         '<div id="mwe-upwiz-progress" class="ui-helper-clearfix"></div>'
		.         '<div id="mwe-upwiz-continue" class="ui-helper-clearfix"></div>'
		.       '</div>'
		.       '<div class="mwe-upwiz-buttons">'
		.	   '<div class="mwe-upwiz-file-next-all-ok mwe-upwiz-file-endchoice">'
		.             $this->msg( "mwe-upwiz-file-all-ok" )->text()
		.             '<button class="mwe-upwiz-button-next">' . $this->msg( "mwe-upwiz-next-file" )->text()  . '</button>'
		.          '</div>'
		.	   '<div class="mwe-upwiz-file-next-some-failed mwe-upwiz-file-endchoice">'
		.             $this->msg( "mwe-upwiz-file-some-failed" )->text()
		.             '<button class="mwe-upwiz-button-retry">' . $this->msg( "mwe-upwiz-file-retry" )->text()  . '</button>'
		.             '<button class="mwe-upwiz-button-next">' . $this->msg( "mwe-upwiz-next-file-despite-failures" )->text()  . '</button>'
		.          '</div>'
		.	   '<div class="mwe-upwiz-file-next-all-failed mwe-upwiz-file-endchoice">'
		.             $this->msg( "mwe-upwiz-file-all-failed" )->text()
		.             '<button class="mwe-upwiz-button-retry"> ' . $this->msg( "mwe-upwiz-file-retry" )->text()  . '</button>'
		.          '</div>'
		.       '</div>'
		.     '</div>'

		.     '<div class="mwe-upwiz-stepdiv" id="mwe-upwiz-stepdiv-deeds" style="display:none;">'
		.       '<div id="mwe-upwiz-deeds-thumbnails" class="ui-helper-clearfix"></div>'
		.       '<div id="mwe-upwiz-deeds" class="ui-helper-clearfix"></div>'
		.       '<div id="mwe-upwiz-deeds-custom" class="ui-helper-clearfix"></div>'
		.       '<div class="mwe-upwiz-buttons">'
		.          '<button class="mwe-upwiz-button-next">' . $this->msg( "mwe-upwiz-next-deeds" )->text()  . '</button>'
		.       '</div>'
		.     '</div>'

		.     '<div class="mwe-upwiz-stepdiv" id="mwe-upwiz-stepdiv-details" style="display:none;">'
		.       '<div id="mwe-upwiz-reqd-field-explain-container"><span class="mwe-upwiz-required-marker">*</span> = ' . $this->msg( "mwe-upwiz-error-blank" )->text() . '</div>'
		.       '<div id="mwe-upwiz-macro-files" class="mwe-upwiz-filled-filelist ui-corner-all"></div>'
		.       '<div class="mwe-upwiz-buttons">'
		.	   '<div id="mwe-upwiz-details-error-count" class="mwe-upwiz-file-endchoice mwe-error"></div>'
		.	   '<div class="mwe-upwiz-start-next mwe-upwiz-file-endchoice">'
		.            '<button class="mwe-upwiz-button-next">' . $this->msg( "mwe-upwiz-next-details" )->text()  . '</button>'
		.          '</div>'
		.	   '<div class="mwe-upwiz-file-next-some-failed mwe-upwiz-file-endchoice">'
		.             $this->msg( "mwe-upwiz-file-some-failed" )->text()
		.             '<button class="mwe-upwiz-button-retry">' . $this->msg( "mwe-upwiz-file-retry" )->text()  . '</button>'
		.             '<button class="mwe-upwiz-button-next-despite-failures">' . $this->msg( "mwe-upwiz-next-file-despite-failures" )->text()  . '</button>'
		.          '</div>'
		.	   '<div class="mwe-upwiz-file-next-all-failed mwe-upwiz-file-endchoice">'
		.             $this->msg( "mwe-upwiz-file-all-failed" )->text()
		.             '<button class="mwe-upwiz-button-retry"> ' . $this->msg( "mwe-upwiz-file-retry" )->text()  . '</button>'
		.          '</div>'
		.       '</div>'
		.     '</div>'

		.     '<div class="mwe-upwiz-stepdiv" id="mwe-upwiz-stepdiv-thanks" style="display:none;">'
		.       '<div id="mwe-upwiz-thanks"></div>'
		.       '<div class="mwe-upwiz-buttons">'
		.          '<button class="mwe-upwiz-button-home">' . $this->msg( "mwe-upwiz-home" )->text() . '</button>'
		.          '<button class="mwe-upwiz-button-begin">' . $this->msg( "mwe-upwiz-upload-another" )->text()  . '</button>'
		.       '</div>'
		.     '</div>'

		.   '</div>'

		.   '<div class="mwe-upwiz-clearing"></div>'

		. '</div>';
	}

}


/**
 * This is a hack on UploadForm, to make one that works from UploadWizard when JS is not available.
 */
class UploadWizardSimpleForm extends UploadForm {

	/*
 	 * Normally, UploadForm adds its own Javascript.
 	 * We wish to prevent this, because we want to control the case where we have Javascript.
 	 * So, we make the addUploadJS a no-op.
	 */
	protected function addUploadJS( ) { }

}


