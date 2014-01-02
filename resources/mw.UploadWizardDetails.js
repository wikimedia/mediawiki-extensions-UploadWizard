/**
 * Object that represents the Details (step 2) portion of the UploadWizard
 * n.b. each upload gets its own details.
 *
 * XXX a lot of this construction is not really the jQuery way.
 * The correct thing would be to have some hidden static HTML
 * on the page which we clone and slice up with selectors. Inputs can still be members of the object
 * but they'll be found by selectors, not by creating them as members and then adding them to a DOM structure.
 *
 * @param UploadWizardUpload
 * @param API
 * @param containerDiv	The div to put the interface into
 */
( function( mw, $ ) {

var fileNsId = mw.config.get( 'wgNamespaceIds' ).file;

mw.UploadWizardDetails = function( upload, api, containerDiv ) {

	var _this = this;
	_this.upload = upload;
	_this.containerDiv = containerDiv;
	_this.api = api;

	_this.descriptions = [];

	_this.div = $( '<div class="mwe-upwiz-info-file ui-helper-clearfix filled"></div>' );

	_this.thumbnailDiv = $( '<div class="mwe-upwiz-thumbnail mwe-upwiz-thumbnail-side"></div>' );

	_this.dataDiv = $( '<div class="mwe-upwiz-data"></div>' );

	// descriptions
	_this.descriptionsDiv = $( '<div class="mwe-upwiz-details-descriptions"></div>' );

	_this.descriptionAdder = $( '<a class="mwe-upwiz-more-options"/>' )
					.text( mw.message( 'mwe-upwiz-desc-add-0' ).text() )
					.click( function( ) { _this.addDescription(); } );

	var descriptionAdderDiv =
		$( '<div />' ).append(
			$( '<div class="mwe-upwiz-details-fieldname" />' ),
			$( '<div class="mwe-upwiz-details-descriptions-add" />' )
					.append( _this.descriptionAdder )
		);

	// Commons specific help for titles
	//    http://commons.wikimedia.org/wiki/Commons:File_naming
	//    http://commons.wikimedia.org/wiki/MediaWiki:Filename-prefix-blacklist
	//    XXX make sure they can't use ctrl characters or returns or any other bad stuff.
	_this.titleId = "title" + _this.upload.index;
	_this.titleInput = $( '<input type="text" id="' + _this.titleId + '" name="' + _this.titleId + '" class="mwe-title" maxlength="250"/>' )
		.keyup( function() {
			_this.setCleanTitle( $( _this.titleInput ).val() );
		} )
		.destinationChecked( {
			api: _this.upload.api,
			spinner: function(bool) { _this.toggleDestinationBusy(bool); },
			preprocess: function( name ) {
				// First, clear out any existing errors, to prevent strange visual effects.
				// Fixes bug 32469.
				_this.$form.find( 'label[for=' + _this.titleId + ']' ).empty();
				if ( name !== '' ) {
					// turn the contents of the input into a MediaWiki title ("File:foo_bar.jpg") to look up
					// side effect -- also sets this as our current title
					return _this.setCleanTitle( name ).toString();
				} else {
					return name;
				}
			},
			processResult: function( result ) { _this.processDestinationCheck( result ); }
		} );

	_this.titleErrorDiv = $(
		'<div class="mwe-upwiz-details-input-error">' +
			'<label class="mwe-error mwe-validator-error" for="' + _this.titleId + '" generated="true"/>' +
			'<label class="mwe-error errorTitleUnique" for="' + _this.titleId + '" generated="true"/>' +
			'<label class="mwe-error errorRecovery" for="' + _this.titleId + '" generated="true"/>' +
		'</div>'
	);

	var titleContainerDiv = $('<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>')
		.append(
			_this.titleErrorDiv,
			$( '<div class="mwe-upwiz-details-fieldname"></div>' )
				.msg( 'mwe-upwiz-title' )
				.requiredFieldLabel()
				.addHint( 'title' ),
			$( '<div class="mwe-upwiz-details-input"></div>' ).append( _this.titleInput )
		);

	_this.deedDiv = $( '<div class="mwe-upwiz-custom-deed" />' );

	_this.copyrightInfoFieldset = $('<fieldset class="mwe-fieldset mwe-upwiz-copyright-info"></fieldset>')
		.hide()
		.append(
			$( '<legend class="mwe-legend">' ).text( mw.message( 'mwe-upwiz-copyright-info' ).text() ),
			_this.deedDiv
		);

	var $categoriesDiv = $(
		'<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix">' +
			'<div class="mwe-upwiz-details-fieldname"></div>' +
			'<div class="mwe-upwiz-details-input"></div>' +
		'</div>'
	);
	var commonsCategoriesLink = $( '<a>' ).attr( { 'target': '_blank', 'href': 'http://commons.wikimedia.org/wiki/Commons:Categories' } );
	var categoriesHint = $( '<span>' ).msg( 'mwe-upwiz-tooltip-categories', commonsCategoriesLink ).html();
	var categoriesHinter = function() { return categoriesHint; };
	$categoriesDiv
		.find( '.mwe-upwiz-details-fieldname' )
		.append( mw.message( 'mwe-upwiz-categories' ).escaped() )
		.addHint( 'mwe-upwiz-categories-hint', categoriesHinter );
	var categoriesId = 'categories' + _this.upload.index;
	$categoriesDiv.find( '.mwe-upwiz-details-input' )
		.append( $( '<input type="text"/>' ).attr( { 
						id: categoriesId,
						name: categoriesId } )
		);

	var dateInputId = "dateInput" + ( _this.upload.index ).toString();

	var dateErrorDiv = $('<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + dateInputId + '" generated="true"/></div>');

	/* XXX must localize this by loading jquery.ui.datepicker-XX.js where XX is a language code */
	/* jQuery.ui.datepicker also modifies first-day-of-week according to language, which is somewhat wrong. */
	/* $.datepicker.setDefaults() for other settings */
	_this.dateInput =
		$( '<input type="text" id="' + dateInputId + '" name="' + dateInputId + '" type="text" class="mwe-date" size="20"/>' );

	var dateInputDiv = $( '<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
		.append(
			dateErrorDiv,
			$( '<div class="mwe-upwiz-details-fieldname"></div>' ).text( mw.message( 'mwe-upwiz-date-created' ).text() ).requiredFieldLabel().addHint( 'date' ),
			$( '<div class="mwe-upwiz-details-input"></div>' ).append( _this.dateInput ) );

	var moreDetailsCtrlDiv = $( '<div class="mwe-upwiz-details-more-options"></div>' );

	var moreDetailsDiv = $('<div class="mwe-more-details"></div>');

	var otherInformationId = "otherInformation" + _this.upload.index;
	_this.otherInformationInput = $( '<textarea id="' + otherInformationId + '" name="' + otherInformationId + '" class="mwe-upwiz-other-textarea"></textarea>' )
		.growTextArea();

	var otherInformationDiv = $('<div>')
		.append( $( '<div class="mwe-upwiz-details-more-label"></div>' ).text( mw.message( 'mwe-upwiz-other' ).text() ).addHint( 'other' ) )
		.append( _this.otherInformationInput );

	/* Altitude is not yet supported by any of the geo tools deployed on WMF sites */
	var latId = "location-latitude" + _this.upload.index;
	var lonId = "location-longitude" + _this.upload.index;
	//var altId = "location-altitude" + _this.upload.index;

	_this.$latInput = $( '<input type="text" id="' + latId + '" name="' + latId + '" class="mwe-loc-lat" size="10"/>' );
	_this.$lonInput = $( '<input type="text" id="' + lonId + '" name="' + lonId + '" class="mwe-loc-lon" size="10"/>' );
	//_this.altInput = $( '<input type="text" id="' + altId + '" name="' + altId + '" class="mwe-loc-alt" size="10"/>' );

	// Do not prefill with "0"
	_this.$latInput.val( mw.UploadWizard.config.defaults.lat );
	_this.$lonInput.val( mw.UploadWizard.config.defaults.lon );
	//_this.altInput.val( mw.UploadWizard.config.defaultAlt );

	var latDiv = $( '<div class="mwe-location-lat"></div>' )
		.append( $( '<div class="mwe-location-lat-label"></div>' ).text( mw.message( 'mwe-upwiz-location-lat' ).text() ) )
		.append( _this.$latInput );
	var lonDiv = $( '<div class="mwe-location-lon"></div>' )
		.append( $( '<div class="mwe-location-lon-label"></div>' ).text( mw.message( 'mwe-upwiz-location-lon' ).text() ) )
		.append( _this.$lonInput );
	//var altDiv = $( '<div class="mwe-location-alt"></div>' )
	//	.append( $( '<div class="mwe-location-alt-label"></div>' ).append( mw.message( 'mwe-upwiz-location-alt' ).text() ) )
	//	.append( _this.altInput );

	var showMap = $( '<a></a>' )
		.append( mw.message( 'mwe-upwiz-location-button' ).text() )
		.hide();

	var linkDiv = $( '<div class="mwe-loc-link"></div>' )
		.append( showMap );

	var locationDiv = $( '<div class="mwe-location mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
		.append( $ ('<div class="mwe-location-label"></div>' )
		.append( mw.message( 'mwe-upwiz-location' ).escaped() )
		.addHint( 'location' ) )
		.append(
			$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + latId + '" generated="true"/></div>' ),
			$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + lonId + '" generated="true"/></div>' ),
			//$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + altId + '" generated="true"/></div>' ),
			latDiv, lonDiv, linkDiv//, altDiv
		);

	$( moreDetailsDiv ).append(
		locationDiv,
		otherInformationDiv
	);


	/* Build the form for the file upload */
	_this.$form = $( '<form id="mwe-upwiz-detailsform' + _this.upload.index + '"></form>' ).addClass( 'detailsForm' );
	_this.$form.append(
		titleContainerDiv,
		_this.descriptionsDiv,
		descriptionAdderDiv,
		_this.copyrightInfoFieldset,
		dateInputDiv,
		$categoriesDiv
	);

	_this.fields = [];
	$.each( mw.UploadWizard.config.fields, function ( i, field ) {
		if( field.wikitext ) {
			var fieldInputId = "field_" + i + '_' + ( _this.upload.index ).toString();

			if ( !( 'type' in field ) ) {
			  field.type = 'text';
			}

			switch ( field.type ) {
				case 'select':
					$fieldInput = $( '<select>' ).attr( {
						'id': fieldInputId,
						'name': fieldInputId,
						'class': 'mwe-idfield'
					} ).data( 'field', field );

					if ( 'options' in field ) {
						$.each( field.options, function ( val, label ) {
							$fieldInput.append( $( '<option>' )
							.val( val )
							.text( label ) );
						} );
					}

				break;
				default:
					var $fieldInput = $( '<input type="text">' ).attr( {
						'id': fieldInputId,
						'name': fieldInputId,
						'class': 'mwe-idfield',
						'maxlength': field.maxLength
					} )
					.val( field.initialValue )
					.data( 'field', field );
				break;
			}


			_this.$form.append(
				$( '<div>' ).attr( 'class', 'mwe-upwiz-details-input-error' )
					.append( $( '<label>' ).attr( { 'class': 'mwe-validator-error', 'for': fieldInputId, 'generated': 'true' } ) )
			);
			if ( field.required ) {
				_this.$form.append( $( '<div>' ).attr( 'class', 'mwe-upwiz-details-fieldname' ).html( field.label ).requiredFieldLabel() );
			} else {
				_this.$form.append( $( '<div>' ).attr( 'class', 'mwe-upwiz-details-fieldname' ).html( field.label ) );
			}
			_this.$form.append(
				$( '<div>' ).attr( 'class', 'mwe-id-field' ).append( $fieldInput )
			);

			_this.fields.push( $fieldInput );
		}
	} );

	_this.$form.append(
		moreDetailsCtrlDiv,
		moreDetailsDiv
	);

	_this.submittingDiv = $( '<div>' ).addClass( 'mwe-upwiz-submitting' )
		.append(
			$( '<div>' ).addClass( 'mwe-upwiz-file-indicator' ),
			$( '<div>' ).addClass( 'mwe-upwiz-details-texts' ).append(
				$( '<div>' ).addClass( 'mwe-upwiz-visible-file-filename-text' ),
				$( '<div>' ).addClass( 'mwe-upwiz-file-status-line' )
			)
		);

	// Add in remove control to submittingDiv
	_this.$removeCtrl = $.fn.removeCtrl(
			'mwe-upwiz-remove',
			'mwe-upwiz-remove-upload',
			function() { _this.upload.remove(); }
		).addClass( "mwe-upwiz-file-status-line-item" );

	_this.submittingDiv.find( '.mwe-upwiz-file-status-line' )
		.append( _this.$removeCtrl );

	$( _this.dataDiv ).append(
		_this.$form,
		_this.submittingDiv
	).morphCrossfader();

	$( _this.div ).append(
		_this.thumbnailDiv,
		_this.dataDiv
	);

	_this.$form.validate();
	_this.$form.find( '.mwe-date' ).rules( "add", {
		required: true,
		/* dateISO: true, */
		messages: {
			required: mw.message( 'mwe-upwiz-error-blank' ).escaped()
			/* dateISO: mw.message( 'mwe-upwiz-error-date' ).escaped() */
		}
	} );

	var $list = this.$form.find( '.mwe-loc-lat, .mwe-loc-lon ' );
	$list.on( 'input keyup change cut paste', function ( event ) {
		var link = _this.osmMapLink();
		if (  $list.valid() ) {
			showMap.attr( { 'href':link, 'target':'_blank' } ).show();
		}
		else {
			showMap.hide();
		}
	} );

	$.each( _this.fields, function ( i, $fieldInput ) {
		$fieldInput.rules( "add", {
			required: $fieldInput.data( 'field' ).required,
			messages: {
				required: mw.message( 'mwe-upwiz-error-blank').escaped()
			}
		} );
	} );
	_this.$form.find( '.mwe-date' )
		.datepicker( {
			dateFormat: 'yy-mm-dd',
			constrainInput: false,
			//buttonImage: mw.getMwEmbedPath() + 'skins/common/images/calendar.gif',
			showOn: 'focus',
			/* buttonImage: '???',
			buttonImageOnly: true,  */
			changeMonth: true,
			changeYear: true,
			showAnim: 'slideDown',
			showButtonPanel: true
		} )
		.data( 'open', 0 )
		.click( function() {
			var $this = $( this );
			if ( $this.data( 'open' ) === 0 ) {
				$this.data( 'open', 1 ).datepicker( 'show' );
			} else {
				$this.data( 'open', 0 ).datepicker( 'hide' );
			}
		} );

	_this.$latInput.rules( "add", {
		min: -90,
		max: 90,
		messages: {
			min: mw.message( 'mwe-upwiz-error-latitude' ).escaped(),
			max: mw.message( 'mwe-upwiz-error-latitude' ).escaped()
		}
	} );

	_this.$lonInput.rules( "add", {
		min: -180,
		max: 180,
		messages: {
			min: mw.message( 'mwe-upwiz-error-longitude' ).escaped(),
			max: mw.message( 'mwe-upwiz-error-longitude' ).escaped()
		}
	} );

	/* Disabled because not supported on wiki
	 * Does not validate on rationals, only decimals
	 * check if bug 32410 is fixed before enabling. See also bug 39553.
	_this.altInput.rules( "add", {
		number: true,
		messages: {
			number: mw.message( 'mwe-upwiz-error-altitude' ).escaped()
		}
	} );
	*/

	mw.UploadWizardUtil.makeToggler(
		moreDetailsCtrlDiv,
		moreDetailsDiv,
		'mwe-upwiz-more-options'
	);

	_this.addDescription(
		! ( mw.UploadWizard.config.fields && mw.UploadWizard.config.fields.length  && mw.UploadWizard.config.fields[0].wikitext ) ,
		mw.LanguageUpWiz.UNKNOWN,
		false,
		mw.UploadWizard.config.defaults.description
	);

	if ( mw.config.get( 'UploadWizardConfig' ).useTitleBlacklistApi ) {
		// less strict checking, since TitleBlacklist checks should catch most errors.
		_this.$form.find( '.mwe-title' )
			.rules( "add", {
				required: true,
				messages: {
					required: mw.message( 'mwe-upwiz-error-blank' ).escaped()
				}
			} );
	} else {
		// make the title field required, and non-blacklisted
		_this.$form.find( '.mwe-title' )
			.rules( "add", {
				required: true,
				titleBadchars: true,
				titleSenselessimagename: true,
				titleThumbnail: true,
				titleExtension: true,
				messages: {
					required: mw.message( 'mwe-upwiz-error-blank' ).escaped(),
					titleBadchars: mw.message( 'mwe-upwiz-error-title-badchars' ).escaped(),
					titleSenselessimagename: mw.message( 'mwe-upwiz-error-title-senselessimagename' ).escaped(),
					titleThumbnail: mw.message( 'mwe-upwiz-error-title-thumbnail' ).escaped(),
					titleExtension: mw.message( 'mwe-upwiz-error-title-extension' ).escaped()
				}
			} );
	}
	// make this a category picker
	var hiddenCats = mw.UploadWizard.config.autoAdd.categories === undefined ? [] : mw.UploadWizard.config.autoAdd.categories;

	// Add tracking categories
	if ( mw.UploadWizard.config.trackingCategory ) {
		if ( mw.UploadWizard.config.trackingCategory.all ) {
			hiddenCats.push( mw.UploadWizard.config.trackingCategory.all );
		}
		if ( mw.UploadWizard.config.trackingCategory.campaign ) {
			hiddenCats.push( mw.UploadWizard.config.trackingCategory.campaign );
		}
	}

	var missingCatsWikiText = null;
	if (
		typeof mw.UploadWizard.config.missingCategoriesWikiText === 'string' &&
		mw.UploadWizard.config.missingCategoriesWikiText.length > 0
	) {
		missingCatsWikiText = mw.UploadWizard.config.missingCategoriesWikiText;
	}

	_this.$catinput = $categoriesDiv.find( '.mwe-upwiz-details-input' ).find( 'input' );
	_this.$catinput.mwCoolCats( {
		api: _this.upload.api,
		hiddenCats: hiddenCats,
		buttontext: mw.message( 'mwe-upwiz-categories-add' ).text(),
		cats: mw.UploadWizard.config.defaults.categories === undefined ? [] : mw.UploadWizard.config.defaults.categories,
		missingCatsWikiText: missingCatsWikiText,
		willbeaddedtext: mw.message( 'mwe-upwiz-category-will-be-added' ).text(),
		onnewcat: function () {
			_this.updateCopyMsgs();
		}
	} );
};


mw.UploadWizardDetails.prototype = {

	// Has this details object been attached to the DOM already?
	isAttached: false,

	/*
	 * Append the div for this details object to the DOM.
	 * We need to ensure that we add divs in the right order
	 * (the order in which the user selected files).
	 *
	 * Will only append once.
	 */
	attach: function() {
		if ( !this.isAttached ) {
			$( this.containerDiv ).append( this.div );
			this.isAttached = true;
			this.updateCopyMsgs();
		}
	},

	// Metadata which we can copy over to other details objects
	// objects with key:metadata name and value:boolean value indicating default checked status
	copyMetadataTypes: {
		title: true,
		description: true,
		date: false,
		categories: true,
		location: false,
		other: true
	},

	/*
	 * Copy metadata from the first upload to other uploads.
	 *
	 * We don't worry too much about validation here since all input is validated prior to
	 * submission, and the user will be alerted about validation errors in the first upload
	 * description.
	 *
	 * @param String metadataType One of the types defined in the copyMetadataTypes property
	 */
	copyMetadata: function ( metadataType ) {

		var _this = this;
		var sourceId = _this.upload.wizard.uploads[0].index;

		// In the simplest case, we can use this self-explanatory vanilla loop.
		var simpleCopy = function( id, tag ) {
			if ( tag === undefined ) {
				tag = 'input';
			}
			var firstId = '#' + id + sourceId;
			var firstValue = $( firstId ).val();
			$( tag + '[id^=' + id + ']:not(' + firstId + ')' ).each( function () {
				$( this ).val( firstValue );
				if ( $( this ).parents( '.mwe-more-details' ).length === 1 ) {
					var moreInfo = $( this ).parents( '.detailsForm' ).find( '.mwe-upwiz-details-more-options a' );
					if ( !moreInfo.hasClass( "mwe-upwiz-toggler-open" ) ) {
						moreInfo.click();
					}
				}
			});
		};

		if ( metadataType === 'title' ) {

			// Add number suffix to first title if no numbering present
			var titleZero = $( '#title' + sourceId ).val();
			var matches = titleZero.match( /(\D+)(\d{1,3})(\D*)$/ );
			if ( matches === null ) {
				titleZero = titleZero + ' 01';
				// After setting the value, we must trigger input processing for the change to take effect
				$( '#title' + sourceId ).val( titleZero ).keyup();
			}

			// Overwrite remaining title inputs with first title + increment of rightmost
			// number in the title. Note: We ignore numbers with more than three digits, because these
			// are more likely to be years ("Wikimania 2011 Celebration") or other non-sequence
			// numbers.
			$( 'input[id^=title]:not(#title' + sourceId + ')' ).each( function (i) {
					var currentTitle = $( this ).val();
					currentTitle = titleZero.replace( /(\D+)(\d{1,3})(\D*)$/,
						function( str, m1, m2, m3 ) {
						var newstr = ( +m2 + i + 1 ) + '';
						return m1 + new Array( m2.length + 1 - newstr.length )
						.join( '0' ) + newstr + m3;
					}
				);
				$( this ).val( currentTitle ).keyup();

			} );

		} else if ( metadataType === 'description' ) {

			var destUploads = _this.upload.wizard.uploads;
			$.each( destUploads, function ( uploadIndex, upload ) {

				if ( upload !== undefined && upload.index !== sourceId ) {

					// We could merge, but it's unlikely that the user wants to do anything other
					// than just having the same descriptions across all files, so rather than
					// create unintended consequences, we nuke any existing descriptions first.
					upload.details.removeAllDescriptions();

					$.each( _this.descriptions, function ( srcDescriptionIndex, srcDescription ) {
						var isRequired = srcDescription.isRequired;
						var languageCode = srcDescription.getLanguage();
						var allowRemoval = !isRequired;
						var descriptionText = srcDescription.getText();
						upload.details.addDescription ( isRequired, languageCode, allowRemoval, descriptionText );
					} );
				}
			} );

		} else if ( metadataType === 'date' ) {

			simpleCopy( 'dateInput' );

		} else if ( metadataType === 'categories' ) {

			var visibleCategoriesZero = $( '#categories' + sourceId ).get( 0 ).getCats( ':not(.hidden)' );
			var hiddenCategoriesZero = $( '#categories' + sourceId ).get( 0 ).getCats( '.hidden' );
			$( 'input[id^=categories]:not(#categories' + sourceId + ')' ).each( function( i, input ) {
				if ( this.id !== ( 'categories' + sourceId ) ) {

					// As with descriptions, we nuke whatever categories are there already.
					input.removeAllCats();

					$.each(visibleCategoriesZero, function() {
						input.insertCat( this, false );
					});
					$.each(hiddenCategoriesZero, function() {
						input.insertCat( this, true );
					});

				}
			});

		} else if ( metadataType === 'location' ) {

			simpleCopy( 'location-latitude' );
			simpleCopy( 'location-longitude' );
			//simpleCopy( 'location-altitude' );

		} else if ( metadataType === 'other' ) {

			simpleCopy( 'otherInformation', 'textarea' );

		} else {
			throw new Error( 'Attempted to copy unsupported metadata type: ' + metadataType );
		}
	},

	/*
	 * Construct and display the widget to copy metadata
	 *
	 * Call before showing the Details step. Builds, adds and displays
	 * a metadata copy widget for the details view of this specific upload
	 */
	buildAndShowCopyMetadata: function() {
		var _this = this;
		if( mw.UploadWizard.config.copyMetadataFeature !== true ||
			_this.copyMetadataCtrlDiv !== undefined ) {
			return;
		}

		_this.copyMetadataCtrlDiv = $( '<div class="mwe-upwiz-details-copy-metadata"></div>' );
		var copyMetadataDiv = $( '<div class="mwe-upwiz-metadata-copier"></div>' );

		$.each( _this.copyMetadataTypes, function addToMetadataDiv( metadataName, defaultStatus ) {
			var copyMessage = 'mwe-upwiz-copy-' + metadataName,
				copyMetadataMsg,
				$checkbox;
			if ( metadataName === 'description' || metadataName === 'categories' ) {
				copyMetadataMsg = mw.message( copyMessage, 1 ).text();
			} else {
				copyMetadataMsg = mw.message( copyMessage ).text();
			}
			$checkbox = $( '<input>' ).attr( 'type', 'checkbox' ).attr( 'name', copyMessage ).attr( 'id', copyMessage );
			if ( defaultStatus === true ) {
				$checkbox.attr( 'checked', 'checked' );
			}
			copyMetadataDiv.append( $checkbox );
			copyMetadataDiv.append( $( '<label for="' + copyMessage + '"></label>' ).text( copyMetadataMsg ) );
			copyMetadataDiv.append( $( '<br />' ) );
		} ) ;

		copyMetadataDiv.append(
			$( '<button type="button" id="mwe-upwiz-copy-metadata-button"></button>' )
			.msg( 'mwe-upwiz-copy-metadata-button' )
			.button()
			.click(
				function( e ) {
					var button = $( this ).find( 'span' );
					$.each( _this.copyMetadataTypes, function makeCopies( metadataType, defaultStatus ) {
							if ( $( '#mwe-upwiz-copy-' + metadataType ).is( ':checked' ) ) {
								_this.copyMetadata( metadataType );
							}
						} );
					button.text( mw.message( 'mwe-upwiz-copied-metadata-button' ).text() );
					setTimeout( function( ) {
						button.text( mw.message( 'mwe-upwiz-copy-metadata-button' ).text() );
					}, 1000 );
					e.stopPropagation();
				}
			)
		);

		mw.UploadWizardUtil.makeToggler(
			_this.copyMetadataCtrlDiv,
			copyMetadataDiv,
			'mwe-upwiz-copy-metadata'
		);

		_this.$form.append( _this.copyMetadataCtrlDiv, copyMetadataDiv );
		_this.copyMetadataCtrlDiv.show();
	},

	/**
	 * Open OSM map
	 */
	osmMapLink: function () {
			var mapLink = new mw.Uri( 'https://openstreetmap.org/' )
					.extend( { zoom: 9, layers: 'M', lat: this.$latInput.val(), lon: this.$lonInput.val() } );
			return mapLink.toString();
	},

	/**
	 * Update messages in copyMetadata div
	 */
	updateCopyMsgs: function () {
		var _this = this;
		var msgs = [
			{
				title: 'mwe-upwiz-copy-description',
				counter: function () {
					return $( '.mwe-upwiz-details-fieldname', _this.$form ).length;
				}
			},
			{
				title: 'mwe-upwiz-copy-categories',
				counter: function () {
					return $( 'ul li.cat, .categoryInput', _this.$form ).length;
				}
			}
		];
		$.each( msgs, function( index, msg ) {
			var $lbl = $( 'label[for="' + msg.title + '"]' );
			$lbl.text( mw.message( msg.title, msg.counter() ).text() );
		} );
		$lbl = $( '.mwe-upwiz-details-copy-metadata a', _this.$form );
		$lbl.text( mw.message( 'mwe-upwiz-copy-metadata', _this.upload.wizard.uploads.length - 1 ).text() );
	},

	/**
	 * check entire form for validity
	 */
	// do callback if we are ready to go.
	// side effect: add error text to the page for fields in an incorrect state.
	// we must call EVERY valid() function due to side effects; do not short-circuit.
	valid: function( callback ) {
		var _this = this;
		// at least one description -- never mind, we are disallowing removal of first description
		// all the descriptions -- check min & max length
		// categories are assumed valid
		// pop open the 'more-options' if the date is bad
		// location?

		// make sure title is valid
		var titleInputValid = $( _this.titleInput ).data( 'valid' );
		if ( titleInputValid === undefined ) {
			setTimeout( function () { _this.valid( callback ); }, 200 );
			return;
		}

		// make sure licenses are valid (needed for multi-file deed selection)
		var deedValid = _this.upload.deedChooser.valid();

		// all other fields validated with validator js
		var formValid = _this.$form.valid();

		if ( titleInputValid && deedValid && formValid ) {
			callback();
		}
	},

	/**
	 * check if we have all the *must have* but not mandatory fields filled in
	 * Currently this tests for the following:
	 * 1) Empty category
	 * 2) TODO
	 */
	necessaryFilled: function( callback ) {
		// check for empty category input
		if ( this.div.find( '.categoryInput' ).val() !== '' || this.div.find( '.cat-list' ).find( 'li' ).length > 0 ) {
			callback();
		}
	},

	/**
	 * toggles whether we use the 'macro' deed or our own
	 */
	useCustomDeedChooser: function() {
		var _this = this;
		_this.copyrightInfoFieldset.show();
		_this.upload.wizardDeedChooser = _this.upload.deedChooser;

		// Defining own deedChooser for uploads coming from external service
		if ( _this.upload.fromURL ) {
			if ( _this.upload.providedFile.license ) {
				// XXX can be made a seperate class as mw.UploadFromUrlDeedChooser
				_this.upload.deedChooser = {
					valid : function(){ return true; }
				};

				// Need to add tipsy tips here
				$( _this.deedDiv ).append( _this.upload.providedFile.licenseMessage );

				// XXX need to add code in the remaining functions
				_this.upload.deedChooser.deed = {
					valid : function(){ return true; },
					getSourceWikiText : function() {
						if ( typeof _this.upload.providedFile.sourceURL !== 'undefined' ) {
							return _this.upload.providedFile.sourceURL;
						} else {
							return _this.upload.providedFile.url;
						}
					},
					getAuthorWikiText : function() {
						return _this.upload.providedFile.author;
					},
					getLicenseWikiText : function() {
						return _this.upload.providedFile.licenseValue;
					}
				};
			}
		} else {
			_this.upload.deedChooser = new mw.UploadWizardDeedChooser(
				_this.deedDiv,
				_this.upload.wizard.getLicensingDeeds(),
				[ _this.upload ] );
			_this.upload.deedChooser.onLayoutReady();
		}
	},

	/**
	 * show file destination field as "busy" while checking
	 * @param busy boolean true = show busy-ness, false = remove
	 */
	toggleDestinationBusy: function ( busy ) {
		var _this = this;
		if (busy) {
			_this.titleInput.addClass( "busy" );
			$( _this.titleInput ).data( 'valid', undefined );
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
		var $errorEl = _this.$form.find( 'label[for=' + _this.titleId + '].errorTitleUnique' );

		if ( result.unique.isUnique && result.blacklist.notBlacklisted && !result.unique.isProtected ) {
			$( _this.titleInput ).data( 'valid', true );
			$errorEl.hide().empty();
			_this.ignoreWarningsInput = undefined;
			return;
		}

		// something is wrong with this title.
		$( _this.titleInput ).data( 'valid', false );

		var titleString;
		var errHtml;

		try {
			titleString = new mw.Title( result.title, fileNsId ).toString();
		} catch ( e ) {
			// unparseable result from unique test?
			titleString = '[unparseable name]';
		}

		if ( ! result.unique.isUnique ) {
			// result is NOT unique
			if ( result.href ) {
				errHtml = mw.message( 'mwe-upwiz-fileexists-replace-on-page', titleString, $( '<a>' ).attr( { href: result.href, target: '_blank' } ) ).parse();
			} else {
				errHtml = mw.message( 'mwe-upwiz-fileexists-replace-no-link', titleString ).text();
			}

			$errorEl.text( errHtml );
		} else if ( result.unique.isProtected ) {
			errHtml = mw.message( 'mwe-upwiz-error-title-protected' ).text();
			$errorEl.text( errHtml );
		} else {
			errHtml = mw.message( 'mwe-upwiz-blacklisted', titleString ).text();
			$errorEl.text( errHtml );

			var completeErrorLink = $( '<span class="contentSubLink"></span>' ).msg(
				'mwe-upwiz-feedback-blacklist-info-prompt',
				function() {
					var errorDialog = new mw.ErrorDialog( result.blacklist.blacklistReason );
					errorDialog.launch();
					return false;
				}
			);

			$errorEl.append( '&nbsp;&middot;&nbsp;' ).append( completeErrorLink );

			// feedback request for titleblacklist
			if ( mw.UploadWizard.config.blacklistIssuesPage !== undefined && mw.UploadWizard.config.blacklistIssuesPage !== '' ) {
				var feedback = new mw.Feedback(
					_this.api,
					new mw.Title( mw.UploadWizard.config.blacklistIssuesPage ),
					'mwe-upwiz-feedback-title'
				);

				var feedbackLink = $( '<span class="contentSubLink"></span>' ).msg(
					'mwe-upwiz-feedback-blacklist-report-prompt',
					function() {
						feedback.launch( {
							message: mw.message( 'mwe-upwiz-feedback-blacklist-line-intro', result.blacklist.blacklistLine ).escaped(),
							subject: mw.message( 'mwe-upwiz-feedback-blacklist-subject', titleString ).escaped()
						} );
						return false;
					}
				);

				$errorEl.append( '&nbsp;&middot;&nbsp;' ).append( feedbackLink );
			}
		}
		$errorEl.show();
	},

	/**
	 * Do anything related to a change in the number of descriptions
	 */
	recountDescriptions: function() {
		var _this = this;
		// if there is some maximum number of descriptions, deal with that here
		$( _this.descriptionAdder ).text( mw.message( 'mwe-upwiz-desc-add-' + ( _this.descriptions.length === 0 ? '0' : 'n' ) ).text() );
	},


	/**
	 * Add a new description
	 */
	addDescription: function( required, languageCode, allowRemove, initialValue ) {
		var _this = this;
		if ( required === undefined ) {
			required = false;
		}

		if ( languageCode === undefined ) {
			languageCode = mw.LanguageUpWiz.UNKNOWN;
		}

		if ( allowRemove === undefined ) {
			allowRemove = true;
		}

		var description = new mw.UploadWizardDescription( languageCode, required, initialValue );

		if ( !required && allowRemove ) {
			$( description.div  ).append(
				$.fn.removeCtrl( null, 'mwe-upwiz-remove-description', function() { _this.removeDescription( description ); } )
			);
		}

		$( _this.descriptionsDiv ).append( description.div  );

		// must defer adding rules until it's in a form
		// sigh, this would be simpler if we refactored to be more jquery style, passing DOM element downward
		description.addValidationRules( required );

		_this.descriptions.push( description  );
		_this.recountDescriptions();
		_this.updateCopyMsgs();
	},

	/**
	 * Remove a description
	 * @param description
	 */
	removeDescription: function( description  ) {
		var _this = this;
		$( description.div ).remove();
		mw.UploadWizardUtil.removeItem( _this.descriptions, description  );
		_this.recountDescriptions();
		_this.updateCopyMsgs();
	},

	removeAllDescriptions: function() {
		var _this = this;
		$( _this.descriptionsDiv ).children().remove();
		_this.descriptions = [];
		_this.recountDescriptions();
		_this.updateCopyMsgs();
	},

	/**
	 * Display an error with details
	 * XXX this is a lot like upload ui's error -- should merge
	 */
	error: function() {
		var _this = this;
		var args = Array.prototype.slice.call( arguments  ); // copies arguments into a real array
		var msg = 'mwe-upwiz-upload-error-' + args[0];
		$( _this.errorDiv ).append( $( '<p class="mwe-upwiz-upload-error"></p>' ).text( mw.message( msg, args.slice( 1 ) ).text() ) );
		// apply a error style to entire did
		$( _this.div ).addClass( 'mwe-upwiz-upload-error' );
		$( _this.dataDiv ).hide();
		$( _this.errorDiv ).show();
	},

	/**
	 * Given the API result pull some info into the form ( for instance, extracted from EXIF, desired filename )
	 * @param result	Upload API result object
	 */
	populate: function() {
		var _this = this;
		_this.upload.setThumbnail(
			_this.thumbnailDiv,
			mw.UploadWizard.config.thumbnailWidth,
			mw.UploadWizard.config.thumbnailMaxHeight,
			true
		);
		_this.prefillDate();
		_this.prefillSource();
		_this.prefillAuthor();
		_this.prefillTitle();
		_this.prefillDescription();
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
		var timeRegex = /\D(\d\d):(\d\d):(\d\d)/;
		var dateObj;
		if ( _this.upload.imageinfo.metadata ) {
			var metadata = _this.upload.imageinfo.metadata;
			$.each( [ 'datetimeoriginal', 'datetimedigitized', 'datetime', 'date' ], function( i, propName ) {
				var dateInfo = metadata[propName];
				if ( ! mw.isEmpty( dateInfo ) ) {
					var matches = $.trim( dateInfo ).match( yyyyMmDdRegex );
					if ( ! mw.isEmpty( matches ) ) {
						var timeMatches = $.trim( dateInfo ).match( timeRegex );
						if ( ! mw.isEmpty( timeMatches ) ) {
							dateObj = new Date( parseInt( matches[1], 10 ),
										parseInt( matches[2], 10 ) - 1,
										parseInt( matches[3], 10 ),
										parseInt( timeMatches[1], 10 ),
										parseInt( timeMatches[2], 10 ),
										parseInt( timeMatches[3], 10 ) );
						} else {
							dateObj = new Date( parseInt( matches[1], 10 ),
										parseInt( matches[2], 10 ) - 1,
										parseInt( matches[3], 10 ) );
						}
						return false; // break from $.each
					}
				}
			} );
		}

		// If we don't have EXIF lets try other sources - Flickr
		if ( dateObj === undefined && typeof this.upload.file !== 'undefined' && typeof this.upload.file.date !== 'undefined' ) {
			var dateTimeRegex = /^\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d/;
			var matches = this.upload.file.date.match( dateTimeRegex );
			if ( !mw.isEmpty( matches ) ) {
				$( _this.dateInput ).val( this.upload.file.date );
				return;
			}
		}

		// if we don't have EXIF or other metadata, let's use "now"
		// XXX if we have FileAPI, it might be clever to look at file attrs, saved
		// in the upload object for use here later, perhaps
		if ( dateObj === undefined ) {
			dateObj = new Date();
		}

		var getSaneTime = function ( date ) {
			var pad = function ( number ) {
				if ( number < 10 ) {
					return '0' + number;
				} else {
					return '' + number;
				}
			};

			var str = '';

			str += pad( date.getHours() ) + ':';
			str += pad( date.getMinutes() ) + ':';
			str += pad( date.getSeconds() );

			return str;
		};

		var dateStr = dateObj.getFullYear() + '-' + pad( dateObj.getMonth() + 1 ) + '-' + pad( dateObj.getDate() );

		// Add the time
		// If the date but not the time is set in EXIF data, we'll get a bogus
		// time value of '00:00:00'.
		// FIXME: Check for missing time value earlier rather than blacklisting
		// a potentially legitimate time value.
		var saneTime = getSaneTime( dateObj );
		if ( saneTime !== '00:00:00' ) {
			dateStr += ' ' + saneTime;
		}

		// ok by now we should definitely have a dateObj and a date string
		$( _this.dateInput ).val( dateStr );
	},

	/**
	 * Set the title of the thing we just uploaded, visibly
	 * Note: the interface's notion of "filename" versus "title" is the opposite of MediaWiki
	 */
	prefillTitle: function() {
		$( this.titleInput ).val( this.upload.title.getNameText() );
	},

	/**
	 * Prefill the image description if we have a description
	 *
	 * Note that this is not related to specifying the descrition from the query
	 * string (that happens earlier). This is for when we have retrieved a
	 * description from an upload_by_url upload (e.g. Flickr transfer)
	 */
	prefillDescription: function() {
		if (
			this.descriptions[0].getText() === '' &&
			this.upload.file !== undefined &&
			this.upload.file.description !== undefined &&
			this.upload.file.description !== ''
		) {
			this.descriptions[0].setText( this.upload.file.description );
		}
	},

	/**
	 * Prefill location inputs (and/or scroll to position on map) from image info and metadata
	 *
	 * As of MediaWiki 1.18, the exif parser translates the rational GPS data tagged by the camera
	 * to decimal format (accept for altitude, bug 32410).  Let's just use that.
	 * Leaving out altitude ref for now (for no good reason).
	 */
	prefillLocation: function() {
		var _this = this,
			m = _this.upload.imageinfo.metadata;

		if ( m ) {
			// Prefill useful stuff only
			if ( Number( m.gpslatitude ) && Number ( m.gpslongitude ) ) {
				_this.$latInput.val( m.gpslatitude );
				_this.$lonInput.val( m.gpslongitude );
			} else if (
				this.upload.file &&
				this.upload.file.location &&
				this.upload.file.location.latitude &&
				this.upload.file.location.longitude
			) {
				_this.$latInput.val( this.upload.file.location.latitude );
				_this.$lonInput.val( this.upload.file.location.longitude );
			}

			//if ( m['gpsaltitude'] !== undefined ) {
			//	$( _this.altInput ).val( m['gpsaltitude'] );
			//}
		}
	},

	/**
	 * Given a decimal latitude and longitude, return filled out {{Location}} template
	 *
	 * The {{Location dec}} template is preferred and makes this conversion unnecessary.  This function is not used.
	 *
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
		if ( _this.upload.imageinfo.metadata && _this.upload.imageinfo.metadata.author ) {
			$( _this.authorInput ).val( _this.upload.imageinfo.metadata.author );
		}

	},

	/**
	 * Prefill license (such as can be determined) from image info and metadata
	 * XXX user pref?
	 */
	prefillLicense: function() {
		var _this = this;
		if ( _this.upload.imageinfo.metadata ) {
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
					$( _this.licenseInput ).val( copyright );
				}
			}
		}
		// if we still haven't set a copyright use the user's preferences?
	},


	/**
	 * Convert entire details for this file into wikiText, which will then be posted to the file
	 * @return wikitext representing all details
	 */
	getWikiText: function( callback ) {
		var _this = this;

		// if invalid, should produce side effects in the form
		// instructing user to fix.
		_this.valid( function () {
			var wikiText = '';


			// http://commons.wikimedia.org / wiki / Template:Information

			// can we be more slick and do this with maps, applys, joins?
			var information = {
				'description' : '',		// {{lang|description in lang}}*   required
				'date' : '',			// YYYY, YYYY-MM, or YYYY-MM-DD     required  - use jquery but allow editing, then double check for sane date.
				'source' : '',			// {{own}} or wikitext    optional
				'author' : '',			// any wikitext, but particularly {{Creator:Name Surname}}   required
				'permission' : '',		// leave blank unless OTRS pending; by default will be "see below"   optional
				'other_versions' : '',	// pipe separated list, other versions     optional
				'other_fields' : ''		// ???     additional table fields
			};

			// sanity check the descriptions -- do not have two in the same lang
			// all should be a known lang
			if ( _this.descriptions.length === 0 ) {
				alert("something has gone horribly wrong, unimplemented error check for zero descriptions");
				// XXX ruh roh
				// we should not even allow them to press the button ( ? ) but then what about the queue...
			}
			$.each( _this.descriptions, function( i, desc ) {
				information.description += desc.getWikiText();
			} );

			$.each( _this.fields, function ( i, $field ) {
				if ( ! mw.isEmpty( $field.val() ) ) {
					information.description += $field.data( 'field' ).wikitext.replace( '$1', $field.val() );
				}
			} );

			information.date = $.trim( $( _this.dateInput ).val() );

			var deed = _this.upload.deedChooser.deed;

			information.source = deed.getSourceWikiText();

			information.author = deed.getAuthorWikiText();

			var info = '';
			for ( var key in information ) {
				info += '|' + key + '=' + information[key] + "\n";
			}

			wikiText += "=={{int:filedesc}}==\n";
			wikiText += '{{Information\n' + info + '}}\n';

			var lat = $.trim( $( _this.$latInput ).val() );
			var lon = $.trim( $( _this.$lonInput ).val() );
			//var alt = $.trim( $( _this.altInput ).val() );

			// Do not require the altitude to be set, to prevent people from entering 0
			// while it's actually unknown.
			// When none is provided, this will result in {{Location dec|int|int|}}.
			if( Number( lat ) && Number ( lon ) ) {
				wikiText += '{{Location dec|' + lat + '|' + lon + '}}\n';
			}

			// add an "anything else" template if needed
			var otherInfoWikiText = $.trim( $( _this.otherInformationInput ).val() );
			if ( ! mw.isEmpty( otherInfoWikiText ) ) {
				wikiText += otherInfoWikiText + "\n\n";
			}

			// add licensing information
			wikiText += "\n=={{int:license-header}}==\n";
			wikiText += deed.getLicenseWikiText() + "\n\n";

			if ( mw.UploadWizard.config.autoAdd.wikitext !== undefined ) {
				wikiText += mw.UploadWizard.config.autoAdd.wikitext;
			}

			// add categories
			wikiText += _this.div.find( '.categoryInput' ).get(0).getWikiText() + "\n\n";

			// sanitize wikitext if TextCleaner is defined (MediaWiki:TextCleaner.js)
			if ( typeof TextCleaner !== 'undefined' && typeof TextCleaner.sanitizeWikiText === 'function' ) {
				wikiText = TextCleaner.sanitizeWikiText( wikiText, true );
			}

			callback(wikiText);
		});
	},

	/**
	 * Post wikitext as edited here, to the file
	 * XXX This should be split up -- one part should get wikitext from the interface here, and the ajax call
	 * should be be part of upload
	 */
	submit: function() {
		var _this = this;

		$('form', _this.containerDiv).submit();

		_this.upload.state = 'submitting-details';
		_this.setStatus( mw.message( 'mwe-upwiz-submitting-details' ).text() );
		_this.showIndicator( 'progress' );

		var firstPoll = ( new Date() ).getTime();

		var params = {
			action: 'upload',
			filekey: _this.upload.fileKey,
			filename: _this.upload.title.getMain(),
			comment: "User created page with " + mw.UploadWizard.userAgent
		};
		//only enable async publishing if file is larger than 10Mb
		if ( _this.upload.transportWeight > 10*1024*1024 ) {
			params.async = true;
		}

		var err = function( code, info ) {
			_this.upload.state = 'error';
			_this.processError( code, info );
		};

		var ok = function( result ) {
			var warnings, wasDeleted, existingFile, existingFileUrl;

			if ( result && result.upload && result.upload.result == 'Poll' ) {
				// if async publishing takes longer than 10 minutes give up
				if ( ( ( new Date() ).getTime() - firstPoll ) > 10 * 60 * 1000 ) {
					err('server-error', 'unknown server error');
				} else {
					if ( result.upload.stage === undefined ) {
						console.log( "Unable to check file's status" );
					} else {
						//Messages that can be returned:
						// *mwe-upwiz-queued
						// *mwe-upwiz-publish
						// *mwe-upwiz-assembling
						_this.setStatus( mw.message( 'mwe-upwiz-' + result.upload.stage ).text() );
						setTimeout( function() {
							if ( _this.upload.state != 'aborted' ) {
								_this.upload.api.postWithEditToken( {
									action: 'upload',
									checkstatus: true,
									filekey: _this.upload.fileKey
								},
								ok, err );
							}
						}, 3000 );
					}
				}
				return;
			}
			if ( result && result.upload && result.upload.warnings ) {
				warnings = result.upload.warnings;
				existingFile = warnings.exists || warnings['exists-normalized'];
			}
			if ( warnings && warnings['was-deleted'] ) {
				delete warnings['was-deleted'];
				wasDeleted = true;
				for ( var wx in warnings ) {
					if ( warnings.hasOwnProperty( wx ) ) {
						// if there are other warnings, deal with those first
						wasDeleted = false;
					}
				}
			}
			if ( result && result.upload && result.upload.imageinfo ) {
				_this.upload.extractImageInfo( result.upload.imageinfo );
				_this.upload.detailsProgress = 1.0;
				_this.upload.state = 'complete';
				_this.showIndicator( 'uploaded' );
				_this.setStatus( mw.message( 'mwe-upwiz-published' ).text() );
			} else if ( wasDeleted ) {
				params.ignorewarnings = 1;
				_this.upload.api.postWithEditToken( params, ok, err );
			} else if ( result && result.upload.warnings ) {
				if ( warnings.thumb ) {
					_this.recoverFromError( _this.titleId, mw.message( 'mwe-upwiz-error-title-thumbnail' ).escaped() );
				} else if ( warnings.badfilename ) {
					_this.recoverFromError( _this.titleId, mw.message( 'mwe-upwiz-error-title-badchars' ).escaped() );
				} else if ( warnings['bad-prefix'] ) {
					_this.recoverFromError( _this.titleId, mw.message( 'mwe-upwiz-error-title-senselessimagename' ).escaped() );
				} else if ( existingFile ) {
					// API always returns the title of the file that exists
					existingFileUrl = mw.config.get( 'wgServer' ) + new mw.Title( existingFile, 6 ).getUrl();
					_this.recoverFromError( _this.titleId, mw.message( 'mwe-upwiz-api-warning-exists', existingFileUrl ).parse() );
				} else if ( warnings.duplicate ) {
					_this.recoverFromError( _this.titleId, mw.message( 'mwe-upwiz-upload-error-duplicate' ).escaped() );
				} else if ( warnings['duplicate-archive'] ) {
					if ( _this.upload.ignoreWarning['duplicate-archive'] ) {
						// We already told the interface to ignore this warning, so
						// let's steamroll over it and re-call this handler.
						params.ignorewarnings = true;
						_this.upload.api.postWithEditToken( params, ok, err );
					} else {
						// This should _never_ happen, but just in case....
						_this.recoverFromError( _this.titleId, mw.message( 'mwe-upwiz-upload-error-duplicate-archive' ).escaped() );
					}
				} else {
					var warningsKeys = [];
					$.each( warnings, function( key, val ) {
						warningsKeys.push( key );
					} );
					_this.upload.state = 'error';
					_this.recoverFromError( _this.titleId, mw.message( 'api-error-unknown-warning', warningsKeys.join( ', ' ) ).escaped() );
				}
			} else {
				err( 'details-info-missing', result );
			}
		};

		// XXX check state of details for okayness ( license selected, at least one desc, sane filename )
		// validation does MOST of this already
		_this.getWikiText( function ( wikiText ) {
			params.text = wikiText;
			_this.upload.api.postWithEditToken( params, ok, err );
		});
	},


	/**
	 * Create a recoverable error -- show the form again, and highlight the problematic field. Go to error state but do not block submission
	 * @param {String} id of input field -- presumed to be within this upload's details form.
	 * @param {String} HTML error message to show. Make sure escaping text properly.
	 */
	recoverFromError: function( fieldId, errorMessage ) {
		this.upload.state = 'error';
		this.dataDiv.morphCrossfade( '.detailsForm' );
		$( '#' + fieldId ).addClass( 'mwe-error' );
		this.$form.find( 'label[for=' + fieldId + '].errorRecovery' ).html( errorMessage ).show();
	},

	/**
	 * Show error state, possibly using a recoverable error form
	 * @param {String} error code
	 * @param {String} status line
	 */
	showError: function( code, statusLine ) {
		this.showIndicator( 'error' );
		this.setStatus( statusLine );
	},


	/**
	 * Decide how to treat various errors
	 * @param {String} error code
	 * @param {Mixed} result from ajax call
	 */
	processError: function( code, result ) {
		var statusKey;
		var statusLine = mw.message( 'api-error-unclassified' ).text();
		var titleErrorMap = {
			'senselessimagename': 'senselessimagename',
			'fileexists-shared-forbidden': 'fileexists-shared-forbidden',
			'titleblacklist-custom-filename': 'hosting',
			'titleblacklist-custom-SVG-thumbnail': 'thumbnail',
			'titleblacklist-custom-thumbnail': 'thumbnail',
			'titleblacklist-custom-double-apostrophe': 'double-apostrophe',
			'protectedpage': 'protected'
		};
		if ( result && result.error && result.error.code ) {
			if ( titleErrorMap[code] ) {
				this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-' + titleErrorMap[code] ).escaped() );
				return;
			} else {
				statusKey = 'api-error-' + code;
				if ( code === 'filetype-banned' && result.error.blacklisted ) {
					var comma = mw.message( 'comma-separator' ).escaped();
					code = 'filetype-banned-type';
					statusLine = mw.message( 'api-error-filetype-banned-type',
						result.error.blacklisted.join( comma ),
						result.error.allowed.join( comma ),
						result.error.allowed.length,
						result.error.blacklisted.length
					).text();
				} else if ( result.error.info ) {
					statusLine = mw.message( statusKey, result.error.info ).text();
				} else {
					statusLine = mw.message( statusKey, '[no error info]' ).text();
				}
			}
		}
		this.showError( code, statusLine );
	},

	setStatus: function( s ) {
		this.div.find( '.mwe-upwiz-file-status-line' ).text( s ).show();
	},

	showIndicator: function( statusStr ) {
		this.div.find( '.mwe-upwiz-file-indicator' )
			.show()
			.removeClass( 'mwe-upwiz-status-progress mwe-upwiz-status-error mwe-upwiz-status-uploaded' )
			.addClass( 'mwe-upwiz-status-' + statusStr );
	},

	dateInputCount: 0,

	/**
	 * Apply some special cleanups for titles before adding to model. These cleanups are not reflected in what the user sees in the title input field.
	 * For example, we remove an extension in the title if it matches the extension we're going to add anyway. (bug #30676)
	 * @param {String} title in human-readable form, e.g. "Foo bar", rather than "File:Foo_bar.jpg"
	 * @return {String} cleaned title with prefix and extension, stringified.
	 */
	setCleanTitle: function( s ) {
		var ext = this.upload.title.getExtension();
		var re = new RegExp( '\\.' + this.upload.title.getExtension() + '$', 'i' );
		var cleaned = $.trim( s.replace( re, '' ) );
		this.upload.title = new mw.Title( cleaned + '.' + ext, fileNsId );
		return this.upload.title;
	}

};

}) ( mediaWiki, jQuery );
