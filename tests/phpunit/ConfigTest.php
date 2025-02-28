<?php

namespace MediaWiki\Extension\UploadWizard\Tests;

use MediaWiki\Extension\UploadWizard\Campaign;
use MediaWiki\Extension\UploadWizard\Config;
use MediaWiki\Interwiki\ClassicInterwikiLookup;
use MediaWiki\Title\Title;
use MediaWikiIntegrationTestCase;
use Wikimedia\TestingAccessWrapper;

/**
 * Test the Upload Wizard Configuration
 *
 * @group Upload
 * @group Database
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
		$this->overrideConfigValues( [
			'InterwikiCache' => ClassicInterwikiLookup::buildCdbHash( [
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

	protected function tearDown(): void {
		parent::tearDown();

		// T378299: Undo effect of Config::setUrlSetting() in setUp().
		// $wgUploadWizardConfig defaults to empty array, which MediaWiki/PHPUnit
		// automatically restore. This is not enough, because UploadWizard\Config
		// applies another layer of defaults from UploadWizard.config.php, which it
		// remembers via internal static $mergedConfig. This works in prod by doing
		// it once and then storing the result in-place in the global variable.
		// This does not work for more than 1 test in a row.
		TestingAccessWrapper::newFromClass( Config::class )->mergedConfig = false;
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

		$this->overrideConfigValues( [
			'UploadWizardConfig' => array_merge( $wgUploadWizardConfig, [
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
