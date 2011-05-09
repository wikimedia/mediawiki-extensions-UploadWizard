( function() {

	/**
	 * Check if a value is null, undefined, or the empty string. 
	 *
	 * @param {mixed} v Variable to be checked
	 * @return {boolean}
	 */
	mw.isEmpty = function( v ) {
		return ! mw.isDefined( v ) || v === null || v === ''; 
	};

	/**
	 * Check if something is defined
	 * @param {mixed} v
	 * @return {boolean}
	 */
	mw.isDefined = function( v ) {
		return typeof v !== 'undefined'; 
	};


	/**
	 * Upper-case the first letter of a string.
	 * @param {string}
	 * @return {string} with first letter uppercased.
	 */
	mw.ucfirst = function( s ) {
		return s.substring(0,1).toUpperCase() + s.substr(1);
	};


} )();
