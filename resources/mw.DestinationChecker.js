( function ( mw, $ ) {
	/**
	 * Object to attach to a file name input, to be run on its change() event
	 * Largely derived from wgUploadWarningObj in old upload.js
	 * Perhaps this could be a jQuery ext
	 * @param options   dictionary of options
	 *		selector  required, the selector for the input to check
	 *		processResult   required, function to execute on results. accepts two args:
	 *			1) filename that invoked this request -- should check if this is still current filename
	 *			2) an object with the following fields
	 *				isUnique: boolean
	 *				img: thumbnail image src (if not unique)
	 *				href: the url of the full image (if not unique)
	 *				title: normalized title of file (if not unique)
	 *		spinner	required, closure to execute to show progress: accepts true to start, false to stop
	 *		apiUrl	 optional url to call for api. falls back to local api url
	 *		delay	  optional how long to delay after a change in ms. falls back to configured default
	 *		preprocess optional: function to apply to the contents of selector before testing
	 *		events	 what events on the input trigger a check.
	 */
	mw.DestinationChecker = function ( options ) {

		var checker = this,
			check = this.getDelayedChecker();

		this.selector = options.selector;
		this.spinner = options.spinner;
		this.processResult = options.processResult;
		this.api = options.api;

		$.each( [ 'preprocess', 'delay', 'events' ], function ( i, option ) {
			if ( options[option] ) {
				checker[option] = options[option];
			}
		} );

		$.each( this.events, function ( i, eventName ) {
			$( checker.selector )[eventName]( check );
		} );

	};

	mw.DestinationChecker.prototype = {

		// events that the input undergoes which fire off a check
		events: [ 'change', 'keyup' ],

		// how long the input muse be "idle" before doing call (don't want to check on each key press)
		delay: 500, // ms;

		// what tracks the wait
		timeoutId: null,

		// cached results from uniqueness api calls
		cachedResult: {},

		cachedBlacklist: {},

		/**
		 * There is an option to preprocess the name (in order to perhaps convert it from
		 * title to path, e.g. spaces to underscores, or to add the "File:" part.) Depends on
		 * exactly what your input field represents.
		 * In the event that the invoker doesn't supply a name preprocessor, use this identity function
		 * as default
		 *
		 * @param something
		 * @return that same thing
		 */
		preprocess: function (x) { return x; },

		/**
		 * fire when the input changes value or keypress
		 * will trigger a check of the name if the field has been idle for delay ms.
		 */
		getDelayedChecker: function () {
			var checker = this;

			return function () {
				// if we changed before the old timeout ran, clear that timeout.
				if ( checker.timeoutId ) {
					window.clearTimeout( checker.timeoutId );
				}

				// and start another, hoping this time we'll be idle for delay ms.
				checker.timeoutId = window.setTimeout(
					function () {
						checker.spinner( true );
						checker.checkTitle();
					},
					checker.delay
				);
			};
		},

		/**
		 * the backend of getDelayedChecker, and the title checker jQuery extension
		 * dispatches title check requests in parallel, aggregates results
		 */
		checkTitle: function () {
			var checker = this,
				title = this.getTitle(),
				status = {
					unique: null,
					blacklist: null
				};

			function checkerStatus( result ) {
				if ( result.unique ) {
					status.unique = result.unique;
				}

				if ( result.blacklist ) {
					status.blacklist = result.blacklist;
				}

				//$.extend( status, result );
				if ( status.unique !== null && status.blacklist !== null ) {
					status.title = title;
					checker.processResult( status );
				}

				checker.spinner( status.unique === null || status.blacklist === null );
			}

			this.checkUnique( checkerStatus, title );
			this.checkBlacklist( checkerStatus, title );
		},

		/**
		 * Get the current value of the input, with optional preprocessing
		 * @return {string} the current input value, with optional processing
		 */
		getTitle: function () {
			return this.preprocess( $( this.selector ).val() );
		},

		/**
		 * Async check if a title is in the titleblacklist.
		 * @param {Function} takes object, like { blacklist:result }
		 * @param {string} title the blacklist should be checked against
		 */
		checkBlacklist: function ( callback, title ) {
			var checker = this;

			function blacklistResultProcessor( blacklistResult ) {
				var result;

				if ( blacklistResult === false ) {
					result = { notBlacklisted:true };
				} else {
					result = {
						notBlacklisted:false,
						blacklistReason:blacklistResult.reason,
						blacklistMessage:blacklistResult.message,
						blacklistLine:blacklistResult.line
					};
				}

				checker.cachedBlacklist[title] = result;
				callback( { blacklist:result } );
			}

			if ( title === '' ) {
				return;
			}

			if ( this.cachedBlacklist[title] !== undefined ) {
				callback( { blacklist:this.cachedBlacklist[title] } );
				return;
			}

			/**
			 * Processes result of a TitleBlacklist api call with callback()
			 * @param mixed - false if not blacklisted, object if blacklisted
			 */
			if ( mw.config.get( 'UploadWizardConfig' ).useTitleBlacklistApi ) {
				this.api.isBlacklisted( title, blacklistResultProcessor );
			} else {
				// it's not blacklisted, because the API isn't even available
				blacklistResultProcessor( false );
			}
		},

		/**
		 * Async check if a filename is unique. Can be attached to a field's change() event
		 * This is a more abstract version of AddMedia/UploadHandler.js::doDestCheck
		 * @param {Function} takes object, like { unique:result }
		 * @param {string} title the uniqueness should be checked for
		 */
		checkUnique: function ( callback, title ) {
			var params,
				checker = this;

			function ok( data ) {
				var result, protection, pageId, ntitle, img;

				// Remove spinner
				checker.spinner( false );

				// if the name's changed in the meantime, our result is useless
				if ( title !== checker.getTitle() ) {
					return;
				}

				if ( !data || !data.query || !data.query.pages ) {
					// Ignore a null result
					mw.log( 'mw.DestinationChecker::checkUnique> No data in checkUnique result' );
					return;
				}

				// The API will check for files with that filename.
				// If no file found: a page with a key of -1 and no imageinfo
				// If file found on another repository, such as when the wiki is using InstantCommons: page with a key of -1, plus imageinfo
				// If file found on this repository: page with some positive numeric key
				if ( data.query.pages[-1] && !data.query.pages[-1].imageinfo ) {
					protection = data.query.pages[-1].protection;
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
							ntitle = data.query.normalized[0].to;
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

						img = data.query.pages[ pageId ].imageinfo[0];

						result = {
							isUnique: false,
							img: img,
							title: ntitle,
							href: img.descriptionurl
						};

						break;
					}
				}

				checker.cachedResult[title] = result;
				callback( { unique:result } );
			}

			function err( code ) {
				checker.spinner( false );
				mw.log( 'mw.DestinationChecker::checkUnique> Error in checkUnique result: ' + code );
			}

			// Setup the request -- will return thumbnail data if it finds one
			// XXX do not use iiurlwidth as it will create a thumbnail
			params = {
				titles:title,
				prop:'info|imageinfo',
				inprop:'protection',
				iiprop:'url|mime|size',
				iiurlwidth:150
			};

			// if input is empty or invalid, don't bother.
			if ( title === '' ) {
				return;
			}

			if ( this.cachedResult[title] !== undefined ) {
				callback( { unique:this.cachedResult[title] } );
				return;
			}

			// set the spinner to spin
			this.spinner( true );

			// Do the destination check
			this.api.get( params ).done( ok ).fail( err );
		}

	};

	/**
	 * jQuery extension to make a field upload-checkable
	 */
	$.fn.destinationChecked = function ( options ) {
		options.selector = this;
		var checker = new mw.DestinationChecker( options );
		// this should really be done with triggers
		this.checkTitle = function () { checker.checkTitle(); };
		return this;
	};
}( mediaWiki, jQuery ) );
