<?php

namespace MediaWiki\Extension\UploadWizard\Specials;

use MediaWiki\Extension\UploadWizard\Campaign;
use MediaWiki\Html\Html;
use MediaWiki\SpecialPage\SpecialPage;
use Wikimedia\Rdbms\IConnectionProvider;

class SpecialCampaigns extends SpecialPage {

	/** @var \Wikimedia\Rdbms\IDatabase|\Wikimedia\Rdbms\IReadableDatabase */
	private $dbr;

	public function __construct( IConnectionProvider $dbProvider ) {
		parent::__construct( "Campaigns" );
		$this->dbr = $dbProvider->getReplicaDatabase();
	}

	/**
	 * @param string|null $subPage
	 */
	public function execute( $subPage ) {
		$request = $this->getRequest();

		$start = $request->getIntOrNull( 'start' );

		$limit = 50;

		$cond = [ 'campaign_enabled = 1' ];

		if ( $start !== null ) {
			$cond[] = 'campaign_id > ' . $start;
		}

		$res = $this->dbr->select(
			'uw_campaigns',
			[ 'campaign_id', 'campaign_name' ],
			$cond,
			__METHOD__,
			[ 'LIMIT' => $limit + 1 ]
		);

		$this->getOutput()->setPageTitleMsg( $this->msg( 'mwe-upload-campaigns-list-title' ) );
		$this->getOutput()->addModuleStyles( [ 'ext.uploadWizard.uploadCampaign.display' ] );
		$this->getOutput()->addHTML( '<dl>' );

		$curCount = 0;
		$lastId = null;

		foreach ( $res as $row ) {
			$curCount++;

			if ( $curCount > $limit ) {
				// We've an extra element. Paginate!
				$lastId = $row->campaign_id;
				break;
			} else {
				$campaign = Campaign::newFromName( $row->campaign_name );
				$this->getOutput()->addHTML( $this->getHtmlForCampaign( $campaign ) );
			}
		}
		$this->getOutput()->addHTML( '</dl>' );

		// Pagination links!
		if ( $lastId !== null ) {
			$this->getOutput()->addHTML( $this->getHtmlForPagination( $lastId ) );
		}
	}

	/**
	 * @param Campaign $campaign
	 *
	 * @return string
	 */
	private function getHtmlForCampaign( Campaign $campaign ) {
		$config = $campaign->getParsedConfig();
		$campaignURL = $campaign->getTitle()->getLocalURL();
		$campaignTitle = $config['title'] ?? htmlspecialchars( $campaign->getName() );
		$campaignDescription = $config['description'] ?? '';
		return Html::rawElement( 'dt', [],
				Html::rawElement( 'a', [ 'href' => $campaignURL ], $campaignTitle )
			) . Html::rawElement( 'dd', [], $campaignDescription );
	}

	/**
	 * @param int $firstId
	 *
	 * @return string
	 */
	private function getHtmlForPagination( $firstId ) {
		$nextHref = $this->getPageTitle()->getLocalURL( [ 'start' => $firstId ] );
		return Html::rawElement( 'div',
			[ 'id' => 'mwe-upload-campaigns-pagination' ],
			Html::element( 'a',
				[ 'href' => $nextHref ],
				$this->msg( 'mwe-upload-campaigns-pagination-next' )->text()
			)
		);
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		return 'media';
	}
}
