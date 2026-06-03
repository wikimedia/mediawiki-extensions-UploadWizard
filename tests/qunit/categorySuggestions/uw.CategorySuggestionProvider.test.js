QUnit.module( 'mw.uploadWizard.CategorySuggestionProvider' );

( function ( uw ) {

	QUnit.test( 'is enabled by default', ( assert ) => {
		const provider = new uw.CategorySuggestionProvider();
		assert.strictEqual( provider.isEnabled(), true );
	} );

	QUnit.test( 'produces no suggestions by default', ( assert ) => {
		const done = assert.async();
		const provider = new uw.CategorySuggestionProvider();

		provider.getSuggestions( {} ).then( ( result ) => {
			assert.deepEqual( result, [] );
			done();
		} );
	} );

}( mw.uploadWizard ) );
