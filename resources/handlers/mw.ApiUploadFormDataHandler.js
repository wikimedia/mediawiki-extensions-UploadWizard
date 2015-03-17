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

		upload.on( 'remove-upload', function () {
			handler.transport.abort();
		} );

		this.transport = new mw.FormDataTransport(
			this.$form[0].action,
			this.formData
		).on( 'update-stage', function ( stage ) {
			upload.ui.setStatus( 'mwe-upwiz-' + stage );
		} );
	};

	mw.ApiUploadFormDataHandler.prototype = {
		/**
		 * Optain a fresh edit token.
		 * If successful, store token and call a callback.
		 * @return {jQuery.Promise}
		 */
		configureEditToken: function () {
			var handler = this;

			return this.api.getEditToken().then( function ( token ) {
				handler.formData.token = token;
			} );
		},

		/**
		 * Kick off the upload!
		 * @return {jQuery.Promise}
		 */
		start: function () {
			var handler = this;

			return this.configureEditToken().then( function () {
				handler.beginTime = ( new Date() ).getTime();
				handler.upload.ui.setStatus( 'mwe-upwiz-transport-started' );
				handler.upload.ui.showTransportProgress();
				return handler.transport.upload( handler.upload.file )
					.progress( function ( evt, xhr ) {
						var fraction;

						if ( handler.upload.state === 'aborted' ) {
							xhr.abort();
							return;
						}

						if ( evt.lengthComputable ) {
							fraction = parseFloat( evt.loaded / evt.total );
							handler.upload.setTransportProgress( fraction );
						}
					} ).then( function ( result ) {
						handler.upload.setTransported( result );
					} );
			}, function ( code, info ) {
				handler.upload.setError( code, info );
			} );
		}
	};
}( mediaWiki, jQuery ) );
