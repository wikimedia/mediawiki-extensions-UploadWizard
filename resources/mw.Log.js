// dependencies: [ mw ] 

( function( mw, $j ) {

	/**
	* Log a string msg to the console
	* 
	* all mw.log statements will be removed on minification so
	* lots of mw.log calls will not impact performance in non debug mode
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

		if ( window.console ) {
			window.console.log( s );
		} else {

			/**
			 * Old IE and non-Firebug debug
			 */
			var log_elm = document.getElementById('mv_js_log');

			if ( ! log_elm ) {
				var body = document.getElementsByTagName("body")[0];
				if (body) {
					body.innerHTML = document.getElementsByTagName("body")[0].innerHTML +
						'<div style="position:absolute;z-index:500;bottom:0px;left:0px;right:0px;height:100px;">'+
						'<textarea id="mv_js_log" cols="120" rows="4"></textarea>'+
						'</div>';
					log_elm = document.getElementById('mv_js_log');
				} else {
					mw.logBuffered += s + "\n";
				}
			}

			if ( log_elm ) {
				if (mw.logBuffered.length) {
					log_elm.value += mw.logBuffered;
					mw.logBuffered = "";
				}
				log_elm.value += s + "\n";
			}

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

	mw.logBuffered = "";

} )( window.mw );

