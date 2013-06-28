<?php

/**
 * Class that represents a single upload campaign.
 * An upload campaign is stored as a row in the uw_campaigns table,
 * and its configuration is stored in the Campaign: namespace
 *
 * This class is 'readonly' - to modify the campaigns, please
 * edit the appropriate Campaign: namespace page
 *
 * @file
 * @ingroup Upload
 *
 * @since 1.2
 *
 * @licence GNU GPL v2+
 * @author Yuvi Panda <yuvipanda@gmail.com>
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class UploadWizardCampaign extends ORMRow {

	/**
	 * The campaign configuration.
	 *
	 * @since 1.2
	 * @var array
	 */
	protected $config = array();

	/**
	 * If the campaign config has been loaded or not.
	 *
	 * @since 1.2
	 * @var boolean
	 */
	protected $loadedConfig = false;

	/**
	 * Returns the list of configuration settings that can be modified by campaigns,
	 * and the HTMLForm input type that can be used to represent their value.
	 * Property name => HTMLForm input type
	 *
	 * @since 1.2
	 *
	 * @return array
	 */
	public static function getConfigTypes() {
		$globalConfig = UploadWizardConfig::getConfig();

		// XXX: This will be killed one by one, then replaced by a JSON Schema
		$config = array(
			'ownWorkOption' => array(
				'type' => 'radio',
				'options' => array(
					wfMessage( 'mwe-upwiz-campaign-owner-choice' )->text() => 'choice',
					wfMessage( 'mwe-upwiz-campaign-owner-own' )->text() => 'own',
					wfMessage( 'mwe-upwiz-campaign-owner-notown' )->text() => 'notown'
				)
			),
			'licensesOwnWork' => array(
				'type' => 'multiselect',
				'options' => array(),
				'default' => $globalConfig['licensesOwnWork']['licenses']
			),
			'defaultOwnWorkLicence' => array(
				'type' => 'radio',
				'options' => array(),
				'default' => $globalConfig['licensesOwnWork']['defaults'][0]
			),
		);

		foreach ( $globalConfig['licenses'] as $licenseName => $licenseDate ) {
			$licenceMsg = UploadWizardHooks::getLicenseMessage( $licenseName, $globalConfig['licenses'] );
			$config['licensesOwnWork']['options'][$licenceMsg] = $licenseName;
		}

		$config['defaultOwnWorkLicence']['options'] = $config['licensesOwnWork']['options'];

		return $config;
	}

	/**
	 * Returns the default configuration values.
	 * Property name => array( 'default' => $value, 'type' => HTMLForm input type )
	 *
	 * @since 1.2
	 *
	 * @return array
	 */
	public static function getDefaultConfig() {
		static $config = false;

		if ( $config === false ) {
			$config = array();
			$globalConf = UploadWizardConfig::getConfig();

			foreach ( self::getConfigTypes() as $setting => $data ) {
				if ( array_key_exists( $setting, $globalConf ) ) {
					$config[$setting] = array_merge( array( 'default' => $globalConf[$setting] ), $data );
				}
				elseif ( in_array( $setting, array( 'defaultOwnWorkLicence' ) ) ) {
					// There are some special cases where a setting does not have
					// a direct equivalent in the global config, hence the in_array().
					$config[$setting] = $data;
				}
				else {
					wfWarn( "Nonexiting Upload Wizard configuration setting '$setting' will be ignored." );
				}
			}
		}

		return $config;
	}

	/**
	 * Returns the name of the campaign.
	 *
	 * @since 1.2
	 *
	 * @return string
	 */
	public function getName() {
		return $this->getField( 'name' );
	}

	/**
	 * Returns if the campaign is enabled.
	 *
	 * @since 1.2
	 *
	 * @return boolean
	 */
	public function getIsEnabled() {
		return $this->getField( 'enabled' );
	}

	/**
	 * Sets all config properties.
	 *
	 * Ideally this should be private, but is required for the
	 * batchSelect in UploadWizardCampaigns. FIXME
	 *
	 * @since 1.3
	 *
	 * @param array $config
	 */
	public function setConfig( array $config ) {
		$defaultConfig = self::getDefaultConfig();

		foreach ( $config as $settingName => &$settingValue ) {
			// This can happen when a campaign was created with an option that has been removed from the extension.
			if ( !array_key_exists( $settingName, $defaultConfig ) ) {
				continue;
			}

			if ( is_array( $defaultConfig[$settingName]['default'] ) && !is_array( $settingValue ) ) {
				$parts = explode( '|', $settingValue );
				$settingValue = array();

				foreach ( $parts as $part ) {
					$part = trim( $part );

					if ( $part !== '' ) {
						$settingValue[] = $part;
					}
				}
			}
		}

		$this->config = $config;
		$this->loadedConfig = $this->config !== array();
	}

	/**
	 * Returns all set config properties.
	 * Property name => property value
	 *
	 * @since 1.2
	 *
	 * @return array
	 */
	public function getConfig() {
		if ( !$this->loadedConfig ) {
			if ( $this->hasIdField() ) {
				$this->setConfig( $this->getProps() );
			}

			$this->loadedConfig = true;
		}

		return $this->config;
	}

	/**
	 * Returns the configuration, ready for merging with the
	 * global configuration.
	 *
	 * @since 1.2
	 *
	 * @return array
	 */
	public function getConfigForGlobalMerge() {
		$config = $this->getConfig();

		foreach ( $config as $settingName => &$settingValue ) {
			switch ( $settingName ) {
				case 'licensesOwnWork':
					$settingValue = array_merge(
						UploadWizardConfig::getSetting( 'licensesOwnWork' ),
						array( 'licenses' => $settingValue )
					);
					break;
			}
		}

		foreach ( self::getDefaultConfig() as $name => $data ) {
			if ( !array_key_exists( $name, $config ) ) {
				$config[$name] = $data['default'];
			}
		}

		$config['licensesOwnWork']['defaults'] = array( $config['defaultOwnWorkLicence'] );
		unset( $config['defaultOwnWorkLicence'] );

		return $config;
	}

	/**
	 * Returns all config properties by merging the set ones with a list of default ones.
	 * Property name => array( 'default' => $value, 'type' => HTMLForm input type )
	 *
	 * @since 1.2
	 *
	 * @return array
	 */
	public function getAllConfig() {
		$setConfig = $this->getConfig();
		$config = array();

		foreach ( self::getDefaultConfig() as $name => $data ) {
			if ( array_key_exists( $name, $setConfig ) ) {
				$data['default'] = $setConfig[$name];
			}

			$config[$name] = $data;
		}

		return $config;
	}

	/**
	 * Explicitly disallow inserting new objects
	 * @since 1.4
	 *
	 * @param string|null $functionName
	 * @param array|null $options
	 *
	 * @return boolean Success indicator
	 */
	protected function insert( $functionName = null, array $options = null ) {
		// FIXME: Throw an exception maybe?
		die( "This function should not be called" );
	}

	/**
	 * Explicitly disallow updating new objects
	 * @since 1.4
	 *
	 * @param $functionName null|string
	 *
	 * @return boolean Success indicator
	 */
	public function save( $functionName = null ) {
		// FIXME: Throw an exception maybe?
		die( "This function should not be called" );
	}

	/**
	 * Explicitly disallow removing objects
	 *
	 * @since 1.4
	 *
	 * @return boolean Success indicator
	 */
	public function remove() {
		// FIXME: Throw an exception maybe?
		die( "This function should not be called" );
	}

	/**
	 * Get the configuration properties from the Campaign: namespace
	 *
	 * @since 1.2
	 *
	 * @return array
	 */
	protected function getProps() {
		$config = array();

		$campaignName = $this->getField( 'name' );
		$campaignPage = WikiPage::factory( Title::newFromText( $campaignName, NS_CAMPAIGN ) );

		$config = $campaignPage->getContent()->getJsonData();

		return $config;
	}


}
