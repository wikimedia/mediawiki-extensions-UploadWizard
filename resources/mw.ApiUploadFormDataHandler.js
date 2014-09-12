( function ( mw, $ ) {
	/**
	 * Represents an object which configures an html5 FormData object to upload.
	 * Large files are uploaded in chunks.
	 * @param an UploadInterface object, which contains a .form property which points to a real HTML form in the DOM
	 */
	mw.ApiUploadFormDataHandler = function ( upload, api ) {
		var handler = this;

		this.upload = upload;
		this.api = api;

		this.$form = $( this.upload.ui.form );
		this.formData = {
			action: 'upload',
			stash: 1,
			format: 'json'
		};

		this.transport = new mw.FormDataTransport(
			this.$form[0].action,
			this.formData,
			this.upload,
			function ( fraction ) {
				handler.upload.setTransportProgress( fraction );
			},
			function ( result ) {
				handler.upload.setTransported( result );
			}
		);

	};

	mw.ApiUploadFormDataHandler.prototype = {
		/**
		 * Optain a fresh edit token.
		 * If successful, store token and call a callback.
		 * @param ok callback on success
		 * @param err callback on error
		 */
		configureEditToken: function ( callerOk, err ) {
			var handler = this,
				ok = function ( token ) {
					handler.formData.token = token;
					callerOk();
				};

			this.api.getEditToken().done( ok ).fail( err );
		},

		/**
		 * Kick off the upload!
		 */
		start: function () {
			function ok() {
				handler.beginTime = ( new Date() ).getTime();
				handler.upload.ui.setStatus( 'mwe-upwiz-transport-started' );
				handler.upload.ui.showTransportProgress();
				handler.transport.upload();
			}

			function err( code, info ) {
				handler.upload.setError( code, info );
			}

			var handler = this;
			this.configureEditToken( ok, err );
		}
	};
}( mediaWiki, jQuery ) );
