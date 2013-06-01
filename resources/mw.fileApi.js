/* miscellaneous fileApi routines -- partially copied from mediawiki.special.upload.js, must refactor... */

( function( $, mw ) {

	mw.fileApi = {

		/**
		 * Is the FileAPI available with sufficient functionality?
		 */
		isAvailable: function() {
			return typeof window.FileReader !== 'undefined';
		},

		/**
		 * Check if this is a recognizable image type...
		 * Also excludes files over 10M to avoid going insane on memory usage.
		 *
		 * @todo is there a way we can ask the browser what's supported in <img>s?
		 * @todo put SVG back after working around Firefox 7 bug <https://bugzilla.wikimedia.org/show_bug.cgi?id=31643>
		 *
		 * @param {File} file
		 * @return boolean
		 */
		isPreviewableFile: function( file ) {
			var	known = [ 'image/png', 'image/gif', 'image/jpeg' ],
				tooHuge = 10 * 1024 * 1024;
			return this.isPreviewableVideo( file ) || ( $.inArray( file.type, known ) !== -1 ) && file.size > 0 && file.size < tooHuge;
		},

		/**
		 * Check if this is a recognizable video type...
		 *
		 * @param {File} file
		 * @return boolean
		 */
		isPreviewableVideo: function ( file ) {
			var video = document.createElement( 'video' );
			return video.canPlayType && video.canPlayType( file.type ).replace( 'no', '' ) != '';
		},

		isFormDataAvailable: function() {
			// FormData is in Firefox 4 but its file.slice is broken so we can't use it.
			return (typeof window.FormData !== 'undefined') &&
				!( $.browser.mozilla && parseFloat($j.browser.version) < 5.0 );
		},

		/**
		 * Is the slice function of FileAPI available with sufficient functionality?
		 * @todo is there a way to check this instead of hardcoding browsers and version?
		 */
		isSliceAvailable: function() {
			return mw.fileApi.isAvailable() &&
				( ( $.browser.mozilla && parseFloat($j.browser.version) >= 5.0 ) ||
				( $.browser.webkit && parseFloat($j.browser.version) >= 534.28 ) ||
				( $.browser.msie && parseFloat($j.browser.version) >= 10 ) );
		}
	};
} )( jQuery, mediaWiki );
