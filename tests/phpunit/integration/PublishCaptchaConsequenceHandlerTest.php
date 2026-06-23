<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\UploadWizard\Tests\Integration;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\AbuseFilter\Consequences\Parameters;
use MediaWiki\Extension\AbuseFilter\Filter\ExistingFilter;
use MediaWiki\Extension\ConfirmEdit\AbuseFilter\CaptchaConsequence;
use MediaWiki\Extension\ConfirmEdit\SimpleCaptcha\SimpleCaptcha;
use MediaWiki\Extension\UploadWizard\PublishCaptchaConsequenceHandler;
use MediaWiki\Extension\UploadWizard\PublishCaptchaHandler;
use MediaWiki\Request\FauxRequest;
use MediaWiki\User\UserIdentityValue;
use MediaWikiIntegrationTestCase;

/**
 * @group Database
 * @covers \MediaWiki\Extension\UploadWizard\PublishCaptchaConsequenceHandler
 */
class PublishCaptchaConsequenceHandlerTest extends MediaWikiIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();

		$this->markTestSkippedIfExtensionNotLoaded( 'ConfirmEdit' );
		$this->markTestSkippedIfExtensionNotLoaded( 'Abuse Filter' );

		$this->overrideConfigValue( 'CaptchaClass', 'SimpleCaptcha' );
		$this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' )->unsetGlobalInstancesForTests();
	}

	public function testForcesCaptchaForUploadWizardPublish(): void {
		RequestContext::getMain()->setRequest( new FauxRequest( [ PublishCaptchaHandler::PUBLISH_PARAM => '1' ] ) );

		$this->assertTrue( $this->newConsequence( 'upload' )->execute() );
		$this->assertTrue( $this->getCaptchaFor( PublishCaptchaHandler::TRIGGER )->shouldForceShowCaptcha() );
	}

	public function testDoesNotForceCaptchaWithoutTheMarker(): void {
		RequestContext::getMain()->setRequest( new FauxRequest( [] ) );

		$this->assertFalse( $this->newConsequence( 'upload' )->execute() );
		$this->assertFalse( $this->getCaptchaFor( PublishCaptchaHandler::TRIGGER )->shouldForceShowCaptcha() );
	}

	/**
	 * @dataProvider provideClaimCases
	 */
	public function testClaimsActionOnlyForUploadWizardPublish(
		string $action,
		array $requestParams,
		bool $expectedSupported
	): void {
		RequestContext::getMain()->setRequest( new FauxRequest( $requestParams ) );

		$captchaFactory = $this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' );
		$handler = new PublishCaptchaConsequenceHandler( $captchaFactory );

		$actionSupported = false;
		$handler->onConfirmEditBeforeForceShowCaptcha(
			new UserIdentityValue( 1, 'Test' ), $action, $actionSupported
		);

		$this->assertSame( $expectedSupported, $actionSupported );
		$this->assertSame(
			$expectedSupported,
			$this->getCaptchaFor( PublishCaptchaHandler::TRIGGER )->shouldForceShowCaptcha()
		);
	}

	public static function provideClaimCases(): array {
		return [
			'upload with publish param' => [ 'upload', [ 'uploadwizardpublish' => '1' ], true ],
			'upload with no param' => [ 'upload', [], false ],
			'upload with unrelated param' => [ 'upload', [ 'uploadwizardstash' => '1' ], false ],
			'stashupload is not claimed' => [ 'stashupload', [ 'uploadwizardpublish' => '1' ], false ],
			'unrelated action with publish param' => [ 'edit', [ 'uploadwizardpublish' => '1' ], false ],
		];
	}

	private function getCaptchaFor( string $action ): SimpleCaptcha {
		return $this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' )->getGlobalInstance( $action );
	}

	private function newConsequence( string $action ): CaptchaConsequence {
		$filter = $this->createMock( ExistingFilter::class );
		$filter->method( 'getID' )->willReturn( 1 );

		$parameters = $this->createMock( Parameters::class );
		$parameters->method( 'getAction' )->willReturn( $action );
		$parameters->method( 'getFilter' )->willReturn( $filter );
		$parameters->method( 'getUser' )->willReturn( $this->getTestUser()->getUser() );

		return new CaptchaConsequence(
			$parameters,
			$this->getServiceContainer()->getHookContainer(),
			$this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' ),
			$this->getServiceContainer()->getUserFactory()
		);
	}
}
