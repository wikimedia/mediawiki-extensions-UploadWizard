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

}