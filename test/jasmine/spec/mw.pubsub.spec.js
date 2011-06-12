( function( mw, $ ) { 
	describe( "mw.pubsub", function() { 

		it( "should allow subscription", function() {
			var sub1data = [ 'foo', 'bar' ];
			var result;
			$.subscribe( 'sub1', function( arg ) { 
				result = arg;
			} );
			$.publish( 'sub1', sub1data );
			expect( result ).toBe( sub1data );
		} );

		it( "should allow multiple subscription", function() {
			var sub1data = [ 'foo', 'bar' ];
			var result;
			var result2;
			$.subscribe( 'sub1', function( arg ) { 
				result = arg;
			} );
			$.subscribe( 'sub1', function( arg ) { 
				result2 = arg;
			} );
			$.publish( 'sub1', sub1data );
			expect( result ).toBe( sub1data );
			expect( result2 ).toBe( sub1data );
		} );

		it( "should allow timeline subscription with publishing after subscription", function() {
			var sub2data = [ 'quux', 'pif' ];
			var result;
			$.subscribeTimeline( 'sub2', function( arg ) { 
				result = arg;
			} );
			$.publishTimeline( 'sub2', sub2data );
			expect( result ).toBe( sub2data );
		} );


		it( "should allow timeline subscription with subscription after publishing", function() {
			var sub3data = [ 'paf', 'klortho' ];
			var result;
			$.publishTimeline( 'sub3', sub3data );
			$.subscribeTimeline( 'sub3', function( arg ) { 
				result = arg;
			} );
			expect( result ).toBe( sub3data );
		} );

	} );

} )( mediaWiki, jQuery );
