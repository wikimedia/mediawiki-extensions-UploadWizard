<?php

declare( strict_types=1 );

/**
 * Namespace name definitions
 *
 * @file
 * @ingroup Extensions
 */

$namespaceNames = [];

// For wikis where the extension is not installed
if ( !defined( 'NS_CAMPAIGN' ) ) {
	define( 'NS_CAMPAIGN', 460 );
	define( 'NS_CAMPAIGN_TALK', 461 );
}

$namespaceNames['en'] = [
	NS_CAMPAIGN => 'Campaign',
	NS_CAMPAIGN_TALK => 'Campaign_talk',
];

$namespaceNames['de'] = [
	NS_CAMPAIGN => 'Kampagne',
	NS_CAMPAIGN_TALK => 'Kampagne_Diskussion',
];
