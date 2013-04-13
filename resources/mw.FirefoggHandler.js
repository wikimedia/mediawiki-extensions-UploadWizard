/**
 * Represents an object which configures a form to upload its files via an firefogg talking to the MediaWiki API.
 * @param an UploadInterface object, which contains a .form property which points to a real HTML form in the DOM
 */

mw.FirefoggHandler = function( upload, api ) {
	this.upload = upload;
	this.api = upload.api;

	// update the "valid" extension to include firefogg transcode extensions:
	mw.UploadWizard.config.fileExtensions = $.merge(
		mw.UploadWizard.config.fileExtensions,
		mw.UploadWizard.config.transcodeExtensionList
	);
};

mw.FirefoggHandler.prototype = {
	// The transport object
	transport : null, // lazy init
	// Setup local pointer to firefogg instance
	getFogg: function(){
		if( ! this.fogg ){
			this.fogg = new Firefogg();
		}
		return this.fogg;
	},
	getTransport: function(){
		var _this = this;
		if( !this.transport ){
			this.transport = new mw.FirefoggTransport(
					this.upload,
					this.api,
					this.getFogg(),
					function( data ) {
						_this.upload.setTransportProgress( data.progress );
						// also update preview video, url is in data.preview
					},
					function( result ) {
						mw.log("FirefoggTransport::getTransport> Transport done " + JSON.stringify( result ) );
						_this.upload.setTransported( result );
					}
				);
		}
		return this.transport;
	},

	/**
	 * If chunks are disabled transcode then upload else
	 * upload and transcode at the same time
	 */
	start: function() {
		var _this = this;
		mw.log( "mw.FirefoggHandler::start> upload start!" );
		// pass file to Firefogg
		if ( _this.upload.file ) {
			var fileNsId = mw.config.get( 'wgNamespaceIds' ).file;
			_this.getFogg().setInput( _this.upload.file );

			//This is required to get the right requestedTitle in UploadWizardUpload
			var title = _this.getTransport().getFileName().replace( /:/g, '_' );
			_this.upload.title = new mw.Title( title, fileNsId );
		}
		_this.beginTime = ( new Date() ).getTime();
		_this.upload.ui.setStatus( 'mwe-upwiz-transport-started' );
		_this.upload.ui.showTransportProgress();
		_this.getTransport().doUpload();
	}
};
