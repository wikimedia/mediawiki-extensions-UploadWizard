<?php

/**
 * API module to query upload campaign information.
 *
 * @since 1.3
 *
 * @file
 * @ingroup UploadWizard
 * @ingroup API
 *
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 * @author Brion Vibber <brion@wikimedia.org>
 */
class ApiQueryUploadCampaigns extends ApiQueryORM {

	/**
	 * @see ApiQueryBase::__construct()
	 * @param ApiBase $main
	 * @param string $action
	 */
	public function __construct( $main, $action ) {
		parent::__construct( $main, $action, 'uc' );
	}

	/**
	 * @see ApiQueryORM::getTable()
	 * @return IORMTable
	 */
	protected function getTable() {
		return UploadWizardCampaigns::singleton();
	}

	/**
	 * @see ApiQueryORM::getRowName()
	 * @return string
	 */
	protected function getRowName() {
		return 'campaign';
	}

	/**
	 * @see ApiQueryORM::getRowName()
	 * @return string
	 */
	protected function getListName() {
		return 'campaigns';
	}

	/**
	 * @see ApiQueryORM::getResultPath()
	 * @return string
	 */
	protected function getResultPath() {
		return 'uploadcampaign';
	}

	/**
	 * @see ApiQueryORM::formatRow()
	 * @param array $params
	 * @param array $conditions
	 * @return ORMResult
	 */
	protected function getResults( array $params, array $conditions ) {
		$configNames = array();

		if ( in_array( 'config', $params['props'] ) ) {
			$configNames = array_key_exists( 'config', $params ) ? $params['config'] : null;
		}

		$props = array_filter( $params['props'], function( $prop ) { return $prop !== 'config'; } );

		return $this->getTable()->batchSelect(
			$props,
			$conditions,
			$configNames,
			array(
				'LIMIT' => $params['limit'] + 1,
				'ORDER BY' => $this->getTable()->getPrefixedField( 'id' ) . ' ASC'
			)
		);
	}

	/**
	 * @see ApiQueryORM::formatRow()
	 * @param IORMRow $campaign
	 * @param array $params
	 * @return mixed
	 */
	protected function formatRow( IORMRow $campaign, array $params ) {
		$item = array();

		if ( $campaign->hasField( 'name' ) ) {
			$item['name'] = $this->safeElement( 'name', $campaign->getName() );
		}

		if ( $campaign->hasField( 'id' ) ) {
			$item['id'] = $this->safeElement( 'id', $campaign->getId() );
		}

		if ( $campaign->hasField( 'enabled' ) ) {
			$item['isenabled'] = $this->safeElement( 'isenabled', intval( $campaign->getIsEnabled() ) );
		}

		if ( in_array( 'config', $params['props'] ) ) {
			$config = $campaign->getConfig();
			$item['config'] = array();

			foreach ( $config as $key => $val ) {
				if ( is_array( $val ) ) {
					$keys = array(
						'licensesOwnWork' => 'license',
						'defaultCategories' => 'category',
						'autoCategories' => 'category',
					);
					$this->getResult()->setIndexedTagName( $val, $keys[$key], $key );
				} else {
					$val = $this->safeElement( $key, $val );
				}

				$item['config'][$key] = $val;
			}
		}

		return $item;
	}

	/**
	 * Wrap something in an element for XML, or nice plain JSON
	 */
	protected function safeElement( $key, $val ) {
		if ( $this->getResult()->getIsRawMode() ) {
			return array(
				'_element' => $key,
				'*' => $val
			);
		} else {
			return $val;
		}
	}

	/**
	 * @see ApiBase::getDescription()
	 * @return string
	 */
	public function getDescription() {
		return 'API module for querying upload campaigns';
	}

	/**
	 * @see ApiBase::getParamDescription()
	 * @return array
	 */
	public function getParamDescription() {
		return array(
			'name' => 'The name(s) of the campaign(s) to fetch info on.',
			'id' => 'The id(s) of the campaigns(s) to fetch info on.',
			'enabled' => 'If set, only campaigns that are (not) enabled will be returned.',
			'config' => 'The names of the configuration values to obtain. If not set all values will be returned.'
		);
	}

	/**
	 * @see ApiBase::getAllowedParams()
	 * @return array
	 */
	public function getAllowedParams() {
		$params = array_merge(
			parent::getAllowedParams(),
			array(
				'config' => array(
					ApiBase::PARAM_TYPE => 'string',
					ApiBase::PARAM_ISMULTI => true,
				),
			)
		);

		$params['props'][ApiBase::PARAM_TYPE][] = 'config';

		$params['name'][ApiBase::PARAM_ISMULTI] = true;
		$params['id'][ApiBase::PARAM_ISMULTI] = true;

		return $params;
	}

	/**
	 * @see ApiBase::getExamples()
	 * @return array
	 */
	protected function getExamples() {
		return array (
			'api.php?action=query&list=uploadcampaigns&ucname=wlm-nl&ucprop=config'
			=> 'Get the info and all configuration of the wlm-nl campaign.',
			'api.php?action=query&list=uploadcampaigns&ucname=wlm-nl|wlm-de&ucprop=config'
			=> 'Get the info and all configuration of the wlm-nl and wlm-de campaigns.',
			'api.php?action=query&list=uploadcampaigns&ucid=42'
			=> 'Get the info of the campaign with id 42.',
			'api.php?action=query&list=uploadcampaigns'
			=> 'Get the info of all the campaigns',
			'api.php?action=query&list=uploadcampaigns&ucenabled=1'
			=> 'Get the info of all the enabled campaigns',
		);
	}

	/**
	 * @see ApiBase::getVersion()
	 * @return string
	 */
	public function getVersion() {
		return __CLASS__ . ': 1.0';
	}

}
