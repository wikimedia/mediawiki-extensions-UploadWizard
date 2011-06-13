( function( mw ) { 

	var scaleMsgKeys = [ 
		'mwe-upwiz-size-bytes', 
		'mwe-upwiz-size-kilobytes', 
		'mwe-upwiz-size-megabytes', 
		'mwe-upwiz-size-gigabytes', 	
		'mwe-upwiz-size-terabytes' 
	];

	mw.units = {

		/**
		 * Format a size in bytes for output, using an appropriate
		 * unit (bytes, K, MB, GB, or TB) according to the magnitude in question
		 *
		 * Units above K get 2 fixed decimal places.
		 *
		 * @param {Number} size, positive integer
		 * @return {String} formatted size
		 */
		bytes: function ( size ) {
			var i = 0;
			while ( size >= 1024 && i < scaleMsgKeys.length ) {
				size /= 1024.0;
				i++;
			}
			return gM( scaleMsgKeys[i], size.toFixed( i > 1 ? 2 : 0 ) );
		}
	};

} )( mediaWiki );
	
