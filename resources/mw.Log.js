// placeholders for stuff we used to get from mwEmbed

/**
* Log a string msg to the console
* 
* all mw.log statements will be removed on minification so
* lots of mw.log calls will not impact performance in non debug mode
*
* @param {String} string String to output to console
*/
mw.log = function( string ) {

	// Add any prepend debug strings if necessary           
	if ( mw.log.preAppendLog ) {
		string = mw.log.preAppendLog + string;
	}

	if ( window.console ) {
		window.console.log( string );
	} else {

		/**
		 * Old IE and non-Firebug debug: ( commented out for now ) 
		 */
		var log_elm = document.getElementById('mv_js_log');
		if(!log_elm) {
			var body = document.getElementsByTagName("body")[0];
			if (body) {
				body.innerHTML = document.getElementsByTagName("body")[0].innerHTML +
					'<div style="position:absolute;z-index:500;bottom:0px;left:0px;right:0px;height:100px;">'+
					'<textarea id="mv_js_log" cols="120" rows="4"></textarea>'+
					'</div>';
				log_elm = document.getElementById('mv_js_log');
			} else {
				mw.logBuffered += string + "\n";
			}
		}
		if(log_elm) {
			if (mw.logBuffered.length) {
				log_elm.value += mw.logBuffered;
				mw.logBuffered = "";
			}
			log_elm.value+=string+"\n";
		}

	}
}

mw.logBuffered = "";

