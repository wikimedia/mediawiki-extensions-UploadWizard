<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\UploadWizard\Tests\Integration\Specials;

use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\UploadWizard\Specials\SpecialUploadWizard;
use MediaWiki\Output\OutputPage;
use MediaWiki\User\User;
use MediaWikiIntegrationTestCase;

/**
 * @group Database
 * @covers \MediaWiki\Extension\UploadWizard\Specials\SpecialUploadWizard
 */
class SpecialUploadWizardTest extends MediaWikiIntegrationTestCase {

	/**
	 * @dataProvider provideCaptchaConfigVarsScenarios
	 */
	public function testPublishCaptchaConfigVars(
		?array $captchaTriggers,
		array $userGroups,
		bool $withCaptchaFactory,
		bool $expectedPublishCaptchaRequired,
		bool $expectedPublishCaptchaType
	): void {
		if ( $withCaptchaFactory ) {
			$this->markTestSkippedIfExtensionNotLoaded( 'ConfirmEdit' );
			$this->overrideConfigValue( 'CaptchaClass', 'SimpleCaptcha' );
			$this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' )->unsetGlobalInstancesForTests();
		}
		$this->overrideConfigValue( 'CaptchaTriggers', $captchaTriggers );

		$user = $this->getTestUser( $userGroups )->getUser();
		$config = $this->setUpJsConfigVariables( $user, $withCaptchaFactory );

		$this->assertSame( $expectedPublishCaptchaRequired, $config['publishCaptchaRequired'] );
		if ( $expectedPublishCaptchaType ) {
			$this->assertArrayHasKey( 'publishCaptchaType', $config );
			$this->assertIsArray( $config['publishCaptchaType'] );
		} else {
			$this->assertArrayNotHasKey( 'publishCaptchaType', $config );
		}
	}

	public static function provideCaptchaConfigVarsScenarios(): array {
		return [
			'trigger on, user cannot skip' => [
				'captchaTriggers' => [ 'uploadwizard-publish' => true ],
				'userGroups' => [],
				'withCaptchaFactory' => true,
				'expectedPublishCaptchaRequired' => true,
				'expectedPublishCaptchaType' => true,
			],
			'user can skip via sysop group' => [
				'captchaTriggers' => [ 'uploadwizard-publish' => true ],
				'userGroups' => [ 'sysop' ],
				'withCaptchaFactory' => true,
				'expectedPublishCaptchaRequired' => false,
				'expectedPublishCaptchaType' => false,
			],
			'trigger off' => [
				'captchaTriggers' => [ 'uploadwizard-publish' => false ],
				'userGroups' => [],
				'withCaptchaFactory' => true,
				'expectedPublishCaptchaRequired' => false,
				'expectedPublishCaptchaType' => false,
			],
			'captcha factory unavailable' => [
				'captchaTriggers' => null,
				'userGroups' => [],
				'withCaptchaFactory' => false,
				'expectedPublishCaptchaRequired' => false,
				'expectedPublishCaptchaType' => false,
			],
		];
	}

	private function setUpJsConfigVariables( User $user, bool $withCaptchaFactory ): array {
		$services = $this->getServiceContainer();
		$captchaFactory = $withCaptchaFactory
			? $services->get( 'ConfirmEditCaptchaFactory' )
			: null;

		$special = new SpecialUploadWizard(
			$services->getUserOptionsLookup(),
			$captchaFactory
		);

		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setUser( $user );
		$output = new OutputPage( $context );
		$context->setOutput( $output );
		$special->setContext( $context );

		$special->addJsVars( null );

		return $output->getJsConfigVars()['UploadWizardConfig'];
	}
}
