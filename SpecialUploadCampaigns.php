<?php
/**
 * Special:UploadCampaigns
 *
 * Configuration interface for upload wizard campaigns.
 *
 * @file
 * @ingroup SpecialPage
 * @ingroup Upload
 */

class SpecialUploadCampaigns extends SpecialPage {

	/**
	 * Constructor.
	 * 
	 * @param $request is the request (usually wgRequest)
	 * @param $par is everything in the URL after Special:UploadWizard. Not sure what we can use it for
	 */
	public function __construct( $request = null, $par = null ) {
		global $wgRequest;

		parent::__construct( 'UploadCampaigns', 'delete' );

		// TODO
	}

	/**
	 * Main method.
	 * 
	 * @param string $subPage, e.g. the "foo" in Special:UploadWizard/foo.
	 */
	public function execute( $subPage ) {
		// If the user is authorized, display the page, if not, show an error.
		if ( $this->userCanExecute( $GLOBALS['wgUser'] ) ) {
			// TODO
		} else {
			$this->displayRestrictionError();
		}	
	}

}