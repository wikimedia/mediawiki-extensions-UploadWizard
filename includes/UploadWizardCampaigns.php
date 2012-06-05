<?php

/**
 * Class that represents the upload campaign table: uw_campaigns.
 *
 * @file
 * @ingroup Upload
 *
 * @since 1.3
 *
 * @licence GNU GPL v2+
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
	 * @see IORMTable::delete()
	 *
	 * @since 1.3
	 *
	 * @param array $conditions
	 * @param string|null $functionName
	 *
	 * @return boolean Success indicator
	 */
	public function delete( array $conditions, $functionName = null ) {
		$ids = $this->selectFields( 'id', $conditions, array(), true, $functionName );

		if ( $ids === array() ) {
			return true;
		}

		$dbw = wfGetDB( DB_MASTER );

		$dbw->begin();

		$success = $dbw->delete(
			$this->getName(),
			array( $this->getPrefixedField( 'id' ) => $ids ),
			$functionName
		) !== false; // DatabaseBase::delete does not always return true for success as documented...

		$success = $dbw->delete(
			'uw_campaign_conf',
			array( 'cc_campaign_id' => $ids )
		) && $success;

		$dbw->commit();

		return $success;
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

		$ids = array();
		$config = array();

		foreach ( $campaigns as $campaign ) {
			$ids[] = $campaign->getId();
			$config[$campaign->getId()] = array();
		}

		$conds = array( 'cc_campaign_id' => $ids );

		if ( is_array( $configNames ) ) {
			$conds['cc_property'] = $configNames;
		}

		$configOptions = wfGetDB( $this->getReadDb() )->select(
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