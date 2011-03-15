<?php

/**
 * Contains list of related resources and hooks which anticipate the use of Resource Loader, whenever that is released
 */
class UploadWizardHooks {

	/* We define scripts here for Resource Loader */

	public static $modules = array(
		// n.b. we tend not to use mediawiki.language functions, they are better implemented in mediawiki.language.parser.
		// however, loading mediawiki.language will a) create the namespace b) load the language files with convertPlural for the current language and all. 
		'ext.uploadwizard.mediawiki.language.parser' => array(
			'dependencies' => array( 'mediawiki.language', 'mediawiki.util' ),
			'scripts' => 'resources/mediawiki.language.parser.js'
		),
		'ext.uploadWizard' => array(
			'dependencies' => array( 
				'jquery.ui.core',
				'jquery.ui.dialog',
				'jquery.ui.datepicker',
				'jquery.ui.progressbar',
				'jquery.ui.widget',
				'mediawiki.language',
				'mediawiki.util',
				'ext.uploadwizard.mediawiki.language.parser'
			),
			'scripts' => array(

				// jquery interface helpers
				'resources/jquery/jquery.tipsy.js',
				'resources/jquery/jquery.tipsyPlus.js',
				'resources/jquery/jquery.morphCrossfade.js',
				'resources/jquery/jquery.validate.js',
				'resources/jquery/jquery.arrowSteps.js',
				'resources/jquery/jquery.autocomplete.js',
				'resources/jquery/jquery.spinner.js',
				'resources/jquery/jquery.autoEllipsis.js',
				'resources/jquery/jquery.suggestions.js',
				'resources/jquery/jquery.removeCtrl.js',

				// mediawiki-specific interface helper (relies on mediawiki globals)
				'resources/jquery/jquery.mwCoolCats.js',

				// common utilities
				'resources/mw.Log.js',
				'resources/mw.Utilities.js',
				'resources/mw.UtilitiesTime.js',
				'resources/mw.Uri.js',
				'resources/mw.Api.js',
				'resources/mw.Api.edit.js',
				'resources/mw.Title.js',

				// language menus
				'resources/mw.LanguageUpWiz.js',

				// workhorse libraries
				'resources/mw.IframeTransport.js',			
				'resources/mw.ApiUploadHandler.js',
				'resources/mw.DestinationChecker.js',
				'resources/mw.UploadWizardUtil.js',
			
				'resources/mw.FirefoggHandler.js',			

				// interface libraries
				'resources/mw.GroupProgressBar.js',

				// UploadWizard specific abstractions
				'resources/mw.UploadWizardDeed.js',
				'resources/mw.UploadWizardLicenseInput.js',

				// main library
				'resources/mw.UploadWizard.js',
			
				// main library components: 
				'resources/mw.UploadWizardDeed.js',
				'resources/mw.UploadWizardDescription.js',
				'resources/mw.UploadWizardDetails.js',
				'resources/mw.UploadWizardUploadInterface.js',
				

				// launcher
				'UploadWizardPage.js'
			),
			'styles' => array(
				'resources/jquery/jquery.tipsy.css',
				'resources/jquery/jquery.suggestions.css',
				'resources/uploadWizard.css',
				'resources/jquery/jquery.arrowSteps.css',
				'resources/jquery/jquery.mwCoolCats.css',
				'resources/jquery/jquery.removeCtrl.css',
			),
			'messages' => array(
				'linktest',
				'pluraltest',
				'magictest',
				'namespacedtest',
				'extremelycomplextest',
				'internallinktest',
				'uploadwizard',
				'uploadwizard-desc',
				'mwe-upwiz-js-off',
				'mwe-loading-upwiz',
				'mwe-upwiz-code-unknown',
				'mwe-upwiz-step-tutorial',
				'mwe-upwiz-step-file',
				'mwe-upwiz-step-deeds',
				'mwe-upwiz-step-details',
				'mwe-upwiz-step-thanks',
				'mwe-upwiz-api-error-code',
				'mwe-upwiz-tutorial-error',
				'mwe-upwiz-intro',
				'mwe-upwiz-add-file-n',
				'mwe-upwiz-add-file-0',
				'mwe-upwiz-browse',
				'mwe-upwiz-transported',
				'mwe-upwiz-click-here',
				'mwe-upwiz-uploading',
				'mwe-upwiz-editing',
				'mwe-upwiz-remove',
				'mwe-upwiz-remove-upload',
				'mwe-upwiz-remove-description',
				'mwe-upwiz-upload',
				'mwe-upwiz-upload-count',
				'mwe-upwiz-progressbar-uploading',
				'mwe-upwiz-finished',
				'mwe-upwiz-secs-remaining',
				'mwe-upwiz-mins-secs-remaining',
				'mwe-upwiz-hrs-mins-secs-remaining',
				'mwe-upwiz-deeds-intro',
				'mwe-upwiz-deeds-macro-prompt',
				'mwe-upwiz-deeds-custom-prompt',
				'mwe-upwiz-details-intro',
				'mwe-upwiz-source-ownwork',
				'mwe-upwiz-source-ownwork-assert',
				'mwe-upwiz-source-ownwork-assert-custom',
				'mwe-upwiz-source-ownwork-assert-note',
				'mwe-upwiz-source-permission',
				'mwe-upwiz-source-thirdparty',
				'mwe-upwiz-source-thirdparty-intro',
				'mwe-upwiz-source-thirdparty-custom-multiple-intro',
				'mwe-upwiz-source-thirdparty-license',
				'mwe-upwiz-source-thirdparty-accept',
				'mwe-upwiz-source-custom',
				'mwe-upwiz-more-options',
				'mwe-upwiz-fewer-options',
				'mwe-upwiz-desc',
				'mwe-upwiz-desc-add-n',
				'mwe-upwiz-desc-add-0',
				'mwe-upwiz-title',
				'mwe-upwiz-categories-intro',
				'mwe-upwiz-categories-another',
				'mwe-upwiz-previously-uploaded',
				'mwe-upwiz-about-this-work',
				'mwe-upwiz-media-type',
				'mwe-upwiz-date-created',
				'mwe-upwiz-location',
				'mwe-upwiz-copyright-info',
				'mwe-upwiz-author',
				'mwe-upwiz-license',
				'mwe-upwiz-about-format',
				'mwe-upwiz-autoconverted',
				'mwe-upwiz-filename-tag',
				'mwe-upwiz-other',
				'mwe-upwiz-other-prefill',
				'mwe-upwiz-showall',
				'mwe-upwiz-source',
				'mwe-upwiz-macro-edit-intro',
				'mwe-upwiz-macro-edit',
				'mwe-upwiz-thanks-intro',
				'mwe-upwiz-thanks-explain',
				'mwe-upwiz-thanks-link',
				'mwe-upwiz-thanks-wikitext',
				'mwe-upwiz-thanks-url',
				'mwe-upwiz-upload-error-bad-filename-extension',
				'mwe-upwiz-upload-error-duplicate',
				'mwe-upwiz-upload-error-stashed-anyway',
				'mwe-upwiz-ok',
				'mwe-upwiz-cancel',
				'mwe-upwiz-change',
				'mwe-upwiz-fileexists-replace',
				'mwe-upwiz-fileexists',
				'mwe-upwiz-thumbnail-more',
				'mwe-upwiz-overwrite',
				'mwe-copyright-macro',
				'mwe-copyright-custom',
				'mwe-upwiz-next',
				'mwe-upwiz-next-file',
				'mwe-upwiz-next-deeds',
				'mwe-upwiz-next-details',
				'mwe-upwiz-home',
				'mwe-upwiz-upload-another',
				'mwe-prevent-close',
				'mwe-upwiz-files-complete',
				'mwe-upwiz-tooltip-author',
				'mwe-upwiz-tooltip-source',
				'mwe-upwiz-tooltip-sign',
				'mwe-upwiz-tooltip-title',
				'mwe-upwiz-tooltip-description',
				'mwe-upwiz-tooltip-other',
				'mwe-upwiz-tooltip-more-info',
				'mwe-upwiz-file-need-file',
				'mwe-upwiz-file-need-start',
				'mwe-upwiz-file-need-complete',
				'mwe-upwiz-deeds-need-deed',
				'mwe-upwiz-deeds-need-license',
				'mwe-upwiz-license-incompatible-pd',
				'mwe-upwiz-license-incompatible-cc',
				'mwe-upwiz-license-show-all',
				'mwe-upwiz-license-show-recommended',
				'mwe-upwiz-error-signature-blank',
				'mwe-upwiz-error-signature-too-long',
				'mwe-upwiz-error-signature-too-short',
				'mwe-upwiz-error-signature-bad-chars',
				'mwe-upwiz-error-blank',
				'mwe-upwiz-error-too-long',
				'mwe-upwiz-error-too-short',
				'mwe-upwiz-error-bad-chars',
				'mwe-upwiz-error-date',
				'mwe-upwiz-license-cc-by-sa-3.0',
				'mwe-upwiz-license-cc-by-3.0',
				'mwe-upwiz-license-cc-zero',
				'mwe-upwiz-license-gfdl',
				'mwe-upwiz-license-pd-us',
				'mwe-upwiz-categories',
				'mwe-upwiz-categories-add',
				'mwe-upwiz-category-remove',
				'mwe-upwiz-getting-metadata',
				'mwe-upwiz-stashed-upload',
				'mwe-upwiz-dialog-title',
				'mwe-upwiz-tooltip-categories'
			),
			'group' => 'ext.uploadWizard'
		),
		'ext.uploadWizard.tests' => array(
			'scripts' => array(
				'resources/mw.MockUploadHandler.js'
			),
		),
	);

	/*
	 * ResourceLoaderRegisterModules hook
	 *
	 * Adds modules to ResourceLoader
	 */
	public static function resourceLoaderRegisterModules( &$resourceLoader ) {
		global $wgExtensionAssetsPath, $wgUploadWizardDisableResourceLoader;
		if ( $wgUploadWizardDisableResourceLoader ) {
			return true;
		}

		$localpath = dirname( __FILE__ );
		$remotepath = "$wgExtensionAssetsPath/UploadWizard";
		foreach ( self::$modules as $name => $resources ) {
			$resourceLoader->register( $name, new ResourceLoaderFileModule( $resources, $localpath, $remotepath ) );
		}
		return true;
	}

	public static function CanonicalNamespaces( array $namespaces ) {
		global $wgNamespaceAliases;
		// add proper aliases for NS_FILE, otherwise an error is being thrown
		// in combined.min.js when the content language code is not 'en':
		// "unrecognized namespace=File" due to undefiled 'File' key in wgNamespaceIds
		if ( !isset( $wgNamespaceAliases['File'] ) ) {
			$wgNamespaceAliases['File'] = NS_FILE;
		}
		if ( !isset( $wgNamespaceAliases['File_talk'] ) ) {
			$wgNamespaceAliases['File_talk'] = NS_FILE_TALK;
		}
		return true;
	}
}
