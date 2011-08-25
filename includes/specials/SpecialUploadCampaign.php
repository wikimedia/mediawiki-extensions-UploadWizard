<?php

/**
 * Special:UploadCampaign
 *
 * Configuration interface for an upload wizard campaign.
 *
 * @file
 * @ingroup SpecialPage
 * @ingroup Upload
 * 
 * @since 1.2
 * 
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class SpecialUploadCampaign extends FormSpecialPage {
	
	protected $subPage;
	
	/**
	 * Constructor.
	 * 
	 * @param $request is the request (usually wgRequest)
	 * @param $par is everything in the URL after Special:UploadCampaign. Not sure what we can use it for
	 */
	public function __construct( $request = null, $par = null ) {
		parent::__construct ( 'UploadCampaign', 'upwizcampaigns', false );
	}
	
	/**
	 * Get the OutputPage being used for this instance.
	 * This overrides the getOutput method of Specialpage added in MediaWiki 1.18,
	 * and returns $wgOut for older versions.
	 *
	 * @since 1.2
	 *
	 * @return OutputPage
	 */
	public function getOutput() {
		return version_compare( $GLOBALS['wgVersion'], '1.18', '>=' ) ? parent::getOutput() : $GLOBALS['wgOut'];
	}
	
	/**
	 * (non-PHPdoc)
	 * @see SpecialPage::getDescription()
	 */
	public function getDescription() {
		return wfMsg( 'mwe-upwiz-' . strtolower( $this->getName() ) );
	}
	
	/**
	 * (non-PHPdoc)
	 * @see FormSpecialPage::setParameter()
	 */
	protected function setParameter( $par ){
		$this->subPage = $par;
	}
	
	/**
	 * (non-PHPdoc)
	 * @see FormSpecialPage::getForm()
	 */
	protected function getForm() {
		$form = parent::getForm();
		$form->addButton(
			'cancelEdit',
			wfMsg( 'cancel' ),
			'cancelEdit',
			array(
				'onclick' => 'window.location="' . SpecialPage::getTitleFor( 'UploadCampaigns' )->getFullURL() . '";return false;'
			)
		);
		
		return $form;
	}
	
	/**
	 * (non-PHPdoc)
	 * @see FormSpecialPage::getFormFields()
	 */
	protected function getFormFields() {
		$dbr = wfGetDB( DB_SLAVE );
		
		$campaign = UploadWizardCampaign::newFromName( $this->subPage );
		
		$id = $campaign ? $campaign->getId() : null;
		$enabled = $campaign ? $campaign->getIsEnabled() : false; 
		$configFields = $campaign ? $campaign->getAllConfig() : UploadWizardCampaign::getDefaultConfig();
		
		$fields = array();
		
		$fields['Campaignid'] = array ( 'type' => 'hidden', 'default' => $id );
		$fields['Campaignname'] = array ( 'type' => 'text', 'default' => $this->subPage, 'label-message' => 'mwe-upwiz-campaign-name' );
		$fields['Campaignenabled'] = array ( 'type' => 'check', 'default' => $enabled, 'label-message' => 'mwe-upwiz-campaign-enabled' );
		
		foreach ( $configFields as $name => $data ) {
			$data['label-message'] = 'mwe-upwiz-campaign-conf-' . $name;
			
			// Special handling for lists of values per input type.
			if ( is_array( $data['default'] ) ) {
				switch ( $data['type'] ) {
					case 'text': case 'textarea':
						$data['default'] = implode( ', ', $data['default'] );
						break;
				}
			}
			
			$fields[$name] = $data;
		}
		
		return $fields;
	}
	
	/**
	 * Process the form.  At this point we know that the user passes all the criteria in
	 * userCanExecute(), and if the data array contains 'Username', etc, then Username
	 * resets are allowed.
	 * @param $data array
	 * @return Bool|Array
	 */
	public function onSubmit( array $data ) {
		global $wgRequest;
		
		$id = $data['Campaignid'] == '' ? null : $data['Campaignid'];
		unset( $data['Campaignid'] );
		
		$name = $data['Campaignname'];
		unset( $data['Campaignname'] );
		
		$enabled = $data['Campaignenabled'];
		unset( $data['Campaignenabled'] );
		
		if ( is_null( $id ) && !is_null( $wgRequest->getSessionData( 'uploadcampaignid-' . $name ) ) ) {
			$id = $wgRequest->getSessionData( 'uploadcampaignid-' . $name );
		}
		
		$campaign = new UploadWizardCampaign( $id, $name, $enabled, $data );
		
		$success = $campaign->writeToDB();
		
		$wgRequest->setSessionData( 'uploadcampaignid-' . $name, $campaign->getId() );
		
		if ( $success ) {
			return true;
		}
		else {
			return array(); // TODO
		}
	}
	
	public function onSuccess() {
		$this->getOutput()->redirect( SpecialPage::getTitleFor( 'UploadCampaigns' )->getLocalURL() );
	}

}
