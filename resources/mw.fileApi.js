/* miscellaneous fileApi routines -- partially copied from mediawiki.special.upload.js, must refactor... */

( function () {

	mw.fileApi = {

		/**
		 * Check if this is a recognizable image type...
		 * Also excludes files over 10M to avoid excessive memory usage.
		 *
		 * TODO is there a way we can ask the browser what's supported in <img>s?
		 * TODO put SVG back after working around Firefox 7 bug <https://bugzilla.wikimedia.org/show_bug.cgi?id=31643>
		 *
		 * @param {File} file
		 * @return {boolean}
		 */
		isPreviewableFile: function ( file ) {
			const known = [ 'image/png', 'image/gif', 'image/jpeg' ],
				tooHuge = 10 * 1024 * 1024;
			return this.isPreviewableVideo( file ) || ( known.includes( file.type ) ) && file.size > 0 && file.size < tooHuge;
		},

		/**
		 * Check if this is a recognizable video type...
		 *
		 * @param {File} file
		 * @return {boolean}
		 */
		isPreviewableVideo: function ( file ) {
			const video = document.createElement( 'video' );
			return video.canPlayType && video.canPlayType( file.type ).replace( 'no', '' ) !== '';
		}

	};
}() );
