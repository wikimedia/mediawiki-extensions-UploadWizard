<?php
/**
 * @file
 * @ingroup Extensions
 * @ingroup UploadWizard
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */

namespace MediaWiki\Extension\UploadWizard;

use MediaWiki\Content\JsonContent;
use MediaWiki\Extension\EventLogging\EventLogging;
use MediaWiki\Extension\EventLogging\Libs\JsonSchemaValidation\JsonSchemaException;
use MediaWiki\Json\FormatJson;

/**
 * Upload Campaign Content Model
 *
 * Represents the configuration of an Upload Campaign
 */
class CampaignContent extends JsonContent {

	/**
	 * @param string $text
	 */
	public function __construct( $text ) {
		parent::__construct( $text, 'Campaign' );
	}

	/**
	 * Checks user input JSON to make sure that it produces a valid campaign object
	 *
	 * @throws JsonSchemaException If invalid.
	 * @return bool True if valid.
	 */
	public function validate() {
		$campaign = $this->getJsonData();
		if ( !is_array( $campaign ) ) {
			throw new JsonSchemaException( 'eventlogging-invalid-json' );
		}

		$schema = include __DIR__ . '/CampaignSchema.php';

		// Only validate fields we care about
		$campaignFields = array_keys( $schema['properties'] );

		$fullConfig = Config::getConfig();

		$defaultCampaignConfig = [];

		foreach ( $fullConfig as $key => $value ) {
			if ( in_array( $key, $campaignFields ) ) {
				$defaultCampaignConfig[ $key ] = $value;
			}
		}

		$mergedConfig = Config::arrayReplaceSensibly( $defaultCampaignConfig, $campaign );
		return EventLogging::schemaValidate( $mergedConfig, $schema );
	}

	/**
	 * @return bool Whether content is valid JSON Schema.
	 */
	public function isValid() {
		try {
			return parent::isValid() && $this->validate();
		} catch ( JsonSchemaException ) {
			return false;
		}
	}

	/**
	 * Deprecated in JsonContent but still useful here because we need to merge the schema's data
	 * with a config array
	 *
	 * @return array|null
	 */
	public function getJsonData() {
		return FormatJson::decode( $this->getText(), true );
	}
}
