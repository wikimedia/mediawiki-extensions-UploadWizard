( function( mw ) { 

	mw.canvas = {
		/** 
		 * @return boolean
		 */
		isAvailable: function() {
			return false; //return !! ( document.createElement('canvas')['getContext'] );
		}

	}

} )( mediaWiki );
