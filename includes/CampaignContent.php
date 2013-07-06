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

		$mergedConfig = array_replace_recursive( $defaultCampaignConfig, $campaign );

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

	/**
	 * Constructs an HTML representation of a JSON object.
	 * @param Array $mapping
	 * @return string: HTML.
	 */
	static function objectTable( $mapping ) {
		$rows = array();

		foreach ( $mapping as $key => $val ) {
			$rows[] = self::objectRow( $key, $val );
		}
		return Xml::tags( 'table', array( 'class' => 'mw-json-schema' ),
			Xml::tags( 'tbody', array(), join( "\n", $rows ) )
		);
	}

	/**
	 * Constructs HTML representation of a single key-value pair.
	 * @param string $key
	 * @param mixed $val
	 * @return string: HTML.
	 */
	static function objectRow( $key, $val ) {
		$th = Xml::elementClean( 'th', array(), $key );
		if ( is_array( $val ) ) {
			$td = Xml::tags( 'td', array(), self::objectTable( $val ) );
		} else {
			if ( is_string( $val ) ) {
				$val = '"' . $val . '"';
			} else {
				$val = FormatJson::encode( $val );
			}

			$td = Xml::elementClean( 'td', array( 'class' => 'value' ), $val );
		}

		return Xml::tags( 'tr', array(), $th . $td );
	}

	/**
	 * Generates HTML representation of content.
	 * @return string: HTML representation.
	 */
	function getHighlightHtml() {
		$schema = $this->getJsonData();
		return is_array( $schema ) ? self::objectTable( $schema ) : '';
	}
}
