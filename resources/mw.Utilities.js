// dependencies: mw 

( function( mw ) {

	/**
	* Check if a value is null, undefined, or the empty string. 
	*
	* @param {Object} object Object to be checked
	* @return {Boolean}
	*/
	mw.isEmpty = function( o ) {
		return ! mw.isDefined( o ) || o === null || ( typeof o === 'string' && o === '' ); 
	};

	/**
	 * Check if something is defined
	 * (inlineable?)
	 * @param {Object}
	 * @return boolean
	 */
	mw.isDefined = function( obj ) {
		return typeof obj !== 'undefined'; 
	};


	/**
	 * Upper-case the first letter of a string.
	 * @param string
	 * @return string with first letter uppercased.
	 */
	mw.ucfirst = function( s ) {
		return s.substring(0,1).toUpperCase() + s.substr(1);
	};


} )( window.mediaWiki );
