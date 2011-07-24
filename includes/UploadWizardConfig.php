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
	
	/**
	 * Returns the globally configuration, optionaly combined with campaign sepcific
	 * configuration. 
	 * 
	 * @since 1.2
	 * 
	 * @param string|null $campaignName
	 * 
	 * @return array
	 */
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
	
	/**
	 * Returns the default global config, from UploadWizard.config.php.
	 * 
	 * @since 1.2
	 * 
	 * @return array
	 */
	protected static function getDefaultConfig() {
		global $wgUpwizDir;
		$configPath =  $wgUpwizDir . '/UploadWizard.config.php';
		return is_file( $configPath ) ? include( $configPath ) : array();
	}
	
	/**
	 * Returns the configuration of the specified campaign, 
	 * or an empty array when the campaign is not found or not enabled.
	 * 
	 * @since 1.2
	 *
	 * @param string $campaignName
	 * 
	 * @return array
	 */
	protected static function getCampaignConfig( $campaignName ) {
		$capaign = UploadWizardCampaign::newFromName( $campaignName );
		
		if ( $capaign !== false && $capaign->getIsEnabled() ) {
			return $capaign->getConfig();
		}
		
		return array();
	}
	
}
