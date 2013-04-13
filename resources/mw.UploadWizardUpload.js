/**
 * Represents the upload -- in its local and remote state. (Possibly those could be separate objects too...)
 * This is our 'model' object if we are thinking MVC. Needs to be better factored, lots of feature envy with the UploadWizard
 * states:
 *   'new' 'transporting' 'transported' 'metadata' 'stashed' 'details' 'submitting-details' 'complete' 'error'
 * should fork this into two -- local and remote, e.g. filename
 */
( function( $j, undefined ) {

var fileNsId = mw.config.get( 'wgNamespaceIds' ).file;

/**
 * Constructor for objects representing uploads. The workhorse of this entire extension.
 *
 * The upload knows nothing of other uploads. It manages its own interface, and transporting its own data, to
 * the server.
 *
 * Upload objects are usually created without a file, they are just associated with a form.
 * There is an "empty" fileInput which is invisibly floating above certain buttons in the interface, like "Add a file". When
 * this fileInput gets a file, this upload becomes 'filled'.
 *
 * On some browsers, the user may select multiple files. So upon such a 'filled' event, we add the first File to this Upload, and
 * then create other UploadWizardUpload objects from the individual Files, using the optional providedFile parameter.
 *
 * @param {UploadWizard} wizard
 * @param {HTMLDivElement} filesDiv - where we will dump our the interfaces for uploads
 * @param {File} providedFile - optional; only used on browsers which support FileAPI.
 * @param {int} reservedIndex - optional, what key in the uploads array to hold for this upload
 */
mw.UploadWizardUpload = function( wizard, filesDiv, providedFile, reservedIndex ) {

	this.index = mw.UploadWizardUpload.prototype.count;
	mw.UploadWizardUpload.prototype.count++;

	this.wizard = wizard;
	this.api = wizard.api;
	this.state = 'new';
	this.thumbnails = {};
	this.thumbnailPublishers = {};
	this.imageinfo = {};
	this.title = undefined;
	this.mimetype = undefined;
	this.extension = undefined;
	this.filename = undefined;
	this.providedFile = providedFile;
	this.file = undefined;
	this.ignoreWarning = {};
	this.fromURL = false;

	// check to see if the File is being uplaoded from a 3rd party URL.
	if ( this.providedFile ) {
		if ( this.providedFile.fromURL ) {
			this.fromURL = true;
		}
	}
	// reserved index for multi-file selection
	this.reservedIndex = reservedIndex;

	this.fileKey = undefined;

	// this should be moved to the interface, if we even keep this
	this.transportWeight = 1; // default all same
	this.detailsWeight = 1; // default all same

	// details
	this.ui = new mw.UploadWizardUploadInterface( this, filesDiv, providedFile );

	// handler -- usually ApiUploadHandler
	// this.handler = new ( mw.UploadWizard.config.uploadHandlerClass )( this );
	// this.handler = new mw.MockUploadHandler( this );
	this.handler = this.getUploadHandler();
};

mw.UploadWizardUpload.prototype = {
	// Upload handler
	uploadHandler: null,

	// increments with each upload
	count: 0,

	acceptDeed: function( deed ) {
		var _this = this;
		_this.deed.applyDeed( _this );
	},

	/**
	 * start
	 */
	start: function() {
		var _this = this;

		if ( mw.UploadWizard.config.startImmediately === true ) {
			_this.wizard.hideFileEndButtons();
			$j('#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons').hide();
			_this.wizard.startProgressBar();
			_this.wizard.allowCloseWindow = mw.confirmCloseWindow( {
				message: function() { return mw.msg( 'mwe-upwiz-prevent-close', _this.wizard.uploads.length ); },
				test: function() { return !_this.wizard.isComplete() && _this.wizard.uploads.length > 0; }
			} );
		}
		_this.setTransportProgress(0.0);
		//_this.ui.start();
		_this.handler.start();
	},

	/**
	 *  remove this upload. n.b. we trigger a removeUpload this is usually triggered from
	 */
	remove: function() {
		this.state = 'aborted';
		if ( this.deedPreview ) {
			this.deedPreview.remove();
		}
		if ( this.details && this.details.div ) {
			this.details.div.remove();
		}
		if ( this.thanksDiv ) {
			this.thanksDiv.remove();
		}
		// we signal to the wizard to update itself, which has to delete the final vestige of
		// this upload (the ui.div). We have to do this silly dance because we
		// trigger through the div. Triggering through objects doesn't always work.
		// TODO v.1.1 fix, don't need to use the div any more -- this now works in jquery 1.4.2
		$j( this.ui.div ).trigger( 'removeUploadEvent' );

		if ( this.wizard.uploads && this.wizard.uploads.length !== 0 && mw.UploadWizard.config.startImmediately === true ) {
			// check all uploads, if they're complete, show the next button
			this.wizard.showNext( 'file', 'stashed' );
		}
	},


	/**
	 * Wear our current progress, for observing processes to see
	 * @param fraction
	 */
	setTransportProgress: function ( fraction ) {
		var _this = this;
		_this.state = 'transporting';
		_this.transportProgress = fraction;
		$j( _this.ui.div ).trigger( 'transportProgressEvent' );
	},

	/**
	 * Queue some warnings for possible later consumption
	 */
	addWarning: function( code, info ) {
		if ( this.warnings === undefined ) {
			this.warnings = [];
		}
		this.warnings.push( [ code, info ] );
	},

	/**
	 * Stop the upload -- we have failed for some reason
	 */
	setError: function( code, info ) {
		this.state = 'error';
		this.transportProgress = 0;
		this.ui.showError( code, info );
	},

	/**
	 * Resume the upload, assume that whatever error(s) we got were benign.
	 */
	removeErrors: function ( code ) {
		this.ignoreWarning[code] = true;
		this.start();
	},

	/**
	 * To be executed when an individual upload finishes. Processes the result and updates step 2's details
	 * @param result	the API result in parsed JSON form
	 */
	setTransported: function( result ) {
		var _this = this;
		if ( _this.state == 'aborted' ) {
			return;
		}

		// default error state
		var code = 'unknown',
			info = 'unknown';

		if ( result.error ) {
			// If there was an error, we can't really do anything else, so let's get out while we can.
			if ( result.error.code ) {
				code = result.error.code;
			}
			if ( code === 'filetype-banned' && result.error.blacklisted ) {
				code = 'filetype-banned-type';
				var comma = mw.msg( 'comma-separator' );
				info = [
					result.error.blacklisted.join( comma ),
					result.error.allowed.join( comma ),
					result.error.allowed.length,
					result.error.blacklisted.length
				];
			} else if ( result.error.info ) {
				info = result.error.info;
			}
			this.setError( code, info );
			return;
		}

		var warnCode;

		result.upload = result.upload || {};
		result.upload.warnings = result.upload.warnings || {};

		for ( warnCode in result.upload.warnings ) {
			if ( !this.ignoreWarning[warnCode] && this.state !== 'error' ) {
				switch ( warnCode ) {
					case 'page-exists':
					case 'exists':
					case 'exists-normalized':
					case 'was-deleted':
					case 'badfilename':
						// we ignore these warnings, because the title is not our final title.
						break;
					case 'duplicate':
						code = warnCode;
						_this.setError( warnCode, _this.duplicateErrorInfo( warnCode, result.upload.warnings[warnCode] ) );
						break;
					case 'duplicate-archive':
						// This is the case where the file did exist, but it was deleted.
						// We should definitely tell the user, but let them override.
						// If they already have, then don't execute any of this.
						code = warnCode;
						_this.setError( warnCode, _this.duplicateErrorInfo( warnCode, result.upload.warnings[warnCode] ) );
						var $override = $( '<a></a>' )
							.attr( 'href', 'javascript:' )
							.text( mw.msg( 'mwe-upwiz-override' ) )
							.click( ( function ( theCode ) {
								this.removeErrors( theCode );
							} ).bind( this, warnCode ) );
						$( '.mwe-upwiz-file-status-line-item', this.ui.visibleFilenameDiv )
							.first()
							.append( ' ' );
							//.append( $override ); See bug 39852
						break;
					default:
						// we have an unknown warning, so let's say what we know
						code = 'unknown-warning';
						if ( typeof result.upload.warnings[warnCode] === 'string' ) {
							// tack the original error code onto the warning info
							info = warnCode + mw.msg( 'colon-separator' ) + result.upload.warnings[warnCode];
						} else {
							info = result.upload.warnings[warnCode];
						}
						_this.setError( code, info );
						break;
				}
			}
		}

		if ( this.state !== 'error' ) {
			if ( result.upload && result.upload.result === 'Success' ) {
				if ( result.upload.imageinfo ) {
					_this.setSuccess( result );
				} else {
					_this.setError( 'noimageinfo', info );
				}
			} else if ( result.upload && result.upload.result === 'Warning' ) {
				throw new Error( 'Your browser got back a Warning result from the server. Please file a bug.' );
			} else {
				_this.setError( code, info );
			}
		}
	},

	/**
	 * Helper function to generate duplicate errors with dialog box. Works with existing duplicates and deleted dupes.
	 * @param {String} error code, should have matching strings in .i18n.php
	 * @param {Object} portion of the API error result listing duplicates
	 */
	duplicateErrorInfo: function( code, resultDuplicate ) {
		var _this = this;
		var duplicates;
		if ( typeof resultDuplicate === 'object' ) {
			duplicates = resultDuplicate;
		} else if ( typeof resultDuplicate === 'string' ) {
			duplicates = [ resultDuplicate ];
		}
		var $ul = $j( '<ul></ul>' );
		$j.each( duplicates, function( i, filename ) {
			var $a = $j( '<a/>' ).append( filename );
			try {
				var href = new mw.Title( filename, fileNsId ).getUrl();
				$a.attr( { 'href': href, 'target': '_blank' } );
			} catch ( e ) {
				$a.click( function() { alert('could not parse filename=' + filename ); } );
				$a.attr( 'href', '#' );
			}
			$ul.append( $j( '<li></li>' ).append( $a ) );
		} );
		var dialogFn = function(e) {
			$j( '<div></div>' )
				.html( $ul )
				.dialog( {
					width : 500,
					zIndex : 200000,
					autoOpen : true,
					title : mw.msg( 'api-error-' + code + '-popup-title', duplicates.length ),
					modal : true
				} );
			e.preventDefault();
		};
		return [ duplicates.length, dialogFn ];
	},

	/**
	 * Called from any upload success condition
	 * @param {Mixed} result -- result of AJAX call
	 */
	setSuccess: function( result ) {
		var _this = this;
		_this.state = 'transported';
		_this.transportProgress = 1;

		_this.ui.setStatus( 'mwe-upwiz-getting-metadata' );
		if ( result.upload ) {
			_this.extractUploadInfo( result.upload );
			if ( !_this.fromURL ) {
				_this.deedPreview.setup();
			}
			_this.details.populate();
			_this.state = 'stashed';
			_this.ui.showStashed();
			$.publishReady( 'thumbnails.' + _this.index, 'api' );
			// check all uploads, if they're complete, show the next button
			//_this.wizard.showNext( 'file', 'stashed' ); See bug 39852
		} else {
			_this.setError( 'noimageinfo' );
		}

	},

	/**
	 * Called when the file is entered into the file input, bound to its change() event.
	 * Checks for file validity, then extracts metadata.
	 * Error out if filename or its contents are determined to be unacceptable
	 * Proceed to thumbnail extraction and image info if acceptable
	 *
	 * We changed the behavior here to be a little more sane. Now any errors
	 * will cause the fileNameOk not to be called, and if you have a special
	 * case where an error should be ignored, you can simply find that error
	 * and delete it from the third parameter of the error callback. The end.
	 *
	 * @param {string} the filename
	 * @param {Array} of Files.  usually one, can be more for multi-file select.
	 * @param {Function()} callback when ok, and upload object is ready
	 * @param {Function(String, Mixed)} callback when filename or contents in error. Signature of string code, mixed info
	 */
	checkFile: function( filename, files, fileNameOk, fileNameErr ) {

		var _this = this;
		var fileErrors = {};

		function finishCallback () {
			if ( _this && _this.ui ) {
				fileNameOk();
			} else {
				setTimeout( finishCallback, 200 );
			}
		}

		// Check if filename is acceptable
		// TODO sanitize filename
		var basename = mw.UploadWizardUtil.getBasename( filename );

		if ( files.length > 1 ) {

			var totalSize = 0;
			$j.each( files, function( i, file ) {
				totalSize += file.size;
			});

			// Local previews are slow due to the data URI insertion into the DOM; for batches we
			// don't generate them if the size of the batch exceeds 10 MB
			if ( totalSize > 10000000 ) {
				_this.wizard.makePreviewsFlag = false;
			}

			_this.reservedIndex = _this.wizard.uploads.length;
		}

		// check to see if the file has already been selected for upload.
		var duplicate = false;
		$j.each( this.wizard.uploads, function ( i, upload ) {
			if ( upload !== undefined && _this !== upload && filename === upload.filename ) {
				duplicate = true;
				return false;
			}
		} );

		if( duplicate ) {
			fileErrors.dup = true;
			fileNameErr( 'dup', basename, fileErrors );
		}

		try {
			this.title = new mw.Title( basename.replace( /:/g, '_' ), fileNsId );
		} catch ( e ) {
			fileErrors.unparseable = true;
			fileNameErr( 'unparseable', null, fileErrors );
		}

		// Check if extension is acceptable
		var extension = this.title.getExtension();
		if ( mw.isEmpty( extension ) ) {
			fileErrors.noext = true;
			fileNameErr( 'noext', null, fileErrors );
		} else {
			if ( $j.inArray( extension.toLowerCase(), mw.UploadWizard.config.fileExtensions ) === -1 ) {
				fileErrors.ext = true;
				fileNameErr( 'ext', extension, fileErrors );
			}
			// Split this into a separate case, if the error above got ignored,
			// we want to still trudge forward.
			if ( !fileErrors.ext ) {
				var hasError = false;
				for ( var errorIndex in fileErrors ) {
					if ( fileErrors[errorIndex] ) {
						hasError = true;
						break;
					}
				}
				// if the JavaScript FileReader is available, extract more info via fileAPI
				if ( mw.fileApi.isAvailable() ) {

					// An UploadWizardUpload object already exists (us) when we add a file.
					// So, when multiple files are provided (via select multiple), add the first file to this UploadWizardUpload
					// and create new UploadWizardUpload objects and corresponding interfaces for the rest.

					this.file = files[0];

					// If chunked uploading is enabled, we can transfer any file that MediaWiki
					// will accept. Otherwise we're bound by PHP's limits.
					// NOTE: Because we don't know until runtime if the browser supports chunked
					// uploading, we can't determine this server-side.
					var actualMaxSize;
					if ( mw.UploadWizard.config.enableChunked && mw.fileApi.isFormDataAvailable() ) {
						actualMaxSize = mw.UploadWizard.config.maxMwUploadSize;
					} else {
						actualMaxSize = Math.min(
							mw.UploadWizard.config.maxMwUploadSize,
							mw.UploadWizard.config.maxPhpUploadSize
						);
					}

					// make sure the file isn't too large
					// XXX need a way to find the size of the Flickr image
					if( !_this.fromURL ){
						this.transportWeight = this.file.size;
						if ( this.transportWeight > actualMaxSize ) {
							_this.showMaxSizeWarning( this.transportWeight, actualMaxSize );
							return;
						}
					}
					if ( this.imageinfo === undefined ) {
						this.imageinfo = {};
					}
					this.filename = filename;

					// For JPEGs, we use the JsJpegMeta library in core to extract metadata,
					// including EXIF tags. This is done asynchronously once each file has been
					// read. Only then is the file properly added to UploadWizard via fileNameOk().
					//
					// For all other file types, we don't need or want to run this.
					//
					// TODO: This should be refactored.

					if( this.file.type === 'image/jpeg' ) {
						var binReader = new FileReader();
						binReader.onload = function() {
							var binStr;
							if ( typeof binReader.result == 'string' ) {
								binStr = binReader.result;
							} else {
								// Array buffer; convert to binary string for the library.
								var arr = new Uint8Array( binReader.result );
								binStr = '';
								for ( var i = 0; i < arr.byteLength; i++ ) {
									binStr += String.fromCharCode( arr[i] );
								}
							}
							var meta;
							try {
								meta = mw.libs.jpegmeta( binStr, _this.file.fileName );
								meta._binary_data = null;
							} catch ( e ) {
								meta = null;
							}
							_this.extractMetadataFromJpegMeta( meta );
							_this.filename = filename;
							if ( hasError === false ) {
								finishCallback();
							}
						};
						if ( 'readAsBinaryString' in binReader ) {
							binReader.readAsBinaryString( _this.file );
						} else if ( 'readAsArrayBuffer' in binReader ) {
							binReader.readAsArrayBuffer( _this.file );
						} else {
							// We should never get here. :P
							throw new Error( 'Cannot read thumbnail as binary string or array buffer.' );
						}
					} else {
						if ( hasError === false ) {
							finishCallback();
						}
					}

					// Now that first file has been prepared, process remaining files
					// in case of a multi-file upload.
					var tooManyFiles = files.length + _this.wizard.uploads.length > mw.UploadWizard.config.maxUploads;

					if ( tooManyFiles ) {
						var remainingFiles = mw.UploadWizard.config.maxUploads - _this.wizard.uploads.length;
						_this.showTooManyFilesWarning( files.length - remainingFiles );
						files = remainingFiles > 1 ? files.slice( 1, remainingFiles ) : [];
					} else {
						files = files.slice( 1 );
					}

					if ( files.length > 0 ) {
						$j.each( files, function( i, file ) {

							// NOTE: By running newUpload we will end up calling checkfile() again.
							var upload = _this.wizard.newUpload( file, _this.reservedIndex + i + 1 );
						} );
						_this.wizard.updateFileCounts();
					}

				} else {
					this.filename = filename;
					if ( hasError === false ) {
						finishCallback();
					}
				}
			}
		}
	},

	/**
	 * Shows an error dialog informing the user that the selected file is to large
	 * @param size integer - the size of the file in bytes
	 * @param maxSize integer - the maximum file size
	 */
	showMaxSizeWarning: function( size, maxSize ) {
		var buttons = [
			{
				text: mw.msg( 'mwe-upwiz-file-too-large-ok' ),
				click: function() {
					$( this ).dialog( "close" );
				}
			}
		];
		$j( '<div></div>' )
			.msg(
				'mwe-upwiz-file-too-large-text',
				mw.units.bytes( maxSize ),
				mw.units.bytes( size )
			)
			.dialog( {
				width: 500,
				zIndex: 200000,
				autoOpen: true,
				title: mw.msg( 'mwe-upwiz-file-too-large' ),
				modal: true,
				buttons: buttons
			} );
	},

	/**
	 * Shows an error dialog informing the user that some uploads have been omitted
	 * since they went over the max files limit.
	 * @param filesIgnored integer - the number of files that have been omitted
	 */
	showTooManyFilesWarning: function( filesIgnored ) {
		var buttons = [
			{
				text: mw.msg( 'mwe-upwiz-too-many-files-ok' ),
				click: function() {
					$( this ).dialog( "close" );
				}
			}
		];
		$j( '<div></div>' )
			.msg(
				'mwe-upwiz-too-many-files-text',
				mw.UploadWizard.config.maxUploads,
				mw.UploadWizard.config.maxUploads + filesIgnored,
				filesIgnored
			)
			.dialog( {
				width: 500,
				zIndex: 200000,
				autoOpen: true,
				title: mw.msg( 'mwe-upwiz-too-many-files' ),
				modal: true,
				buttons: buttons
			} );
	},


	/**
	 * Map fields from jpegmeta's metadata return into our format (which is more like the imageinfo returned from the API
	 * @param {Object} (as returned by jpegmeta)
	 */
	extractMetadataFromJpegMeta: function( meta ) {
		if ( meta !== undefined && meta !== null && typeof meta === 'object' ) {
			if ( this.imageinfo === undefined ) {
				this.imageinfo = {};
			}
			if ( this.imageinfo.metadata === undefined ) {
				this.imageinfo.metadata = {};
			}
			if ( meta.tiff && meta.tiff.Orientation ) {
				this.imageinfo.metadata.orientation = meta.tiff.Orientation.value;
			}
			if ( meta.general ) {
				var pixelHeightDim = 'height';
				var pixelWidthDim = 'width';
				// this must be called after orientation is set above. If no orientation set, defaults to 0
				var degrees = this.getOrientationDegrees();
				// jpegmeta reports pixelHeight & width
				if ( degrees == 90 || degrees == 270 ) {
					pixelHeightDim = 'width';
					pixelWidthDim = 'height';
				}
				if ( meta.general.pixelHeight ) {
					this.imageinfo[pixelHeightDim] = meta.general.pixelHeight.value;
				}
				if ( meta.general.pixelWidth ) {
					this.imageinfo[pixelWidthDim] = meta.general.pixelWidth.value;
				}
			}
		}
	},

	/**
	 * Accept the result from a successful API upload transport, and fill our own info
	 *
	 * @param result The JSON object from a successful API upload result.
	 */
	extractUploadInfo: function( resultUpload ) {

		if ( resultUpload.filekey ) {
			this.fileKey = resultUpload.filekey;
		}

		if ( resultUpload.imageinfo ) {
			this.extractImageInfo( resultUpload.imageinfo );
		} else if ( resultUpload.stashimageinfo ) {
			this.extractImageInfo( resultUpload.stashimageinfo );
		}

	},

	/**
	 * Extract image info into our upload object
	 * Image info is obtained from various different API methods
	 * This may overwrite metadata obtained from FileReader.
	 * @param imageinfo JSON object obtained from API result.
	 */
	extractImageInfo: function( imageinfo ) {
		var _this = this;
		for ( var key in imageinfo ) {
			// we get metadata as list of key-val pairs; convert to object for easier lookup. Assuming that EXIF fields are unique.
			if ( key == 'metadata' ) {
				if ( _this.imageinfo.metadata === undefined ) {
					_this.imageinfo.metadata = {};
				}
				if ( imageinfo.metadata && imageinfo.metadata.length ) {
					$j.each( imageinfo.metadata, function( i, pair ) {
						if ( pair !== undefined ) {
							_this.imageinfo.metadata[pair.name.toLowerCase()] = pair.value;
						}
					} );
				}
			} else {
				_this.imageinfo[key] = imageinfo[key];
			}
		}

		if ( _this.title.getExtension() === null ) {
			// 1;
			// TODO v1.1 what if we don't have an extension? Should be impossible as it is currently impossible to upload without extension, but you
			// never know... theoretically there is no restriction on extensions if we are uploading to the stash, but the check is performed anyway.
			/*
			var extension = mw.UploadWizardUtil.getExtension( _this.imageinfo.url );
			if ( !extension ) {
				if ( _this.imageinfo.mimetype ) {
					if ( mw.UploadWizardUtil.mimetypeToExtension[ _this.imageinfo.mimetype ] ) {
						extension = mw.UploadWizardUtil.mimetypeToExtension[ _this.imageinfo.mimetype ];
					}
				}
			}
			*/
		}
	},

	/**
	 * Get information about stashed images
	 * See API documentation for prop=stashimageinfo for what 'props' can contain
	 * @param {Function} callback -- called with null if failure, with imageinfo data structure if success
	 * @param {Array} properties to extract
	 * @param {Number} optional, width of thumbnail. Will force 'url' to be added to props
	 * @param {Number} optional, height of thumbnail. Will force 'url' to be added to props
	 */
	getStashImageInfo: function( callback, props, width, height ) {
		var _this = this;

		if ( props === undefined ) {
			props = [];
		}

		var params = {
			'prop':	'stashimageinfo',
			'siifilekey': _this.fileKey,
			'siiprop': props.join( '|' )
		};

		if ( width !== undefined || height !== undefined ) {
			if ( ! $j.inArray( 'url', props ) ) {
				props.push( 'url' );
			}
			if ( width !== undefined ) {
				params.siiurlwidth = width;
			}
			if ( height !== undefined ) {
				params.siiurlheight = height;
			}
		}

		var ok = function( data ) {
			if ( !data || !data.query || !data.query.stashimageinfo ) {
				mw.log("mw.UploadWizardUpload::getStashImageInfo> No data? ");
				callback( null );
				return;
			}
			callback( data.query.stashimageinfo );
		};

		var err = function( code, result ) {
			mw.log( 'mw.UploadWizardUpload::getStashImageInfo> error: ' + code, 'debug' );
			callback( null );
		};

		this.api.get( params, { ok: ok, err: err } );
	},

	/**
	 * Get information about published images
	 * (There is some overlap with getStashedImageInfo, but it's different at every stage so it's clearer to have separate functions)
	 * See API documentation for prop=imageinfo for what 'props' can contain
	 * @param {Function} callback -- called with null if failure, with imageinfo data structure if success
	 * @param {Array} properties to extract
	 * @param {Number} optional, width of thumbnail. Will force 'url' to be added to props
	 * @param {Number} optional, height of thumbnail. Will force 'url' to be added to props
	 */
	getImageInfo: function( callback, props, width, height ) {
		var _this = this;
		if ( props === undefined ) {
			props = [];
		}
		var requestedTitle = _this.title.getPrefixedText();
		var params = {
			'prop': 'imageinfo',
			'titles': requestedTitle,
			'iiprop': props.join( '|' )
		};

		if ( width !== undefined || height !== undefined ) {
			if ( ! $j.inArray( 'url', props ) ) {
				props.push( 'url' );
			}
			if ( width !== undefined ) {
				params.iiurlwidth = width;
			}
			if ( height !== undefined ) {
				params.iiurlheight = height;
			}
		}

		var ok = function( data ) {
			if ( data && data.query && data.query.pages ) {
				var found = false;
				$j.each( data.query.pages, function( pageId, page ) {
					if ( page.title && page.title === requestedTitle && page.imageinfo ) {
						found = true;
						callback( page.imageinfo );
						return false;
					}
				} );
				if ( found ) {
					return;
				}
			}
			mw.log("mw.UploadWizardUpload::getImageInfo> No data matching " + requestedTitle + " ? ");
			callback( null );
		};

		var err = function( code, result ) {
			mw.log( 'mw.UploadWizardUpload::getImageInfo> error: ' + code, 'debug' );
			callback( null );
		};

		this.api.get( params, { ok: ok, err: err } );
	},

	/**
	 * Get the upload handler per browser capabilities
	 * @return upload handler object
	 */
	getUploadHandler: function(){
		if( !this.uploadHandler ) {
			var constructor;  // must be the name of a function in 'mw' namespace
			if( mw.UploadWizard.config.enableFirefogg && mw.Firefogg.isInstalled() ) {
				constructor = 'FirefoggHandler';
			} else if( mw.UploadWizard.config.enableFormData && mw.fileApi.isAvailable() && mw.fileApi.isFormDataAvailable()) {
				constructor = 'ApiUploadFormDataHandler';
			} else {
				constructor = 'ApiUploadHandler';
			}
			if ( mw.UploadWizard.config.debug ) {
				mw.log( 'mw.UploadWizard::getUploadHandler> ' + constructor );
			}
			if ( this.fromURL ) {
				constructor = 'ApiUploadHandler';
			}
			this.uploadHandler = new mw[constructor]( this, this.api );
		}
		return this.uploadHandler;
	},

	/**
	 * Explicitly fetch a thumbnail for a stashed upload of the desired width.
	 * Publishes to any event listeners that might have wanted it.
	 *
	 * @param width - desired width of thumbnail (height will scale to match)
	 * @param height - (optional) maximum height of thumbnail
	 */
	getAndPublishApiThumbnail: function( key, width, height ) {
		var _this = this;

		if ( mw.isEmpty( height ) ) {
			height = -1;
		}

		if ( _this.thumbnailPublishers[key] === undefined ) {
			var thumbnailPublisher = function( thumbnails ) {
				if ( thumbnails === null ) {
					// the api call failed somehow, no thumbnail data.
					$j.publishReady( key, null );
				} else {
					// ok, the api callback has returned us information on where the thumbnail(s) ARE, but that doesn't mean
					// they are actually there yet. Keep trying to set the source ( which should trigger "error" or "load" event )
					// on the image. If it loads publish the event with the image. If it errors out too many times, give up and publish
					// the event with a null.
					$j.each( thumbnails, function( i, thumb ) {
						if ( thumb.thumberror || ( ! ( thumb.thumburl && thumb.thumbwidth && thumb.thumbheight ) ) ) {
							mw.log( "mw.UploadWizardUpload::getThumbnail> thumbnail error or missing information" );
							$j.publishReady( key, null );
							return;
						}

						// try to load this image with exponential backoff
						// if the delay goes past 8 seconds, it gives up and publishes the event with null
						var timeoutMs = 100;
						var image = document.createElement( 'img' );
						image.width = thumb.thumbwidth;
						image.height = thumb.thumbheight;
						$j( image )
							.load( function() {
								// cache this thumbnail
								_this.thumbnails[key] = image;
								// publish the image to anyone who wanted it
								$j.publishReady( key, image );
							} )
							.error( function() {
								// retry with exponential backoff
								if ( timeoutMs < 8000 ) {
									setTimeout( function() {
										timeoutMs = timeoutMs * 2 + Math.round( Math.random() * ( timeoutMs / 10 ) );
										setSrc();
									}, timeoutMs );
								} else {
									$j.publishReady( key, null );
								}
							} );

						// executing this should cause a .load() or .error() event on the image
						function setSrc() {
							image.src = thumb.thumburl;
						}

						// and, go!
						setSrc();
					} );
				}
			};

			_this.thumbnailPublishers[key] = thumbnailPublisher;
			if ( _this.state !== 'complete' ) {
				_this.getStashImageInfo( thumbnailPublisher, [ 'url' ], width, height );
			} else {
				_this.getImageInfo( thumbnailPublisher, [ 'url' ], width, height );
			}

		}
	},

	/**
	 * Return the orientation of the image in degrees. Relies on metadata that
	 * may have been extracted at filereader stage, or after the upload when we fetch metadata. Default returns 0.
	 * @return {Integer} orientation in degrees: 0, 90, 180 or 270
	 */
	getOrientationDegrees: function() {
		var orientation = 0;
		if ( this.imageinfo && this.imageinfo.metadata && this.imageinfo.metadata.orientation ) {
			switch ( this.imageinfo.metadata.orientation ) {
				case 8:
					orientation = 90;   // 'top left' -> 'left bottom'
					break;
				case 3:
					orientation = 180;   // 'top left' -> 'bottom right'
					break;
				case 6:
					orientation = 270;   // 'top left' -> 'right top'
					break;
				case 1:
				default:
					orientation = 0;     // 'top left' -> 'top left'
					break;

			}
		}
		return orientation;
	},

	/**
	 * Fit an image into width & height constraints with scaling factor
	 * @param {HTMLImageElement}
	 * @param {Object} with width & height properties
	 * @return {Number}
	 */
	getScalingFromConstraints: function( image, constraints ) {
		var scaling = 1;
		$j.each( [ 'width', 'height' ], function( i, dim ) {
			if ( constraints[dim] && image[dim] > constraints[dim] ) {
				var s = constraints[dim] / image[dim];
				if ( s < scaling ) {
					scaling = s;
				}
			}
		} );
		return scaling;
	},

	/**
	 * Given an image (already loaded), dimension constraints
	 * return canvas object scaled & transformedi ( & rotated if metadata indicates it's needed )
	 * @param {HTMLImageElement}
	 * @param {Object} containing width & height constraints
	 * @return {HTMLCanvasElement}
	 */
	getTransformedCanvasElement: function( image, constraints ) {

		var rotation = 0;

		// if this wiki can rotate images to match their EXIF metadata,
		// we should do the same in our preview
		if ( mw.config.get( 'wgFileCanRotate' ) ) {
			var angle = this.getOrientationDegrees();
			rotation = angle ? 360 - angle : 0;
		}

		// swap scaling constraints if needed by rotation...
		var scaleConstraints;
		if ( rotation === 90 || rotation === 270 ) {
			scaleConstraints = {
				width: constraints.height,
				height: constraints.width
			};
		} else {
			scaleConstraints = {
				width: constraints.width,
				height: constraints.height
			};
		}

		var scaling = this.getScalingFromConstraints( image, constraints );

		var width = image.width * scaling;
		var height = image.height * scaling;

		// Determine the offset required to center the image
		var dx = (constraints.width - width) / 2;
		var dy = (constraints.height - height) / 2;

		switch ( rotation ) {
			// If a rotation is applied, the direction of the axis
			// changes as well. You can derive the values below by
			// drawing on paper an axis system, rotate it and see
			// where the positive axis direction is
			case 90:
				x = dx;
				y = dy - constraints.height;
				break;
			case 180:
				x = dx - constraints.width;
				y = dy - constraints.height;
				break;
			case 270:
				x = dx - constraints.width;
				y = dy;
				break;
			case 0:
			default:
				x = dx;
				y = dy;
				break;
		}

		var $canvas = $j( '<canvas></canvas>' ).attr( constraints );
		var ctx = $canvas[0].getContext( '2d' );
		ctx.clearRect( 0, 0, width, height );
		ctx.rotate( rotation / 180 * Math.PI );
		ctx.drawImage( image, x, y, width, height );

		return $canvas;
	},

	/**
	 * Return a browser-scaled image element, given an image and constraints.
	 * @param {HTMLImageElement}
	 * @param {Object} with width and height properties
	 * @return {HTMLImageElement} with same src, but different attrs
	 */
	getBrowserScaledImageElement: function( image, constraints ) {
		var scaling = this.getScalingFromConstraints( image, constraints );
		return $j( '<img/>' )
			.attr( {
				width:  parseInt( image.width * scaling, 10 ),
				height: parseInt( image.height * scaling, 10 ),
				src:    image.src
			} )
			.css( {
				'margin-top': ( parseInt( ( constraints.height - image.height * scaling ) / 2, 10 ) ).toString() + 'px'
			} );
	},

	/**
	 * Return an element suitable for the preview of a certain size. Uses canvas when possible
	 * @param {HTMLImageElement}
	 * @param {Integer} width
	 * @param {Integer} height
	 * @return {HTMLCanvasElement|HTMLImageElement}
	 */
	getScaledImageElement: function( image, width, height ) {
		if ( typeof width === 'undefined' || width === null || width <= 0 )  {
			width = mw.UploadWizard.config.thumbnailWidth;
		}
		var constraints = {
			width: parseInt( width, 10 ),
			height: ( height === undefined ? null : parseInt( height, 10 ) )
		};

		return mw.canvas.isAvailable() ? this.getTransformedCanvasElement( image, constraints )
							: this.getBrowserScaledImageElement( image, constraints );
	},

	/**
	 * Given a jQuery selector, subscribe to the "ready" event that fills the thumbnail
	 * This will trigger if the thumbnail is added in the future or if it already has been
	 *
	 * @param selector
	 * @param width  Width constraint
	 * @param height Height constraint (optional)
	 * @param boolean add lightbox large preview when ready
	 */
	setThumbnail: function( selector, width, height, isLightBox ) {
		var _this = this;

		/**
		 * This callback will add an image to the selector, using in-browser scaling if necessary
		 * @param {HTMLImageElement}
		 */
		var placed = false;
		var placeImageCallback = function( image ) {
			if ( image === null ) {
				$j( selector ).addClass( 'mwe-upwiz-file-preview-broken' );
				_this.ui.setStatus( 'mwe-upwiz-thumbnail-failed' );
				return;
			}
			var elm = _this.getScaledImageElement( image, width, height );
			// add the image to the DOM, finally
			$j( selector )
				.css( { background: 'none' } )
				.html(
					$j( '<a/></a>' )
						.addClass( "mwe-upwiz-thumbnail-link" )
						.append( elm )
				);
			placed = true;
		};

		// Listen for even which says some kind of thumbnail is available.
		// The argument is an either an ImageHtmlElement ( if we could get the thumbnail locally ) or the string 'api' indicating you
		// now need to get the scaled thumbnail via the API
		$.subscribeReady(
			'thumbnails.' + _this.index,
			function ( x ) {
				if ( isLightBox ) {
					_this.setLightBox( selector );
				}
				if ( !placed ) {
					if ( x === 'api' ) {
						// get the thumbnail via API. This also works with an async pub/sub model; if this thumbnail was already
						// fetched for some reason, we'll get it immediately
						var key = 'apiThumbnail.' + _this.index + ',width=' + width + ',height=' + height;
						$.subscribeReady( key, placeImageCallback );
						_this.getAndPublishApiThumbnail( key, width, height );
					} else if ( x instanceof HTMLImageElement ) {
						placeImageCallback( x );
					} else {
						// something else went wrong, place broken image
						mw.log( 'unexpected argument to thumbnails event: ' + x );
						placeImageCallback( null );
					}
				}
			}
		);
	},

	/**
	 * set up lightbox behavior for non-complete thumbnails
	 * TODO center this
	 * @param selector
	 */
	setLightBox: function( selector ) {
		var _this = this;
		var $imgDiv = $j( '<div></div>' ).css( 'text-align', 'center' );
		$j( selector )
			.click( function() {
				// get large preview image
				// open large preview in modal dialog box
				$j( '<div class="mwe-upwiz-lightbox"></div>' )
					.append( $imgDiv )
					.dialog( {
						'minWidth': mw.UploadWizard.config.largeThumbnailWidth,
						'minHeight': mw.UploadWizard.config.largeThumbnailMaxHeight,
						'autoOpen': true,
						'title': mw.msg( 'mwe-upwiz-image-preview' ),
						'modal': true,
						'resizable': false
					} );
				_this.setThumbnail(
					$imgDiv,
					mw.UploadWizard.config.largeThumbnailWidth,
					mw.UploadWizard.config.largeThumbnailMaxHeight,
					false /* obviously the largeThumbnail doesn't have a lightbox itself! */
				);
				return false;
			} ); // close thumbnail click function
	}

};

} )( jQuery );
