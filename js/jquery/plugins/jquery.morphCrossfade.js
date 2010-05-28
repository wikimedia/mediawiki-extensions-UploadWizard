/**
 * jQuery Morphing Crossfade plugin
 * Copyright Neil Kandalgaonkar, 2010
 * 
 * This work is licensed under the terms of the GNU General Public License, 
 * version 2 or later. 
 * (see http://www.fsf.org/licensing/licenses/gpl.html). 
 * Derivative works and later versions of the code must be free software 
 * licensed under the same or a compatible license.
 *
 * There are a lot of cross-fading plugins out there, but most assume that all
 * elements are the same, fixed width. This will also grow or shrink the container
 * vertically while crossfading. This can be useful when (for instance) you have a
 * control panel and you want to switch from a simpler interface to a more advanced
 * version. Or, perhaps you like the way the Mac OS X Preferences panel works, where
 * you click on an icon and get a crossfade effect to another dialog, even if it's one
 * with different dimensions.
 *
 * How to use it:
 * Create some DOM structure where all the panels you want to crossfade are contained in
 * one parent, e.g.
 *
 *  <div id="container">
 *    <div id="panel1"/>
 *    <div id="panel2"/>
 *    <div id="panel3"/>
 *  </div>
 *
 * Initialize the crossfader:
 *
 *   $( '#container' ).morphCrossfader();
 * 
 * By default, this will hide all elements except the first child (in this case #panel1).
 *  
 * Then, whenever you want to crossfade, do something like this. The currently selected panel 
 * will fade away, and your selection will fade in.
 * 
 *   $( '#container' ).morphCrossfade( '#panel2' );
 * 
 */

( function( $ ) {
	/** 
	 * Initialize crossfading of the children of an element 
 	 */
	$.fn.morphCrossfader = function() {
		// the elements that are immediate children are the crossfadables
		// they must all be "on top" of each other, so position them relative
		this.css( { 
			'position' : 'relative', 
			'overflow' : 'hidden'  
		} );
		this.children().css( { 
			'opacity': 0,
			'position': 'absolute', 
			'top': '0px', 
		    	'left' : '0px'
		} );

		// should achieve the same result as crossfade( this.children().first() ) but without
		// animation etc.
		this.morphCrossfade( this.children().first(), 0 );

		return this;
	};

	/** 
	 * Initialize crossfading of the children of an element 
	 * @param selector should be an immediate child of the crossfader element
	 * @param speed (optional) how fast to crossfade, in milliseconds
 	 */
	$.fn.morphCrossfade = function( selector, speed ) {
		if ( typeof speed === 'undefined' ) {
			speed = 400;
		}

		if ( this.data( 'crossfadeDisplay' ) ) {
			// fade WITHOUT hiding when opacity = 0
			$( this.data( 'crossfadeDisplay' ) ).animate( { opacity: 0 }, speed );
		}
		this.data( 'crossfadeDisplay', selector );

		this.animate( { height: $( selector ).outerHeight() }, speed );
		$( selector ).animate( { opacity: 1 }, speed );

		return this;
	};

} )( jQuery );
