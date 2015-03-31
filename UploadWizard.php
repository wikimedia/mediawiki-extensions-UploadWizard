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
 * @author Yuvi Panda <yuvipanda@gmail.com>
 * @license GPL v2 or later
 * @version 1.3
 */

/* Configuration */

// Credits
$wgExtensionCredits['other'][] = array(
	'path' => __FILE__,
	'name' => 'Upload Wizard',
	'author' => array(
		'Neil Kandalgaonkar',
		'Jeroen De Dauw',
		'Mark Holmquist',
		'Ryan Kaldari',
		'Michael Dale',
		'Ankur Anand',
		'Nischay Nahata',
		'Yuvi Panda'
	),
	'version' => '1.4.0',
	'descriptionmsg' => 'uploadwizard-desc',
	'url' => 'https://www.mediawiki.org/wiki/Extension:UploadWizard',
	'license-name' => 'GPL-2.0+'
);

$wgMessagesDirs['UploadWizard'] = __DIR__ . '/i18n';
$wgExtensionMessagesFiles['UploadWizard'] = __DIR__ . '/UploadWizard.i18n.php';
$wgExtensionMessagesFiles['UploadWizardAlias'] = __DIR__ . '/UploadWizard.alias.php';

# Require modules
$wgAutoloadClasses += array(
	// Hooks
	'UploadWizardHooks' => __DIR__ . '/UploadWizardHooks.php',

	// Includes
	'UploadWizardConfig' => __DIR__ . '/includes/UploadWizardConfig.php',
	'UploadWizardTutorial' => __DIR__ . '/includes/UploadWizardTutorial.php',
	'UploadWizardCampaign' => __DIR__ . '/includes/UploadWizardCampaign.php',
	'UploadWizardFlickrBlacklist' => __DIR__ . '/includes/UploadWizardFlickrBlacklist.php',

	// Campaign ContentHandler
	'CampaignContentHandler' => __DIR__ . '/includes/CampaignContentHandler.php',
	'CampaignContent' => __DIR__ . '/includes/CampaignContent.php',
	'CampaignPageFormatter' => __DIR__ . '/includes/CampaignPageFormatter.php',
	'CampaignHooks' => __DIR__ . '/includes/CampaignHooks.php',

	// Special Pages
	'SpecialUploadWizard' => __DIR__ . '/includes/specials/SpecialUploadWizard.php',
	'SpecialCampaigns' => __DIR__ . '/includes/specials/SpecialCampaigns.php',

	// API
	'ApiQueryAllCampaigns' => __DIR__ . '/includes/ApiQueryAllCampaigns.php',
	'ApiFlickrBlacklist' => __DIR__ . '/includes/ApiFlickrBlacklist.php',

	// Appease the tests
	'UploadWizardSimpleForm' => __DIR__ . '/includes/specials/SpecialUploadWizard.php',
);

$wgAPIListModules['allcampaigns'] = 'ApiQueryAllCampaigns';
// $wgAPIModules['titlecheck'] = 'ApiTitleCheck';
// $wgAPIListModules['titlecheck'] = 'ApiTitleCheck';
$wgAPIModules['flickrblacklist'] = 'ApiFlickrBlacklist';

# Let the special page be a special center of unique specialness
$wgSpecialPages['UploadWizard'] = 'SpecialUploadWizard';
$wgSpecialPages['Campaigns'] = 'SpecialCampaigns';
$wgSpecialPageGroups['UploadWizard'] = 'media';
$wgSpecialPageGroups['Campaigns'] = 'media';

$wgHooks['ResourceLoaderRegisterModules'][] = 'UploadWizardHooks::resourceLoaderRegisterModules';
$wgHooks['LoadExtensionSchemaUpdates'][] = 'UploadWizardHooks::onSchemaUpdate';
$wgHooks['GetPreferences'][] = 'UploadWizardHooks::onGetPreferences';
$wgHooks['IsUploadAllowedFromUrl'][] = 'UploadWizardHooks::onIsUploadAllowedFromUrl';
$wgHooks['ResourceLoaderTestModules'][] = 'UploadWizardHooks::onResourceLoaderTestModules';
$wgHooks['UnitTestsList'][] = 'UploadWizardHooks::onUnitTestsList';

$uploadWizardModuleInfo = array(
	'localBasePath' => __DIR__ . '/resources',
	'remoteExtPath' => 'UploadWizard/resources',
);

$wgResourceModules['ext.uploadWizard.formDataTransport'] = array(
	'scripts' => 'transports/mw.FormDataTransport.js',

	'dependencies' => array(
		'oojs',
	),
) + $uploadWizardModuleInfo;

$wgResourceModules['ext.uploadWizard.iFrameTransport'] = array(
	'scripts' => 'transports/mw.IframeTransport.js',
	'dependencies' => array(
		'oojs',
	),
) + $uploadWizardModuleInfo;

$wgResourceModules['ext.uploadWizard.apiUploadHandler'] = array(
	'scripts' => 'handlers/mw.ApiUploadHandler.js',
	'dependencies' => 'ext.uploadWizard.iFrameTransport',
	'messages' => 'mwe-upwiz-transport-started',
) + $uploadWizardModuleInfo;

$wgResourceModules['ext.uploadWizard.apiUploadPostHandler'] = array(
	'scripts' => 'handlers/mw.ApiUploadPostHandler.js',
	'messages' => 'mwe-upwiz-transport-started',
) + $uploadWizardModuleInfo;

//upload using FormData, large files in chunks
$wgResourceModules['ext.uploadWizard.apiUploadFormDataHandler'] = array(
	'scripts' => 'handlers/mw.ApiUploadFormDataHandler.js',
	'dependencies' => 'ext.uploadWizard.formDataTransport',
	'messages' => 'mwe-upwiz-transport-started',
) + $uploadWizardModuleInfo;

$wgResourceModules['ext.uploadWizard.page'] = array(
	'scripts' => 'mw.UploadWizardPage.js',
	'dependencies' => 'ext.uploadWizard'
) + $uploadWizardModuleInfo;

$wgResourceModules['ext.uploadWizard.uploadCampaign.display'] = array(
	'styles' => 'ext.uploadWizard.uploadCampaign.display.css',
	'position' => 'top',
	'dependencies' => 'mediawiki.ui.button'
) + $uploadWizardModuleInfo;

$wgResourceModules['ext.uploadWizard.uploadCampaign.list'] = array(
	'styles' => 'ext.uploadWizard.uploadCampaign.list.css',
	'position' => 'top'
) + $uploadWizardModuleInfo;

$wgEventLoggingSchemas[ 'UploadWizardTutorialActions' ] = 5803466;
$wgEventLoggingSchemas[ 'UploadWizardUploadActions' ] = 5811620;
$wgEventLoggingSchemas[ 'UploadWizardStep' ] = 8851805;
$wgEventLoggingSchemas[ 'UploadWizardFlowEvent' ] = 11562780;
$wgEventLoggingSchemas[ 'UploadWizardErrorFlowEvent' ] = 9924376;
$wgEventLoggingSchemas[ 'UploadWizardExceptionFlowEvent' ] = 11717009;
$wgEventLoggingSchemas[ 'UploadWizardUploadFlowEvent' ] = 9651951;

// Campaign hook handlers
$wgHooks[ 'BeforePageDisplay' ][] = 'CampaignHooks::onBeforePageDisplay';
$wgHooks[ 'EditFilterMerged' ][] = 'CampaignHooks::onEditFilterMerged';
$wgHooks[ 'CodeEditorGetPageLanguage' ][] = 'CampaignHooks::onCodeEditorGetPageLanguage';
$wgHooks[ 'PageContentSaveComplete' ][] = 'CampaignHooks::onPageContentSaveComplete';
$wgHooks[ 'ArticleDeleteComplete' ][] = 'CampaignHooks::onArticleDeleteComplete';
$wgHooks[ 'TitleMoveComplete' ][] = 'CampaignHooks::onTitleMoveComplete';
$wgHooks[ 'LinksUpdateComplete' ][] = 'CampaignHooks::onLinksUpdateComplete';

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
$wgUploadWizardConfig = array();

/* Define and configure default namespaces, as defined on Mediawiki.org
 * https://www.mediawiki.org/wiki/Extension_default_namespaces#UploadWizard */
define( 'NS_CAMPAIGN', 460 );
define( 'NS_CAMPAIGN_TALK', 461 );
$wgExtraNamespaces[ NS_CAMPAIGN ] = 'Campaign';
$wgExtraNamespaces[ NS_CAMPAIGN_TALK ] = 'Campaign_talk';

$wgNamespaceProtection[ NS_CAMPAIGN ] = array( 'upwizcampaigns' );

$wgNamespaceContentModels[ NS_CAMPAIGN ] = 'Campaign';
$wgContentHandlers[ 'Campaign' ] = 'CampaignContentHandler';

$wgCapitalLinkOverrides[ NS_CAMPAIGN ] = false;
$wgCapitalLinkOverrides[ NS_CAMPAIGN_TALK ] = false;

// add proper aliases for NS_FILE, otherwise an error is being thrown
// in combined.min.js when the content language code is not 'en':
// "unrecognized namespace=File" due to undefiled 'File' key in wgNamespaceIds
if ( !isset( $wgNamespaceAliases['File'] ) ) {
	$wgNamespaceAliases['File'] = NS_FILE;
}
if ( !isset( $wgNamespaceAliases['File_talk'] ) ) {
	$wgNamespaceAliases['File_talk'] = NS_FILE_TALK;
}
