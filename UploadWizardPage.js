/*
 * This script is run on [[Special:UploadWizard]].
 * Configures and creates an interface for uploading files in multiple steps, hence "wizard".
 *
 * Tries to transform Javascript globals dumped on us by the SpecialUploadWizard.php into a more 
 * compact configuration, owned by the UploadWizard created.
 */

// create UploadWizard
mw.UploadWizardPage = function() {
	
	var config = mw.config.get( 'UploadWizardConfig' );
	if ( !config.debug ) {
		mw.log.level = mw.log.NONE;
	}	

	var uploadWizard = new mw.UploadWizard( config );
	uploadWizard.createInterface( '#upload-wizard' );

};

jQuery( document ).ready( function() {
	// add "magic" to Language template parser for keywords
	
	var options = { 
		magic: { 
			'SITENAME' : mw.config.get('wgSitename') 
		}
	};
	
	window.gM = mediaWiki.language.getMessageFunction( options );
	$j.fn.msg = mediaWiki.language.getJqueryMessagePlugin( options );
		
	// show page. 
	mw.UploadWizardPage();
} );
