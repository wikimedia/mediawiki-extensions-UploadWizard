<?php
/**
 * JSON Schema Content Handler
 *
 * @file
 * @ingroup Extensions
 * @ingroup UploadWizard
 *
 * @author Ori Livneh <ori@wikimedia.org>
 * @author Yuvi Panda <yuvipanda@gmail.com>
 */

class CampaignContentHandler extends JsonContentHandler {

	/**
	 * @param string $modelId
	 */
	public function __construct( $modelId = 'Campaign' ) {
		parent::__construct( $modelId );
	}

	/**
	 * @inheritDoc
	 */
	protected function getContentClass() {
		return CampaignContent::class;
	}

	/**
	 * @return CampaignContent
	 */
	public function makeEmptyContent() {
		$class = $this->getContentClass();
		return new $class( '{"enabled":false}' );
	}
}
