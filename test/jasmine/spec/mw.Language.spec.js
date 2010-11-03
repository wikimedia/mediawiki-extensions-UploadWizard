describe( "mw.Language", function() {

	mw.addMessages( {
		'simple-message' => 'simple message'
		
	} );

	it( "should return identity for simple string", function() {
		expect( gM( 'simple-message' ).toEqual( 'simple message' );
	} );


} );
