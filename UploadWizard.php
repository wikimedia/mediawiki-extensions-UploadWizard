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
 * @version 1.1
 */

/* Configuration */


// Credits
$wgExtensionCredits['other'][] = array(
	'path' => __FILE__,
	'name' => 'Upload Wizard',
	'author' => 'Neil Kandalgaonkar',
	'version' => '1.1',
	'descriptionmsg' => 'uploadwizard-desc',
	'url' => 'http://www.mediawiki.org/wiki/Extension:UploadWizard'
);



$wgUpwizDir = dirname( __FILE__ );

$wgExtensionMessagesFiles['UploadWizard'] = $wgUpwizDir . '/UploadWizard.i18n.php';
$wgExtensionAliasesFiles['UploadWizard'] = $wgUpwizDir . '/UploadWizard.alias.php';

# Require modules, including the special page
foreach ( array(
		'SpecialUploadWizard',
		'SpecialUploadCampaigns',
		'UploadWizardMessages',
		'UploadWizardHooks',
		'UploadWizardTutorial'
		) as $module ) {
	$wgAutoloadLocalClasses[$module] = $wgUpwizDir . '/' . $module . '.php';
}

// $wgAPIModules['titlecheck'] = 'ApiTitleCheck';
// $wgAPIListModules['titlecheck'] = 'ApiTitleCheck';

# Let the special page be a special center of unique specialness
$wgSpecialPages['UploadWizard'] = 'SpecialUploadWizard';
$wgSpecialPageGroups['UploadWizard'] = 'media';

$wgSpecialPages['UploadCampaigns'] = 'SpecialUploadCampaigns';
$wgSpecialPageGroups['UploadCampaigns'] = 'media';

$wgResourceLoaderNamedPaths[ 'UploadWizardPage' ] = 'extensions/UploadWizard/UploadWizardPage.js';

// Set up the javascript path for the loader and localization file.
$wgExtensionJavascriptModules[ 'UploadWizard' ] = 'extensions/UploadWizard';

// Disable ResourceLoader support by default, it's currently broken
// $wgUploadWizardDisableResourceLoader = true;

// for ResourceLoader
$wgHooks['ResourceLoaderRegisterModules'][] = 'UploadWizardHooks::resourceLoaderRegisterModules';
$wgHooks['CanonicalNamespaces'][] = 'UploadWizardHooks::canonicalNamespaces';
$wgHooks['LoadExtensionSchemaUpdates'][] = 'UploadWizardHooks::onSchemaUpdate';

// Init the upload wizard config array 
// UploadWizard.config.php includes default configuration
// any value can be modified in localSettings.php by setting  $wgUploadWizardConfig['name'] = 'value;
$wgUploadWizardConfig = array();
