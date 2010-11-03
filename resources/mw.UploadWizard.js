// XXX
// this is sure starting to look like we should compose of UI, handler.
		

/**
 * Represents the upload -- in its local and remote state. (Possibly those could be separate objects too...)
 * This is our 'model' object if we are thinking MVC. Needs to be better factored, lots of feature envy with the UploadWizard
 * states:
 *   'new' 'transporting' 'transported' 'details' 'submitting-details' 'complete' 'failed' 
 * should fork this into two -- local and remote, e.g. filename
 */
( function( $j ) {

mw.UploadWizardUpload = function( api, filesDiv ) {
	this.api = api;
	this.state = 'new';
	this.thumbnails = {};
	this.imageinfo = {};
	this.title = undefined;
	this.mimetype = undefined;
	this.extension = undefined;

	this.sessionKey = undefined;
	
	// this should be moved to the interface, if we even keep this	
	this.transportWeight = 1;  // default
	this.detailsWeight = 1; // default

	// details 		
	this.ui = new mw.UploadWizardUploadInterface( this, filesDiv );

	// handler -- usually ApiUploadHandler
	// this.handler = new ( mw.UploadWizard.config[  'uploadHandlerClass'  ] )( this );
	// this.handler = new mw.MockUploadHandler( this );
	this.handler = new mw.ApiUploadHandler( this, api );
};

mw.UploadWizardUpload.prototype = {

	acceptDeed: function( deed ) {
		var _this = this;
		_this.deed.applyDeed( _this );
	},

	/**
 	 * start
	 */
	start: function() {
		var _this = this;
		_this.setTransportProgress(0.0);
		//_this.ui.start();
		_this.handler.start();	
	},

	/**
	 *  remove this upload. n.b. we trigger a removeUpload this is usually triggered from 
	 */
	remove: function() {
		if ( this.details && this.details.div ) {
			this.details.div.remove(); 
		}
		if ( this.thanksDiv ) {
			this.thanksDiv.remove();
		}
		// we signal to the wizard to update itself, which has to delete the final vestige of 
		// this upload (the ui.div). We have to do this silly dance because we 
		// trigger through the div. Triggering through objects doesn't always work.
		// TODO fix -- this now works in jquery 1.4.2
		$j( this.ui.div ).trigger( 'removeUploadEvent' );
	},


	/**
	 * Wear our current progress, for observing processes to see
	 * XXX this is kind of a misnomer; this event is not firing except for the very first time.
 	 * @param fraction
	 */
	setTransportProgress: function ( fraction ) {
		var _this = this;
		_this.state = 'transporting';
		_this.transportProgress = fraction;
		$j( _this.ui.div ).trigger( 'transportProgressEvent' );
	},

	/**
	 * Stop the upload -- we have failed for some reason 
	 */
	setFailed: function( code ) { 
		/* stop the upload progress */
		this.state = 'failed';
		this.transportProgress = 0;
		this.ui.showFailed( code );
	},

	/**
	 * To be executed when an individual upload finishes. Processes the result and updates step 2's details 
	 * @param result	the API result in parsed JSON form
	 * XXX needs refactor --- new api needs error handler instead
	 */
	setTransported: function( result ) {
		var _this = this;
		_this.state = 'transported';
		_this.transportProgress = 1;
		$j( _this.ui.div ).trigger( 'transportedEvent' );

		if ( result.upload && result.upload.imageinfo ) {
			// success
			_this.extractUploadInfo( result );	
			_this.deedPreview.setup();
			_this.details.populate();
		
		} else if ( result.upload && result.upload.sessionkey ) {
			// there was a warning - type error which prevented it from adding the result to the db 
			if ( result.upload.warnings.duplicate ) {
				var duplicates = result.upload.warnings.duplicate;
				_this.details.errorDuplicate( result.upload.sessionkey, duplicates );
			}

			// and other errors that result in a stash
		} else {
			// XXX handle errors better
			if ( result.error ) {
				alert( "error : " + result.error.code + " : " + result.error.info );
			} 
			this.ui.showFailed();
			alert("huh?");
			// TODO now we should tag the upload as failed
			// if can recover, should maybe allow re-uploading.
		}
	
	},


	/**
	 * Called when the file is entered into the file input
	 * Get as much data as possible -- maybe exif, even thumbnail maybe
	 */
	extractLocalFileInfo: function( localFilename ) {
		if ( false ) {  // FileAPI, one day
			this.transportWeight = getFileSize();
		}
		this.title = new mw.Title( mw.UploadWizardUtil.getBasename( localFilename ), 'file' );
	},

	/** 
 	 * Accept the result from a successful API upload transport, and fill our own info 
	 *
	 * @param result The JSON object from a successful API upload result.
	 */
	extractUploadInfo: function( result ) {
		this.sessionKey = result.upload.sessionkey;
		this.extractImageInfo( result.upload.imageinfo );
	},

	/**
	 * Extract image info into our upload object 	
	 * Image info is obtained from various different API methods
	 * @param imageinfo JSON object obtained from API result.
	 */
	extractImageInfo: function( imageinfo ) {
		var _this = this;
		for ( var key in imageinfo ) {
			// we get metadata as list of key-val pairs; convert to object for easier lookup. Assuming that EXIF fields are unique.
			if ( key == 'metadata' ) {
				_this.imageinfo.metadata = {};
				if ( imageinfo.metadata && imageinfo.metadata.length ) {
					$j.each( imageinfo.metadata, function( i, pair ) {
						if ( pair !== undefined ) {
							_this.imageinfo.metadata[pair['name'].toLowerCase()] = pair['value'];
						}
					} );
				}
			} else {
				_this.imageinfo[key] = imageinfo[key];
			}
		}
	
		// TODO this needs to be rethought.	
		// we should already have an extension, but if we don't...  ??
		if ( _this.title.getExtension() === null ) {
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
	 * Fetch a thumbnail for this upload of the desired width. 
	 * It is assumed you don't call this until it's been transported.
 	 *
	 * @param width - desired width of thumbnail (height will scale to match)
	 * @param callback - callback to execute once thumbnail has been obtained -- must accept Image object
	 */
	getThumbnail: function( width, callback ) {
		var _this = this;
		var key = "width" + width;
		if ( mw.isDefined( _this.thumbnails[key] ) ) {
			callback( _this.thumbnails[key] );
		} else {
			var params = {
				'prop':	'stashimageinfo',
				'siisessionkey': _this.sessionKey,
				'siiurlwidth': width, 
				'siiprop': 'url'
			};

			this.api.get( params, function( data ) {
				if ( !data || !data.query || !data.query.stashimageinfo ) {
					mw.log(" No data? ");
					// XXX do something about the thumbnail spinner, maybe call the callback with a broken image.
					return;
				}
				var thumbnails = data.query.stashimageinfo;
				for ( var i = 0; i < thumbnails.length; i++ ) {
					_this.thumbnails[key] = {
						src: thumbnails[i].thumburl,
						width: thumbnails[i].thumbwidth,
						height: thumbnails[i].thumbheight
					};
					callback( _this.thumbnails[key] );
				}
			} );
		}
	},

	/**
	 * Look up thumbnail info and set it in HTML, with loading spinner
	 * it might be interesting to make this more of a publish/subscribe thing, since we have to do this 3x
	 * the callbacks may pile up, getting unnecessary info
	 *
	 * @param selector
	 * @param width
	 */
	setThumbnail: function( selector, width ) {
		var _this = this;
		if ( typeof width === 'undefined' || width === null || width <= 0 )  {	
			width = mw.UploadWizard.config[  'thumbnailWidth'  ];
		}
		width = parseInt( width, 10 );
				
		var callback = function( thumbnail ) {
			// side effect: will replace thumbnail's loadingSpinner
			$j( selector ).html(
				$j('<a/>')
					.attr( { 'href': _this.imageinfo.url,
						 'target' : '_new' } )
					.append(
						$j( '<img/>' )
							.attr( 'width',  thumbnail.width )
							.attr( 'height', thumbnail.height )
							.attr( 'src',    thumbnail.src ) ) );
		};

		$j( selector ).loadingSpinner();
		_this.getThumbnail( width, callback );
	}
	
};

/**
 * Create an interface fragment corresponding to a file input, suitable for Upload Wizard.
 * @param upload
 * @param div to insert file interface
 * @param addInterface interface to add a new one (assumed that we start out there)
 */
mw.UploadWizardUploadInterface = function( upload, filesDiv ) {
	var _this = this;

	_this.upload = upload;

	// may need to collaborate with the particular upload type sometimes
	// for the interface, as well as the uploadwizard. OY.
	_this.div = $j('<div class="mwe-upwiz-file"></div>').get(0);
	_this.isFilled = false;

	_this.fileInputCtrl = $j('<input size="1" class="mwe-upwiz-file-input" name="file" type="file"/>')
				.change( function() { _this.fileChanged(); } ) 
				.get(0);


	visibleFilenameDiv = $j('<div class="mwe-upwiz-visible-file"></div>')
		.append( 
			 $j.fn.removeCtrl( 'mwe-upwiz-remove-upload', function() { _this.upload.remove(); } ),
	
			 $j( '<div class="mwe-upwiz-file-indicator"></div>' ),

			 $j( '<div class="mwe-upwiz-visible-file-filename">' )
				.append( 
					 $j( '<span class="ui-icon ui-icon-document" style="display: inline-block;" />' ),
					 $j( '<span class="mwe-upwiz-visible-file-filename-text"/>' )
				)

		);

	//_this.errorDiv = $j('<div class="mwe-upwiz-upload-error mwe-upwiz-file-indicator" style="display: none;"></div>').get(0);

	_this.filenameCtrl = $j('<input type="hidden" name="filename" value=""/>').get(0); 
	
	// this file Ctrl container is placed over other interface elements, intercepts clicks and gives them to the file input control.
	// however, we want to pass hover events to interface elements that we are over, hence the bindings.
	// n.b. not using toggleClass because it often gets this event wrong -- relies on previous state to know what to do
	_this.fileCtrlContainer = $j('<div class="mwe-upwiz-file-ctrl-container">');
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
	_this.form = $j('<form class="mwe-upwiz-form"></form>')
			.append( visibleFilenameDiv )
			.append( _this.fileCtrlContainer
				.append( _this.fileInputCtrl ) 
			)
			.append( _this.filenameCtrl )
			.append( _this.thumbnailParam )
			.get( 0 );


	$j( _this.div ).append( _this.form );

	// XXX evil hardcoded
	// we don't really need filesdiv if we do it this way?
	$j( _this.div ).insertBefore( '#mwe-upwiz-upload-ctrls' ); // append( _this.div );

	// _this.progressBar = ( no progress bar for individual uploads yet )
	// we bind to the ui div since unbind doesn't work for non-DOM objects
	$j( _this.div ).bind( 'transportProgressEvent', function(e) { _this.showTransportProgress(); } );
	$j( _this.div ).bind( 'transportedEvent', function(e) { _this.showTransported(); } );

};


mw.UploadWizardUploadInterface.prototype = {
	/**
	 * Things to do to this interface once we start uploading
	 */
	start: function() {
		var _this = this;
		// remove hovering
		$j( _this.div )
			.unbind( 'mouseenter mouseover mouseleave mouseout' );

		// remove delete control 
		$j( _this.div )
			.find( '.mwe-upwiz-remove-ctrl' )
			.unbind( 'mouseenter mouseover mouseleave mouseout' )
			.remove();
	},

	busy: function() {
		var _this = this;
		// for now we implement this as looking like "100% progress"
		// e.g. an animated bar that takes up all the space
		// _this.showTransportProgress();
	},

	/**
 	 *
	 */ 
	showIndicatorMessage: function( statusClass, msgKey ) {
		var _this = this;
		var $indicator = $j( _this.div ).find( '.mwe-upwiz-file-indicator' );
		$j.each( $indicator.attr( 'class' ).split( /\s+/ ), function( i, className ) {
			if ( className.match( /^mwe-upwiz-status/ ) ) {
				$indicator.removeClass( className );
			}
		} );
		$indicator.addClass( 'mwe-upwiz-status-' + statusClass )
			  .html( gM( msgKey ) );
		$j( _this.div ).find( '.mwe-upwiz-visible-file-filename' )
				.css( 'margin-right', ( $indicator.outerWidth() + 24 ).toString() + 'px' );
		$indicator.css( 'visibility', 'visible' ); 
	},

	/**
	 * Put the visual state of an individual upload ito "progress"
	 * @param fraction	The fraction of progress. Float between 0 and 1
	 */
	showTransportProgress: function() {
		this.showIndicatorMessage( 'progress', 'mwe-upwiz-uploading' );
		// update individual progress bar with fraction?
	},

	/**
	 * Show that upload is transported
	 */
	showTransported: function() {
		this.showIndicatorMessage( 'completed', 'mwe-upwiz-transported' );
	},

	/** 
	 * Show that transport has failed
	 */
	showFailed: function( code ) {
		this.showIndicatorMessage( 'failed', 'mwe-upwiz-failed' );
		//add a "retry" button, too?
	},

	/**
	 * Run this when the value of the file input has changed. Check the file for various forms of goodness.
	 * If okay, then update the visible filename (due to CSS trickery the real file input is invisible)
	 */
	fileChanged: function() {
		var _this = this;
		_this.clearErrors();
		_this.upload.extractLocalFileInfo( $j( _this.fileInputCtrl ).val() );
		if ( _this.isGoodExtension( _this.upload.title.getExtension() ) ) {
			_this.updateFilename();
		} else {       
			//_this.error( 'bad-filename-extension', ext );
			alert("bad extension");
		}
	},

	/**
	 * Move the file input to cover a certain element on the page. 
	 * We use invisible file inputs because this is the only way to style a file input
	 * or otherwise get it to do what you want.
	 * It is helpful to sometimes move them to cover certain elements on the page, and 
	 * even to pass events like hover
	 * @param selector jquery-compatible selector, for a single element
	 */
	moveFileInputToCover: function( selector, offset ) {

		//mw.log( "moving to cover " + selector );
		var _this = this;
		var $covered = $j( selector ); 

		var topOffset, rightOffset, bottomOffset, leftOffset;
		topOffset = rightOffset = bottomOffset = leftOffset = 0;
		if (typeof offset != 'undefined' ) {
			topOffset = offset[0];
			rightOffset = offset[1];
			bottomOffset = offset[2];
			leftOffset = offset[3];
		}
		var widthOffset = rightOffset - leftOffset;
		var heightOffset = bottomOffset - topOffset;
		//mw.log( "position: " );
		//mw.log( $covered.position() );
		var position = $covered.position();
		_this.fileCtrlContainer
			.css( $covered.position() )
			.width( $covered.outerWidth() )
			.height( $covered.outerHeight() ); 
			/*
			{ 
				'top': (position['top'] + topOffset).toString() + 'px', 
				'left': (position['left'] + leftOffset).toString() + 'px'  
			} )
			.width( ($covered.outerWidth() + widthOffset).toString() + 'px' )
			.height( ($covered.outerHeight() + heightOffset).toString() + 'px' );
			*/
		
		// shift the file input over with negative margins, 
		// internal to the overflow-containing div, so the div shows all button
		// and none of the textfield-like input
		$j( _this.fileInputCtrl ).css( {
			'margin-left': '-' + ~~( $j( _this.fileInputCtrl).width() - $covered.outerWidth() - 10 ) + 'px',
			'margin-top' : '-' + ~~( $j( _this.fileInputCtrl).height() - $covered.outerHeight() - 10 ) + 'px'
		} );


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
		var path = _this.fileInputCtrl.value;
		
		// visible filenam.
		$j( _this.form ).find( '.mwe-upwiz-visible-file-filename-text' ).html( path );

		_this.upload.title = new mw.Title( mw.UploadWizardUtil.getBasename( path ), 'file' );
		$j( _this.filenameCtrl ).val( _this.upload.title.getMain() );

		if ( ! _this.isFilled ) {
			var $div = $j( _this.div );
			_this.isFilled = true;
			$div.addClass( 'filled' );
				
 			// cover the div with the file input.
			// we use the visible-file div because it has the same offsetParent as the file input
			// the second argument offsets the fileinput to the right so there's room for the close icon to get mouse events
			_this.moveFileInputToCover( 	
				$div.find( '.mwe-upwiz-visible-file-filename' )
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
				$j( '#mwe-upwiz-files' )
					.children()
					.filter( function() { return this !== _this.div; } )
					.removeClass('hover');
			}, false );
			$div.bind( 'mouseleave mouseout', function() { 
				$div.removeClass( 'hover' ); 	
			}, false );
			$j( _this.div ).trigger( 'filled' );
		} else {	
			$j( _this.div ).trigger( 'filenameAccepted' );
		}
	},

	/**
	 * Remove any complaints we had about errors and such
	 * XXX this should be changed to something Theme compatible
	 */
	clearErrors: function() {
		var _this = this;
		$j( _this.div ).removeClass( 'mwe-upwiz-upload-error ');
		$j( _this.errorDiv ).hide().empty();
	},

	/**
	 * Show an error with the upload
	 */
	error: function() {
		var _this = this;
		var args = Array.prototype.slice.call( arguments ); // copies arguments into a real array
		var msg = 'mwe-upwiz-upload-error-' + args[0];
		$j( _this.errorDiv ).append( $j( '<p class="mwe-upwiz-upload-error">' + gM( msg, args.slice( 1 ) ) + '</p>') );
		// apply a error style to entire did
		$j( _this.div ).addClass( 'mwe-upwiz-upload-error' );
		$j( _this.errorDiv ).show();
	},

	/**
	 * This is used when checking for "bad" extensions in a filename. 
	 * @param ext
	 * @return boolean if extension was acceptable
	 */
	isGoodExtension: function( ext ) {
		return $j.inArray( ext.toLowerCase(), mw.UploadWizard.config[ 'fileExtensions' ] ) !== -1;
	}

};	
	
/**
 * Object that represents an indvidual language description, in the details portion of Upload Wizard
 * @param languageCode -- string 
 * @param firstRequired -- boolean -- the first description is required and should be validated and displayed a bit differently
 */
mw.UploadWizardDescription = function( languageCode, required ) {
	var _this = this;
	mw.UploadWizardDescription.prototype.count++;
	_this.id = 'description' + mw.UploadWizardDescription.prototype.count;

	// XXX for some reason this display:block is not making it into HTML
	var errorLabelDiv = $j(   '<div class="mwe-upwiz-details-input-error">'
				+   '<label generated="true" class="mwe-validator-error" for="' + _this.id + '" />'
				+ '</div>' );

	var fieldnameDiv = $j( '<div class="mwe-upwiz-details-fieldname" />' );
	if ( required ) {
		fieldnameDiv.append( gM( 'mwe-upwiz-desc' ) ).requiredFieldLabel();
	}
	

	// Logic copied from MediaWiki:UploadForm.js
	// Per request from Portuguese and Brazilian users, treat Brazilian Portuguese as Portuguese.
	if (languageCode == 'pt-br') {
		languageCode = 'pt';
	// this was also in UploadForm.js, but without the heartwarming justification
	} else if (languageCode == 'en-gb') {
		languageCode = 'en';
	}

	_this.languageMenu = mw.LanguageUpWiz.getMenu( 'lang', languageCode );
	$j(_this.languageMenu).addClass( 'mwe-upwiz-desc-lang-select' );

	_this.input = $j( '<textarea name="' + _this.id  + '" rows="2" cols="36" class="mwe-upwiz-desc-lang-text"></textarea>' )
				.attr( 'title', gM( 'mwe-upwiz-tooltip-description' ) )
				.growTextArea()
				.tipsyPlus( { plus: 'even more stuff' } );

	// descriptions
	_this.div = $j('<div class="mwe-upwiz-details-descriptions-container ui-helper-clearfix"></div>' )
			.append( errorLabelDiv, fieldnameDiv, _this.languageMenu, _this.input );

};

mw.UploadWizardDescription.prototype = {

	/* widget count for auto incrementing */
	count: 0,

	/**
	 * Obtain text of this description, suitable for including into Information template
	 * @return wikitext as a string
	 */
	getWikiText: function() {
		var _this = this;
		var description = $j( _this.input ).val().trim();
		// we assume that form validation has caught this problem if this is a required field
		// if not, assume the user is trying to blank a description in another language
		if ( description.length === 0 ) {	
			return '';
		}
		var language = $j( _this.languageMenu ).val().trim();
		var fix = mw.UploadWizard.config[ "languageTemplateFixups" ];
		if (fix[language]) {
			language = fix[language];
		}
		return '{{' + language + '|1=' + description + '}}';
	},

	/**
	 * defer adding rules until it's in a form 
	 * @return validator
 	 */
	addValidationRules: function( required ) {
		// validator must find a form, so we add rules here
		return this.input.rules( "add", {
			minlength: mw.UploadWizard.config[  'minDescriptionLength'  ],
			maxlength: mw.UploadWizard.config[  'maxDescriptionLength'  ],
			required: required,
			messages: { 
				required: gM( 'mwe-upwiz-error-blank' ),
				minlength: gM( 'mwe-upwiz-error-too-short', mw.UploadWizard.config[  'minDescriptionLength'  ] ),
				maxlength: gM( 'mwe-upwiz-error-too-long', mw.UploadWizard.config[  'maxDescriptionLength'  ] )
			}		
		} );
	}	
};

/**
 * Object that represents the Details (step 2) portion of the UploadWizard
 * n.b. each upload gets its own details.
 * 
 * XXX a lot of this construction is not really the jQuery way. 
 * The correct thing would be to have some hidden static HTML
 * on the page which we clone and slice up with selectors. Inputs can still be members of the object
 * but they'll be found by selectors, not by creating them as members and then adding them to a DOM structure.
 *
 * XXX this should have styles for what mode we're in 
 *
 * @param UploadWizardUpload
 * @param containerDiv	The div to put the interface into
 */
mw.UploadWizardDetails = function( upload, containerDiv ) {

	var _this = this;
	_this.upload = upload;

	_this.descriptions = [];

	_this.div = $j( '<div class="mwe-upwiz-info-file ui-helper-clearfix"></div>' );

	_this.thumbnailDiv = $j( '<div class="mwe-upwiz-thumbnail mwe-upwiz-thumbnail-side"></div>' );
	
	_this.dataDiv = $j( '<div class="mwe-upwiz-data"></div>' );

	// descriptions
	_this.descriptionsDiv = $j( '<div class="mwe-upwiz-details-descriptions"></div>' );

	_this.descriptionAdder = $j( '<a class="mwe-upwiz-more-options"/>' )
					.html( gM( 'mwe-upwiz-desc-add-0' ) )
					.click( function( ) { _this.addDescription(); } );

	var descriptionAdderDiv = 
		$j( '<div />' ).append(
			$j( '<div class="mwe-upwiz-details-fieldname" />' ),
			$j( '<div class="mwe-upwiz-details-descriptions-add" />' )
					.append( _this.descriptionAdder ) 
		);

	// Commons specific help for titles 
	//    http://commons.wikimedia.org/wiki/Commons:File_naming
	//    http://commons.wikimedia.org/wiki/MediaWiki:Filename-prefix-blacklist
	//    XXX make sure they can't use ctrl characters or returns or any other bad stuff.
	_this.titleId = "title" + _this.upload.index;
	_this.titleInput = $j( '<textarea type="text" id="' + _this.titleId + '" name="' + _this.titleId + '" rows="1" class="mwe-title mwe-long-textarea"></textarea>' )
		.attr( 'title', gM( 'mwe-upwiz-tooltip-title' ) )
		.tipsyPlus()
		.keyup( function() { 
			_this.upload.title.setNameText( _this.titleInput.value );
			// TODO update a display of filename 
		} )
		.growTextArea()
		.destinationChecked( {
			api: _this.upload.api,
			spinner: function(bool) { _this.toggleDestinationBusy(bool); },
			preprocess: function( name ) { 
				// turn the contents of the input into a MediaWiki title ("File:foo_bar.jpg") to look up
				return _this.upload.title.setNameText( name ).toString();
			}, 
			processResult: function( result ) { _this.processDestinationCheck( result ); } 
		} );

	_this.titleErrorDiv = $j('<div class="mwe-upwiz-details-input-error"><label class="mwe-error" for="' + _this.titleId + '" generated="true"/></div>');

	var titleContainerDiv = $j('<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>')
		.append(
			_this.titleErrorDiv, 
			$j( '<div class="mwe-upwiz-details-fieldname"></div>' )
				.requiredFieldLabel()
				.append( gM( 'mwe-upwiz-title' ) ),
			$j( '<div class="mwe-upwiz-details-input"></div>' ).append( _this.titleInput ) 
		); 

	_this.deedDiv = $j( '<div class="mwe-upwiz-custom-deed" />' );

	_this.copyrightInfoFieldset = $j('<fieldset class="mwe-fieldset mwe-upwiz-copyright-info"></fieldset>')
		.hide()
		.append( 
			$j( '<legend class="mwe-legend">' ).append( gM( 'mwe-upwiz-copyright-info' ) ), 
			_this.deedDiv
		);

	var $categoriesDiv = $j('<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix">' 
				+ '<div class="mwe-upwiz-details-fieldname"></div>' 
				+ '<div class="mwe-upwiz-details-input"></div>'
				+ '</div>' );
	$categoriesDiv.find( '.mwe-upwiz-details-fieldname' ).append( gM( 'mwe-upwiz-categories' ) );
	var categoriesId = 'categories' + _this.upload.index;
	$categoriesDiv.find( '.mwe-upwiz-details-input' )
		.append( $j( '<input/>' ).attr( { id: categoriesId,
						  name: categoriesId,
						  type: 'text' } )
		);
	
	var moreDetailsDiv = $j('<div class="mwe-more-details"></div>');

	var moreDetailsCtrlDiv = $j( '<div class="mwe-upwiz-details-more-options"></div>' );

	var dateInputId = "dateInput" + ( _this.upload.index ).toString();
	var dateDisplayInputId = "dateDisplayInput" + ( _this.upload.index ).toString();
	
	var dateErrorDiv = $j('<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + dateInputId + '" generated="true"/></div>');

	/* XXX must localize this by loading jquery.ui.datepicker-XX.js where XX is a language code */
	/* jQuery.ui.datepicker also modifies first-day-of-week according to language, which is somewhat wrong. */
	/* $.datepicker.setDefaults() for other settings */	
	_this.dateInput = 
		$j( '<input type="text" id="' + dateInputId + '" name="' + dateInputId + '" type="text" class="mwe-date" size="20"/>' );
	_this.dateDisplayInput = 
		$j( '<input type="text" id="' + dateDisplayInputId + '" name="' + dateDisplayInputId + '" type="text" class="mwe-date-display" size="20"/>' );
	

	var dateInputDiv = $j( '<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
		.append(
			dateErrorDiv, 
			$j( '<div class="mwe-upwiz-details-fieldname"></div>' ).append( gM( 'mwe-upwiz-date-created' ) ), 
			$j( '<div class="mwe-upwiz-details-input"></div>' ).append( _this.dateInput, _this.dateDisplayInput ) );

	var otherInformationId = "otherInformation" + _this.upload.index;
	_this.otherInformationInput = $j( '<textarea id="' + otherInformationId + '" name="' + otherInformationId + '" class="mwe-upwiz-other-textarea"></textarea>' )
		.growTextArea()
		.attr( 'title', gM( 'mwe-upwiz-tooltip-other' ) )
		.tipsyPlus();

	var otherInformationDiv = $j('<div></div>')	
		.append( $j( '<div class="mwe-upwiz-details-more-label">' ).append( gM( 'mwe-upwiz-other' ) ) ) 
		.append( _this.otherInformationInput );
	

	$j( moreDetailsDiv ).append( 
		dateInputDiv, 
		// location goes here
		otherInformationDiv
	);

	_this.$form = $j( '<form></form>' );
	_this.$form.append( 
		_this.descriptionsDiv, 
		descriptionAdderDiv,
		titleContainerDiv,
		_this.copyrightInfoFieldset,
		$categoriesDiv,
		moreDetailsCtrlDiv,
		moreDetailsDiv
	);

	$j( _this.dataDiv ).append( 
		_this.$form 
	);

	$j( _this.div ).append( 
		_this.thumbnailDiv, 
		_this.dataDiv
	);

	_this.$form.validate();
	_this.$form.find( '.mwe-date' ).rules( "add", {
		dateISO: true,
		messages: {
			dateISO: gM( 'mwe-upwiz-error-date' )
		}
	} );

	// we hide the "real" ISO date, and create another "display" date
	_this.$form.find( '.mwe-date-display' )
		.datepicker( { 	
			dateFormat: 'DD, MM d, yy', 
			//buttonImage: mw.getMwEmbedPath() + 'skins/common/images/calendar.gif',
			showOn: 'focus',
			/* buttonImage: '???', 
			buttonImageOnly: true,  */
			changeMonth: true, 
			changeYear: true, 
			showAnim: 'slideDown',
			altField: '#' + dateInputId,
			altFormat: 'yy-mm-dd' } )
		.click( function() { $j( this ).datepicker( 'show' ); } )
		.readonly();

	_this.$form.find( '.mwe-date' )	
		.bind( 'change', function() { $j( this ).valid(); } )
		.hide();
	
	/* if the date is not valid, we need to pop open the "more options". How? 
	   guess we'll revalidate it with element */

	mw.UploadWizardUtil.makeToggler( moreDetailsCtrlDiv, moreDetailsDiv );	

	_this.addDescription( true, mw.UploadWizard.config[ 'userLanguage' ] );
	$j( containerDiv ).append( _this.div );

	// make this a category picker
	$categoriesDiv.find( '.mwe-upwiz-details-input' )
			.find( 'input' )
			.mwCoolCats( { buttontext: gM( 'mwe-upwiz-categories-add' ) } );

};

mw.UploadWizardDetails.prototype = {

	/**
	 * check entire form for validity
	 */ 
	// return boolean if we are ready to go.
        // side effect: add error text to the page for fields in an incorrect state.
	// we must call EVERY valid() function due to side effects; do not short-circuit.
        valid: function() {
		var _this = this;
                // at least one description -- never mind, we are disallowing removal of first description
                // all the descriptions -- check min & max length

                // the title
		var titleInputValid = $j( _this.titleInput ).data( 'valid' );
		if ( typeof titleInputValid == 'undefined' ) {
			alert( "please wait, still checking the title for uniqueness..." );
			return false;
		}
	
		// all other fields validated with validator js	
		var formValid = _this.$form.valid();
		return titleInputValid && formValid;

		// categories are assumed valid
	
                // the license, if any

                // pop open the 'more-options' if the date is bad
                // the date

		// location?
        },



	/**
	 * toggles whether we use the 'macro' deed or our own
	 */
	useCustomDeedChooser: function() {
		var _this = this;
		_this.copyrightInfoFieldset.show();
		_this.upload.wizardDeedChooser = _this.upload.deedChooser;
		_this.upload.deedChooser = new mw.UploadWizardDeedChooser( 
			_this.deedDiv,
			[ new mw.UploadWizardDeedOwnWork(), 
			  new mw.UploadWizardDeedThirdParty() ]
		);
	},

	/**
	 * show file destination field as "busy" while checking 
	 * @param busy boolean true = show busy-ness, false = remove
	 */
	toggleDestinationBusy: function ( busy ) {
		var _this = this;
		if (busy) {
			_this.titleInput.addClass( "busy" );
			$j( _this.titleInput ).data( 'valid', undefined );
		} else {
			_this.titleInput.removeClass( "busy" );
		}
	},
	
	/**
	 * Process the result of a destination filename check.
	 * See mw.DestinationChecker.js for documentation of result format 
	 * XXX would be simpler if we created all these divs in the DOM and had a more jquery-friendly way of selecting
 	 * attrs. Instead we create & destroy whole interface each time. Won't someone think of the DOM elements?
	 * @param result
	 */
	processDestinationCheck: function( result ) {
		var _this = this;

		if ( result.isUnique ) {
			$j( _this.titleInput ).data( 'valid', true );
			_this.$form.find( 'label[for=' + _this.titleId + ']' ).hide().empty();
			_this.ignoreWarningsInput = undefined;
			return;
		}

		$j( _this.titleInput ).data( 'valid', false );

		// result is NOT unique
		var title = new mw.Title( result.title ).setNamespace( 'file' ).getNameText();
		/* var img = result.img;
		var href = result.href; */
	
		_this.$form.find( 'label[for=' + _this.titleId + ']' )
			.html( gM( 'mwe-upwiz-fileexists-replace', title ) )
			.show();

		/* temporarily commenting out the full thumbnail etc. thing. For now, we just want the user to change
                   to a different name 	
		_this.ignoreWarningsInput = $j("<input />").attr( { type: 'checkbox', name: 'ignorewarnings' } ); 
		var $fileAlreadyExists = $j('<div />')
			.append(				
				gM( 'mwe-upwiz-fileexists', 
					$j('<a />')
					.attr( { target: '_new', href: href } )
					.text( title )
				),
				$j('<br />'),
				_this.ignoreWarningsInput,
				gM('mwe-upwiz-overwrite')
			);
		
		var $imageLink = $j('<a />')
			.addClass( 'image' )
			.attr( { target: '_new', href: href } )
			.append( 
				$j( '<img />')
				.addClass( 'thumbimage' )
				.attr( {
					'width' : img.thumbwidth,
					'height' : img.thumbheight,
					'border' : 0,
					'src' : img.thumburl,
					'alt' : title
				} )
			);
			
		var $imageCaption = $j( '<div />' )
			.addClass( 'thumbcaption' )
			.append( 
				$j('<div />')
				.addClass( "magnify" )
				.append(
					$j('<a />' )
					.addClass( 'internal' )
					.attr( {
						'title' : gM('mwe-upwiz-thumbnail-more'),
						'href' : href
					} ),
					
					$j( '<img />' )
					.attr( {
						'border' : 0,
						'width' : 15,
						'height' : 11,
						'src' : mw.UploadWizard.config[  'images_path'  ] + 'magnify-clip.png'
					} ), 
					
					$j('<span />')
					.html( gM( 'mwe-fileexists-thumb' ) )
				)													
			);

		$j( _this.titleErrorDiv ).html(
			$j('<span />')  // dummy argument since .html() only takes one arg
				.append(
					$fileAlreadyExists,
					$j( '<div />' )
						.addClass( 'thumb tright' )
						.append(
							$j( '<div />' )
							.addClass( 'thumbinner' )
							.css({
								'width' : ( parseInt( img.thumbwidth ) + 2 ) + 'px;'
							})
							.append( 
								$imageLink, 
								$imageCaption
							)					
						)
				)
		).show();
		*/


	}, 

	/**
	 * Do anything related to a change in the number of descriptions
	 */
	recountDescriptions: function() {
		var _this = this;
		// if there is some maximum number of descriptions, deal with that here
		$j( _this.descriptionAdder ).html( gM( 'mwe-upwiz-desc-add-' + ( _this.descriptions.length === 0 ? '0' : 'n' )  )  );
	},


	/**
	 * Add a new description
	 */
	addDescription: function( required, languageCode ) {
		var _this = this;
		if ( typeof required === 'undefined' ) {
			required = false;
		}		
	
		if ( typeof languageCode === 'undefined' ) { 
			languageCode = mw.LanguageUpWiz.UNKNOWN;
		}

		var description = new mw.UploadWizardDescription( languageCode, required  );

		if ( ! required ) {
			$j( description.div  ).append( 
				 $j.fn.removeCtrl( 'mwe-upwiz-remove-description', function() { _this.removeDescription( description ); } )
			);
		} 

		$j( _this.descriptionsDiv ).append( description.div  );

		// must defer adding rules until it's in a form
		// sigh, this would be simpler if we refactored to be more jquery style, passing DOM element downward
		description.addValidationRules( required );

		_this.descriptions.push( description  );
		_this.recountDescriptions();
	},

	/**
	 * Remove a description 
	 * @param description
	 */
	removeDescription: function( description  ) {
		var _this = this;
		$j( description.div ).remove();
		mw.UploadWizardUtil.removeItem( _this.descriptions, description  );
		_this.recountDescriptions();
	},

	/**
	 * Display an error with details
	 * XXX this is a lot like upload ui's error -- should merge
	 */
	error: function() {
		var _this = this;
		var args = Array.prototype.slice.call( arguments  ); // copies arguments into a real array
		var msg = 'mwe-upwiz-upload-error-' + args[0];
		$j( _this.errorDiv ).append( $j( '<p class="mwe-upwiz-upload-error">' + gM( msg, args.slice( 1 ) ) + '</p>' ) );
		// apply a error style to entire did
		$j( _this.div ).addClass( 'mwe-upwiz-upload-error' );
		$j( _this.dataDiv ).hide();
		$j( _this.errorDiv ).show();
	},

	/**
	 * Given the API result pull some info into the form ( for instance, extracted from EXIF, desired filename )
	 * @param result	Upload API result object
	 */
	populate: function() {
		var _this = this;
		mw.log( "populating details from upload" );
		_this.upload.setThumbnail( _this.thumbnailDiv );
		_this.prefillDate();
		_this.prefillSource();
		_this.prefillAuthor(); 
		_this.prefillTitle();
		_this.prefillLocation(); 
	},

	/**
	 * Check if we got an EXIF date back; otherwise use today's date; and enter it into the details 
	 * XXX We ought to be using date + time here...
	 * EXIF examples tend to be in ISO 8601, but the separators are sometimes things like colons, and they have lots of trailing info
	 * (which we should actually be using, such as time and timezone)
	 */
	prefillDate: function() {
		// XXX surely we have this function somewhere already
		function pad( n ) { 
			return n < 10 ? "0" + n : n;
		}

		var _this = this;
		var yyyyMmDdRegex = /^(\d\d\d\d)[:\/-](\d\d)[:\/-](\d\d)\D.*/;
		var dateObj;
		var metadata = _this.upload.imageinfo.metadata;
		$j.each([metadata.datetimeoriginal, metadata.datetimedigitized, metadata.datetime, metadata['date']], 
			function( i, imageinfoDate ) {
				if ( ! mw.isEmpty( imageinfoDate ) ) {
					var matches = imageinfoDate.trim().match( yyyyMmDdRegex );   
					if ( ! mw.isEmpty( matches ) ) {
						dateObj = new Date( parseInt( matches[1], 10 ), 
								    parseInt( matches[2], 10 ) - 1, 
								    parseInt( matches[3], 10 ) );
						return false; // break from $j.each
					}
				}
			}
		);

		// if we don't have EXIF or other metadata, let's use "now"
		// XXX if we have FileAPI, it might be clever to look at file attrs, saved 
		// in the upload object for use here later, perhaps
		if (typeof dateObj === 'undefined') {
			dateObj = new Date();
		}
		dateStr = dateObj.getUTCFullYear() + '-' + pad( dateObj.getUTCMonth() ) + '-' + pad( dateObj.getUTCDate() );

		// ok by now we should definitely have a dateObj and a date string
		$j( _this.dateInput ).val( dateStr );
		$j( _this.dateDisplayInput ).datepicker( "setDate", dateObj );
	},

	/**
	 * Set the title of the thing we just uploaded, visibly
	 * Note: the interface's notion of "filename" versus "title" is the opposite of MediaWiki
	 */
	prefillTitle: function() {
		$j( this.titleInput ).val( this.upload.title.getNameText() );
	},

	/**
 	 * Prefill location inputs (and/or scroll to position on map) from image info and metadata
	 *
	 * At least for my test images, the EXIF parser on MediaWiki is not giving back any data for
	 *  GPSLatitude, GPSLongitude, or GPSAltitudeRef. It is giving the lat/long Refs, the Altitude, and the MapDatum 
	 * So, this is broken until we fix MediaWiki's parser, OR, parse it ourselves somehow 
	 *
	 *    in Image namespace
	 *		GPSTag		Long ??
	 *
	 *    in GPSInfo namespace
	 *    GPSVersionID	byte*	2000 = 2.0.0.0
	 *    GPSLatitude	rational 
	 *    GPSLatitudeRef	ascii (N | S)  or North | South 
	 *    GPSLongitude	rational
	 *    GPSLongitudeRef   ascii (E | W)    or East | West 
	 *    GPSAltitude	rational
	 *    GPSAltitudeRef	byte (0 | 1)    above or below sea level
	 *    GPSImgDirection	rational
	 *    GPSImgDirectionRef  ascii (M | T)  magnetic or true north
	 *    GPSMapDatum 	ascii		"WGS-84" is the standard
	 *
	 *  A 'rational' is a string like this:
	 *	"53/1 0/1 201867/4096"	--> 53 deg  0 min   49.284 seconds 
	 *	"2/1 11/1 64639/4096"    --> 2 deg  11 min  15.781 seconds
	 *	"122/1"             -- 122 m  (altitude)
	 */
	prefillLocation: function() {
		var _this = this;
		var metadata = _this.upload.imageinfo.metadata;
		if (metadata === undefined) {
			return;
		}
		

	},

	/**
	 * Given a decimal latitude and longitude, return filled out {{Location}} template
	 * @param latitude decimal latitude ( -90.0 >= n >= 90.0 ; south = negative )
	 * @param longitude decimal longitude ( -180.0 >= n >= 180.0 ; west = negative )
	 * @param scale (optional) how rough the geocoding is. 
	 * @param heading (optional) what direction the camera is pointing in. (decimal 0.0-360.0, 0 = north, 90 = E)
	 * @return string with WikiText which will geotag this record
	 */
	coordsToWikiText: function(latitude, longitude, scale, heading) {
		//Wikipedia
		//http://en.wikipedia.org/wiki/Wikipedia:WikiProject_Geographical_coordinates#Parameters
		// http://en.wikipedia.org/wiki/Template:Coord
		//{{coord|61.1631|-149.9721|type:landmark_globe:earth_region:US-AK_scale:150000_source:gnis|name=Kulis Air National Guard Base}}
		
		//Wikimedia Commons
		//{{Coor dms|41|19|20.4|N|19|38|36.7|E}}
		//{{Location}}

	},

	/**
	 * If there is a way to figure out source from image info, do so here
	 * XXX user pref?
	 */
	prefillSource: function() {
		// we have no way to do this AFAICT
	},

	/**
	 * Prefill author (such as can be determined) from image info and metadata
	 * XXX user pref?
	 */
	prefillAuthor: function() {
		var _this = this;
		if (_this.upload.imageinfo.metadata.author !== undefined) {
			$j( _this.authorInput ).val( _this.upload.imageinfo.metadata.author );
		}
	
	},
	
	/**
	 * Prefill license (such as can be determined) from image info and metadata
	 * XXX user pref?
	 */
	prefillLicense: function() {
		var _this = this;
		var copyright = _this.upload.imageinfo.metadata.copyright;
		if (copyright !== undefined) {
			if (copyright.match(/\bcc-by-sa\b/i)) {
				alert("unimplemented cc-by-sa in prefillLicense"); 
				// XXX set license to be that CC-BY-SA
			} else if (copyright.match(/\bcc-by\b/i)) {
				alert("unimplemented cc-by in prefillLicense"); 
				// XXX set license to be that
			} else if (copyright.match(/\bcc-zero\b/i)) {
				alert("unimplemented cc-zero in prefillLicense"); 
				// XXX set license to be that
				// XXX any other licenses we could guess from copyright statement
			} else {
				$j( _this.licenseInput ).val( copyright );
			}
		}
		// if we still haven't set a copyright use the user's preferences?
	},

	
	/**
	 * Convert entire details for this file into wikiText, which will then be posted to the file 
	 * XXX there is a WikiText sanitizer in use on UploadForm -- use that here, or port it 
	 * @return wikitext representing all details
	 */
	getWikiText: function() {
		var _this = this;
		
		// if invalid, should produce side effects in the form
		// instructing user to fix.
		if ( ! _this.valid() ) {
			return null;
		}

		wikiText = '';
	

		// http://commons.wikimedia.org / wiki / Template:Information
	
		// can we be more slick and do this with maps, applys, joins?
		var information = { 
			'description' : '',	 // {{lang|description in lang}}*   required
			'date' : '',		 // YYYY, YYYY-MM, or YYYY-MM-DD     required  - use jquery but allow editing, then double check for sane date.
			'source' : '',    	 // {{own}} or wikitext    optional 
			'author' : '',		 // any wikitext, but particularly {{Creator:Name Surname}}   required
			'permission' : '',       // leave blank unless OTRS pending; by default will be "see below"   optional 
			'other_versions' : '',   // pipe separated list, other versions     optional
			'other_fields' : ''      // ???     additional table fields 
		};
		
		// sanity check the descriptions -- do not have two in the same lang
		// all should be a known lang
		if ( _this.descriptions.length === 0 ) {
			alert("something has gone horribly wrong, unimplemented error check for zero descriptions");
			// XXX ruh roh
			// we should not even allow them to press the button ( ? ) but then what about the queue...
		}
		$j.each( _this.descriptions, function( i, desc ) {
			information['description'] += desc.getWikiText();
		} );	

		// XXX add a sanity check here for good date
		information['date'] = $j( _this.dateInput ).val().trim();

		var deed = _this.upload.deedChooser.deed;

		information['source'] = deed.getSourceWikiText();

		information['author'] = deed.getAuthorWikiText();
		
		var info = '';
		for ( var key in information ) {
			info += '|' + key + '=' + information[key] + "\n";	
		}	

		wikiText += "=={{int:filedesc}}==\n";

		wikiText += '{{Information\n' + info + '}}\n';

		// add a location template if possible

		// add an "anything else" template if needed
		var otherInfoWikiText = $j( _this.otherInformationInput ).val().trim();
		if ( ! mw.isEmpty( otherInfoWikiText ) ) {
			wikiText += "=={{int:otherinfo}}==\n";
			wikiText += otherInfoWikiText;
		}
		
		wikiText += "=={{int:license-header}}==\n";
		
		// in the other implementations, category text follows immediately after license text. This helps 
		// group categories together, maybe?
		wikiText += deed.getLicenseWikiText() + _this.div.find( '.categoryInput' ).get(0).getWikiText();
		

		return wikiText;	
	},

	/**
	 * Post wikitext as edited here, to the file
	 * XXX This should be split up -- one part should get wikitext from the interface here, and the ajax call
	 * should be be part of upload
	 */
	submit: function( endCallback ) {
		var _this = this;

		// XXX check state of details for okayness ( license selected, at least one desc, sane filename )
		var wikiText = _this.getWikiText();
		mw.log( wikiText );

		var params = {
			action: 'upload',
			sessionkey: _this.upload.sessionKey,
			filename: _this.upload.title.getMain(),
			text: wikiText,
			summary: "User created page with " + mw.UploadWizard.userAgent
		};

		var finalCallback = function() { 
			endCallback();
			_this.completeDetailsSubmission(); 
		};	

		mw.log( "uploading!" );
		mw.log( params );
		var callback = function( result ) {
			mw.log( result );
			mw.log( "successful upload" );
			finalCallback();
		};

		_this.upload.state = 'submitting-details';
		// XXX this can still fail with bad filename, or other 'warnings' -- capture these
		_this.upload.api.postWithEditToken( params, callback );
	},


	/** 
	 * Get new image info, for instance, after we renamed... or? published? an image
	 * XXX deprecated?
	 * XXX move to mw.API
	 *
	 * @param upload an UploadWizardUpload object
	 * @param title  title to look up remotely
	 * @param endCallback  execute upon completion
	 */
	getImageInfo: function( upload, callback ) {
		var params = {
                        'titles': upload.title.toString(),
                        'prop':  'imageinfo',
                        'iiprop': 'timestamp|url|user|size|sha1|mime|metadata'
                };
		// XXX timeout callback?
		this.api.get( params, function( data ) {
			if ( data && data.query && data.query.pages ) {
				if ( ! data.query.pages[-1] ) {
					for ( var page_id in data.query.pages ) {
						var page = data.query.pages[ page_id ];
						if ( ! page.imageinfo ) {
							alert("unimplemented error check, missing imageinfo");
							// XXX not found? error
						} else {
							upload.extractImageInfo( page.imageinfo[0] );
						}
					}
				}	
			}
			callback();
		} );
	},

	completeDetailsSubmission: function() {
		var _this = this;
		_this.upload.state = 'complete';
		// de-spinnerize
		_this.upload.detailsProgress = 1.0;
	},

	dateInputCount: 0

		
};


/**
 * Object that reperesents the entire multi-step Upload Wizard
 */
mw.UploadWizard = function( config ) {

	this.uploads = [];
	this.api = new mw.Api( { url: config.apiUrl } );

	// making a sort of global for now, should be done by passing in config or fragments of config when needed
	// elsewhere
	mw.UploadWizard.config = config;

	// XXX need a robust way of defining default config 
	this.maxUploads = mw.UploadWizard.config[  'maxUploads'  ] || 10;
	this.maxSimultaneousConnections = mw.UploadWizard.config[  'maxSimultaneousConnections'  ] || 2;

};

mw.UploadWizard.DEBUG = true;

mw.UploadWizard.userAgent = "UploadWizard (alpha)";


mw.UploadWizard.prototype = {
	stepNames: [ 'file', 'deeds', 'details', 'thanks' ],
	currentStepName: undefined,

	/*
	// list possible upload handlers in order of preference
	// these should all be in the mw.* namespace
	// hardcoded for now. maybe some registry system might work later, like, all
	// things which subclass off of UploadHandler
	uploadHandlers: [
		'FirefoggUploadHandler',
		'XhrUploadHandler',
		'ApiIframeUploadHandler',
		'SimpleUploadHandler',
		'NullUploadHandler'
	],

	 * We can use various UploadHandlers based on the browser's capabilities. Let's pick one.
	 * For example, the ApiUploadHandler should work just about everywhere, but XhrUploadHandler
	 *   allows for more fine-grained upload progress
	 * @return valid JS upload handler class constructor function
	getUploadHandlerClass: function() {
		// return mw.MockUploadHandler;
		return mw.ApiUploadHandler;
		var _this = this;
		for ( var i = 0; i < uploadHandlers.length; i++ ) {
			var klass = mw[uploadHandlers[i]];
			if ( klass != undefined && klass.canRun( this.config )) {
				return klass;
			}
		}
		// this should never happen; NullUploadHandler should always work
		return null;
	},
	*/

	/**
	 * Reset the entire interface so we can upload more stuff
	 * Depending on whether we split uploading / detailing, it may actually always be as simple as loading a URL
	 */
	reset: function() {
		window.location.reload();
	},

	
	/**
	 * create the basic interface to make an upload in this div
	 * @param div	The div in the DOM to put all of this into.
	 */
	createInterface: function( selector ) {
		var _this = this;
		var div = $j( selector ).get(0);
		div.innerHTML = 
			// the arrow steps
		         '<ul id="mwe-upwiz-steps">'
		       +   '<li id="mwe-upwiz-step-file"><div>' + gM('mwe-upwiz-step-file') + '</div></li>'
		       +   '<li id="mwe-upwiz-step-deeds"><div>'  + gM('mwe-upwiz-step-deeds')  + '</div></li>'
		       +   '<li id="mwe-upwiz-step-details"><div>'  + gM('mwe-upwiz-step-details')  + '</div></li>'
		       +   '<li id="mwe-upwiz-step-thanks"><div>'   + gM('mwe-upwiz-step-thanks')  +  '</div></li>'
		       + '</ul>'

			// the individual steps, all at once
		       + '<div id="mwe-upwiz-content">'

		       +   '<div class="mwe-upwiz-stepdiv ui-helper-clearfix" id="mwe-upwiz-stepdiv-file">'
		       +     '<div id="mwe-upwiz-intro">' + gM('mwe-upwiz-intro') + '</div>'
		       +     '<div id="mwe-upwiz-files">'
		       +       '<div id="mwe-upwiz-upload-ctrls" class="mwe-upwiz-file">'
		       +          '<div id="mwe-upwiz-add-file-container" class="mwe-upwiz-add-files-0">'
		       +            '<a id="mwe-upwiz-add-file">' + gM("mwe-upwiz-add-file-0") + '</a>'
		       +	  '</div>'
		       +       '</div>'
		       +       '<div id="mwe-upwiz-progress" class="ui-helper-clearfix"></div>'
		       +     '</div>'
		       +     '<div class="mwe-upwiz-buttons" style="display: none"/>'
		       +        '<button class="mwe-upwiz-button-next" />'
		       +     '</div>'
		       +   '</div>'

		       +   '<div class="mwe-upwiz-stepdiv" id="mwe-upwiz-stepdiv-deeds">'
		       +     '<div id="mwe-upwiz-deeds-intro"></div>'
		       +     '<div id="mwe-upwiz-deeds-thumbnails" class="ui-helper-clearfix"></div>'
		       +     '<div id="mwe-upwiz-deeds" class="ui-helper-clearfix"></div>'
		       +     '<div id="mwe-upwiz-deeds-custom" class="ui-helper-clearfix"></div>'
		       +     '<div class="mwe-upwiz-buttons"/>'
		       +        '<button class="mwe-upwiz-button-next" />'
		       +     '</div>'
                       +   '</div>'

		       +   '<div class="mwe-upwiz-stepdiv" id="mwe-upwiz-stepdiv-details">'
		       +     '<div id="mwe-upwiz-macro">'
		       +       '<div id="mwe-upwiz-macro-progress" class="ui-helper-clearfix"></div>'
		       +       '<div id="mwe-upwiz-macro-choice">' 
		       +  	 '<div>' + gM( 'mwe-upwiz-details-intro' ) + '</div>' 
		       +       '</div>'
		       +       '<div id="mwe-upwiz-macro-files"></div>'
		       +     '</div>'
		       +     '<div class="mwe-upwiz-buttons"/>'
		       +        '<button class="mwe-upwiz-button-next" />'
		       +     '</div>'
		       +   '</div>'

		       +   '<div class="mwe-upwiz-stepdiv" id="mwe-upwiz-stepdiv-thanks">'
		       +     '<div id="mwe-upwiz-thanks"></div>'
		       +     '<div class="mwe-upwiz-buttons"/>'
		       +        '<button class="mwe-upwiz-button-begin"></button>'
		       +        '<br/><button class="mwe-upwiz-button-home"></button>'
		       +     '</div>'		
                       +   '</div>'

		       + '</div>'

		       + '<div class="mwe-upwiz-clearing"></div>';

		$j( '#mwe-upwiz-steps' )
			.addClass( 'ui-helper-clearfix ui-state-default ui-widget ui-helper-reset ui-helper-clearfix' )
			.arrowSteps();
 
		$j( '.mwe-upwiz-button-home' )
			.append( gM( 'mwe-upwiz-home' ) )
			.click( function() { window.location.href = '/'; } );
		
		$j( '.mwe-upwiz-button-begin' )
			.append( gM( 'mwe-upwiz-upload-another' ) )
			.click( function() { _this.reset(); } );
		


		// handler for next button
		$j( '#mwe-upwiz-stepdiv-file .mwe-upwiz-button-next')
			.append( gM( 'mwe-upwiz-next-file' ) )
			.click( function() {
			// check if there is an upload at all
			if ( _this.uploads.length === 0 ) {
				alert( gM( 'mwe-upwiz-file-need-file' ) );
				return;
			}

			_this.removeEmptyUploads();
			_this.startUploads( function() {  
			
				// okay all uploads are done, we're ready to go to the next step

				// do some last minute prep before advancing to the DEEDS page

				// these deeds are standard
				var deeds = [
					new mw.UploadWizardDeedOwnWork( _this.uploads.length ),
					new mw.UploadWizardDeedThirdParty( _this.uploads.length )
				];
				
				// if we have multiple uploads, also give them the option to set
				// licenses individually
				if ( _this.uploads.length > 1 ) {
					var customDeed = $j.extend( new mw.UploadWizardDeed(), {
						valid: function() { return true; },
						name: 'custom'
					} );
					deeds.push( customDeed );
				}

				_this.deedChooser = new mw.UploadWizardDeedChooser( 
					'#mwe-upwiz-deeds', 
					deeds,
					_this.uploads.length );
			
				$j( '<div>' ).html( gM( 'mwe-upwiz-deeds-macro-prompt', _this.uploads.length ) )
					.insertBefore ( _this.deedChooser.$selector.find( '.mwe-upwiz-deed-ownwork' ) );

				if ( _this.uploads.length > 1 ) {
					$j( '<div style="margin-top: 1em">' ).html( gM( 'mwe-upwiz-deeds-custom-prompt' ) ) 
						.insertBefore( _this.deedChooser.$selector.find( '.mwe-upwiz-deed-custom' ) );
				}

				
				_this.moveToStep( 'deeds' ); 

			} );		
		} );


		// DEEDS div

		$j( '#mwe-upwiz-deeds-intro' ).html( gM( 'mwe-upwiz-deeds-intro' ) );

		$j( '#mwe-upwiz-stepdiv-deeds .mwe-upwiz-button-next')
			.append( gM( 'mwe-upwiz-next-deeds' ) )
			.click( function() {
				// validate has the side effect of notifying the user of problems, or removing existing notifications.
				// if returns false, you can assume there are notifications in the interface.
				if ( _this.deedChooser.valid() ) {

					var lastUploadIndex = _this.uploads.length - 1; 

					$j.each( _this.uploads, function( i, upload ) {

						if ( _this.deedChooser.deed.name == 'custom' ) {
							upload.details.useCustomDeedChooser();
						} else {
							upload.deedChooser = _this.deedChooser;
						}

						/* put a border below every details div except the last */
						if ( i < lastUploadIndex ) {
							upload.details.div.css( 'border-bottom', '1px solid #e0e0e0' );
						}

						// only necessary if (somehow) they have beaten the check-as-you-type
						upload.details.titleInput.checkUnique();
					} );

					_this.moveToStep( 'details' );
				}
			} );


		// DETAILS div

		$j( '#mwe-upwiz-stepdiv-details .mwe-upwiz-button-next' )
			.append( gM( 'mwe-upwiz-next-details' ) )
			.click( function() {
				if ( _this.detailsValid() ) { 
					_this.detailsSubmit( function() { 
						_this.prefillThanksPage();
						_this.moveToStep( 'thanks' );
					} );
				}
			} );


	
		// WIZARD 
	
		// add one upload field to start (this is the big one that asks you to upload something)
		var upload = _this.newUpload( '#mwe-upwiz-add-file' );

		// "select" the first step - highlight, make it visible, hide all others
		_this.moveToStep( 'file', function() { 
			// XXX moving the file input doesn't seem to work at this point; we get its old position before
			// CSS is applied. Hence, using a timeout.
			// XXX using a timeout is lame, are there other options?
			// XXX Trevor suggests that using addClass() may queue stuff unnecessarily; use 'concrete' HTML
			setTimeout( function() {	
				upload.ui.moveFileInputToCover( '#mwe-upwiz-add-file' );
			}, 300 );
		} );

	},

	/**
	 * Advance one "step" in the wizard interface.
	 * It is assumed that the previous step to the current one was selected.
	 * We do not hide the tabs because this messes up certain calculations we'd like to make about dimensions, while elements are not 
	 * on screen. So instead we make the tabs zero height and, in CSS, they are already overflow hidden
	 * @param selectedStepName
	 * @param callback to do after layout is ready?
	 */
	moveToStep: function( selectedStepName, callback ) {
		var _this = this;
		$j.each( _this.stepNames, function(i, stepName) {
			
			// the step indicator	
			var step = $j( '#mwe-upwiz-step-' + stepName );
			
			// the step's contents
			var stepDiv = $j( '#mwe-upwiz-stepdiv-' + stepName );

			if ( _this.currentStepName == stepName ) {
				stepDiv.hide();
				// we hide the old stepDivs because we are afraid of some z-index elements that may interfere with later tabs
				// this will break if we ever allow people to page back and forth.
			} else {
				if ( selectedStepName == stepName ) {
					stepDiv.maskSafeShow();
				} else {
					stepDiv.maskSafeHide( 1000 );
				}
			}
			
		} );
			
		$j( '#mwe-upwiz-steps' ).arrowStepsHighlight( '#mwe-upwiz-step-' + selectedStepName );

		_this.currentStepName = selectedStepName;

		$j.each( _this.uploads, function(i, upload) {
			upload.state = selectedStepName;
		} );

		if ( callback ) {
			callback();
		}
	},

	/**
	 * add an Upload
	 *   we create the upload interface, a handler to transport it to the server,
	 *   and UI for the upload itself and the "details" at the second step of the wizard.
	 *   we don't yet add it to the list of uploads; that only happens when it gets a real file.
	 * @return the new upload 
	 */
	newUpload: function() {
		var _this = this;
		if ( _this.uploads.length == _this.maxUploads ) {
			return false;
		}

		var upload = new mw.UploadWizardUpload( _this.api, '#mwe-upwiz-files' );
		_this.uploadToAdd = upload;

		upload.ui.moveFileInputToCover( '#mwe-upwiz-add-file' );
		// we bind to the ui div since unbind doesn't work for non-DOM objects

		$j( upload.ui.div ).bind( 'filenameAccepted', function(e) { _this.updateFileCounts();  e.stopPropagation(); } );
		$j( upload.ui.div ).bind( 'removeUploadEvent', function(e) { _this.removeUpload( upload ); e.stopPropagation(); } );
		$j( upload.ui.div ).bind( 'filled', function(e) { 
			mw.log( "filled! received!" );
			_this.newUpload(); 
			mw.log( "filled! new upload!" );
			_this.setUploadFilled(upload);
			mw.log( "filled! set upload filled!" );
			e.stopPropagation(); 
			mw.log( "filled! stop propagation!" ); 
		} );
		// XXX bind to some error state

	
		return upload;
	},

	/**
	 * When an upload is filled with a real file, accept it in the wizard's list of uploads
	 * and set up some other interfaces
	 * @param UploadWizardUpload
	 */
	setUploadFilled: function( upload ) {
		var _this = this;
		
		// XXX check if it has a file? 
		_this.uploads.push( upload );
		
		/* useful for making ids unique and so on */
		_this.uploadsSeen++;
		upload.index = _this.uploadsSeen;

		_this.updateFileCounts();
		
		upload.deedPreview = new mw.UploadWizardDeedPreview( upload );	

		// XXX do we really need to do this now? some things will even change after step 2.
		// legacy.
		// set up details
		upload.details = new mw.UploadWizardDetails( upload, $j( '#mwe-upwiz-macro-files' ) );
	},

	/* increments with every upload */
	uploadsSeen: 0,

	/**
	 * Remove an upload from our array of uploads, and the HTML UI 
	 * We can remove the HTML UI directly, as jquery will just get the parent.
         * We need to grep through the array of uploads, since we don't know the current index. 
	 * We need to update file counts for obvious reasons.
	 *
	 * @param upload
	 */
	removeUpload: function( upload ) {
		var _this = this;
		// remove the div that passed along the trigger
		var $div = $j( upload.ui.div );
		$div.unbind(); // everything
		// sexily fade away
		$div.fadeOut('fast', function() { 
			$div.remove(); 
			// and do what we in the wizard need to do after an upload is removed
			mw.UploadWizardUtil.removeItem( _this.uploads, upload );
			_this.updateFileCounts();
		});
	},

	/**
	 * This is useful to clean out unused upload file inputs if the user hits GO.
	 * We are using a second array to iterate, because we will be splicing the main one, _this.uploads
	 */
	removeEmptyUploads: function() {
		var _this = this;
		var toRemove = [];

		for ( var i = 0; i < _this.uploads.length; i++ ) {
			if ( mw.isEmpty( _this.uploads[i].ui.fileInputCtrl.value ) ) {
				toRemove.push( _this.uploads[i] );
			}
		}

		for ( var j = 0; j < toRemove.length; j++ ) {
			toRemove[j].remove();
		}
	},

	/**
	 * Manage transitioning all of our uploads from one state to another -- like from "new" to "uploaded".
	 *
	 * @param beginState   what state the upload should be in before starting.
	 * @param progressState  the state to set the upload to while it's doing whatever 
	 * @param endState   the state to set the upload to after it's done whatever 
	 * @param starter	 function, taking single argument (upload) which starts the process we're interested in 
	 * @param endCallback    function to call when all uploads are in the end state.
	 */
	makeTransitioner: function( beginState, progressState, endState, starter, endCallback ) {
		
		var _this = this;

		var transitioner = function() {
			var uploadsToStart = _this.maxSimultaneousConnections;
			var endStateCount = 0;
			$j.each( _this.uploads, function(i, upload) {
				if ( upload.state == endState ) {
					endStateCount++;
				} else if ( upload.state == progressState ) {
					uploadsToStart--;
				} else if ( ( upload.state == beginState ) && ( uploadsToStart > 0 ) ) {
					starter( upload );
					uploadsToStart--;
				}
			} );

			// build in a little delay even for the end state, so user can see progress bar in a complete state.
			var nextAction = ( endStateCount == _this.uploads.length ) ? endCallback : transitioner;
	
			setTimeout( nextAction, _this.transitionerDelay );
		};

		transitioner();
	},

	transitionerDelay: 200,  // milliseconds


	/**
	 * Kick off the upload processes.
	 * Does some precalculations, changes the interface to be less mutable, moves the uploads to a queue, 
	 * and kicks off a thread which will take from the queue.
	 * @param endCallback   - to execute when uploads are completed
	 */
	startUploads: function( endCallback ) {
		var _this = this;
		// remove the upload button, and the add file button
		$j( '#mwe-upwiz-upload-ctrls' ).hide();
		$j( '#mwe-upwiz-add-file' ).hide();

		var allowCloseWindow = $j().preventCloseWindow( { 
			message: gM( 'mwe-prevent-close')
		} );


		var progressBar = new mw.GroupProgressBar( '#mwe-upwiz-progress', 
						           gM( 'mwe-upwiz-uploading' ), 
						           _this.uploads, 
						           'transported',  
							   'transportProgress', 
							   'transportWeight' );
		progressBar.start();
		

		// remove ability to change files
		// ideally also hide the "button"... but then we require styleable file input CSS trickery
		// although, we COULD do this just for files already in progress...

		// it might be interesting to just make this creational -- attach it to the dom element representing 
		// the progress bar and elapsed time	
		_this.makeTransitioner( 
			'new', 
			'transporting', 
			'transported', 
			function( upload ) {
				upload.start();
			},
		        function() {
				allowCloseWindow();
				$j().notify( gM( 'mwe-upwiz-files-complete' ) );
				endCallback();
		  	} 
		);
	},

	
	
	/**
	 * Occurs whenever we need to update the interface based on how many files there are 
	 * Thhere is an uncounted upload, waiting to be used, which has a fileInput which covers the
	 * "add an upload" button. This is absolutely positioned, so it needs to be moved if another upload was removed.
	 * The uncounted upload is also styled differently between the zero and n files cases
	 */
	updateFileCounts: function() {
		var _this = this;

		if ( _this.uploads.length ) {
			$j( '#mwe-upwiz-upload-ctrl' ).removeAttr( 'disabled' ); 
			$j( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons' ).show();
			$j( '#mwe-upwiz-add-file' ).html( gM( 'mwe-upwiz-add-file-n' ) );
			$j( '#mwe-upwiz-add-file-container' ).removeClass('mwe-upwiz-add-files-0');
			$j( '#mwe-upwiz-add-file-container' ).addClass('mwe-upwiz-add-files-n');
			$j( '#mwe-upwiz-files .mwe-upwiz-file.filled:odd' ).addClass( 'odd' );
			$j( '#mwe-upwiz-files .mwe-upwiz-file:filled:even' ).removeClass( 'odd' );
		} else {
			$j( '#mwe-upwiz-upload-ctrl' ).attr( 'disabled', 'disabled' ); 
			$j( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons' ).hide();
			$j( '#mwe-upwiz-add-file' ).html( gM( 'mwe-upwiz-add-file-0' ) );
			$j( '#mwe-upwiz-add-file-container' ).addClass('mwe-upwiz-add-files-0');
			$j( '#mwe-upwiz-add-file-container' ).removeClass('mwe-upwiz-add-files-n');
		}

		if ( _this.uploads.length < _this.maxUploads ) {
			$j( '#mwe-upwiz-add-file' ).removeAttr( 'disabled' );
			$j( _this.uploadToAdd.ui.div ).show();
			_this.uploadToAdd.ui.moveFileInputToCover( '#mwe-upwiz-add-file' );
		} else {
			$j( '#mwe-upwiz-add-file' ).attr( 'disabled', true );
			$j( _this.uploadToAdd.ui.div ).hide();
		}


	},


	/**
	 * are all the details valid?
	 * @return boolean
	 */ 
	detailsValid: function() {
		var _this = this;
		var valid = true;
		$j.each( _this.uploads, function(i, upload) { 
			valid &= upload.details.valid();
		} );
		return valid;
	},

	/**
	 * Submit all edited details and other metadata
	 * Works just like startUploads -- parallel simultaneous submits with progress bar.
	 */
	detailsSubmit: function( endCallback ) {
		var _this = this;
		// some details blocks cannot be submitted (for instance, identical file hash)
		_this.removeBlockedDetails();

		// XXX validate all 

		// remove ability to edit details
		$j.each( _this.uploads, function( i, upload ) {
			upload.details.div.mask();
			upload.details.div.data( 'mask' ).loadingSpinner();
		} );

		// add the upload progress bar, with ETA
		// add in the upload count 
		_this.makeTransitioner(
			'details', 
			'submitting-details', 
			'complete', 
			function( upload ) {
				upload.details.submit( function() { 
					upload.details.div.data( 'mask' ).html();
				} );
			},
			endCallback
		);
	},

	/**
	 * Removes(?) details that we can't edit for whatever reason -- might just advance them to a different state?
	 */
	removeBlockedDetails: function() {
		// TODO	
	},


	prefillThanksPage: function() {
		var _this = this;
		
		$j( '#mwe-upwiz-thanks' )
			.append( $j( '<h3 style="text-align: center;">' ).append( gM( 'mwe-upwiz-thanks-intro' ) ),
				 $j( '<p style="margin-bottom: 2em; text-align: center;">' )
					.append( gM( 'mwe-upwiz-thanks-explain', _this.uploads.length ) ) );
		
		$j.each( _this.uploads, function(i, upload) {
			var thanksDiv = $j( '<div class="mwe-upwiz-thanks ui-helper-clearfix" />' );
			_this.thanksDiv = thanksDiv;
			
			var thumbnailDiv = $j( '<div class="mwe-upwiz-thumbnail mwe-upwiz-thumbnail-side"></div>' );
			upload.setThumbnail( thumbnailDiv );
			thumbnailDiv.append( $j('<p/>').append( 
						$j( '<a />' )
							.attr( { target: '_new', 
								 href: upload.imageinfo.descriptionurl } )
							.text( upload.title ) 
					) );

			thanksDiv.append( thumbnailDiv );

			var thumbWikiText = "[[" + upload.title + "|thumb|Add caption here]]";

			thanksDiv.append(
				$j( '<div class="mwe-upwiz-data"></div>' )
					.append( 
						$j('<p/>').append( 
							gM( 'mwe-upwiz-thanks-wikitext' ),
							$j( '<br />' ),
						 	$j( '<textarea class="mwe-long-textarea" rows="2"/>' )
								.growTextArea()
								.readonly()
								.append( thumbWikiText ) 
								.trigger('resizeEvent')
						),
						$j('<p/>').append( 
							gM( 'mwe-upwiz-thanks-url' ),
							$j( '<br />' ),
						 	$j( '<textarea class="mwe-long-textarea" rows="2"/>' )
								.growTextArea()
								.readonly()
								.append( upload.imageinfo.descriptionurl ) 
								.trigger('resizeEvent')
						)
					)
			);

			$j( '#mwe-upwiz-thanks' ).append( thanksDiv );
		} ); 
	},

	/**
	 *
	 */
	pause: function() {

	},

	/**
	 *
	 */
	stop: function() {

	}
};


mw.UploadWizardDeedPreview = function(upload) {
	this.upload = upload;
};

mw.UploadWizardDeedPreview.prototype = {
	setup: function() {
		var _this = this;
		// add a preview on the deeds page
		var thumbnailDiv = $j( '<div class="mwe-upwiz-thumbnail-small"></div>' );
		$j( '#mwe-upwiz-deeds-thumbnails' ).append( thumbnailDiv );
		_this.upload.setThumbnail( thumbnailDiv, mw.UploadWizard.config[  'smallThumbnailWidth'  ] );
	}
};
	/**
	 * Create 'remove' control, an X which highlights in some standardized way.
	 */
	$j.fn.removeCtrl = function( tooltipMsgKey, callback ) {
		return $j( '<div class="mwe-upwiz-remove-ctrl ui-corner-all" />' )
			.attr( 'title', gM( tooltipMsgKey ) )
			.click( callback )
			.hover( function() { $j( this ).addClass( 'hover' ); },
				function() { $j( this ).removeClass( 'hover' ); } )
			.append( $j( '<span class="ui-icon ui-icon-close" />' ) );
	};

	/**
	 * Prevent the closing of a window with a confirm message (the onbeforeunload event seems to 
	 * work in most browsers 
	 * e.g.
	 *       var allowCloseWindow = jQuery().preventCloseWindow( { message: "Don't go away!" } );
	 *       // ... do stuff that can't be interrupted ...
	 *       allowCloseWindow();
	 *
	 * @param options 	object which should have a message string, already internationalized
	 * @return closure	execute this when you want to allow the user to close the window
	 */
	$j.fn.preventCloseWindow = function( options ) {
		if ( typeof options === 'undefined' ) {
			options = {};
		}

		if ( typeof options.message === 'undefined' ) {
			options.message = 'Are you sure you want to close this window?';
		}
		
		$j( window ).unload( function() { 
			return options.message;
		} );
		
		return function() { 
			$j( window ).removeAttr( 'unload' );
		};
				
	};


	$j.fn.notify = function ( message ) {
		// could do something here with Chrome's in-browser growl-like notifications.
		// play a sound?
		// if the current tab does not have focus, use an alert?
		// alert( message );
	};

	$j.fn.enableNextButton = function() {
		return this.find( '.mwe-upwiz-button-next' )
			.removeAttr( 'disabled' );
		//	.effect( 'pulsate', { times: 3 }, 1000 );
	};

	$j.fn.disableNextButton = function() {
		return this.find( '.mwe-upwiz-button-next' )
			.attr( 'disabled', true );
	};

	$j.fn.readonly = function() {
		return this.attr( 'readonly', 'readonly' ).addClass( 'mwe-readonly' );
	};

	/* will change in RTL, but I can't think of an easy way to do this with only CSS */
	$j.fn.requiredFieldLabel = function() {
		this.addClass( 'mwe-upwiz-required-field' );
		return this.prepend( $j( '<span/>' ).append( '*' ).addClass( 'mwe-upwiz-required-marker' ) );
	};


	/**
	 * jQuery extension. Makes a textarea automatically grow if you enter overflow
	 * (This feature was in the old Commons interface with a confusing arrow icon; it's nicer to make it automatic.)
	 */
	jQuery.fn.growTextArea = function( options ) {

		// this is a jquery-style object

		// in MSIE, this makes it possible to know what scrollheight is 
		// Technically this means text could now dangle over the edge, 
		// but it shouldn't because it will always grow to accomodate very quickly.

		if ($j.msie) {
			this.each( function(i, textArea) {
				textArea.style.overflow = 'visible';
			} );
		}

		var resizeIfNeeded = function() {
			// this is the dom element
			// is there a better way to do this?
			if (this.scrollHeight >= this.offsetHeight) {
				this.rows++;
				while (this.scrollHeight > this.offsetHeight) {
					this.rows++;	
				}
			}
			return this;
		};

		this.addClass( 'mwe-grow-textarea' );

		this.bind( 'resizeEvent', resizeIfNeeded );
		
		this.keyup( resizeIfNeeded );
		this.change( resizeIfNeeded );


		return this;
	};

	jQuery.fn.mask = function( options ) {

		// intercept clicks... 
		// Note: the size of the div must be obtainable. Hence, this cannot be a div without layout (e.g. display:none).
		// some of this is borrowed from http://code.google.com/p/jquery-loadmask/ , but simplified
		$j.each( this, function( i, el ) {
			
			if ( ! $j( el ).data( 'mask' ) ) {
				

				//fix for z-index bug with selects in IE6
				if ( $j.browser.msie && $j.browser.version.substring(0,1) === '6' ){
					el.find( "select" ).addClass( "masked-hidden" );
				}

				var mask = $j( '<div />' )
						.css( { 'position' : 'absolute',
							'top'      : '0px', 
							'left'     : '0px',
							'width'	   : el.offsetWidth + 'px',
							'height'   : el.offsetHeight + 'px',
							'z-index'  : 100 } )
						.click( function( e ) { e.stopPropagation(); } );

				$j( el ).css( { 'position' : 'relative' } )	
					.fadeTo( 'fast', 0.5 )
					.append( mask )
					.data( 'mask', mask );

				//auto height fix for IE -- not sure about this, i think offsetWidth + Height is a better solution. Test!
				/*
				if( $j.browser.msie ) {
					mask.height(el.height() + parseInt(el.css("padding-top")) + parseInt(el.css("padding-bottom")));
					mask.width(el.width() + parseInt(el.css("padding-left")) + parseInt(el.css("padding-right")));
				}
				*/

			} 
			// XXX bind to a custom event in case the div size changes 
		} );

		return this;

	};

	jQuery.fn.unmask = function( options ) {

		$j.each( this, function( i, el ) {
			if ( $j( el ).data( 'mask' ) ) {
				var mask = $j( el ).data( 'mask' );
				$j( el ).removeData( 'mask' ); // from the data
				mask.remove(); // from the DOM
				$j( el ).fadeTo( 'fast', 1.0 );
			}
		} );

		
		return this;
	};


	/** 
	 * Safe hide and show
	 * Rather than use display: none, this collapses the divs to zero height
	 * This is good because then the elements in the divs still have layout and we can do things like mask and unmask (above)
	 * XXX may be obsolete as we are not really doing this any more
	 * disable form fields so we do not tab through them when hidden
	 * XXX for some reason the disabling doesn't work with the date field.
	 */ 

	jQuery.fn.maskSafeHide = function( options ) {
		$j.each( this.find( ':enabled' ), function(i, input) {
			$j( input ).data( 'wasEnabled', true )
				   .attr( 'disabled', 'disabled' );
		} );
		return this.css( { 'height' : '0px', 'overflow' : 'hidden' } );
	};

	// may be causing scrollbar to appear when div changes size
	// re-enable form fields (disabled so we did not tab through them when hidden)
	jQuery.fn.maskSafeShow = function( options ) {
		$j.each( this.find( ':disabled' ), function (i, input) {
			if ($j( input ).data( 'wasEnabled' )) {
				$j( input ).removeAttr( 'disabled' )
					   .removeData( 'wasEnabled' ); 
			}
		} );
		return this.css( { 'height' : 'auto', 'overflow' : 'visible' } );
	};

	$j.validator.setDefaults( {
		debug: true,
		errorClass: 'mwe-validator-error'
	} );

} )( jQuery );
