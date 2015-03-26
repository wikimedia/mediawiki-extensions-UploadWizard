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
( function ( mw, uw, $ ) {

	var fileNsId = mw.config.get( 'wgNamespaceIds' ).file;

	mw.UploadWizardDetails = function ( upload, containerDiv ) {
		var descriptionAdderDiv, titleContainerDiv, $categoriesDiv,
			commonsCategoriesLink, categoriesHint, categoriesHinter,
			categoriesId, dateInputId, dateErrorDiv, dateInputDiv,
			moreDetailsCtrlDiv, moreDetailsDiv, otherInformationId,
			otherInformationDiv, latitudeDiv, longitudeDiv, headingDiv,
			showMap, linkDiv, locationDiv, hiddenCats, missingCatsWikiText,
			$list,
			details = this;

		this.upload = upload;
		this.containerDiv = containerDiv;
		this.api = upload.api;

		this.descriptions = [];

		this.div = $( '<div class="mwe-upwiz-info-file ui-helper-clearfix filled"></div>' );

		this.thumbnailDiv = $( '<div class="mwe-upwiz-thumbnail mwe-upwiz-thumbnail-side"></div>' );

		this.dataDiv = $( '<div class="mwe-upwiz-data"></div>' );

		// descriptions
		this.descriptionsDiv = $( '<div class="mwe-upwiz-details-descriptions"></div>' );

		this.descriptionAdder = $( '<a class="mwe-upwiz-more-options"></a>' )
						.text( mw.message( 'mwe-upwiz-desc-add-0' ).text() )
						.click( function ( ) { details.addDescription(); } );

		descriptionAdderDiv =
			$( '<div>' ).append(
				$( '<div class="mwe-upwiz-details-fieldname"></div>' ),
				$( '<div class="mwe-upwiz-details-descriptions-add"></div>' )
						.append( this.descriptionAdder )
			);

		// Commons specific help for titles
		//	http://commons.wikimedia.org/wiki/Commons:File_naming
		//	http://commons.wikimedia.org/wiki/MediaWiki:Filename-prefix-blacklist
		//	XXX make sure they can't use ctrl characters or returns or any other bad stuff.
		this.titleId = 'title' + this.upload.index;
		this.titleInput = this.makeTextInput( this.titleId, 'title', undefined, 250 )
			.keyup( function () {
				details.setCleanTitle( $( details.titleInput ).val() );
			} )
			.destinationChecked( {
				api: this.upload.api,
				spinner: function (bool) { details.toggleDestinationBusy(bool); },
				preprocess: function ( name ) {
					var cleanTitle;

					// First, clear out any existing errors, to prevent strange visual effects.
					// Fixes bug 32469. But introduced a new bug: Some validator methods run immediately
					// and this cleared out any error set by the validator if no titleblacklist
					// is installed (where validation is done entirely remotely) because that second type
					// of validation had a delay.
					// Now only clearing errors from the delayed methods.
					// TLDR; FIXME: `clearTitleErrors` should not be in a function called "preprocess"
					// It's simply counter-intuitive.
					details.clearTitleErrors();

					if ( name !== '' ) {
						// turn the contents of the input into a MediaWiki title ("File:foo bar.jpg") to look up
						// side effect -- also sets this as our current title
						cleanTitle = details.setCleanTitle( name );
						return cleanTitle && cleanTitle.getPrefixedText() || '';
					} else {
						return name;
					}
				},
				processResult: function ( result ) { details.processDestinationCheck( result ); }
			} );

		this.titleErrorDiv = $( '<div>' ).addClass( 'mwe-upwiz-details-input-error' );

		function makeAndAppendTitleErrorLabel( labelClass ) {
			$( '<label>' )
				.attr( {
					for: details.titleId,
					generated: 'true'
				} )
				.addClass( 'mwe-error ' + labelClass )
				.appendTo( details.titleErrorDiv );
		}

		makeAndAppendTitleErrorLabel( 'mwe-validator-error mwe-upwiz-validation-immediate' );
		makeAndAppendTitleErrorLabel( 'mwe-upwiz-duplicate-title mwe-upwiz-validation-immediate' );
		makeAndAppendTitleErrorLabel( 'mwe-upwiz-error-title-unique mwe-upwiz-validation-delayed' );
		makeAndAppendTitleErrorLabel( 'mwe-upwiz-error-recovery mwe-upwiz-validation-delayed' );

		titleContainerDiv = $('<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>')
			.append(
				this.titleErrorDiv,
				$( '<div class="mwe-upwiz-details-fieldname"></div>' )
					.msg( 'mwe-upwiz-title' )
					.requiredFieldLabel()
					.addHint( 'title' ),
				$( '<div class="mwe-upwiz-details-input"></div>' ).append( this.titleInput )
			);

		this.deedDiv = $( '<div class="mwe-upwiz-custom-deed" />' );

		this.copyrightInfoFieldset = $('<fieldset class="mwe-fieldset mwe-upwiz-copyright-info"></fieldset>')
			.hide()
			.append(
				$( '<legend class="mwe-legend">' ).text( mw.message( 'mwe-upwiz-copyright-info' ).text() ),
				this.deedDiv
			);

		$categoriesDiv = $(
			'<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix">' +
				'<div class="mwe-upwiz-details-fieldname"></div>' +
				'<div class="mwe-upwiz-details-input"></div>' +
			'</div>'
		);
		commonsCategoriesLink = $( '<a>' ).attr( { target:'_blank', href:'http://commons.wikimedia.org/wiki/Commons:Categories' } );
		categoriesHint = $( '<span>' ).msg( 'mwe-upwiz-tooltip-categories', commonsCategoriesLink ).html();
		categoriesHinter = function () { return categoriesHint; };
		$categoriesDiv
			.find( '.mwe-upwiz-details-fieldname' )
			.append( mw.message( 'mwe-upwiz-categories' ).escaped() )
			.addHint( 'mwe-upwiz-categories-hint', categoriesHinter );
		categoriesId = 'categories' + this.upload.index;
		$categoriesDiv.find( '.mwe-upwiz-details-input' )
			.append( this.makeTextInput( categoriesId ) );

		dateInputId = 'dateInput' + ( this.upload.index ).toString();

		dateErrorDiv = $('<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + dateInputId + '" generated="true"/></div>');

		/* XXX must localize this by loading jquery.ui.datepicker-XX.js where XX is a language code */
		/* jQuery.ui.datepicker also modifies first-day-of-week according to language, which is somewhat wrong. */
		/* $.datepicker.setDefaults() for other settings */
		this.dateInput = this.makeTextInput( dateInputId, 'date', 20 );

		dateInputDiv = $( '<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
			.append(
				dateErrorDiv,
				$( '<div class="mwe-upwiz-details-fieldname"></div>' ).text( mw.message( 'mwe-upwiz-date-created' ).text() ).requiredFieldLabel().addHint( 'date' ),
				$( '<div class="mwe-upwiz-details-input"></div>' ).append( this.dateInput ) );

		moreDetailsCtrlDiv = $( '<div class="mwe-upwiz-details-more-options"></div>' );

		moreDetailsDiv = $('<div class="mwe-more-details"></div>');

		otherInformationId = 'otherInformation' + this.upload.index;
		this.otherInformationInput = $( '<textarea id="' + otherInformationId + '" name="' + otherInformationId + '" class="mwe-upwiz-other-textarea" rows="2" cols="36"></textarea>' )
			.growTextArea()
			.on( 'keyup', function ( e ) {
				e.stopPropagation();
				return false;
			} );

		otherInformationDiv = $('<div>')
			.append( $( '<div class="mwe-upwiz-details-more-label"></div>' ).text( mw.message( 'mwe-upwiz-other' ).text() ).addHint( 'other' ) )
			.append( this.otherInformationInput );

		locationDiv = $( '<div class="mwe-location mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
			.append( $ ('<div class="mwe-location-label"></div>' )
			.append( mw.message( 'mwe-upwiz-location' ).escaped() )
			.addHint( 'location' ) )
			.append(
				$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + 'location-lat' + this.upload.index + '" generated="true"/></div>' ),
				$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + 'location-lon' + this.upload.index + '" generated="true"/></div>' ),
				$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + 'location-heading' + this.upload.index + '" generated="true"/></div>' ),
				//$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + altId + '" generated="true"/></div>' ),
				latitudeDiv, longitudeDiv, headingDiv, linkDiv//, altitudeDiv
			);

		this.$latitudeInput = this.makeLocationField( 'lat', locationDiv );
		this.$longitudeInput = this.makeLocationField( 'lon', locationDiv );
		this.$headingInput = this.makeLocationField( 'heading', locationDiv );

		showMap = $( '<a></a>' )
			.append( mw.message( 'mwe-upwiz-location-button' ).text() )
			.hide();

		linkDiv = $( '<div class="mwe-loc-link"></div>' )
			.append( showMap )
			.appendTo( locationDiv );

		$( moreDetailsDiv ).append(
			locationDiv,
			otherInformationDiv
		);

		/* Build the form for the file upload */
		this.$form = $( '<form id="mwe-upwiz-detailsform' + this.upload.index + '"></form>' ).addClass( 'detailsForm' );
		this.$form.append(
			titleContainerDiv,
			this.descriptionsDiv,
			descriptionAdderDiv,
			this.copyrightInfoFieldset,
			dateInputDiv,
			$categoriesDiv
		);

		this.fields = [];
		$.each( mw.UploadWizard.config.fields, function ( i, field ) {
			if ( field.wikitext ) {
				var $fieldInput,
					fieldInputId = 'field_' + i + '_' + ( details.upload.index ).toString();

				if ( !( 'type' in field ) ) {
					field.type = 'text';
				}

				if ( field.type === 'select' ) {
					$fieldInput = $( '<select>' ).attr( {
						id: fieldInputId,
						name: fieldInputId,
						class: 'mwe-idfield'
					} ).data( 'field', field );

					if ( 'options' in field ) {
						$.each( field.options, function ( val, label ) {
							$fieldInput.append( $( '<option>' )
							.val( val )
							.text( label ) );
						} );
					}
				} else {
					$fieldInput = details.makeTextInput( fieldInputId, 'idfield', undefined, field.maxLength, field.initialValue )
						.data( 'field', field );
				}

				details.$form.append(
					$( '<div>' ).attr( 'class', 'mwe-upwiz-details-input-error' )
						.append( $( '<label>' ).attr( { class: 'mwe-validator-error', for: fieldInputId, generated: 'true' } ) )
				);
				if ( field.required ) {
					details.$form.append( $( '<div>' ).attr( 'class', 'mwe-upwiz-details-fieldname' ).html( field.label ).requiredFieldLabel() );
				} else {
					details.$form.append( $( '<div>' ).attr( 'class', 'mwe-upwiz-details-fieldname' ).html( field.label ) );
				}
				details.$form.append(
					$( '<div>' ).attr( 'class', 'mwe-id-field' ).append( $fieldInput )
				);

				details.fields.push( $fieldInput );
			}
		} );

		this.$form.append(
			moreDetailsCtrlDiv,
			moreDetailsDiv
		);

		this.submittingDiv = $( '<div>' ).addClass( 'mwe-upwiz-submitting' )
			.append(
				$( '<div>' ).addClass( 'mwe-upwiz-file-indicator' ),
				$( '<div>' ).addClass( 'mwe-upwiz-details-texts' ).append(
					$( '<div>' ).addClass( 'mwe-upwiz-visible-file-filename-text' ),
					$( '<div>' ).addClass( 'mwe-upwiz-file-status-line' )
				)
			);

		// Add in remove control to submittingDiv
		this.$removeCtrl = $.fn.removeCtrl(
				'mwe-upwiz-remove',
				'mwe-upwiz-remove-upload',
				function () { details.upload.remove(); }
			).addClass( 'mwe-upwiz-file-status-line-item' );

		this.submittingDiv.find( '.mwe-upwiz-file-status-line' )
			.append( this.$removeCtrl );

		$( this.dataDiv ).append(
			this.$form,
			this.submittingDiv
		).morphCrossfader();

		$( this.div ).append(
			this.thumbnailDiv,
			this.dataDiv
		);

		this.$form.validate();
		this.$form.find( '.mwe-date' ).rules( 'add', {
			required: true,
			/* dateISO: true, */
			messages: {
				required: mw.message( 'mwe-upwiz-error-blank' ).escaped()
				/* dateISO: mw.message( 'mwe-upwiz-error-date' ).escaped() */
			}
		} );

		$list = this.$form.find( '.mwe-loc-lat, .mwe-loc-lon ' )
			.on( 'input keyup change cut paste', function () {
				var link = details.osmMapLink();
				if (  $list.valid() ) {
					showMap.attr( { href: link, target: '_blank' } ).show();
				} else {
					showMap.hide();
				}
			} );

		$.each( this.fields, function ( i, $fieldInput ) {
			$fieldInput.rules( 'add', {
				required: $fieldInput.data( 'field' ).required,
				messages: {
					required: mw.message( 'mwe-upwiz-error-blank').escaped()
				}
			} );
		} );
		this.$form.find( '.mwe-date' )
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
			.click( function () {
				var $this = $( this );
				if ( $this.data( 'open' ) === 0 ) {
					$this.data( 'open', 1 ).datepicker( 'show' );
				} else {
					$this.data( 'open', 0 ).datepicker( 'hide' );
				}
			} );

		this.$latitudeInput.rules( 'add', {
			min: -90,
			max: 90,
			messages: {
				min: mw.message( 'mwe-upwiz-error-latitude' ).escaped(),
				max: mw.message( 'mwe-upwiz-error-latitude' ).escaped()
			}
		} );

		this.$longitudeInput.rules( 'add', {
			min: -180,
			max: 180,
			messages: {
				min: mw.message( 'mwe-upwiz-error-longitude' ).escaped(),
				max: mw.message( 'mwe-upwiz-error-longitude' ).escaped()
			}
		} );

		this.$headingInput.rules( 'add', {
			min: 0,
			max: 360,
			messages: {
				min: mw.message( 'mwe-upwiz-error-heading' ).escaped(),
				max: mw.message( 'mwe-upwiz-error-heading' ).escaped()
			}
		} );

		/* Disabled because not supported on wiki
		 * Does not validate on rationals, only decimals
		 * check if bug 32410 is fixed before enabling. See also bug 39553.
		_this.altitudeInput.rules( "add", {
			number: true,
			messages: {
				number: mw.message( 'mwe-upwiz-error-altitude' ).escaped()
			}
		} );
		*/

		this.makeToggler(
			moreDetailsCtrlDiv,
			moreDetailsDiv,
			'mwe-upwiz-more-options'
		);

		this.addDescription(
			!(
				mw.UploadWizard.config.fields &&
				mw.UploadWizard.config.fields.length &&
				mw.UploadWizard.config.fields[0].wikitext
			),
			mw.LanguageUpWiz.UNKNOWN,
			false,
			mw.UploadWizard.config.defaults.description
		);

		if ( mw.config.get( 'UploadWizardConfig' ).useTitleBlacklistApi ) {
			// less strict checking, since TitleBlacklist checks should catch most errors.
			this.$form.find( '.mwe-title' )
				.rules( 'add', {
					required: true,
					titleParsability: true,
					messages: {
						required: mw.message( 'mwe-upwiz-error-blank' ).escaped(),
						titleParsability: mw.message( 'mwe-upwiz-unparseable-title' ).escaped()
					}
				} );
		} else {
			// make the title field required, and non-blacklisted
			this.$form.find( '.mwe-title' )
				.rules( 'add', {
					required: true,
					titleBadchars: true,
					titleSenselessimagename: true,
					titleThumbnail: true,
					titleExtension: true,
					titleParsability: true,
					messages: {
						required: mw.message( 'mwe-upwiz-error-blank' ).escaped(),
						titleBadchars: mw.message( 'mwe-upwiz-error-title-badchars' ).escaped(),
						titleSenselessimagename: mw.message( 'mwe-upwiz-error-title-senselessimagename' ).escaped(),
						titleThumbnail: mw.message( 'mwe-upwiz-error-title-thumbnail' ).escaped(),
						titleExtension: mw.message( 'mwe-upwiz-error-title-extension' ).escaped(),
						titleParsability: mw.message( 'mwe-upwiz-unparseable-title' ).escaped()
					}
				} );
		}

		// make this a category picker
		hiddenCats = mw.UploadWizard.config.autoAdd.categories === undefined ? [] : mw.UploadWizard.config.autoAdd.categories;

		// Add tracking categories
		if ( mw.UploadWizard.config.trackingCategory ) {
			if ( mw.UploadWizard.config.trackingCategory.all ) {
				hiddenCats.push( mw.UploadWizard.config.trackingCategory.all );
			}
			if ( mw.UploadWizard.config.trackingCategory.campaign ) {
				hiddenCats.push( mw.UploadWizard.config.trackingCategory.campaign );
			}
		}

		missingCatsWikiText = null;
		if (
			typeof mw.UploadWizard.config.missingCategoriesWikiText === 'string' &&
			mw.UploadWizard.config.missingCategoriesWikiText.length > 0
		) {
			missingCatsWikiText = mw.UploadWizard.config.missingCategoriesWikiText;
		}

		this.$catinput = $categoriesDiv.find( '.mwe-upwiz-details-input' ).find( 'input' );
		this.$catinput.mwCoolCats( {
			api: this.upload.api,
			hiddenCats: hiddenCats,
			buttontext: mw.message( 'mwe-upwiz-categories-add' ).text(),
			cats: mw.UploadWizard.config.defaults.categories === undefined ? [] : mw.UploadWizard.config.defaults.categories,
			missingCatsWikiText: missingCatsWikiText,
			willbeaddedtext: mw.message( 'mwe-upwiz-category-will-be-added' ).text(),
			onnewcat: function () {
				details.updateCopyMsgs();
			}
		} );
	};

	/**
	 * Reliably turn input into a MediaWiki title that is located in the File: namespace
	 *
	 *     var title = mw.UploadWizardDetails.makeTitleInFileNS( 'filename.ext' );
	 *
	 * @static
	 * @param {string} filename Desired file name; optionally with File: namespace prefixed
	 * @return {mw.Title|null}
	 */
	mw.UploadWizardDetails.makeTitleInFileNS = function ( filename ) {
		var mwTitle = mw.Title.newFromText( filename, fileNsId );
		if ( mwTitle && mwTitle.getNamespaceId() !== fileNsId ) {
			// Force file namespace
			mwTitle = mw.Title.newFromText( 'File:' + filename );
		}
		return mwTitle;
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
		attach: function () {
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
		 * Get a reference to the error labels
		 *
		 * @return {jQuery} reference to error labels
		 */
		$getTitleErrorLabels: function () {
			if ( !this.$titleErrorLabels || this.$titleErrorLabels.length === 0 ) {
				this.$titleErrorLabels = this.$form
					.find( 'label[for=' + this.titleId + '].mwe-upwiz-validation-delayed' );
			}
			return this.$titleErrorLabels;
		},

		/*
		 * Clears errors shown in UI
		 *
		 * @chainable
		 */
		clearTitleErrors: function () {
			var $labels = this.$getTitleErrorLabels();

			$labels.empty();

			return this;
		},

		/*
		 * Display error message about multiple uploaded files with the same title specified
		 *
		 * @chainable
		 */
		setDuplicateTitleError: function () {
			var $duplicateTitleLabel = this.$form
				.find( 'label[for=' + this.titleId + '].mwe-upwiz-duplicate-title' );

			$duplicateTitleLabel.text( mw.message( 'mwe-upwiz-error-title-duplicate' ).text() );

			// Clear error as soon as the value changed
			// The input event is not implemented in all browsers we support but
			// it's sufficient to clear the error upon form submit and when this happens
			// the change event is fired anyway
			// keyup would clear the error when pressing meta keys, adding leading spaces, ...
			this.titleInput.one( 'input change', function () {
				$duplicateTitleLabel.empty();
			} );

			return this;
		},

		/*
		 * Empties the error message about multiple uploaded files with the same title specified
		 *
		 * @chainable
		 */
		clearDuplicateTitleError: function () {
			this.$form
				.find( 'label[for=' + this.titleId + '].mwe-upwiz-duplicate-title' )
				.empty();

			return this;
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

			var titleZero, matches, destUploads, visibleCategoriesZero,
				hiddenCategoriesZero,
				details = this,
				sourceId = this.upload.wizard.uploads[0].index;

			// In the simplest case, we can use this self-explanatory vanilla loop.
			function simpleCopy( id, tag ) {
				if ( tag === undefined ) {
					tag = 'input';
				}
				var firstId = '#' + id + sourceId,
					firstValue = $( firstId ).val();
				$( tag + '[id^=' + id + ']:not(' + firstId + ')' ).each( function () {
					$( this ).val( firstValue );
					if ( $( this ).parents( '.mwe-more-details' ).length === 1 ) {
						var moreInfo = $( this ).parents( '.detailsForm' ).find( '.mwe-upwiz-details-more-options a' );
						if ( !moreInfo.hasClass( 'mwe-upwiz-toggler-open' ) ) {
							moreInfo.click();
						}
					}
				});
			}

			if ( metadataType === 'title' ) {

				// Add number suffix to first title if no numbering present
				titleZero = $( '#title' + sourceId ).val();
				matches = titleZero.match( /(\D+)(\d{1,3})(\D*)$/ );
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
						function ( str, m1, m2, m3 ) {
							var newstr = ( +m2 + i + 1 ) + '';
							return m1 + new Array( m2.length + 1 - newstr.length )
								.join( '0' ) + newstr + m3;
						}
					);
					$( this ).val( currentTitle ).keyup();

				} );
			} else if ( metadataType === 'description' ) {
				destUploads = this.upload.wizard.uploads;
				$.each( destUploads, function ( uploadIndex, upload ) {
					if ( upload !== undefined && upload.index !== sourceId ) {

						// We could merge, but it's unlikely that the user wants to do anything other
						// than just having the same descriptions across all files, so rather than
						// create unintended consequences, we nuke any existing descriptions first.
						upload.details.removeAllDescriptions();

						$.each( details.descriptions, function ( srcDescriptionIndex, srcDescription ) {
							var isRequired = srcDescription.isRequired,
								languageCode = srcDescription.getLanguage(),
								allowRemoval = !isRequired,
								descriptionText = srcDescription.getDescriptionText();
							upload.details.addDescription ( isRequired, languageCode, allowRemoval, descriptionText );
						} );
					}
				} );

			} else if ( metadataType === 'date' ) {

				simpleCopy( 'dateInput' );

			} else if ( metadataType === 'categories' ) {

				visibleCategoriesZero = $( '#categories' + sourceId ).get( 0 ).getCats( ':not(.hidden)' );
				hiddenCategoriesZero = $( '#categories' + sourceId ).get( 0 ).getCats( '.hidden' );
				$( 'input[id^=categories]:not(#categories' + sourceId + ')' ).each( function ( i, input ) {
					if ( this.id !== ( 'categories' + sourceId ) ) {

						// As with descriptions, we nuke whatever categories are there already.
						input.removeAllCats();

						$.each(visibleCategoriesZero, function () {
							input.insertCat( this, false );
						});
						$.each(hiddenCategoriesZero, function () {
							input.insertCat( this, true );
						});

					}
				});

			} else if ( metadataType === 'location' ) {

				simpleCopy( 'location-lat' );
				simpleCopy( 'location-lon' );
				simpleCopy( 'location-heading' );
				//simpleCopy( 'location-altitude' );

			} else if ( metadataType === 'other' ) {

				simpleCopy( 'otherInformation', 'textarea' );

				// Copy fields added though campaigns
				$.each( mw.UploadWizard.config.fields, function ( i, field ) {
					var elementType = field.type;

					switch ( elementType ) {
						case 'select':
							// Field type equals HTML element type
							break;
						default:
							// Element type must be adjusted to match the selector
							elementType = 'input';
					}
					if ( field.wikitext ) {
						simpleCopy( 'field_' + i + '_', elementType );
					}
				});

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
		buildAndShowCopyMetadata: function () {
			var details = this,
				$copyMetadataDiv = $( '<div class="mwe-upwiz-metadata-copier"></div>' ),
				$checkboxes = $();

			if ( mw.UploadWizard.config.copyMetadataFeature !== true ||
				this.copyMetadataCtrlDiv !== undefined ) {
				return;
			}

			this.copyMetadataCtrlDiv = $( '<div class="mwe-upwiz-details-copy-metadata"></div>' );

			$.each( this.copyMetadataTypes, function addToMetadataDiv( metadataName, defaultStatus ) {
				var copyMessage = 'mwe-upwiz-copy-' + metadataName,
					copyMetadataMsg,
					$checkbox;
				if ( metadataName === 'description' || metadataName === 'categories' ) {
					copyMetadataMsg = mw.message( copyMessage, 1 ).text();
				} else {
					copyMetadataMsg = mw.message( copyMessage ).text();
				}
				$checkbox = $( '<input>' ).attr( 'type', 'checkbox' ).attr( 'name', copyMessage ).attr( 'id', copyMessage );
				$checkboxes = $checkboxes.add( $checkbox );
				if ( defaultStatus === true ) {
					$checkbox.prop( 'checked', true );
				}

				$copyMetadataDiv
					.append( $checkbox )
					.append( $( '<label for="' + copyMessage + '"></label>' ).text( copyMetadataMsg ) )
					.append( $( '<br />' ) );
			} ) ;
			$checkboxes.checkboxShiftClick();

			$copyMetadataDiv.append(
				$( '<button type="button" id="mwe-upwiz-copy-metadata-button"></button>' )
				.msg( 'mwe-upwiz-copy-metadata-button' )
				.button()
				.click(
					function ( e ) {
						var button = $( this ).find( 'span' );
						$.each( details.copyMetadataTypes, function makeCopies( metadataType ) {
							if ( $( '#mwe-upwiz-copy-' + metadataType ).is( ':checked' ) ) {
								details.copyMetadata( metadataType );
							}
						} );
						button.text( mw.message( 'mwe-upwiz-copied-metadata-button' ).text() );
						setTimeout( function ( ) {
							button.text( mw.message( 'mwe-upwiz-copy-metadata-button' ).text() );
						}, 1000 );
						e.stopPropagation();
					}
				)
			);

			this.makeToggler(
				this.copyMetadataCtrlDiv,
				$copyMetadataDiv,
				'mwe-upwiz-copy-metadata'
			);

			this.$form.append( this.copyMetadataCtrlDiv, $copyMetadataDiv );
			this.copyMetadataCtrlDiv.show();
		},

		/**
		 * Open OSM map
		 */
		osmMapLink: function () {
			var mapLink = new mw.Uri( 'https://openstreetmap.org/' )
				.extend( { zoom: 9, layers: 'M', lat: this.$latitudeInput.val(), lon: this.$longitudeInput.val() } );
			return mapLink.toString();
		},

		/**
		 * Update messages in copyMetadata div
		 */
		updateCopyMsgs: function () {
			var $lbl,
				msgs = [
					{
						title: 'mwe-upwiz-copy-description',
						counter: function () {
							return $( '.mwe-upwiz-details-fieldname', this.$form ).length;
						}
					},
					{
						title: 'mwe-upwiz-copy-categories',
						counter: function () {
							return $( 'ul li.cat, .categoryInput', this.$form ).length;
						}
					}
				];
			$.each( msgs, function ( index, msg ) {
				var $lbl = $( 'label[for="' + msg.title + '"]' );
				$lbl.text( mw.message( msg.title, msg.counter() ).text() );
			} );
			$lbl = $( '.mwe-upwiz-details-copy-metadata a', this.$form );
			$lbl.text( mw.message( 'mwe-upwiz-copy-metadata', this.upload.wizard.uploads.length - 1 ).text() );
		},

		/**
		 * check entire form for validity
		 * @return {boolean} Whether the form is valid.
		 */
		// side effect: add error text to the page for fields in an incorrect state.
		// we must call EVERY valid() function due to side effects; do not short-circuit.
		valid: function () {
			// all the descriptions -- check min & max length
			// categories are assumed valid
			// pop open the 'more-options' if the date is bad
			// location?
			return (
				this.upload.deedChooser.valid() &&
				this.$form.valid()
			);
		},

		/**
		 * check if we have all the *must have* but not mandatory fields filled in
		 * Currently this tests for the following:
		 * 1) Empty category
		 * 2) TODO
		 * @return {boolean}
		 */
		necessaryFilled: function () {
			// check for empty category input
			return (
				this.div.find( '.categoryInput' ).val() !== '' ||
				this.div.find( '.cat-list' ).find( 'li' ).length > 0
			);
		},

		/**
		 * toggles whether we use the 'macro' deed or our own
		 */
		useCustomDeedChooser: function () {
			var details = this;

			this.copyrightInfoFieldset.show();
			this.upload.wizardDeedChooser = this.upload.deedChooser;

			// Defining own deedChooser for uploads coming from external service
			if ( this.upload.fromURL ) {
				if ( this.upload.providedFile.license ) {
					// XXX can be made a seperate class as mw.UploadFromUrlDeedChooser
					this.upload.deedChooser = {
						valid: function () { return true; }
					};

					// Need to add tipsy tips here
					$( this.deedDiv ).append( this.upload.providedFile.licenseMessage );

					// XXX need to add code in the remaining functions
					this.upload.deedChooser.deed = {
						valid: function () { return true; },
						getSourceWikiText: function () {
							if ( typeof details.upload.providedFile.sourceURL !== 'undefined' ) {
								return details.upload.providedFile.sourceURL;
							} else {
								return details.upload.providedFile.url;
							}
						},
						getAuthorWikiText: function () {
							return details.upload.providedFile.author;
						},
						getLicenseWikiText: function () {
							return details.upload.providedFile.licenseValue;
						}
					};
				}
			} else {
				this.upload.deedChooser = new mw.UploadWizardDeedChooser(
					mw.UploadWizard.config,
					this.deedDiv,
					mw.UploadWizard.getLicensingDeeds( 1, mw.UploadWizard.config ),
					[ this.upload ] );
				this.upload.deedChooser.onLayoutReady();
			}
		},

		/**
		 * show file destination field as "busy" while checking
		 * @param busy boolean true = show busy-ness, false = remove
		 */
		toggleDestinationBusy: function ( busy ) {
			if ( busy ) {
				this.titleInput.addClass( 'mwe-upwiz-busy' );
				$( this.titleInput ).data( 'valid', undefined );
			} else {
				this.titleInput.removeClass( 'mwe-upwiz-busy' );
			}
		},

		/**
		 * Process the result of a destination filename check.
		 * See mw.DestinationChecker.js for documentation of result format
		 * XXX would be simpler if we created all these divs in the DOM and had a more jquery-friendly way of selecting
		 * attrs. Instead we create & destroy whole interface each time. Won't someone think of the DOM elements?
		 * @param result
		 */
		processDestinationCheck: function ( result ) {
			var titleString, errHtml, completeErrorLink,
				feedback, feedbackLink,
				$errorEl = this.$form
					.find( 'label[for=' + this.titleId + '].mwe-upwiz-error-title-unique' );

			if ( result.unique.isUnique && result.blacklist.notBlacklisted && !result.unique.isProtected ) {
				$( this.titleInput ).data( 'valid', true );
				$errorEl.hide().empty();
				this.ignoreWarningsInput = undefined;
				return;
			}

			// something is wrong with this title.
			$( this.titleInput ).data( 'valid', false );

			try {
				titleString = mw.UploadWizardDetails.makeTitleInFileNS( result.title ).toString();
			} catch ( e ) {
				// unparseable result from unique test?
				titleString = '[unparseable name]';
			}

			if ( !result.unique.isUnique ) {
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

				completeErrorLink = $( '<span class="contentSubLink"></span>' ).msg(
					'mwe-upwiz-feedback-blacklist-info-prompt',
					function () {
						var errorDialog = new mw.ErrorDialog( result.blacklist.blacklistReason );
						errorDialog.launch();
						return false;
					}
				);

				$errorEl.append( '&nbsp;&middot;&nbsp;' ).append( completeErrorLink );

				// feedback request for titleblacklist
				if ( mw.UploadWizard.config.blacklistIssuesPage !== undefined && mw.UploadWizard.config.blacklistIssuesPage !== '' ) {
					feedback = new mw.Feedback(
						this.api,
						new mw.Title( mw.UploadWizard.config.blacklistIssuesPage ),
						'mwe-upwiz-feedback-title'
					);

					feedbackLink = $( '<span class="contentSubLink"></span>' ).msg(
						'mwe-upwiz-feedback-blacklist-report-prompt',
						function () {
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
		recountDescriptions: function () {
			// if there is some maximum number of descriptions, deal with that here
			$( this.descriptionAdder ).text( mw.message( 'mwe-upwiz-desc-add-' + ( this.descriptions.length === 0 ? '0' : 'n' ) ).text() );
		},

		/**
		 * Add a new description
		 */
		addDescription: function ( required, languageCode, allowRemove, initialValue ) {
			var description,
				details = this;

			if ( required === undefined ) {
				required = false;
			}

			if ( languageCode === undefined ) {
				languageCode = mw.LanguageUpWiz.UNKNOWN;
			}

			if ( allowRemove === undefined ) {
				allowRemove = true;
			}

			description = new mw.UploadWizardDescription( languageCode, required, initialValue );

			if ( !required && allowRemove ) {
				$( description.div  ).append(
					$.fn.removeCtrl( null, 'mwe-upwiz-remove-description', function () { details.removeDescription( description ); } )
				);
			}

			$( this.descriptionsDiv ).append( description.div  );

			// must defer adding rules until it's in a form
			// sigh, this would be simpler if we refactored to be more jquery style, passing DOM element downward
			description.addValidationRules( required );

			this.descriptions.push( description );
			this.recountDescriptions();
			this.updateCopyMsgs();
		},

		/**
		 * Remove a description
		 * @param description
		 */
		removeDescription: function ( description  ) {
			$( description.div ).remove();

			this.descriptions = $.grep(
				this.descriptions,
				function ( d ) {
					return d !== description;
				}
			);

			this.recountDescriptions();
			this.updateCopyMsgs();
		},

		removeAllDescriptions: function () {
			$( this.descriptionsDiv ).children().remove();
			this.descriptions = [];
			this.recountDescriptions();
			this.updateCopyMsgs();
		},

		/**
		 * Display an error with details
		 * XXX this is a lot like upload ui's error -- should merge
		 */
		error: function () {
			// copies arguments into a real array
			var args = Array.prototype.slice.call( arguments ),
				msg = 'mwe-upwiz-upload-error-' + args[0];

			$( this.errorDiv ).append( $( '<p class="mwe-upwiz-upload-error"></p>' ).text( mw.message( msg, args.slice( 1 ) ).text() ) );
			// apply a error style to entire did
			$( this.div ).addClass( 'mwe-upwiz-upload-error' );
			$( this.dataDiv ).hide();
			$( this.errorDiv ).show();
		},

		/**
		 * Given the API result pull some info into the form ( for instance, extracted from EXIF, desired filename )
		 * @param result	Upload API result object
		 */
		populate: function () {
			this.upload.setThumbnail(
				this.thumbnailDiv,
				mw.UploadWizard.config.thumbnailWidth,
				mw.UploadWizard.config.thumbnailMaxHeight,
				true
			);
			this.prefillDate();
			this.prefillSource();
			this.prefillAuthor();
			this.prefillTitle();
			this.prefillDescription();
			this.prefillLocation();
		},

		/**
		 * Check if we got an EXIF date back and enter it into the details
		 * XXX We ought to be using date + time here...
		 * EXIF examples tend to be in ISO 8601, but the separators are sometimes things like colons, and they have lots of trailing info
		 * (which we should actually be using, such as time and timezone)
		 */
		prefillDate: function () {
			// XXX surely we have this function somewhere already
			function pad( n ) {
				return n < 10 ? '0' + n : '' + n;
			}

			function getSaneTime( date ) {
				var str = '';

				str += pad( date.getHours() ) + ':';
				str += pad( date.getMinutes() ) + ':';
				str += pad( date.getSeconds() );

				return str;
			}

			var dateObj, metadata, dateTimeRegex, matches, dateStr, saneTime,
				yyyyMmDdRegex = /^(\d\d\d\d)[:\/\-](\d\d)[:\/\-](\d\d)\D.*/,
				timeRegex = /\D(\d\d):(\d\d):(\d\d)/;

			if ( this.upload.imageinfo.metadata ) {
				metadata = this.upload.imageinfo.metadata;
				$.each( [ 'datetimeoriginal', 'datetimedigitized', 'datetime', 'date' ], function ( i, propName ) {
					var matches, timeMatches,
						dateInfo = metadata[propName];
					if ( !mw.isEmpty( dateInfo ) ) {
						matches = $.trim( dateInfo ).match( yyyyMmDdRegex );
						if ( !mw.isEmpty( matches ) ) {
							timeMatches = $.trim( dateInfo ).match( timeRegex );
							if ( !mw.isEmpty( timeMatches ) ) {
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
			if ( dateObj === undefined && this.upload.file !== undefined && this.upload.file.date !== undefined ) {
				dateTimeRegex = /^\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d/;
				matches = this.upload.file.date.match( dateTimeRegex );
				if ( !mw.isEmpty( matches ) ) {
					$( this.dateInput ).val( this.upload.file.date );
					return;
				}
			}

			// if we don't have EXIF or other metadata, just don't put a date in.
			// XXX if we have FileAPI, it might be clever to look at file attrs, saved
			// in the upload object for use here later, perhaps
			if ( dateObj === undefined ) {
				return;
			}

			dateStr = dateObj.getFullYear() + '-' + pad( dateObj.getMonth() + 1 ) + '-' + pad( dateObj.getDate() );

			// Add the time
			// If the date but not the time is set in EXIF data, we'll get a bogus
			// time value of '00:00:00'.
			// FIXME: Check for missing time value earlier rather than blacklisting
			// a potentially legitimate time value.
			saneTime = getSaneTime( dateObj );
			if ( saneTime !== '00:00:00' ) {
				dateStr += ' ' + saneTime;
			}

			// ok by now we should definitely have a dateObj and a date string
			$( this.dateInput ).val( dateStr );
		},

		/**
		 * Set the title of the thing we just uploaded, visibly
		 * Note: the interface's notion of "filename" versus "title" is the opposite of MediaWiki
		 */
		prefillTitle: function () {
			$( this.titleInput ).val( this.upload.title.getNameText() );
		},

		/**
		 * Prefill the image description if we have a description
		 *
		 * Note that this is not related to specifying the description from the query
		 * string (that happens earlier). This is for when we have retrieved a
		 * description from an upload_by_url upload (e.g. Flickr transfer)
		 * or from the metadata.
		 */
		prefillDescription: function () {
			if (
				this.descriptions[0].getDescriptionText() === '' &&
				this.upload.file !== undefined
			) {
				var m = this.upload.imageinfo.metadata,
					desc = this.descriptions[0],
					descText = this.upload.file.description ||
						( m && m.imagedescription &&
						m.imagedescription[0] && m.imagedescription[0].value );

				if ( descText ) {
					desc.setText( descText );

					// In future, when using a AJAX service for language detection
					// use `desc.lockLanguageMenu();` and `desc.unlockLanguageMenu();`
					// to prevent interaction by the user.
					// For now, stick to the content language.
					desc.setLanguage( mw.config.get( 'wgContentLanguage' ) );
				}
			}
		},

		/**
		 * Prefill location inputs (and/or scroll to position on map) from image info and metadata
		 *
		 * As of MediaWiki 1.18, the exif parser translates the rational GPS data tagged by the camera
		 * to decimal format (accept for altitude, bug 32410).  Let's just use that.
		 * Leaving out altitude ref for now (for no good reason).
		 */
		prefillLocation: function () {
			var dir, m = this.upload.imageinfo.metadata;

			if ( m ) {
				dir = m.gpsimgdirection || m.gpsdestbearing;

				if ( dir ) {
					if ( dir.match( /^\d+\/\d+$/ ) !== null ) {
						// Apparently it can take the form "x/y" instead of
						// a decimal value. Mighty silly, but let's save it.
						dir = dir.split( '/' );
						dir = parseInt( dir[0], 10 ) / parseInt( dir[1], 10 );
					}

					this.$headingInput.val( dir );
				}

				// Prefill useful stuff only
				if ( Number( m.gpslatitude ) && Number ( m.gpslongitude ) ) {
					this.$latitudeInput.val( m.gpslatitude );
					this.$longitudeInput.val( m.gpslongitude );
				} else if (
					this.upload.file &&
					this.upload.file.location &&
					this.upload.file.location.latitude &&
					this.upload.file.location.longitude
				) {
					this.$latitudeInput.val( this.upload.file.location.latitude );
					this.$longitudeInput.val( this.upload.file.location.longitude );
				}

				//if ( m['gpsaltitude'] !== undefined ) {
				//	$( this.altitudeInput ).val( m['gpsaltitude'] );
				//}
			}
		},

		/**
		 * If there is a way to figure out source from image info, do so here
		 * XXX user pref?
		 */
		prefillSource: function () {
			// we have no way to do this AFAICT
		},

		/**
		 * Prefill author (such as can be determined) from image info and metadata
		 * XXX user pref?
		 */
		prefillAuthor: function () {
			if ( this.upload.imageinfo.metadata && this.upload.imageinfo.metadata.author ) {
				$( this.authorInput ).val( this.upload.imageinfo.metadata.author );
			}
		},

		/**
		 * Prefill license (such as can be determined) from image info and metadata
		 * XXX user pref?
		 */
		prefillLicense: function () {
			if ( this.upload.imageinfo.metadata ) {
				var copyright = this.upload.imageinfo.metadata.copyright;
				if (copyright !== undefined) {
					if (copyright.match(/\bcc-by-sa\b/i)) {
						window.alert('unimplemented cc-by-sa in prefillLicense');
						// XXX set license to be that CC-BY-SA
					} else if (copyright.match(/\bcc-by\b/i)) {
						window.alert('unimplemented cc-by in prefillLicense');
						// XXX set license to be that
					} else if (copyright.match(/\bcc-zero\b/i)) {
						window.alert('unimplemented cc-zero in prefillLicense');
						// XXX set license to be that
						// XXX any other licenses we could guess from copyright statement
					} else {
						$( this.licenseInput ).val( copyright );
					}
				}
			}
			// if we still haven't set a copyright use the user's preferences?
		},

		/**
		 * Shortcut to create a text input element.
		 * @param {string} id ID for the element, also used as its name.
		 * @param {string} [className] Class to add to the element. Automatically namespaced by prefixing 'mwe-' to it.
		 * @param {number} [size] Size - default leaves the size attribute unset.
		 * @param {number} [maxlength] Maximum length of the field.
		 * @param {Mixed} [defaultValue] Default value for the field.
		 * @return {jQuery} New text input element
		 */
		makeTextInput: function ( id, className, size, maxlength, defaultValue ) {
			var $newInput = $( '<input>' )
				.attr( {
					type: 'text',
					id: id,
					name: id,
					size: size,
					maxlength: maxlength
				} );

			if ( className ) {
				$newInput.addClass( 'mwe-' + className );
			}

			return $newInput
				.val( defaultValue );
		},

		/**
		 * Shortcut for creating location fields.
		 */
		makeLocationField: function ( name, $container ) {
			var fieldId = 'location-' + name + this.upload.index,
				fieldClass = 'loc-' + name,
				$input = this.makeTextInput( fieldId, fieldClass, 10, undefined, mw.UploadWizard.config.defaults[name] );

			$( '<div>' )
				.addClass( 'mwe-location-' + name )
				.append(
					$( '<div>' )
						.addClass( 'mwe-location-' + name + '-label' )
						.text( mw.message( 'mwe-upwiz-location-' + name ).text() ),
					$input
				)
				.appendTo( $container );

			return $input;
		},

		/**
		 * Convert entire details for this file into wikiText, which will then be posted to the file
		 * @return {string} wikitext representing all details
		 */
		getWikiText: function () {
			var deed, info, key, latitude, longitude, otherInfoWikiText, heading,
				locationThings, information,
				wikiText = '',
				details = this;

			// if invalid, should produce side effects in the form
			// instructing user to fix.
			if ( this.valid() ) {
				// http://commons.wikimedia.org / wiki / Template:Information
				// can we be more slick and do this with maps, applys, joins?
				information = {
					// {{lang|description in lang}}*   required
					description: '',
					// YYYY, YYYY-MM, or YYYY-MM-DD	 required  - use jquery but allow editing, then double check for sane date.
					date: '',
					// {{own}} or wikitext	optional
					source: '',
					// any wikitext, but particularly {{Creator:Name Surname}}   required
					author: '',
					// leave blank unless OTRS pending; by default will be "see below"   optional
					permission: '',
					// pipe separated list, other versions	 optional
					'other versions': ''
				};

				// sanity check the descriptions -- do not have two in the same lang
				// all should be a known lang
				if ( details.descriptions.length === 0 ) {
					window.alert('something has gone horribly wrong, unimplemented error check for zero descriptions');
					// XXX ruh roh
					// we should not even allow them to press the button ( ? ) but then what about the queue...
				}
				$.each( this.descriptions, function ( i, desc ) {
					information.description += desc.getWikiText();
				} );

				$.each( this.fields, function ( i, $field ) {
					if ( !mw.isEmpty( $field.val() ) ) {
						information.description += $field.data( 'field' ).wikitext.replace( '$1', $field.val() );
					}
				} );

				information.date = $.trim( $( details.dateInput ).val() );

				deed = this.upload.deedChooser.deed;

				information.source = deed.getSourceWikiText();

				information.author = deed.getAuthorWikiText();

				info = '';

				for ( key in information ) {
					info += '|' + key.replace( /:/g, '_' ) + '=' + information[key] + '\n';
				}

				wikiText += '=={{int:filedesc}}==\n';
				wikiText += '{{Information\n' + info + '}}\n';

				latitude = $.trim( $( this.$latitudeInput ).val() );
				longitude = $.trim( $( this.$longitudeInput ).val() );
				heading = $.trim( this.$headingInput.val() );
				//var altitude = $.trim( $( details.altitudeInput ).val() );

				// Do not require the altitude to be set, to prevent people from entering 0
				// while it's actually unknown.
				// When none is provided, this will result in {{Location dec|int|int|}}.
				if ( Number( latitude ) && Number ( longitude ) ) {
					locationThings = [ '{{Location dec', latitude, longitude ];

					if ( Number( heading ) ) {
						locationThings.push( 'heading:' + heading );
					}

					wikiText += locationThings.join( '|' ) + '}}\n';
				}

				// add an "anything else" template if needed
				otherInfoWikiText = $.trim( $( details.otherInformationInput ).val() );
				if ( !mw.isEmpty( otherInfoWikiText ) ) {
					wikiText += otherInfoWikiText + '\n\n';
				}

				// add licensing information
				wikiText += '\n=={{int:license-header}}==\n';
				wikiText += deed.getLicenseWikiText() + '\n\n';

				if ( mw.UploadWizard.config.autoAdd.wikitext !== undefined ) {
					wikiText += mw.UploadWizard.config.autoAdd.wikitext;
				}

				// add categories
				wikiText += this.div.find( '.categoryInput' ).get(0).getWikiText() + '\n\n';

				// sanitize wikitext if TextCleaner is defined (MediaWiki:TextCleaner.js)
				if ( typeof window.TextCleaner !== 'undefined' && typeof window.TextCleaner.sanitizeWikiText === 'function' ) {
					wikiText = window.TextCleaner.sanitizeWikiText( wikiText, true );
				}

				return wikiText;
			}

			return false;
		},

		/**
		 * Post wikitext as edited here, to the file
		 * XXX This should be split up -- one part should get wikitext from the interface here, and the ajax call
		 * should be be part of upload
		 * @return {jQuery.Promise}
		 */
		submit: function () {
			var params, wikiText,
				details = this;

			$('form', this.containerDiv).submit();

			this.upload.state = 'submitting-details';
			this.setStatus( mw.message( 'mwe-upwiz-submitting-details' ).text() );
			this.showIndicator( 'progress' );

			this.firstPoll = ( new Date() ).getTime();

			params = {
				action: 'upload',
				filekey: this.upload.fileKey,
				filename: this.upload.title.getMain(),
				comment: 'User created page with ' + mw.UploadWizard.userAgent
			};

			// Only enable async publishing if file is larger than 10MiB
			if ( this.upload.transportWeight > 10 * 1024 * 1024 ) {
				params.async = true;
			}

			// XXX check state of details for okayness ( license selected, at least one desc, sane filename )
			// validation does MOST of this already
			wikiText = this.getWikiText();

			if ( wikiText !== false ) {
				params.text = wikiText;
				return details.upload.api.postWithEditToken( params )
					.then(
						function ( result ) {
							return details.handleSubmitResult( result, params );
						},

						function ( code, info ) {
							details.upload.state = 'error';
							details.processError( code, info );
							return $.Deferred().reject( code, info );
						}
					);

			}

			return $.Deferred().reject();
		},

		/**
		 * Handles the result of a submission.
		 * @param {Object} result API result of an upload or status check.
		 * @param {Object} params What we passed to the API that caused this response.
		 * @return {jQuery.Promise}
		 */
		handleSubmitResult: function ( result, params ) {
			var wx, warningsKeys, existingFile, existingFileUrl,
				details = this,
				warnings = null,
				wasDeleted = false,
				deferred = $.Deferred();

			if ( result && result.upload && result.upload.result === 'Poll' ) {
				// if async publishing takes longer than 10 minutes give up
				if ( ( ( new Date() ).getTime() - this.firstPoll ) > 10 * 60 * 1000 ) {
					return $.Deferred().reject( 'server-error', 'unknown server error' );
				} else {
					if ( result.upload.stage === undefined && window.console ) {
						return $.Deferred().reject( 'no-stage', 'Unable to check file\'s status' );
					} else {
						//Messages that can be returned:
						// *mwe-upwiz-queued
						// *mwe-upwiz-publish
						// *mwe-upwiz-assembling
						this.setStatus( mw.message( 'mwe-upwiz-' + result.upload.stage ).text() );
						setTimeout( function () {
							if ( details.upload.state !== 'aborted' ) {
								details.upload.api.postWithEditToken( {
									action: 'upload',
									checkstatus: true,
									filekey: details.upload.fileKey
								} ).then( function ( result ) {
									return details.handleSubmitResult( result ).then( deferred.resolve, deferred.reject );
								}, deferred.reject );
							} else {
								deferred.resolve( 'aborted' );
							}
						}, 3000 );

						return deferred.promise();
					}
				}
			}
			if ( result && result.upload && result.upload.warnings ) {
				warnings = result.upload.warnings;
				existingFile = warnings.exists || warnings['exists-normalized'];
			}
			if ( warnings && warnings['was-deleted'] ) {
				delete warnings['was-deleted'];
				wasDeleted = true;
				for ( wx in warnings ) {
					if ( warnings.hasOwnProperty( wx ) ) {
						// if there are other warnings, deal with those first
						wasDeleted = false;
					}
				}
			}
			if ( result && result.upload && result.upload.imageinfo ) {
				this.upload.extractImageInfo( result.upload.imageinfo );
				this.upload.thisProgress = 1.0;
				this.upload.state = 'complete';
				this.showIndicator( 'uploaded' );
				this.setStatus( mw.message( 'mwe-upwiz-published' ).text() );
				return $.Deferred().resolve();
			} else if ( wasDeleted === true ) {
				params.ignorewarnings = 1;
				return this.upload.api.postWithEditToken( params ).then( function ( result ) {
					return details.handleSubmitResult( result );
				}, function ( code, info ) {
					return $.Deferred().reject( code, info );
				} );
			} else if ( result && result.upload.warnings ) {
				if ( warnings.thumb ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-thumbnail' ).text(), 'error-title-thumbnail' );
				} else if ( warnings.badfilename ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-badchars' ).text(), 'title-badchars' );
				} else if ( warnings['bad-prefix'] ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-senselessimagename' ).text(), 'title-senselessimagename' );
				} else if ( existingFile ) {
					existingFileUrl = mw.config.get( 'wgServer' ) + new mw.Title( existingFile, 6 ).getUrl();
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-api-warning-exists', existingFileUrl ).parse(), 'api-warning-exists' );
				} else if ( warnings.duplicate ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-upload-error-duplicate' ).text(), 'upload-error-duplicate' );
				} else if ( warnings['duplicate-archive'] ) {
					if ( this.upload.ignoreWarning['duplicate-archive'] ) {
						// We already told the interface to ignore this warning, so
						// let's steamroll over it and re-call this handler.
						params.ignorewarnings = true;
						return this.upload.api.postWithEditToken( params ).then( function ( result ) {
							return details.handleSubmitResult( result );
						}, function ( code, info ) {
							return $.Deferred().reject( code, info );
						} );
					} else {
						// This should _never_ happen, but just in case....
						this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-upload-error-duplicate-archive' ).text(), 'upload-error-duplicate-archive' );
					}
				} else {
					warningsKeys = [];
					$.each( warnings, function ( key ) {
						warningsKeys.push( key );
					} );
					this.upload.state = 'error';
					this.recoverFromError( this.titleId, mw.message( 'api-error-unknown-warning', warningsKeys.join( ', ' ) ).text(), 'api-error-unknown-warning' );
				}

				return $.Deferred.resolve();
			} else {
				return $.Deferred.reject( 'this-info-missing', result );
			}
		},

		/**
		 * Create a recoverable error -- show the form again, and highlight the problematic field. Go to error state but do not block submission
		 * @param {String} fieldId id of input field -- presumed to be within this upload's details form.
		 * @param {String} errorMessage HTML error message to show. Make sure escaping text properly.
		 * @param {String} errorCode
		 */
		recoverFromError: function ( fieldId, errorMessage, errorCode ) {
			uw.eventFlowLogger.logError( 'details', { code: errorCode || 'details.recoverFromError.unknown', message: errorMessage } );
			this.upload.state = 'error';
			this.dataDiv.morphCrossfade( '.detailsForm' );
			$( '#' + fieldId ).addClass( 'mwe-error' );
			this.$form
				.find( 'label[for=' + fieldId + '].mwe-upwiz-error-recovery' )
				.html( errorMessage )
				.show();
		},

		/**
		 * Show error state, possibly using a recoverable error form
		 * @param {String} error code
		 * @param {String} status line
		 */
		showError: function ( code, statusLine ) {
			uw.eventFlowLogger.logError( 'details', { code: code, message: statusLine } );
			this.showIndicator( 'error' );
			this.setStatus( statusLine );
		},

		/**
		 * Decide how to treat various errors
		 * @param {String} error code
		 * @param {Mixed} result from ajax call
		 */
		processError: function ( code, result ) {
			var statusKey, comma,
				statusLine = mw.message( 'api-error-unclassified' ).text(),
				titleErrorMap = {
					senselessimagename: 'senselessimagename',
					'fileexists-shared-forbidden': 'fileexists-shared-forbidden',
					'titleblacklist-custom-filename': 'hosting',
					'titleblacklist-custom-SVG-thumbnail': 'thumbnail',
					'titleblacklist-custom-thumbnail': 'thumbnail',
					'titleblacklist-custom-double-apostrophe': 'double-apostrophe',
					protectedpage: 'protected'
				};

			if ( result && result.error && result.error.code ) {
				if ( titleErrorMap[code] ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-' + titleErrorMap[code] ).escaped(), 'title-' + titleErrorMap[code] );
					return;
				} else {
					statusKey = 'api-error-' + code;
					if ( code === 'filetype-banned' && result.error.blacklisted ) {
						comma = mw.message( 'comma-separator' ).escaped();
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

		setStatus: function ( s ) {
			this.div.find( '.mwe-upwiz-file-status-line' ).text( s ).show();
		},

		showIndicator: function ( statusStr ) {
			this.div.find( '.mwe-upwiz-file-indicator' )
				.show()
				.removeClass( 'mwe-upwiz-status-progress mwe-upwiz-status-error mwe-upwiz-status-uploaded' )
				.addClass( 'mwe-upwiz-status-' + statusStr );
		},

		/**
		 * Simple 'more options' toggle that opens more of a form.
		 *
		 * @param {jQuery} $toggleDiv the div which has the control to open and shut custom options
		 * @param {jQuery} $moreDiv the div containing the custom options
		 * @param {string} msg the UI message key to use for the toggler
		 *		(with mwe-upwiz- prefix for UploadWizard messages)
		 */
		makeToggler: function ( $toggleDiv, $moreDiv, msg ) {
			function toggle() {
				var isOpen = $toggleLink.hasClass( 'mwe-upwiz-toggler-open' );
				if ( isOpen ) {
					// hide the extra options
					$moreDiv.slideUp( 250 );
					/* when closed, show control to open */
					$toggleLink.removeClass( 'mwe-upwiz-toggler-open' );
				} else {
					// show the extra options
					$moreDiv.slideDown( 250 );
					/* when open, show control to close */
					$toggleLink.addClass( 'mwe-upwiz-toggler-open' );
				}
			}

			var $toggleLink, actualMsg;

			if ( typeof msg === 'object' ) {
				actualMsg = mw.message.apply( this, msg ).text();
			} else {
				actualMsg = mw.message( msg ).text();
			}
			$toggleLink = $( '<a>' )
				.addClass( 'mwe-upwiz-toggler mwe-upwiz-more-options' )
				.text( actualMsg );
			$toggleDiv.append( $toggleLink );

			$moreDiv.hide();

			$toggleLink.click( function ( e ) {
				e.stopPropagation();
				toggle();
			} );

			$moreDiv.addClass( 'mwe-upwiz-toggled' );
		},

		dateInputCount: 0,

		/**
		 * Apply some special cleanups for titles before adding to model. These cleanups are not reflected in what the user sees in the title input field.
		 * For example, we remove an extension in the title if it matches the extension we're going to add anyway. (bug #30676)
		 * @param {string} title in human-readable form, e.g. "Foo bar", rather than "File:Foo_bar.jpg"
		 * @return {mw.Title} cleaned title with prefix and extension, stringified.
		 */
		setCleanTitle: function ( s ) {
			var ext = this.upload.title.getExtension(),
				re = new RegExp( '\\.' + this.upload.title.getExtension() + '$', 'i' ),
				cleaned = $.trim( s.replace( re, '' ) );

			this.upload.title = mw.UploadWizardDetails.makeTitleInFileNS( cleaned + '.' + ext ) || this.upload.title;
			return this.upload.title;
		},

		setVisibleTitle: function ( s ) {
			$( this.submittingDiv )
				.find( '.mwe-upwiz-visible-file-filename-text' )
				.text( s );
		}
	};

	$.validator.addMethod( 'titleParsability', function ( s, elem ) {
		return this.optional( elem ) || mw.Title.newFromText( $.trim( s ) );
	} );

}) ( mediaWiki, mediaWiki.uploadWizard, jQuery );
