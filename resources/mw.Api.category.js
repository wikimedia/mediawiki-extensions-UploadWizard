// library to assist with API calls on categories

( function( mw, $ ) {

	// cached token so we don't have to keep fetching new ones for every single post
	var cachedToken = null;

	$.extend( mw.Api.prototype, { 
		/**
		 * @param {mw.Title} 
		 * @param {Function} callback to pass boolean of category's existence
		 * @param {Function} optional callback to run if api error
		 * @return ajax call object
		 */
		isCategory: function( title, callback, error ) {
			var params = {
				'prop': 'categoryinfo',
				'titles': title.toString()
			};

			var ok = function( data ) {
				var exists = false;
				if ( data.query && data.query.pages ) {
					$.each( data.query.pages, function( id, page ) {
						if ( page.categoryinfo ) {
							exists = true;
						}
					} );
				}
				callback( exists );
			};

			var err = mw.isDefined( error ) ? error : undefined;

			return this.get( params, ok, err );

		},

		/**
		 * @param {String} prefix to match
		 * @param {Function} callback to pass matched categories to
		 * @param {Function} optional callback to run if api error
		 * @return ajax call object
		 */
		getCategoriesByPrefix: function( prefix, callback, error ) {		

			var params = {
				'list': 'allcategories',
				'acprefix': prefix 
			};

			var ok = function( data ) {
				var texts = [];
				if ( data.query && data.query.allcategories ) { 
					// API returns an array of objects like
					// allcategories: [ {'*':'foo'}, {'*':'bar'} ]
					$.each( data.query.allcategories, function( i, category ) {
						texts.push( category['*'] );
					} );
				}
				callback( texts );
			};

			var err = mw.isDefined( error ) ? error : undefined;
		
			return this.get( params, ok, err );

		}

	} );
} )( window.mediaWiki, jQuery );
