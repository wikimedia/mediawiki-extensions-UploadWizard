( function ( mw ) {
	/**
	 * Represents an object which configures a form to upload its files via an firefogg talking to the MediaWiki API.
	 * @param an UploadInterface object, which contains a .form property which points to a real HTML form in the DOM
	 */

	mw.FirefoggHandler = function ( upload, api ) {
		this.upload = upload;
		this.api = api;
	};

	mw.FirefoggHandler.prototype = {
		// The transport object
		transport: null, // lazy init

		// Setup local pointer to firefogg instance
		getFogg: function () {
			if ( !this.fogg ) {
				this.fogg = new window.Firefogg();
			}
			return this.fogg;
		},

		getTransport: function () {
			var upload = this.upload;

			if ( !this.transport ) {
				this.transport = new mw.FirefoggTransport(
					this.upload,
					this.api,
					this.getFogg()
				).on( 'progress', function ( data ) {
					upload.setTransportProgress( data.progress );
					// also update preview video, url is in data.preview
				} ).on( 'transported', function ( result ) {
					mw.log( 'FirefoggTransport::getTransport> Transport done ' + JSON.stringify( result ) );
					upload.setTransported( result );
				} );
			}
			return this.transport;
		},

		/**
		 * If chunks are disabled transcode then upload else
		 * upload and transcode at the same time
		 */
		start: function () {
			var title,
				fileNsId = mw.config.get( 'wgNamespaceIds' ).file;

			mw.log( 'mw.FirefoggHandler::start> Upload start!' );

			// pass file to Firefogg
			if ( this.upload.file ) {
				this.getFogg().setInput( this.upload.file );

				//This is required to get the right requestedTitle in UploadWizardUpload
				title = this.getTransport().getFileName().replace( /:/g, '_' );
				this.upload.title = new mw.Title( title, fileNsId );
			}
			this.beginTime = ( new Date() ).getTime();
			this.upload.ui.setStatus( 'mwe-upwiz-transport-started' );
			this.upload.ui.showTransportProgress();
			this.getTransport().doUpload();
		}
	};
}( mediaWiki ) );
