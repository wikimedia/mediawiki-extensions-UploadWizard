<?php
/**
 * UploadWizard extension
 *
 * @file
 * @ingroup Extensions
 *
 * This file contains the include file for UploadWizard
 *
 * Usage: Include the following line in your LocalSettings.php
 * require_once( "$IP/extensions/UploadWizard/UploadWizard.php" );
 *
 * @author Neil Kandalgaonkar <neil@wikimedia.org>
 * @license GPL v2 or later
 * @version 0.1.1
 */

/* Configuration */


// Credits
$wgExtensionCredits['other'][] = array(
	'path' => __FILE__,
	'name' => 'Upload Wizard',
	'author' => 'Neil Kandalgaonkar',
	'version' => '0.1.1',
	'descriptionmsg' => 'uploadwizard-desc',
	'url' => 'http://www.mediawiki.org/wiki/Extension:UploadWizard'
);



$wgUpwizDir = dirname( __FILE__ );

$wgExtensionMessagesFiles['UploadWizard'] = $wgUpwizDir . '/UploadWizard.i18n.php';
$wgExtensionAliasesFiles['UploadWizard'] = $wgUpwizDir . '/UploadWizard.alias.php';

# Require modules, including the special page
foreach ( array( 'SpecialUploadWizard',
		 'UploadWizardMessages',
		 'UploadWizardHooks',
		 'UploadWizardTutorial',
		 'UploadWizardDependencyLoader' ) as $module ) {
	$wgAutoloadLocalClasses[$module] = $wgUpwizDir . "/" . $module . ".php";
}


# Let the special page be a special center of unique specialness
$wgSpecialPages['UploadWizard'] = 'SpecialUploadWizard';
$wgSpecialPageGroups['UploadWizard'] = 'media';

$wgResourceLoaderNamedPaths[ 'UploadWizardPage' ] = 'extensions/UploadWizard/UploadWizardPage.js';

// Set up the javascript path for the loader and localization file.
$wgExtensionJavascriptModules[ 'UploadWizard' ] = 'extensions/UploadWizard';

// Disable ResourceLoader support by default, it's currently broken
// $wgUploadWizardDisableResourceLoader = true;

// for ResourceLoader
$wgHooks['ResourceLoaderRegisterModules'][] = 'UploadWizardHooks::resourceLoaderRegisterModules';
$wgHooks['CanonicalNamespaces'][] = 'UploadWizardHooks::canonicalNamespaces';

// Init the upload wizard config array 
// UploadWizard.config.php includes default configuration
// any value can be modified in localSettings.php by setting  $wgUploadWizardConfig['name'] = 'value;
$wgUploadWizardConfig = array();
