<?php

/**
 * FIXME: This class should have much reduced functionality
 * by the end of the refactor
 * Class that represents a single upload campaign.
 * An upload campaign is stored as a row in the uw_campaigns table,
 * and its configuration is stored in the Campaign: namespace
 *
 * @file
 * @ingroup Upload
 *
 * @since 1.2
 *
 * @licence GNU GPL v2+
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
			'headerLabelPage' => array(
				'type' => 'text',
			),
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
			'thanksLabelPage' => array(
				'type' => 'text'
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
	 * @since 1.2
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
	 * @see ORMRow::insert()
	 *
	 * @since 1.3
	 *
	 * @param string|null $functionName
	 * @param array|null $options
	 *
	 * @return boolean Success indicator
	 */
	protected function insert( $functionName = null, array $options = null ) {
		$success = parent::insert( $functionName, $options );

		if ( $success ) {
			$success &= $this->writeProps();
		}

		return $success;
	}

	/**
	 * @see ORMRow::save()
	 *
	 * @since 1.3
	 *
	 * @param $functionName null|string
	 *
	 * @return boolean Success indicator
	 */
	public function save( $functionName = null ) {
		$success = parent::save( $functionName );

		$success &= $this->writeProps();

		return $success;
	}

	/**
	 * Write (insert) the configuration into the DB.
	 *
	 * @since 1.2
	 *
	 * @return boolean Success indicator
	 */
	protected function writeProps() {
		if ( array_key_exists( 'defaultOwnWorkLicence', $this->config )
			&& array_key_exists( 'licensesOwnWork', $this->config )
			&& !in_array( $this->config['defaultOwnWorkLicence'], $this->config['licensesOwnWork'] ) ) {
			$this->config['licensesOwnWork'][] = $this->config['defaultOwnWorkLicence'];
		}

		$campaignName = $this->getField( 'name' );
		$campaignPage = WikiPage::factory( Title::newFromText( $campaignName, NS_CAMPAIGN ) );

		$status = $campaignPage->doEditContent(
			new CampaignContent( json_encode( $this->config ) ),
			wfMessage( 'mwe-upwiz-campaign-edit-summary-update' )->inContentLanguage()->escaped()
		);

		return $status->isOK();
	}

	/**
	 * Get the configuration properties from the DB.
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

	/**
	 * Delete the campaign from the DB (when present).
	 *
	 * @since 1.3
	 *
	 * @return boolean Success indicator
	 */
	public function remove() {
		$d1 = parent::remove();

		$campaignName = $this->getField( 'name' );
		$campaignPage = WikiPage::factory( Title::newFromText( $campaignName, NS_CAMPAIGN ) );

		$deleteStatus = $campaignpage->doDeleteArticleReal(
			wfMessage( 'mwe-upwiz-campaign-edit-summary-delete' )->inContentLanguage()->text()
		);
		return $d1 && $deleteStatus->isOK();
	}

}
