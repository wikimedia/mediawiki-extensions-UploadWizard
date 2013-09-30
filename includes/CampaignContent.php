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

		wfProfileIn( __METHOD__ );
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
		$result = efSchemaValidate( $mergedConfig , $schema );
		wfProfileOut( __METHOD__ );

		return $result;
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
		wfProfileIn( __METHOD__ );
		$campaign = new UploadWizardCampaign( $title, $this->getJsonData() );

		$formatter = new CampaignPageFormatter( $campaign );
		return $formatter->generateReadHtml();
	}
}
