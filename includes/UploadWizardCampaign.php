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
	 * The WikiPage representing the current campaign
	 *
	 * @since 1.4
	 * @var WikiPage
	 */
	protected $page = null;

	public static function newFromName( $name ) {
		$campaignTitle = Title::makeTitleSafe( NS_CAMPAIGN, $name );
		if ( !$campaignTitle->exists() ) {
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
}
