( function ( mw, $ ) {
/**
 * Represents a "transport" for files to upload; using html5 FormData.
 *
 * @param form          jQuery selector for HTML form with selected file
 * @param formData      object with additinal form fields required for upload api call
 * @param progressCb    callback to execute when we've started.
 * @param transportedCb callback to execute when we've finished the upload
 */

mw.FormDataTransport = function ( postUrl, formData, uploadObject, progressCb, transportedCb ) {
    var profile = $.client.profile();

    this.formData = formData;
    this.progressCb = progressCb;
    this.transportedCb = transportedCb;
    this.uploadObject = uploadObject;

    this.postUrl = postUrl;
    // Set chunk size to configured chunk size or max php size,
    // whichever is smaller.
    this.chunkSize = Math.min( mw.UploadWizard.config.chunkSize,
        mw.UploadWizard.config.maxPhpUploadSize );
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

mw.FormDataTransport.prototype = {
    upload: function () {
        var formData,
			transport = this,
            file = this.uploadObject.file;

        // use timestamp + filename to avoid conflicts on server
        this.tempname = ( new Date() ).getTime().toString() + file.name;
        // remove unicode characters, tempname is only used during upload
        this.tempname = this.tempname.split('').map(function (c) {
            return c.charCodeAt(0) > 128 ? '_' : c;
        }).join('');

        if ( mw.UploadWizard.config.enableChunked && file.size > this.chunkSize ) {
            this.uploadChunk(0);
        } else {
            this.xhr = new XMLHttpRequest();
            this.xhr.addEventListener('load', function (evt) {
                transport.parseResponse(evt, transport.transportedCb);
            }, false);
            this.xhr.addEventListener('error', function (evt) {
                transport.parseResponse(evt, transport.transportedCb);
            }, false);
            this.xhr.upload.addEventListener('progress', function (evt) {
                if ( transport.uploadObject.state === 'aborted' ) {
                    transport.xhr.abort();
                    return;
                }
                if (evt.lengthComputable) {
                    var progress = parseFloat(evt.loaded / evt.total );
                    transport.progressCb(progress);
                }
            }, false);
            this.xhr.addEventListener('abort', function (evt) {
                transport.parseResponse(evt, transport.transportedCb);
            }, false);

            formData = new FormData();

            $.each(this.formData, function (key, value) {
                formData.append(key, value);
            });
			formData.append('filename', this.tempname);
			formData.append('file', file);

			// ignorewarnings is turned on, since warnings are presented in a later step and this
			// transport doesn't know how to deal with them.  Also, it's important to allow people to
			// upload files with (for example) blacklisted names, and then rename them later in the
			// wizard.
			formData.append( 'ignorewarnings', true );

            this.xhr.open('POST', this.postUrl, true);
            this.xhr.send(formData);
        }
    },
    uploadChunk: function (offset) {
        var formData,
			transport = this,
            file = this.uploadObject.file,
            bytesAvailable = file.size,
            chunk;
        if ( this.uploadObject.state === 'aborted' ) {
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

        this.xhr = new XMLHttpRequest();
        this.xhr.addEventListener('load', function (evt) {
            transport.responseText = evt.target.responseText;
            transport.parseResponse(evt, function (response) {
                if (response.upload && response.upload.filekey) {
                    transport.filekey = response.upload.filekey;
                }
                if (response.upload && response.upload.result === 'Success') {
                    //upload finished and can be unstashed later
                    transport.transportedCb(response);
                } else if (response.upload && response.upload.result === 'Poll') {
                    //Server not ready, wait for 3 seconds
                    setTimeout(function () {
                        transport.checkStatus();
                    }, 3000);
                } else if (response.upload && response.upload.result === 'Continue') {
                    //reset retry counter
                    transport.retries = 0;
                    //start uploading next chunk
                    transport.uploadChunk(response.upload.offset);
                } else {
                    //failed to upload, try again in 3 seconds
                    transport.retries++;
                    if (transport.maxRetries > 0 && transport.retries >= transport.maxRetries) {
						mw.log.warn( 'Max retries exceeded on unknown response' );
                        //upload failed, raise response
                        transport.transportedCb(response);
                    } else {
						mw.log( 'Retry #' + transport.retries + ' on unknown response' );
                        setTimeout(function () {
                            transport.uploadChunk(offset);
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
                transport.parseResponse(evt, transport.transportedCb);
            } else {
				mw.log( 'Retry #' + transport.retries + ' on error event' );
                setTimeout(function () {
                        transport.uploadChunk(offset);
                }, 3000);
            }
        }, false);
        this.xhr.upload.addEventListener('progress', function (evt) {
            if ( transport.uploadObject.state === 'aborted' ) {
                transport.xhr.abort();
            }
            if (evt.lengthComputable) {
                var progress = parseFloat( offset + evt.loaded ) / bytesAvailable;
                transport.progressCb(progress);
            }
        }, false);
        this.xhr.addEventListener('abort', function (evt) {
            transport.parseResponse(evt, transport.transportedCb);
        }, false);

        if (this.insufficientFormDataSupport) {
            formData = this.geckoFormData();
        } else {
            formData = new FormData();
        }
        $.each(this.formData, function (key, value) {
            formData.append(key, value);
        });
        formData.append('offset', offset);
        formData.append('filename', this.tempname);

		// ignorewarnings is turned on intentionally, see the above comment to the same effect.
		formData.append( 'ignorewarnings', true );
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
        this.xhr.open('POST', this.postUrl, true);
        if (this.insufficientFormDataSupport) {
            formData.send(this.xhr);
        } else {
            this.xhr.send(formData);
        }
    },
    checkStatus: function () {
        var transport = this,
			api = new mw.Api(),
			params = {};
        if ( this.uploadObject.state === 'aborted' ) {
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
        api.post( params, {
            ok: function (response) {
                if (response.upload && response.upload.result === 'Poll') {
                    //If concatenation takes longer than 10 minutes give up
                    if ( ( ( new Date() ).getTime() - transport.firstPoll ) > 10 * 60 * 1000 ) {
                        transport.transportedCb({
                            code: 'server-error',
                            info: 'unknown server error'
                        });
                    //Server not ready, wait for 3 more seconds
                    } else {
                        if ( response.upload.stage === undefined && window.console ) {
                            window.console.log( 'Unable to check file\'s status' );
                        } else {
                            //Statuses that can be returned:
                            // *mwe-upwiz-queued
                            // *mwe-upwiz-publish
                            // *mwe-upwiz-assembling
                            transport.uploadObject.ui.setStatus( 'mwe-upwiz-' + response.upload.stage );
                            setTimeout(function () {
                                transport.checkStatus();
                            }, 3000);
                        }
                    }
                } else {
                    transport.transportedCb(response);
                }
            },
            err: function (status, response) {
                transport.transportedCb(response);
            }
        } );
    },
    parseResponse: function (evt, callback) {
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
        callback(response);
    },
    geckoFormData: function () {
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
            formData.xhr.setRequestHeader('Content-type',
                                  'multipart/form-data; boundary=' + boundary);
            formData.xhr.sendAsBinary(builder);
        };
        return formData;
    }
};
}( mediaWiki, jQuery ) );
