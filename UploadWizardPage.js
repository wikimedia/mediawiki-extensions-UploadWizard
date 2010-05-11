/*
 * This script is run on [[Special:UploadWizard]].
 * Creates an interface for uploading files in multiple steps, hence "wizard"
 */

mw.ready( function() {
	mw.load( 'UploadWizard.UploadWizard', function () {
		
		mw.setConfig( 'debug', true ); 

		mw.setDefaultConfig( 'uploadHandlerClass', null );
		mw.setConfig( 'userName', wgUserName ); 
		mw.setConfig( 'userLanguage', wgUserLanguage );
		mw.setConfig( 'fileExtensions', wgFileExtensions );
		mw.setConfig( 'token', wgEditToken );
		mw.setConfig( 'thumbnailWidth', 120 ); 

		// not for use with all wikis. 
		// The ISO 639 code for the language tagalog is "tl".
		// Normally we name templates for languages by the ISO 639 code.
		// Commons already had a template called 'tl', though.
		// so, this workaround will cause tagalog descriptions to be saved with this template instead.
		mw.setConfig( 'languageTemplateFixups', { tl: 'tgl' } );
		mw.setConfig( 'defaultLicenses', [ 'cc_by_sa_30', 'gfdl' ] );

		var uploadWizard = new mw.UploadWizard();
		uploadWizard.createInterface( '#upload-wizard' );
	
	} );
} );

