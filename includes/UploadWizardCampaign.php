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
	 * The WikiPage representing the current campaign
	 *
	 * @since 1.4
	 * @var WikiPage
	 */
	protected $page = null;

	public static function newFromName( $name ) {
		$campaignTitle = Title::makeTitleSafe( NS_CAMPAIGN, $name );
		if ( $campaignTitle === null || !$campaignTitle->exists() ) {
			return false;
		}

		$campaignPage = WikiPage::factory( Title::newFromText( $name, NS_CAMPAIGN ) );

		return new UploadWizardCampaign( $campaignPage );
	}

	private function __construct( $wikiPage ) {
		$this->page = $wikiPage;
		$this->config = $this->page->getContent()->getJsonData();
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
		return $this->page->getTitle()->getDBkey();
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
		// FIXME: Don't abuse RequestContext like this
		// Use the parser directly
		$out = RequestContext::getMain()->getOutput();
		$parsed = array();
		foreach ( $array as $key => $value ) {
			if ( $forKeys !== null ) {
				if( in_array( $key, $forKeys ) ) {
					$parsed[$key] = $out->parseInline( $value );
				} else {
					$parsed[$key] = $value;
				}
			} else {
				$parsed[$key] = $out->parseInline( $value );
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
