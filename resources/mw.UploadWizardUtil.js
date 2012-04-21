/**
 * Miscellaneous utilities
 */
( function ( mw, $j, undefined ) {
mw.UploadWizardUtil = {

	/**
	 * Simple 'more options' toggle that opens more of a form.
	 *
	 * @param toggleDiv the div which has the control to open and shut custom options
	 * @param moreDiv the div containing the custom options
	 * @param msg the UI message key to use for the toggler
	 *        (with mwe-upwiz- prefix for UploadWizard messages)
	 */
	makeToggler: function ( toggleDiv, moreDiv, msg ) {
		var $toggleLink = $j( '<a>' )
		   	.addClass( 'mwe-upwiz-toggler mwe-upwiz-more-options' )
			.append( gM( msg ) );
		$j( toggleDiv ).append( $toggleLink );

		var toggle = function() {
			var isOpen = $toggleLink.hasClass( "mwe-upwiz-toggler-open" );
			if ( isOpen ) {
				// hide the extra options
				moreDiv.slideUp( 250 );
				/* when closed, show control to open */
				$toggleLink.removeClass( "mwe-upwiz-toggler-open" );
			} else {
				// show the extra options
				moreDiv.slideDown( 250 );
				/* when open, show control to close */
				$toggleLink.addClass( "mwe-upwiz-toggler-open" );
			}
		};

		moreDiv.hide();

		$toggleLink.click( function( e ) { e.stopPropagation(); toggle(); } );

		$j( moreDiv ).addClass( 'mwe-upwiz-toggled' );
	},

	/**
	 * remove an item from an array. Tests for === identity to remove the item
	 *  XXX the entire rationale for this function may be wrong.
	 *  XXX The jQuery way would be to query the DOM for objects, not to keep a separate array hanging around
	 * @param items  the array where we want to remove an item
	 * @param item	 the item to remove
	 */
	removeItem: function( items, item ) {
		for ( var i = 0; i < items.length; i++ ) {
			if ( items[i] === item ) {
				items.splice( i, 1 );
				break;
			}
		}
	},

	/**
	 * Get the basename of a path.
	 * For error conditions, returns the empty string.
	 *
	 * @param {String} path
	 * @return {String} basename
	 */
	getBasename: function( path ) {
		if ( path === undefined || path === null ) {
			return '';
		}

	 	// find index of last path separator in the path, add 1. (If no separator found, yields 0)
		// then take the entire string after that.
		return path.substr( Math.max( path.lastIndexOf( '/' ), path.lastIndexOf( '\\' ) ) + 1 );
 	},



	/**
	 * Last resort to guess a proper extension
	 */
	mimetypeToExtension: {
		'image/jpeg': 'jpg',
		'image/gif': 'gif'
		// fill as needed
	}


};
}) ( window.mediaWiki, jQuery );
