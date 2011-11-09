// library to assist with API calls on categories

( function( mw, $ ) {

	$.extend( mw.Api.prototype, { 
		/**
		 * @param {mw.Title} 
		 * @param {Function} callback to pass boolean of category's existence
		 * @param {Function} optional callback to run if api error
		 * @return ajax call object
		 */
		isCategory: function( title, callback, err ) {
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

			return this.get( params, { ok: ok, err: err } );

		},

		/**
		 * @param {String} prefix to match
		 * @param {Function} callback to pass matched categories to
		 * @param {Function} optional callback to run if api error
		 * @return ajax call object
		 */
		getCategoriesByPrefix: function( prefix, callback, err ) {		

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

			return this.get( params, { ok: ok, err: err } );

		},


		/**
		 * @param {mw.Title}
		 * @param {Function} callback to pass categories to (or false, if title not found)
		 * @param {Function} optional callback to run if api error
		 * @param {Boolean} optional asynchronousness (default = true = async)
		 * @return ajax call object 
		 */
		getCategories: function( title, callback, err, async ) {
			var params = {
				prop: 'categories',
				titles: title.toString()
			};
			if ( async === undefined ) {
				async = true;
			}

			var ok = function( data ) {
				var ret = false;
				if ( data.query && data.query.pages ) {
					$.each( data.query.pages, function( id, page ) {
						if ( page.categories ) {
							if ( typeof ret !== 'object' ) { 
								ret = [];
							}
							$.each( page.categories, function( i, cat ) { 
								ret.push( new mw.Title( cat.title ) ); 
							} );
						}
					} );
				}
				callback( ret );
			};

			return this.get( params, { ok: ok, err: error, async: async } );

		}

	} );
} )( window.mediaWiki, jQuery );
