<?php

/**
 * Static class with methods for interacting with the Upload Wizards configuration.
 *
 * @file
 * @ingroup Upload
 * 
 * @since 1.2
 * 
 * @licence GNU GPL v3+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class UploadWizardConfig {
	
	public static function getConfig( $campaignName = null ) {
		global $wgUploadWizardConfig;
		static $mergedConfig = false;
		
		if ( !$mergedConfig ) {
			$wgUploadWizardConfig = array_merge( self::getDefaultConfig(), $wgUploadWizardConfig );
		}
		
		if ( !is_null( $campaignName ) ) {
			$wgUploadWizardConfig = array_merge( $wgUploadWizardConfig, self::getCampaignConfig( $campaignName ) );
		}
		
		return $wgUploadWizardConfig;
	}
	
	protected static function getDefaultConfig() {
		global $wgUpwizDir;
		$configPath =  $wgUpwizDir . '/UploadWizard.config.php';
		return is_file( $configPath ) ? include( $configPath ) : array();
	}
	
	protected static function getCampaignConfig( $campaignName ) {
		$capmaignSettings = array();
		
		if ( !is_null( $capaignName ) ) {
			$capaign = UploadWizardCampaign::newFromName( $capaignName );
			
			if ( $capaign !== false ) {
				return $capaign->getConfig();
			}
		}
		
		return array();
	}
	
}
