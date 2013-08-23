/**
 * An attempt to refactor out the stuff that does API-via-iframe transport
 * In the hopes that this will eventually work for AddMediaWizard too
 */

// n.b. if there are message strings, or any assumption about HTML structure of the form.
// then we probably did it wrong

( function ( mw, $ ) {

/**
 * Represents an object which configures a form to upload its files via an iframe talking to the MediaWiki API.
 * @param an UploadInterface object, which contains a .form property which points to a real HTML form in the DOM
 */
mw.ApiUploadHandler = function( upload, api ) {
	// the Iframe transport is hardcoded for now because it works everywhere
	// can also use Xhr Binary depending on browser
	var handler = this;

	this.upload = upload;
	this.api = api;
	this.$form = $( this.upload.ui.form );
	this.configureForm();

	this.transport = new mw.IframeTransport(
		this.$form,
		function ( fraction ) {
			handler.upload.setTransportProgress( fraction );
		},

		function ( result ) {
			handler.upload.setTransported( result );
		}
	);

};

mw.ApiUploadHandler.prototype = {
	/**
	 * Configure an HTML form so that it will submit its files to our transport (an iframe)
	 * with proper params for the API
	 * @param callback
	 */
	configureForm: function() {
		this.addFormInputIfMissing( 'action', 'upload' );

		// force stash
		this.addFormInputIfMissing( 'stash', 1 );

		// ignore warnings (see mw.FormDataTransport for more)
		this.addFormInputIfMissing( 'ignorewarnings', 1 );

		// XXX TODO - remove; if we are uploading to stash only, a comment should not be required - yet.
		this.addFormInputIfMissing( 'comment', 'DUMMY TEXT' );

		// we use JSON in HTML because according to mdale, some browsers cannot handle just JSON
		this.addFormInputIfMissing( 'format', 'jsonfm' );

		if ( this.upload.fromURL ) {
			this.addFormInputIfMissing( 'url', this.upload.providedFile.url );
		}
	},

	/**
	 * Modify our form to have a fresh edit token.
	 * If successful, return true to a callback.
	 * @param callback to return true on success
	 */
	configureEditToken: function( callerOk, err ) {
		function ok( token ) {
			handler.addFormInputIfMissing( 'token', token );
			callerOk();
		}

		var handler = this;

		this.api.getEditToken( ok, err );
	},

	/**
	 * Add a hidden input to a form  if it was not already there.
	 * @param name  the name of the input
	 * @param value the value of the input
	 */
	addFormInputIfMissing: function( name, value ) {
		if ( this.$form.find( '[name="' + name + '"]' ).length === 0 ) {
			this.$form.append( $( '<input type="hidden" />' ) .attr( { 'name': name, 'value': value } ));
		}
	},

	/**
	 * Kick off the upload!
	 */
	start: function() {
		function ok() {
			handler.beginTime = ( new Date() ).getTime();
			handler.upload.ui.setStatus( 'mwe-upwiz-transport-started' );
			handler.upload.ui.showTransportProgress();
			handler.$form.submit();
		}

		function err( code, info ) {
			handler.upload.setError( code, info );
		}

		var handler = this;
		this.configureEditToken( ok, err );
	}
};
}( mediaWiki, jQuery ) );
