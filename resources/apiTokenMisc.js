/* mistaken attempt to add tokens to all posts.
  there are way too many ways of getting tokens to generalize this.
  for uploading we are using forms (not constructing our own multiparts, for the most part) so we should obtain a reasonably fresh
  token for each upload instead.
  however this could make sense with editing
 */

			// All POST actions need an edit token. TODO confirm this
			// Edit tokens expire at a time unpredictable to the client.
			// It is not desirable to fetch a new token before every POST.
			// So: we will have to obtain one if we don't have one already or encounter 
			// a 'badtoken' error. Logic here is a bit convoluted but it's the best I can do.

			// A token may be cached already in the api. If we have one, use it; if not, get one and 
			// then do the same post we were going to do.
			if ( this.token ) {
				// we have an API token, but it might be expired. 
				// So, in the parameters of the post call, use an error handler to deal with bad tokens 
				// that tries the post again with a brand new token.
				if ( ! ajaxOptions.apiError.badtoken ) { 
					var api = this;
					ajaxOptions.apiError.badtoken = function() {
						// don't infinite loop
						delete ajaxOptions.apiError.badtoken; 
						api._postWithNewToken( parameters, ajaxOptions );		
					};
				}
				this._post( parameters, ajaxOptions );
			} else {
				this._postWithNewToken( parameters, ajaxOptions );
			}		
		/**
		 * Post API request using the token that exists already in the API (standard case)
		 * 
		 * @param {Object} request parameters 
		 * @param {Object} ajax properties
		 */
		_post: function( parameters, ajaxOptions ) {
			parameters['token'] = this.token;
			this.ajax( parameters, ajaxOptions );
		},

		/**
		 * Get a new token, cache it in the API, and then do a post 
		 * 
		 * @param {Object} request parameters 
		 * @param {Object} ajax properties
		 */
		_postWithNewToken: function( parameters, ajaxOptions ) { 
			var api = this;
			this.getToken( function( token ) {
				if ( token === false ) {
					// XXX getting the token failed
				} else {
					api.token = token;
					api._post( parameters, ajaxOptions );
				}
			} );
		},


