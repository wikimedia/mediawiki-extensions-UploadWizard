<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\UploadWizard\Tests\Integration;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMessage;
use MediaWiki\Api\ApiUpload;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\ConfirmEdit\Services\CaptchaFactory;
use MediaWiki\Extension\ConfirmEdit\SimpleCaptcha\SimpleCaptcha;
use MediaWiki\Extension\UploadWizard\PublishCaptchaHandler;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Request\WebRequest;
use MediaWiki\Upload\UploadFromStash;
use MediaWiki\User\User;
use MediaWikiIntegrationTestCase;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * @group Database
 * @covers \MediaWiki\Extension\UploadWizard\PublishCaptchaHandler
 */
class PublishCaptchaHandlerTest extends MediaWikiIntegrationTestCase {

	private const string LAST_SOLVED_TIMESTAMP_SESSION_KEY = 'uw-captcha-publish-solved';

	protected function setUp(): void {
		parent::setUp();

		$this->markTestSkippedIfExtensionNotLoaded( 'ConfirmEdit' );

		$this->overrideConfigValue( 'CaptchaClass', 'SimpleCaptcha' );
		$this->overrideConfigValue( 'CaptchaTriggers', [ PublishCaptchaHandler::TRIGGER => true ] );
		$this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' )->unsetGlobalInstancesForTests();
	}

	public function testReturnsTrueWhenUserCanSkipCaptcha(): void {
		$this->setGroupPermissions( 'sysop', 'skipcaptcha', true );
		$user = $this->getTestSysop()->getUser();
		$request = $this->createMock( WebRequest::class );
		$request
			->method( 'getBool' )
			->with( 'uploadwizardpublish' )
			->willReturn( true );
		$request
			->expects( $this->never() )
			->method( 'getSession' );

		[ $result, $error ] = $this->runOnUploadVerify( $request, $user );

		$this->assertTrue( $result );
		$this->assertNull( $error );
	}

	public function testReturnsTrueWhenCaptchaRecentlySolvedViaSession(): void {
		$user = $this->getTestUser()->getUser();
		$request = new FauxRequest( [ 'uploadwizardpublish' => '1' ] );
		$this->setRequest( $request );
		$request->getSession()->set( self::LAST_SOLVED_TIMESTAMP_SESSION_KEY, time() );

		[ $result, $error ] = $this->runOnUploadVerify( $request, $user );

		$this->assertTrue( $result );
		$this->assertNull( $error );
	}

	public function testReturnsFalseWithApiMessageWhenNoCaptchaToken(): void {
		$user = $this->getTestUser()->getUser();
		$request = new FauxRequest( [ 'uploadwizardpublish' => '1' ] );
		$this->setRequest( $request );

		[ $result, $error ] = $this->runOnUploadVerify( $request, $user );

		$this->assertCaptchaRequired( $result, $error );
	}

	public function testExpiredSessionFlagFallsThroughToVerify(): void {
		$baseTimestamp = 1700000000;
		ConvertibleTimestamp::setFakeTime( $baseTimestamp );

		$user = $this->getTestUser()->getUser();
		$request = new FauxRequest( [ 'uploadwizardpublish' => '1' ] );
		$this->setRequest( $request );
		$request->getSession()->set( self::LAST_SOLVED_TIMESTAMP_SESSION_KEY, $baseTimestamp );

		ConvertibleTimestamp::setFakeTime( $baseTimestamp + 200 );

		[ $result, $error ] = $this->runOnUploadVerify( $request, $user );

		$this->assertCaptchaRequired( $result, $error );
	}

	public function testOnAPIGetAllowedParamsDeclaresCaptchaParamsForUploadModule(): void {
		$module = $this->createMock( ApiUpload::class );
		$params = [];

		$this->newHandler( new FauxRequest() )->onAPIGetAllowedParams( $module, $params, 0 );

		$this->assertSame( [
			ParamValidator::PARAM_TYPE => 'string',
			ApiBase::PARAM_HELP_MSG => 'captcha-apihelp-param-captchaid',
		], $params['captchaid'] ?? null );
		$this->assertSame( [
			ParamValidator::PARAM_TYPE => 'string',
			ApiBase::PARAM_HELP_MSG => 'captcha-apihelp-param-captchaword',
		], $params['captchaword'] ?? null );
	}

	public function testOnAPIGetAllowedParamsIgnoresNonUploadModule(): void {
		$module = $this->createMock( ApiBase::class );
		$params = [ 'existing' => true ];

		$this->newHandler( new FauxRequest() )->onAPIGetAllowedParams( $module, $params, 0 );

		$this->assertSame( [ 'existing' => true ], $params );
	}

	public function testReturnsTrueForRegularUploadWithoutUploadWizardParam(): void {
		$user = $this->getTestUser()->getUser();
		$request = new FauxRequest();
		$this->setRequest( $request );

		[ $result, $error ] = $this->runOnUploadVerify( $request, $user );

		$this->assertTrue( $result );
		$this->assertNull( $error );
	}

	public function testForceShowFromAbuseFilterConsequenceIsEnforcedOnPublish(): void {
		// No trigger configured, so enforcement can only come from the force-show flag.
		$this->overrideConfigValue( 'CaptchaTriggers', [] );
		$factory = $this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' );
		$factory->unsetGlobalInstancesForTests();
		$factory->getGlobalInstance( PublishCaptchaHandler::TRIGGER )->setForceShowCaptcha( true );

		$user = $this->getTestUser()->getUser();
		$request = new FauxRequest( [ 'uploadwizardpublish' => '1' ] );
		$this->setRequest( $request );

		[ $result, $error ] = $this->runOnUploadVerify( $request, $user );

		$this->assertCaptchaRequired( $result, $error );
	}

	public function testForwardsCaptchaErrorCodeToClient(): void {
		// The captcha's error code (e.g. hCaptcha's "forceshowcaptcha") must reach the client
		// so it can switch to the always-challenge widget.
		$captcha = $this->createMock( SimpleCaptcha::class );
		$captcha->method( 'triggersCaptcha' )->willReturn( true );
		$captcha->method( 'shouldSkipCaptcha' )->willReturn( false );
		$captcha->method( 'passCaptchaFromRequest' )->willReturn( false );
		$captcha->method( 'getCaptchaApiData' )->willReturn( [ 'type' => 'hcaptcha', 'error' => 'forceshowcaptcha' ] );

		$factory = $this->createMock( CaptchaFactory::class );
		$factory->method( 'getGlobalInstance' )->willReturn( $captcha );

		$user = $this->getTestUser()->getUser();
		$request = new FauxRequest( [ 'uploadwizardpublish' => '1' ] );
		$this->setRequest( $request );

		$handler = new PublishCaptchaHandler( $request, RequestContext::getMain(), $factory );
		$error = null;
		$result = $handler->onUploadVerifyUpload(
			$this->createMock( UploadFromStash::class ), $user, null, '', '', $error
		);

		$this->assertCaptchaRequired( $result, $error );
		$this->assertSame( 'forceshowcaptcha', $error->getApiData()['captcha']['error'] );
	}

	public function testForceShowStillExemptsBotUsers(): void {
		$this->overrideConfigValue( 'CaptchaTriggers', [] );
		$factory = $this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' );
		$factory->unsetGlobalInstancesForTests();
		$factory->getGlobalInstance( PublishCaptchaHandler::TRIGGER )->setForceShowCaptcha( true );

		$user = $this->getTestUser( [ 'bot' ] )->getUser();
		$request = new FauxRequest( [ PublishCaptchaHandler::PUBLISH_PARAM => '1' ] );
		$this->setRequest( $request );

		[ $result, $error ] = $this->runOnUploadVerify( $request, $user );

		$this->assertTrue( $result );
		$this->assertNull( $error );
	}

	public function testForceShowOverridesSkipCaptchaRight(): void {
		$this->setGroupPermissions( 'sysop', 'skipcaptcha', true );
		$this->overrideConfigValue( 'CaptchaTriggers', [] );
		$factory = $this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' );
		$factory->unsetGlobalInstancesForTests();
		$factory->getGlobalInstance( PublishCaptchaHandler::TRIGGER )->setForceShowCaptcha( true );

		$user = $this->getTestSysop()->getUser();
		$request = new FauxRequest( [ 'uploadwizardpublish' => '1' ] );
		$this->setRequest( $request );

		[ $result, $error ] = $this->runOnUploadVerify( $request, $user );

		$this->assertCaptchaRequired( $result, $error );
	}

	private function runOnUploadVerify( WebRequest $request, User $user ): array {
		$error = null;
		$result = $this->newHandler( $request )->onUploadVerifyUpload(
			$this->createMock( UploadFromStash::class ), $user, null, '', '', $error
		);

		return [ $result, $error ];
	}

	private function assertCaptchaRequired( bool $result, $error ): void {
		$this->assertFalse( $result );
		$this->assertInstanceOf( ApiMessage::class, $error );
		$this->assertSame( 'captcha', $error->getApiCode() );
	}

	private function newHandler( WebRequest $request ): PublishCaptchaHandler {
		return new PublishCaptchaHandler(
			$request,
			RequestContext::getMain(),
			$this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' )
		);
	}
}
