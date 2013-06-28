<?php

/**
 * Class that represents the upload campaign table: uw_campaigns.
 *
 * This class is 'readonly' - to modify the campaigns, please
 * edit the appropriate Campaign: namespace page
 *
 * @file
 * @ingroup Upload
 *
 * @since 1.3
 *
 * @licence GNU GPL v2+
 * @author Yuvi Panda <yuvipanda@gmail.com>
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class UploadWizardCampaigns extends ORMTable {

	/**
	 * @see IORMTable::getName()
	 * @since 1.3
	 * @return string
	 */
	public function getName() {
		return 'uw_campaigns';
	}

	/**
	 * @see ORMTable::getFieldPrefix()
	 * @since 1.3
	 * @return string
	 */
	protected function getFieldPrefix() {
		return 'campaign_';
	}

	/**
	 * @see IORMTable::getRowClass()
	 * @since 1.3
	 * @return string
	 */
	public function getRowClass() {
		return 'UploadWizardCampaign';
	}

	/**
	 * @see IORMTable::getFields()
	 * @since 1.3
	 * @return array
	 */
	public function getFields() {
		return array(
			'id' => 'id',
			'name' => 'str',
			'enabled' => 'bool',
		);
	}

	/**
	 * Explicitly disallow deleting
	 *
	 * @since 1.4
	 *
	 * @return boolean Success indicator
	 */
	public function delete( array $conditions, $functionName = null ) {
		// FIXME: Throw an exception maybe?
		die( "This function should not be called" );
	}

	/**
	 * Selects campaigns and loads their configuration in batch.
	 *
	 * @since 1.3
	 *
	 * @param array|string|null $fields
	 * @param array $conditions
	 * @param array|null $configNames The names of the configuration values to obtain. Null for all values.
	 * @param array $options
	 * @param string|null $functionName
	 *
	 * @return ORMResult
	 */
	public function batchSelect( $fields = null, array $conditions = array(),
								 array $configNames = null, array $options = array(), $functionName = null ) {

		$campaigns = parent::select( $fields, $conditions, $options, $functionName );

		if ( $configNames === array() ) {
			return $campaigns;
		}

		if ( $campaigns->count() === 0 ) {
			return new UploadWizardCampaignList( array() );
		}

		$ids = array();
		$config = array();

		/**
		 * @var UploadWizardCampaign $campaign
		 */
		foreach ( $campaigns as $campaign ) {
			$ids[] = $campaign->getId();
			$config[$campaign->getId()] = array();
		}

		$conds = array( 'cc_campaign_id' => $ids );

		if ( is_array( $configNames ) ) {
			$conds['cc_property'] = $configNames;
		}

		$configOptions = $this->getReadDbConnection()->select(
			'uw_campaign_conf',
			'*',
			$conds,
			$functionName
		);

		foreach ( $configOptions as $option ) {
			$config[$option->cc_campaign_id][$option->cc_property] = $option->cc_value;
		}

		$campaignObjects = array();

		foreach ( $campaigns as $campaign ) {
			$campaign->setConfig( $config[$campaign->getId()] );
			$campaignObjects[] = $campaign;
		}

		return new UploadWizardCampaignList( $campaignObjects );
	}

}

/**
 * UploadWizardCampaign list that can be constructed from an array of UploadWizardCampaigns.
 *
 * TODO: this is a hack to mutate the returned ORMResult in UploadWizardCampaigns::batchSelect.
 * I'd be better to have an interface for lists of IORMRow objects and maybe an ArrayIterator extending
 * class that implements that one (both in core).
 */
class UploadWizardCampaignList extends ORMResult {

	protected $campaigns;

	/**
	 * @param array $campaigns
	 */
	public function __construct( array $campaigns ) {
		$this->campaigns = $campaigns;
		$this->rewind();
	}

	/**
	 * @return integer
	 */
	public function count() {
		return count( $this->campaigns );
	}

	/**
	 * @return boolean
	 */
	public function isEmpty() {
		return $this->campaigns === array();
	}

	/**
	 * @return UploadWizardCampaign
	 */
	public function current() {
		return $this->campaigns[$this->key];
	}

	/**
	 * @return integer
	 */
	public function key() {
		return $this->key;
	}

	public function next() {
		next( $this->campaigns );
		$this->key = key( $this->campaigns );
	}

	public function rewind() {
		reset( $this->campaigns );
		$this->key = key( $this->campaigns );
	}

	/**
	 * @return boolean
	 */
	public function valid() {
		return $this->key !== false && isset( $this->campaigns[$this->key] );
	}

}
