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

		// Name of the first campaign to list, for pagination
		$start = $request->getVal( 'start' );

		$limit = 50;

		$cond = [ 'campaign_enabled' => 1 ];

		if ( $start !== null ) {
			$cond[] = $this->dbr->expr( 'campaign_name', '>=', $start );
		}

		$res = $this->dbr->newSelectQueryBuilder()
			->select( [ 'campaign_name' ] )
			->from( 'uw_campaigns' )
			->where( $cond )
			->orderBy( 'campaign_name' )
			->limit( $limit + 1 )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->getOutput()->setPageTitleMsg( $this->msg( 'mwe-upload-campaigns-list-title' ) );
		$this->getOutput()->addModuleStyles( [ 'ext.uploadWizard.uploadCampaign.display' ] );
		$this->getOutput()->addHTML( '<ul>' );

		$curCount = 0;
		$nextName = null;

		foreach ( $res as $row ) {
			$curCount++;

			if ( $curCount > $limit ) {
				// We've an extra element, the first one of the next page. Paginate!
				$nextName = $row->campaign_name;
				break;
			} else {
				$campaign = Campaign::newFromName( $row->campaign_name );
				if ( !$campaign ) {
					continue;
				}
				$this->getOutput()->addHTML( $this->getHtmlForCampaign( $campaign ) );
			}
		}
		$this->getOutput()->addHTML( '</ul>' );

		// Pagination links!
		if ( $nextName !== null ) {
			$this->getOutput()->addHTML( $this->getHtmlForPagination( $nextName ) );
		}
	}

	private function getHtmlForCampaign( Campaign $campaign ): string {
		$config = $campaign->getParsedConfig();
		// The campaign name, as used in ?campaign=, followed by its title if any
		$html = $this->getLinkRenderer()->makeKnownLink(
			$campaign->getTitle(),
			$campaign->getTitle()->getText()
		);
		if ( ( $config['title'] ?? '' ) !== '' ) {
			$html .= $this->msg( 'colon-separator' )->escaped() . $config['title'];
		}

		return Html::rawElement( 'li', [], $html );
	}

	/**
	 * @param string $firstName Name of the first campaign on the next page
	 *
	 * @return string
	 */
	private function getHtmlForPagination( string $firstName ) {
		$nextHref = $this->getPageTitle()->getLocalURL( [ 'start' => $firstName ] );
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
