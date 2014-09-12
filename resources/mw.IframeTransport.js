( function ( mw, $ ) {
	/**
	 * Represents a "transport" for files to upload; in this case an iframe.
	 * XXX dubious whether this is really separated from "ApiUploadHandler", which does a lot of form config.
	 *
	 * The iframe is made to be the target of a form so that the existing page does not reload, even though it's a POST.
	 * @param form	jQuery selector for HTML form
	 * @param progressCb	callback to execute when we've started. (does not do float here because iframes can't
	 *						monitor fractional progress).
	 * @param transportedCb	callback to execute when we've finished the upload
	 */
	mw.IframeTransport = function ( $form, progressCb, transportedCb ) {
		var iframe,
			transport = this;

		function setupFormCallback() {
			transport.configureForm();
			transport.$iframe.off( 'load', setupFormCallback );
			transport.setUpStatus.resolve();
		}
		function iframeError() {
			transport.setUpStatus.reject();
		}

		this.$form = $form;
		this.progressCb = progressCb;
		this.transportedCb = transportedCb;
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

	mw.IframeTransport.prototype = {
		/**
		 * Accessor function
		 * @return {jQuery.Deferred}
		 */
		getSetUpStatus: function () {
			return this.setUpStatus;
		},

		/**
		 * Configure a form with a File Input so that it submits to the iframe
		 * Ensure callback on completion of upload
		 */
		configureForm: function () {
			var transport = this;

			// Set the form target to the iframe
			this.$form.prop( 'target', this.iframeId );

			// attach an additional handler to the form, so, when submitted, it starts showing the progress
			// XXX this is lame .. there should be a generic way to indicate busy status...
			this.$form.submit( function () {
				return true;
			} );

			// Set up the completion callback
			this.$iframe.load( function () {
				transport.progressCb( 1.0 );
				transport.processIframeResult( this );
			} );
		},

		/**
		 * Process the result of the form submission, returned to an iframe.
		 * This is the iframe's onload event.
		 *
		 * @param {Element} iframe iframe to extract result from
		 */
		processIframeResult: function ( iframe ) {
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
			this.transportedCb( response );
		}
	};
}( mediaWiki, jQuery ) );
