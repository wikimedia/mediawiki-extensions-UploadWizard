<?php

namespace MediaWiki\Extension\UploadWizard;

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
	/**
	 * Declares JSON as the code editor language for Campaign: pages.
	 * This hook only runs if the CodeEditor extension is enabled.
	 * @param Title $title
	 * @param string|null &$lang Page language.
	 * @param string $model
	 * @param string $format
	 */
	public function onCodeEditorGetPageLanguage( Title $title, ?string &$lang, string $model, string $format ): void {
		if ( $title->inNamespace( NS_CAMPAIGN ) ) {
			$lang = 'json';
		}
	}
}
