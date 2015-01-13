/*
 * This script is run on [[Special:UploadWizard]].
 * Configures and creates an interface for uploading files in multiple steps, hence "wizard".
 *
 * Tries to transform Javascript globals dumped on us by the SpecialUploadWizard.php into a more
 * compact configuration, owned by the UploadWizard created.
 */

// Create UploadWizard
( function ( mw, $ ) {

	mw.UploadWizardPage = function () {

		var uploadWizard,
			config = mw.config.get( 'UploadWizardConfig' );

		// Default configuration value that cannot be removed
		config.maxUploads = config.maxUploads || 10;

		uploadWizard = new mw.UploadWizard( config );
		uploadWizard.createInterface( '#upload-wizard' );
	};

	$( document ).ready( function () {
		// show page.
		mw.UploadWizardPage();
	} );

} )( mediaWiki, jQuery );
