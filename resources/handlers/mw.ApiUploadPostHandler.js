( function ( mw, uw ) {
	/**
	 * Represents an object which send a direct request to the MediaWiki API.
	 * This is used when there is no actual file payload (eg. Flickr import)
	 *
	 * @param {mw.UploadWizardUpload} upload current upload
	 * @param {mw.Api} api
	 */
	mw.ApiUploadPostHandler = function ( upload, api ) {
		this.upload = upload;
		this.api = api;
	};

	mw.ApiUploadPostHandler.prototype = {
		start: function () {
			var handler = this,
				tempname = this.upload.getFilename(),
				ext = tempname.split( '.' ).pop();

			// Limit filename length to 240 bytes (limit hardcoded in UploadBase.php).
			if ( tempname.length > 240 ) {
				tempname = tempname.substr( 0, 240 - ext.length - 1 ) + '.' + ext;
			}

			this.upload.ui.setStatus( 'mwe-upwiz-transport-started' );

			return this.api.postWithToken( 'csrf', {
				action: 'upload',
				stash: 1,
				ignorewarnings: 1,
				url: this.upload.file.url,
				filename: tempname
			} )
				.done( function ( result ) {
					if ( result.upload && result.upload.warnings ) {
						uw.eventFlowLogger.logApiError( 'file', result );
					}
					handler.upload.setTransported( result );
				} )
				.fail( function ( code, result ) {
					uw.eventFlowLogger.logApiError( 'file', result );
					handler.upload.setTransportError( code, result );
				} );
		}
	};
}( mediaWiki, mediaWiki.uploadWizard ) );
