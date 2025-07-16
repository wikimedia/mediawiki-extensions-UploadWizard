<?php
declare( strict_types = 1 );

namespace MediaWiki\Extension\UploadWizard;

use MediaWiki\Config\Config;
use MediaWiki\Extension\CodeEditor\Hooks\CodeEditorGetPageLanguageHook;
use MediaWiki\Title\Title;

/**
 * All hooks from the CodeEditor extension which is optional to use with this extension.
 *
 * @file
 * @ingroup Extensions
 * @ingroup UploadWizard
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */

class CodeEditorHooks implements CodeEditorGetPageLanguageHook {

	private bool $useCodeEditor;

	public function __construct( Config $config ) {
		$this->useCodeEditor = $config->get( 'UploadWizardUseCodeEditor' );
	}

	/**
	 * Declares JSON as the code editor language for Campaign: pages.
	 * This hook only runs if the CodeEditor extension is enabled.
	 * @param Title $title
	 * @param string|null &$lang Page language.
	 * @param string $model
	 * @param string $format
	 * @return bool
	 */
	public function onCodeEditorGetPageLanguage( Title $title, ?string &$lang, string $model, string $format ): bool {
		if ( $this->useCodeEditor && $title->inNamespace( NS_CAMPAIGN ) ) {
			$lang = 'json';
			return false;
		}
		return true;
	}
}
