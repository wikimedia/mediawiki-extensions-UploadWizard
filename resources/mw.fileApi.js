/* miscellaneous fileApi routines -- partially copied from mediawiki.special.upload.js, must refactor... */

( function( $, mw ) { 

	/**
	 * Is the FileAPI available with sufficient functionality?
	 */
	mw.fileApi = { 

		isAvailable: function() {
			return typeof window.FileReader !== 'undefined';
		},

		/**
		 * Check if this is a recognizable image type...
		 * Also excludes files over 10M to avoid going insane on memory usage.
		 *
		 * @todo is there a way we can ask the browser what's supported in <img>s?
		 *
		 * @param {File} file
		 * @return boolean
		 */
		isPreviewableFile: function( file ) {
			var	known = [ 'image/png', 'image/gif', 'image/jpeg', 'image/svg+xml'],
				tooHuge = 10 * 1024 * 1024;
			return ( $.inArray( file.type, known ) !== -1 ) && file.size > 0 && file.size < tooHuge;
		}



	};

} )( jQuery, mediaWiki );
