/**
* Check if an object is empty or if its an empty string. 
*
* @param {Object} object Object to be checked
*/
mw.isEmpty = function( object ) {
	if( typeof object == 'string' ) {
		if( object == '' ) return true;
		// Non empty string: 
		return false;
	}

	// If an array check length:
	if( Object.prototype.toString.call( object ) === "[object Array]"
		&& object.length == 0 ) {
		return true;
	}

	// Else check as an object: 
	for( var i in object ) { return false; }

	// Else object is empty:
	return true;
}


