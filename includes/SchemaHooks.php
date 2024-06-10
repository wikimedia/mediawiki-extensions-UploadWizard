<?php

namespace MediaWiki\Extension\UploadWizard;

use MediaWiki\Installer\DatabaseUpdater;
use MediaWiki\Installer\Hook\LoadExtensionSchemaUpdatesHook;

class SchemaHooks implements LoadExtensionSchemaUpdatesHook {

	/**
	 * Schema update to set up the needed database tables.
	 *
	 * @since 1.2
	 *
	 * @param DatabaseUpdater $updater
	 */
	public function onLoadExtensionSchemaUpdates( $updater ) {
		$type = $updater->getDB()->getType();
		$path = dirname( __DIR__ ) . '/sql/';

		$updater->addExtensionTable( 'uw_campaigns', "$path/$type/tables-generated.sql" );

		// 1.38
		$updater->modifyExtensionField(
			'uw_campaigns',
			'uw_campaigns_enabled',
			"$path/$type/patch-uw_campaigns-cleanup.sql"
		);
	}
}
