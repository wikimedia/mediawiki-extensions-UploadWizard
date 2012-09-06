<?php

/**
 * Class that represents a single upload campaign.
 * An upload campaign is stored as a row in the uw_campaigns table,
 * and it's configuration is stored in uw_campaign_conf.
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

		$config = array(
			'headerLabelPage' => array(
				'type' => 'text',
			),
			'skipTutorial' => array(
				'type' => 'check'
			),
			'tutorialTemplate' => array(
				'type' => 'text',
			),
			'tutorialWidth' => array(
				'type' => 'int',
			),
			'tutorialHelpdeskCoords' => array(
				'type' => 'text',
			),
			'idField' => array(
				'type' => 'text',
			),
			'idFieldLabel' => array(
				'type' => 'text',
			),
			'idFieldLabelPage' => array(
				'type' => 'text',
			),
			'idFieldMaxLength' => array(
				'type' => 'int',
			),
			'idFieldInitialValue' => array(
				'type' => 'text',
			),
			'idField2' => array(
				'type' => 'text',
			),
			'idField2Label' => array(
				'type' => 'text',
			),
			'idField2LabelPage' => array(
				'type' => 'text',
			),
			'idField2MaxLength' => array(
				'type' => 'int',
			),
			'idField2InitialValue' => array(
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
			'defaultCategories' => array(
				'type' => 'text'
			),
			'autoCategories' => array(
				'type' => 'text'
			),
			'autoWikiText' => array(
				'type' => 'textarea',
				'rows' => 4
			),
			'thanksLabelPage' => array(
				'type' => 'text'
			),
			'defaultLat' => array(
				'type' => 'text'
			),
			'defaultLon' => array(
				'type' => 'text'
			),
			'defaultAlt' => array(
				'type' => 'text'
			),
			'defaultDescription' => array(
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
				$this->setConfig( $this->getPropsFromDB() );
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
			$success &= $this->writePropsToDB();
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

		// Delete and insert instead of update.
		// This will not result into dead-data when config vars are removed.
		$success &= wfGetDB( DB_MASTER )->delete(
			'uw_campaign_conf',
			array( 'cc_campaign_id' => $this->getId() ),
			__METHOD__
		);

		$success &= $this->writePropsToDB();

		return $success;
	}

	/**
	 * Write (insert) the configuration into the DB.
	 *
	 * @since 1.2
	 *
	 * @return boolean Success indicator
	 */
	protected function writePropsToDB() {
		$success = true;

		if ( array_key_exists( 'defaultOwnWorkLicence', $this->config )
			&& array_key_exists( 'licensesOwnWork', $this->config )
			&& !in_array( $this->config['defaultOwnWorkLicence'], $this->config['licensesOwnWork'] ) ) {
			$this->config['licensesOwnWork'][] = $this->config['defaultOwnWorkLicence'];
		}

		$dbw = wfGetDB( DB_MASTER );

		$dbw->begin();

		// TODO: it'd be better to serialize() arrays

		foreach ( $this->config as $prop => $value ) {
			$success &= $dbw->insert(
				'uw_campaign_conf',
				array(
					'cc_campaign_id' => $this->getId(),
					'cc_property' => $prop,
					'cc_value' => is_array( $value ) ? implode( '|', $value ) : $value
				),
				__METHOD__
			);
		}

		$dbw->commit();

		return $success;
	}

	/**
	 * Get the configuration properties from the DB.
	 *
	 * @since 1.2
	 *
	 * @return array
	 */
	protected function getPropsFromDB() {
		$config = array();

		$confProps = wfGetDB( DB_SLAVE )->select(
			'uw_campaign_conf',
			array( 'cc_property', 'cc_value' ),
			array( 'cc_campaign_id' => $this->getId() ),
			__METHOD__
		);

		foreach ( $confProps as $confProp ) {
			$config[$confProp->cc_property] = $confProp->cc_value;
		}

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

		$d2 = wfGetDB( DB_MASTER )->delete(
			'uw_campaign_conf',
			array( 'cc_campaign_id' => $this->getId() ),
			__METHOD__
		);

		return $d1 && $d2;
	}

}
