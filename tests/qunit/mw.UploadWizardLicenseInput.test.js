( function ( mw ) {
	QUnit.module( 'ext.uploadWizardLicenseInput', QUnit.newMwEnvironment() );

	QUnit.test( 'Smoke test', 1, function ( assert ) {
		var values,
			config = { type: 'or', licenses: [] },
			uwLicenseInput;

		uwLicenseInput = new mw.UploadWizardLicenseInput( '#qunit-fixture', values, config );
		assert.ok( uwLicenseInput, 'LicenseInput object created !' );
	} );

}( mediaWiki, jQuery ) );
