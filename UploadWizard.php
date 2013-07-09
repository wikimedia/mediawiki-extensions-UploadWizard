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
 * @author Mark Holmquist <mtraceur@member.fsf.org>
 * @author Jeroen De Dauw <jeroendedauw@gmail.com>
 * @author Ryan Kaldari <rkaldari@wikimedia.org>
 * @author Michael Dale <mdale@wikimedia.org>
 * @author Ankur Anand <drecodeam@gmail.com>
 * @license GPL v2 or later
 * @version 1.3
 */

/* Configuration */


// Credits
$wgExtensionCredits['other'][] = array(
	'path' => __FILE__,
	'name' => 'Upload Wizard',
	'author' => array( 'Neil Kandalgaonkar', 'Jeroen De Dauw', 'Mark Holmquist', 'Ryan Kaldari', 'Michael Dale', 'Ankur Anand' ),
	'version' => '1.3',
	'descriptionmsg' => 'uploadwizard-desc',
	'url' => 'https://www.mediawiki.org/wiki/Extension:UploadWizard'
);

$wgUpwizDir = __DIR__;

$wgExtensionMessagesFiles['UploadWizard'] = $wgUpwizDir . '/UploadWizard.i18n.php';
$wgExtensionMessagesFiles['UploadWizardAlias'] = $wgUpwizDir . '/UploadWizard.alias.php';

# Require modules
$wgAutoloadClasses += array(
	// Hooks
	'UploadWizardHooks' => $wgUpwizDir . '/UploadWizardHooks.php',

	// Includes
	'UploadWizardConfig' => $wgUpwizDir . '/includes/UploadWizardConfig.php',
	'UploadWizardTutorial' => $wgUpwizDir . '/includes/UploadWizardTutorial.php',
	'UploadWizardCampaign' => $wgUpwizDir . '/includes/UploadWizardCampaign.php',

	// Campaign ContentHandler
	'CampaignContentHandler' => $wgUpwizDir . '/includes/CampaignContentHandler.php',
	'CampaignContent' => $wgUpwizDir . '/includes/CampaignContent.php',
	'CampaignHooks' => $wgUpwizDir . '/includes/CampaignHooks.php',

	// Special Pages
	'SpecialUploadWizard' => $wgUpwizDir . '/includes/specials/SpecialUploadWizard.php',
);

// Registers hook and content handlers for Campaign contenthandler
$wgExtensionFunctions[] = 'CampaignHooks::registerHandlers';

// $wgAPIModules['titlecheck'] = 'ApiTitleCheck';
// $wgAPIListModules['titlecheck'] = 'ApiTitleCheck';

# Let the special page be a special center of unique specialness
$wgSpecialPages['UploadWizard'] = 'SpecialUploadWizard';
$wgSpecialPageGroups['UploadWizard'] = 'media';

// for ResourceLoader
$wgHooks['ResourceLoaderRegisterModules'][] = 'UploadWizardHooks::resourceLoaderRegisterModules';
$wgHooks['CanonicalNamespaces'][] = 'UploadWizardHooks::canonicalNamespaces';
$wgHooks['LoadExtensionSchemaUpdates'][] = 'UploadWizardHooks::onSchemaUpdate';
$wgHooks['GetPreferences'][] = 'UploadWizardHooks::onGetPreferences';

$wgAvailableRights[] = 'upwizcampaigns';

# Users that can modify the upload campaigns (ie via Special:UploadCampaigns)
$wgGroupPermissions['*'               ]['upwizcampaigns'] = false;
$wgGroupPermissions['user'            ]['upwizcampaigns'] = false;
$wgGroupPermissions['autoconfirmed'   ]['upwizcampaigns'] = false;
$wgGroupPermissions['bot'             ]['upwizcampaigns'] = false;
$wgGroupPermissions['sysop'           ]['upwizcampaigns'] = true;
$wgGroupPermissions['upwizcampeditors']['upwizcampaigns'] = true;

$wgAddGroups['sysop'][] = 'upwizcampeditors';
$wgRemoveGroups['sysop'][] = 'upwizcampeditors';

$wgDefaultUserOptions['upwiz_deflicense'] = 'default';
$wgDefaultUserOptions['upwiz_def3rdparty'] = 'default';
$wgDefaultUserOptions['upwiz_deflicensetype'] = 'default';
$wgDefaultUserOptions['upwiz_maxsimultaneous'] = 'default';

// Init the upload wizard config array
// UploadWizard.config.php includes default configuration
// any value can be modified in localSettings.php by setting  $wgUploadWizardConfig['name'] = 'value;
$wgUploadWizardConfig = array();

/* Define default namespaces, as defined on Mediawiki.org
 * https://www.mediawiki.org/wiki/Extension_default_namespaces#UploadWizard */
define( 'NS_CAMPAIGN', 460 );
define( 'NS_CAMPAIGN_TALK', 461 );
