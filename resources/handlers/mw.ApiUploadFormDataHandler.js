( function () {
	/**
	 * Represents an object which configures an html5 FormData object to upload.
	 * Large files are uploaded in chunks.
	 *
	 * @class
	 * @param {mw.UploadWizardUpload} upload
	 * @param {mw.Api} api
	 */
	mw.ApiUploadFormDataHandler = function ( upload, api ) {
		mw.ApiUploadHandler.call( this, upload, api );

		this.formData = {
			action: 'upload',
			stash: 1,
			format: 'json'
		};

		this.transport = new mw.FormDataTransport(
			this.api,
			this.formData
		).on( 'update-stage', ( stage ) => {
			upload.ui.setStatus( 'mwe-upwiz-' + stage );
		} );
	};

	OO.inheritClass( mw.ApiUploadFormDataHandler, mw.ApiUploadHandler );

	mw.ApiUploadFormDataHandler.prototype.abort = function () {
		this.transport.abort();
	};

	/**
	 * @return {jQuery.Promise}
	 */
	mw.ApiUploadFormDataHandler.prototype.submit = function () {
		return this.configureEditToken().then( () => {
			this.beginTime = Date.now();
			this.upload.ui.setStatus( 'mwe-upwiz-transport-started' );
			this.upload.ui.showTransportProgress();

			return this.transport.upload( this.upload.file, this.upload.title.getMainText() )
				.progress( ( fraction ) => {
					if ( this.upload.state === 'aborted' ) {
						this.abort();
						return;
					}

					if ( fraction !== null ) {
						this.upload.setTransportProgress( fraction );
					}
				} );
		} );
	};

	/**
	 * Obtain a fresh edit token.
	 * If successful, store token and call a callback.
	 *
	 * @return {jQuery.Promise}
	 */
	mw.ApiUploadFormDataHandler.prototype.configureEditToken = function () {
		return this.api.getEditToken().then( ( token ) => {
			this.formData.token = token;
		} );
	};
}() );
