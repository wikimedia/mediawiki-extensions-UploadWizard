<?php 

/**
 * Contains list of related resources and hooks which anticipate the use of Resource Loader, whenever that is released
 */
class UploadWizardHooks {
	
	/* We define scripts here for Resource Loader, but in the meantime we are going to load these the old-fashioned way
	   (see SpecialUploadWizard.php).

	   So this list of scripts has to be topologically-sorted by hand. That is, the depended-upon stuff comes first. 
	   There can be no circular dependencies. */

	public static $modules = array(
		'ext.uploadWizard' => array(
			'scripts' => array(
				// jquery ui
				// FIXME: These can be replaced with dependencies when pre-RL compat is dropped
				'resources/jquery.ui/ui/ui.core.js',
				'resources/jquery.ui/ui/ui.datepicker.js',
				'resources/jquery.ui/ui/ui.progressbar.js',

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

				// mediawiki-specific interface helper (relies on mediawiki globals)
				'resources/jquery/jquery.mwCoolCats.js',

				// common utilities
				'resources/mw.js',  // <-- obsolete?
				'resources/mw.Log.js',
				'resources/mw.Utilities.js',
				'resources/mw.UtilitiesTime.js',
				'resources/mw.Uri.js',
				'resources/mw.Api.js',
				'resources/mw.Api.edit.js',
				'resources/mw.Title.js',

				// message parsing
				'resources/language/mw.Language.js',
				'resources/language/mw.Parser.js',
				'resources/mw.LanguageUpWiz.js',

				// workhorse libraries
				'resources/mw.IframeTransport.js',
				'resources/mw.ApiUploadHandler.js',
				'resources/mw.DestinationChecker.js',
				'resources/mw.UploadWizardUtil.js',

				// interface libraries
				'resources/mw.GroupProgressBar.js', 

				// UploadWizard specific abstractions
				'resources/mw.UploadWizardDeed.js',
				'resources/mw.UploadWizardLicenseInput.js',

				// main library			
				'resources/mw.UploadWizard.js',
	
				// launcher
				'UploadWizardPage.js'
			),
			'languageScripts' => array(
				'am' => 'resources/languages/classes/LanguageAm.js',
				'ar' => 'resources/languages/classes/LanguageAr.js',
				'bat-smg' => 'resources/languages/classes/LanguageBat_smg.js',
				'be' => 'resources/languages/classes/LanguageBe.js',
				'be-tarask' => 'resources/languages/classes/LanguageBe_tarask.js',
				'bh' => 'resources/languages/classes/LanguageBh.js',
				'bs' => 'resources/languages/classes/LanguageBs.js',
				'cs' => 'resources/languages/classes/LanguageCs.js',
				'cu' => 'resources/languages/classes/LanguageCu.js',
				'cy' => 'resources/languages/classes/LanguageCy.js',
				'dsb' => 'resources/languages/classes/LanguageDsb.js',
				'fr' => 'resources/languages/classes/LanguageFr.js',
				'ga' => 'resources/languages/classes/LanguageGa.js',
				'gd' => 'resources/languages/classes/LanguageGd.js',
				'gv' => 'resources/languages/classes/LanguageGv.js',
				'he' => 'resources/languages/classes/LanguageHe.js',
				'hi' => 'resources/languages/classes/LanguageHi.js',
				'hr' => 'resources/languages/classes/LanguageHr.js',
				'hsb' => 'resources/languages/classes/LanguageHsb.js',
				'hy' => 'resources/languages/classes/LanguageHy.js',
				'ksh' => 'resources/languages/classes/LanguageKsh.js',
				'ln' => 'resources/languages/classes/LanguageLn.js',
				'lt' => 'resources/languages/classes/LanguageLt.js',
				'lv' => 'resources/languages/classes/LanguageLv.js',
				'mg' => 'resources/languages/classes/LanguageMg.js',
				'mk' => 'resources/languages/classes/LanguageMk.js',
				'mo' => 'resources/languages/classes/LanguageMo.js',
				'mt' => 'resources/languages/classes/LanguageMt.js',
				'nso' => 'resources/languages/classes/LanguageNso.js',
				'pl' => 'resources/languages/classes/LanguagePl.js',
				'pt-br' => 'resources/languages/classes/LanguagePt_br.js',
				'ro' => 'resources/languages/classes/LanguageRo.js',
				'ru' => 'resources/languages/classes/LanguageRu.js',
				'se' => 'resources/languages/classes/LanguageSe.js',
				'sh' => 'resources/languages/classes/LanguageSh.js',
				'sk' => 'resources/languages/classes/LanguageSk.js',
				'sl' => 'resources/languages/classes/LanguageSl.js',
				'sma' => 'resources/languages/classes/LanguageSma.js',
				'sr' => 'resources/languages/classes/LanguageSr.js',
				'sr-ec' => 'resources/languages/classes/LanguageSr_ec.js',
				'sr-el' => 'resources/languages/classes/LanguageSr_el.js',
				'ti' => 'resources/languages/classes/LanguageTi.js',
				'tl' => 'resources/languages/classes/LanguageTl.js',
				'uk' => 'resources/languages/classes/LanguageUk.js',
				'wa' => 'resources/languages/classes/LanguageWa.js'
			),
			'styles' => array(
				'resources/jquery/jquery.tipsy.css',
				'resources/jquery/jquery.suggestions.css',
				'resources/uploadWizard.css',
				'resources/jquery/jquery.arrowSteps.css',
				'resources/jquery/jquery.mwCoolCats.css',
				'resources/jquery.ui/themes/redmond/jquery-ui-1.7.1.custom.css'
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
}
