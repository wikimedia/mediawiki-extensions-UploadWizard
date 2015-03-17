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
	 * @param {jQuery.Deferred} deferred Object to send events to.
	 * @return XMLHttpRequest
	 */
	FDTP.createXHR = function ( deferred ) {
		var xhr = new XMLHttpRequest(),
			transport = this;

		xhr.upload.addEventListener( 'progress', function ( evt ) {
			deferred.notify( evt, xhr );
		}, false );

		xhr.addEventListener( 'abort', function ( evt ) {
			deferred.reject( transport.parseResponse( evt ) );
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

	/**
	 * Start the upload with the provided file.
	 * @return {jQuery.Promise}
	 */
	FDTP.upload = function ( file ) {
		var formData, deferred,
			transport = this;

		// use timestamp + filename to avoid conflicts on server
		this.tempname = ( new Date() ).getTime().toString() + mw.UploadWizard.sanitizeFilename( file.name );
		// remove unicode characters, tempname is only used during upload
		this.tempname = this.tempname.split('').map(function (c) {
			return c.charCodeAt(0) > 128 ? '_' : c;
		}).join('');

		if ( this.config.enableChunked && file.size > this.chunkSize ) {
			return this.uploadChunk( file, 0 );
		} else {
			deferred = $.Deferred();
			this.xhr = this.createXHR( deferred );
			this.xhr.addEventListener( 'load', function ( evt ) {
				deferred.resolve( transport.parseResponse( evt ) );
			}, false);
			this.xhr.addEventListener( 'error', function ( evt ) {
				deferred.reject( transport.parseResponse( evt ) );
			}, false);

			formData = this.createFormData( this.tempname );
			formData.append( 'file', file );

			this.sendData( this.xhr, formData );

			return deferred.promise();
		}
	};

	/**
	 * Upload a single chunk.
	 * @param {File} file
	 * @param {number} offset Offset in bytes.
	 * @return {jQuery.Promise}
	 */
	FDTP.uploadChunk = function ( file, offset ) {
		var formData,
			deferred = $.Deferred(),
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

		this.xhr = this.createXHR( deferred );
		this.xhr.addEventListener( 'load', deferred.resolve, false );
		this.xhr.addEventListener( 'error', deferred.reject, false );

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

		return deferred.promise().then( function ( evt ) {
			return transport.parseResponse( evt );
		}, function ( evt ) {
			return transport.parseResponse( evt );
		} ).then( function ( response ) {
			if ( response.upload && response.upload.filekey ) {
				transport.filekey = response.upload.filekey;
			}

			if ( response.upload && response.upload.result ) {
				switch ( response.upload.result ) {
					case 'Continue':
						// Reset retry counter
						transport.retries = 0;
						// Start uploading next chunk
						return transport.uploadChunk( file, response.upload.offset );
					case 'Success':
						// Just pass the response through.
						return response;
					case 'Poll':
						// Need to retry with checkStatus.
						return transport.retryWithMethod( 'checkStatus' );
				}
			} else {
				// Failed to upload, try again in 3 seconds
				return transport.maybeRetry(
					'on unknown response',
					response,
					'uploadChunk',
					file, offset
				);
			}
		}, function ( response ) {
			return transport.maybeRetry(
				'on error event',
				response,
				'uploadChunk',
				file, offset
			);
		} );
	};

	/**
	 * Handle possible retry event - rejected if maximum retries already fired.
	 * @param {string} contextMsg
	 * @param {Object} response
	 * @param {string} retryMethod
	 * @param {File} [file]
	 * @param {number} [offset]
	 * @return {jQuery.Promise}
	 */
	FDTP.maybeRetry = function ( contextMsg, response, retryMethod, file, offset ) {
		this.retries++;

		if ( this.tooManyRetries() ) {
			mw.log.warn( 'Max retries exceeded ' + contextMsg );
			return $.Deferred().reject( response );
		} else {
			mw.log( 'Retry #' + this.retries + ' ' + contextMsg );
			return this.retryWithMethod( retryMethod, file, offset );
		}
	};

	/**
	 * Have we retried too many times already?
	 * @return {boolean}
	 */
	FDTP.tooManyRetries = function () {
		return this.maxRetries > 0 && this.retries >= this.maxRetries;
	};

	/**
	 * Either retry uploading or checking the status.
	 * @param {'uploadChunk'|'checkStatus'} methodName
	 * @param {File} [file]
	 * @param {number} [offset]
	 * @return {jQuery.Promise}
	 */
	FDTP.retryWithMethod = function ( methodName, file, offset ) {
		var retryDeferred,
			transport = this;

		retryDeferred = $.Deferred();
		setTimeout( function () {
			transport[methodName]( file, offset ).then( retryDeferred.resolve, retryDeferred.reject );
		}, 3000 );

		return retryDeferred.promise();
	};

	/**
	 * Check the status of the upload.
	 * @return {jQuery.Promise}
	 */
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
		return this.api.post( params )
			.then( function ( response ) {
				if ( response.upload && response.upload.result === 'Poll' ) {
					//If concatenation takes longer than 10 minutes give up
					if ( ( ( new Date() ).getTime() - transport.firstPoll ) > 10 * 60 * 1000 ) {
						return $.Deferred().reject( {
							code: 'server-error',
							info: 'unknown server error'
						} );
					} else {
						if ( response.upload.stage === undefined && window.console ) {
							window.console.log( 'Unable to check file\'s status' );
							return $.Deferred().reject();
						} else {
							//Statuses that can be returned:
							// * queued
							// * publish
							// * assembling
							transport.emit( 'update-stage', response.upload.stage );
							return transport.retryWithMethod( 'checkStatus' );
						}
					}
				}

				return response;
			} );
	};

	/**
	 * Parse response from the server.
	 * @param {Event} evt
	 * @return {Object}
	 */
	FDTP.parseResponse = function ( evt ) {
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

		return response;
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
