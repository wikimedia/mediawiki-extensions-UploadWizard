QUnit.module( 'ext.uploadWizardLicenseInput', QUnit.newMwEnvironment( {
	beforeEach: function () {
		mw.UploadWizard.config = {
			licenses: {
				'cc-by-sa-3.0': {
					msg: 'mwe-upwiz-license-cc-by-sa-3.0',
					icons: [ 'cc-by', 'cc-sa' ],
					url: '//creativecommons.org/licenses/by-sa/3.0/',
					languageCodePrefix: 'deed.',
					availableLanguages: [ 'ar', 'en', 'fr' ]
				}
			}
		};
	}
} ) );

QUnit.test( 'Smoke test', ( assert ) => {
	var config = { type: 'or', licenses: [] };
	var $fixture = $( '<div>' );
	var uwLicenseInput = new mw.UploadWizardLicenseInput( config );
	$fixture.append( uwLicenseInput.$element );
	assert.true( !!uwLicenseInput, 'LicenseInput object created !' );
} );

QUnit.test( 'createInputs()', ( assert ) => {
	var config = { type: 'or', licenses: [ 'cc-by-sa-3.0' ] };
	var $fixture = $( '<div>' );

	var uwLicenseInput = new mw.UploadWizardLicenseInput( config );
	$fixture.append( uwLicenseInput.$element );

	// Check radio button is there
	var $input = $fixture.find( '.oo-ui-radioInputWidget .oo-ui-inputWidget-input[value="cc-by-sa-3.0"]' );
	assert.strictEqual( $input.length, 1, 'Radio button created.' );

	// Check label is there
	var $label = $input.closest( '.oo-ui-radioOptionWidget' ).find( '.oo-ui-labelElement-label' );
	assert.strictEqual( $label.length, 1, 'Label created.' );
} );

QUnit.test( 'createGroupedInputs()', ( assert ) => {
	var config = {
		type: 'or',
		defaults: [ 'cc-by-sa-3.0' ],
		licenseGroups: [
			{
				head: 'mwe-upwiz-license-cc-head',
				subhead: 'mwe-upwiz-license-cc-subhead',
				licenses: [ 'cc-by-sa-3.0' ]
			}
		]
	};
	var $fixture = $( '<div>' );

	var uwLicenseInput = new mw.UploadWizardLicenseInput( config );
	uwLicenseInput.setDefaultValues();
	$fixture.append( uwLicenseInput.$element );

	// Check license group is there
	assert.strictEqual( $fixture.find( '.mwe-upwiz-deed-license-group' ).length, 1, 'License group created.' );

	// Check subheader is there
	assert.strictEqual( $fixture.find( '.mwe-upwiz-deed-license-group-subhead' ).length, 1, 'License subheader created.' );

	// Check license is there
	assert.strictEqual( $fixture.find( '.mwe-upwiz-deed-license-group .oo-ui-fieldsetLayout-group' ).length, 1, 'License created.' );
} );
