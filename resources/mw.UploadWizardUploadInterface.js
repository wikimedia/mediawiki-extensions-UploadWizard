( function ( mw, uw, $, oo ) {

	var UIP;

	/**
	 * @class mw.UploadWizardUploadInterface
	 * @mixins OO.EventEmitter
	 * @constructor
	 * Create an interface fragment corresponding to a file input, suitable for Upload Wizard.
	 * @param upload
	 * @param div to insert file interface
	 */
	function UploadWizardUploadInterface( upload, filesDiv ) {
		var $preview,
			ui = this;

		oo.EventEmitter.call( this );

		this.upload = upload;

		// may need to collaborate with the particular upload type sometimes
		// for the interface, as well as the uploadwizard. OY.
		this.$div = $('<div class="mwe-upwiz-file"></div>');
		this.div = this.$div.get(0);

		this.isFilled = false;

		this.$fileInputCtrl = $( '<input size="1" class="mwe-upwiz-file-input" name="file" type="file"/>' );
		if (mw.UploadWizard.config.enableFormData && mw.fileApi.isFormDataAvailable() &&
			mw.UploadWizard.config.enableMultiFileSelect && mw.UploadWizard.config.enableMultipleFiles ) {
			// Multiple uploads requires the FormData transport
			this.$fileInputCtrl.attr( 'multiple', '1' );
		}

		this.initFileInputCtrl();

		this.$indicator = $( '<div class="mwe-upwiz-file-indicator"></div>' );

		this.visibleFilenameDiv = $('<div class="mwe-upwiz-visible-file"></div>')
			.append( this.$indicator )
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

		this.$removeCtrl = $.fn.removeCtrl(
			'mwe-upwiz-remove',
			'mwe-upwiz-remove-upload',
			function () {
				ui.upload.remove();
				ui.cancelPositionTracking();
			}
		).addClass( 'mwe-upwiz-file-status-line-item' );

		this.visibleFilenameDiv.find( '.mwe-upwiz-file-status-line' )
			.append( this.$removeCtrl );

		// Add show thumbnail control

		//this.errorDiv = $('<div class="mwe-upwiz-upload-error mwe-upwiz-file-indicator" style="display: none;"></div>').get(0);

		this.filenameCtrl = $('<input type="hidden" name="filename" value=""/>').get(0);

		// this file Ctrl container is placed over other interface elements, intercepts clicks and gives them to the file input control.
		// however, we want to pass hover events to interface elements that we are over, hence the bindings.
		// n.b. not using toggleClass because it often gets this event wrong -- relies on previous state to know what to do
		this.fileCtrlContainer = $('<div class="mwe-upwiz-file-ctrl-container">');

		// the css trickery (along with css)
		// here creates a giant size file input control which is contained within a div and then
		// clipped for overflow. The effect is that we have a div (ctrl-container) we can position anywhere
		// which works as a file input. It will be set to opacity:0 and then we can do whatever we want with
		// interface "below".
		// XXX caution -- if the add file input changes size we won't match, unless we add some sort of event to catch this.
		this.form = $( '<form method="POST" encType="multipart/form-data" class="mwe-upwiz-form"></form>' )
				.attr( { action: this.upload.api.defaults.ajax.url } )
				.append( this.visibleFilenameDiv )
				.append( this.fileCtrlContainer )
				.append( this.filenameCtrl )
				.get( 0 );

		if ( $( '<input type="file">' ).prop( 'disabled' ) ) {
			$( '#mwe-upwiz-stepdiv-file' ).replaceWith(
				$( '<span/>' )
				.addClass( 'mwe-error' )
				.msg( 'mwe-upwiz-file-upload-notcapable' )
			);
			$( '#mwe-upwiz-add-file' ).hide();
			return;
		}

		if ( !this.upload.fromURL ) {
			$( this.fileCtrlContainer ).append( this.$fileInputCtrl );
		}
		$( this.div ).append( this.form );

		// XXX evil hardcoded
		// we don't really need filesdiv if we do it this way?
		$( filesDiv ).append( this.div );

		// this.progressBar = ( no progress bar for individual uploads yet )
		// we bind to the ui div since unbind doesn't work for non-DOM objects
		$( this.div ).bind( 'transportProgressEvent', function () { ui.showTransportProgress(); } );

		// XXX feature envy
		$preview = $( this.div ).find( '.mwe-upwiz-file-preview' );
		this.upload.setThumbnail(
			$preview,
			mw.UploadWizard.config.thumbnailWidth,
			mw.UploadWizard.config.thumbnailMaxHeight,
			true
		);
	}

	oo.mixinClass( UploadWizardUploadInterface, oo.EventEmitter );

	UIP = UploadWizardUploadInterface.prototype;

	/**
	 * Manually fill the file input with a file.
	 * @param {File} providedFile
	 */
	UIP.fill = function ( providedFile ) {
		if ( providedFile ) {
			this.providedFile = providedFile;

			// if a file is already present, trigger the change event immediately.
			this.$fileInputCtrl.trigger( 'change' );
		}
	};

	/**
	 * Things to do to this interface once we start uploading
	 */
	UIP.start = function () {
		// remove hovering
		$( this.div )
			.unbind( 'mouseenter mouseover mouseleave mouseout' );

		// remove delete control
		$( this.visibleFilenameDiv )
			.find( '.mwe-upwiz-remove-ctrl' )
			.unbind( 'mouseenter mouseover mouseleave mouseout' )
			.remove();

		// remove thumb control
		$( this.visibleFilenameDiv )
			.find( '.mwe-upwiz-show-thumb-ctrl' )
			.unbind( 'mouseenter mouseover mouseleave mouseout' )
			.remove();
	};

	/**
	 * change the graphic indicator at the far end of the row for this file
	 * @param String statusClass: corresponds to a class mwe-upwiz-status which changes style of indicator.
	 */
	UIP.showIndicator = function ( statusClass ) {
		this.clearIndicator();
		// add the desired class and make it visible, if it wasn't already.
		this.$indicator.addClass( 'mwe-upwiz-status-' + statusClass ).css( 'visibility', 'visible' );
	};

	/**
	 * Reset the graphic indicator
	 */
	UIP.clearIndicator = function () {
		var ui = this;
		$.each( this.$indicator.attr( 'class' ).split( /\s+/ ), function ( i, className ) {
			if ( className.match( /^mwe-upwiz-status/ ) ) {
				ui.$indicator.removeClass( className );
			}
		} );
	};

	/**
	 * Set the preview image on the file page for this upload.
	 * @param HTMLImageElement
	 */
	UIP.setPreview = function ( image ) {
		var $preview = $( this.div ).find( '.mwe-upwiz-file-preview' );
		if ( image === null ) {
			$preview.addClass( 'mwe-upwiz-file-preview-broken' );
		} else {
			// encoding for url here?
			$preview.css( 'background-image', 'url(' + image.src + ')' );
		}
	};

	/**
	 * Set the status line for this upload with an internationalized message string.
	 * @param String msgKey: key for the message
	 * @param Array args: array of values, in case any need to be fed to the image.
	 */
	UIP.setStatus = function ( msgKey, args ) {
		if ( args === undefined ) {
			args = [];
		}
		// get the status line for our upload
		var $s = $( this.div ).find( '.mwe-upwiz-file-status' );
		$s.msg( msgKey, args ).show();
	};

	/**
	 * Set status line directly with a string
	 * @param {String}
	 */
	UIP.setStatusString = function ( s ) {
		$( this.div ).find( '.mwe-upwiz-file-status' ).html( s ).show();
	};

	/**
	 * Clear the status line for this upload (hide it, in case there are paddings and such which offset other things.)
	 */
	UIP.clearStatus = function () {
		$( this.div ).find( '.mwe-upwiz-file-status' ).hide();
	};

	/**
	 * Put the visual state of an individual upload into "progress"
	 * @param fraction	The fraction of progress. Float between 0 and 1
	 */
	UIP.showTransportProgress = function () {
		// if fraction available, update individual progress bar / estimates, etc.
		this.showIndicator( 'progress' );
		this.setStatus( 'mwe-upwiz-uploading' );
	};

	/**
	 * Show that upload is transported
	 */
	UIP.showStashed = function () {
		this.$fileInputCtrl.detach();

		if ( this.$showThumbCtrl ) {
			this.$showThumbCtrl.detach();
		}

		this.showIndicator( 'stashed' );
		this.setStatus( 'mwe-upwiz-stashed-upload' );
	};

	/**
	 * Show that transport has failed
	 * @param String code: error code from API
	 * @param {String|Object} info: extra info
	 */
	UIP.showError = function ( code, info ) {
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
			args = [ code ].concat( $.makeArray( info ) );
		}
		this.setStatus( msgKey, args );
	};

	UIP.initFileInputCtrl = function () {
		var ui = this;

		this.$fileInputCtrl.change( function () {
			ui.emit( 'file-changed', ui.getFiles() );

			ui.clearErrors();
		} );
	};

	/**
	 * Reset file input to have no value.
	 */
	UIP.resetFileInput = function () {
		this.$fileInputCtrl.get( 0 ).value = '';
	};

	/**
	 * Get a list of the files from this file input, defaulting to the value from the input form
	 * @return {Array} of File objects
	 */
	UIP.getFiles = function () {
		var files = [];
		if ( mw.fileApi.isAvailable() ) {
			if ( this.providedFile && !this.$fileInputCtrl.first().value ) {  // default to the fileinput if it's defined.
				files[0] = this.providedFile;
			} else {
				$.each( this.$fileInputCtrl.get(0).files, function ( i, file ) {
					files.push( file );
				} );
			}
		}

		return files;
	};

	/**
	 * Get just the filename.
	 * @return {String}
	 */
	UIP.getFilename = function () {
		if ( this.providedFile && !this.$fileInputCtrl.get(0).value ) {  // default to the fileinput if it's defined.
			if ( this.providedFile.fileName ) {
				return this.providedFile.fileName;
			} else {
				// this property has a different name in FF vs Chrome.
				return this.providedFile.name;
			}
		} else {
			return this.$fileInputCtrl.get(0).value;
		}
	};

	/**
	 * Run this when the value of the file input has changed and we know it's acceptable -- this
	 * will update interface to show as much info as possible, including preview.
	 * n.b. in older browsers we only will know the filename
	 * @param {Object} imageinfo
	 * @param {File} file
	 * @param {boolean} fromURL
	 */
	UIP.fileChangedOk = function ( imageinfo, file, fromURL ) {
		var statusItems = [];

		this.updateFilename();

		// set the status string - e.g. "256 Kb, 100 x 200"
		if ( imageinfo && imageinfo.width && imageinfo.height ) {
			statusItems.push( imageinfo.width + '\u00d7' + imageinfo.height );
		}

		if ( file && !fromURL ) {
			statusItems.push( mw.units.bytes( file.size ) );
		}

		this.clearStatus();
		this.setStatusString( statusItems.join( ' \u00b7 ' ) );
	};

	/**
	 * Show a link that will show the thumbnail preview.
	 */
	UIP.makeShowThumbCtrl = function () {
		var ui = this;

		// add a control for showing the preview if the user needs it
		this.$showThumbCtrl = $.fn.showThumbCtrl(
				'mwe-upwiz-show-thumb',
				'mwe-upwiz-show-thumb-tip',
				function () { ui.emit( 'show-preview' ); }
			).addClass( 'mwe-upwiz-file-status-line-item' );

		this.visibleFilenameDiv.find( '.mwe-upwiz-file-status-line' )
			.append( '<br>' ).append( this.$showThumbCtrl );
	};

	UIP.fileChangedError = function ( code, info ) {
		var filename = this.getFilename(),

			// ok we now have a fileInputCtrl with a "bad" file in it
			// you cannot blank a file input ctrl in all browsers, so we
			// replace existing file input with empty clone
			$newFileInput = this.$fileInputCtrl.clone();

		this.$fileInputCtrl.replaceWith( $newFileInput );
		this.$fileInputCtrl = $newFileInput;
		this.initFileInputCtrl();

		if ( this.providedFile ) {
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
	};

	UIP.showUnparseableFilenameError = function ( filename ) {
		this.showFilenameError( mw.message( 'mwe-upwiz-unparseable-filename', filename ).escaped() );
	};

	UIP.showBadExtensionError = function ( filename, extension ) {
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
	};

	UIP.showMissingExtensionError = function () {
		this.showExtensionError( $( '<p>' ).msg( 'mwe-upwiz-upload-error-bad-filename-no-extension' ) );
	};

	UIP.showUnknownFilenameError = function ( filename ) {
		this.showFilenameError( $( '<p>' ).msg( 'mwe-upwiz-upload-error-unknown-filename-error', filename ) );
	};

	UIP.showExtensionError = function ( $errorMessage ) {
		this.showFilenameError(
			$( '<div></div>' ).append(
				$errorMessage,
				$( '<p>' ).msg( 'mwe-upwiz-allowed-filename-extensions' ),
				$( '<blockquote>' ).append( $( '<tt>' ).append(
					mw.UploadWizard.config.fileExtensions.join( ' ' )
				) )
			)
		);
	};

	UIP.showDuplicateError = function ( filename, basename ) {
		this.showFilenameError( $( '<p>' ).msg( 'mwe-upwiz-upload-error-duplicate-filename-error', basename ) );
	};

	UIP.showFilenameError = function ( $text ) {
		var msgText;

		if ( $text instanceof jQuery ) {
			msgText = $text.text();
		} else {
			msgText = $text;
		}

		uw.eventFlowLogger.logError( 'file', { code: 'filename', message: msgText } );
		$( '<div>' )
			.html( $text )
			.dialog({
				width: 500,
				zIndex: 200000,
				autoOpen: true,
				modal: true
			});
	};

	/**
	 * Move the file input to cover a certain element on the page.
	 * We use invisible file inputs because this is the only way to style a file input
	 * or otherwise get it to do what you want.
	 * It is helpful to sometimes move them to cover certain elements on the page, and
	 * even to pass events like hover
	 * @param selector jquery-compatible selector, for a single element
	 * @param positionTracking string, optional, whether to do position-polling ('poll')
	 *	 on the selected element or whether to listen to window-resize events ('resize')
	 */
	UIP.moveFileInputToCover = function ( selector, positionTracking ) {
		var iv, to, onResize, $win,
			ui = this;

		function update() {
			var $covered = $( selector );

			ui.fileCtrlContainer
				.css( $covered.position() )
				.css( 'marginTop', $covered.css( 'marginTop' ) )
				.css( 'marginRight', $covered.css( 'marginRight' ) )
				.css( 'marginBottom', $covered.css( 'marginBottom' ) )
				.css( 'marginLeft', $covered.css( 'marginLeft' ) )
				.width( $covered.outerWidth() )
				.height( $covered.outerHeight() );

			ui.fileCtrlContainer.css( { 'z-index': 1 } );

			// shift the file input over with negative margins,
			// internal to the overflow-containing div, so the div shows all button
			// and none of the textfield-like input
			ui.$fileInputCtrl.css( {
				'margin-left': '-' + ( ui.$fileInputCtrl.width() - $covered.outerWidth() - 10 ) + 'px',
				'margin-top': '-' + ( ui.$fileInputCtrl.height() - $covered.outerHeight() - 10 ) + 'px'
			} );
		}

		this.cancelPositionTracking();
		if ( positionTracking === 'poll' ) {
			iv = window.setInterval( update, 500 );
			this.stopTracking = function () {
				window.clearInterval( iv );
			};
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
			};
		}
		// Show file input (possibly hidden by .hideFileInput())
		this.$fileInputCtrl.show();
		update();
	};

	UIP.cancelPositionTracking = function () {
		if ( $.isFunction( this.stopTracking ) ) {
			this.stopTracking();
			this.stopTracking = null;
		}
	};

	UIP.hideFileInput = function () {
		this.cancelPositionTracking();
		// Hide file input so it does not interfere with other interface elements
		this.$fileInputCtrl.hide();
	};

	/**
	 * this does two things:
	 *   1 ) since the file input has been hidden with some clever CSS ( to avoid x-browser styling issues ),
	 *	  update the visible filename
	 *
	 *   2 ) update the underlying "title" which we are targeting to add to mediawiki.
	 *	  TODO silently fix to have unique filename? unnecessary at this point...
	 */
	UIP.updateFilename = function () {
		var $div,
			ui = this,
			path = this.getFilename();
		// get basename of file; some browsers do this C:\fakepath\something
		path = path.replace(/\w:.*\\(.*)$/, '$1');

		// visible filename
		$( this.form ).find( '.mwe-upwiz-visible-file-filename-text' ).text( mw.UploadWizard.sanitizeFilename( path ) );

		// Set the filename we tell to the API to be the current timestamp + the filename
		// This is because we don't actually care what the filename is at this point, we just want it to be unique for this session and have the
		// proper file extension.
		// Also, it avoids a problem -- the API only returns one error at a time and it thinks that the same-filename error is more important than same-content.
		// But for UploadWizard, at this stage, it's the reverse. We want to stop same-content dead, but for now we ignore same-filename
		$( this.filenameCtrl ).val( ( new Date() ).getTime().toString() + path );

		// deal with styling the file inputs and making it react to mouse
		if ( !this.isFilled ) {
			$div = $( this.div );
			this.isFilled = true;
			$div.addClass( 'filled' );

			// cover the div with the file input.
			// we use the visible-file div because it has the same offsetParent as the file input
			// the second argument offsets the fileinput to the right so there's room for the close icon to get mouse events
			// TODO Why do we care for this element at all and do not just hide it, once we have a valid file in it?
			this.moveFileInputToCover(
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
			$div.bind( 'mouseenter mouseover', function () {
				$div.addClass( 'hover' );
				$( '#mwe-upwiz-filelist' )
					.children()
					.filter( function () { return this !== ui.div; } )
					.removeClass('hover');
			} );
			$div.bind( 'mouseleave mouseout', function () {
				$div.removeClass( 'hover' );
			} );

			this.emit( 'upload-filled' );
		} else {
			this.emit( 'filename-accepted' );
		}
	};

	/**
	 * Remove any complaints we had about errors and such
	 * XXX this should be changed to something Theme compatible
	 */
	UIP.clearErrors = function () {
		$( this.div ).removeClass( 'mwe-upwiz-upload-error ');
		$( this.errorDiv ).hide().empty();
	};

	mw.UploadWizardUploadInterface = UploadWizardUploadInterface;

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
