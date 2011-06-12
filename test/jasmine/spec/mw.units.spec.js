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

		it( "should say bytes", function() { 
			expect( mw.units.bytes( 7 ) ).toEqual( '7 bytes' );
		} );

		it( "should say bytes (900)", function() { 
			expect( mw.units.bytes( 900 ) ).toEqual( '900 bytes' );
		} );

		it( "should say 1023 = 1023 bytes", function() { 
			expect( mw.units.bytes( 1023 ) ).toEqual( '1023 bytes' );
		} );

		it( "should say 1024 = 1K", function() { 
			expect( mw.units.bytes( 1024 ) ).toEqual( '1 K' );
		} );

		it( "should say MB", function() { 
			expect( mw.units.bytes( 2 * 1024 * 1024 ) ).toEqual( '2.00 MB' );
		} );

		it( "should say GB", function() { 
			expect( mw.units.bytes( 3.141592 * 1024 * 1024 * 1024 ) ).toEqual( '3.14 GB' );
		} );

		it( "should say TB", function() { 
			expect( mw.units.bytes( 3.141592 * 1024 * 1024 * 1024 * 1024 ) ).toEqual( '3.14 TB' );
		} );

		it( "should say TB even when much larger", function() { 
			expect( mw.units.bytes( 3.141592 * 1024 * 1024 * 1024 * 1024 * 1024 ) ).toEqual( '3216.99 TB' );
		} );


		it( "should round up", function() { 
			expect( mw.units.bytes( 1.42857 * 1024 * 1024 * 1024 ) ).toEqual( '1.43 GB' );
		} );


	} );

} )( mediaWiki );

