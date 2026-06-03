<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\UploadWizard\Tests\Unit;

use MediaWiki\Extension\ConfirmEdit\Services\CaptchaFactory;
use MediaWiki\Extension\UploadWizard\PublishCaptchaHandler;
use MediaWiki\Language\MessageLocalizer;
use MediaWiki\Request\WebRequest;
use MediaWiki\Upload\UploadBase;
use MediaWiki\Upload\UploadFromStash;
use MediaWiki\User\User;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\UploadWizard\PublishCaptchaHandler
 */
class PublishCaptchaHandlerTest extends MediaWikiUnitTestCase {

	protected function setUp(): void {
		parent::setUp();

		if ( !class_exists( CaptchaFactory::class ) ) {
			$this->markTestSkipped( 'ConfirmEdit not available' );
		}
	}

	/**
	 * @dataProvider provideShortCircuitCases
	 */
	public function testReturnsTrueWhenShouldShortCircuit(
		bool $uploadFromStash,
		bool $withCaptchaFactory
	): void {
		$upload = $uploadFromStash
			? $this->createMock( UploadFromStash::class )
			: $this->createMock( UploadBase::class );
		$captchaFactory = $withCaptchaFactory ? $this->createMock( CaptchaFactory::class ) : null;
		$handler = new PublishCaptchaHandler(
			$this->createMock( WebRequest::class ),
			$this->createMock( MessageLocalizer::class ),
			$captchaFactory
		);

		$error = null;
		$result = $handler->onUploadVerifyUpload(
			$upload, $this->createMock( User::class ), null, '', '', $error
		);

		$this->assertTrue( $result );
		$this->assertNull( $error );
	}

	public static function provideShortCircuitCases(): array {
		return [
			'upload is not from stash' => [
				'uploadFromStash' => false,
				'withCaptchaFactory' => true,
			],
			'CaptchaFactory unavailable' => [
				'uploadFromStash' => true,
				'withCaptchaFactory' => false,
			],
		];
	}
}
