<?php
/**
 * @file
 * @ingroup Upload
 *
 * @license GPL-2.0-or-later
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */

namespace MediaWiki\Extension\UploadWizard;

/**
 * Static class with methods for interacting with the Upload Wizards configuration.
 *
 * @since 1.2
 */
class Config {

	/**
	 * Same functionality as array_merge_recursive, but sanely
	 * It treats 'normal' integer indexed arrays as scalars, and does
	 * not recurse into them. Associative arrays are recursed into
	 */
	public static function arrayReplaceSanely( array $array, array $replacements ): array {
		foreach ( $replacements as $key => $replacement ) {
			$oldValue = $array[$key] ?? null;
			// Recurse only into associative arrays
			if ( is_array( $oldValue ) && !array_is_list( $oldValue ) ) {
				$replacement = self::arrayReplaceSanely( $oldValue, $replacement );
			}
			$array[$key] = $replacement;
		}
		return $array;
	}

	/**
	 * Holder for configuration specified via url arguments.
	 * This will override other config when returned via getConfig.
	 *
	 * @since 1.2
	 */
	private static array $urlConfig = [];

	/**
	 * @internal For use in ConfigTest by PHPUnit
	 */
	private static bool $mergedConfig = false;

	/**
	 * Returns the globally configuration, optionally combined with campaign specific
	 * configuration.
	 *
	 * @since 1.2
	 */
	public static function getConfig( ?string $campaignName = null ): array {
		global $wgUploadWizardConfig;

		if ( !self::$mergedConfig ) {
			// This intentionally overwrites the global with defaults
			$wgUploadWizardConfig = self::arrayReplaceSanely(
				self::getDefaultConfig(),
				$wgUploadWizardConfig
			);
			self::$mergedConfig = true;
		}

		// Don't put a specific campaign into the global
		$config = $wgUploadWizardConfig;
		if ( $campaignName !== null ) {
			$config = self::arrayReplaceSanely( $config, self::getCampaignConfig( $campaignName ) );
		}
		return array_replace_recursive( $config, self::$urlConfig );
	}

	/**
	 * Returns the value of a single configuration setting.
	 *
	 * @since 1.2
	 *
	 * @param string $settingName
	 * @param string|null $campaignName
	 *
	 * @return mixed
	 */
	public static function getSetting( string $settingName, ?string $campaignName = null ) {
		return self::getConfig( $campaignName )[$settingName];
	}

	/**
	 * Sets a configuration setting provided by URL.
	 * This will override other config when returned via getConfig.
	 *
	 * @param string $name
	 * @param mixed $value
	 *
	 * @since 1.2
	 */
	public static function setUrlSetting( string $name, $value ): void {
		self::$urlConfig[$name] = $value;
	}

	/**
	 * Returns the default global config, from UploadWizard.config.php.
	 *
	 * @since 1.2
	 */
	protected static function getDefaultConfig(): array {
		$configPath = dirname( __DIR__ ) . '/UploadWizard.config.php';
		return is_file( $configPath ) ? include $configPath : [];
	}

	/**
	 * Returns the configuration of the specified campaign,
	 * or an empty array when the campaign is not found or not enabled.
	 *
	 * @since 1.2
	 */
	protected static function getCampaignConfig( ?string $campaignName ): array {
		if ( $campaignName !== null ) {
			$campaign = Campaign::newFromName( $campaignName );
			if ( $campaign && $campaign->getIsEnabled() ) {
				return $campaign->getParsedConfig();
			}
		}

		return [];
	}

	/**
	 * Get a list of available third party licenses from the config.
	 *
	 * @since 1.2
	 */
	public static function getThirdPartyLicenses(): array {
		$thirdParty = self::getSetting( 'licensing' )['thirdParty'];
		$licenses = [];
		foreach ( $thirdParty['licenseGroups'] as $group ) {
			$licenses = array_merge( $licenses, $group['licenses'] );
		}
		return $licenses;
	}

}
