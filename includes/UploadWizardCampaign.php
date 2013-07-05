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
class UploadWizardCampaign {

	/**
	 * The campaign configuration.
	 *
	 * @since 1.2
	 * @var array
	 */
	protected $config = array();

	protected $data = array();

	public static function newFromName( $name ) {
		$dbr = wfGetDB( DB_SLAVE );
		$result = $dbr->select(
			'uw_campaigns',
			'*',
			array( 'campaign_name' => $name )
		);

		if ( $result->numRows() === 0 ) {
			return false; // Nothing with this name, move on...
		}
		// We expect only one result, since there exists a unique index
		$row = $result->fetchRow();

		$campaignPage = WikiPage::factory( Title::newFromText( $name, NS_CAMPAIGN ) );

		$config = $campaignPage->getContent()->getJsonData();

		return new UploadWizardCampaign( $row, $config );
	}

	private function __construct( $data, $config ) {
		$this->data = $data;
		$this->config = $config;
	}

	/**
	 * Returns true if current campaign is enabled
	 *
	 * @since 1.4
	 *
	 * @return boolean
	 */
	public function getIsEnabled() {
		return $this->config['enabled'];
	}

	/**
	 * Returns name of current campaign
	 *
	 * @since 1.4
	 *
	 * @return string
	 */
	public function getName() {
		return $this->data['campaign_name'];
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
		return $this->config;
	}
}
