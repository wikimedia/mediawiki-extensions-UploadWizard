/**
 * Represents the upload -- in its local and remote state. (Possibly those could be separate objects too...)
 * This is our 'model' object if we are thinking MVC. Needs to be better factored, lots of feature envy with the UploadWizard
 * states:
 *   'new' 'transporting' 'transported' 'metadata' 'stashed' 'details' 'submitting-details' 'complete' 'error'
 * should fork this into two -- local and remote, e.g. filename
 */
/* jshint camelcase: false, nomen: false */
/* jscs:disable disallowDanglingUnderscores, requireCamelCaseOrUpperCaseIdentifiers */
( function ( mw, $, oo ) {

	var UWUP,
		fileNsId = mw.config.get( 'wgNamespaceIds' ).file;

	/**
	 * @class mw.UploadWizardUpload
	 * @mixins OO.EventEmitter
	 * @constructor
	 * Constructor for objects representing uploads. The workhorse of this entire extension.
	 *
	 * The upload knows nothing of other uploads. It manages its own interface, and transporting its own data, to
	 * the server.
	 *
	 * Upload objects are usually created without a file, they are just associated with a form.
	 * There is an "empty" fileInput which is invisibly floating above certain buttons in the interface, like "Add a file". When
	 * this fileInput gets a file, this upload becomes 'filled'.
	 *
	 * @param {UploadWizard} wizard
	 * @param {HTMLDivElement} filesDiv - where we will dump our the interfaces for uploads
	 */
	function UploadWizardUpload( wizard, filesDiv ) {
		var upload = this;

		oo.EventEmitter.call( this );

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
		this.file = undefined;
		this.ignoreWarning = {};
		this.fromURL = false;
		this.previewLoaded = false;
		this.generatePreview = true;

		this.fileKey = undefined;

		// this should be moved to the interface, if we even keep this
		this.transportWeight = 1; // default all same
		this.detailsWeight = 1; // default all same

		// details
		this.ui = new mw.UploadWizardUploadInterface( this, filesDiv )
			.connect( this, {
				'file-changed': [ 'emit', 'file-changed', upload ],
				'filename-accepted': [ 'emit', 'filename-accepted' ],
				'show-preview': 'makePreview'
			} )

			.on( 'upload-filled', function () {
				upload.details = new mw.UploadWizardDetails( upload, $( '#mwe-upwiz-macro-files' ) );

				upload.emit( 'filled' );
			} );
	}

	oo.mixinClass( UploadWizardUpload, oo.EventEmitter );

	UWUP = UploadWizardUpload.prototype;

	// Upload handler
	UWUP.uploadHandler = null;

	// increments with each upload
	UWUP.count = 0;

	/**
	 * Manually fill the file input with a file.
	 * @param {File} providedFile
	 */
	UWUP.fill = function ( providedFile ) {
		// check to see if the File is being uplaoded from a 3rd party URL.
		if ( providedFile ) {
			this.providedFile = providedFile;

			if ( providedFile.fromURL ) {
				this.fromURL = true;
			}

			this.ui.fill( providedFile );
		}
	};

	UWUP.acceptDeed = function () {
		this.deed.applyDeed( this );
	};

	/**
	 * Reset file input.
	 */
	UWUP.resetFileInput = function () {
		this.ui.resetFileInput();
	};

	/**
	 * start
	 * @return {jQuery.Promise}
	 */
	UWUP.start = function () {
		this.setTransportProgress(0.0);
		//this.ui.start();

		// handler -- usually ApiUploadHandler
		this.handler = this.getUploadHandler();
		return this.handler.start();
	};

	/**
	 *  remove this upload. n.b. we trigger a removeUpload this is usually triggered from
	 */
	UWUP.remove = function () {
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
		// we signal to the wizard to update itself, which has to delete the
		// final vestige of this upload
		this.emit( 'remove-upload' );
	};

	/**
	 * Wear our current progress, for observing processes to see
	 * @param fraction
	 */
	UWUP.setTransportProgress = function ( fraction ) {
		if ( this.state === 'aborted' ) {
			// We shouldn't be transporting anything anymore.
			return;
		}
		this.state = 'transporting';
		this.transportProgress = fraction;
		$( this.ui.div ).trigger( 'transportProgressEvent' );
	};

	/**
	 * Stop the upload -- we have failed for some reason
	 */
	UWUP.setError = function ( code, info ) {
		if ( this.state === 'aborted' ) {
			// There's no point in reporting an error anymore.
			return;
		}
		this.state = 'error';
		this.transportProgress = 0;
		this.ui.showError( code, info );
		this.emit( 'error', code, info );
	};

	/**
	 * Resume the upload, assume that whatever error(s) we got were benign.
	 */
	UWUP.removeErrors = function ( code ) {
		this.ignoreWarning[code] = true;
		this.start();
	};

	/**
	 * To be executed when an individual upload finishes. Processes the result and updates step 2's details
	 * @param result	the API result in parsed JSON form
	 */
	UWUP.setTransported = function ( result ) {
		if ( this.state === 'aborted' ) {
			return;
		}

		function rmErrs( theCode ) {
			upload.removeErrors( theCode );
		}

		// default error state
		var comma, warnCode, $override,
			upload = this,
			code = 'unknown',
			info = 'unknown';

		if ( result.error ) {
			// If there was an error, we can't really do anything else, so let's get out while we can.
			if ( result.error.code ) {
				code = result.error.code;
			}
			if ( code === 'filetype-banned' && result.error.blacklisted ) {
				code = 'filetype-banned-type';
				comma = mw.message( 'comma-separator' ).escaped();
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
						this.setError( warnCode, this.duplicateErrorInfo( warnCode, result.upload.warnings[warnCode] ) );
						break;
					case 'duplicate-archive':
						// This is the case where the file did exist, but it was deleted.
						// We should definitely tell the user, but let them override.
						// If they already have, then don't execute any of this.
						code = warnCode;
						this.setError( warnCode, this.duplicateErrorInfo( warnCode, result.upload.warnings[warnCode] ) );
						$override = $( '<a></a>' )
							/*jshint scripturl:true*/
							.attr( 'href', 'javascript:void(0)' )
							.text( mw.message( 'mwe-upwiz-override' ).text() )
							.click( rmErrs );
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
							info = warnCode + mw.message( 'colon-separator' ).escaped() + result.upload.warnings[warnCode];
						} else {
							info = result.upload.warnings[warnCode];
						}
						this.setError( code, info );
						break;
				}
			}
		}

		if ( this.state !== 'error' ) {
			if ( result.upload && result.upload.result === 'Success' ) {
				if ( result.upload.imageinfo ) {
					this.setSuccess( result );
				} else {
					this.setError( 'noimageinfo', info );
				}
			} else if ( result.upload && result.upload.result === 'Warning' ) {
				throw new Error( 'Your browser got back a Warning result from the server. Please file a bug.' );
			} else {
				this.setError( code, info );
			}
		}
	};

	/**
	 * Helper function to generate duplicate errors with dialog box. Works with existing duplicates and deleted dupes.
	 * @param {String} error code, should have matching strings in .i18n.php
	 * @param {Object} portion of the API error result listing duplicates
	 */
	UWUP.duplicateErrorInfo = function ( code, resultDuplicate ) {
		function dialogFn(e) {
			$( '<div></div>' )
				.html( $ul )
				.dialog( {
					width: 500,
					zIndex: 200000,
					autoOpen: true,
					title: mw.message( 'api-error-' + code + '-popup-title', duplicates.length ).escaped(),
					modal: true
				} );
			e.preventDefault();
		}

		var duplicates,
			$ul = $( '<ul>' );

		if ( typeof resultDuplicate === 'object' ) {
			duplicates = resultDuplicate;
		} else if ( typeof resultDuplicate === 'string' ) {
			duplicates = [ resultDuplicate ];
		}

		$.each( duplicates, function ( i, filename ) {
			var href,
				$a = $( '<a/>' ).append( filename );

			try {
				href = new mw.Title( filename, fileNsId ).getUrl();
				$a.attr( { href:href, target:'_blank' } );
			} catch ( e ) {
				$a.click( function () { window.alert('could not parse filename=' + filename ); } );
				$a.attr( 'href', '#' );
			}
			$ul.append( $( '<li></li>' ).append( $a ) );
		} );

		return [ duplicates.length, dialogFn ];
	};

	/**
	 * Called from any upload success condition
	 * @param {Mixed} result -- result of AJAX call
	 */
	UWUP.setSuccess = function ( result ) {
		this.state = 'transported';
		this.transportProgress = 1;

		this.ui.setStatus( 'mwe-upwiz-getting-metadata' );

		if ( result.upload ) {
			this.extractUploadInfo( result.upload );
			this.state = 'stashed';
			this.ui.showStashed();
			$.publishReady( 'thumbnails.' + this.index, 'api' );
			// check all uploads, if they're complete, show the next button
			//this.wizard.showNext( 'file', 'stashed' ); See bug 39852
		} else {
			this.setError( 'noimageinfo' );
		}
	};

	/**
	 * Get the basename of a path.
	 * For error conditions, returns the empty string.
	 *
	 * @param {string} path
	 * @return {string} basename
	 */
	UWUP.getBasename = function ( path ) {
		if ( path === undefined || path === null ) {
			return '';
		}

		// find index of last path separator in the path, add 1. (If no separator found, yields 0)
		// then take the entire string after that.
		return path.substr( Math.max( path.lastIndexOf( '/' ), path.lastIndexOf( '\\' ) ) + 1 );
	};

	/**
	 * Shows a filename error in the UI.
	 * @param {string} code Short code for i18n strings
	 * @param {string} info More information
	 */
	UWUP.fileNameErr = function ( code, info ) {
		this.hasError = true;
		this.ui.fileChangedError( code, info );
	};

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
	 * @param {function ()} callback when ok, and upload object is ready
	 */
	UWUP.checkFile = function ( filename, files, fileNameOk ) {
		var totalSize, duplicate, extension, toobig,
			actualMaxSize, binReader,
			upload = this,

			// Check if filename is acceptable
			// TODO sanitize filename
			basename = this.getBasename( filename );

		function finishCallback() {
			if ( upload && upload.ui ) {
				fileNameOk();
			} else {
				setTimeout( finishCallback, 200 );
			}
		}

		// Eternal optimism
		this.hasError = false;

		if ( files.length > 1 ) {
			totalSize = 0;
			$.each( files, function ( i, file ) {
				totalSize += file.size;
			});

			toobig = totalSize > 10000000;

			// Local previews are slow due to the data URI insertion into the DOM; for batches we
			// don't generate them if the size of the batch exceeds 10 MB
			if ( toobig ) {
				this.disablePreview();
			}
		}

		// check to see if the file has already been selected for upload.
		duplicate = false;
		$.each( this.wizard.uploads, function ( i, thisupload ) {
			if ( thisupload !== undefined && upload !== thisupload && filename === thisupload.filename ) {
				duplicate = true;
				return false;
			}
		} );

		if ( duplicate ) {
			this.fileNameErr( 'dup', basename );
		}

		this.setTitle( basename );

		// Check if extension is acceptable
		extension = this.title.getExtension();
		if ( mw.isEmpty( extension ) ) {
			this.fileNameErr( 'noext', null );
		} else {
			if ( $.inArray( extension.toLowerCase(), mw.UploadWizard.config.fileExtensions ) === -1 ) {
				this.fileNameErr( 'ext', extension );
			} else {
				// Split this into a separate case, if the error above got ignored,
				// we want to still trudge forward.
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
					if ( !this.fromURL ) {
						this.transportWeight = this.file.size;
						if ( this.transportWeight > actualMaxSize ) {
							this.showMaxSizeWarning( this.transportWeight, actualMaxSize );
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

					if ( this.file.type === 'image/jpeg' ) {
						binReader = new FileReader();
						binReader.onload = function () {
							var binStr, arr, i, meta;
							if ( typeof binReader.result === 'string' ) {
								binStr = binReader.result;
							} else {
								// Array buffer; convert to binary string for the library.
								arr = new Uint8Array( binReader.result );
								binStr = '';
								for ( i = 0; i < arr.byteLength; i++ ) {
									binStr += String.fromCharCode( arr[i] );
								}
							}
							try {
								meta = mw.libs.jpegmeta( binStr, upload.file.fileName );
								meta._binary_data = null;
							} catch ( e ) {
								meta = null;
							}
							upload.extractMetadataFromJpegMeta( meta );
							upload.filename = filename;
							if ( upload.hasError === false ) {
								finishCallback();
							}
						};
						if ( 'readAsBinaryString' in binReader ) {
							binReader.readAsBinaryString( upload.file );
						} else if ( 'readAsArrayBuffer' in binReader ) {
							binReader.readAsArrayBuffer( upload.file );
						} else {
							// We should never get here. :P
							throw new Error( 'Cannot read thumbnail as binary string or array buffer.' );
						}
					} else {
						if ( this.hasError === false ) {
							finishCallback();
						}
					}

					// Now that first file has been prepared, process remaining files
					// in case of a multi-file upload.
					this.emit( 'extra-files', files.slice( 1 ), toobig );
				} else {
					this.filename = filename;
					if ( this.hasError === false ) {
						finishCallback();
					}
				}
			}
		}
	};

	/**
	 * Sanitize and set the title of the upload.
	 * @param {string} title Unsanitized title.
	 */
	UWUP.setTitle = function ( title ) {
		try {
			this.title = mw.Title.newFromFileName( mw.UploadWizard.sanitizeFilename( title ) );
		} catch ( e ) {
			this.fileNameErr( 'unparseable', null );
		}
	};

	/**
	 * Disable preview thumbnail for this upload.
	 */
	UWUP.disablePreview = function () {
		this.generatePreview = false;
	};

	/**
	 * Shows an error dialog informing the user that the selected file is to large
	 * @param size integer - the size of the file in bytes
	 * @param maxSize integer - the maximum file size
	 */
	UWUP.showMaxSizeWarning = function ( size, maxSize ) {
		var buttons = [
			{
				text: mw.message( 'mwe-upwiz-file-too-large-ok' ).escaped(),
				click: function () {
					$( this ).dialog( 'close' );
				}
			}
		];
		$( '<div></div>' )
			.msg(
				'mwe-upwiz-file-too-large-text',
				mw.units.bytes( maxSize ),
				mw.units.bytes( size )
			)
			.dialog( {
				width: 500,
				zIndex: 200000,
				autoOpen: true,
				title: mw.message( 'mwe-upwiz-file-too-large' ).escaped(),
				modal: true,
				buttons: buttons
			} );
	};

	/**
	 * Map fields from jpegmeta's metadata return into our format (which is more like the imageinfo returned from the API
	 * @param {Object} (as returned by jpegmeta)
	 */
	UWUP.extractMetadataFromJpegMeta = function ( meta ) {
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
				var pixelHeightDim = 'height',
					pixelWidthDim = 'width',
					// this must be called after orientation is set above. If no orientation set, defaults to 0
					degrees = this.getOrientationDegrees();

				// jpegmeta reports pixelHeight & width
				if ( degrees === 90 || degrees === 270 ) {
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
	};

	/**
	 * Accept the result from a successful API upload transport, and fill our own info
	 *
	 * @param result The JSON object from a successful API upload result.
	 */
	UWUP.extractUploadInfo = function ( resultUpload ) {
		if ( resultUpload.filekey ) {
			this.fileKey = resultUpload.filekey;
		}

		if ( resultUpload.imageinfo ) {
			this.extractImageInfo( resultUpload.imageinfo );
		} else if ( resultUpload.stashimageinfo ) {
			this.extractImageInfo( resultUpload.stashimageinfo );
		}

	};

	/**
	 * Extract image info into our upload object
	 * Image info is obtained from various different API methods
	 * This may overwrite metadata obtained from FileReader.
	 * @param imageinfo JSON object obtained from API result.
	 */
	UWUP.extractImageInfo = function ( imageinfo ) {
		var key,
			upload = this;

		function setMetadata( i, pair ) {
			if ( pair !== undefined ) {
				upload.imageinfo.metadata[pair.name.toLowerCase()] = pair.value;
			}
		}

		for ( key in imageinfo ) {
			// we get metadata as list of key-val pairs; convert to object for easier lookup. Assuming that EXIF fields are unique.
			if ( key === 'metadata' ) {
				if ( this.imageinfo.metadata === undefined ) {
					this.imageinfo.metadata = {};
				}
				if ( imageinfo.metadata && imageinfo.metadata.length ) {
					$.each( imageinfo.metadata, setMetadata );
				}
			} else {
				this.imageinfo[key] = imageinfo[key];
			}
		}
	};

	/**
	 * Get information about stashed images
	 * See API documentation for prop=stashimageinfo for what 'props' can contain
	 * @param {Function} callback -- called with null if failure, with imageinfo data structure if success
	 * @param {Array} properties to extract
	 * @param {Number} optional, width of thumbnail. Will force 'url' to be added to props
	 * @param {Number} optional, height of thumbnail. Will force 'url' to be added to props
	 */
	UWUP.getStashImageInfo = function ( callback, props, width, height ) {
		var params = {
			prop: 'stashimageinfo',
			siifilekey: this.fileKey,
			siiprop: props.join( '|' )
		};

		function ok( data ) {
			if ( !data || !data.query || !data.query.stashimageinfo ) {
				mw.log.warn( 'mw.UploadWizardUpload::getStashImageInfo> No data? ' );
				callback( null );
				return;
			}
			callback( data.query.stashimageinfo );
		}

		function err( code ) {
			mw.log.warn( 'mw.UploadWizardUpload::getStashImageInfo> ' + code );
			callback( null );
		}

		if ( props === undefined ) {
			props = [];
		}

		if ( width !== undefined || height !== undefined ) {
			if ( !$.inArray( 'url', props ) ) {
				props.push( 'url' );
			}
			if ( width !== undefined ) {
				params.siiurlwidth = width;
			}
			if ( height !== undefined ) {
				params.siiurlheight = height;
			}
		}

		this.api.get( params ).done( ok ).fail( err );
	};

	/**
	 * Get information about published images
	 * (There is some overlap with getStashedImageInfo, but it's different at every stage so it's clearer to have separate functions)
	 * See API documentation for prop=imageinfo for what 'props' can contain
	 * @param {Function} callback -- called with null if failure, with imageinfo data structure if success
	 * @param {Array} properties to extract
	 * @param {Number} optional, width of thumbnail. Will force 'url' to be added to props
	 * @param {Number} optional, height of thumbnail. Will force 'url' to be added to props
	 */
	UWUP.getImageInfo = function ( callback, props, width, height ) {
		function ok( data ) {
			if ( data && data.query && data.query.pages ) {
				var found = false;
				$.each( data.query.pages, function ( pageId, page ) {
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

			mw.log.warn( 'mw.UploadWizardUpload::getImageInfo> No data matching ' + requestedTitle + ' ? ');
			callback( null );
		}

		function err( code ) {
			mw.log.warn( 'mw.UploadWizardUpload::getImageInfo> ' + code );
			callback( null );
		}

		if ( props === undefined ) {
			props = [];
		}

		var requestedTitle = this.title.getPrefixedText(),
			params = {
				prop:'imageinfo',
				titles:requestedTitle,
				iiprop:props.join( '|' )
			};

		if ( width !== undefined || height !== undefined ) {
			if ( !$.inArray( 'url', props ) ) {
				props.push( 'url' );
			}
			if ( width !== undefined ) {
				params.iiurlwidth = width;
			}
			if ( height !== undefined ) {
				params.iiurlheight = height;
			}
		}

		this.api.get( params ).done( ok ).fail( err );
	};

	/**
	 * Get the upload handler per browser capabilities
	 * @return upload handler object
	 */
	UWUP.getUploadHandler = function () {
		if ( !this.uploadHandler ) {
			var constructor;  // must be the name of a function in 'mw' namespace
			if ( mw.UploadWizard.config.enableFirefogg && mw.Firefogg.isInstalled() ) {
				constructor = 'FirefoggHandler';
			} else if ( mw.UploadWizard.config.enableFormData && mw.fileApi.isAvailable() && mw.fileApi.isFormDataAvailable()) {
				constructor = 'ApiUploadFormDataHandler';
			} else {
				constructor = 'ApiUploadHandler';
			}
			if ( mw.UploadWizard.config.debug ) {
				mw.log( 'mw.UploadWizard::getUploadHandler> ' + constructor );
			}
			if ( this.fromURL ) {
				constructor = 'ApiUploadPostHandler';
			}
			this.uploadHandler = new mw[constructor]( this, this.api );
		}
		return this.uploadHandler;
	};

	/**
	 * Explicitly fetch a thumbnail for a stashed upload of the desired width.
	 * Publishes to any event listeners that might have wanted it.
	 *
	 * @param width - desired width of thumbnail (height will scale to match)
	 * @param height - (optional) maximum height of thumbnail
	 */
	UWUP.getAndPublishApiThumbnail = function ( key, width, height ) {
		function thumbnailPublisher( thumbnails ) {
			if ( thumbnails === null ) {
				// the api call failed somehow, no thumbnail data.
				$.publishReady( key, null );
			} else {
				// ok, the api callback has returned us information on where the thumbnail(s) ARE, but that doesn't mean
				// they are actually there yet. Keep trying to set the source ( which should trigger "error" or "load" event )
				// on the image. If it loads publish the event with the image. If it errors out too many times, give up and publish
				// the event with a null.
				$.each( thumbnails, function ( i, thumb ) {
					if ( thumb.thumberror || ( !( thumb.thumburl && thumb.thumbwidth && thumb.thumbheight ) ) ) {
						mw.log.warn( 'mw.UploadWizardUpload::getThumbnail> Thumbnail error or missing information' );
						$.publishReady( key, null );
						return;
					}

					// try to load this image with exponential backoff
					// if the delay goes past 8 seconds, it gives up and publishes the event with null
					var timeoutMs = 100,
						image = document.createElement( 'img' );
					image.width = thumb.thumbwidth;
					image.height = thumb.thumbheight;
					$( image )
						.on( 'load', function () {
							// cache this thumbnail
							upload.thumbnails[key] = image;
							// publish the image to anyone who wanted it
							$.publishReady( key, image );
						} )
						.on( 'error', function () {
							// retry with exponential backoff
							if ( timeoutMs < 8000 ) {
								setTimeout( function () {
									timeoutMs = timeoutMs * 2 + Math.round( Math.random() * ( timeoutMs / 10 ) );
									setSrc();
								}, timeoutMs );
							} else {
								$.publishReady( key, null );
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
		}

		var upload = this;

		if ( mw.isEmpty( height ) ) {
			height = -1;
		}

		if ( this.thumbnailPublishers[key] === undefined ) {
			this.thumbnailPublishers[key] = thumbnailPublisher;
			if ( this.state !== 'complete' ) {
				this.getStashImageInfo( thumbnailPublisher, [ 'url' ], width, height );
			} else {
				this.getImageInfo( thumbnailPublisher, [ 'url' ], width, height );
			}

		}
	};

	/**
	 * Return the orientation of the image in degrees. Relies on metadata that
	 * may have been extracted at filereader stage, or after the upload when we fetch metadata. Default returns 0.
	 * @return {Integer} orientation in degrees: 0, 90, 180 or 270
	 */
	UWUP.getOrientationDegrees = function () {
		var orientation = 0;
		if ( this.imageinfo && this.imageinfo.metadata && this.imageinfo.metadata.orientation ) {
			switch ( this.imageinfo.metadata.orientation ) {
				case 8:
					// 'top left' -> 'left bottom'
					orientation = 90;
					break;
				case 3:
					// 'top left' -> 'bottom right'
					orientation = 180;
					break;
				case 6:
					// 'top left' -> 'right top'
					orientation = 270;
					break;
				default:
					// 'top left' -> 'top left'
					orientation = 0;
					break;

			}
		}
		return orientation;
	};

	/**
	 * Fit an image into width & height constraints with scaling factor
	 * @param {HTMLImageElement}
	 * @param {Object} with width & height properties
	 * @return {Number}
	 */
	UWUP.getScalingFromConstraints = function ( image, constraints ) {
		var scaling = 1;
		$.each( [ 'width', 'height' ], function ( i, dim ) {
			if ( constraints[dim] && image[dim] > constraints[dim] ) {
				var s = constraints[dim] / image[dim];
				if ( s < scaling ) {
					scaling = s;
				}
			}
		} );
		return scaling;
	};

	/**
	 * Given an image (already loaded), dimension constraints
	 * return canvas object scaled & transformedi ( & rotated if metadata indicates it's needed )
	 * @param {HTMLImageElement}
	 * @param {Object} containing width & height constraints
	 * @return {HTMLCanvasElement}
	 */
	UWUP.getTransformedCanvasElement = function ( image, constraints ) {
		var angle, scaleConstraints, scaling, width, height,
			dx, dy, x, y, $canvas, ctx,
			rotation = 0;

		// if this wiki can rotate images to match their EXIF metadata,
		// we should do the same in our preview
		if ( mw.config.get( 'wgFileCanRotate' ) ) {
			angle = this.getOrientationDegrees();
			rotation = angle ? 360 - angle : 0;
		}

		// swap scaling constraints if needed by rotation...
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

		scaling = this.getScalingFromConstraints( image, constraints );

		width = image.width * scaling;
		height = image.height * scaling;

		// Determine the offset required to center the image
		dx = (constraints.width - width) / 2;
		dy = (constraints.height - height) / 2;

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
			default:
				x = dx;
				y = dy;
				break;
		}

		$canvas = $( '<canvas></canvas>' ).attr( constraints );
		ctx = $canvas[0].getContext( '2d' );
		ctx.clearRect( 0, 0, width, height );
		ctx.rotate( rotation / 180 * Math.PI );
		ctx.drawImage( image, x, y, width, height );

		return $canvas;
	};

	/**
	 * Return a browser-scaled image element, given an image and constraints.
	 * @param {HTMLImageElement}
	 * @param {Object} with width and height properties
	 * @return {HTMLImageElement} with same src, but different attrs
	 */
	UWUP.getBrowserScaledImageElement = function ( image, constraints ) {
		var scaling = this.getScalingFromConstraints( image, constraints );
		return $( '<img/>' )
			.attr( {
				width:  parseInt( image.width * scaling, 10 ),
				height: parseInt( image.height * scaling, 10 ),
				src:	image.src
			} )
			.css( {
				'margin-top': ( parseInt( ( constraints.height - image.height * scaling ) / 2, 10 ) ).toString() + 'px'
			} );
	};

	/**
	 * Return an element suitable for the preview of a certain size. Uses canvas when possible
	 * @param {HTMLImageElement}
	 * @param {Integer} width
	 * @param {Integer} height
	 * @return {HTMLCanvasElement|HTMLImageElement}
	 */
	UWUP.getScaledImageElement = function ( image, width, height ) {
		if ( width === undefined || width === null || width <= 0 ) {
			width = mw.UploadWizard.config.thumbnailWidth;
		}
		var constraints = {
			width: parseInt( width, 10 ),
			height: ( height === undefined ? null : parseInt( height, 10 ) )
		};

		return mw.canvas.isAvailable() ? this.getTransformedCanvasElement( image, constraints )
							: this.getBrowserScaledImageElement( image, constraints );
	};

	/**
	 * Given a jQuery selector, subscribe to the "ready" event that fills the thumbnail
	 * This will trigger if the thumbnail is added in the future or if it already has been
	 *
	 * @param selector
	 * @param width  Width constraint
	 * @param height Height constraint (optional)
	 * @param boolean add lightbox large preview when ready
	 */
	UWUP.setThumbnail = function ( selector, width, height, isLightBox ) {
		var upload = this,
			placed = false;

		/**
		 * This callback will add an image to the selector, using in-browser scaling if necessary
		 * @param {HTMLImageElement}
		 */
		function placeImageCallback( image ) {
			var elm;

			if ( image === null ) {
				$( selector ).addClass( 'mwe-upwiz-file-preview-broken' );
				upload.ui.setStatus( 'mwe-upwiz-thumbnail-failed' );
				return;
			}

			elm = upload.getScaledImageElement( image, width, height );
			// add the image to the DOM, finally
			$( selector )
				.css( { background: 'none' } )
				.html(
					$( '<a/></a>' )
						.addClass( 'mwe-upwiz-thumbnail-link' )
						.append( elm )
				);
			placed = true;
		}

		// Listen for even which says some kind of thumbnail is available.
		// The argument is an either an ImageHtmlElement ( if we could get the thumbnail locally ) or the string 'api' indicating you
		// now need to get the scaled thumbnail via the API
		$.subscribeReady(
			'thumbnails.' + this.index,
			function ( x ) {
				if ( isLightBox ) {
					upload.setLightBox( selector );
				}
				if ( !placed ) {
					if ( x === 'api' ) {
						// get the thumbnail via API. This also works with an async pub/sub model; if this thumbnail was already
						// fetched for some reason, we'll get it immediately
						var key = 'apiThumbnail.' + upload.index + ',width=' + width + ',height=' + height;
						$.subscribeReady( key, placeImageCallback );
						upload.getAndPublishApiThumbnail( key, width, height );
					} else if ( x instanceof HTMLImageElement ) {
						placeImageCallback( x );
					} else {
						// something else went wrong, place broken image
						mw.log.warn( 'Unexpected argument to thumbnails event: ' + x );
						placeImageCallback( null );
					}
				}
			}
		);
	};

	/**
	 * set up lightbox behavior for non-complete thumbnails
	 * TODO center this
	 * @param selector
	 */
	UWUP.setLightBox = function ( selector ) {
		var upload = this,
			$imgDiv = $( '<div></div>' ).css( 'text-align', 'center' );

		$( selector )
			.addClass( 'mwe-upwiz-lightbox-link' )
			.click( function () {
				// get large preview image
				// open large preview in modal dialog box
				$( '<div class="mwe-upwiz-lightbox"></div>' )
					.append( $imgDiv )
					.dialog( {
						minWidth:mw.UploadWizard.config.largeThumbnailWidth,
						minHeight:mw.UploadWizard.config.largeThumbnailMaxHeight,
						autoOpen:true,
						title:mw.message( 'mwe-upwiz-image-preview' ).escaped(),
						modal:true,
						resizable:false
					} );
				upload.setThumbnail(
					$imgDiv,
					mw.UploadWizard.config.largeThumbnailWidth,
					mw.UploadWizard.config.largeThumbnailMaxHeight,
					false /* obviously the largeThumbnail doesn't have a lightbox itself! */
				);
				return false;
			} ); // close thumbnail click function
	};

	UWUP.createDetails = function () {
		this.details = new mw.UploadWizardDetails( this, $( '#mwe-upwiz-macro-files' ) );
		this.details.populate();
		this.details.attach();
	};

	/**
	 * Notification that the file input has changed and it's fine...set info.
	 */
	UWUP.fileChangedOk = function () {
		this.ui.fileChangedOk( this.imageinfo, this.file, this.fromURL );

		if ( this.generatePreview ) {
			this.makePreview();
		} else {
			this.ui.makeShowThumbCtrl();
		}
	};

	/**
	 * Make a preview for the file.
	 */
	UWUP.makePreview = function () {
		var first, video, url, dataUrlReader,
			upload = this;

		// don't run this repeatedly.
		if ( this.previewLoaded ) {
			return;
		}

		// do preview if we can
		if ( this.isPreviewable() ) {
			// open video and get frame via canvas
			if ( this.isVideo() ) {
				first = true;
				video = document.createElement( 'video' );

				video.addEventListener('loadedmetadata', function () {
					//seek 2 seconds into video or to half if shorter
					video.currentTime = Math.min( 2, video.duration / 2 );
					video.volume = 0;
				});
				video.addEventListener('seeked', function () {
					// Firefox 16 sometimes does not work on first seek, seek again
					if ( first ) {
						first = false;
						video.currentTime = Math.min( 2, video.duration / 2 );

					} else {
						// Chrome sometimes shows black frames if grabbing right away.
						// wait 500ms before grabbing frame
						setTimeout(function () {
							var context,
								canvas = document.createElement( 'canvas' );
							canvas.width = 100;
							canvas.height = Math.round( canvas.width * video.videoHeight / video.videoWidth );
							context = canvas.getContext( '2d' );
							context.drawImage( video, 0, 0, canvas.width, canvas.height );
							upload.loadImage( canvas.toDataURL() );
							upload.URL().revokeObjectURL( video.url );
						}, 500);
					}
				});
				url = this.URL().createObjectURL( this.file );
				video.src = url;
			} else {
				dataUrlReader = new FileReader();
				dataUrlReader.onload = function () {
					// this step (inserting image-as-dataurl into image object) is slow for large images, which
					// is why this is optional and has a control attached to it to load the preview.
					upload.loadImage( dataUrlReader.result );
				};
				dataUrlReader.readAsDataURL( this.file );
			}
		}
	};

	/**
	 * Loads an image preview.
	 */
	UWUP.loadImage = function ( url ) {
		var image = document.createElement( 'img' ),
			upload = this;
		image.onload = function () {
			$.publishReady( 'thumbnails.' + upload.index, image );
			upload.previewLoaded = true;
		};
		image.src = url;
		this.thumbnails['*'] = image;
	};

	/**
	 * Check if the file is previewable.
	 */
	UWUP.isPreviewable = function () {
		return mw.fileApi.isAvailable() && this.file && mw.fileApi.isPreviewableFile( this.file );
	};

	/**
	 * Finds the right URL object to use.
	 */
	UWUP.URL = function () {
		return window.URL || window.webkitURL || window.mozURL;
	};

	/**
	 * Checks if this upload is a video.
	 */
	UWUP.isVideo = function () {
		return mw.fileApi.isAvailable() && mw.fileApi.isPreviewableVideo( this.file );
	};

	mw.UploadWizardUpload = UploadWizardUpload;
} )( mediaWiki, jQuery, OO );
