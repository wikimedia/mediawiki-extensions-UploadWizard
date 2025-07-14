<?php
/**
 * Fixes timestamp corruption caused by one or more webservers temporarily
 * being set to the wrong time.
 * The time offset must be known and consistent. Start and end times
 * (in 14-character format) restrict the search, and must bracket the damage.
 * There must be a majority of good timestamps in the search period.
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
 * @ingroup Maintenance
 * @author Yuvi Panda <yuvipanda@gmail.com>
 */

// @codeCoverageIgnoreStart
$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";
// @codeCoverageIgnoreEnd

use MediaWiki\Extension\UploadWizard\CampaignContent;
use MediaWiki\Maintenance\Maintenance;
use MediaWiki\Title\Title;

/**
 * Maintenance script to migrate campaigns from older, database table
 * to newer page based storage
 *
 * @ingroup Maintenance
 */
class MigrateCampaigns extends Maintenance {

	/**
	 * @var \Wikimedia\Rdbms\IDatabase
	 */
	private $dbr = null;

	public function __construct() {
		parent::__construct();

		$this->requireExtension( 'Upload Wizard' );
		$this->addDescription( "Migrate UploadCampaigns from database storage to pages" );
		$this->addOption( 'user', 'The user to perform the migration as', false, true, 'u' );
	}

	private const OLD_KEY_DEFAULTS = [
		'headerLabelPage' => '',
		'thanksLabelPage' => '',

		'defaultLicenseType' => 'choice',
		'ownWorkOption' => 'choice',
		'licensesOwnWork' => '',
		'defaultOwnWorkLicense' => '',

		'skipTutorial' => false,
		'tutorialTemplate' => 'Licensing_tutorial_$1.svg',
		'tutorialWidth' => 720,
		'tutorialHelpdeskCoords' => '27, 1319, 691, 1384',

		'autoWikiText' => '',
		'autoCategories' => '',

		'defaultDescription' => '',
		'defaultLat' => '',
		'defaultLon' => '',
		'defaultAlt' => '',
		'defaultCategories' => '',

		'idField' => '',
		'idFieldLabel' => '',
		'idFieldLabelPage' => '',
		'idFieldMaxLength' => 25,
		'idFieldInitialValue' => '',

		'idField2' => '',
		'idField2Label' => '',
		'idField2LabelPage' => '',
		'idField2MaxLength' => 25,
		'idField2InitialValue' => ''
	];

	private const OLD_NUMBER_CONFIGS = [
		'idFieldMaxLength',
		'idField2MaxLength',
		'tutorialWidth',
		'defaultLat',
		'defaultLon',
		'defaultAlt'
	];

	/**
	 * @param int|string $id
	 * @return array
	 */
	private function getConfigFromDB( $id ) {
		$config = [];

		$confProps = $this->dbr->newSelectQueryBuilder()
			->select( [ 'cc_property', 'cc_value' ] )
			->from( 'uw_campaign_conf' )
			->where( [ 'cc_campaign_id' => $id ] )
			->caller( __METHOD__ )
			->fetchResultSet();

		foreach ( $confProps as $confProp ) {
			if ( in_array( $confProp->cc_property, self::OLD_NUMBER_CONFIGS ) ) {
				$config[$confProp->cc_property] = intval( $confProp->cc_value );
			} else {
				$config[$confProp->cc_property] = $confProp->cc_value;
			}
		}

		$mergedConfig = [];

		foreach ( self::OLD_KEY_DEFAULTS as $key => $default ) {
			if ( array_key_exists( $key, $config ) && $config[$key] !== $default ) {
				$mergedConfig[$key] = $config[$key];
			} else {
				$mergedConfig[$key] = null;
			}
		}

		return $mergedConfig;
	}

	/**
	 * @param string $string
	 * @return string[]
	 */
	private function explodeStringToArray( $string ) {
		$parts = explode( '|', $string );
		$array = [];

		foreach ( $parts as $part ) {
			$part = trim( $part );

			if ( $part !== '' ) {
				$array[] = $part;
			}
		}
		return $array;
	}

	/**
	 * @param array $array
	 * @return array
	 */
	private function trimArray( $array ) {
		$newArray = [];
		foreach ( $array as $key => $value ) {
			if ( is_array( $value ) ) {
				$trimmedValue = $this->trimArray( $value );
				if ( $trimmedValue !== [] ) {
					$newArray[$key] = $trimmedValue;
				}
			} elseif ( $value !== null ) {
				$newArray[$key] = $value;
			}
		}
		return $newArray;
	}

	/**
	 * Ensure that the default license, if set, is the first
	 *
	 * @param array $licenses
	 * @param string $default
	 * @return array
	 */
	private function ensureDefaultLicense( $licenses, $default ) {
		if ( count( $licenses ) === 1 || ( $default === null || trim( $default ) === '' ) ) {
			return $licenses;
		}
		if ( in_array( $default, $licenses ) ) {
			array_splice( $licenses, array_search( $default, $licenses ), 1 );
		}
		array_unshift( $licenses, $default );
		// FIXME: No return value
	}

	/**
	 * @param stdClass $campaign
	 * @param array $oldConfig
	 * @return array
	 */
	private function getConfigForJSON( $campaign, $oldConfig ) {
		$config = [
			'enabled' => $campaign->campaign_enabled === '1',
			'display' => [
				'headerLabelPage' => $oldConfig['headerLabelPage'],
				'thanksLabelPage' => $oldConfig['thanksLabelPage']
			],
			'defaults' => [
				'description' => $oldConfig['defaultDescription'],
				'lat' => $oldConfig['defaultLat'],
				'lon' => $oldConfig['defaultLon'],
				'categories' => $this->explodeStringToArray( $oldConfig['defaultCategories'] )
			],
			'autoAdd' => [
				'wikitext' => $oldConfig['autoWikiText'],
				'categories' => $this->explodeStringToArray( $oldConfig['autoCategories'] )
			],
			"licensing" => [
				'defaultType' => $oldConfig['defaultLicenseType'],
				'ownWorkDefault' => $oldConfig['ownWorkOption'],
				'ownWork' => [
					'licenses' => $this->ensureDefaultLicense(
						$this->explodeStringToArray( $oldConfig['licensesOwnWork'] ),
						$oldConfig['defaultOwnWorkLicense']
					)
				]
			],
			'fields' => [
				[
					'wikitext' => $oldConfig['idField'],
					'label' => $oldConfig['idFieldLabel'],
					# Migrated even though this is a nop.
					# People will have to migrate this manually
					'labelPage' => $oldConfig['idFieldLabelPage'],
					'maxLength' => $oldConfig['idFieldMaxLength'],
					'initialValue' => $oldConfig['idFieldInitialValue']
				],
				[
					'wikitext' => $oldConfig['idField2'],
					'label' => $oldConfig['idField2Label'],
					'labelPage' => $oldConfig['idField2LabelPage'],
					'maxLength' => $oldConfig['idField2MaxLength'],
					'initialValue' => $oldConfig['idField2InitialValue']
				]
			],
			'tutorial' => [
				'skip' => (bool)$oldConfig['skipTutorial'],
				'template' => $oldConfig['tutorialTemplate'],
				'helpdeskCoords' => $oldConfig['tutorialHelpdeskCoords'],
				'width' => $oldConfig['tutorialWidth']
			]
		];

		return $this->trimArray( $config );
	}

	public function execute() {
		$services = $this->getServiceContainer();

		$username = $this->getOption( 'user', 'Maintenance script' );

		$this->dbr = $services->getDBLoadBalancerFactory()->getPrimaryDatabase();
		$campaigns = $this->dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'uw_campaigns' )
			->caller( __METHOD__ )
			->fetchResultSet();

		if ( !$campaigns->numRows() ) {
			$this->output( "Nothing to migrate.\n" );
			return;
		}

		$user = $services->getUserFactory()->newFromName( $username );
		if ( !$user ) {
			$this->fatalError( 'invalid username.' );
		}
		$wikiPageFactory = $services->getWikiPageFactory();
		foreach ( $campaigns as $campaign ) {
			$oldConfig = $this->getConfigFromDB( $campaign->campaign_id );
			$newConfig = $this->getConfigForJSON( $campaign, $oldConfig );

			$title = Title::makeTitleSafe( NS_CAMPAIGN, $campaign->campaign_name );
			$page = $wikiPageFactory->newFromTitle( $title );

			$content = new CampaignContent( json_encode( $newConfig ) );
			$page->doUserEditContent(
				$content,
				$user,
				"Migrating from old campaign tables"
			);
			$this->output( "Migrated {$campaign->campaign_name}\n" );
		}
	}
}

// @codeCoverageIgnoreStart
$maintClass = MigrateCampaigns::class;
require_once RUN_MAINTENANCE_IF_MAIN;
// @codeCoverageIgnoreEnd
