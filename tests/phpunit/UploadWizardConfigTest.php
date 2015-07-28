<?php

/**
 * Test the Upload Wizard Configuration
 * @group Upload
 */

class UploadWizardConfigTest extends MediaWikiTestCase {

	public function testButtonTargetIsSetToUseObjRef_buttonHrefMatchesRefPage() {
		global $wgUploadWizardConfig;
		ParserTest::setupInterwikis();

		$this->setMwGlobals( array(
			'wgUploadWizardConfig' => array_merge( $wgUploadWizardConfig, array(
				'defaults' => array( 'objref' => 'es|My Monuments|12345' ),
			) ),
		) );

		$campaign = new UploadWizardCampaign(
			Title::newFromText( 'uw-test-campaign', NS_CAMPAIGN ),
			array(
				'enabled' => true,
				'display' => array(
					'homeButton' => array(
						'label' => 'Back to that list page',
						'target' => 'useObjref'
					)
				)
			)
		);
		$config = $campaign->getParsedConfig();

		$this->assertEquals(
			'http://es.wikipedia.org/wiki/My Monuments',
			$config['display']['homeButton']['target']
		);
	}

}
