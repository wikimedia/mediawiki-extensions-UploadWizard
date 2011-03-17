
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
		.keyup( function() { 
			_this.upload.title.setNameText( _this.titleInput.value );
			// TODO update a display of filename 
		} )
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

	var titleHintId = 'mwe-upwiz-title-hint-' + _this.upload.index;
	var $titleDialog = $('<div>')
		.html( gM( 'mwe-upwiz-dialog-title' ) )
		.dialog({
			width: 500,
			zIndex: 200000,
			autoOpen: false,
			title: gM( 'mwe-upwiz-help-popup' ) + ': ' + gM( 'mwe-upwiz-help-popup-title' ),
			modal: true
		})
		.bind( "dialogclose", function( event, ui ) { 
			$j( '#' + titleHintId ).tipsy( "hide" );
		});

	// tipsy hides tips by removing them from the DOM. This causes all bindings to be lost.
	// so we send a function to recreate everything, every time!
	// (is it really necessary for tipsy to remove elements?)
	var titleHinter = function() { 
		return $j( '<span>' ).msg( 'mwe-upwiz-tooltip-title', function() { 
			$titleDialog.dialog( 'open' ); 
			// TODO scroll to the dialog, or otherwise ensure it's in the middle of the page no matter what
		} );
	};

	var titleContainerDiv = $j('<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>')
		.append(
			_this.titleErrorDiv, 
			$j( '<div class="mwe-upwiz-details-fieldname"></div>' )
				.requiredFieldLabel()
				.msg( 'mwe-upwiz-title' )
				.addHint( titleHintId, titleHinter ), 
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
	var commonsCategoriesLink = $j( '<a>' ).attr( { 'target': '_blank', 'href': 'http://commons.wikimedia.org/wiki/Commons:Categories' } );
	var categoriesHint = $j( '<span>' ).msg( 'mwe-upwiz-tooltip-categories', commonsCategoriesLink );
	var categoriesHinter = function() { return categoriesHint; };
	$categoriesDiv
		.find( '.mwe-upwiz-details-fieldname' )
		.append( gM( 'mwe-upwiz-categories' ) )
		.addHint( 'mwe-upwiz-categories-hint', categoriesHinter );
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
		.growTextArea();

	var otherInformationDiv = $j('<div></div>')	
		.append( $j( '<div class="mwe-upwiz-details-more-label">' ).append( gM( 'mwe-upwiz-other' ) ).addHint( 'other' ) )
		.append( _this.otherInformationInput );

	$j( moreDetailsDiv ).append( 
		dateInputDiv, 
		// location goes here
		otherInformationDiv
	);
	
		
	/* Build the form for the file upload */
	_this.$form = $j( '<form></form>' );
	_this.$form.append( 
		titleContainerDiv,
		_this.descriptionsDiv, 
		descriptionAdderDiv,
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
			altFormat: 'yy-mm-dd',
			minDate: new Date( 1800, 0, 1 )
		} )
		.click( function() { $j( this ).datepicker( 'show' ); } )
		.readonly();

	_this.$form.find( '.mwe-date' )	
		.bind( 'change', function() { $j( this ).valid(); } )
		.hide();
	
	/* if the date is not valid, we need to pop open the "more options". How? 
	   guess we'll revalidate it with element */

	mw.UploadWizardUtil.makeToggler( moreDetailsCtrlDiv, moreDetailsDiv );	

	_this.addDescription( true, mw.config.get( 'wgUserLanguage' ) );
	$j( containerDiv ).append( _this.div );

	// make this a category picker
	var hiddenCats = [];
	if ( mw.isDefined( mw.UploadWizard.config.autoCategory ) ) {
		hiddenCats.push( mw.UploadWizard.config.autoCategory );
	}
	$categoriesDiv.find( '.mwe-upwiz-details-input' )
			.find( 'input' )
			.mwCoolCats( { 
				hiddenCats: hiddenCats,
				buttontext: gM( 'mwe-upwiz-categories-add' )  
			} );

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
		var deedValid = _this.upload.deedChooser.valid();
		return titleInputValid && formValid && deedValid;

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
			  new mw.UploadWizardDeedThirdParty()]
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
				 $j.fn.removeCtrl( null, 'mwe-upwiz-remove-description', function() { _this.removeDescription( description ); } )
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
		_this.upload.setThumbnail( _this.thumbnailDiv, mw.UploadWizard.config['thumbnailWidth'], mw.UploadWizard.config['thumbnailMaxHeight'] );
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
					var matches = $j.trim( imageinfoDate ).match( yyyyMmDdRegex );   
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
		information['date'] = $j.trim( $j( _this.dateInput ).val() );

		var deed = _this.upload.deedChooser.deed;

		information['source'] = deed.getSourceWikiText();

		information['author'] = deed.getAuthorWikiText();
		
		var info = '';
		for ( var key in information ) {
			info += '|' + key + '=' + information[key] + "\n";	
		}	

		wikiText += "=={{int:filedesc}}==\n";

		wikiText += '{{Information\n' + info + '}}\n\n';

		// add a location template if possible

		// add an "anything else" template if needed
		var otherInfoWikiText = $j.trim( $j( _this.otherInformationInput ).val() );
		if ( ! mw.isEmpty( otherInfoWikiText ) ) {
			wikiText += otherInfoWikiText + "\n\n";
		}
		
		wikiText += "=={{int:license-header}}==\n";
		
		// in the other implementations, category text follows immediately after license text. This helps 
		// group categories together, maybe?
		wikiText += deed.getLicenseWikiText() + _this.div.find( '.categoryInput' ).get(0).getWikiText() + "\n\n";
		

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

		var params = {
			action: 'upload',
			sessionkey: _this.upload.sessionKey,
			filename: _this.upload.title.getMain(),
			text: wikiText,
			summary: "User created page with " + mw.UploadWizard.userAgent
		};

		var finalCallback = function( result ) { 
			endCallback( result );
			_this.completeDetailsSubmission(); 
		};	

		var callback = function( result ) {
			finalCallback( result );
		};

		_this.upload.state = 'submitting-details';
		// XXX this can still fail with bad filename, or other 'warnings' -- capture these
		_this.upload.api.postWithEditToken( params, callback );
	},

	completeDetailsSubmission: function() {
		var _this = this;
		_this.upload.state = 'complete';
		// de-spinnerize
		_this.upload.detailsProgress = 1.0;
	},

	dateInputCount: 0

		
};
