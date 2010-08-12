/**
 * Format a size in bytes for output, using an appropriate
 * unit (B, KB, MB or GB) according to the magnitude in question
 *
 * @param size Size to format
 * @return string Plain text (not HTML)
 */
mw.units.bytes = function ( size ) {
	// For small sizes no decimal places are necessary
	var round = 0;
	var msg = '';
	if ( size > 1024 ) {
		size = size / 1024;
		if ( size > 1024 ) {
			size = size / 1024;
			// For MB and bigger two decimal places are smarter
			round = 2;
			if ( size > 1024 ) {
				size = size / 1024;
				msg = 'mwe-size-gigabytes';
			} else {
				msg = 'mwe-size-megabytes';
			}
		} else {
			msg = 'mwe-size-kilobytes';
		}
	} else {
		msg = 'mwe-size-bytes';
	}
	// JavaScript does not let you choose the precision when rounding
	var p = Math.pow( 10, round );
	size = Math.round( size * p ) / p;
	return gM( msg , size );
};

