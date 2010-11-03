// library to assist with edits

// dependencies: [ mw.Api, jQuery ]
	
( function( mw, $ ) {

	// cached token so we don't have to keep fetching new ones for every single post
	var cachedToken = null;

	$.extend( mw.Api.prototype, { 

		/* Post to API with edit token. If we have no token, get one and try to post.
	 	 * If we have a cached token try using that, and if it fails, blank out the
	 	 * cached token and start over.
		 * 
	 	 * @param params API parameters
		 * @param ok callback for success
		 * @param err (optional) error callback
		 */
		postWithEditToken: function( params, ok, err ) {
			var api = this;
			mw.log( 'post with edit token' );
			if ( cachedToken === null ) {
				mw.log( 'no cached token' );
				// We don't have a valid cached token, so get a fresh one and try posting.
				// We do not trap any 'badtoken' or 'notoken' errors, because we don't want
				// an infinite loop. If this fresh token is bad, something else is very wrong.
				var useTokenToPost = function( token ) {
					mw.log( 'posting with token = ' + token );
					params.token = token; 
					this.post( params, ok, err );
				};
				mw.log( 'getting edit token' );
				api.getEditToken( useTokenToPost, err );
			} else {
				// We do have a token, but it might be expired. So if it is 'bad' then
				// start over with a new token.
				params.token = cachedToken;
				mw.log( 'we do have a token = ' + params.token );
				var getTokenIfBad = function( code, result ) {
					mw.log( "error with posting with token!" );
					if ( code === 'badtoken' )  {
						mw.log( "bad token; try again" );
						cachedToken = null; // force a new token
						api.postWidthEditToken( params, ok, err );
					} else {
						err( code, result );
					}
				};
				mw.log ( "posting with the token that was cached " );
				api.post( params, ok, getTokenIfBad );
			}
		},
	
		/**
		 * Api helper to grab an edit token
	 	 *
		 * token callback has signature ( String token )
		 * error callback has signature ( String code, Object results, XmlHttpRequest xhr, Exception exception )
	 	 * Note that xhr and exception are only available for 'http_*' errors
		 *  code may be any http_* error code (see mw.Api), or 'token_missing'
		 *
		 * @param {Function} received token callback
		 * @param {Function} error callback
		 */
		getEditToken: function( tokenCallback, err ) {
			
			var parameters = {			
				'prop': 'info',
				'intoken': 'edit',
				/* we need some kind of dummy page to get a token from. This will return a response 
				   complaining that the page is missing, but we should also get an edit token */
				'titles': 'DummyPageForEditToken'
			};

			var ok = function( data ) {
				var token;
				$.each( data.query.pages, function( i, page ) {
					if ( page['edittoken'] ) {
						token = page['edittoken'];
						return false;
					}
				} );
				if ( mw.isDefined( token ) ) {
					cachedToken = token;
					tokenCallback( token );
				} else {
					err( 'token-missing', data );
				}
			};

			var ajaxOptions = { 'ok': ok, 'err': err };

			this.get( parameters, ajaxOptions );
		}

		
		
	} );

}) ( window.mw, jQuery );
