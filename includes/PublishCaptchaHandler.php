<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\UploadWizard;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiMessage;
use MediaWiki\Api\ApiUpload;
use MediaWiki\Api\Hook\APIGetAllowedParamsHook;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\ConfirmEdit\Services\CaptchaFactory;
use MediaWiki\Extension\ConfirmEdit\SimpleCaptcha\SimpleCaptcha;
use MediaWiki\Language\MessageLocalizer;
use MediaWiki\Request\WebRequest;
use MediaWiki\Session\Session;
use MediaWiki\Upload\Hook\UploadVerifyUploadHook;
use MediaWiki\Upload\UploadBase;
use MediaWiki\Upload\UploadFromStash;
use MediaWiki\User\User;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * Enforces CAPTCHA on the UploadWizard publish phase. Registered as the
 * `uploadwizard-publish` CAPTCHA trigger; ConfirmEdit must be loaded and
 * operators must define `$wgCaptchaTriggers` to trigger for the
 * `uploadwizard-publish` action.
 */
class PublishCaptchaHandler implements UploadVerifyUploadHook, APIGetAllowedParamsHook {

	public const string TRIGGER = 'uploadwizard-publish';
	private const string LAST_SOLVED_TIMESTAMP_SESSION_KEY = 'uw-captcha-publish-solved';

	/**
	 * Time window during which a single CAPTCHA solve gates an in-progress batch
	 * publish. 120 seconds covers a typical UploadWizard batch publish; short
	 * enough that a captured solve cannot be reused indefinitely by an attacker.
	 */
	private const int SESSION_TTL_SECONDS = 120;

	public function __construct(
		private readonly WebRequest $request,
		private readonly MessageLocalizer $messageLocalizer,
		private readonly ?CaptchaFactory $captchaFactory,
	) {
	}

	public static function factory( ?CaptchaFactory $captchaFactory ): self {
		// WebRequest and MessageLocalizer aren't service-container objects; pull them from the main request context.
		$context = RequestContext::getMain();

		return new self( $context->getRequest(), $context, $captchaFactory );
	}

	/** @inheritDoc */
	public function onUploadVerifyUpload(
		UploadBase $upload,
		User $user,
		?array $props,
		$comment,
		$pageText,
		&$error
	) {
		if ( !( $upload instanceof UploadFromStash ) ) {
			return true;
		}

		$captcha = $this->getCaptcha();
		if ( !$captcha || !$captcha->triggersCaptcha( self::TRIGGER ) ) {
			return true;
		}

		if ( $captcha->canSkipCaptcha( $user ) ) {
			return true;
		}

		$session = $this->request->getSession();
		if ( $this->isCaptchaRecentlySolved( $session ) ) {
			return true;
		}

		if ( $this->verifyCaptchaAndMarkSolved( $captcha, $user, $session ) ) {
			return true;
		}

		$error = ApiMessage::create(
			$this->messageLocalizer->msg( 'mwe-upwiz-captcha-description' ),
			'captcha',
			[ 'captcha' => $captcha->describeCaptchaType( self::TRIGGER ) ]
		);

		return false;
	}

	/** @inheritDoc */
	public function onAPIGetAllowedParams( $module, &$params, $flags ) {
		if ( !$module instanceof ApiUpload ) {
			return;
		}

		$captcha = $this->getCaptcha();
		if ( !$captcha ) {
			return;
		}

		foreach ( $captcha->getApiParams() as $name ) {
			$params[$name] ??= [
				ParamValidator::PARAM_TYPE => 'string',
				ApiBase::PARAM_HELP_MSG => self::captchaParamHelpMessage( $name ),
			];
		}
	}

	/**
	 * Maps a CAPTCHA API parameter name to the ConfirmEdit-shipped help message
	 * key for that parameter. ApiStructureTest requires every parameter to have
	 * an existing PARAM_HELP_MSG; ConfirmEdit's own captcha modules set these
	 * via {@see SimpleCaptcha::apiGetAllowedParams}, but only when the module
	 * is an `ApiEditPage`, so we replicate the mapping here for `ApiUpload`.
	 *
	 * Unknown parameter names fall back to the conventional
	 * `captcha-apihelp-param-<name>` key shipped by ConfirmEdit for
	 * SimpleCaptcha-style params.
	 */
	private static function captchaParamHelpMessage( string $name ): string {
		return match ( $name ) {
			'wgConfirmEditForceShowCaptcha' => 'confirmedit-hcaptcha-apihelp-param-forceshowcaptcha',
			default => 'captcha-apihelp-param-' . $name,
		};
	}

	private function getCaptcha(): ?SimpleCaptcha {
		return $this->captchaFactory?->getGlobalInstance( self::TRIGGER );
	}

	private function isCaptchaRecentlySolved( Session $session ): bool {
		$solvedAt = $session->get( self::LAST_SOLVED_TIMESTAMP_SESSION_KEY );

		return is_int( $solvedAt ) && ( ConvertibleTimestamp::time() - $solvedAt ) < self::SESSION_TTL_SECONDS;
	}

	private function verifyCaptchaAndMarkSolved( SimpleCaptcha $captcha, User $user, Session $session ): bool {
		if ( !$captcha->passCaptchaFromRequest( $this->request, $user ) ) {
			return false;
		}

		$session->set( self::LAST_SOLVED_TIMESTAMP_SESSION_KEY, ConvertibleTimestamp::time() );
		$session->save();

		return true;
	}
}
