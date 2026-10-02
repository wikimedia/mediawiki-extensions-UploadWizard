<?php
/**
 * @file
 * @ingroup Extensions
 * @ingroup UploadWizard
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */

namespace MediaWiki\Extension\UploadWizard;

use JsonSchema\Constraints\Constraint;
use JsonSchema\Validator;
use MediaWiki\Content\JsonContent;
use MediaWiki\Json\FormatJson;
use MediaWiki\Message\Message;
use StatusValue;

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
	 * @return StatusValue Fatal for each violation of the campaign schema
	 */
	public function validate(): StatusValue {
		$campaign = $this->getJsonData();
		if ( !is_array( $campaign ) ) {
			return StatusValue::newFatal( 'mwe-upwiz-campaign-invalid-json' );
		}

		$schema = include __DIR__ . '/CampaignSchema.php';
		// Don't allow unknown campaign fields, e.g. misspelled ones
		$schema['additionalProperties'] ??= false;

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

		$validator = new Validator();
		// Type cast to treat associative arrays as objects
		$validator->validate( $mergedConfig, $schema, Constraint::CHECK_MODE_TYPE_CAST );

		$status = StatusValue::newGood();
		foreach ( $validator->getErrors() as $error ) {
			if ( $error['property'] === '' ) {
				$status->fatal( 'mwe-upwiz-campaign-invalid', Message::plaintextParam( $error['message'] ) );
			} else {
				$status->fatal(
					'mwe-upwiz-campaign-invalid-property',
					Message::plaintextParam( $error['property'] ),
					Message::plaintextParam( $error['message'] )
				);
			}
		}
		return $status;
	}

	/**
	 * @return bool Whether content is valid JSON Schema.
	 */
	public function isValid() {
		return parent::isValid() && $this->validate()->isOK();
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
