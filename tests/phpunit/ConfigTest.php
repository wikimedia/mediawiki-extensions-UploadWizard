<?php

namespace MediaWiki\Extension\UploadWizard\Tests;

use MediaWiki\Extension\UploadWizard\Campaign;
use MediaWiki\Extension\UploadWizard\Config;
use MediaWiki\Interwiki\ClassicInterwikiLookup;
use MediaWikiIntegrationTestCase;
use Title;

/**
 * Test the Upload Wizard Configuration
 *
 * @group Upload
 * @covers \MediaWiki\Extension\UploadWizard\Campaign
 * @covers \MediaWiki\Extension\UploadWizard\Config
 */
class ConfigTest extends MediaWikiIntegrationTestCase {
	protected function setUp(): void {
		parent::setUp();

		// Test expects empty defaults; otheriwse they will override the
		// parameters passed in by the test.
		Config::setUrlSetting( 'defaults', [] );

		// insert a interwiki prefixes for testing inter-language links.
		// This is based on ParserTestRunner::appendInterwikiSetup, which does
		// exactly the same (but with more prefixes) for parser tests.
		$this->setMwGlobals( [
			'wgInterwikiCache' => ClassicInterwikiLookup::buildCdbHash( [
				[
					'iw_prefix' => 'es',
					'iw_url' => 'http://es.wikipedia.org/wiki/$1',
					'iw_api' => '',
					'iw_wikiid' => '',
					'iw_local' => 1,
				],
			] ),
		] );
	}

	public static function objRefProvider() {
		return [
			[
				'',
				false
			],
			[
				'JustSomeString',
				false
			],
			[
				'notawiki|Page Title',
				false
			],
			[
				'es|Page Title',
				'http://es.wikipedia.org/wiki/Page Title'
			],
			[
				'es|Page Title|id12345',
				'http://es.wikipedia.org/wiki/Page Title'
			],
		];
	}

	/**
	 * @dataProvider objRefProvider
	 */
	public function testButtonTargetIsSetToUseObjRef_buttonHrefMatchesRefPage(
		$objRef, $expectedResult
	) {
		global $wgUploadWizardConfig;

		$this->setMwGlobals( [
			'wgUploadWizardConfig' => array_merge( $wgUploadWizardConfig, [
				'defaults' => [ 'objref' => $objRef ],
			] ),
		] );

		$this->assertEquals(
			$expectedResult,
			$this->getHomeButtonHref()
		);
	}

	private function getHomeButtonHref() {
		$campaign = new Campaign( Title::newFromText( 'uw-test-campaign', NS_CAMPAIGN ),
			[
				'enabled' => true,
				'display' => [
					'homeButton' => [
						'label' => 'Back to that list page',
						'target' => 'useObjref'
					]
				]
			]
		);

		$config = $campaign->getParsedConfig();
		return $config['display']['homeButton']['target'] ?? false;
	}
}
