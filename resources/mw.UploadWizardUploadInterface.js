/**
 * Create an interface fragment corresponding to a file input, suitable for Upload Wizard.
 * @param upload
 * @param div to insert file interface
 * @param providedFile a File object that this ui component should use (optional)
 */
( function( mw, $ ) {

mw.UploadWizardUploadInterface = function( upload, filesDiv, providedFile ) {
	var _this = this;

	_this.upload = upload;

	_this.providedFile = providedFile;

	// may need to collaborate with the particular upload type sometimes
	// for the interface, as well as the uploadwizard. OY.
	_this.div = $('<div class="mwe-upwiz-file"></div>').get(0);
	_this.isFilled = false;

	_this.previewLoaded = false;

	_this.$fileInputCtrl = $( '<input size="1" class="mwe-upwiz-file-input" name="file" type="file"/>' );
	if (mw.UploadWizard.config.enableFormData && mw.fileApi.isFormDataAvailable() &&
		mw.UploadWizard.config.enableMultiFileSelect && mw.UploadWizard.config.enableMultipleFiles ) {
		// Multiple uploads requires the FormData transport
		_this.$fileInputCtrl.attr( 'multiple', '1' );
	}

	_this.initFileInputCtrl();

	_this.$indicator = $( '<div class="mwe-upwiz-file-indicator"></div>' );

	_this.visibleFilenameDiv = $('<div class="mwe-upwiz-visible-file"></div>')
		.append( _this.$indicator )
		.append(
			'<div class="mwe-upwiz-visible-file-filename">' +
				'<div class="mwe-upwiz-file-preview"/>' +
					'<div class="mwe-upwiz-file-texts">' +
						'<div class="mwe-upwiz-visible-file-filename-text"/>' +
						'<div class="mwe-upwiz-file-status-line">' +
							'<div class="mwe-upwiz-file-status mwe-upwiz-file-status-line-item"></div>' +
						'</div>' +
					'</div>' +
				'</div>'
		);

	_this.$removeCtrl = $.fn.removeCtrl(
		'mwe-upwiz-remove',
		'mwe-upwiz-remove-upload',
		function() {
			_this.upload.remove();
			_this.cancelPositionTracking();
		}
	).addClass( "mwe-upwiz-file-status-line-item" );

	_this.visibleFilenameDiv.find( '.mwe-upwiz-file-status-line' )
		.append( _this.$removeCtrl );

	// Add show thumbnail control

	//_this.errorDiv = $('<div class="mwe-upwiz-upload-error mwe-upwiz-file-indicator" style="display: none;"></div>').get(0);

	_this.filenameCtrl = $('<input type="hidden" name="filename" value=""/>').get(0);

	// this file Ctrl container is placed over other interface elements, intercepts clicks and gives them to the file input control.
	// however, we want to pass hover events to interface elements that we are over, hence the bindings.
	// n.b. not using toggleClass because it often gets this event wrong -- relies on previous state to know what to do
	_this.fileCtrlContainer = $('<div class="mwe-upwiz-file-ctrl-container">');
/*
					.bind( 'mouseenter', function(e) { _this.addFileCtrlHover(e); } )
					.bind( 'mouseleave', function(e) { _this.removeFileCtrlHover(e); } );
*/


	// the css trickery (along with css)
	// here creates a giant size file input control which is contained within a div and then
	// clipped for overflow. The effect is that we have a div (ctrl-container) we can position anywhere
	// which works as a file input. It will be set to opacity:0 and then we can do whatever we want with
	// interface "below".
	// XXX caution -- if the add file input changes size we won't match, unless we add some sort of event to catch this.
	_this.form = $( '<form method="POST" encType="multipart/form-data" class="mwe-upwiz-form"></form>' )
			.attr( { action: _this.upload.api.defaults.ajax.url } )
			.append( _this.visibleFilenameDiv )
			.append( _this.fileCtrlContainer )
			.append( _this.filenameCtrl )
			.get( 0 );

	if ( $( '<input type="file">' ).attr( 'disabled' ) ) {
		$( '#mwe-upwiz-stepdiv-file' ).replaceWith(
			$( '<span/>' )
			.addClass( 'mwe-error' )
			.msg( 'mwe-upwiz-file-upload-notcapable' )
		);
		$( '#mwe-upwiz-add-file' ).hide();
		return;
	}

	if ( !_this.upload.fromURL ) {
		$( _this.fileCtrlContainer ).append( _this.$fileInputCtrl );
	}
	$( _this.div ).append( _this.form );

	// XXX evil hardcoded
	// we don't really need filesdiv if we do it this way?
	$( filesDiv ).append( _this.div );

	// _this.progressBar = ( no progress bar for individual uploads yet )
	// we bind to the ui div since unbind doesn't work for non-DOM objects
	$( _this.div ).bind( 'transportProgressEvent', function(e) { _this.showTransportProgress(); } );
	// $( _this.div ).bind( 'transportedEvent', function(e) { _this.showStashed(); } );

	// XXX feature envy
	var $preview = $( this.div ).find( '.mwe-upwiz-file-preview' );
	_this.upload.setThumbnail(
		$preview,
		mw.UploadWizard.config.thumbnailWidth,
		mw.UploadWizard.config.thumbnailMaxHeight,
		true
	);

	if( providedFile ) {
		// if a file is already present, trigger the change event immediately.
		_this.$fileInputCtrl.change();
	}

};


mw.UploadWizardUploadInterface.prototype = {
	/**
	 * Things to do to this interface once we start uploading
	 */
	start: function() {
		var _this = this;
		// remove hovering
		$( _this.div )
			.unbind( 'mouseenter mouseover mouseleave mouseout' );

		// remove delete control
		$( _this.visibleFilenameDiv )
			.find( '.mwe-upwiz-remove-ctrl' )
			.unbind( 'mouseenter mouseover mouseleave mouseout' )
			.remove();

		// remove thumb control
		$( _this.visibleFilenameDiv )
			.find( '.mwe-upwiz-show-thumb-ctrl' )
			.unbind( 'mouseenter mouseover mouseleave mouseout' )
			.remove();
	},

	/**
	 * change the graphic indicator at the far end of the row for this file
	 * @param String statusClass: corresponds to a class mwe-upwiz-status which changes style of indicator.
	 */
	showIndicator: function( statusClass ) {
		this.clearIndicator();
		// add the desired class and make it visible, if it wasn't already.
		this.$indicator.addClass( 'mwe-upwiz-status-' + statusClass ).css( 'visibility', 'visible' );
	},

	/**
	 * Reset the graphic indicator
	 */
	clearIndicator: function() {
		var _this = this;
		$.each( _this.$indicator.attr( 'class' ).split( /\s+/ ), function( i, className ) {
			if ( className.match( /^mwe-upwiz-status/ ) ) {
				_this.$indicator.removeClass( className );
			}
		} );
	},

	/**
	 * Set the preview image on the file page for this upload.
	 * @param HTMLImageElement
	 */
	setPreview: function( image ) {
		var $preview = $( this.div ).find( '.mwe-upwiz-file-preview' );
		if ( image === null ) {
			$preview.addClass( 'mwe-upwiz-file-preview-broken' );
		} else {
			// encoding for url here?
			$preview.css( 'background-image', 'url(' + image.src + ')' );
		}
	},

	/**
	 * Set the status line for this upload with an internationalized message string.
	 * @param String msgKey: key for the message
	 * @param Array args: array of values, in case any need to be fed to the image.
	 */
	setStatus: function( msgKey, args ) {
		if ( args === undefined ) {
			args = [];
		}
		// get the status line for our upload
		var $s = $( this.div ).find( '.mwe-upwiz-file-status' );
		$s.msg( msgKey, args ).show();
	},

	/**
	 * Set status line directly with a string
	 * @param {String}
	 */
	setStatusString: function( s ) {
		$( this.div ).find( '.mwe-upwiz-file-status' ).html( s ).show();
	},

	/**
	 * Clear the status line for this upload (hide it, in case there are paddings and such which offset other things.)
	 */
	clearStatus: function() {
		$( this.div ).find( '.mwe-upwiz-file-status' ).hide();
	},

	/**
	 * Put the visual state of an individual upload into "progress"
	 * @param fraction	The fraction of progress. Float between 0 and 1
	 */
	showTransportProgress: function( fraction ) {
		// if fraction available, update individual progress bar / estimates, etc.
		this.showIndicator( 'progress' );
		this.setStatus( 'mwe-upwiz-uploading' );
	},

	/**
	 * Show that upload is transported
	 */
	showStashed: function() {
		if ( mw.UploadWizard.config.startImmediately !== true ) {
			this.$removeCtrl.detach();
		}
		this.$fileInputCtrl.detach();

		if( this.$showThumbCtrl ) {
			this.$showThumbCtrl.detach();
		}

		this.showIndicator( 'stashed' );
		this.setStatus( 'mwe-upwiz-stashed-upload' );
	},

	/**
	 * Show that transport has failed
	 * @param String code: error code from API
	 * @param {String|Object} info: extra info
	 */
	showError: function( code, info ) {
		this.showIndicator( 'error' );
		// is this an error that we expect to have a message for?
		var msgKey, args;

		if ( code === 'http' && info.textStatus === 'timeout' ) {
			code = 'timeout';
		}

		if ( $.inArray( code, mw.Api.errors ) !== -1 ) {
			msgKey = 'api-error-' + code;
			args = $.makeArray( info );
		} else if ( code === 'unknown-warning' ) {
			msgKey = 'api-error-unknown-warning';
			args = $.makeArray( info );
		} else {
			msgKey = 'api-error-unknown-code';
			args = [code].concat( $.makeArray( info ) );
		}
		this.setStatus( msgKey, args );
	},


	initFileInputCtrl: function() {
		var _this = this;
		_this.$fileInputCtrl.change( function() {
			_this.clearErrors();

			_this.upload.checkFile(
				_this.getFilename(),
				_this.getFiles(),
				function() { _this.fileChangedOk(); },
				function( code, info ) { _this.fileChangedError( code, info ); },
				function() { _this.$fileInputCtrl.get(0).value = ''; }
			);
		} );
	},

	/**
	 * Get a list of the files from this file input, defaulting to the value from the input form
	 * @return {Array} of File objects
	 */
	getFiles: function() {
		var files = [];
		if ( mw.fileApi.isAvailable() ) {
			if( this.providedFile && !this.$fileInputCtrl.first().value ) {  // default to the fileinput if it's defined.
				files[0] = this.providedFile;
			} else {
				$.each( this.$fileInputCtrl.get(0).files, function( i, file ) {
					files.push( file );
				} );
			}
		}

		return files;
	},

	/**
	 * Get just the filename.
	 * @return {String}
	 */
	getFilename: function() {
		if( this.providedFile && ! this.$fileInputCtrl.get(0).value ) {  // default to the fileinput if it's defined.
			if( this.providedFile.fileName ) {
				return this.providedFile.fileName;
			} else {
				// this property has a different name in FF vs Chrome.
				return this.providedFile.name;
			}
		} else {
			return this.$fileInputCtrl.get(0).value;
		}
	},

	/**
	 * Run this when the value of the file input has changed and we know it's acceptable -- this
	 * will update interface to show as much info as possible, including preview.
	 * n.b. in older browsers we only will know the filename
	 */
	fileChangedOk: function() {

		var _this = this;
		_this.updateFilename();

		// set the status string - e.g. "256 Kb, 100 x 200"
		var statusItems = [];
		if ( this.upload.imageinfo && this.upload.imageinfo.width && this.upload.imageinfo.height ) {
			statusItems.push( this.upload.imageinfo.width + '\u00d7' + this.upload.imageinfo.height );
		}

		if( this.upload.file && !this.upload.fromURL ){
			statusItems.push( mw.units.bytes( this.upload.file.size ) );
		}

		this.clearStatus();
		this.setStatusString( statusItems.join( ' \u00b7 ' ) );

		if( this.upload.wizard.makePreviewsFlag ) {
			// Make the preview now. Will check if it's a previewable file.
			this.makePreview();
		} else if ( this.isPreviewable() ) {
			// add a control for showing the preview if the user needs it
			this.$showThumbCtrl = $.fn.showThumbCtrl(
					'mwe-upwiz-show-thumb',
					'mwe-upwiz-show-thumb-tip',
					function() { _this.makePreview(); }
				).addClass( "mwe-upwiz-file-status-line-item" );

			this.visibleFilenameDiv.find( '.mwe-upwiz-file-status-line' )
				.append( '<br/>' ).append( _this.$showThumbCtrl );

		}
	},

	URL: function() {
		return window.URL || window.webkitURL || window.mozURL;
	},

	isVideo: function() {
		return mw.fileApi.isAvailable() && mw.fileApi.isPreviewableVideo( this.upload.file );
	},

	isPreviewable: function() {
		return mw.fileApi.isAvailable() && this.upload.file && mw.fileApi.isPreviewableFile( this.upload.file );
	},

	// called once we have an image url
	loadImage: function( url ) {
		var image = document.createElement( 'img' ),
			_this = this;
		image.onload = function () {
			$.publishReady( 'thumbnails.' + _this.upload.index, image );
			_this.previewLoaded = true;
		};
		image.src = url;
		_this.upload.thumbnails['*'] = image;
	},

	makePreview: function() {
		var _this = this;

		// don't run this repeatedly.
		if( _this.previewLoaded ) {
			return;
		}

		// do preview if we can
		if ( _this.isPreviewable() ) {
			// open video and get frame via canvas
			if ( _this.isVideo() ) {
				var first = true;
				var video = document.createElement( 'video' );

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
						setTimeout(function() {
							var canvas = document.createElement( 'canvas' );
							canvas.width = 100;
							canvas.height = Math.round( canvas.width * video.videoHeight / video.videoWidth );
							var context = canvas.getContext( '2d' );
							context.drawImage( video, 0, 0, canvas.width, canvas.height );
							this.loadImage( canvas.toDataURL() );
							_this.URL().revokeObjectURL( video.url );
						}, 500);
					}
				});
				var url = _this.URL().createObjectURL( _this.upload.file );
				video.src = url;
			} else {
				var dataUrlReader = new FileReader();
				dataUrlReader.onload = function() {
					// this step (inserting image-as-dataurl into image object) is slow for large images, which
					// is why this is optional and has a control attached to it to load the preview.
					_this.loadImage( dataUrlReader.result );
				};
				dataUrlReader.readAsDataURL( _this.upload.file );
			}
		}
	},

	fileChangedError: function( code, info ) {
		var filename = this.getFilename();

		// ok we now have a fileInputCtrl with a "bad" file in it
		// you cannot blank a file input ctrl in all browsers, so we
		// replace existing file input with empty clone
		var $newFileInput = this.$fileInputCtrl.clone();
		this.$fileInputCtrl.replaceWith( $newFileInput );
		this.$fileInputCtrl = $newFileInput;
		this.initFileInputCtrl();

		if( this.providedFile ) {
			this.providedFile = null;
		}

		if ( code === 'ext' ) {
			this.showBadExtensionError( filename, info );
		} else if ( code === 'noext' ) {
			this.showMissingExtensionError( filename );
		} else if ( code === 'dup' ) {
			this.showDuplicateError( filename, info );
		} else if ( code === 'unparseable' ) {
			this.showUnparseableFilenameError( filename );
		} else {
			this.showUnknownError( code, filename );
		}
	},

	showUnparseableFilenameError: function( filename ) {
		this.showFilenameError( mw.message( 'mwe-upwiz-unparseable-filename', filename ).escaped() );
	},

	showBadExtensionError: function( filename, extension ) {
		var $errorMessage;
		// Check if firefogg should be recommended to be installed ( user selects an extension that can be converted)
		if ( mw.UploadWizard.config.enableFirefogg &&
			$.inArray( extension.toLowerCase(), mw.UploadWizard.config.transcodeExtensionList ) !== -1
		) {
			$errorMessage = $( '<p>' ).msg('mwe-upwiz-upload-error-bad-extension-video-firefogg',
					mw.Firefogg.getFirefoggInstallUrl(),
					'http://commons.wikimedia.org/wiki/Help:Converting_video'
				);
		} else {
			$errorMessage = $( '<p>' ).msg( 'mwe-upwiz-upload-error-bad-filename-extension', extension );
		}
		this.showFilenameError( $errorMessage );
	},

	showMissingExtensionError: function( filename ) {
		this.showExtensionError( $( '<p>' ).msg( 'mwe-upwiz-upload-error-bad-filename-no-extension' ) );
	},

	showUnknownFilenameError: function( filename ) {
		this.showFilenameError( $( '<p>' ).msg( 'mwe-upwiz-upload-error-unknown-filename-error', filename ) );
	},

	showExtensionError: function( $errorMessage ) {
		this.showFilenameError(
			$( '<div></div>' ).append(
				$errorMessage,
				$( '<p>' ).msg( 'mwe-upwiz-allowed-filename-extensions' ),
				$( '<blockquote>' ).append( $( '<tt>' ).append(
					mw.UploadWizard.config.fileExtensions.join( " " )
				) )
			)
		);
	},

	showDuplicateError: function( filename, basename ) {
		this.showFilenameError( $( '<p>' ).msg( 'mwe-upwiz-upload-error-duplicate-filename-error', basename ) );
	},

	showFilenameError: function( $text ) {
		$( '<div>' )
			.html( $text )
			.dialog({
				width: 500,
				zIndex: 200000,
				autoOpen: true,
				modal: true
			});
	},


	/**
	 * Move the file input to cover a certain element on the page.
	 * We use invisible file inputs because this is the only way to style a file input
	 * or otherwise get it to do what you want.
	 * It is helpful to sometimes move them to cover certain elements on the page, and
	 * even to pass events like hover
	 * @param selector jquery-compatible selector, for a single element
	 * @param positionTracking string, optional, whether to do position-polling ('poll')
	 *     on the selected element or whether to listen to window-resize events ('resize')
	 */
	moveFileInputToCover: function( selector, positionTracking ) {
		var iv, to, onResize, $win, _this = this;
		var update = function() {
			var $covered = $( selector );

			_this.fileCtrlContainer
				.css( $covered.position() )
				.css( 'marginTop', $covered.css( 'marginTop' ) )
				.css( 'marginRight', $covered.css( 'marginRight' ) )
				.css( 'marginBottom', $covered.css( 'marginBottom' ) )
				.css( 'marginLeft', $covered.css( 'marginLeft' ) )
				.width( $covered.outerWidth() )
				.height( $covered.outerHeight() );

			_this.fileCtrlContainer.css( { 'z-index': 1 } );

			// shift the file input over with negative margins,
			// internal to the overflow-containing div, so the div shows all button
			// and none of the textfield-like input
			_this.$fileInputCtrl.css( {
				'margin-left': '-' + ~~( _this.$fileInputCtrl.width() - $covered.outerWidth() - 10 ) + 'px',
				'margin-top' : '-' + ~~( _this.$fileInputCtrl.height() - $covered.outerHeight() - 10 ) + 'px'
			} );
		};


		this.cancelPositionTracking();
		if ( positionTracking === 'poll' ) {
			iv = window.setInterval( update, 500 );
			this.stopTracking = function () {
				window.clearInterval( iv );
			}
		} else if ( positionTracking === 'resize' ) {
			$win = $( window );
			onResize = function () {
				// ensure resizing works smoothly
				if ( to ) {
					window.clearTimeout( to );
				}
				to = window.setTimeout( update, 200 );
			};
			$win.resize( onResize );
			this.stopTracking = function () {
				$win.off( 'resize', onResize );
			}
		}
		// Show file input (possibly hidden by .hideFileInput())
		this.$fileInputCtrl.show();
		update();
	},

	cancelPositionTracking: function () {
		if ( $.isFunction( this.stopTracking ) ) {
			this.stopTracking();
			this.stopTracking = null;
		}
	},

	hideFileInput: function () {
		this.cancelPositionTracking();
		// Hide file input so it does not interfere with other interface elements
		this.$fileInputCtrl.hide();
	},

	/**
	 * this does two things:
	 *   1 ) since the file input has been hidden with some clever CSS ( to avoid x-browser styling issues ),
	 *      update the visible filename
	 *
	 *   2 ) update the underlying "title" which we are targeting to add to mediawiki.
	 *      TODO silently fix to have unique filename? unnecessary at this point...
	 */
	updateFilename: function() {
		var _this = this;
		var path = this.getFilename();
		// get basename of file; some browsers do this C:\fakepath\something
		path = path.replace(/\w:.*\\(.*)$/,'$1');

		// visible filename
		$( _this.form ).find( '.mwe-upwiz-visible-file-filename-text' ).text( path );

		// Set the filename we tell to the API to be the current timestamp + the filename
		// This is because we don't actually care what the filename is at this point, we just want it to be unique for this session and have the
		// proper file extension.
		// Also, it avoids a problem -- the API only returns one error at a time and it thinks that the same-filename error is more important than same-content.
		// But for UploadWizard, at this stage, it's the reverse. We want to stop same-content dead, but for now we ignore same-filename
		$( _this.filenameCtrl ).val( ( new Date() ).getTime().toString() + path );

		// deal with styling the file inputs and making it react to mouse
		if ( ! _this.isFilled ) {
			var $div = $( _this.div );
			_this.isFilled = true;
			$div.addClass( 'filled' );

			// cover the div with the file input.
			// we use the visible-file div because it has the same offsetParent as the file input
			// the second argument offsets the fileinput to the right so there's room for the close icon to get mouse events
			// TODO Why do we care for this element at all and do not just hide it, once we have a valid file in it?
			_this.moveFileInputToCover(
				$div.find( '.mwe-upwiz-visible-file-filename-text' )
			);

			// Highlight the file on mouseover (and also show controls like the remove control).
			//
			// On Firefox there are bugs related to capturing mouse events on inputs, so we seem to miss the
			// mouseenter or mouseleave events randomly. It's only really bad if we miss mouseleave,
			// and have two highlights visible. so we add another call to REALLY make sure that other highlights
			// are deactivated.
			// http://code.google.com/p/fbug/issues/detail?id=2075
			//
			// ALSO: When file inputs are adjacent, Firefox misses the "mouseenter" and "mouseleave" events.
			// Consequently we have to bind to "mouseover" and "mouseout" as well even though that's not as efficient.
			$div.bind( 'mouseenter mouseover', function() {
				$div.addClass( 'hover' );
				$( '#mwe-upwiz-filelist' )
					.children()
					.filter( function() { return this !== _this.div; } )
					.removeClass('hover');
			} );
			$div.bind( 'mouseleave mouseout', function() {
				$div.removeClass( 'hover' );
			} );

			// Create new upload slot for additional upload(s)
			_this.upload.wizard.newUpload();
			// Set the upload to be 'filled', which finally adds it to UploadWizard's list of uploads.
			_this.upload.wizard.setUploadFilled( _this.upload );

		} else {
			$( _this.div ).trigger( 'filenameAccepted' );
		}
	},

	/**
	 * Remove any complaints we had about errors and such
	 * XXX this should be changed to something Theme compatible
	 */
	clearErrors: function() {
		var _this = this;
		$( _this.div ).removeClass( 'mwe-upwiz-upload-error ');
		$( _this.errorDiv ).hide().empty();
	},

	/**
	 * Show an error with the upload
	 */
	error: function() {
		var _this = this;
		var args = Array.prototype.slice.call( arguments ); // copies arguments into a real array
		var msg = 'mwe-upwiz-upload-error-' + args[0];
		$( _this.errorDiv ).append( $j( '<p class="mwe-upwiz-upload-error"></p>' ).text( mw.message( msg, args.slice( 1 ) ).text() ) );
		// apply a error style to entire did
		$( _this.div ).addClass( 'mwe-upwiz-upload-error' );
		$( _this.errorDiv ).show();
	}

};

}( mediaWiki, jQuery ) );
