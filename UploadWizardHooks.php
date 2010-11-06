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

				// jquery interface helpers
				'resources/jquery/jquery.tipsy.js',
				'resources/jquery/jquery.tipsyPlus.js',
				'resources/jquery/jquery.morphCrossfade.js',
				'resources/jquery/jquery.validate.js',
				'resources/jquery/jquery.arrowSteps.js',
				'resources/jquery/jquery.autocomplete.js',
				'resources/jquery/jquery.spinner.js',

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
				'resources/uploadWizard.css',
				'resources/jquery/jquery.arrowSteps.css',
				'resources/jquery/jquery.mwCoolCats.css',
				'resources/jquery.ui/themes/redmond/jquery-ui-1.7.1.custom.css'
			),
			'messages' => array( 
				// see UploadWizard.i18n.php
			),
			// in ResourceLoader, these will probably have names rather than explicit script paths, or be automatically loaded
			'dependencies' => array(
				'resources/jquery.ui/ui/ui.core.js',
				'resources/jquery.ui/ui/ui.datepicker.js',
				'resources/jquery.ui/ui/ui.progressbar.js'
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
		global $wgExtensionAssetsPath;
		$localpath = dirname( __FILE__ );
		$remotepath = "$wgExtensionAssetsPath/UploadWizard";
		foreach ( self::$modules as $name => $resources ) {
			$resourceLoader->register( $name, new ResourceLoaderFileModule( $resources, $localpath, $remotepath ) );
		}
		return true;
	}
}
