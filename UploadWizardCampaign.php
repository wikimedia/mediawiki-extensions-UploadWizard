<?php

/**
 * Class that represents a single upload campaign.
 *
 * @file
 * @ingroup Upload
 * 
 * @since 1.2
 * 
 * @licence GNU GPL v3+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class UploadWizardCampaign {
	
	/**
	 * If the ID of the campaign.
	 * Either this matched a record in the uw_campaigns table or is null.
	 * 
	 * @since 1.2
	 * @var integer or null
	 */
	protected $id;
	
	/**
	 * If the name of the campaign.
	 * This name is the string used to invoke the campaign via campaign=name.
	 * 
	 * @since 1.2
	 * @var string
	 */
	protected $name;
	
	/**
	 * If the campaign is enabled or not.
	 * 
	 * @since 1.2
	 * @var boolean
	 */
	protected $isEnabled;
	
	/**
	 * The campaign configuration.
	 * 
	 * @since 1.2
	 * @var array
	 */
	protected $config;
	
	/**
	 * If the campaign config has been loaded or not.
	 * 
	 * @since 1.2
	 * @var boolean
	 */
	protected $loadedConfig = false;
	
	/**
	 * Create a new instance of $campaignName.
	 * 
	 * @since 1.2
	 * 
	 * @param integer $id
	 * @param string $name
	 * @param boolean $isEnabled
	 * @param array $config
	 */
	public function __construct( $id, $name, $isEnabled, array $config ) {
		$this->id = $id;
		$this->name = $name;
		$this->isEnabled = $isEnabled;
		$this->config = $config;
		
		$this->loadedConfig = count( $this->config ) > 0;
	}
	
	/**
	 * Returns the UploadWizardCampaign with specified name, or false if there is no such campaign.
	 * 
	 * @since 1.2
	 * 
	 * @param string $campaignName
	 * @param boolean $loadConfig
	 * 
	 * @return UploadWizardCampaign or false
	 */
	public static function newFromName( $campaignName, $loadConfig = true ) {
		return self::newFromDB( array( 'campaign_name' => $campaignName ), $loadConfig );
	}
	
	/**
	 * Returns the UploadWizardCampaign with specified ID, or false if there is no such campaign.
	 * 
	 * @since 1.2
	 * 
	 * @param integer $campaignId
	 * @param boolean $loadConfig
	 * 
	 * @return UploadWizardCampaign or false
	 */
	public static function newFromId( $campaignId, $loadConfig = true ) {
		return self::newFromDB( array( 'campaign_id' => $campaignId ), $loadConfig );
	}
	
	/**
	 * Returns a new instance of UploadWizardCampaign build from a database result
	 * obtained by doing a select with the porvided conditions on the uw_campaigns table.
	 * If no campaign matches the conditions, false will be returned.
	 * 
	 * @since 1.2
	 * 
	 * @param array $conditions
	 * @param boolean $loadConfig
	 * 
	 * @return UploadWizardCampaign or false
	 */
	protected static function newFromDB( array $conditions, $loadConfig = true ) {
		$dbr = wfGetDB( DB_SLAVE );
		
		$campaign = $dbr->selectRow(
			'uw_campaigns',
			array(
				'campaign_id',
				'campaign_name',
				'campaign_enabled',
			),
			$conditions
		);
		
		if ( !$campaign ) {
			return false;
		}

		$config = $loadConfig ? self::getPropsFromDB( $dbr, $campaign->campaign_id ) : array();
		
		return new self(
			$campaign->campaign_id,
			$campaign->campaign_name,
			$campaign->campaign_enabled,
			$config
		);
	}
	
	/**
	 * Returns the id of the campaign.
	 * 
	 * @since 1.2
	 * 
	 * @return intgere
	 */
	public function getId() {
		return $this->id;
	}
	
	/**
	 * Returns the name of the campaign.
	 * 
	 * @since 1.2
	 * 
	 * @return string
	 */
	public function getName() {
		return $this->name;
	}
	
	/**
	 * Returns if the campaign is enabled.
	 * 
	 * @since 1.2
	 * 
	 * @return boolean
	 */
	public function getIsEnabled() {
		return $this->isEnabled;
	}
	
	/**
	 * Sets all config properties.
	 * 
	 * @since 1.2
	 * 
	 * @param array $config
	 */
	public function setConfig( array $config ) {
		$this->config = $config;
		$this->loadedConfig = true;
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
			if ( !is_null( $this->id ) ) {
				$this->config = self::getPropsFromDB( wfGetDB( DB_SLAVE ), $this->id );
			}
			
			$this->loadedConfig = true;
		}
		
		return $this->config;
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
	 * Returns the default configuration values.
	 * 
	 * @since 1.2
	 * 
	 * @return array
	 */
	public static function getDefaultConfig() {
		return array ( // TODO
			'skipTutorial' => array ( 'type' => 'check', 'default' => true )
		);
	}
	
	/**
	 * Returns the value of the specified config property.
	 * 
	 * @since 1.2
	 * 
	 * @param string $property
	 * 
	 * @return mixed
	 */
	public function getProperty( $property ) {
		global $wgUploadWizardConfig;
		
		if ( array_key_exists( $property, $this->config ) ) {
			return $this->config[$property];
		}
		elseif ( array_key_exists( $property, $wgUploadWizardConfig['campaignDefaults'] ) ) {
			return $wgUploadWizardConfig['campaignDefaults'][$property];
		}
		else {
			return null;
		}
	}
	
	/**
	 * Write the campaign to the DB.
	 * If it's already there, it'll be updated, else it'll be inserted.
	 * 
	 * @since 1.2
	 * 
	 * @return boolean Success indicator 
	 */
	public function writeToDB() {
		if ( is_null( $this->id ) ) {
			return $this->insertIntoDB();
		}
		else {
			return $this->updateInDB();
		}
	}
	
	/**
	 * Insert the campaign into the DB.
	 * 
	 * @since 1.2
	 * 
	 * @return boolean Success indicator 
	 */
	protected function insertIntoDB() {
		$dbw = wfGetDB( DB_MASTER );
		
		$success = $dbw->insert(
			'uw_campaigns',
			array(
				'campaign_name' => $this->name,
				'campaign_enabled' => $this->isEnabled,
			),
			array( 'campaign_id' => $this->id )
		);
		
		if ( $success ) {
			$this->id = $dbw->insertId();
			$success &= $this->writePropsToDB( $dbw );
		}
		
		return $success;
	}
	
	/**
	 * Update the campaign in the DB.
	 * 
	 * @since 1.2
	 * 
	 * @return boolean Success indicator 
	 */
	protected function updateInDB() {
		$dbw = wfGetDB( DB_MASTER );
		
		$success = $dbw->update(
			'uw_campaigns',
			array(
				'campaign_name' => $this->name,
				'campaign_enabled' => $this->isEnabled,
			),
			array( 'campaign_id' => $this->id )
		);
		
		// Delete and insert instead of update.
		// This will not result into dead-data when config vars are removed.
		$success &= $dbw->delete(
			'uw_campaign_conf',
			array( 'cc_campaign_id' => $this->id )
		);
		
		$success &= $this->writePropsToDB( $dbw );
		
		return $success;
	}
	
	/**
	 * Write (insert) the properties into the DB.
	 * 
	 * @since 1.2
	 * 
	 * @param Database $dbw
	 * 
	 * @return boolean Success indicator 
	 */
	protected function writePropsToDB( DatabaseBase $dbw ) {
		$success = true;
		
		foreach ( $this->config as $prop => $value ) {
			$success &= $dbw->insert(
				'uw_campaign_conf',
				array(
					'cc_campaign_id' => $this->id,
					'cc_property' => $prop,
					'cc_value' => $value
				)
			);
		}
		
		return $success;
	}
	
	/**
	 * Get the configuration properties from the DB.
	 * 
	 * @since 1.2
	 * 
	 * @param Database $dbr
	 * @param integer $campaignId
	 * 
	 * @return array 
	 */
	protected static function getPropsFromDB( DatabaseBase $dbr, $campaignId ) {
		$config = array();
		
		$confProps = $dbr->select(
			'uw_campaign_conf',
			array( 'cc_property', 'cc_value' ),
			array( 'cc_campaign_id' => $campaignId )
		);
		
		foreach ( $confProps as $confProp ) {
			$config[$confProp->cc_property] = $confProp->cc_value;
		}
		
		return $config;
	}
	
	/**
	 * Delete the campaign from the DB (when present).
	 * 
	 * @since 1.2
	 * 
	 * @return boolean Success indicator 
	 */
	public function deleteFromDB() {
		if ( is_null( $this->id ) ) {
			return true;
		}
		
		$dbw = wfGetDB( DB_MASTER );
		
		$d1 = $dbw->delete(
			'uw_campaigns',
			array( 'campaign_id' => $this->id )
		);
		
		$d2 = $dbw->delete(
			'uw_campaign_conf',
			array( 'cc_campaign_id' => $this->id )
		);
		
		return $d1 && $d2;
	}
	
}
