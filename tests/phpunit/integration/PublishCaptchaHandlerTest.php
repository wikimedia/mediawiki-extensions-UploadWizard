<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\UploadWizard\Tests\Integration;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMessage;
use MediaWiki\Api\ApiUpload;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\UploadWizard\PublishCaptchaHandler;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Request\WebRequest;
use MediaWiki\Upload\UploadFromStash;
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

		$error = null;
		$result = $this->newHandler( $request )->onUploadVerifyUpload(
			$this->createMock( UploadFromStash::class ), $user, null, '', '', $error
		);

		$this->assertTrue( $result );
		$this->assertNull( $error );
	}

	public function testReturnsTrueWhenCaptchaRecentlySolvedViaSession(): void {
		$user = $this->getTestUser()->getUser();
		$request = new FauxRequest( [ 'uploadwizardpublish' => '1' ] );
		$this->setRequest( $request );
		$request->getSession()->set( self::LAST_SOLVED_TIMESTAMP_SESSION_KEY, time() );

		$error = null;
		$result = $this->newHandler( $request )->onUploadVerifyUpload(
			$this->createMock( UploadFromStash::class ), $user, null, '', '', $error
		);

		$this->assertTrue( $result );
		$this->assertNull( $error );
	}

	public function testReturnsFalseWithApiMessageWhenNoCaptchaToken(): void {
		$user = $this->getTestUser()->getUser();
		$request = new FauxRequest( [ 'uploadwizardpublish' => '1' ] );
		$this->setRequest( $request );

		$error = null;
		$result = $this->newHandler( $request )->onUploadVerifyUpload(
			$this->createMock( UploadFromStash::class ), $user, null, '', '', $error
		);

		$this->assertFalse( $result );
		$this->assertInstanceOf( ApiMessage::class, $error );
		$this->assertSame( 'captcha', $error->getApiCode() );
	}

	public function testExpiredSessionFlagFallsThroughToVerify(): void {
		$baseTimestamp = 1700000000;
		ConvertibleTimestamp::setFakeTime( $baseTimestamp );

		$user = $this->getTestUser()->getUser();
		$request = new FauxRequest( [ 'uploadwizardpublish' => '1' ] );
		$this->setRequest( $request );
		$request->getSession()->set( self::LAST_SOLVED_TIMESTAMP_SESSION_KEY, $baseTimestamp );

		ConvertibleTimestamp::setFakeTime( $baseTimestamp + 200 );

		$error = null;
		$result = $this->newHandler( $request )->onUploadVerifyUpload(
			$this->createMock( UploadFromStash::class ), $user, null, '', '', $error
		);

		$this->assertFalse( $result );
		$this->assertInstanceOf( ApiMessage::class, $error );
		$this->assertSame( 'captcha', $error->getApiCode() );
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

	private function newHandler( WebRequest $request ): PublishCaptchaHandler {
		return new PublishCaptchaHandler(
			$request,
			RequestContext::getMain(),
			$this->getServiceContainer()->get( 'ConfirmEditCaptchaFactory' )
		);
	}
}
