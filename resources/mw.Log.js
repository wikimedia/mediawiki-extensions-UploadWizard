// dependencies: [ mw ] 

( function( mw, $j ) {

	/**
	* Log a string msg to the console
	* 
	* @param {String} string String to output to console
	*/
	mw.log = function( s, level ) {
		
		if ( typeof level === 'undefined' ) {
			level = 30;
		}

		if ( level > mw.log.level ) {
			return;
		}	
	
		// Add any prepend debug ss if necessary           
		if ( mw.log.preAppendLog ) {
			s = mw.log.preAppendLog + s;
		}

		if ( typeof window.console !== 'undefined' && typeof window.console.log === 'function' ) {
			window.console.log( s );
		} else {
			// Show a log box for console-less browsers
			var $log = $( '#mw-log-console' );
			if ( !$log.length ) {
				$log = $( '<div id="mw-log-console"></div>' )
					.css( {
						'position': 'absolute',
						'overflow': 'auto',
						'z-index': 500,
						'bottom': '0px',
						'left': '0px',
						'right': '0px',
						'height': '100px',
						'width': '100%',
						'background-color': 'white',
						'border-top': 'solid 2px #ADADAD'
					} )
					.appendTo( 'body' );
			}
			$log.append(
				$( '<div></div>' )
					.css( {
						'border-bottom': 'solid 1px #DDDDDD',
						'font-size': 'small',
						'font-family': 'monospace',
						'padding': '0.125em 0.25em'
					} )
					.text( s )
			);
		}
	};
	
	mw.log.level = mw.log.NONE = 0;
	mw.log.FATAL = 10;
	mw.log.WARN = 20;
	mw.log.INFO = 30;	
	mw.log.ALL = 100;
	
	mw.log.fatal = function( s ) {
		mw.log( s, mw.log.FATAL );
	};
	mw.log.warn = function( s ) {
		mw.log( s, mw.log.WARN );
	};
	mw.log.info = function( s ) {
		mw.log( s, mw.log.INFO );
	};
	mw.log.level = mw.log.ALL;

} )( window.mediaWiki, jQuery );

