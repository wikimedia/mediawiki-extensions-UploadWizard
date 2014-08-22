( function ( mw, $ ) {
	/**
	 * @method confirmCloseWindow
	 * @member mw
	 *
	 * Prevent the closing of a window with a confirm message (the onbeforeunload event seems to
	 * work in most browsers.)
	 *
	 * This supersedes any previous onbeforeunload handler. If there was a handler before, it is
	 * restored when you execute the returned function.
	 *
	 *     var allowCloseWindow = mw.confirmCloseWindow();
	 *     // ... do stuff that can't be interrupted ...
	 *     allowCloseWindow();
	 *
	 * @param {Object} [options]
	 * @param {Function} [options.message]
	 * @param {string} options.message.return The string message to show in the confirm dialog.
	 * @param {Function} [options.test]
	 * @param {boolean} options.test.return Whether to show the dialog to the user.
	 * @return {Function} Execute this when you want to allow the user to close the window
	 */
	mw.confirmCloseWindow = function ( options ) {
		function handleBeforeUnload() {
			if ( options.test() ) {
				// remove the handler while the alert is showing - otherwise breaks caching in Firefox (3?).
				// but if they continue working on this page, immediately re-register this handler
				window.onbeforeunload = null;
				setTimeout( function () {
					window.onbeforeunload = handleBeforeUnload;
				} );

				// show an alert with this message
				return options.message();
			}
		}

		var oldUnloadHandler = window.onbeforeunload,
			defaults = {
				message: function () { return mw.message( 'mwe-prevent-close' ).text(); },
				test: function () { return true; }
			};

		options = $.extend( defaults, options || {} );
		window.onbeforeunload = handleBeforeUnload;

		// return the function they can use to stop this
		return function () {
			window.onbeforeunload = oldUnloadHandler;
		};

	};
} )( mediaWiki, jQuery );
