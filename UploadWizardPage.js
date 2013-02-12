/*
 * This script is run on [[Special:UploadWizard]].
 * Configures and creates an interface for uploading files in multiple steps, hence "wizard".
 *
 * Tries to transform Javascript globals dumped on us by the SpecialUploadWizard.php into a more
 * compact configuration, owned by the UploadWizard created.
 */

// Create UploadWizard
( function ( $, mw, undefined ) {

mw.UploadWizardPage = function () {

	var config = mw.config.get( 'UploadWizardConfig' );
	if ( !config.debug ) {
		mw.log.level = mw.log.NONE;
	}

	var uploadWizard = new mw.UploadWizard( config );
	uploadWizard.createInterface( '#upload-wizard' );

};

$( document ).ready( function () {
	// show page.
	mw.UploadWizardPage();
} );

} )( jQuery, mediaWiki );
