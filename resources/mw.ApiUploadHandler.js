/**
 * An attempt to refactor out the stuff that does API-via-iframe transport
 * In the hopes that this will eventually work for AddMediaWizard too
 */

// n.b. if there are message strings, or any assumption about HTML structure of the form.
// then we probably did it wrong

/**
 * Represents an object which configures a form to upload its files via an iframe talking to the MediaWiki API.
 * @param an UploadInterface object, which contains a .form property which points to a real HTML form in the DOM
 */
mw.ApiUploadHandler = function( upload ) {
	this.upload = upload;
	// setup up local pointer to api: 
	this.api = upload.api;		
};

mw.ApiUploadHandler.prototype = {
	/**
	 * Configure an HTML form so that it will submit its files to our transport (an iframe)
	 * with proper params for the API
	 * @param callback
	 */
	configureForm: function() {
		var _this = this;
		mw.log( "mw.ApiUploadHandler::configureForm> configuring form for Upload API" );

		_this.addFormInputIfMissing( 'action', 'upload' );

		// force stash
		_this.addFormInputIfMissing( 'stash', 1 );

		// XXX TODO - remove; if we are uploading to stash only, a comment should not be required - yet.
		_this.addFormInputIfMissing( 'comment', 'DUMMY TEXT' );
		
		// we use JSON in HTML because according to mdale, some browsers cannot handle just JSON
		_this.addFormInputIfMissing( 'format', 'jsonfm' );
		
		// XXX only for testing, so it stops complaining about dupes
		/*
		if ( mw.UploadWizard.DEBUG ) {
			_this.addFormInputIfMissing( 'ignorewarnings', '1' );
		}
		*/
	},
	getTransport: function(){
		if( this.transport ){
			return this.transport;
		}
		this.transport = new mw.IframeTransport(
				this.getForm(),
				function( fraction ) { 
					_this.upload.setTransportProgress( fraction ); 
				},
				function( result ) { 	
					_this.upload.setTransported( result ); 
				}
			);
		return this.transport ;
	},
	getForm: function(){
		if( this.upload && this.upload.ui && this.upload.ui.form ){
			this.configureForm();
			return $j( this.upload.ui.form );
		}
		mw.log("Error:: could not get form")
		return false;
	},
	/**
	 * Get a pointer to the "file" input control 
	 */
	getInputControl: function(){
		var _this = this;
		return $j('<input size="1" class="mwe-upwiz-file-input" name="file" type="file"/>')
				.change( function() { 
					_this.upload.ui.fileChanged(); 
				} );
	},
	
	/** 
	 * Modify our form to have a fresh edit token.
	 * If successful, return true to a callback.
	 * @param callback to return true on success
	 */
	configureEditToken: function( callerOk, err ) {
		var _this = this;

		var ok = function( token ) { 
			_this.addFormInputIfMissing( 'token', token );
			callerOk();
		};

		_this.api.getEditToken( ok, err );
	},

	/**
	 * Add a hidden input to a form  if it was not already there.
	 * @param name  the name of the input
	 * @param value the value of the input
	 */
	addFormInputIfMissing: function( name, value ) {
		if ( this.getForm().find( "[name='" + name + "']" ).length === 0 ) {
			this.getForm().append( $j( '<input />' ) .attr( { 'type': "hidden", 'name': name, 'value': value } ));
		}		
	},

	/**
	 * Kick off the upload!
	 */
	start: function() {
		var _this = this;
		var ok = function() {
			mw.log( "mw.ApiUploadHandler::start> upload start!" );
			_this.beginTime = ( new Date() ).getTime();
			_this.upload.ui.setStatus( 'mwe-upwiz-transport-started' );
			_this.upload.ui.showTransportProgress();
			_this.getForm().submit();
		};
		var err = function( code, info ) {
			_this.upload.setError( code, info );
		}; 
		this.configureEditToken( ok, err );
	}
};



