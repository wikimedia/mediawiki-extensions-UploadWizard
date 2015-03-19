( function ( mw, $ ) {
	var ITP;

	/**
	 * @class mw.IframeTransport
	 * Represents a "transport" for files to upload; in this case an iframe.
	 * XXX dubious whether this is really separated from "ApiUploadHandler", which does a lot of form config.
	 * The iframe is made to be the target of a form so that the existing page does not reload, even though it's a POST.
	 * @constructor
	 * @param {jQuery} $form HTML form with the upload data.
	 */
	mw.IframeTransport = function ( $form ) {
		var iframe,
			transport = this;

		function setupFormCallback() {
			transport.$iframe.off( 'load', setupFormCallback );
			transport.setUpStatus.resolve();
		}
		function iframeError() {
			transport.setUpStatus.reject();
		}

		this.$form = $form;
		this.setUpStatus = $.Deferred();

		this.iframeId = 'f_' + ( $( 'iframe' ).length + 1 );

		//IE only works if you "create element with the name" ( not jquery style )
		try {
			iframe = document.createElement( '<iframe name="' + this.iframeId + '">' );
		} catch ( ex ) {
			iframe = document.createElement( 'iframe' );
		}

		this.$iframe = $( iframe );

		// we configure form on load, because the first time it loads, it's blank
		// then we configure it to deal with an API submission
		// Using javascript:false because it works in IE6; otherwise about:blank would
		// be a viable option; see If04206fa993129

		/* jshint scripturl: true */
		this.$iframe
			.load( setupFormCallback )
			.error( iframeError )
			.prop( 'id', this.iframeId )
			.prop( 'name', this.iframeId )
			.prop( 'src', 'javascript:false;' )
			.addClass( 'hidden' )
			.hide();
		/* jshint scripturl: false */

		$( 'body' ).append( this.$iframe );
	};

	ITP = mw.IframeTransport.prototype;

	/**
	 * Accessor function
	 * @return {jQuery.Promise}
	 */
	ITP.getSetUpStatus = function () {
		return this.setUpStatus.promise();
	};

	/**
	 * Process the result of the form submission, returned to an iframe.
	 * This is the iframe's onload event.
	 *
	 * @param {Element} iframe iframe to extract result from
	 */
	ITP.processIframeResult = function ( iframe ) {
		var response, json,
			doc = iframe.contentDocument || frames[iframe.id].document;

		// Fix for Opera 9.26
		if ( doc.readyState && doc.readyState !== 'complete' ) {
			return;
		}

		// Fix for Opera 9.64
		if ( doc.body && doc.body.innerHTML === 'false' ) {
			return;
		}

		if ( doc.XMLDocument ) {
			// The response is a document property in IE
			response = doc.XMLDocument;
		} else if ( doc.body ) {
			// Get the json string
			// We're actually searching through an HTML doc here --
			// according to mdale we need to do this
			// because IE does not load JSON properly in an iframe
			json = $( doc.body ).find( 'pre' ).text();

			// check that the JSON is not an XML error message
			// (this happens when user aborts upload, we get the API docs in XML wrapped in HTML)
			if ( json && json.substring(0, 5) !== '<?xml' ) {
				response = $.parseJSON( json );
			} else {
				response = {};
			}
		} else {
			// Response is a xml document
			response = doc;
		}

		// Process the API result
		return response;
	};

	/**
	 * Start the upload.
	 * @return {jQuery.Promise}
	 */
	ITP.upload = function () {
		var transport = this;

		return this.getSetUpStatus().then( function () {
			var deferred = $.Deferred();

			// Set the form target to the iframe
			transport.$form.prop( 'target', transport.iframeId );

			// attach an additional handler to the form, so, when submitted, it starts showing the progress
			// XXX this is lame .. there should be a generic way to indicate busy status...
			transport.$form.submit( function () {
				return true;
			} );

			transport.$iframe.on( 'load', function () {
				deferred.notify( 1.0 );
				deferred.resolve( transport.processIframeResult( this ) );
			} );

			transport.$form.submit();

			return deferred.promise();
		} );
	};
}( mediaWiki, jQuery ) );
