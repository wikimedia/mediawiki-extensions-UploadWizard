// dependencies: mw 

( function( mw ) {

	/**
	 * Check if a value is null, undefined, or the empty string. 
	 *
	 * @param {object} object Object to be checked
	 * @return {boolean}
	 */
	mw.isEmpty = function( o ) {
		return ! mw.isDefined( o ) || o === null || ( typeof o === 'string' && o === '' ); 
	};

	/**
	 * Check if something is defined
	 * @param {object}
	 * @return {boolean}
	 */
	mw.isDefined = function( o ) {
		return typeof o !== 'undefined'; 
	};


	/**
	 * Upper-case the first letter of a string.
	 * @param {string}
	 * @return {string} with first letter uppercased.
	 */
	mw.ucfirst = function( s ) {
		return s.substring(0,1).toUpperCase() + s.substr(1);
	};


} )( window.mediaWiki );
