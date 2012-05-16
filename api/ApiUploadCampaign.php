<?php

/**
 * API module to list and fetch data on upload wizard campaigns.
 *
 * @since 1.2
 *
 * @file ApiUploadCampaign.php
 * @ingroup Upload
 * @ingroup API
 *
 * @licence GNU GPL v2+
 * @author Brion Vibber <brion@wikimedia.org>
 */
class ApiUploadCampaign extends ApiBase {

	public function __construct( $main, $action ) {
		parent::__construct( $main, $action );
	}

	public function execute() {
		$params = $this->extractRequestParams();

		$data = array();

		$ucprop = $params['ucprop'];

		if ( isset( $params['campaigns'] ) ) {
			$campaigns = $params['campaigns'];
		} else {
			$dbr = wfGetDB( DB_SLAVE );
			$rows = $dbr->select( 'uw_campaigns', 'campaign_name', '1', __METHOD__ );
			$campaigns = array();
			foreach( $rows as $row ) {
				$campaigns[] = $row->campaign_name;
			}
		}
		foreach ( $campaigns as $campaign ) {
			$campaign = UploadWizardCampaign::newFromName( $campaign );
			if ( $campaign ) {
				$data[] = $this->formatRow( $campaign, $ucprop );
			}
		}

		$result = $this->getResult();
		$result->setIndexedTagName( $data, 'campaign' );
		$result->addValue(
			array( 'uploadcampaign' ),
			'campaigns',
			$data
		);
	}

	protected function formatRow( $campaign, $props ) {
		$item = array(
			'name' => $this->safeElement( 'name', $campaign->getName() ),
			'id' => $this->safeElement( 'id', intval( $campaign->getId() ) ),
			'isenabled' => $this->safeElement( 'isenabled', intval( $campaign->getIsEnabled() ) ),
		);
		if (in_array( 'config', $props ) ) {
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

	public function getAllowedParams() {
		return array(
			'campaigns' => array(
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => false,
				ApiBase::PARAM_ISMULTI => true
			),
			'ucprop' => array(
				ApiBase::PARAM_TYPE => array( 'config' ),
				ApiBase::PARAM_REQUIRED => false,
				ApiBase::PARAM_ISMULTI => true,
				ApiBase::PARAM_DFLT => '',
			),
		);
	}

	public function getParamDescription() {
		return array(
			'campaigns' => 'The name(s) of the campaign(s) to fetch info on. If empty, all campaigns will be fetched.',
		);
	}

	public function getDescription() {
		return array(
			'API module for fetching data on Upload Campaigns, associated with UploadWizard.',
			'Do not rely on this, it is an API method mostly for developer convenience and',
			'may change without warning.',
		);
	}

	protected function getExamples() {
		return array(
			'api.php?action=uploadcampaign',
			'api.php?action=uploadcampaign&campaigns=wlm-at|wlm-es',
		);
	}

	public function getVersion() {
		return __CLASS__ . ': 1.0';
	}

}
