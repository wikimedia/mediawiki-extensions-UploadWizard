<?php

namespace MediaWiki\Extension\UploadWizard\Tests;

use MediaWiki\Extension\UploadWizard\Campaign;
use MediaWiki\Json\FormatJson;
use MediaWiki\Parser\ParserOutputLinkTypes;
use MediaWiki\Title\Title;
use MediaWikiIntegrationTestCase;
use Wikimedia\ObjectCache\HashBagOStuff;
use Wikimedia\ObjectCache\WANObjectCache;

/**
 * @group Upload
 * @group Database
 * @covers \MediaWiki\Extension\UploadWizard\Campaign
 */
class CampaignTest extends MediaWikiIntegrationTestCase {

	public function testExplicitConfigBypassesParsedConfigCache() {
		$clock = 1000.0;
		$cache = new WANObjectCache( [ 'cache' => new HashBagOStuff() ] );
		$cache->setMockTime( $clock );
		$this->setService( 'WANObjectCache', $cache );

		$title = Title::makeTitle( NS_CAMPAIGN, 'Uw-test-campaign' );
		$this->editPage( $title, FormatJson::encode( [ 'enabled' => true, 'title' => 'Current' ] ) );
		// as on save, so that configs cached afterwards aren't considered stale right away
		Campaign::newFromName( 'Uw-test-campaign' )->invalidateCache();

		// T394496: rendering an old revision (or an edit preview) must not
		// leave its config behind for the campaign's current revision
		$clock += 60;
		$old = new Campaign( $title, [ 'enabled' => true, 'title' => 'Old' ] );
		$this->assertSame( 'Old', $old->getParsedConfig()['title'] );

		$clock += 60;
		$current = Campaign::newFromName( 'Uw-test-campaign' );
		$this->assertSame( 'Current', $current->getParsedConfig()['title'] );

		// ... nor be given the current revision's cached config
		$clock += 60;
		$old = new Campaign( $title, [ 'enabled' => true, 'title' => 'Old' ] );
		$this->assertSame( 'Old', $old->getParsedConfig()['title'] );
	}

	public function testCampaignPageRecordsTemplatesWhileConfigIsCached() {
		$clock = 1000.0;
		$cache = new WANObjectCache( [ 'cache' => new HashBagOStuff() ] );
		$cache->setMockTime( $clock );
		$this->setService( 'WANObjectCache', $cache );

		$title = Title::makeTitle( NS_CAMPAIGN, 'Uw-test-campaign' );
		$this->editPage( $title, FormatJson::encode( [ 'enabled' => true, 'title' => '{{Uw-test-missing}}' ] ) );
		// as on save, so that configs cached afterwards aren't considered stale right away
		Campaign::newFromName( 'Uw-test-campaign' )->invalidateCache();

		$clock += 60;
		Campaign::newFromName( 'Uw-test-campaign' )->getParsedConfig();

		// T104509, T173642: the campaign page must record the templates its config uses,
		// even missing ones, so that their edits and creation invalidate the cache
		$clock += 60;
		$parserOutput = $this->getServiceContainer()->getContentRenderer()->getParserOutput(
			$this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $title )->getContent(),
			$title
		);
		$templates = array_map(
			static fn ( $item ) => $item['link']->getDBkey(),
			$parserOutput->getLinkList( ParserOutputLinkTypes::TEMPLATE, NS_TEMPLATE )
		);
		$this->assertSame( [ 'Uw-test-missing' ], $templates );
	}
}
