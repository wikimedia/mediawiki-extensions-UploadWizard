/**
 * dependencies: [ mw ]
 */
( function( mw ) {

	/**
	 * Given a float number of seconds, returns npt format response. ( ignore
	 * days for now )
	 *
	 * @param {Float}
	 *            sec Seconds
	 * @param {Boolean}
	 *            show_ms If milliseconds should be displayed.
	 * @return {Float} String npt format
	 */
	mw.seconds2npt = function( sec, showMs ) {
		if ( isNaN( sec ) ) {
			sec = 0;
		}

		var tm = mw.seconds2Measurements( sec ),
			hoursStr = '';

		// Round the number of seconds to the required number of significant
		// digits
		if ( showMs ) {
			tm.seconds = Math.round( tm.seconds * 1000 ) / 1000;
		} else {
			tm.seconds = Math.round( tm.seconds );
		}
		if ( tm.seconds < 10 ) {
			tm.seconds = '0' +	tm.seconds;
		}
		if ( tm.hours > 0 ) {
			if ( tm.minutes < 10 ) {
				tm.minutes = '0' + tm.minutes;
			}
			hoursStr = tm.hours + ':';
		}
		return hoursStr + tm.minutes + ':' + tm.seconds;
	};

	/**
	 * Given seconds return array with 'days', 'hours', 'min', 'seconds'
	 *
	 * @param {float}
	 *            sec Seconds to be converted into time measurements
	 */
	mw.seconds2Measurements = function ( sec ) {
		var tm = {};
		tm.days = Math.floor( sec / ( 3600 * 24 ) );
		tm.hours = Math.floor( sec / 3600 );
		tm.minutes = Math.floor( ( sec / 60 ) % 60 );
		tm.seconds = sec % 60;
		return tm;
	};

	/**
	 * Take hh:mm:ss,ms or hh:mm:ss.ms input, return the number of seconds
	 *
	 * @param {String}
	 *            npt_str NPT time string
	 * @return {Float} Number of seconds
	 */
	mw.npt2seconds = function ( nptStr ) {
		var hour, min, sec, times;

		if ( !nptStr ) {
			return undefined;
		}
		// Strip {npt:}01:02:20 or 32{s} from time if present
		nptStr = nptStr.replace( /npt:|s/g, '' );

		hour = 0;
		min = 0;
		sec = 0;
		times = nptStr.split( ':' );

		if ( times.length === 3 ) {
			sec = times[2];
			min = times[1];
			hour = times[0];
		} else if ( times.length === 2 ) {
			sec = times[1];
			min = times[0];
		} else {
			sec = times[0];
		}
		// Sometimes a comma is used instead of period for ms
		sec = sec.replace( /,\s?/, '.' );
		// Return seconds float
		return parseInt( hour * 3600, 10 ) + parseInt( min * 60, 10 ) + parseFloat( sec );
	};

}( mediaWiki ) );
