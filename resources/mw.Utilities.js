// dependencies: mw 

( function( mw ) {

	/**
	* Check if an object is empty or if its an empty string. 
	*
	* @param {Object} object Object to be checked
	* @return {Boolean}
	*/
	mw.isEmpty = function( obj ) {
		if( typeof obj == 'string' ) {
			if( obj == '' ) return true;
			// Non empty string: 
			return false;
		}

		// If an array check length:
		if( Object.prototype.toString.call( obj ) === "[object Array]"
			&& obj.length == 0 ) {
			return true;
		}

		// Else check as an obj: 
		for( var i in obj ) { return false; }

		// Else obj is empty:
		return true;
	};

	/**
	* Opposite of mw.isEmpty
	*
	* @param {Object} object Object to be checked
	* @return {Boolean}
	*/
	mw.isFull = function( obj ) {
		return ! mw.isEmpty( obj );
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


} )( window.mw );
