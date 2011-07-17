<?php

/**
 * Special:UploadCampaigns
 *
 * Configuration interface for upload wizard campaigns.
 *
 * @file
 * @ingroup SpecialPage
 * @ingroup Upload
 * 
 * @since 1.2
 * 
 * @licence GNU GPL v3+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class SpecialUploadCampaigns extends SpecialPage {

	/**
	 * Constructor.
	 * 
	 * @param $request is the request (usually wgRequest)
	 * @param $par is everything in the URL after Special:UploadCampaigns. Not sure what we can use it for
	 */
	public function __construct( $request = null, $par = null ) {
		global $wgRequest;

		parent::__construct( 'UploadCampaigns', 'delete' );
	}

	/**
	 * Main method.
	 * 
	 * @param string $subPage, e.g. the "foo" in Special:UploadCampaigns/foo.
	 */
	public function execute( $subPage ) {
		$this->setHeaders();
		$this->outputHeader();
		
		// If the user is authorized, display the page, if not, show an error.
		if ( $this->userCanExecute( $GLOBALS['wgUser'] ) ) {
			if ( $GLOBALS['wgRequest']->wasPosted() && $GLOBALS['wgUser']->matchEditToken( $GLOBALS['wgRequest']->getVal( 'wpEditToken' ) ) ) {
				$this->handleSubmission();
			}
			
			if ( !is_null( $subPage ) && trim( $subPage ) != '' ) {
				if ( $subPage == 'new' ) {
					$this->displayCampaign( new UWCampaign( null, '', true, array() ), true );
				}
				else {
					$campaign = UWCampaign::newFromName( $subPage );
				
					if ( $campaign === false ) {
						$this->displayCampaignList();
					}
					else {
						$this->displayCampaign( $campaign );
					}
				}
			}
			else {
				$this->displayCampaignList();
			}
		} else {
			$this->displayRestrictionError();
		}
	}
	
	protected function handleSubmission() {
		global $wgOut;
		
		// TODO
	}
	
	/**
	 * Displays a list of all campaigns.
	 * 
	 * @since 1.2
	 */
	protected function displayCampaignList() {
		$this->displayAddNewControl();
		
		$dbr = wfGetDB( DB_SLAVE );
		
		$campaigns = $dbr->select(
			'uw_campaigns',
			array(
				'campaign_id',
				'campaign_name',
				'campaign_enabled',
			)
		);
		
		if ( $campaigns->numRows() > 0 ) {
			$this->displayCampaignTable( $campaigns );
		}
	}
	
	protected function displayAddNewControl() {
		global $wgOut;
		
		$wgOut->addHTML( Html::openElement(
			'form',
			array(
				'method' => 'post',
				'action' => $this->getTitle()->getLocalURL(),
			)
		) );
		
		$wgOut->addHTML( '<fieldset>' );
		
		$wgOut->addHTML( '<legend>' . htmlspecialchars( wfMsg( 'mwe-upwiz-campaigns-addnew' ) ) . '</legend>' );
		
		$wgOut->addHTML( Html::element( 'p', array(), wfMsg( 'mwe-upwiz-campaigns-namedoc' ) ) );
		
		$wgOut->addHTML( Html::element( 'label', array( 'for' => 'newcampaign' ), wfMsg( 'mwe-upwiz-campaigns-newname' ) ) );
		
		$wgOut->addHTML( Html::input( 'newcampaign' ) . '&#160;' );
		
		$wgOut->addHTML( Html::input(
			'addnewcampaign',
			wfMsg( 'mwe-upwiz-campaigns-add' ),
			'submit'
		) );
		
		$wgOut->addHTML( Html::hidden( 'wpEditToken', $GLOBALS['wgUser']->editToken() ) );
		
		$wgOut->addHTML( '</fieldset></form>' );
	}
	
	protected function displayCampaignTable( ResultWrapper $campaigns ) {
		global $wgOut;
		
		$wgOut->addHTML( Html::element( 'h2', array(), wfMsg( 'mwe-upwiz-campaigns-existing' ) ) );
		
		$wgOut->addHTML( '<table>' );
		
		$wgOut->addHTML( 
			'<tr>' .
				Html::element( 'th', array(), wfMsg( 'mwe-upwiz-campaigns-name' ) ) .
				Html::element( 'th', array(), wfMsg( 'mwe-upwiz-campaigns-status' ) ) .
				Html::element( 'th', array(), wfMsg( 'mwe-upwiz-campaigns-edit' ) ) .
			'</tr>'
		);
		
		foreach ( $campaigns as $campaign ) {
			$wgOut->addHTML(
				'<tr>' .
					Html::element( 'td', array(), $campaign->campaign_name ) .
					Html::element( 'td', array(), wfMsg( 'mwe-upwiz-campaigns-' . ( $campaign->campaign_enabled ? 'enabled' : 'disabled' ) ) ) .
					Html::element( 'td', array(), wfMsg( 'mwe-upwiz-campaigns-edit' ) ) .
				'</tr>'
			);
		}
		
		$wgOut->addHTML( '</table>' );
	}	
	
	/**
	 * Displays a form to modify a single campaign.
	 * 
	 * @since 1.2
	 * 
	 * @param UWCampaign $campaign
	 * @param boolean $isInsert
	 */
	protected function displayCampaign( UWCampaign $campaign, $isInsert = false ) {
		 global $wgOut;
		 
		 // TODO
	}

}

class UWCampaign {
	
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
	}
	
	/**
	 * Returns the UWCampaign with specified name, or false if there is no such campaign.
	 * 
	 * @since 1.2
	 * 
	 * @param string $campaignName
	 * 
	 * @return UWCampaign or false
	 */
	public static function newFromName( $campaignName ) {
		return self::newFromDB( array( 'campaign_name' => $campaignName ) );
	}
	
	/**
	 * Returns the UWCampaign with specified ID, or false if there is no such campaign.
	 * 
	 * @since 1.2
	 * 
	 * @param integer $campaignId
	 * 
	 * @return UWCampaign or false
	 */
	public static function newFromId( $campaignId ) {
		return self::newFromDB( array( 'campaign_id' => $campaignId ) );
	}
	
	/**
	 * Returns a new instance of UWCampaign build from a database result
	 * obtained by doing a select with the porvided conditions on the uw_campaigns table.
	 * If no campaign matches the conditions, false will be returned.
	 * 
	 * @since 1.2
	 * 
	 * @param array $conditions
	 * 
	 * @return UWCampaign or false
	 */
	protected static function newFromDB( array $conditions ) {
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

		$confProps = $dbr->select(
			'uw_campaign_conf',
			array( 'cc_property', 'cc_value' ),
			array( 'cc_campaign_id' => $campaign->campaign_id )
		);
		
		$config = array();
		
		foreach ( $confProps as $confProp ) {
			$config[$confProp->cc_property] = $confProp->cc_value;
		}
		
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
	}
	
	/**
	 * Returns all config properties.
	 * 
	 * @since 1.2
	 * 
	 * @return array
	 */
	public function getConfig() {
		return $this->config;
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
	 * Set the value of a config property.
	 * 
	 * @since 1.2
	 * 
	 * @param string $property
	 * @param mixed $value
	 */
	public function setProperty( $property, $value ) {
		$this->config[$property] = $value;
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
			$this->id = $dbr->insertId();
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
	protected function writePropsToDB( Database $dbw ) {
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
