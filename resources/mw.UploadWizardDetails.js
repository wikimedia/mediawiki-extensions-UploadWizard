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
( function( mw, $j, undefined ) {

var fileNsId = mw.config.get( 'wgNamespaceIds' ).file;

mw.UploadWizardDetails = function( upload, api, containerDiv ) {

	var _this = this;
	_this.upload = upload;
	_this.containerDiv = containerDiv;
	_this.api = api;

	_this.descriptions = [];

	_this.div = $j( '<div class="mwe-upwiz-info-file ui-helper-clearfix filled"></div>' );

	_this.thumbnailDiv = $j( '<div class="mwe-upwiz-thumbnail mwe-upwiz-thumbnail-side"></div>' );

	_this.dataDiv = $j( '<div class="mwe-upwiz-data"></div>' );

	// descriptions
	_this.descriptionsDiv = $j( '<div class="mwe-upwiz-details-descriptions"></div>' );

	_this.descriptionAdder = $j( '<a class="mwe-upwiz-more-options"/>' )
					.html( mw.msg( 'mwe-upwiz-desc-add-0' ) )
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
	_this.titleInput = $j( '<input type="text" id="' + _this.titleId + '" name="' + _this.titleId + '" class="mwe-title" maxlength="250"/>' )
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

	_this.titleErrorDiv = $j(
		'<div class="mwe-upwiz-details-input-error">' +
			'<label class="mwe-error mwe-validator-error" for="' + _this.titleId + '" generated="true"/>' +
			'<label class="mwe-error errorTitleUnique" for="' + _this.titleId + '" generated="true"/>' +
			'<label class="mwe-error errorRecovery" for="' + _this.titleId + '" generated="true"/>' +
		'</div>'
	);

	var titleContainerDiv = $j('<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>')
		.append(
			_this.titleErrorDiv,
			$j( '<div class="mwe-upwiz-details-fieldname"></div>' )
				.msg( 'mwe-upwiz-title' )
				.requiredFieldLabel()
				.addHint( 'title' ),
			$j( '<div class="mwe-upwiz-details-input"></div>' ).append( _this.titleInput )
		);

	_this.deedDiv = $j( '<div class="mwe-upwiz-custom-deed" />' );

	_this.copyrightInfoFieldset = $j('<fieldset class="mwe-fieldset mwe-upwiz-copyright-info"></fieldset>')
		.hide()
		.append(
			$j( '<legend class="mwe-legend">' ).append( mw.msg( 'mwe-upwiz-copyright-info' ) ),
			_this.deedDiv
		);

	var $categoriesDiv = $j(
		'<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix">' +
			'<div class="mwe-upwiz-details-fieldname"></div>' +
			'<div class="mwe-upwiz-details-input"></div>' +
		'</div>'
	);
	var commonsCategoriesLink = $j( '<a>' ).attr( { 'target': '_blank', 'href': 'http://commons.wikimedia.org/wiki/Commons:Categories' } );
	var categoriesHint = $j( '<span>' ).msg( 'mwe-upwiz-tooltip-categories', commonsCategoriesLink ).html();
	var categoriesHinter = function() { return categoriesHint; };
	$categoriesDiv
		.find( '.mwe-upwiz-details-fieldname' )
		.append( mw.msg( 'mwe-upwiz-categories' ) )
		.addHint( 'mwe-upwiz-categories-hint', categoriesHinter );
	var categoriesId = 'categories' + _this.upload.index;
	$categoriesDiv.find( '.mwe-upwiz-details-input' )
		.append( $j( '<input/>' ).attr( { id: categoriesId,
						name: categoriesId,
						type: 'text' } )
		);

	var dateInputId = "dateInput" + ( _this.upload.index ).toString();

	var dateErrorDiv = $j('<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + dateInputId + '" generated="true"/></div>');

	/* XXX must localize this by loading jquery.ui.datepicker-XX.js where XX is a language code */
	/* jQuery.ui.datepicker also modifies first-day-of-week according to language, which is somewhat wrong. */
	/* $.datepicker.setDefaults() for other settings */
	_this.dateInput =
		$j( '<input type="text" id="' + dateInputId + '" name="' + dateInputId + '" type="text" class="mwe-date" size="20"/>' );

	var dateInputDiv = $j( '<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
		.append(
			dateErrorDiv,
			$j( '<div class="mwe-upwiz-details-fieldname"></div>' ).append( mw.msg( 'mwe-upwiz-date-created' ) ).requiredFieldLabel().addHint( 'date' ),
			$j( '<div class="mwe-upwiz-details-input"></div>' ).append( _this.dateInput ) );

	var moreDetailsCtrlDiv = $j( '<div class="mwe-upwiz-details-more-options"></div>' );

	var moreDetailsDiv = $j('<div class="mwe-more-details"></div>');

	var otherInformationId = "otherInformation" + _this.upload.index;
	_this.otherInformationInput = $j( '<textarea id="' + otherInformationId + '" name="' + otherInformationId + '" class="mwe-upwiz-other-textarea"></textarea>' )
		.growTextArea();

	var otherInformationDiv = $j('<div></div>')
		.append( $j( '<div class="mwe-upwiz-details-more-label"></div>' ).append( mw.msg( 'mwe-upwiz-other' ) ).addHint( 'other' ) )
		.append( _this.otherInformationInput );

	/* Altitude is not yet supported by any of the geo tools deployed on WMF sites */
	var latId = "location-latitude" + _this.upload.index;
	var lonId = "location-longitude" + _this.upload.index;
	//var altId = "location-altitude" + _this.upload.index;

	_this.latInput = $j( '<input type="text" id="' + latId + '" name="' + latId + '" class="mwe-loc-lat" size="10"/>' );
	_this.lonInput = $j( '<input type="text" id="' + lonId + '" name="' + lonId + '" class="mwe-loc-lon" size="10"/>' );
	//_this.altInput = $j( '<input type="text" id="' + altId + '" name="' + altId + '" class="mwe-loc-alt" size="10"/>' );

	_this.latInput.val( mw.UploadWizard.config.defaultLat );
	_this.lonInput.val( mw.UploadWizard.config.defaultLon );
	//_this.altInput.val( mw.UploadWizard.config.defaultAlt );

	var latDiv = $j( '<div class="mwe-location-lat"></div>' )
		.append( $j ( '<div class="mwe-location-lat-label"></div>' ).append( mw.msg( 'mwe-upwiz-location-lat' )  ) )
		.append( _this.latInput );
	var lonDiv = $j( '<div class="mwe-location-lon"></div>' )
		.append( $j ( '<div class="mwe-location-lon-label"></div>' ).append( mw.msg( 'mwe-upwiz-location-lon' )  ) )
		.append( _this.lonInput );
	//var altDiv = $j( '<div class="mwe-location-alt"></div>' )
	//	.append( $j ( '<div class="mwe-location-alt-label"></div>' ).append( mw.msg( 'mwe-upwiz-location-alt' )  ) )
	//	.append( _this.altInput );

	var locationDiv = $j( '<div class="mwe-location mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
		.append( $j ('<div class="mwe-location-label"></div>' )
		.append( mw.msg( 'mwe-upwiz-location' ) )
		.addHint( 'location' ) )
		.append(
			$j( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + latId + '" generated="true"/></div>' ),
			$j( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + lonId + '" generated="true"/></div>' ),
			//$j( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + altId + '" generated="true"/></div>' ),
			latDiv, lonDiv //, altDiv
		);

	$j( moreDetailsDiv ).append(
		locationDiv,
		otherInformationDiv
	);


	/* Build the form for the file upload */
	_this.$form = $j( '<form id="mwe-upwiz-detailsform' + _this.upload.index + '"></form>' ).addClass( 'detailsForm' );
	_this.$form.append(
		titleContainerDiv,
		_this.descriptionsDiv,
		descriptionAdderDiv,
		_this.copyrightInfoFieldset,
		dateInputDiv,
		$categoriesDiv
	);

	if ( mw.UploadWizard.config.idField ) {
		var idFieldId = "idField" + ( _this.upload.index ).toString();
		_this.idFieldInput = $j( '<input />' ).attr( {
			'type': 'text',
			'id': idFieldId,
			'name': idFieldId,
			'class': 'mwe-idfield',
			'maxlength': mw.UploadWizard.config.idFieldMaxLength
		} );

		_this.idFieldInput.val( mw.UploadWizard.config.idFieldInitialValue );

		_this.$form.append(
			$j( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + idFieldId + '" generated="true"/></div>' ),
			$j( '<div class="mwe-upwiz-details-fieldname"></div>' ).text( mw.UploadWizard.config.idFieldLabel ).requiredFieldLabel(),
			$j( '<div class="mwe-id-field"></div>' ).append( _this.idFieldInput )
		);
	}

	if ( mw.UploadWizard.config.idField2 ) {
		var idField2Id = "idField2" + ( _this.upload.index ).toString();
		_this.idField2Input = $j( '<input />' ).attr( {
			'type': 'text',
			'id': idField2Id,
			'name': idField2Id,
			'class': 'mwe-idfield',
			'maxlength': mw.UploadWizard.config.idField2MaxLength
		} );

		_this.idField2Input.val( mw.UploadWizard.config.idField2InitialValue );

		_this.$form.append(
			$j( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + idField2Id + '" generated="true"/></div>' ),
			$j( '<div class="mwe-upwiz-details-fieldname"></div>' ).text( mw.UploadWizard.config.idField2Label ).requiredFieldLabel(),
			$j( '<div class="mwe-id-field"></div>' ).append( _this.idField2Input )
		);
	}

	_this.$form.append(
		moreDetailsCtrlDiv,
		moreDetailsDiv
	);

	_this.submittingDiv = $j( '<div></div>' ).addClass( 'mwe-upwiz-submitting' )
		.append(
			$j( '<div></div>' ).addClass( 'mwe-upwiz-file-indicator' ),
			$j( '<div></div>' ).addClass( 'mwe-upwiz-details-texts' ).append(
				$j( '<div></div>' ).addClass( 'mwe-upwiz-visible-file-filename-text' ),
				$j( '<div></div>' ).addClass( 'mwe-upwiz-file-status-line' )
			)
		);

	// Add in remove control to submittingDiv
	_this.$removeCtrl = $j.fn.removeCtrl(
			'mwe-upwiz-remove',
			'mwe-upwiz-remove-upload',
			function() { _this.upload.remove(); }
		).addClass( "mwe-upwiz-file-status-line-item" );

	_this.submittingDiv.find( '.mwe-upwiz-file-status-line' )
		.append( _this.$removeCtrl );

	$j( _this.dataDiv ).append(
		_this.$form,
		_this.submittingDiv
	).morphCrossfader();

	$j( _this.div ).append(
		_this.thumbnailDiv,
		_this.dataDiv
	);

	_this.$form.validate();
	_this.$form.find( '.mwe-date' ).rules( "add", {
		required: true,
		/* dateISO: true, */
		messages: {
			required: mw.msg( 'mwe-upwiz-error-blank' )
			/* dateISO: mw.msg( 'mwe-upwiz-error-date' ) */
		}
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
			var $this = $j( this );
			if ( $this.data( 'open' ) === 0 ) {
				$this.data( 'open', 1 ).datepicker( 'show' );
			} else {
				$this.data( 'open', 0 ).datepicker( 'hide' );
			}
		} );

	if ( mw.UploadWizard.config.idField ) {
		_this.idFieldInput.rules( "add", {
			required: true,
			messages: {
				required: mw.msg( 'mwe-upwiz-error-blank' )
			}
		} );
	}

	_this.latInput.rules( "add", {
		min: -90,
		max: 90,
		messages: {
			min: mw.msg( 'mwe-upwiz-error-latitude' ),
			max: mw.msg( 'mwe-upwiz-error-latitude' )
		}
	} );

	_this.lonInput.rules( "add", {
		min: -180,
		max: 180,
		messages: {
			min: mw.msg( 'mwe-upwiz-error-longitude' ),
			max: mw.msg( 'mwe-upwiz-error-longitude' )
		}
	} );

	/* Disabled because not supported on wiki
	 * Does not validate on rationals, only decimals
	 * check if bug 32410 is fixed before enabling. See also bug 39553.
	_this.altInput.rules( "add", {
		number: true,
		messages: {
			number: mw.msg( 'mwe-upwiz-error-altitude' )
		}
	} );
	*/

	mw.UploadWizardUtil.makeToggler(
		moreDetailsCtrlDiv,
		moreDetailsDiv,
		'mwe-upwiz-more-options'
	);

	_this.addDescription(
		!mw.UploadWizard.config.idField,
		mw.LanguageUpWiz.UNKNOWN,
		false,
		mw.UploadWizard.config.defaultDescription
	);

	if ( mw.config.get( 'UploadWizardConfig' ).useTitleBlacklistApi ) {
		// less strict checking, since TitleBlacklist checks should catch most errors.
		_this.$form.find( '.mwe-title' )
			.rules( "add", {
				required: true,
				messages: {
					required: mw.msg( 'mwe-upwiz-error-blank' )
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
					required: mw.msg( 'mwe-upwiz-error-blank' ),
					titleBadchars: mw.msg( 'mwe-upwiz-error-title-badchars' ),
					titleSenselessimagename: mw.msg( 'mwe-upwiz-error-title-senselessimagename' ),
					titleThumbnail: mw.msg( 'mwe-upwiz-error-title-thumbnail' ),
					titleExtension: mw.msg( 'mwe-upwiz-error-title-extension' )
				}
			} );
	}
	// make this a category picker
	var hiddenCats = mw.UploadWizard.config.autoCategories === undefined ? [] : mw.UploadWizard.config.autoCategories;
	if ( typeof mw.UploadWizard.config.autoCategory === 'string' && mw.UploadWizard.config.autoCategory.length > 0 ) {
		hiddenCats.push( mw.UploadWizard.config.autoCategory );
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
		buttontext: mw.msg( 'mwe-upwiz-categories-add' ),
		cats: mw.UploadWizard.config.defaultCategories === undefined ? [] : mw.UploadWizard.config.defaultCategories,
		missingCatsWikiText: missingCatsWikiText,
		willbeaddedtext: mw.msg( 'mwe-upwiz-category-will-be-added' ),
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
			$j( this.containerDiv ).append( this.div );
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
			var firstValue = $j( firstId ).val();
			$j( tag + '[id^=' + id + ']:not(' + firstId + ')' ).each( function () {
				$j( this ).val( firstValue );
				if ( $j( this ).parents( '.mwe-more-details' ).length === 1 ) {
					var moreInfo = $( this ).parents( '.detailsForm' ).find( '.mwe-upwiz-details-more-options a' );
					if ( !moreInfo.hasClass( "mwe-upwiz-toggler-open" ) ) {
						moreInfo.click();
					}
				}
			});
		};

		if ( metadataType === 'title' ) {

			// Add number suffix to first title if no numbering present
			var titleZero = $j( '#title' + sourceId ).val();
			var matches = titleZero.match( /(\D+)(\d{1,3})(\D*)$/ );
			if ( matches === null ) {
				titleZero = titleZero + ' 01';
				// After setting the value, we must trigger input processing for the change to take effect
				$j( '#title' + sourceId ).val( titleZero ).keyup();
			}

			// Overwrite remaining title inputs with first title + increment of rightmost
			// number in the title. Note: We ignore numbers with more than three digits, because these
			// are more likely to be years ("Wikimania 2011 Celebration") or other non-sequence
			// numbers.
			$j( 'input[id^=title]:not(#title' + sourceId + ')' ).each( function (i) {
					var currentTitle = $j( this ).val();
					currentTitle = titleZero.replace( /(\D+)(\d{1,3})(\D*)$/,
						function( str, m1, m2, m3 ) {
						var newstr = ( +m2 + i + 1 ) + '';
						return m1 + new Array( m2.length + 1 - newstr.length )
						.join( '0' ) + newstr + m3;
					}
				);
				$j( this ).val( currentTitle ).keyup();

			} );

		} else if ( metadataType === 'description' ) {

			var destUploads = _this.upload.wizard.uploads;
			$j.each( destUploads, function ( uploadIndex, upload ) {

				if ( upload !== undefined && upload.index !== sourceId ) {

					// We could merge, but it's unlikely that the user wants to do anything other
					// than just having the same descriptions across all files, so rather than
					// create unintended consequences, we nuke any existing descriptions first.
					upload.details.removeAllDescriptions();

					$j.each( _this.descriptions, function ( srcDescriptionIndex, srcDescription ) {
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

			var visibleCategoriesZero = $j( '#categories' + sourceId ).get( 0 ).getCats( ':not(.hidden)' );
			var hiddenCategoriesZero = $j( '#categories' + sourceId ).get( 0 ).getCats( '.hidden' );
			$j( 'input[id^=categories]:not(#categories' + sourceId + ')' ).each( function( i, input ) {
				if ( this.id !== ( 'categories' + sourceId ) ) {

					// As with descriptions, we nuke whatever categories are there already.
					input.removeAllCats();

					$j.each(visibleCategoriesZero, function() {
						input.insertCat( this, false );
					});
					$j.each(hiddenCategoriesZero, function() {
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

		_this.copyMetadataCtrlDiv = $j( '<div class="mwe-upwiz-details-copy-metadata"></div>' );
		var copyMetadataDiv = $j( '<div class="mwe-upwiz-metadata-copier"></div>' );

		$j.each( _this.copyMetadataTypes, function addToMetadataDiv( metadataName, defaultStatus ) {
			var cb = 'mwe-upwiz-copy-' + metadataName,
				copyMetadataMsg,
				$checkbox;
			if ( metadataName === 'description' || metadataName === 'categories' ) {
				copyMetadataMsg = mw.msg( cb, 1 );
			} else {
				copyMetadataMsg = mw.msg( cb );
			}
			$checkbox = $j( '<input>' ).attr( 'type', 'checkbox' ).attr( 'name', cb ).attr( 'id', cb );
			if ( defaultStatus === true ) {
				$checkbox.attr( 'checked', 'checked' );
			}
			copyMetadataDiv.append( $checkbox );
			copyMetadataDiv.append( $j( '<label for="' + cb + '">' + copyMetadataMsg + '</label>' ) );
			copyMetadataDiv.append( $j( '<br />' ) );
		} ) ;

		copyMetadataDiv.append(
			$j( '<button type="button" id="mwe-upwiz-copy-metadata-button">' )
			.msg( 'mwe-upwiz-copy-metadata-button' )
			.button()
			.click(
				function( e ) {
					var button = $( this ).find( 'span' );
					$j.each( _this.copyMetadataTypes, function makeCopies( metadataType, defaultStatus ) {
							if ( $j( '#mwe-upwiz-copy-' + metadataType ).is( ':checked' ) ) {
								_this.copyMetadata( metadataType );
							}
						} );
					button.text( mw.msg( 'mwe-upwiz-copied-metadata-button' ) );
					setTimeout( function( ) {
						button.text( mw.msg( 'mwe-upwiz-copy-metadata-button' ) );
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
			$lbl.text( mw.msg( msg.title, msg.counter() ) );
		} );
		$lbl = $( '.mwe-upwiz-details-copy-metadata a', _this.$form );
		$lbl.text( mw.msg( 'mwe-upwiz-copy-metadata', _this.upload.wizard.uploads.length - 1 ) );
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
		var titleInputValid = $j( _this.titleInput ).data( 'valid' );
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
				$j( _this.deedDiv ).append( _this.upload.providedFile.licenseMessage );

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
		var $errorEl = _this.$form.find( 'label[for=' + _this.titleId + '].errorTitleUnique' );

		if ( result.unique.isUnique && result.blacklist.notBlacklisted && !result.unique.isProtected ) {
			$j( _this.titleInput ).data( 'valid', true );
			$errorEl.hide().empty();
			_this.ignoreWarningsInput = undefined;
			return;
		}

		// something is wrong with this title.
		$j( _this.titleInput ).data( 'valid', false );

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
				errHtml = mw.message( 'mwe-upwiz-fileexists-replace-on-page', titleString, $j( '<a />' ).attr( { href: result.href, target: '_blank' } ) ).parse();
			} else {
				errHtml = mw.msg( 'mwe-upwiz-fileexists-replace-no-link', titleString );
			}

			$errorEl.text( errHtml );
		} else if ( result.unique.isProtected ) {
			errHtml = mw.msg( 'mwe-upwiz-error-title-protected' );
			$errorEl.text( errHtml );
		} else {
			errHtml = mw.msg( 'mwe-upwiz-blacklisted', titleString );
			$errorEl.text( errHtml );

			var completeErrorLink = $j( '<span class="contentSubLink"></span>' ).msg(
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

				var feedbackLink = $j( '<span class="contentSubLink"></span>' ).msg(
					'mwe-upwiz-feedback-blacklist-report-prompt',
					function() {
						feedback.launch( {
							message: mw.msg( 'mwe-upwiz-feedback-blacklist-line-intro', result.blacklist.blacklistLine ),
							subject: mw.msg( 'mwe-upwiz-feedback-blacklist-subject', titleString )
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
		$j( _this.descriptionAdder ).html( mw.msg( 'mwe-upwiz-desc-add-' + ( _this.descriptions.length === 0 ? '0' : 'n' )  )  );
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
		_this.updateCopyMsgs();
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
		_this.updateCopyMsgs();
	},

	removeAllDescriptions: function() {
		var _this = this;
		$j( _this.descriptionsDiv ).children().remove();
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
		$j( _this.errorDiv ).append( $j( '<p class="mwe-upwiz-upload-error">' + mw.msg( msg, args.slice( 1 ) ) + '</p>' ) );
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
			$j.each( [ 'datetimeoriginal', 'datetimedigitized', 'datetime', 'date' ], function( i, propName ) {
				var dateInfo = metadata[propName];
				if ( ! mw.isEmpty( dateInfo ) ) {
					var matches = $j.trim( dateInfo ).match( yyyyMmDdRegex );
					if ( ! mw.isEmpty( matches ) ) {
						var timeMatches = $j.trim( dateInfo ).match( timeRegex );
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
						return false; // break from $j.each
					}
				}
			} );
		}

		// If we don't have EXIF lets try other sources - Flickr
		if ( dateObj === undefined && typeof this.upload.file !== 'undefined' && typeof this.upload.file.date !== 'undefined' ) {
			var dateTimeRegex = /^\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d/;
			var matches = this.upload.file.date.match( dateTimeRegex );
			if ( !mw.isEmpty( matches ) ) {
				$j( _this.dateInput ).val( this.upload.file.date );
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
		$j( _this.dateInput ).val( dateStr );
	},

	/**
	 * Set the title of the thing we just uploaded, visibly
	 * Note: the interface's notion of "filename" versus "title" is the opposite of MediaWiki
	 */
	prefillTitle: function() {
		$j( this.titleInput ).val( this.upload.title.getNameText() );
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
		var _this = this;

		if ( _this.upload.imageinfo.metadata ) {
			var m = _this.upload.imageinfo.metadata;

			if ( m.gpslatitude !== undefined && m.gpslongitude !== undefined ) {
				$j( _this.latInput ).val( m.gpslatitude );
				$j( _this.lonInput ).val( m.gpslongitude );
			} else if (
				typeof this.upload.file !== 'undefined' &&
				typeof this.upload.file.location !== 'undefined' &&
				this.upload.file.location.latitude &&
				this.upload.file.location.longitude
			) {
				$j( _this.latInput ).val( this.upload.file.location.latitude );
				$j( _this.lonInput ).val( this.upload.file.location.longitude );
			}

			//if ( m['gpsaltitude'] !== undefined ) {
			//	$j( _this.altInput ).val( m['gpsaltitude'] );
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
			$j( _this.authorInput ).val( _this.upload.imageinfo.metadata.author );
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
					$j( _this.licenseInput ).val( copyright );
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
			$j.each( _this.descriptions, function( i, desc ) {
				information.description += desc.getWikiText();
			} );

			// Add id field if needed
			if ( mw.UploadWizard.config.idField ) {
				var idFieldValue = $j.trim( $j( _this.idFieldInput ).val() );

				if ( ! mw.isEmpty( idFieldValue ) ) { // HAXXX
					information.description += mw.UploadWizard.config.idField.replace( '$1', idFieldValue );
				}
			}

			// Add 2nd id field if needed
			if ( mw.UploadWizard.config.idField2 ) {
				var idField2Value = $j.trim( $j( _this.idField2Input ).val() );

				if ( ! mw.isEmpty( idField2Value ) ) { // HAXXX
					information.description += mw.UploadWizard.config.idField2.replace( '$1', idField2Value );
				}
			}

			information.date = $j.trim( $j( _this.dateInput ).val() );

			var deed = _this.upload.deedChooser.deed;

			information.source = deed.getSourceWikiText();

			information.author = deed.getAuthorWikiText();

			var info = '';
			for ( var key in information ) {
				info += '|' + key + '=' + information[key] + "\n";
			}

			wikiText += "=={{int:filedesc}}==\n";
			wikiText += '{{Information\n' + info + '}}\n';

			var lat = $j.trim( $j( _this.latInput ).val() );
			var lon = $j.trim( $j( _this.lonInput ).val() );
			//var alt = $j.trim( $j( _this.altInput ).val() );

			// Do not require the altitude to be set, to prevent people from entering 0
			// while it's actually unknown.
			// When none is provided, this will result in {{Location dec|int|int|}}.
			if( lat !== '' && lon !== '' ) {
				wikiText += '{{Location dec|'+ lat + '|' + lon + '}}\n';
			}

			// add an "anything else" template if needed
			var otherInfoWikiText = $j.trim( $j( _this.otherInformationInput ).val() );
			if ( ! mw.isEmpty( otherInfoWikiText ) ) {
				wikiText += otherInfoWikiText + "\n\n";
			}

			// add licensing information
			wikiText += "\n=={{int:license-header}}==\n";
			wikiText += deed.getLicenseWikiText() + "\n\n";

			if ( mw.UploadWizard.config.autoWikiText !== undefined ) {
				wikiText += mw.UploadWizard.config.autoWikiText;
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
		_this.setStatus( mw.msg( 'mwe-upwiz-submitting-details' ) );
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
			var warnings = null;
			var wasDeleted = false;
			if ( result && result.upload && result.upload.result == 'Poll' ) {
				// if async publishing takes longer than 10 minutes give up
				if ( ( ( new Date() ).getTime() - firstPoll ) > 10 * 60 * 1000 ) {
					err('server-error', 'unknown server error');
				} else {
					_this.setStatus( mw.msg( 'mwe-upwiz-' + result.upload.stage ) );
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
				return;
			}
			if ( result && result.upload && result.upload.warnings ) {
				warnings = result.upload.warnings;
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
				_this.setStatus( mw.msg( 'mwe-upwiz-published' ) );
			} else if ( wasDeleted === true ) {
				params.ignorewarnings = 1;
				_this.upload.api.postWithEditToken( params, ok, err );
			} else if ( result && result.upload.warnings ) {
				if ( warnings.thumb ) {
					_this.recoverFromError( _this.titleId, mw.msg( 'mwe-upwiz-error-title-thumbnail' ) );
				} else if ( warnings.badfilename ) {
					_this.recoverFromError( _this.titleId, mw.msg( 'mwe-upwiz-error-title-badchars' ) );
				} else if ( warnings['bad-prefix'] ) {
					_this.recoverFromError( _this.titleId, mw.msg( 'mwe-upwiz-error-title-senselessimagename' ) );
				} else if ( warnings.exists || warnings['exists-normalized'] ) {
					_this.recoverFromError( _this.titleId, mw.msg( 'mwe-upwiz-api-warning-exists', _this.upload.title.getUrl() ) );
				} else if ( warnings.duplicate ) {
					_this.recoverFromError( _this.titleId, mw.msg( 'mwe-upwiz-upload-error-duplicate' ) );
				} else if ( warnings['duplicate-archive'] ) {
					if ( _this.upload.ignoreWarning['duplicate-archive'] ) {
						// We already told the interface to ignore this warning, so
						// let's steamroll over it and re-call this handler.
						params.ignorewarnings = true;
						_this.upload.api.postWithEditToken( params, ok, err );
					} else {
						// This should _never_ happen, but just in case....
						_this.recoverFromError( _this.titleId, mw.msg( 'mwe-upwiz-upload-error-duplicate-archive' ) );
					}
				} else {
					var warningsKeys = [];
					$j.each( warnings, function( key, val ) {
						warningsKeys.push( key );
					} );
					_this.upload.state = 'error';
					_this.recoverFromError( _this.titleId, mw.msg( 'api-error-unknown-warning', warningsKeys.join( ', ' ) ) );
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
	 * @param {String} error message to show
	 */
	recoverFromError: function( fieldId, errorMessage ) {
		this.upload.state = 'error';
		this.dataDiv.morphCrossfade( '.detailsForm' );
		$j( '#' + fieldId ).addClass( 'mwe-error' );
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
		var statusLine = mw.msg( 'api-error-unclassified' );
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
				this.recoverFromError( this.titleId, mw.msg( 'mwe-upwiz-error-title-' + titleErrorMap[code] ) );
				return;
			} else {
				statusKey = 'api-error-' + code;
				if ( code === 'filetype-banned' && result.error.blacklisted ) {
					var comma = mw.msg( 'comma-separator' );
					code = 'filetype-banned-type';
					statusLine = mw.msg( 'api-error-filetype-banned-type',
						result.error.blacklisted.join( comma ),
						result.error.allowed.join( comma ),
						result.error.allowed.length,
						result.error.blacklisted.length
					);
				} else if ( result.error.info ) {
					statusLine = mw.msg( statusKey, result.error.info );
				} else {
					statusLine = mw.msg( statusKey, '[no error info]' );
				}
			}
		}
		this.showError( code, statusLine );
	},

	setStatus: function( s ) {
		this.div.find( '.mwe-upwiz-file-status-line' ).html( s ).show();
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
		var cleaned = $j.trim( s.replace( re, '' ) );
		this.upload.title = new mw.Title( cleaned + '.' + ext, fileNsId );
		return this.upload.title;
	}

};

}) ( window.mediaWiki, jQuery );
