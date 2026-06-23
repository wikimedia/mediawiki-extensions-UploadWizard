<?php

declare( strict_types=1 );

namespace MediaWiki\Extension\UploadWizard;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\ConfirmEdit\Hooks\ConfirmEditBeforeForceShowCaptchaHook;
use MediaWiki\Extension\ConfirmEdit\Services\CaptchaFactory;
use MediaWiki\User\UserIdentity;

/**
 * Marks the AbuseFilter "upload" action as supporting a force-shown CAPTCHA for
 * ConfirmEdit's "showcaptcha" consequence, but only for UploadWizard's own publish
 * requests.
 */
class PublishCaptchaConsequenceHandler implements ConfirmEditBeforeForceShowCaptchaHook {

	public function __construct(
		private readonly CaptchaFactory $captchaFactory,
	) {
	}

	/** @inheritDoc */
	public function onConfirmEditBeforeForceShowCaptcha(
		UserIdentity $userIdentity,
		string $action,
		bool &$actionSupportedForForceShowCaptcha
	) {
		// Read the main request at hook time; it can be replaced mid-process,
		// e.g. by RequestContext::importScopedSession() in upload jobs.
		$request = RequestContext::getMain()->getRequest();
		if ( $action !== 'upload' || !$request->getBool( PublishCaptchaHandler::PUBLISH_PARAM ) ) {
			return;
		}

		$actionSupportedForForceShowCaptcha = true;

		// ConfirmEdit sets force-show on the "upload" instance; mirror it onto the
		// "uploadwizard-publish" instance that PublishCaptchaHandler reads.
		$this->captchaFactory->getGlobalInstance( PublishCaptchaHandler::TRIGGER )
			->setForceShowCaptcha( true );
	}
}
