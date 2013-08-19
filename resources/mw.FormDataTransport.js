/**
 * Represents a "transport" for files to upload; using html5 FormData.
 *
 * @param form          jQuery selector for HTML form with selected file
 * @param formData      object with additinal form fields required for upload api call
 * @param progressCb    callback to execute when we've started.
 * @param transportedCb callback to execute when we've finished the upload
 */


mw.FormDataTransport = function( postUrl, formData, uploadObject, progressCb, transportedCb ) {
    this.formData = formData;
    this.progressCb = progressCb;
    this.transportedCb = transportedCb;
	this.uploadObject = uploadObject;

    this.postUrl = postUrl;
    //set chunk size to 5MB or max php size
    this.chunkSize = Math.min(5 * 1024 * 1024, mw.UploadWizard.config.maxPhpUploadSize);
    this.maxRetries = 2;
    this.retries = 0;
    this.firstPoll = false;

    // Workaround for Firefox < 7.0 sending an empty string
    // as filename for Blobs in FormData requests, something PHP does not like
    // https://bugzilla.mozilla.org/show_bug.cgi?id=649150
    this.gecko = $.browser.mozilla && $.browser.version < "7.0";
};

mw.FormDataTransport.prototype = {
    upload: function() {
        var _this = this,
            file = this.uploadObject.file;

        // use timestamp + filename to avoid conflicts on server
        this.tempname = ( new Date() ).getTime().toString() + file.name;
        // remove unicode characters, tempname is only used during upload
        this.tempname = this.tempname.split('').map(function(c) {
            return c.charCodeAt(0) > 128 ? '_' : c;
        }).join('');

        if( mw.UploadWizard.config.enableChunked && file.size > this.chunkSize ) {
            this.uploadChunk(0);
        } else {
            this.xhr = new XMLHttpRequest();
            this.xhr.addEventListener("load", function (evt) {
                _this.parseResponse(evt, _this.transportedCb);
            }, false);
            this.xhr.addEventListener("error", function (evt) {
                _this.parseResponse(evt, _this.transportedCb);
            }, false);
            this.xhr.upload.addEventListener("progress", function (evt) {
                if ( _this.uploadObject.state == 'aborted' ) {
                    _this.xhr.abort();
                    return;
                }
                if (evt.lengthComputable) {
                    var progress = parseFloat(evt.loaded / evt.total );
                    _this.progressCb(progress);
                }
            }, false);
            this.xhr.addEventListener("abort", function (evt) {
                _this.parseResponse(evt, _this.transportedCb);
            }, false);

            var formData = new FormData();

            $.each(this.formData, function(key, value) {
                formData.append(key, value);
            });
			formData.append('filename', this.tempname);
			formData.append('file', file);

			// ignorewarnings is turned on, since warnings are presented in a later step and this
			// transport doesn't know how to deal with them.  Also, it's important to allow people to
			// upload files with (for example) blacklisted names, and then rename them later in the
			// wizard.
			formData.append( 'ignorewarnings', true );

            this.xhr.open("POST", _this.postUrl, true);
            this.xhr.send(formData);
        }
    },
    uploadChunk: function(offset) {
        var _this = this,
            file = this.uploadObject.file,
            bytesAvailable = file.size,
            chunk;
        if ( this.uploadObject.state == 'aborted' ) {
            if ( this.xhr ) {
                this.xhr.abort();
            }
            return;
        }
        //Slice API was changed and has vendor prefix for now
        //new version now require start/end and not start/length
        if(file.mozSlice) {
            chunk = file.mozSlice(offset, offset+_this.chunkSize, file.type);
        } else if(file.webkitSlice) {
            chunk = file.webkitSlice(offset, offset+_this.chunkSize, file.type);
        } else {
            chunk = file.slice(offset, offset+_this.chunkSize, file.type);
        }

        this.xhr = new XMLHttpRequest();
        this.xhr.addEventListener("load", function (evt) {
            _this.responseText = evt.target.responseText;
            _this.parseResponse(evt, function(response) {
                if(response.upload && response.upload.filekey) {
                    _this.filekey = response.upload.filekey;
                }
                if (response.upload && response.upload.result == 'Success') {
                    //upload finished and can be unstashed later
                    _this.transportedCb(response);
                } else if (response.upload && response.upload.result == 'Poll') {
                    //Server not ready, wait for 3 seconds
                    setTimeout(function() {
                        _this.checkStatus();
                    }, 3000);
                } else if (response.upload && response.upload.result == 'Continue') {
                    //reset retry counter
                    _this.retries = 0;
                    //start uploading next chunk
                    _this.uploadChunk(response.upload.offset);
                } else {
                    //failed to upload, try again in 3 seconds
                    _this.retries++;
                    if (_this.maxRetries > 0 && _this.retries >= _this.maxRetries) {
						mw.log( 'max retries exceeded on unknown response' );
                        //upload failed, raise response
                        _this.transportedCb(response);
                    } else {
						mw.log( 'retry #' + _this.retries + ' on unknown response' );
                        setTimeout(function() {
                            _this.uploadChunk(offset);
                        }, 3000);
                    }
                }
            });
        }, false);
        this.xhr.addEventListener("error", function (evt) {
            //failed to upload, try again in 3 second
            _this.retries++;
            if (_this.maxRetries > 0 && _this.retries >= _this.maxRetries) {
				mw.log( 'max retries exceeded on error event' );
                _this.parseResponse(evt, _this.transportedCb);
            } else {
				mw.log( 'retry #' + _this.retries + ' on error event' );
                setTimeout(function() {
                        _this.uploadChunk(offset);
                }, 3000);
            }
        }, false);
        this.xhr.upload.addEventListener("progress", function (evt) {
            if ( _this.uploadObject.state == 'aborted' ) {
                _this.xhr.abort();
            }
            if (evt.lengthComputable) {
                var progress = parseFloat(offset+evt.loaded)/bytesAvailable;
                _this.progressCb(progress);
            }
        }, false);
        this.xhr.addEventListener("abort", function (evt) {
            _this.parseResponse(evt, _this.transportedCb);
        }, false);

        var formData;
        if(_this.gecko) {
            formData = _this.geckoFormData();
        } else {
            formData = new FormData();
        }
        $.each(this.formData, function(key, value) {
            formData.append(key, value);
        });
        formData.append('offset', offset);
        formData.append('filename', _this.tempname);

		// ignorewarnings is turned on intentionally, see the above comment to the same effect.
		formData.append( 'ignorewarnings', true );
		// only enable async if file is larger 10Mb
		if ( bytesAvailable > 10 * 1024 * 1024 ) {
			formData.append( 'async', true );
		}

        if (_this.filekey) {
            formData.append('filekey', _this.filekey);
        }
        formData.append('filesize', bytesAvailable);
        if(_this.gecko) {
            formData.appendBlob('chunk', chunk, 'chunk.bin');
        } else {
            formData.append('chunk', chunk);
        }
        this.xhr.open("POST", _this.postUrl, true);
        if(_this.gecko) {
            formData.send(this.xhr);
        } else {
            this.xhr.send(formData);
        }
    },
    checkStatus: function() {
        var _this = this;
        if ( _this.uploadObject.state == 'aborted' ) {
            return;
        }
        if(!this.firstPoll) {
            this.firstPoll = ( new Date() ).getTime();
        }
        var api = new mw.Api();
        var params = {};
        $.each(this.formData, function(key, value) {
            params[key] = value;
        });
        params.checkstatus =  true;
        params.filekey =  this.filekey;
        api.post( params, {
            ok: function(response) {
                if (response.upload && response.upload.result == 'Poll') {
                    //If concatenation takes longer than 10 minutes give up
                    if ( ( ( new Date() ).getTime() - _this.firstPoll ) > 10 * 60 * 1000 ) {
                        _this.transportedCb({
                            code: 'server-error',
                            info: 'unknown server error'
                        });
                    //Server not ready, wait for 3 more seconds
                    } else {
                        _this.uploadObject.ui.setStatus( 'mwe-upwiz-' + response.upload.stage );
                        setTimeout(function() {
                            _this.checkStatus();
                        }, 3000);
                    }
                } else {
                    _this.transportedCb(response);
                }
            },
            err: function(status, response) {
                _this.transportedCb(response);
            }
        } );
    },
    parseResponse: function(evt, callback) {
        var response;
        try {
            response = $.parseJSON(evt.target.responseText);
        } catch(e) {
            response = {
                error: {
                    code: evt.target.code,
                    info: evt.target.responseText
                }
            };
        }
        callback(response);
    },
    geckoFormData: function() {
        var boundary = '------XX' + Math.random(),
            dashdash = '--',
            crlf = '\r\n',
            builder = '', // Build RFC2388 string.
            chunksRemaining = 0;

        builder += dashdash + boundary + crlf;

        var formData = {
            append: function(name, data) {
                // Generate headers.
                builder += 'Content-Disposition: form-data; name="'+ name +'"';
                builder += crlf;
                builder += crlf;

                // Write data.
                builder += data;
                builder += crlf;

                // Write boundary.
                builder += dashdash + boundary + crlf;
            },
            appendFile: function(name, data, type, filename) {
                builder += 'Content-Disposition: form-data; name="'+ name +'"';
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
            appendBlob: function(name, blob, filename) {
                chunksRemaining++;
                var reader = new FileReader();
                reader.onload = function(e) {
                    formData.appendFile(name, e.target.result,
                                        blob.type, filename);
                    // Call onload after last Blob
                    chunksRemaining--;
                    if(!chunksRemaining && formData.xhr) {
                        onload();
                    }
                };
                reader.readAsBinaryString(blob);
            },
            send: function(xhr) {
                formData.xhr = xhr;
                if(!chunksRemaining) {
                    onload();
                }
            }
        };
        var onload = function() {
            // Mark end of the request.
            builder += dashdash + boundary + dashdash + crlf;

            // Send to server
            formData.xhr.setRequestHeader("Content-type",
                                  "multipart/form-data; boundary=" + boundary);
            formData.xhr.sendAsBinary(builder);
        };
        return formData;
    }
};
