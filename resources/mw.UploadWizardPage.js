/*
 * This script is run on [[Special:UploadWizard]].
 * Configures and creates an interface for uploading files in multiple steps, hence "wizard".
 *
 * Tries to transform Javascript globals dumped on us by the SpecialUploadWizard.php into a more
 * compact configuration, owned by the UploadWizard created.
 */

// Create UploadWizard
( function () {

	function isCompatible() {
		return !!(
			window.FileReader &&
			window.FormData &&
			window.File &&
			window.File.prototype.slice
		);
	}

	/**
	 * @class
	 */
	mw.UploadWizardPage = function () {
		const config = mw.config.get( 'UploadWizardConfig' );

		// Default configuration value that cannot be removed
		config.maxUploads = config.maxUploads || 10;

		// Remove the initial spinner
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '.mwe-first-spinner' ).remove();

		// eslint-disable-next-line no-jquery/no-global-selector
		if ( $( '#upload-wizard' ).length === 0 ) {
			mw.log( 'UploadWizard is disabled, nothing to do.' );
			return;
		}

		if ( !isCompatible() ) {
			// Display the same error message as for grade-C browsers
			// eslint-disable-next-line no-jquery/no-global-selector
			$( '.mwe-upwiz-unavailable' ).show();
			return;
		}

		const uploadWizard = new mw.UploadWizard( config );
		uploadWizard.createInterface( '#upload-wizard' );
	};

	$( () => {
		// show page.
		mw.UploadWizardPage();
	} );

}() );
