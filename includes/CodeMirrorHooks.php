<?php
declare( strict_types = 1 );

namespace MediaWiki\Extension\UploadWizard;

use MediaWiki\Config\Config;
use MediaWiki\Extension\CodeMirror\Hooks\CodeMirrorGetModeHook;
use MediaWiki\Title\Title;

/**
 * All hooks from the CodeMirror extension which is optional to use with this extension.
 */
class CodeMirrorHooks implements CodeMirrorGetModeHook {

	private bool $useCodeMirror;

	public function __construct( Config $config ) {
		$this->useCodeMirror = $config->get( 'UploadWizardUseCodeMirror' );
	}

	/**
	 * Declares JSON as the CodeMirror mode for Campaign: pages.
	 * This hook only runs if the CodeMirror extension is enabled.
	 *
	 * @param Title $title
	 * @param ?string &$mode
	 * @param string $model
	 * @return bool
	 */
	public function onCodeMirrorGetMode( Title $title, ?string &$mode, string $model ): bool {
		if ( $this->useCodeMirror && $title->inNamespace( NS_CAMPAIGN ) ) {
			$mode = 'json';
			return false;
		}
		return true;
	}
}
