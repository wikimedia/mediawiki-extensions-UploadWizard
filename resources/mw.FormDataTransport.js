( function ( mw, $, oo ) {
	var FDTP;

	/**
	 * @class mw.FormDataTransport
	 * Represents a "transport" for files to upload; using HTML5 FormData.
	 * @mixins oo.EventEmitter
	 *
	 * @constructor
	 * @param {string} postUrl URL to post to.
	 * @param {Object} formData Additional form fields required for upload api call
	 * @param {Object} [config]
	 */
	mw.FormDataTransport = function ( postUrl, formData, config ) {
		var profile = $.client.profile();

		this.config = config || mw.UploadWizard.config;

		oo.EventEmitter.call( this );

		this.formData = formData;
		this.aborted = false;
		this.api = new mw.Api();

		this.postUrl = postUrl;
		// Set chunk size to configured chunk size or max php size,
		// whichever is smaller.
		this.chunkSize = Math.min( this.config.chunkSize, this.config.maxPhpUploadSize );
		this.maxRetries = 2;
		this.retries = 0;
		this.firstPoll = false;

		// Workaround for Firefox < 7.0 sending an empty string
		// as filename for Blobs in FormData requests, something PHP does not like
		// https://bugzilla.mozilla.org/show_bug.cgi?id=649150
		// From version 7.0 to 22.0, Firefox sends "blob" as the file name
		// which seems to be accepted by the server
		// https://bugzilla.mozilla.org/show_bug.cgi?id=690659
		// https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility

		this.insufficientFormDataSupport = profile.name === 'firefox' && profile.versionNumber < 7;
	};

	oo.mixinClass( mw.FormDataTransport, oo.EventEmitter );

	FDTP = mw.FormDataTransport.prototype;

	FDTP.abort = function () {
		this.aborted = true;

		if ( this.xhr ) {
			this.xhr.abort();
		}
	};

	/**
	 * Creates an XHR and sets some generic event handlers on it.
	 * @return XMLHttpRequest
	 */
	FDTP.createXHR = function () {
		var xhr = new XMLHttpRequest(),
			transport = this;

		xhr.upload.addEventListener( 'progress', function ( evt ) {
			transport.emit( 'progress', evt );
		}, false );

		xhr.addEventListener( 'abort', function ( evt ) {
			transport.emitParsedResponse( evt );
		}, false );

		return xhr;
	};

	/**
	 * Creates a FormData object suitable for upload.
	 * @param {string} filename
	 * @param {number} [offset] For chunked uploads
	 * @return FormData
	 */
	FDTP.createFormData = function ( filename, offset ) {
		var formData;

		if ( this.insufficientFormDataSupport ) {
			formData = this.geckoFormData();
		} else {
			formData = new FormData();
		}

		$.each( this.formData, function ( key, value ) {
			formData.append( key, value );
		} );

		formData.append( 'filename', filename );

		// ignorewarnings is turned on, since warnings are presented in a
		// later step and this transport doesn't know how to deal with them.
		// Also, it's important to allow people to upload files with (for
		// example) blacklisted names, and then rename them later in the
		// wizard.
		formData.append( 'ignorewarnings', true );

		if ( offset ) {
			formData.append( 'offset', offset );
		}

		return formData;
	};

	/**
	 * Sends data in a FormData object through an XHR.
	 * @param {XMLHttpRequest} xhr
	 * @param {FormData} formData
	 */
	FDTP.sendData = function ( xhr, formData ) {
		xhr.open( 'POST', this.postUrl, true );

		if ( this.insufficientFormDataSupport ) {
			formData.send( xhr );
		} else {
			xhr.send( formData );
		}
	};

	FDTP.upload = function ( file ) {
		var formData,
			transport = this;

		// use timestamp + filename to avoid conflicts on server
		this.tempname = ( new Date() ).getTime().toString() + file.name;
		// remove unicode characters, tempname is only used during upload
		this.tempname = this.tempname.split('').map(function (c) {
			return c.charCodeAt(0) > 128 ? '_' : c;
		}).join('');

		if ( this.config.enableChunked && file.size > this.chunkSize ) {
			this.uploadChunk( file, 0 );
		} else {
			this.xhr = this.createXHR();
			this.xhr.addEventListener('load', function (evt) {
				transport.emitParsedResponse( evt );
			}, false);
			this.xhr.addEventListener('error', function (evt) {
				transport.emitParsedResponse( evt );
			}, false);

			formData = this.createFormData();
			formData.append( 'file', file );

			this.sendData( this.xhr, formData );
		}
	};

	FDTP.uploadChunk = function ( file, offset ) {
		var formData,
			transport = this,
			bytesAvailable = file.size,
			chunk;
		if ( this.aborted ) {
			if ( this.xhr ) {
				this.xhr.abort();
			}
			return;
		}
		//Slice API was changed and has vendor prefix for now
		//new version now require start/end and not start/length
		if (file.mozSlice) {
			chunk = file.mozSlice(offset, offset + this.chunkSize, file.type);
		} else if (file.webkitSlice) {
			chunk = file.webkitSlice(offset, offset + this.chunkSize, file.type);
		} else {
			chunk = file.slice(offset, offset + this.chunkSize, file.type);
		}

		this.xhr = this.createXHR();
		this.xhr.addEventListener('load', function (evt) {
			transport.responseText = evt.target.responseText;
			transport.parseResponse(evt, function (response) {
				if (response.upload && response.upload.filekey) {
					transport.filekey = response.upload.filekey;
				}
				if (response.upload && response.upload.result === 'Success') {
					//upload finished and can be unstashed later
					transport.emit( 'transported', response );
				} else if (response.upload && response.upload.result === 'Poll') {
					//Server not ready, wait for 3 seconds
					setTimeout(function () {
						transport.checkStatus();
					}, 3000);
				} else if (response.upload && response.upload.result === 'Continue') {
					//reset retry counter
					transport.retries = 0;
					//start uploading next chunk
					transport.uploadChunk( file, response.upload.offset );
				} else {
					//failed to upload, try again in 3 seconds
					transport.retries++;
					if (transport.maxRetries > 0 && transport.retries >= transport.maxRetries) {
						mw.log.warn( 'Max retries exceeded on unknown response' );
						//upload failed, raise response
						transport.emit( 'transported', response );
					} else {
						mw.log( 'Retry #' + transport.retries + ' on unknown response' );
						setTimeout(function () {
							transport.uploadChunk( file, offset );
						}, 3000);
					}
				}
			});
		}, false);
		this.xhr.addEventListener('error', function (evt) {
			//failed to upload, try again in 3 second
			transport.retries++;
			if (transport.maxRetries > 0 && transport.retries >= transport.maxRetries) {
				mw.log.warn( 'Max retries exceeded on error event' );
				transport.emitParsedResponse( evt );
			} else {
				mw.log( 'Retry #' + transport.retries + ' on error event' );
				setTimeout(function () {
					transport.uploadChunk( file, offset );
				}, 3000);
			}
		}, false);

		formData = this.createFormData( this.tempname, offset );

		// only enable async if file is larger 10Mb
		if ( bytesAvailable > 10 * 1024 * 1024 ) {
			formData.append( 'async', true );
		}

		if (this.filekey) {
			formData.append('filekey', this.filekey);
		}
		formData.append('filesize', bytesAvailable);
		if (this.insufficientFormDataSupport) {
			formData.appendBlob('chunk', chunk, 'chunk.bin');
		} else {
			formData.append('chunk', chunk);
		}

		this.sendData( this.xhr, formData );
	};

	FDTP.checkStatus = function () {
		var transport = this,
			params = {};

		if ( this.aborted ) {
			return;
		}

		if (!this.firstPoll) {
			this.firstPoll = ( new Date() ).getTime();
		}
		$.each(this.formData, function (key, value) {
			params[key] = value;
		});
		params.checkstatus =  true;
		params.filekey =  this.filekey;
		this.api.post( params )
			.done( function (response) {
				if (response.upload && response.upload.result === 'Poll') {
					//If concatenation takes longer than 10 minutes give up
					if ( ( ( new Date() ).getTime() - transport.firstPoll ) > 10 * 60 * 1000 ) {
						transport.emit( 'transported', {
							code: 'server-error',
							info: 'unknown server error'
						} );
					//Server not ready, wait for 3 more seconds
					} else {
						if ( response.upload.stage === undefined && window.console ) {
							window.console.log( 'Unable to check file\'s status' );
						} else {
							//Statuses that can be returned:
							// * queued
							// * publish
							// * assembling
							transport.emit( 'update-stage', response.upload.stage );
							setTimeout(function () {
								transport.checkStatus();
							}, 3000);
						}
					}
				} else {
					transport.emit( 'transported', response );
				}
			} )
			.fail( function (status, response) {
				transport.emit( 'transported', response );
			} );
	};

	FDTP.parseResponse = function ( evt, cb ) {
		var response;
		try {
			response = $.parseJSON(evt.target.responseText);
		} catch ( e ) {
			response = {
				error: {
					code: evt.target.code,
					info: evt.target.responseText
				}
			};
		}

		cb( response );
	};

	/**
	 * Emits a 'transported' event with an object indicating status,
	 * parsed from JSON in the event body.
	 * @param {Event} evt The response event.
	 */
	FDTP.emitParsedResponse = function ( evt ) {
		var transport = this;

		this.parseResponse( evt, function ( response ) {
			transport.emit( 'transported', response );
		} );
	};

	FDTP.geckoFormData = function () {
		var formData, onload,
			boundary = '------XX' + Math.random(),
			dashdash = '--',
			crlf = '\r\n',
			builder = '', // Build RFC2388 string.
			chunksRemaining = 0;

		builder += dashdash + boundary + crlf;

		formData = {
			append: function (name, data) {
				// Generate headers.
				builder += 'Content-Disposition: form-data; name="' + name + '"';
				builder += crlf;
				builder += crlf;

				// Write data.
				builder += data;
				builder += crlf;

				// Write boundary.
				builder += dashdash + boundary + crlf;
			},
			appendFile: function (name, data, type, filename) {
				builder += 'Content-Disposition: form-data; name="' + name + '"';
				builder += '; filename="' + filename + '"';
				builder += crlf;
				builder += 'Content-Type: ' + type;
				builder += crlf;
				builder += crlf;

				// Write binary data.
				builder += data;
				builder += crlf;

				// Write boundary.
				builder += dashdash + boundary + crlf;
			},
			appendBlob: function (name, blob, filename) {
				chunksRemaining++;
				var reader = new FileReader();
				reader.onload = function (e) {
					formData.appendFile(name, e.target.result,
										blob.type, filename);
					// Call onload after last Blob
					chunksRemaining--;
					if (!chunksRemaining && formData.xhr) {
						onload();
					}
				};
				reader.readAsBinaryString(blob);
			},
			send: function (xhr) {
				formData.xhr = xhr;
				if (!chunksRemaining) {
					onload();
				}
			}
		};
		onload = function () {
			// Mark end of the request.
			builder += dashdash + boundary + dashdash + crlf;

			// Send to server
			formData.xhr.setRequestHeader(
				'Content-type',
				'multipart/form-data; boundary=' + boundary
			);
			formData.xhr.sendAsBinary(builder);
		};
		return formData;
	};
}( mediaWiki, jQuery, OO ) );
