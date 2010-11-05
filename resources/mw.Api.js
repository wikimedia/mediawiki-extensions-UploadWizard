/* mw.Api objects represent the API of a particular MediaWiki server. */	

// dependencies: [ mw ]

( function( mw, $j ) {
	
	/**
	 * Represents the API of a particular MediaWiki server.
	 *
	 * Required options: 
	 *   url - complete URL to API endpoint. Usually equivalent to wgServer + wgScriptPath + '/api.php'
	 *
	 * Other options:
	 *   can override the parameter defaults and ajax default options.
	 *	XXX document!
	 *  
	 * ajax options can also be overriden on every get() or post()
	 * 
	 * @param options {Mixed} can take many options, but must include at minimum the API url.
	 */
	mw.Api = function( options ) {

		// make sure we at least have a URL endpoint for the API
		if ( ! mw.isDefined( options.url ) ) {
			throw new Error( 'Configuration error - needs url property' );
		};

		this.url = options.url;

		var _this = this;
	
		/* We allow people to omit these default parameters from API requests */
		// there is very customizable error handling here, on a per-call basis
		// wondering, would it be simpler to make it easy to clone the api object, change error handling, and use that instead?
		this.defaults = {
			parameters: {
				action: 'query',
				format: 'json'
			},

			ajax: {
				// force toString if we got a mw.Uri object
				url: new String( this.url ),  

				/* default function for success and no API error */
				ok: function() {},

				// caller can supply handlers for http transport error or api errors
				err: function( code, result ) {
					var errorMsg = "mw.Api error: " + code;
					mw.log( errorMsg );
				},

				timeout: 30000, /* 30 seconds */

				dataType: 'json'

			}
		};


		if ( options.parameters ) {
			$j.extend( this.defaults.parameters, options.parameters );
		}

		if ( options.ajax ) { 
			$j.extend( this.defaults.ajax, options.ajax );
		}
	};

	mw.Api.prototype = {

		/**
		 * For api queries, in simple cases the caller just passes a success callback.
		 * In complex cases they pass an object with a success property as callback and probably other options.
		 * Normalize the argument so that it's always the latter case.
		 * 
		 * @param {Object|Function} ajax properties, or just a success function
		 * @return Function
		 */
		normalizeAjaxOptions: function( arg ) {
			if ( typeof arg === 'function' ) {
				var ok = arg;
				arg = { 'ok': ok };
			}
			if (! arg.ok ) {
				throw Error( "ajax options must include ok callback" );
			}
			return arg;
		},

		/**
		 * Perform API get request
		 *
		 * @param {Object} request parameters 
		 * @param {Object|Function} ajax properties, or just a success function
		 */	
		get: function( parameters, ajaxOptions ) {
			ajaxOptions = this.normalizeAjaxOptions( ajaxOptions );
			ajaxOptions.type = 'GET';
			this.ajax( parameters, ajaxOptions );
		},

		/**
		 * Perform API post request
		 * TODO post actions for nonlocal will need proxy 
		 * 
		 * @param {Object} request parameters 
		 * @param {Object|Function} ajax properties, or just a success function
		 */
		post: function( parameters, ajaxOptions ) {
			ajaxOptions = this.normalizeAjaxOptions( ajaxOptions );
			ajaxOptions.type = 'POST';
			this.ajax( parameters, ajaxOptions );
		},

		/**
		 * Perform the API call. 
		 * 
		 * @param {Object} request parameters 
		 * @param {Object} ajax properties
		 */
		ajax: function( parameters, ajaxOptions ) {
			parameters = $j.extend( {}, this.defaults.parameters, parameters );
			ajaxOptions = $j.extend( {}, this.defaults.ajax, ajaxOptions );
			ajaxOptions.data = parameters;
		
			ajaxOptions.error = function( xhr, textStatus, exception ) {
				ajaxOptions.err( 'http-' + textStatus, { xhr: xhr, exception: exception } );
			};

			/* success just means 200 OK; also check for output and API errors */
			ajaxOptions.success = function( result ) {
				if ( mw.isEmpty( result ) ) {
					ajaxOptions.err( "empty", "OK response but empty result (check HTTP headers?)" );
				} else if ( result.error ) {
					var code = mw.isDefined( result.error.code ) ? result.error.code : "unknown";
					ajaxOptions.err( code, result );
				} else { 
					ajaxOptions.ok( result );
				}
			};

			$j.ajax( ajaxOptions );

		},

	}

}) ( window.mw, jQuery );
