



/*

apiproxy stuff -- we will do this in a different way
			if( mw.checkRequestPost( parameters )  ) {
			
				// Check if we need to setup a proxy
				if( ! mw.isLocalDomain( url ) ) {
						
					// Load the proxy and issue the parameters
					mw.load( 'ApiProxy', function( ) {
						mw.ApiProxy.doRequest( url, parameters, callback, timeoutCallback);				
					} );
									
				} else {
								
				}
				return ;
			}
			
			// If cross domain setup a callback: 
			if( ! mw.isLocalDomain( url ) ) {				 
				if( url.indexOf( 'callback=' ) == -1 || parameters[ 'callback' ] == -1 ) {
					// jQuery specific jsonp format: ( second ? is replaced with the callback ) 
					url += ( url.indexOf('?') == -1 ) ? '?callback=?' : '&callback=?';
				}				 
			}
		
			// Pass off the jQuery getJSON parameters:
			$j.getJSON( this.url, parameters, myCallback );			
		}
	
*/
