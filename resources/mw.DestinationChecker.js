( function () {

	/**
	 * @class
	 */
	mw.DestinationChecker = {

		api: new mw.Api(),

		// cached results from uniqueness api calls
		cachedResult: {},
		cachedBlacklist: {},

		/**
		 * Check title for validity.
		 *
		 * @param {string} title Title to check
		 * @return {jQuery.Promise}
		 * @return {Function} return.done
		 * @return {string} return.done.title The title that was passed in
		 * @return {Object|boolean} return.done.blacklist See #checkBlacklist
		 * @return {Object|boolean} return.done.unique See #checkUnique
		 */
		checkTitle: function ( title ) {
			return $.when(
				this.checkUnique( title ),
				this.checkBlacklist( title )
			).then( ( unique, blacklist ) => ( {
				unique: unique,
				blacklist: blacklist,
				title: title
			} ) );
		},

		/**
		 * Async check if a title is in the titleblacklist.
		 *
		 * @param {string} title Title to check against the blacklist
		 * @return {jQuery.Promise}
		 * @return {Function} return.done
		 * @return {boolean} return.done.notBlacklisted
		 * @return {string} [return.done.blacklistReason] See mw.Api#isBlacklisted
		 * @return {string} [return.done.blacklistMessage] See mw.Api#isBlacklisted
		 * @return {string} [return.done.blacklistLine] See mw.Api#isBlacklisted
		 */
		checkBlacklist: function ( title ) {
			/**
			 * Process result of a TitleBlacklist API call.
			 *
			 * @private
			 * @param {Object|boolean} blacklistResult `false` if not blacklisted, object if blacklisted
			 * @return {Object}
			 */
			const blacklistResultProcessor = ( blacklistResult ) => {
				let result;

				if ( blacklistResult === false ) {
					result = { notBlacklisted: true };
				} else {
					result = {
						notBlacklisted: false,
						blacklistReason: blacklistResult.reason,
						blacklistMessage: blacklistResult.message,
						blacklistLine: blacklistResult.line
					};
				}

				this.cachedBlacklist[ title ] = result;
				return result;
			};

			if ( this.cachedBlacklist[ title ] !== undefined ) {
				return $.Deferred().resolve( this.cachedBlacklist[ title ] );
			}

			// it's not blacklisted, because the API isn't even available
			return mw.loader.using( 'mediawiki.api.titleblacklist' ).then( () => this.api.isBlacklisted( title ).then( blacklistResultProcessor ), () => $.Deferred().resolve( { notBlacklisted: true, unavailable: true } ) );
		},

		/**
		 * Async check if a filename is unique. Can be attached to a field's change() event
		 * This is a more abstract version of AddMedia/UploadHandler.js::doDestCheck
		 *
		 * @param {string} title Title to check for uniqueness
		 * @return {jQuery.Promise}
		 * @return {Function} return.done
		 * @return {boolean} return.done.isUnique
		 * @return {boolean} [return.done.isProtected]
		 * @return {Object} [return.done.img] Image info
		 * @return {string} [return.done.href] URL to file description page
		 */
		checkUnique: function ( title ) {
			const NS_FILE = mw.config.get( 'wgNamespaceIds' ).file;

			const titleObj = mw.Title.newFromText( title );
			const ext = mw.Title.normalizeExtension( titleObj.getExtension() || '' );
			// Strip namespace and file extension
			const prefix = titleObj.getNameText();

			/**
			 * Process result of a an imageinfo API call.
			 *
			 * @private
			 * @param {Object} data API result
			 * @return {Object}
			 */
			const checkUniqueProcessor = ( data ) => {
				let result, protection, pageId, ntitle, ntitleObj, img;

				result = { isUnique: true };

				if ( data.query && data.query.pages ) {
					// The API will check for files with that filename.
					// If no file found: a page with a key of -1 and no imageinfo
					// If file found on another repository, such as when the wiki is using InstantCommons: page with a key of -1, plus imageinfo
					// If file found on this repository: page with some positive numeric key
					if ( data.query.pages[ -1 ] && !data.query.pages[ -1 ].imageinfo ) {
						protection = data.query.pages[ -1 ].protection;
						if ( protection && protection.length > 0 ) {
							protection.forEach( ( val ) => {
								if ( !mw.config.get( 'wgUserGroups' ).includes( val.level ) ) {
									result = {
										isUnique: true,
										isProtected: true
									};
								}
							} );
						} else {
							// No conflict found on any repository this wiki uses
							result = { isUnique: true };
						}
					} else {
						for ( pageId in data.query.pages ) {
							if ( !Object.prototype.hasOwnProperty.call( data.query.pages, pageId ) ) {
								continue;
							}
							ntitle = data.query.pages[ pageId ].title;
							ntitleObj = mw.Title.newFromText( ntitle );
							if ( ntitleObj.getNameText() !== prefix ) {
								// It's a different file name entirely
								continue;
							}
							if ( ext !== mw.Title.normalizeExtension( ntitleObj.getExtension() || '' ) ) {
								// It's a different extension, that's fine (e.g. to upload a SVG version of a PNG file)
								continue;
							}

							// Conflict found, this filename is NOT unique

							if ( !data.query.pages[ pageId ].imageinfo ) {
								// This means that there's a page, but it's not a file. Well,
								// we should really report that anyway, but we shouldn't process
								// it like a file, and we should defer to other entries that may be files.
								result = {
									isUnique: false,
									title: ntitle,
									img: null,
									href: null
								};
								continue;
							}

							img = data.query.pages[ pageId ].imageinfo[ 0 ];

							result = {
								isUnique: false,
								img: img,
								title: ntitle,
								href: img.descriptionurl
							};

							break;
						}
					}
				}

				return result;
			};

			if ( this.cachedResult[ title ] !== undefined ) {
				return $.Deferred().resolve( this.cachedResult[ title ] );
			}

			// Setup the request -- will return thumbnail data if it finds one
			// XXX do not use iiurlwidth as it will create a thumbnail
			return $.when(
				// Checks for exact matches on this wiki and foreign file repos
				this.api.get( {
					action: 'query',
					titles: title,
					prop: 'info|imageinfo',
					inprop: 'protection',
					iiprop: 'url|mime|size',
					iiurlwidth: 150
				} ).then( checkUniqueProcessor ),
				// Checks for matches with different versions of the file extension on this wiki only
				this.api.get( {
					action: 'query',
					generator: 'allpages',
					gapnamespace: NS_FILE,
					gapprefix: prefix,
					prop: 'info|imageinfo',
					inprop: 'protection',
					iiprop: 'url|mime|size',
					iiurlwidth: 150
				} ).then( checkUniqueProcessor )
			).then( ( exact, fuzzy ) => {
				let result;
				if ( !exact.isUnique || exact.isProtected ) {
					result = exact;
				} else if ( !fuzzy.isUnique || fuzzy.isProtected ) {
					result = fuzzy;
				} else {
					result = { isUnique: true };
				}

				this.cachedResult[ title ] = result;
				return result;
			} );
		},

		/**
		 * Clears the result cache
		 */
		clearCache: function () {
			this.cachedResult = {};
		}

	};

}() );
