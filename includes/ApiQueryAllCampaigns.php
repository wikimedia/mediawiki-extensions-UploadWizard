<?php
/**
 * Copyright © 2013 Yuvi Panda <yuvipanda@gmail.com>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 * http://www.gnu.org/copyleft/gpl.html
 *
 * @file
 */

namespace MediaWiki\Extension\UploadWizard;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiQuery;
use MediaWiki\Api\ApiQueryBase;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\ParamValidator\TypeDef\IntegerDef;

/**
 * Query module to enumerate all registered campaigns
 *
 * @ingroup API
 */
class ApiQueryAllCampaigns extends ApiQueryBase {
	public function __construct( ApiQuery $query, string $moduleName ) {
		parent::__construct( $query, $moduleName, 'uwc' );
	}

	public function execute() {
		$params = $this->extractRequestParams();

		$limit = $params['limit'];

		$this->addTables( 'uw_campaigns' );

		$this->addWhereIf( [ 'campaign_enabled' => 1 ], $params['enabledonly'] );
		$this->addOption( 'LIMIT', $limit + 1 );
		$this->addOption( 'ORDER BY', 'campaign_id' ); // Not sure if required?

		$this->addFields( [
			'campaign_id',
			'campaign_name',
			'campaign_enabled'
		] );

		if ( $params['continue'] !== null ) {
			$from_id = (int)$params['continue'];
			$this->addWhere( $this->getDB()->expr( 'campaign_id', '>=', $from_id ) );
		}

		$res = $this->select( __METHOD__ );

		$result = $this->getResult();

		$count = 0;

		foreach ( $res as $row ) {
			if ( ++$count > $limit ) {
				// We have more results than $limit. Set continue
				$this->setContinueEnumParameter( 'continue', $row->campaign_id );
				break;
			}

			$campaign = Campaign::newFromName( $row->campaign_name );

			$campaignPath = [ 'query', $this->getModuleName(), $row->campaign_id ];

			$result->addValue(
				$campaignPath,
				'*',
				json_encode( $campaign->getParsedConfig() )
			);
			$result->addValue(
				$campaignPath,
				'name',
				$campaign->getName()
			);
			$result->addValue(
				$campaignPath,
				'trackingCategory',
				$campaign->getTrackingCategory()->getDBkey()
			);
			$result->addValue(
				$campaignPath,
				'totalUploads',
				$campaign->getUploadedMediaCount()
			);
			if ( Config::getSetting( 'campaignExpensiveStatsEnabled' ) === true ) {
				$result->addValue(
					$campaignPath,
					'totalContributors',
					$campaign->getTotalContributorsCount()
				);
			}
		}
		$result->addIndexedTagName( [ 'query', $this->getModuleName() ], 'campaign' );
	}

	/** @inheritDoc */
	public function getCacheMode( $params ) {
		return 'public';
	}

	/** @inheritDoc */
	public function getAllowedParams() {
		return [
			'enabledonly' => false,
			'limit' => [
				ParamValidator::PARAM_DEFAULT => 50,
				ParamValidator::PARAM_TYPE => 'limit',
				IntegerDef::PARAM_MIN => 1,
				IntegerDef::PARAM_MAX => ApiBase::LIMIT_BIG1,
				IntegerDef::PARAM_MAX2 => ApiBase::LIMIT_BIG2
			],
			'continue' => [
				ApiBase::PARAM_HELP_MSG => 'api-help-param-continue',
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages() {
		return [
			'action=query&list=allcampaigns&uwcenabledonly='
				=> 'apihelp-query+allcampaigns-example-1',
		];
	}

	/** @inheritDoc */
	public function getHelpUrls() {
		return 'https://www.mediawiki.org/wiki/Special:MyLanguage/Extension:UploadWizard';
	}
}
