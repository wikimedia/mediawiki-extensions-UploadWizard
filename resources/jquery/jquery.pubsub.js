/**
 * Minimal pubsub framework
 * 
 * Loosely based on https://github.com/phiggins42/bloody-jquery-plugins/pubsub.js, which is itself BSD-licensed.
 */

( function( $ ) { 
	/**
	 * Store of events -> array of listener callbacks
	 */
	var subs = {};

	/**
	 * Publish an event 
	 * Additional variadic arguments after the event name are passed as arguments to the subscriber functions
 	 * @param {String} name of event
	 * @return {Number} number of subscribers 
	 */
	$.publish = function( name /* , args... */ ) { 
		var args = [].slice.call( arguments, 1 );
		$.each( subs[name], function( i, sub ) { 
			sub.apply( null, args );
		} );
		return subs[name].length;
	};

	/**
	 * Subscribe to an event.
	 * @param {String} name of event to listen for
	 * @param {Function} callback to run when event occurs
	 * @return {Array} returns handle which can be used as argument to unsubscribe()
	 */
	$.subscribe = function( name, fn ) { 
		if (!subs[name]) { 
			subs[name] = []; 
		} 
		subs[name].push(fn);
		return [ name, fn ];
	};

	/**
	 * Given the handle of a particular subscription, remove it
	 * @param {Array} object returned by subscribe ( array of event name and callback )
	 * @return {Boolean} success
	 */
	$.unsubscribe = function( nameFn ) {
		var name = nameFn[0];
		var fn = nameFn[1];
		var success = false;
		if ( subs[name].length ) { 
			$.each( subs[name], function( i, fni ) {
				if ( fni === fn ) {
					subs[name].splice( i, 1 );
					success = true;
					return false; /* early exit loop */
				}
			} );
		}
		return success;
	};
} )( jQuery );
