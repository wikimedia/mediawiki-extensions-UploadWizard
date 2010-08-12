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
$wgExtensionCredits['jsModule'][] = array(
	'path' => __FILE__,
	'name' => 'Upload Wizard',
	'author' => 'Neil Kandalgaonkar',
	'version' => '0.1.1',
	'descriptionmsg' => 'uploadwizard-desc',
	'url' => 'http://www.mediawiki.org/wiki/Extension:UploadWizard'
);


$dir = dirname(__FILE__) . '/';

$wgExtensionMessagesFiles['UploadWizard'] = $dir . 'UploadWizard.i18n.php';
$wgExtensionAliasesFiles['UploadWizard'] = $dir . 'UploadWizard.alias.php';

# Require modules, includeing the special page
$wgAutoloadLocalClasses[ 'SpecialUploadWizard' ] = $dir . 'SpecialUploadWizard.php';
$wgAutoloadLocalClasses[ 'UploadWizardMessages' ] = $dir . 'UploadWizardMessages.php';

# Let the special page be a special center of unique specialness
$wgSpecialPages['UploadWizard'] = 'SpecialUploadWizard';
$wgSpecialPageGroups['UploadWizard'] = 'media';

// JS2?
$wgResourceLoaderNamedPaths[ 'UploadWizardPage' ] = 'extensions/UploadWizard/UploadWizardPage.js';

// Set up the javascript path for the loader and localization file.
$wgExtensionJavascriptModules[ 'UploadWizard' ] = 'extensions/UploadWizard';

