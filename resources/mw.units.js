( function( mw ) { 

	var scales = [ 'bytes', 'kilobytes', 'megabytes', 'gigabytes', 'terabytes' ];

	mw.units = {

		/**
		 * Format a size in bytes for output, using an appropriate
		 * unit (B, KB, MB, GB, or TB) according to the magnitude in question
		 *
		 * @param {Number} size, positive integer
		 * @return {String} formatted size
		 */
		bytes: function ( size ) {
			var i = 0;
			// while the scale is less than terabytes, bit-shift size over by 1024
			while ( size >= 1024 && i < scales.length ) {
				size /= 1024.0;
				i++;
			}
			return gM( 'size-' + scales[i], size.toFixed( i > 1 ? 2 : 0 ) );
		}
	};

} )( mediaWiki );
	
