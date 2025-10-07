<?php
/**
 * @file
 * @ingroup Extensions
 * @ingroup UploadWizard
 *
 * @author Ori Livneh <ori@wikimedia.org>
 * @author Yuvi Panda <yuvipanda@gmail.com>
 */

namespace MediaWiki\Extension\UploadWizard;

use MediaWiki\Content\Content;
use MediaWiki\Content\JsonContentHandler;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Title\Title;
use UnexpectedValueException;

/**
 * JSON Schema Content Handler
 */
class CampaignContentHandler extends JsonContentHandler {

	/**
	 * @param string $modelId
	 */
	public function __construct( $modelId = 'Campaign' ) {
		parent::__construct( $modelId );
	}

	/**
	 * @return class-string<CampaignContent>
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
		if ( !$title ) {
			throw new UnexpectedValueException( '$title shouldn\'t be NULL' );
		}

		$campaign = new Campaign( $title, $content->getJsonData() );

		if ( $cpoParams->getGenerateHtml() ) {
			$html = $this->generateHtml( $campaign );
			$parserOutput->setContentHolderText( $html );
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
