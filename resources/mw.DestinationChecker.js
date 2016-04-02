( function ( mw, $ ) {

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
			).then( function ( unique, blacklist ) {
				return {
					unique: unique,
					blacklist: blacklist,
					title: title
				};
			} );
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
			var checker = this;

			/**
			 * Processes result of a TitleBlacklist api call
			 *
			 * @param {Object|boolean} blacklistResult `false` if not blacklisted, object if blacklisted
			 */
			function blacklistResultProcessor( blacklistResult ) {
				var result;

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

				checker.cachedBlacklist[ title ] = result;
				return result;
			}

			if ( this.cachedBlacklist[ title ] !== undefined ) {
				return $.Deferred().resolve( this.cachedBlacklist[ title ] );
			}

			// This shouldn't be needed. T131612
			function safeUsing( modules ) {
				try {
					return mw.loader.using( modules );
				} catch ( err ) {
					return $.Deferred().reject( err );
				}
			}

			return safeUsing( 'mediawiki.api.titleblacklist' ).then( function () {
				return checker.api.isBlacklisted( title ).then( blacklistResultProcessor );
			}, function () {
				// it's not blacklisted, because the API isn't even available
				return $.Deferred().resolve( { notBlacklisted: true, unavailable: true } );
			} );
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
			var checker = this;

			function checkUniqueProcessor( data ) {
				var result, protection, pageId, ntitle, img;

				if ( !data || !data.query || !data.query.pages ) {
					// Ignore a null result
					mw.log( 'mw.DestinationChecker::checkUnique> No data in checkUnique result' );
					return $.Deferred().reject();
				}

				// The API will check for files with that filename.
				// If no file found: a page with a key of -1 and no imageinfo
				// If file found on another repository, such as when the wiki is using InstantCommons: page with a key of -1, plus imageinfo
				// If file found on this repository: page with some positive numeric key
				if ( data.query.pages[ -1 ] && !data.query.pages[ -1 ].imageinfo ) {
					protection = data.query.pages[ -1 ].protection;
					if ( protection && protection.length > 0 ) {
						$.each( protection, function ( i, val ) {
							if ( $.inArray( val.level, mw.config.get( 'wgUserGroups' ) ) === -1 ) {
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
						// Conflict found, this filename is NOT unique
						if ( data.query.normalized ) {
							ntitle = data.query.normalized[ 0 ].to;
						} else {
							ntitle = data.query.pages[ pageId ].title;
						}

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

				checker.cachedResult[ title ] = result;
				return result;
			}

			if ( this.cachedResult[ title ] !== undefined ) {
				return $.Deferred().resolve( this.cachedResult[ title ] );
			}

			// Setup the request -- will return thumbnail data if it finds one
			// XXX do not use iiurlwidth as it will create a thumbnail
			return this.api.get( {
				titles: title,
				prop: 'info|imageinfo',
				inprop: 'protection',
				iiprop: 'url|mime|size',
				iiurlwidth: 150
			} ).then( checkUniqueProcessor );
		}

	};

}( mediaWiki, jQuery ) );
