<?php
/**
 * Upload Campaign Content Model
 *
 * @file
 * @ingroup Extensions
 * @ingroup UploadWizard
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */


/**
 * Represents the configuration of an Upload Campaign
 */
class CampaignContent extends TextContent {

	function __construct( $text ) {
		parent::__construct( $text, 'Campaign' );
	}

	/**
	 * Decodes the Upload Campaign data into a PHP associative array.
	 * @return array: Schema array.
	 */
	function getJsonData() {
		return FormatJson::decode( $this->getNativeData(), true );
	}

	/**
	 * Checks user input JSON to make sure that it produces a valid campaign object
	 *
	 * @throws JsonSchemaException: If invalid.
	 * @return bool: True if valid.
	 */
	function validate() {
		global $wgUpwizDir;

		$campaign = $this->getJsonData();
		if ( !is_array( $campaign ) ) {
			throw new JsonSchemaException( wfMessage( 'eventlogging-invalid-json' )->parse() );
		}

		$schema = include( $wgUpwizDir . '/includes/CampaignSchema.php' );

		// Only validate fields we care about
		$campaignFields = array_keys( $schema['properties'] );

		$fullConfig = UploadWizardConfig::getConfig();

		$defaultCampaignConfig = array();

		foreach ( $fullConfig as $key => $value ) {
			if ( in_array( $key, $campaignFields ) ) {
				$defaultCampaignConfig[ $key ] = $value;
			}
		}

		$mergedConfig = UploadWizardConfig::array_replace_sanely( $defaultCampaignConfig, $campaign );

		return efSchemaValidate( $mergedConfig , $schema );
	}

	/**
	 * @return bool: Whether content is valid JSON Schema.
	 */
	function isValid() {
		try {
			return $this->validate();
		} catch ( JsonSchemaException $e ) {
			return false;
		}
	}

	/**
	 * Beautifies JSON prior to save.
	 * @param Title $title Title
	 * @param User $user User
	 * @param ParserOptions $popts
	 * @return JsonSchemaContent
	 */
	function preSaveTransform( Title $title, User $user, ParserOptions $popts ) {
		return new CampaignContent( efBeautifyJson( $this->getNativeData() ) );
	}

	// Override getParserOutput, since we require $title to generate our output
	function getParserOutput( Title $title,
		$revId = null,
		ParserOptions $otpions = null, $generateHtml = true
	) {
		$po = new ParserOutput();

		if ( $generateHtml ) {
			$po->setText( $this->generateHtml( $title ) );
		}

		return $po;
	}

	function generateHtml( $title ) {
		$context = RequestContext::getMain();

		$campaign = new UploadWizardCampaign( $title, $this->getJsonData() );
		$config = $campaign->getParsedConfig();

		$campaignTitle = array_key_exists( 'title', $config ) ? $config['title'] : $campaign->getName();
		$campaignDescription = array_key_exists( 'description', $config ) ? $config['description'] : '';
		$campaignViewMoreLink = $campaign->getTrackingCategory()->getFullURL();

		$gallery = ImageGalleryBase::factory( 'packed-hover' );
		$gallery->setContext( $context );
		$gallery->setWidths( 180 );
		$gallery->setHeights( 180 );
		$gallery->setShowBytes( false );

		$context->getOutput()->setSquidMaxage( UploadWizardConfig::getSetting( 'campaignSquidMaxAge' ) );

		$images = $campaign->getUploadedMedia();

		if ( $context->getUser()->isAnon() ) {
			$createAccountUrl = Skin::makeSpecialUrl( 'UserLogin/signup', array( 'returnto' => $campaign->getTitle()->getPrefixedText() ) );
			$uploadLink =
						Html::element( 'a',
							array( 'class' => 'mw-ui-big mw-ui-button mw-ui-primary', 'href' => $createAccountUrl ),
							wfMessage( 'mwe-upwiz-campaign-create-account-button' )->text()
						);
		} else {
			$uploadUrl = Skin::makeSpecialUrl( 'UploadWizard', array( 'campaign' => $campaign->getName() ) );
			$uploadLink =
						Html::element( 'a',
							array( 'class' => 'mw-ui-big mw-ui-button mw-ui-primary', 'href' => $uploadUrl ),
							wfMessage( 'mwe-upwiz-campaign-upload-button' )->text()
						);
		}

		if ( count( $images ) === 0 ) {
			$body = Html::element( 'div', array( 'id' => 'mw-campaign-no-uploads-yet' ), wfMessage( 'mwe-upwiz-campaign-no-uploads-yet' )->plain() );
		} else {
			foreach ( $images as $image ) {
				$gallery->add( $image );
			}

			$body =
				Html::rawElement( 'div', array( 'id' => 'mw-campaign-images' ), $gallery->toHTML() ) .
				Html::element( 'a',
					array( 'id' => 'mw-campaign-view-all', 'href' => $campaignViewMoreLink ),
					wfMessage( 'mwe-upwiz-campaign-view-all-media' )->text()
				);
		}

		return
			Html::rawElement( 'div', array( 'id' => 'mw-campaign-container' ),
				Html::rawElement( 'div', array( 'id' => 'mw-campaign-header' ),
					Html::rawElement( 'div', array( 'id' => 'mw-campaign-primary-info' ),
						// No need to escape these, since they are just parsed wikitext
						// Any stripping that needed to be done should've been done by the parser
						Html::rawElement( 'p', array( 'id' => 'mw-campaign-title' ), $campaignTitle ) .
						Html::rawElement( 'p', array( 'id' => 'mw-campaign-description' ), $campaignDescription ) .
					$uploadLink
					) .
					Html::rawElement( 'div', array( 'id' => 'mw-campaign-numbers' ),
						Html::rawElement( 'div', array( 'class' => 'mw-campaign-number-container' ),
							Html::element( 'div', array( 'class' => 'mw-campaign-number' ), $campaign->getTotalContributorsCount() ) .
							Html::element( 'span', array( 'class' => 'mw-campaign-number-desc' ), wfMessage( 'mwe-upwiz-campaign-contributors-count-desc')->plain() )

						) .
						Html::rawElement( 'div', array( 'class' => 'mw-campaign-number-container' ),
							Html::element( 'div', array( 'class' => 'mw-campaign-number' ), $campaign->getUploadedMediaCount() ) .
							Html::element( 'span', array( 'class' => 'mw-campaign-number-desc' ), wfMessage( 'mwe-upwiz-campaign-media-count-desc')->plain() )

						)
					)
				) .
				$body
			);
	}
}
