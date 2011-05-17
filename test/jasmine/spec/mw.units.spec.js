( function( mw ) {

	mediaWiki.messages.set( {
		"size-bytes": "$1 bytes",
		"size-kilobytes": "$1 K",
		"size-megabytes": "$1 MB",
		"size-gigabytes": "$1 GB",
		"size-terabytes": "$1 TB"
	} );

	window.gM = mw.language.getMessageFunction();

	// assumes english language selected
	describe( "mw.units.bytes", function() {
		it( "should say 0 bytes", function() { 
			expect( mw.units.bytes( 0 ) ).toEqual( '0 bytes' );
		} );

		it( "should say 7 bytes", function() { 
			expect( mw.units.bytes( 7 ) ).toEqual( '7 bytes' );
		} );

		it( "should say 900 bytes", function() { 
			expect( mw.units.bytes( 900 ) ).toEqual( '900 bytes' );
		} );

		it( "should say 1 K", function() { 
			expect( mw.units.bytes( 1024 ) ).toEqual( '1 K' );
		} );

		it( "should say 2.00 MB", function() { 
			expect( mw.units.bytes( 2 * 1024 * 1024 ) ).toEqual( '2.00 MB' );
		} );

		it( "should say 3.14 GB", function() { 
			expect( mw.units.bytes( 3.141592 * 1024 * 1024 * 1024 ) ).toEqual( '3.14 GB' );
		} );



	} );

} )( mediaWiki );

