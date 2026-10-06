( function () {

	/**
	 * Canvas support detection.
	 *
	 * @namespace mw.canvas
	 */
	mw.canvas = {
		/**
		 * Check whether the browser supports the canvas element.
		 *
		 * @return {boolean}
		 */
		isAvailable: function () {
			return !!( document.createElement( 'canvas' ).getContext );
		}

	};

}() );
