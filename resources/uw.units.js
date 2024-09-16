( function ( uw ) {

	const scaleMsgKeys = [ 'size-bytes', 'size-kilobytes', 'size-megabytes', 'size-gigabytes' ];

	uw.units = {
		/**
		 * Format a size in bytes for output, using an appropriate
		 * unit (bytes, K, MB, GB, or TB) according to the magnitude in question
		 *
		 * Units above K get 2 fixed decimal places.
		 *
		 * @param {number} size Number of bytes
		 * @return {string} formatted size
		 */
		bytes: function ( size ) {
			let i = 0;
			while ( size >= 1024 && i < scaleMsgKeys.length - 1 ) {
				size /= 1024.0;
				i++;
			}
			// Messages are documented above (scaleMsgKeys)
			// eslint-disable-next-line mediawiki/msg-doc
			return mw.message( scaleMsgKeys[ i ], size.toFixed( i > 1 ? 2 : 0 ) ).text();
		}
	};

}( mw.uploadWizard ) );
