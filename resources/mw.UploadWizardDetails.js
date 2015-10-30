( function ( mw, uw, $, OO ) {

	var NS_FILE = mw.config.get( 'wgNamespaceIds' ).file;

	/**
	 * Object that represents the Details (step 2) portion of the UploadWizard
	 * n.b. each upload gets its own details.
	 *
	 * @param {mw.UploadWizardUpload} upload
	 * @param {jQuery} containerDiv The `div` to put the interface into
	 */
	mw.UploadWizardDetails = function ( upload, containerDiv ) {
		var titleContainerDiv,
			descriptionRequired, uri,
			categoriesHinter,
			moreDetailsCtrlDiv, moreDetailsDiv, otherInformationId,
			otherInformationDiv, latitudeDiv, longitudeDiv, headingDiv,
			showMap, linkDiv, locationHinter, locationDiv,
			$list,
			details = this;

		this.upload = upload;
		this.containerDiv = containerDiv;
		this.api = upload.api;

		this.div = $( '<div class="mwe-upwiz-info-file ui-helper-clearfix filled"></div>' );

		this.thumbnailDiv = $( '<div class="mwe-upwiz-thumbnail mwe-upwiz-thumbnail-side"></div>' );

		this.dataDiv = $( '<div class="mwe-upwiz-data"></div>' );

		// descriptions
		// Description is not required if a campaign provides alternative wikitext fields,
		// which are assumed to function like a description
		descriptionRequired = !(
			mw.UploadWizard.config.fields &&
			mw.UploadWizard.config.fields.length &&
			mw.UploadWizard.config.fields[ 0 ].wikitext
		);
		this.descriptionsDetails = new uw.DescriptionsDetailsWidget( {
			required: descriptionRequired
		} );
		this.descriptionsDetailsField = new uw.FieldLayout( this.descriptionsDetails, {
			label: mw.message( 'mwe-upwiz-desc' ).text(),
			required: descriptionRequired
		} );
		// TODO Rethink hints
		this.descriptionsDetailsField.$label.addHint( 'description' );

		// Commons specific help for titles
		//  https://commons.wikimedia.org/wiki/Commons:File_naming
		//  https://commons.wikimedia.org/wiki/MediaWiki:Filename-prefix-blacklist
		// XXX make sure they can't use ctrl characters or returns or any other bad stuff.
		this.titleId = 'title' + this.upload.index;
		this.titleInput = this.makeTextInput( this.titleId, 'title', undefined, 250 )
			.on( 'change keyup', OO.ui.debounce( function () {
				var title, cleanTitle;
				// First, clear out any existing errors, to prevent strange visual effects.
				details.clearTitleErrors();
				title = $( details.titleInput ).val().trim();
				if ( !title ) {
					return;
				}
				// turn the contents of the input into a MediaWiki title ("File:foo bar.jpg") to look up
				// side effect -- also sets this as our current title
				cleanTitle = details.setCleanTitle( title );
				cleanTitle = cleanTitle && cleanTitle.getPrefixedText() || '';
				if ( !cleanTitle ) {
					return;
				}
				details.toggleDestinationBusy( true );
				mw.DestinationChecker.checkTitle( cleanTitle )
					.done( function ( result ) {
						details.processDestinationCheck( result );
					} )
					.always( function () {
						details.toggleDestinationBusy( false );
					} );
			}, 500 ) );

		this.titleErrorDiv = $( '<div>' ).addClass( 'mwe-upwiz-details-input-error' );

		function makeAndAppendTitleErrorLabel( labelClass ) {
			$( '<label>' )
				.attr( {
					'for': details.titleId,
					generated: 'true'
				} )
				.addClass( 'mwe-error ' + labelClass )
				.appendTo( details.titleErrorDiv );
		}

		makeAndAppendTitleErrorLabel( 'mwe-validator-error mwe-upwiz-validation-immediate' );
		makeAndAppendTitleErrorLabel( 'mwe-upwiz-duplicate-title mwe-upwiz-validation-immediate' );
		makeAndAppendTitleErrorLabel( 'mwe-upwiz-error-title-unique mwe-upwiz-validation-delayed' );
		makeAndAppendTitleErrorLabel( 'mwe-upwiz-error-recovery mwe-upwiz-validation-delayed' );

		titleContainerDiv = $( '<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
			.append(
				this.titleErrorDiv,
				$( '<div class="mwe-upwiz-details-fieldname"></div>' )
					.msg( 'mwe-upwiz-title' )
					.requiredFieldLabel()
					.addHint( 'title' ),
				$( '<div class="mwe-upwiz-details-input"></div>' ).append( this.titleInput )
			);

		this.deedDiv = $( '<div class="mwe-upwiz-custom-deed" />' );

		this.copyrightInfoFieldset = $( '<fieldset class="mwe-fieldset mwe-upwiz-copyright-info"></fieldset>' )
			.hide()
			.append(
				$( '<legend class="mwe-legend">' ).text( mw.message( 'mwe-upwiz-copyright-info' ).text() ),
				this.deedDiv
			);

		this.categoriesDetails = new uw.CategoriesDetailsWidget();
		this.categoriesDetailsField = new uw.FieldLayout( this.categoriesDetails, {
			label: mw.message( 'mwe-upwiz-categories' ).text()
		} );
		categoriesHinter = function () {
			var commonsCategoriesLink = $( '<a>' ).attr( {
				target: '_blank',
				href: 'https://commons.wikimedia.org/wiki/Commons:Categories'
			} );
			return mw.message( 'mwe-upwiz-tooltip-categories', commonsCategoriesLink ).parse();
		};
		// TODO Rethink hints
		this.categoriesDetailsField.$label.addHint( 'mwe-upwiz-categories-hint', categoriesHinter );

		this.dateDetails = new uw.DateDetailsWidget();
		this.dateDetailsField = new uw.FieldLayout( this.dateDetails, {
			label: mw.message( 'mwe-upwiz-date-created' ).text(),
			required: true
		} );
		// TODO Rethink hints
		this.dateDetailsField.$label.addHint( 'date' );

		moreDetailsCtrlDiv = $( '<div class="mwe-upwiz-details-more-options"></div>' );

		moreDetailsDiv = $( '<div class="mwe-more-details"></div>' );

		otherInformationId = 'otherInformation' + this.upload.index;
		this.otherInformationInput = $( '<textarea id="' + otherInformationId + '" name="' + otherInformationId + '" class="mwe-upwiz-other-textarea" rows="2" cols="36"></textarea>' )
			.growTextArea()
			.on( 'keyup', function ( e ) {
				e.stopPropagation();
				return false;
			} );

		otherInformationDiv = $( '<div>' )
			.append( $( '<div class="mwe-upwiz-details-more-label"></div>' ).text( mw.message( 'mwe-upwiz-other' ).text() ).addHint( 'other' ) )
			.append( this.otherInformationInput );

		locationHinter = function () {
			var location = $( '<a>' ).attr( {
				target: '_blank',
				href: '//commons.wikimedia.org/wiki/Commons:Geocoding'
			} );
			return mw.message( 'mwe-upwiz-tooltip-location', location ).parse();
		};

		locationDiv = $( '<div class="mwe-location mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
			.append( $( '<div class="mwe-location-label"></div>' )
				.text( mw.message( 'mwe-upwiz-location' ).text() )
				.addHint( 'location', locationHinter )
			)
			.append(
				$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + 'location-lat' + this.upload.index + '" generated="true"/></div>' ),
				$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + 'location-lon' + this.upload.index + '" generated="true"/></div>' ),
				$( '<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + 'location-heading' + this.upload.index + '" generated="true"/></div>' ),
				latitudeDiv, longitudeDiv, headingDiv, linkDiv
			);

		this.$latitudeInput = this.makeLocationField( 'lat', locationDiv );
		this.$longitudeInput = this.makeLocationField( 'lon', locationDiv );
		this.$headingInput = this.makeLocationField( 'heading', locationDiv );

		showMap = $( '<a>' )
			.text( mw.message( 'mwe-upwiz-location-button' ).text() )
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
			this.descriptionsDetailsField.$element,
			this.copyrightInfoFieldset,
			this.dateDetailsField.$element,
			this.categoriesDetailsField.$element
		);

		this.$form.on( 'submit', function ( e ) {
			// Prevent actual form submission
			e.preventDefault();
		} );

		this.fields = [];
		$.each( mw.UploadWizard.config.fields, function ( i, field ) {
			var $fieldInput, fieldInputId;

			if ( field.wikitext ) {
				fieldInputId = 'field_' + i + '_' + ( details.upload.index ).toString();

				if ( !( 'type' in field ) ) {
					field.type = 'text';
				}

				if ( field.type === 'select' ) {
					$fieldInput = $( '<select>' ).attr( {
						id: fieldInputId,
						name: fieldInputId,
						'class': 'mwe-idfield'
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
						.append( $( '<label>' ).attr( { 'class': 'mwe-validator-error', 'for': fieldInputId, generated: 'true' } ) )
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
		this.removeCtrl = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-remove' ).escaped(),
			title: mw.message( 'mwe-upwiz-remove-upload' ).escaped(),
			flags: 'destructive',
			icon: 'remove',
			framed: false
		} ).on( 'click', function () {
			details.upload.remove();
		} );

		this.submittingDiv.find( '.mwe-upwiz-file-status-line' )
			.append( this.removeCtrl.$element );

		$( this.dataDiv ).append(
			this.$form,
			this.submittingDiv
		).morphCrossfader();

		$( this.div ).append(
			this.thumbnailDiv,
			this.dataDiv
		);

		this.$form.validate();

		$list = this.$form.find( '.mwe-loc-lat, .mwe-loc-lon' )
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
					required: mw.message( 'mwe-upwiz-error-blank' ).escaped()
				}
			} );
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

		this.makeToggler(
			moreDetailsCtrlDiv,
			moreDetailsDiv,
			'mwe-upwiz-more-options'
		);

		uri = new mw.Uri( location.href, { overrideKeys: true } );
		if ( mw.UploadWizard.config.defaults.description ) {
			this.descriptionsDetails.setSerialized( {
				descriptions: [
					{
						language: uw.DescriptionDetailsWidget.static.getClosestAllowedLanguage( uri.query.descriptionlang ),
						description: mw.UploadWizard.config.defaults.description
					}
				]
			} );
		}

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
		var mwTitle = mw.Title.newFromText( filename, NS_FILE );
		if ( mwTitle && mwTitle.getNamespaceId() !== NS_FILE ) {
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
			var titleZero, matches,
				uploads = this.upload.wizard.uploads,
				sourceId = uploads[ 0 ].index;

			// In the simplest case, we can use this self-explanatory vanilla loop.
			function simpleCopy( id, tag ) {
				var moreInfo,
					firstId = '#' + id + sourceId,
					firstValue = $( firstId ).val();
				if ( tag === undefined ) {
					tag = 'input';
				}
				$( tag + '[id^=' + id + ']:not(' + firstId + ')' ).each( function () {
					$( this ).val( firstValue );
					if ( $( this ).parents( '.mwe-more-details' ).length === 1 ) {
						moreInfo = $( this )
							.parents( '.detailsForm' )
							.find( '.mwe-upwiz-details-more-options a' );
						if ( !moreInfo.hasClass( 'mwe-upwiz-toggler-open' ) ) {
							moreInfo.click();
						}
					}
				} );
			}

			function oouiCopy( property ) {
				var i,
					sourceUpload = uploads[ 0 ],
					sourceValue = sourceUpload.details[ property ].getSerialized();

				for ( i = 1; i < uploads.length; i++ ) {
					uploads[ i ].details[ property ].setSerialized( sourceValue );
				}
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
				$( 'input[id^=title]:not(#title' + sourceId + ')' ).each( function ( i ) {
					var currentTitle = $( this ).val();
					currentTitle = titleZero.replace( /(\D+)(\d{1,3})(\D*)$/,
						function ( str, m1, m2, m3 ) {
							var newstr = String( +m2 + i + 1 );
							return m1 + new Array( m2.length + 1 - newstr.length )
								.join( '0' ) + newstr + m3;
						}
					);
					$( this ).val( currentTitle ).keyup();

				} );
			} else if ( metadataType === 'description' ) {

				oouiCopy( 'descriptionsDetails' );

			} else if ( metadataType === 'date' ) {

				oouiCopy( 'dateDetails' );

			} else if ( metadataType === 'categories' ) {

				oouiCopy( 'categoriesDetails' );

			} else if ( metadataType === 'location' ) {

				simpleCopy( 'location-lat' );
				simpleCopy( 'location-lon' );
				simpleCopy( 'location-heading' );

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
				} );

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
			var copyButton,
				copyTypes = {},
				fieldset = new OO.ui.FieldsetLayout(),
				details = this,
				$copyMetadataDiv = $( '<div class="mwe-upwiz-metadata-copier"></div>' );

			if ( mw.UploadWizard.config.copyMetadataFeature !== true ||
				this.copyMetadataCtrlDiv !== undefined ) {
				return;
			}

			this.copyMetadataCtrlDiv = $( '<div class="mwe-upwiz-details-copy-metadata"></div>' );

			$copyMetadataDiv.append( fieldset.$element );

			$.each( this.copyMetadataTypes, function ( metadataName, defaultStatus ) {
				var copyMetadataMsg, checkbox, field,
					// mwe-upwiz-copy-title, mwe-upwiz-copy-description, mwe-upwiz-copy-date,
					// mwe-upwiz-copy-categories, mwe-upwiz-copy-location, mwe-upwiz-copy-other
					copyMessage = 'mwe-upwiz-copy-' + metadataName;

				copyMetadataMsg = mw.message( copyMessage ).text();

				checkbox = new OO.ui.CheckboxInputWidget( {
					selected: defaultStatus
				} );

				copyTypes[ metadataName ] = checkbox;

				field = new OO.ui.FieldLayout( checkbox, {
					label: copyMetadataMsg,
					align: 'inline'
				} );

				fieldset.addItems( [ field ] );
			} ) ;

			// Keep our checkboxShiftClick behaviour alive
			$copyMetadataDiv.find( 'input[type=checkbox]' ).checkboxShiftClick();

			copyButton = new OO.ui.ButtonWidget( {
				id: 'mwe-upwiz-copy-metadata-button',
				label: mw.message( 'mwe-upwiz-copy-metadata-button' ).text(),
				flags: [ 'constructive' ]
			} ).on( 'click', function () {
				$.each( details.copyMetadataTypes, function ( metadataType ) {
					if ( copyTypes[ metadataType ].isSelected() ) {
						details.copyMetadata( metadataType );
					}
				} );

				copyButton.setLabel( mw.message( 'mwe-upwiz-copied-metadata-button' ).text() );

				setTimeout( function () {
					copyButton.setLabel( mw.message( 'mwe-upwiz-copy-metadata-button' ).text() );
				}, 1000 );
			} );

			$copyMetadataDiv.append( copyButton.$element );

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
			var mapLink = new mw.Uri( 'https://www.openstreetmap.org/' )
				.extend( { zoom: 9, mlat: this.$latitudeInput.val(), mlon: this.$longitudeInput.val() } );
			return mapLink.toString();
		},

		/**
		 * Check the fields using the legacy jquery.validate system for validity. You must also call
		 * #getErrors to check validity of fields using the new OOUI system.
		 *
		 * Side effect: add error text to the page for fields in an incorrect state.
		 *
		 * @return {boolean} Whether the form is valid.
		 */
		valid: function () {
			var deedValid, formValid;

			// make sure licenses are valid (needed for multi-file deed selection)
			deedValid = this.upload.deedChooser.valid();

			// all other fields validated with validator js
			formValid = this.$form.valid();

			// we must call EVERY valid() function due to side effects; do not short-circuit.
			return deedValid && formValid;
		},

		/**
		 * Check the fields using the new OOjs UI system for validity. You must also call #valid to
		 * check validity of fields using the legacy jquery.validate system.
		 *
		 * @return {jQuery.Promise} Promise resolved with multiple array arguments, each containing a
		 *   list of error messages for a single field. If API requests necessary to check validity
		 *   fail, the promise may be rejected. The form is valid if the promise is resolved with all
		 *   empty arrays.
		 */
		getErrors: function () {
			return $.when(
				this.descriptionsDetails.getErrors(),
				this.dateDetails.getErrors(),
				this.categoriesDetails.getErrors()
				// More fields will go here as we convert things to the new system...
			);
		},

		/**
		 * Check the fields using the new OOjs UI system for warnings.
		 *
		 * @return {jQuery.Promise} Same as #getErrors
		 */
		getWarnings: function () {
			return $.when(
				this.descriptionsDetails.getWarnings(),
				this.dateDetails.getWarnings(),
				this.categoriesDetails.getWarnings()
				// More fields will go here as we convert things to the new system...
			);
		},

		/**
		 * Check the fields using the new OOjs UI system for errors and warnings and display them in the
		 * UI.
		 */
		checkValidity: function () {
			this.descriptionsDetailsField.checkValidity();
			this.dateDetailsField.checkValidity();
			this.categoriesDetailsField.checkValidity();
			// More fields will go here as we convert things to the new system...
		},

		/**
		 * Get a thumbnail caption for this upload (basically, the first description).
		 */
		getThumbnailCaption: function () {
			return this.descriptionsDetails.getSerialized().descriptions[ 0 ].description.trim();
		},

		/**
		 * toggles whether we use the 'macro' deed or our own
		 */
		useCustomDeedChooser: function () {
			var config, deed,
				details = this;

			this.copyrightInfoFieldset.show();
			this.upload.wizardDeedChooser = this.upload.deedChooser;

			// Defining own deedChooser for uploads coming from external service
			if ( this.upload.fromURL ) {
				// XXX can be made a seperate class as mw.UploadFromUrlDeedChooser
				this.upload.deedChooser = { valid: function () { return this.deed.valid(); } };

				if ( this.upload.providedFile.license ) {
					// XXX need to add code in the remaining functions
					this.upload.deedChooser.deed = this.getDeed();
				} else {
					config = { type: 'or', licenses: [ 'custom' ], special: 'custom' };
					deed = {};

					deed.licenseInput = new mw.UploadWizardLicenseInput(
						this.deedDiv,
						undefined,
						config,
						1,
						this.api
					);

					deed.licenseInput.setDefaultValues();

					this.upload.deedChooser.deed = this.getDeed( deed, {
						valid: function () {
							return this.licenseInput.valid();
						},
						getLicenseWikiText: function () {
							if ( details.upload.providedFile.licenseValue ) {
								return details.upload.providedFile.licenseValue + this.licenseInput.getWikiText();
							} else {
								return this.licenseInput.getWikiText();
							}
						}
					} );
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

		getDeed: function ( deed, overrides ) {
			var details = this;

			// Need to add tipsy tips here
			$( this.deedDiv ).append( this.upload.providedFile.licenseMessage );

			deed = deed || {};
			overrides = overrides || {};

			// XXX need to add code in the remaining functions
			return $.extend( deed, {
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
			}, overrides );
		},

		/**
		 * show file destination field as "busy" while checking
		 *
		 * @param {boolean} busy True = show busy-ness, false = remove
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
		 *
		 * @param {Object} result Result to process
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
				if ( result.unique.href ) {
					errHtml = mw.message( 'mwe-upwiz-fileexists-replace-on-page', titleString, $( '<a>' ).attr( { href: result.unique.href, target: '_blank' } ) ).parse();
				} else {
					errHtml = mw.message( 'mwe-upwiz-fileexists-replace-no-link', titleString ).escaped();
				}

				$errorEl.html( errHtml );
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
						errorDialog.open();
						return false;
					}
				);

				$errorEl.append( '&nbsp;&middot;&nbsp;' ).append( completeErrorLink );

				// feedback request for titleblacklist
				if ( mw.UploadWizard.config.blacklistIssuesPage !== undefined && mw.UploadWizard.config.blacklistIssuesPage !== '' ) {
					feedback = new mw.Feedback( {
						title: new mw.Title( mw.UploadWizard.config.blacklistIssuesPage ),
						dialogTitleMessageKey: 'mwe-upwiz-feedback-title'
					} );

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
		 * Given the API result pull some info into the form ( for instance, extracted from EXIF, desired filename )
		 *
		 * @param {Object} result Upload API result object
		 */
		populate: function () {
			var thumbnailDiv = this.thumbnailDiv;
			this.upload.getThumbnail(
				mw.UploadWizard.config.thumbnailWidth,
				mw.UploadWizard.config.thumbnailMaxHeight
			).done( function ( thumb ) {
				mw.UploadWizard.placeThumbnail( thumbnailDiv, thumb );
			} );
			this.prefillDate();
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
			var dateObj, metadata, dateTimeRegex, matches, dateStr, saneTime,
				dateMode = 'calendar',
				yyyyMmDdRegex = /^(\d\d\d\d)[:\/\-](\d\d)[:\/\-](\d\d)\D.*/,
				timeRegex = /\D(\d\d):(\d\d):(\d\d)/;

			// XXX surely we have this function somewhere already
			function pad( n ) {
				return ( n < 10 ? '0' : '' ) + String( n );
			}

			function getSaneTime( date ) {
				var str = '';

				str += pad( date.getHours() ) + ':';
				str += pad( date.getMinutes() ) + ':';
				str += pad( date.getSeconds() );

				return str;
			}

			if ( this.upload.imageinfo.metadata ) {
				metadata = this.upload.imageinfo.metadata;
				$.each( [ 'datetimeoriginal', 'datetimedigitized', 'datetime', 'date' ], function ( i, propName ) {
					var matches, timeMatches,
						dateInfo = metadata[ propName ];
					if ( !mw.isEmpty( dateInfo ) ) {
						matches = dateInfo.trim().match( yyyyMmDdRegex );
						if ( !mw.isEmpty( matches ) ) {
							timeMatches = dateInfo.trim().match( timeRegex );
							if ( !mw.isEmpty( timeMatches ) ) {
								dateObj = new Date( parseInt( matches[ 1 ], 10 ),
											parseInt( matches[ 2 ], 10 ) - 1,
											parseInt( matches[ 3 ], 10 ),
											parseInt( timeMatches[ 1 ], 10 ),
											parseInt( timeMatches[ 2 ], 10 ),
											parseInt( timeMatches[ 3 ], 10 ) );
							} else {
								dateObj = new Date( parseInt( matches[ 1 ], 10 ),
											parseInt( matches[ 2 ], 10 ) - 1,
											parseInt( matches[ 3 ], 10 ) );
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
					this.dateDetails.setSerialized( {
						mode: dateMode,
						value: this.upload.file.date
					} );
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

				// Switch to freeform date field. DateInputWidget (with calendar) handles dates only, not times.
				dateMode = 'arbitrary';
			}

			// ok by now we should definitely have a dateObj and a date string
			this.dateDetails.setSerialized( {
				mode: dateMode,
				value: dateStr
			} );
		},

		/**
		 * Set the title of the thing we just uploaded, visibly
		 * Note: the interface's notion of "filename" versus "title" is the opposite of MediaWiki
		 */
		prefillTitle: function () {
			$( this.titleInput )
				.val( this.upload.title.getNameText() )
				.trigger( 'change' );
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
			var m, descText;

			if (
				this.descriptionsDetails.getWikiText() === '' &&
				this.upload.file !== undefined
			) {
				m = this.upload.imageinfo.metadata;
				descText = this.upload.file.description ||
					( m && m.imagedescription && m.imagedescription[ 0 ] && m.imagedescription[ 0 ].value );

				if ( descText ) {
					// strip out any HTML tags
					descText = descText.replace( /<[^>]+>/g, '' );
					// & and " are escaped by Flickr, so we need to unescape
					descText = descText.replace( /&amp;/g, '&' ).replace( /&quot;/g, '"' );

					this.descriptionsDetails.setSerialized( {
						descriptions: [
							{
								// The language is probably wrong in many cases...
								language: mw.config.get( 'wgContentLanguage' ),
								description: descText.trim()
							}
						]
					} );
				}
			}
		},

		/**
		 * Prefill location inputs (and/or scroll to position on map) from image info and metadata
		 *
		 * As of MediaWiki 1.18, the exif parser translates the rational GPS data tagged by the camera
		 * to decimal format.  Let's just use that.
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
						dir = parseInt( dir[ 0 ], 10 ) / parseInt( dir[ 1 ], 10 );
					}

					this.$headingInput.val( dir );
				}

				// Prefill useful stuff only
				if ( Number( m.gpslatitude ) && Number( m.gpslongitude ) ) {
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
			}
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
		 * Shortcut to create a text input element.
		 *
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
				$input = this.makeTextInput( fieldId, fieldClass, 10, undefined, mw.UploadWizard.config.defaults[ name ] );

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
		 *
		 * @return {string} wikitext representing all details
		 */
		getWikiText: function () {
			var deed, info, key, latitude, longitude, otherInfoWikiText, heading,
				locationThings, information,
				wikiText = '';

			// if invalid, should produce side effects in the form
			// instructing user to fix.
			if ( this.valid() ) {
				// https://commons.wikimedia.org/wiki/Template:Information
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

				information.description = this.descriptionsDetails.getWikiText();

				$.each( this.fields, function ( i, $field ) {
					if ( !mw.isEmpty( $field.val() ) ) {
						information.description += $field.data( 'field' ).wikitext.replace( '$1', $field.val() );
					}
				} );

				information.date = this.dateDetails.getWikiText();

				deed = this.upload.deedChooser.deed;

				information.source = deed.getSourceWikiText();

				information.author = deed.getAuthorWikiText();

				info = '';

				for ( key in information ) {
					info += '|' + key.replace( /:/g, '_' ) + '=' + information[ key ] + '\n';
				}

				wikiText += '=={{int:filedesc}}==\n';
				wikiText += '{{Information\n' + info + '}}\n';

				latitude = this.$latitudeInput.val().trim();
				longitude = this.$longitudeInput.val().trim();
				heading = this.$headingInput.val().trim();

				if ( Number( latitude ) && Number( longitude ) ) {
					locationThings = [ '{{Location dec', latitude, longitude ];

					if ( Number( heading ) ) {
						locationThings.push( 'heading:' + heading );
					}

					wikiText += locationThings.join( '|' ) + '}}\n';
				}

				// add an "anything else" template if needed
				otherInfoWikiText = $( this.otherInformationInput ).val().trim();
				if ( !mw.isEmpty( otherInfoWikiText ) ) {
					wikiText += otherInfoWikiText + '\n\n';
				}

				// add licensing information
				wikiText += '\n=={{int:license-header}}==\n';
				wikiText += deed.getLicenseWikiText() + '\n\n';

				if ( mw.UploadWizard.config.autoAdd.wikitext !== undefined ) {
					wikiText += mw.UploadWizard.config.autoAdd.wikitext + '\n';
				}

				// add parameters for list callback bot
				// this cue will be used to supplement a wiki page with an image thumbnail
				if ( $( '#imgPicker' + this.upload.index ).prop( 'checked' ) ) {
					wikiText += '\n<!-- WIKIPAGE_UPDATE_PARAMS ' +
						mw.UploadWizard.config.defaults.objref +
						' -->\n';
				}

				// categories
				wikiText += '\n' + this.categoriesDetails.getWikiText();

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
		 *
		 * @return {jQuery.Promise}
		 */
		submit: function () {
			var params, wikiText,
				details = this;

			$( 'form', this.containerDiv ).submit();

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
		 *
		 * @param {Object} result API result of an upload or status check.
		 * @param {Object} params What we passed to the API that caused this response.
		 * @return {jQuery.Promise}
		 */
		handleSubmitResult: function ( result, params ) {
			var wx, warningsKeys, existingFile, existingFileUrl, existingFileExt, ourFileExt,
				details = this,
				warnings = null,
				ignoreTheseWarnings = false,
				deferred = $.Deferred();

			if ( result && result.upload && result.upload.result === 'Poll' ) {
				// if async publishing takes longer than 10 minutes give up
				if ( ( ( new Date() ).getTime() - this.firstPoll ) > 10 * 60 * 1000 ) {
					return $.Deferred().reject( 'server-error', 'unknown server error' );
				} else {
					if ( result.upload.stage === undefined && window.console ) {
						return $.Deferred().reject( 'no-stage', 'Unable to check file\'s status' );
					} else {
						// Messages that can be returned:
						// * mwe-upwiz-queued
						// * mwe-upwiz-publish
						// * mwe-upwiz-assembling
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
			}
			if ( warnings && warnings.exists ) {
				existingFile = warnings.exists;
			} else if ( warnings && warnings[ 'exists-normalized' ] ) {
				existingFile = warnings[ 'exists-normalized' ];
				existingFileExt = mw.Title.normalizeExtension( existingFile.split( '.' ).pop() );
				ourFileExt = mw.Title.normalizeExtension( this.upload.title.getExtension() );

				if ( existingFileExt !== ourFileExt ) {
					delete warnings[ 'exists-normalized' ];
					ignoreTheseWarnings = true;
				}
			}
			if ( warnings && warnings[ 'was-deleted' ] ) {
				delete warnings[ 'was-deleted' ];
				ignoreTheseWarnings = true;
			}
			for ( wx in warnings ) {
				if ( warnings.hasOwnProperty( wx ) ) {
					// if there are other warnings, deal with those first
					ignoreTheseWarnings = false;
				}
			}
			if ( result && result.upload && result.upload.imageinfo ) {
				this.upload.extractImageInfo( result.upload.imageinfo );
				this.upload.thisProgress = 1.0;
				this.upload.state = 'complete';
				this.showIndicator( 'uploaded' );
				this.setStatus( mw.message( 'mwe-upwiz-published' ).text() );
				return $.Deferred().resolve();
			} else if ( ignoreTheseWarnings ) {
				params.ignorewarnings = 1;
				return this.upload.api.postWithEditToken( params ).then( function ( result ) {
					return details.handleSubmitResult( result );
				}, function ( code, info ) {
					return $.Deferred().reject( code, info );
				} );
			} else if ( result && result.upload.warnings ) {
				if ( warnings.thumb || warnings[ 'thumb-name' ] ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-thumbnail' ).text(), 'error-title-thumbnail' );
				} else if ( warnings.badfilename ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-badchars' ).text(), 'title-badchars' );
				} else if ( warnings[ 'bad-prefix' ] ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-senselessimagename' ).text(), 'title-senselessimagename' );
				} else if ( existingFile ) {
					existingFileUrl = mw.config.get( 'wgServer' ) + new mw.Title( existingFile, NS_FILE ).getUrl();
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-api-warning-exists', existingFileUrl ).parse(), 'api-warning-exists' );
				} else if ( warnings.duplicate ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-upload-error-duplicate' ).text(), 'upload-error-duplicate' );
				} else if ( warnings[ 'duplicate-archive' ] !== undefined ) {
					// warnings[ 'duplicate-archive' ] may be '' (empty string) for revdeleted files
					if ( this.upload.ignoreWarning[ 'duplicate-archive' ] ) {
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

				return $.Deferred().resolve();
			} else {
				return $.Deferred().reject( 'this-info-missing', result );
			}
		},

		/**
		 * Create a recoverable error -- show the form again, and highlight the problematic field. Go to error state but do not block submission
		 *
		 * @param {string} fieldId id of input field -- presumed to be within this upload's details form.
		 * @param {string} errorMessage HTML error message to show. Make sure escaping text properly.
		 * @param {string} errorCode
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
		 *
		 * @param {string} code Error code
		 * @param {string} statusLine Status line
		 */
		showError: function ( code, statusLine ) {
			uw.eventFlowLogger.logError( 'details', { code: code, message: statusLine } );
			this.showIndicator( 'error' );
			this.setStatus( statusLine );
		},

		/**
		 * Decide how to treat various errors
		 *
		 * @param {string} code Error code
		 * @param {Mixed} result Result from ajax call
		 */
		processError: function ( code, result ) {
			var statusKey, comma,
				statusLine = mw.message( 'api-error-unclassified' ).text(),
				titleBlacklistMessageMap = {
					senselessimagename: 'senselessimagename', // TODO This is probably never hit?
					'titleblacklist-custom-filename': 'hosting',
					'titleblacklist-custom-SVG-thumbnail': 'thumbnail',
					'titleblacklist-custom-thumbnail': 'thumbnail',
					'titleblacklist-custom-double-apostrophe': 'double-apostrophe'
				},
				titleErrorMap = {
					'fileexists-shared-forbidden': 'fileexists-shared-forbidden',
					protectedpage: 'protected'
				};

			if ( code === 'badtoken' ) {
				this.api.badToken( 'edit' );
				// TODO Automatically try again instead of requiring the user to bonk the button
			}

			if ( result && result.error && result.error.code ) {
				if ( titleErrorMap[ code ] ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-' + titleErrorMap[ code ] ).escaped(), 'title-' + titleErrorMap[ code ] );
					return;
				} else if ( code === 'titleblacklist-forbidden' ) {
					this.recoverFromError( this.titleId, mw.message( 'mwe-upwiz-error-title-' + titleBlacklistMessageMap[ result.error.message ] ).escaped(), 'title-' + titleBlacklistMessageMap[ result.error.message ] );
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
			var $toggleLink, actualMsg;

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

		/**
		 * Apply some special cleanups for titles before adding to model. These cleanups are not reflected in what the user sees in the title input field.
		 * For example, we remove an extension in the title if it matches the extension we're going to add anyway. (bug #30676)
		 *
		 * @param {string} s Title in human-readable form, e.g. "Foo bar", rather than "File:Foo_bar.jpg"
		 * @return {mw.Title} cleaned title with prefix and extension, stringified.
		 */
		setCleanTitle: function ( s ) {
			var ext = this.upload.title.getExtension(),
				re = new RegExp( '\\.' + this.upload.title.getExtension() + '$', 'i' ),
				cleaned = s.replace( re, '' ).replace( /\.+$/g, '' ).trim();
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
		return this.optional( elem ) || mw.Title.newFromText( s.trim() );
	} );

} )( mediaWiki, mediaWiki.uploadWizard, jQuery, OO );
