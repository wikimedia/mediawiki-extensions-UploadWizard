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

	/**
	 * The campaign configuration, after wikitext properties have been parsed.
	 *
	 * @since 1.2
	 * @var array
	 */
	protected $parsedConfig = null;


	/**
	 * The Title representing the current campaign
	 *
	 * @since 1.4
	 * @var Title
	 */
	protected $title = null;

	public static function newFromName( $name ) {
		$campaignTitle = Title::makeTitleSafe( NS_CAMPAIGN, $name );
		if ( $campaignTitle === null || !$campaignTitle->exists() ) {
			return false;
		}

		return new UploadWizardCampaign( $campaignTitle );
	}

	function __construct( $title, $config = null ) {
		$this->title = $title;
		if ( $config === null ) {
			$this->config = WikiPage::factory( $title )->getContent()->getJsonData();
		} else {
			$this->config = $config;
		}
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
		return $this->title->getDBkey();
	}

	public function getTrackingCategory() {
		$trackingCats = UploadWizardConfig::getSetting( 'trackingCategory' );
		return Title::makeTitleSafe( NS_CATEGORY, str_replace( '$1', $this->getName(), $trackingCats['campaign'] ) );
	}

	public function getUploadedMediaCount() {
		return Category::newFromTitle( $this->getTrackingCategory() )->getFileCount();
	}

	public function getTotalContributorsCount() {
		global $wgMemc;

		$key = wfMemcKey( 'uploadwizard', 'campaign', $this->getName(), 'contributors-count' );
		$data = $wgMemc->get( $key );
		if ( $data === false ) {
			wfDebug( __METHOD__ . ' cache miss for key ' . $key );
			$dbr = wfGetDB( DB_SLAVE );
			$result = $dbr->select(
				array( 'categorylinks', 'page', 'image' ),
				array( 'count' => 'COUNT(DISTINCT img_user)' ),
				array( 'cl_to' => $this->getTrackingCategory()->getDBKey(), 'cl_type' => 'file' ),
				__METHOD__,
				array(
					'USE INDEX' => array( 'categorylinks' => 'cl_timestamp' )
				),
				array(
					'page' => array( 'INNER JOIN', 'cl_from=page_id' ),
					'image' => array( 'INNER JOIN', 'page_title=img_name' )
				)
			);

			$data = $result->current()->count;

			$wgMemc->set( $key, $data, UploadWizardConfig::getSetting( 'campaignStatsMaxAge' ) );
		}
		return $data;
	}

	public function getUploadedMedia( $limit = 24 ) {
		$dbr = wfGetDB( DB_SLAVE );
		$result = $dbr->select(
			array( 'categorylinks', 'page' ),
			array( 'cl_from', 'page_namespace', 'page_title' ),
			array( 'cl_to' => $this->getTrackingCategory()->getDBKey(), 'cl_type' => 'file' ),
			__METHOD__,
			array(
				'ORDER BY' => 'cl_timestamp DESC',
				'LIMIT' => $limit,
				'USE INDEX' => array( 'categorylinks' => 'cl_timestamp' )
			),
			array( 'page' => array( 'INNER JOIN', 'cl_from=page_id' ) )
		);

		$images = array();
		foreach ( $result as $row ) {
			$images[] = Title::makeTitle( $row->page_namespace, $row->page_title );
		}

		return $images;
	}

	/**
	 * Returns all set config properties.
	 * Property name => property value
	 *
	 * @since 1.2
	 *
	 * @return array
	 */
	public function getRawConfig() {
		return $this->config;
	}

	/**
	 * Wrapper around OutputPage::parseInline
	 *
	 * @param $value String Wikitext to parse
	 *
	 * @since 1.3
	 *
	 * @return String parsed wikitext
	 */
	private function parseValue( $value ) {
		// FIXME: Don't abuse RequestContext like this
		// Use the parser directly
		$out = RequestContext::getMain()->getOutput();
		return $out->parseInline( $value );
	}

	/**
	 * Parses the values in an assoc array as wikitext
	 *
	 * @param $array Array
	 * @param $forKeys Array: Array of keys whose values should be parsed
	 *
	 * @since 1.3
	 *
	 * @return array
	 */
	private function parseArrayValues( $array, $forKeys = null ) {
		$parsed = array();
		foreach ( $array as $key => $value ) {
			if ( $forKeys !== null ) {
				if( in_array( $key, $forKeys ) ) {
					$parsed[$key] = $this->parseValue( $value );
				} else {
					$parsed[$key] = $value;
				}
			} else {
				$parsed[$key] = $this->parseValue( $value );
			}
		}
		return $parsed;
	}

	/**
	 * Returns all config parameters, after parsing the wikitext based ones
	 *
	 * @since 1.3
	 *
	 * @return array
	 */
	public function getParsedConfig() {
		if ( $this->parsedConfig === null ) {
			$parsedConfig = array();
			foreach ( $this->config as $key => $value ) {
				switch ( $key ) {
				case "title":
				case "description":
					$parsedConfig[$key] = $this->parseValue( $value );
					break;
				case "display":
					$parsedConfig['display'] = $this->parseArrayValues( $value );
					break;
				case "fields":
					$parsedConfig['fields'] = array();
					foreach ( $value as $field ) {
						$parsedConfig['fields'][] = $this->parseArrayValues(
							$field,
							array( 'label' )
						);
					}
					break;
				default:
					$parsedConfig[$key] = $value;
					break;
				}
			}
			$this->parsedConfig = $parsedConfig;
		}
		return $this->parsedConfig;
	}
}
