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

class CampaignContentHandler extends JSONContentHandler {

	public function __construct( $modelId = 'Campaign' ) {
		parent::__construct( $modelId, array( CONTENT_FORMAT_JSON ) );
	}

	protected $contentClass = 'CampaignContent';
}
