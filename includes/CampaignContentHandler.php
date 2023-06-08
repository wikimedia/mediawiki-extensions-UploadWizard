<?php

namespace MediaWiki\Extension\UploadWizard;

use Content;
use JsonContentHandler;
use MediaWiki\Content\Renderer\ContentParseParams;
use ParserOutput;
use Title;
use UnexpectedValueException;

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

	/**
	 * @inheritDoc
	 */
	protected function fillParserOutput(
		Content $content,
		ContentParseParams $cpoParams,
		ParserOutput &$parserOutput
	) {
		'@phan-var CampaignContent $content';
		$title = Title::castFromPageReference( $cpoParams->getPage() );
		if ( $title === null ) {
			throw new UnexpectedValueException( '$title shouldn\'t be NULL' );
		}

		$campaign = new Campaign( $title, $content->getJsonData() );

		if ( $cpoParams->getGenerateHtml() ) {
			$html = $this->generateHtml( $campaign );
			$parserOutput->setText( $html );
		}

		// Register template usage
		// FIXME: should we be registering other stuff??
		foreach ( $campaign->getTemplates() as $ns => $templates ) {
			foreach ( $templates as $dbk => $ids ) {
				$title = Title::makeTitle( $ns, $dbk );
				$parserOutput->addTemplate( $title, $ids[0], $ids[1] );
			}
		}

		$parserOutput->addModuleStyles( [ 'ext.uploadWizard.uploadCampaign.display' ] );
	}

	/**
	 * @param Campaign $campaign
	 *
	 * @return string
	 */
	private function generateHtml( $campaign ) {
		$formatter = new CampaignPageFormatter( $campaign );

		return $formatter->generateReadHtml();
	}
}
