<?php

/**
 * Test the Upload Wizard Configuration
 * @group Upload
 */

class UploadWizardConfigTest extends MediaWikiTestCase {

	public function objRefProvider() {
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
		ParserTest::setupInterwikis();

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
		$campaign = new UploadWizardCampaign( Title::newFromText( 'uw-test-campaign', NS_CAMPAIGN ),
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
		return isset(
			$config['display']['homeButton']['target']
		) ? $config['display']['homeButton']['target'] : false;
	}
}
