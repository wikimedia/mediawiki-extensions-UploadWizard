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
				'extensions/UploadWizard/resources/jquery/jquery.tipsy.js',
				'extensions/UploadWizard/resources/jquery/jquery.tipsyPlus.js',
				'extensions/UploadWizard/resources/jquery/jquery.morphCrossfade.js',
				'extensions/UploadWizard/resources/jquery/jquery.validate.js',
				'extensions/UploadWizard/resources/jquery/jquery.arrowSteps.js',
				'extensions/UploadWizard/resources/jquery/jquery.autocomplete.js',
				'extensions/UploadWizard/resources/jquery/jquery.spinner.js',

				// mediawiki-specific interface helper (relies on mediawiki globals)
				'extensions/UploadWizard/resources/jquery/jquery.mwCoolCats.js',

				// common utilities
				'extensions/UploadWizard/resources/mw.js',  // <-- obsolete?
				'extensions/UploadWizard/resources/mw.Log.js',
				'extensions/UploadWizard/resources/mw.Utilities.js',
				'extensions/UploadWizard/resources/mw.UtilitiesTime.js',
				'extensions/UploadWizard/resources/mw.Uri.js',
				'extensions/UploadWizard/resources/mw.Api.js',
				'extensions/UploadWizard/resources/mw.Api.edit.js',
				'extensions/UploadWizard/resources/mw.Title.js',

				// message parsing
				'extensions/UploadWizard/resources/language/mw.Language.js',
				'extensions/UploadWizard/resources/language/mw.Parser.js',
				'extensions/UploadWizard/resources/mw.LanguageUpWiz.js',

				// workhorse libraries
				'extensions/UploadWizard/resources/mw.IframeTransport.js',
				'extensions/UploadWizard/resources/mw.ApiUploadHandler.js',
				'extensions/UploadWizard/resources/mw.DestinationChecker.js',
				'extensions/UploadWizard/resources/mw.UploadWizardUtil.js',

				// interface libraries
				'extensions/UploadWizard/resources/mw.GroupProgressBar.js', 

				// UploadWizard specific abstractions
				'extensions/UploadWizard/resources/mw.UploadWizardDeed.js',
				'extensions/UploadWizard/resources/mw.UploadWizardLicenseInput.js',

				// main library			
				'extensions/UploadWizard/resources/mw.UploadWizard.js',
	
				// launcher
				'extensions/UploadWizard/UploadWizardPage.js'
			),
			'languageScripts' => array(
				'am' => 'extensions/UploadWizard/resources/languages/classes/LanguageAm.js',
				'ar' => 'extensions/UploadWizard/resources/languages/classes/LanguageAr.js',
				'bat-smg' => 'extensions/UploadWizard/resources/languages/classes/LanguageBat_smg.js',
				'be' => 'extensions/UploadWizard/resources/languages/classes/LanguageBe.js',
				'be-tarask' => 'extensions/UploadWizard/resources/languages/classes/LanguageBe_tarask.js',
				'bh' => 'extensions/UploadWizard/resources/languages/classes/LanguageBh.js',
				'bs' => 'extensions/UploadWizard/resources/languages/classes/LanguageBs.js',
				'cs' => 'extensions/UploadWizard/resources/languages/classes/LanguageCs.js',
				'cu' => 'extensions/UploadWizard/resources/languages/classes/LanguageCu.js',
				'cy' => 'extensions/UploadWizard/resources/languages/classes/LanguageCy.js',
				'dsb' => 'extensions/UploadWizard/resources/languages/classes/LanguageDsb.js',
				'fr' => 'extensions/UploadWizard/resources/languages/classes/LanguageFr.js',
				'ga' => 'extensions/UploadWizard/resources/languages/classes/LanguageGa.js',
				'gd' => 'extensions/UploadWizard/resources/languages/classes/LanguageGd.js',
				'gv' => 'extensions/UploadWizard/resources/languages/classes/LanguageGv.js',
				'he' => 'extensions/UploadWizard/resources/languages/classes/LanguageHe.js',
				'hi' => 'extensions/UploadWizard/resources/languages/classes/LanguageHi.js',
				'hr' => 'extensions/UploadWizard/resources/languages/classes/LanguageHr.js',
				'hsb' => 'extensions/UploadWizard/resources/languages/classes/LanguageHsb.js',
				'hy' => 'extensions/UploadWizard/resources/languages/classes/LanguageHy.js',
				'ksh' => 'extensions/UploadWizard/resources/languages/classes/LanguageKsh.js',
				'ln' => 'extensions/UploadWizard/resources/languages/classes/LanguageLn.js',
				'lt' => 'extensions/UploadWizard/resources/languages/classes/LanguageLt.js',
				'lv' => 'extensions/UploadWizard/resources/languages/classes/LanguageLv.js',
				'mg' => 'extensions/UploadWizard/resources/languages/classes/LanguageMg.js',
				'mk' => 'extensions/UploadWizard/resources/languages/classes/LanguageMk.js',
				'mo' => 'extensions/UploadWizard/resources/languages/classes/LanguageMo.js',
				'mt' => 'extensions/UploadWizard/resources/languages/classes/LanguageMt.js',
				'nso' => 'extensions/UploadWizard/resources/languages/classes/LanguageNso.js',
				'pl' => 'extensions/UploadWizard/resources/languages/classes/LanguagePl.js',
				'pt-br' => 'extensions/UploadWizard/resources/languages/classes/LanguagePt_br.js',
				'ro' => 'extensions/UploadWizard/resources/languages/classes/LanguageRo.js',
				'ru' => 'extensions/UploadWizard/resources/languages/classes/LanguageRu.js',
				'se' => 'extensions/UploadWizard/resources/languages/classes/LanguageSe.js',
				'sh' => 'extensions/UploadWizard/resources/languages/classes/LanguageSh.js',
				'sk' => 'extensions/UploadWizard/resources/languages/classes/LanguageSk.js',
				'sl' => 'extensions/UploadWizard/resources/languages/classes/LanguageSl.js',
				'sma' => 'extensions/UploadWizard/resources/languages/classes/LanguageSma.js',
				'sr' => 'extensions/UploadWizard/resources/languages/classes/LanguageSr.js',
				'sr-ec' => 'extensions/UploadWizard/resources/languages/classes/LanguageSr_ec.js',
				'sr-el' => 'extensions/UploadWizard/resources/languages/classes/LanguageSr_el.js',
				'ti' => 'extensions/UploadWizard/resources/languages/classes/LanguageTi.js',
				'tl' => 'extensions/UploadWizard/resources/languages/classes/LanguageTl.js',
				'uk' => 'extensions/UploadWizard/resources/languages/classes/LanguageUk.js',
				'wa' => 'extensions/UploadWizard/resources/languages/classes/LanguageWa.js'
			),
			'styles' => array(
				'extensions/UploadWizard/resources/jquery/jquery.tipsy.css',
				'extensions/UploadWizard/resources/uploadWizard.css',
				'extensions/UploadWizard/resources/jquery/jquery.arrowSteps.css',
				'extensions/UploadWizard/resources/jquery/jquery.mwCoolCats.css',
				'extensions/UploadWizard/resources/jquery.ui/themes/redmond/jquery-ui-1.7.1.custom.css'
			),
			'messages' => array( 
				// see UploadWizard.i18n.php
			),
			'dependencies' => array(
				// see SpecialUploadWizard.php
				// see SpecialUploadWizard.php
			),
			'group' => 'ext.uploadWizard'
		),
		'ext.uploadWizard.tests' => array(
			'scripts' => array(
				'extensions/UploadWizard/resources/mw.MockUploadHandler.js'
			),
		),
	);
	
	/*
	 * ResourceLoaderRegisterModules hook
	 * 
	 * Adds modules to ResourceLoader
	 */
	public static function resourceLoaderRegisterModules( &$resourceLoader ) {
		foreach ( self::$modules as $name => $resources ) {
			$resourceLoader->register( $name, new ResourceLoaderFileModule( $resources ) );
		}
		return true;
	}
}
