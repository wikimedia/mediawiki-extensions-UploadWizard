// this is a bit problematic -- we are using a "real" MediaWiki server rather than mocking it out.
// jasmine has spies and such for mocking.
// also, how are we going to configure this test? Perhaps we'll need to have a special SpecRunner text input for API url, etc.

$j.mockjaxSettings = {
	responseTime: 0,  // as fast as possible, for tests
	dataType: 'json'
};

describe( "mw.Api", function() {

	var MAX_DELAY = 1000; // ms

	// typical globals made available
	// TODO this only works for me (NeilK)
	var wgScriptPath = '/w';

	var pageUri = new mw.Uri( window.location );

	var apiUrl = new mw.Uri( { 
		protocol: pageUri.protocol, 
		host: pageUri.host, 
		path: wgScriptPath + '/api.php' 
	} );

	describe( "edit token", function() { 

/*
		var deleteToken;
		var deleteTokenGetter = function( t ) {
			deleteToken = t;
		};


*/
		it( "should fetch a token with simple callback", function() { 
			var api = new mw.Api( { url: apiUrl } );
			var token = undefined;
			var completion = false;
			runs( function() {
				api.getEditToken( 
					function( t ) {
						token = t;
						completion = true;
					},
					function() {
						completion = true;
					}
				);
			} );
			waitsFor( function() { return completion; }, "AJAX call completion", MAX_DELAY );
			runs( function() { 
				expect( token ).toBeDefined();
				expect( token ).toContain( '+\\' );
			} );
		} );


		it( "should deal with network timeout", function() {
			var _this = this;

			runs( function() { 
				_this.token = undefined;

				var api = new mw.Api( { url: apiUrl } ); 

				var ok = function( t ) {
					_this.token = t;
					_this.done = true;
				};

				var err = function( code, info ) { 
					if ( code == 'http-timeout' ) {
						_this.timedOut = true;
						_this.done = true;
					}
				};

				this.mock = $j.mockjax( { 
					// match every url 
					url: '*',
					// with a timeout
					isTimeout: true
				} );

				api.getEditToken( ok, err );
			} );

			// the mock should time out instantly, but in practice, some delay seems necessary ?
			waitsFor( function() { return _this.done; }, "mockjax call completion", MAX_DELAY );

			runs( function() {
				expect( this.timedOut ).toBe( true );
				$j.mockjaxClear( this.mock );
			} );

		} );
	
		it( "should deal with server error", function() { 
			runs( function() { 
				this.token = undefined;
				var _this = this;
				var api = new mw.Api( { url: apiUrl } );

				var ok = function( t ) {
					_this.token = t;
				};

				var err = function( code, info ) {
					if ( code == 'http-error' && info && info.xhr && info.xhr.status == '500' ) {
						_this.error500 = true;
					}
				};

				this.mock = $j.mockjax( { 
					// match every url 
					url: '*',
					// with a server error
					'status': 500
				} );

				api.getEditToken( ok, err );
			} );

			waits( 100 );

			runs( function() {
				expect( this.error500 ).toBe( true );
				$j.mockjaxClear( this.mock );
			} );
		} );	


/*
		it ( "should be able to create a page with an edit token", function() {
			var titles = [ 'Foo' ];
			api.getPageEditToken( titles, tokenGetter );
			api.editPage( titles );
			api.getDeleteToken( deleteTokenGetter ); 
		} );
*/

	} );

} );

