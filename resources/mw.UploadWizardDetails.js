( function ( uw ) {

	const NS_FILE = mw.config.get( 'wgNamespaceIds' ).file;

	/**
	 * Object that represents the Details (step 2) portion of the UploadWizard
	 * n.b. each upload gets its own details.
	 *
	 * @class
	 * @param {mw.UploadWizardUpload} upload
	 * @param {jQuery} $containerDiv The `div` to put the interface into
	 */
	mw.UploadWizardDetails = function ( upload, $containerDiv ) {
		this.upload = upload;
		this.$containerDiv = $containerDiv;
		this.api = upload.api;

		this.mainFields = [];

		this.structuredDataSubmissionErrors = false;

		this.$div = $( '<div>' ).addClass( 'mwe-upwiz-info-file filled' );

		OO.EventEmitter.call( this );
	};

	mw.UploadWizardDetails.prototype = {

		// Has this details object been attached to the DOM already?
		isAttached: false,

		// Build the interface and attach all elements - do this on demand
		buildInterface: function () {
			const config = mw.UploadWizard.config,
				captionsAvailable = config.wikibase.enabled && config.wikibase.captions,
				// the following only end up getting used if statements are enabled
				dataTypesMap = mw.config.get( 'wbDataTypes' ) || {},
				defaultProperties = mw.config.get( 'wbmiDefaultProperties' ) || [],
				propertyTypes = mw.config.get( 'wbmiPropertyTypes' ) || {},
				propertyDataValuesTypes = [],
				statementFields = {};

			this.propertyTitles = Object.assign(
				{},
				mw.config.get( 'wbmiPropertyTitles' ) || {},
				mw.config.get( 'upwizPropertyTitles' ) || {}
			);
			this.dateProperty = config.wikibase.properties.date || '';

			this.$thumbnailDiv = $( '<div>' ).addClass( 'mwe-upwiz-thumbnail' );

			this.$dataDiv = $( '<div>' ).addClass( 'mwe-upwiz-data' );

			//
			// Title
			//
			this.titleDetails = new uw.TitleDetailsWidget( {
				// Normalize file extension, e.g. 'JPEG' to 'jpg'
				extension: mw.Title.normalizeExtension( this.upload.title.getExtension() ),
				minLength: config.minTitleLength,
				maxLength: config.maxTitleLength
			} );
			this.titleDetails.on( 'change', () => this.emit( 'change' ) );
			this.titleDetailsField = new uw.FieldLayout( this.titleDetails, {
				label: mw.message( 'mwe-upwiz-title' ).text(),
				required: true
			} );
			this.mainFields.push( this.titleDetailsField );

			//
			// Captions
			//
			this.captionsDetails = new uw.MultipleLanguageInputWidget( {
				inputWidgetConstructor: OO.ui.TextInputWidget.bind( null, {
					classes: [ 'mwe-upwiz-singleLanguageInputWidget-text' ]
				} ),
				required: true,
				label: mw.message( 'mwe-upwiz-caption-add' ),
				errorBlank: mw.message( 'mwe-upwiz-error-caption-blank' ),
				remove: mw.message( 'mwe-upwiz-remove-caption' ),
				minLength: config.minCaptionLength,
				maxLength: config.maxCaptionLength
			} );
			this.captionsDetails.on( 'change', () => this.emit( 'change' ) );
			this.captionsDetailsField = new uw.FieldLayout( this.captionsDetails, {
				required: true,
				classes: [ 'mwe-upwiz-caption' ],
				label: mw.message( 'mwe-upwiz-caption' ).text(),
				help: mw.message( 'mwe-upwiz-tooltip-caption' ).text()
			} );
			if ( captionsAvailable ) {
				this.mainFields.push( this.captionsDetailsField );
			}

			//
			// Descriptions
			//
			// Description is not required if a campaign provides alternative wikitext fields,
			// which are assumed to function like a description
			const descriptionRequired = !(
				config.fields &&
				config.fields.length &&
				config.fields[ 0 ].wikitext
			);
			// Main widget
			this.descriptionsDetails = new uw.MultipleLanguageInputWidget( {
				// if captions are available then the default is to copy them to descriptions,
				// so the descriptions field itself is not required
				required: descriptionRequired && !captionsAvailable,
				classes: [ 'mwe-upwiz-caption' ],
				label: mw.message( 'mwe-upwiz-desc-add' ),
				errorBlank: mw.message( 'mwe-upwiz-error-description-blank' ),
				remove: mw.message( 'mwe-upwiz-remove-description' ),
				minLength: config.minDescriptionLength,
				maxLength: config.maxDescriptionLength
			} );
			this.descriptionsDetails.on( 'change', () => this.emit( 'change' ) );

			// Checkbox telling whether descriptions must be identical to captions.
			// If selected, hide descriptions. This is the default behavior.
			this.descriptionSameAsCaptionCheckbox = new OO.ui.CheckboxMultioptionWidget( {
				label: mw.message( 'mwe-upwiz-description-same-as-caption' ).text(),
				// set it as selected only when we have captions in the first place,
				// otherwise there will be nothing to copy from
				// note that in such case, this checkbox should not be displayed,
				// but we may still check its value when extracting data
				selected: captionsAvailable
			} );
			this.descriptionSameAsCaption = new OO.ui.CheckboxMultiselectWidget( {
				classes: [ 'mwe-upwiz-description-same-as-caption-checkbox' ],
				items: [ this.descriptionSameAsCaptionCheckbox ]
			} );
			this.descriptionSameAsCaptionCheckbox.on( 'change', () => {
				this.descriptionsDetails.$element.toggle(
					!this.descriptionSameAsCaptionCheckbox.isSelected()
				);
				// if descriptions are entered separately rather than being copied
				// from captions, they become required (unless they are not, e.g.
				// when a campaign provides alternatives) & captions turn optional
				this.descriptionsDetails.setRequired( descriptionRequired && !this.descriptionSameAsCaptionCheckbox.isSelected() );
				this.captionsDetails.setRequired( this.descriptionSameAsCaptionCheckbox.isSelected() );
				this.emit( 'change' );
			} );

			// Descriptions are fickle; they are required (unless, as described earlier,
			// a campaign provides alternatives), but are not necessarily visible:
			// they default to being hidden and automatically being copied over from
			// captions. Unless captions aren't even available, in which case they
			// need to be on display after all...
			// uw.FieldLayout doesn't currently lend itself to having additional content
			// between the title and the validated element (descriptionsDetails in this
			// case), and I'd rather avoid reaching into descriptionsDetails to
			// conditionally insert the "copy" nodes in the right place.
			// We also can't stick the title to the "copy" field, because that's not
			// even guaranteed to be something that is supported.
			// Best I can think of would be to combine both of these in another,
			// separate widget; there's a little complication in forwarding the error
			// handling between uw.FieldLayout (or rather, uw.ValidationMessageElement)
			// and the actual widget (descriptionsDetails), but I guess that's what
			// this comment is for!
			this.descriptionsWidget = new OO.ui.Widget();
			this.descriptionsWidget.$element.append(
				// only show checkbox to copy from captions if captions are enabled)
				captionsAvailable ? this.descriptionSameAsCaption.$element : null,
				// toggle visibility of descriptions based on availability of captions
				this.descriptionsDetails.$element.toggle( !( captionsAvailable ) )
			);
			// if something changes within this widget, then let this widget
			// itself propagate the change event, to trigger input validation
			// that is managed by uw.FieldLayout (or rather, uw.ValidationMessageElement)
			this.descriptionSameAsCaption.connect( this.descriptionsWidget, { change: [ 'emit', 'change' ] } );
			this.descriptionsDetails.connect( this.descriptionsWidget, { change: [ 'emit', 'change' ] } );
			// forward validation checks between the combined widget & descriptionsDetails
			this.descriptionsWidget.validate = ( thorough ) => this.descriptionsDetails.validate( thorough );

			this.descriptionsDetailsField = new uw.FieldLayout( this.descriptionsWidget, {
				required: descriptionRequired,
				label: mw.message( 'mwe-upwiz-desc' ).text(),
				help: mw.message( 'mwe-upwiz-tooltip-description' ).text()
			} );
			this.mainFields.push( this.descriptionsDetailsField );

			//
			// Date
			//
			this.dateDetails = new uw.DateDetailsWidget( { upload: this.upload } );
			this.dateDetails.on( 'change', () => this.emit( 'change' ) );
			this.dateDetailsField = new uw.FieldLayout( this.dateDetails, {
				label: mw.message( 'mwe-upwiz-date-created' ).text(),
				help: mw.message( 'mwe-upwiz-tooltip-date' ).text(),
				required: true
			} );
			// The date isn't prefilled anymore if the user changed its value
			this.dateDetails.on( 'change', () => this.dateDetails.setPrefilled( false ) );
			this.mainFields.push( this.dateDetailsField );

			//
			// Additional information
			//
			// This is a field set: fields will be added later
			this.additionalInfoFieldset = new OO.ui.FieldsetLayout( {
				label: mw.message( 'mwe-upwiz-additional-info' ).text(),
				help: mw.message( 'mwe-upwiz-tooltip-additional-info' ).text(),
				helpInline: true,
				classes: [ 'mwe-upwiz-fieldsetLayout' ]
			} );

			//
			// TODO improve location: https://phabricator.wikimedia.org/T361052
			//
			this.locationInput = new uw.LocationDetailsWidget( {
				templateName: 'Location', // {{Location}}
				latitudeKey: 'latitude',
				longitudeKey: 'longitude',
				headingKey: 'heading'
			} );
			this.locationInput.on( 'change', () => this.emit( 'change' ) );
			this.locationInputField = new uw.FieldLayout( this.locationInput, {
				label: mw.message( 'mwe-upwiz-location' ).text(),
				classes: [ 'mwe-upwiz-fieldLayout-additional-info' ]
			} );
			this.objectLocationInput = new uw.LocationDetailsWidget( {
				templateName: 'Object location', // {{Object location}}
				latitudeKey: 'objectLatitude',
				longitudeKey: 'objectLongitude',
				headingKey: ''
			} );
			this.objectLocationInputField = new uw.FieldLayout( this.objectLocationInput, {
				label: mw.message( 'mwe-upwiz-location-object' ).text(),
				classes: [ 'mwe-upwiz-fieldLayout-additional-info' ]
			} );

			//
			// Categories
			//
			this.categoriesDetails = new uw.CategoriesDetailsWidget( {
				placeholder: mw.message( 'mwe-upwiz-categories-placeholder' )
			} );
			this.categoriesDetails.on( 'change', () => this.emit( 'change' ) );
			this.categoriesDetailsField = new uw.FieldLayout( this.categoriesDetails, {
				label: mw.message( 'mwe-upwiz-categories' ).text(),
				help: mw.message( 'mwe-upwiz-tooltip-categories-v2' ).text(),
				classes: [ 'mwe-upwiz-fieldLayout-additional-info' ]
			} );
			if ( OO.ui.isMobile() ) {
				this.categoriesDetails.menu.$element.on( 'scroll', () => {
					// hide the software keyboard, leaving more space for autocomplete menu
					// (note: the more obvious thing to do would be blurring the input field,
					// but that would also trigger this widget to automatically convert any
					// input into a category tag)
					this.categoriesDetails.input.$input[ 0 ].inputMode = 'none';
				} );
				this.categoriesDetails.input.$input.on( 'focus mousedown keypress', () => {
					// while scrolling the autocomplete results, we changed the input mode
					// to get rid of the software keyboard; now that the user is interacting
					// we need to make sure they're able to)
					this.categoriesDetails.input.$input[ 0 ].inputMode = 'text';
				} );
				this.categoriesDetails.input.$input.on( 'mousedown', () => {
					// mobile devices tend to auto-zoom to input when focused (for small
					// enough font sizes), but we'd actually prefer they don't in this case,
					// as we will be adding the categories selection menu to the input,
					// and such zoom may interfere with the user's ability to see/interact
					// with that
					// the way we're going to accomplish this is a bit of a hack: we'll
					// temporarily disable user-scalable in the viewport meta tag on mousedown
					// (at which point the auto-zoom is not yet triggered), then reinstated
					// the original viewport content later on in the click lifecycle, so it
					// once again becomes available for the users to zoom in/out themselves
					// if they wish
					// eslint-disable-next-line no-jquery/no-global-selector
					const $viewport = $( 'head meta[name="viewport"]' );
					const viewportContent = $viewport.attr( 'content' );
					if ( viewportContent ) {
						// keep track of original content; then quickly swap out user-scalable
						$viewport.data( 'content', viewportContent );
						$viewport.attr( 'content', viewportContent.replace( /user-scalable=(1|yes)/, 'user-scalable=0' ) );
					}
				} );
				this.categoriesDetails.input.$input.on( 'focus', () => {
					// stop existing animations & scroll categories input to top
					// (mobile devices tend to center the input when focused, but
					// since we want to add a menu to it, we'd rather have it up top
					// to allow for more space to show the menu
					setTimeout( () => {
						// eslint-disable-next-line no-jquery/no-global-selector
						$( 'html, body' )
							.stop()
							.animate( {
								scrollTop: this.categoriesDetails.input.$input.eq( 0 ).offset().top - 50
							} );
					} );

					// restore original viewport content
					// eslint-disable-next-line no-jquery/no-global-selector
					const $viewport = $( 'head meta[name="viewport"]' );
					const viewportContentOriginal = $viewport.data( 'content' );
					if ( viewportContentOriginal ) {
						$viewport.attr( 'content', viewportContentOriginal );
						$viewport.removeData( 'content' );
					}
				} );
			}

			//
			// Any other information
			//
			this.otherDetails = new uw.OtherDetailsWidget();
			this.otherDetails.on( 'change', () => this.emit( 'change' ) );
			this.otherDetailsField = new uw.FieldLayout( this.otherDetails, {
				label: $( '<span>' ).append(
					new OO.ui.IconWidget( { icon: 'expand' } ).$element,
					new OO.ui.IconWidget( { icon: 'collapse' } ).$element,
					' ',
					mw.message( 'mwe-upwiz-other-v2', mw.user ).escaped()
				),
				classes: [
					'mwe-upwiz-fieldLayout-additional-info',
					'mwe-upwiz-fieldLayout-additional-info-clickable'
				]
			} );
			this.otherDetails.$element.makeCollapsible( {
				collapsed: true,
				$customTogglers: this.otherDetailsField.$element.find( '.oo-ui-fieldLayout-header' )
			} );
			// Expand collapsed sections if the fields within were changed (e.g. by metadata copier)
			this.otherDetails.on( 'change', () => {
				this.otherDetails.$element.data( 'mw-collapsible' ).expand();
			} );

			this.mainFields.push( this.categoriesDetailsField );
			this.mainFields.push( this.locationInputField );
			this.mainFields.push( this.objectLocationInputField );
			this.mainFields.push( this.otherDetailsField );

			//
			// Structured data - Main subjects AKA depicts
			//
			this.statementWidgets = {};
			if ( config.wikibase.enabled && config.wikibase.statements ) {
				Object.keys( propertyTypes ).forEach( ( propertyId ) => {
					propertyDataValuesTypes[ propertyId ] = dataTypesMap[ propertyTypes[ propertyId ] ].dataValueType;
				} );

				( config.defaults.statements || [] ).forEach( ( data ) => {
					if ( !defaultProperties.includes( data.propertyId ) ) {
						defaultProperties.push( data.propertyId );
					}
					propertyDataValuesTypes[ data.propertyId ] = data.dataType;
				} );

				defaultProperties.forEach( ( propertyId ) => {
					// only wikibase-entityid types are supported
					if ( propertyDataValuesTypes[ propertyId ] !== 'wikibase-entityid' ) {
						return;
					}

					const widget = this.createStatementWidget( propertyId );
					widget.input.input.lookupMenu.$element.addClass( 'mwe-upwiz-statements-menu' );
					widget.on( 'change', () => this.emit( 'change' ) );
					if ( OO.ui.isMobile() ) {
						widget.input.input.lookupMenu.$element.on( 'scroll', () => {
							// hide the software keyboard, leaving more space for autocomplete menu
							// (note: the more obvious thing to do would be blurring the input field,
							// but that would also trigger this widget to hide the menu)
							widget.input.input.$input[ 0 ].inputMode = 'none';
						} );
						widget.input.input.$input.on( 'focus mousedown keypress', () => {
							// while scrolling the autocomplete results, we changed the input mode
							// to get rid of the software keyboard; now that the user is interacting
							// we need to make sure they're able to)
							widget.input.input.$input[ 0 ].inputMode = 'text';
						} );
						widget.input.input.$input.on( 'mousedown', () => {
							// mobile devices tend to auto-zoom to input when focused (for small
							// enough font sizes), but we'd actually prefer they don't in this case,
							// as we will be adding the statement selection menu to the input,
							// and such zoom may interfere with the user's ability to see/interact
							// with that
							// the way we're going to accomplish this is a bit of a hack: we'll
							// temporarily disable user-scalable in the viewport meta tag on mousedown
							// (at which point the auto-zoom is not yet triggered), then reinstated
							// the original viewport content later on in the click lifecycle, so it
							// once again becomes available for the users to zoom in/out themselves
							// if they wish
							// eslint-disable-next-line no-jquery/no-global-selector
							const $viewport = $( 'head meta[name="viewport"]' );
							const viewportContent = $viewport.attr( 'content' );
							if ( viewportContent ) {
								// keep track of original content; then quickly swap out user-scalable
								$viewport.data( 'content', viewportContent );
								$viewport.attr( 'content', viewportContent.replace( /user-scalable=(1|yes)/, 'user-scalable=0' ) );
							}
						} );
						widget.input.input.$input.on( 'focus', () => {
							// stop existing animations & scroll statement input to top
							// (mobile devices tend to center the input when focused, but
							// since we want to add a menu to it, we'd rather have it up top
							// to allow for more space to show the menu
							setTimeout( () => {
								// eslint-disable-next-line no-jquery/no-global-selector
								$( 'html, body' )
									.stop()
									.animate( {
										scrollTop: widget.input.input.$input.eq( 0 ).offset().top - 50
									} );
							} );

							// restore original viewport content
							// eslint-disable-next-line no-jquery/no-global-selector
							const $viewport = $( 'head meta[name="viewport"]' );
							const viewportContentOriginal = $viewport.data( 'content' );
							if ( viewportContentOriginal ) {
								$viewport.attr( 'content', viewportContentOriginal );
								$viewport.removeData( 'content' );
							}
						} );
					}

					statementFields[ propertyId ] = new uw.FieldLayout( widget, {
						// unknown labels will get filled in later on
						label: this.propertyTitles[ propertyId ] || propertyId,
						classes: [ 'mwe-upwiz-fieldLayout-additional-info' ]
					} );

					this.additionalInfoFieldset.addItems( [ statementFields[ propertyId ] ] );
					this.statementWidgets[ propertyId ] = widget;
					this.mainFields.push( statementFields[ propertyId ] );

					// properties without a specified title default to their property id,
					// but we'll grab the property label from Wikibase and update the
					// field's label once we have it
					if ( !( propertyId in this.propertyTitles ) ) {
						this.getPropertyLabel( propertyId ).then( ( text ) => {
							statementFields[ propertyId ].setLabel( text );
						} );
					}
				} );
			}

			this.additionalInfoFieldset.addItems(
				[
					this.categoriesDetailsField,
					this.locationInputField,
					this.objectLocationInputField,
					this.otherDetailsField
				]
			);

			this.$form = $( '<form id="mwe-upwiz-detailsform' + this.upload.index + '"></form>' ).addClass( 'detailsForm' );
			this.$form.append(
				this.titleDetailsField.$element,
				captionsAvailable ? this.captionsDetailsField.$element : null,
				this.descriptionsDetailsField.$element,
				this.dateDetailsField.$element,
				this.additionalInfoFieldset.$element
			);

			this.$form.on( 'submit', ( e ) => {
				// Prevent actual form submission
				e.preventDefault();
			} );

			//
			// Campaigns
			//
			this.campaignDetailsFields = [];
			config.fields.forEach( ( field ) => {
				let customDetails, customDetailsField;

				if ( field.wikitext ) {
					customDetails = new uw.CampaignDetailsWidget( field );
					customDetailsField = new uw.FieldLayout( customDetails, {
						label: $( $.parseHTML( field.label ) ),
						required: !!field.required
					} );

					if ( field.initialValue ) {
						customDetails.setSerialized( { value: field.initialValue } );
					}

					this.$form.append( customDetailsField.$element );
					this.campaignDetailsFields.push( customDetailsField );
				}
			} );

			//
			// Remove upload button
			//
			this.removeCtrl = new OO.ui.ButtonWidget( {
				label: mw.message( 'mwe-upwiz-remove' ).text(),
				title: mw.message( 'mwe-upwiz-remove-upload' ).text(),
				classes: [ 'mwe-upwiz-remove-upload' ],
				flags: 'destructive',
				icon: 'trash',
				framed: false
			} ).on( 'click', () => {
				OO.ui.confirm( mw.message( 'mwe-upwiz-license-confirm-remove' ).text(), {
					title: mw.message( 'mwe-upwiz-license-confirm-remove-title' ).text()
				} ).done( ( confirmed ) => {
					if ( confirmed ) {
						this.upload.emit( 'remove-upload' );
					}
				} );
			} );

			this.$thumbnailDiv.append( this.removeCtrl.$element );

			this.statusMessage = new OO.ui.MessageWidget( { inline: true } );
			this.statusMessage.toggle( false );
			this.$spinner = $.createSpinner( { size: 'small', type: 'inline' } );
			this.$spinner.hide();
			this.$indicator = $( '<div>' ).addClass( 'mwe-upwiz-file-indicator' ).append(
				this.$spinner,
				this.statusMessage.$element
			);

			this.$submittingDiv = $( '<div>' ).addClass( 'mwe-upwiz-submitting' )
				.append(
					this.$indicator,
					$( '<div>' ).addClass( 'mwe-upwiz-details-texts' ).append(
						$( '<div>' ).addClass( 'mwe-upwiz-visible-file-filename-text' ),
						$( '<div>' ).addClass( 'mwe-upwiz-file-status-line' )
					)
				);

			this.$dataDiv.append(
				this.$form,
				this.$submittingDiv
			).morphCrossfader();

			this.$div.append(
				this.$thumbnailDiv,
				this.$dataDiv
			);

			const searchParams = new URLSearchParams( location.search );
			const captionlang = searchParams.get( 'captionlang' );
			if ( config.defaults.caption || captionlang ) {
				this.captionsDetails.setSerialized( {
					inputs: [
						{
							text: config.defaults.caption || ''
						}
					]
				} );
				this.captionsDetails.getItems()[ 0 ].fieldWidget.setLanguage(
					captionlang ?
						this.captionsDetails.getItems()[ 0 ].fieldWidget.getClosestAllowedLanguage( captionlang ) :
						this.captionsDetails.getItems()[ 0 ].fieldWidget.getDefaultLanguage()
				);
			}

			const descriptionlang = searchParams.get( 'descriptionlang' );
			if ( config.defaults.description || descriptionlang ) {
				this.descriptionSameAsCaptionCheckbox.setSelected( false );
				this.descriptionsDetails.setSerialized( {
					inputs: [
						{
							text: config.defaults.description || ''
						}
					]
				} );
				this.descriptionsDetails.getItems()[ 0 ].fieldWidget.setLanguage(
					descriptionlang ?
						this.descriptionsDetails.getItems()[ 0 ].fieldWidget.getClosestAllowedLanguage( descriptionlang ) :
						this.descriptionsDetails.getItems()[ 0 ].fieldWidget.getDefaultLanguage()
				);
			}

			this.populate();

			this.interfaceBuilt = true;

			if ( this.savedSerialData ) {
				this.setSerialized( this.savedSerialData );
				this.savedSerialData = undefined;
			}
		},

		createStatementWidget: function ( propertyId, dataType, data ) {
			const propertyPlaceholders = mw.config.get( 'upwizPropertyPlaceholders' ) || {};

			return new uw.StatementWidget( {
				propertyId: propertyId,
				type: dataType,
				classes: [ 'wbmi-statement-input' ],
				data: data,
				placeholder: propertyId in propertyPlaceholders ? propertyPlaceholders[ propertyId ] : ''
			} );
		},

		getStatementProperties: function () {
			const properties = [];
			for ( const propertyId in this.statementWidgets ) {
				properties.push( {
					id: propertyId,
					label: this.propertyTitles[ propertyId ]
				} );
			}
			return properties;
		},

		getPropertyLabel: function ( propertyId ) {
			const FormatValueElement = mw.loader.require( 'wikibase.mediainfo.base' ).FormatValueElement,
				formatValueElement = new FormatValueElement(),
				datamodel = require( 'wikibase.datamodel' );

			// Format the label & capitalize
			return formatValueElement.formatValue(
				new datamodel.EntityId( propertyId ),
				'text/plain'
			).then( ( text ) => text.charAt( 0 ).toUpperCase() + text.slice( 1 ) );
		},

		/*
		 * Append the div for this details object to the DOM.
		 * We need to ensure that we add divs in the right order
		 * (the order in which the user selected files).
		 *
		 * Will only append once.
		 */
		attach: function () {
			const $window = $( window );

			const maybeBuild = () => {
				if ( !this.interfaceBuilt && $window.scrollTop() + $window.height() + 1000 >= this.$div.offset().top ) {
					this.buildInterface();
					$window.off( 'scroll', maybeBuild );
				}
			};

			if ( !this.isAttached ) {
				this.$containerDiv.append( this.$div );

				if ( $window.scrollTop() + $window.height() + 1000 >= this.$div.offset().top ) {
					this.buildInterface();
				} else {
					$window.on( 'scroll', maybeBuild );
				}

				this.isAttached = true;
			}
		},

		/**
		 * Get file page title for this upload.
		 *
		 * @return {mw.Title|null}
		 */
		getTitle: function () {
			// title will not be set until we've actually submitted the file
			if ( this.title === undefined ) {
				return this.titleDetails.getTitle();
			}

			// once the file has been submitted, we'll have confirmation on
			// the filename and trust the authoritative source over own input
			return this.title;
		},

		/**
		 * @private
		 *
		 * @return {uw.FieldLayout[]}
		 */
		getAllFields: function () {
			return [].concat(
				this.mainFields,
				this.upload.deedChooser.deed ? this.upload.deedChooser.deed.getFields() : [],
				this.campaignDetailsFields
			);
		},

		/**
		 * Check all the fields for validity.
		 *
		 * @param thorough
		 * @return {jQuery.Promise<mw.uploadWizard.ValidationStatus>}
		 */
		validate: function ( thorough ) {
			const fieldPromises = this.getAllFields()
				.filter( ( fieldLayout ) => !!fieldLayout.fieldWidget.validate )
				.map( ( fieldLayout ) => fieldLayout.fieldWidget.validate( thorough ) );

			return mw.uploadWizard.ValidationStatus.mergePromises( ...fieldPromises );
		},

		/**
		 * Get a thumbnail caption for this upload (basically, the first caption).
		 *
		 * @return {string}
		 */
		getThumbnailCaption: function () {
			let captions = [];
			if ( mw.UploadWizard.config.wikibase.enabled && mw.UploadWizard.config.wikibase.captions ) {
				captions = this.captionsDetails.getSerialized().inputs;
			} else {
				captions = this.descriptionsDetails.getSerialized().inputs;
			}

			if ( captions.length > 0 ) {
				return mw.Escaper.escapeForTemplate( captions[ 0 ].text.trim() );
			} else {
				return '';
			}
		},

		/**
		 * Pull some info into the form ( for instance, extracted from EXIF, desired filename )
		 */
		populate: function () {
			const $thumbnailDiv = this.$thumbnailDiv;
			// This must match the CSS dimensions of .mwe-upwiz-thumbnail
			this.upload.getThumbnail( 230 ).done( ( thumb ) => {
				mw.UploadWizard.placeThumbnail( $thumbnailDiv, thumb );
			} );
			this.prefillDate();
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
			const yyyyMmDdRegex = /^(\d\d\d\d)[:/-](\d\d)[:/-](\d\d)\D.*/,
				timeRegex = /\D(\d\d):(\d\d):(\d\d)/;

			// XXX surely we have this function somewhere already
			function pad( n ) {
				return ( n < 10 ? '0' : '' ) + String( n );
			}

			function getSensibleTime( date ) {
				let str = '';

				str += pad( date.getHours() ) + ':';
				str += pad( date.getMinutes() ) + ':';
				str += pad( date.getSeconds() );

				return str;
			}

			// If not own work, don't prefill
			if ( this.upload.deedChooser.deed.name === 'thirdparty' ) {
				return;
			}

			let dateObj;
			if ( this.upload.imageinfo.metadata ) {
				const metadata = this.upload.imageinfo.metadata;
				[ 'datetimeoriginal', 'datetimedigitized', 'datetime', 'date' ].some( ( propName ) => {
					const dateInfo = metadata[ propName ];
					if ( dateInfo ) {
						const matches = dateInfo.trim().match( yyyyMmDdRegex );
						if ( matches ) {
							const timeMatches = dateInfo.trim().match( timeRegex );
							if ( timeMatches ) {
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
							return true; // break from Array.some
						}
					}
					return false;
				} );
			}

			// If we don't have EXIF lets try other sources - Flickr
			if ( dateObj === undefined && this.upload.file !== undefined && this.upload.file.date !== undefined ) {
				const dateTimeRegex = /^\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d/;
				const matches = this.upload.file.date.match( dateTimeRegex );
				if ( matches ) {
					this.dateDetails.setSerialized( {
						prefilled: true,
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

			let dateStr = dateObj.getFullYear() + '-' + pad( dateObj.getMonth() + 1 ) + '-' + pad( dateObj.getDate() );

			// Add the time
			// If the date but not the time is set in EXIF data, we'll get a bogus
			// time value of '00:00:00'.
			// FIXME: Check for missing time value earlier rather than blacklisting
			// a potentially legitimate time value.
			const sensibleTime = getSensibleTime( dateObj );
			if ( sensibleTime !== '00:00:00' ) {
				dateStr += ' ' + sensibleTime;
			}

			// ok by now we should definitely have a dateObj and a date string
			this.dateDetails.setSerialized( {
				prefilled: true,
				value: dateStr
			} );
		},

		/**
		 * Set the title of the thing we just uploaded, visibly
		 */
		prefillTitle: function () {
			this.titleDetails.setSerialized( {
				title: this.upload.title.getNameText()
			} );
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
				this.descriptionsDetails.getWikiText() === '' &&
				this.upload.file !== undefined
			) {
				const m = this.upload.imageinfo.metadata;
				let descText = this.upload.file.description ||
					( m && m.imagedescription && m.imagedescription[ 0 ] && m.imagedescription[ 0 ].value );

				if ( descText ) {
					// strip out any HTML tags
					descText = descText.replace( /<[^>]+>/g, '' );
					// & and " are escaped by Flickr, so we need to unescape
					descText = descText.replace( /&amp;/g, '&' ).replace( /&quot;/g, '"' );

					this.descriptionSameAsCaptionCheckbox.setSelected( false );
					this.descriptionsDetails.setSerialized( {
						inputs: [
							{
								text: descText.trim()
							}
						]
					} );
					// The language is probably wrong in many cases...
					this.descriptionsDetails.getItems()[ 0 ].fieldWidget.setLanguage(
						this.descriptionsDetails.getItems()[ 0 ].fieldWidget.getClosestAllowedLanguage( mw.config.get( 'wgContentLanguage' ) )
					);
				}
			}
		},

		/**
		 * Prefill location input from image info and metadata
		 *
		 * As of MediaWiki 1.18, the exif parser translates the rational GPS data tagged by the camera
		 * to decimal format.  Let's just use that.
		 */
		prefillLocation: function () {
			const m = this.upload.imageinfo.metadata,
				values = {};

			if ( mw.UploadWizard.config.defaults.lat ) {
				values.latitude = mw.UploadWizard.config.defaults.lat;
			}
			if ( mw.UploadWizard.config.defaults.lon ) {
				values.longitude = mw.UploadWizard.config.defaults.lon;
			}
			if ( mw.UploadWizard.config.defaults.heading ) {
				values.heading = mw.UploadWizard.config.defaults.heading;
			}

			if ( m ) {
				let dir = m.gpsimgdirection || m.gpsdestbearing;

				if ( dir ) {
					if ( /^\d+\/\d+$/.test( dir ) ) {
						// Apparently it can take the form "x/y" instead of
						// a decimal value. Mighty silly, but let's save it.
						dir = dir.split( '/' );
						dir = parseInt( dir[ 0 ], 10 ) / parseInt( dir[ 1 ], 10 );
					}

					values.heading = dir;
				}

				// Prefill useful stuff only
				if ( Number( m.gpslatitude ) && Number( m.gpslongitude ) ) {
					values.latitude = m.gpslatitude;
					values.longitude = m.gpslongitude;
				} else if (
					this.upload.file &&
					this.upload.file.location &&
					this.upload.file.location.latitude &&
					this.upload.file.location.longitude
				) {
					values.latitude = this.upload.file.location.latitude;
					values.longitude = this.upload.file.location.longitude;
				}
				if ( Number( m.gpsdestlatitude ) && Number( m.gpsdestlongitude ) ) {
					values.objectLatitude = m.gpsdestlatitude;
					values.objectLongitude = m.gpsdestlongitude;
				} else if (
					this.upload.file &&
					this.upload.file.objectLocation &&
					this.upload.file.objectLocation.objectLatitude &&
					this.upload.file.objectLocation.objectLongitude
				) {
					values.objectLatitude = this.upload.file.objectLocation.objectLatitude;
					values.objectLongitude = this.upload.file.objectLocation.objectLongitude;
				}
			}

			this.locationInput.setSerialized( values );
			this.objectLocationInput.setSerialized( values );
			this.objectLocationInputField.$element.toggle( Boolean( values.objectLatitude && values.objectLongitude ) );
		},

		/**
		 * Get a machine-readable representation of the current state of the upload details. It can be
		 * passed to #setSerialized to restore this state (or to set it for another instance of the same
		 * class).
		 *
		 * Note that this doesn't include custom deed's state.
		 *
		 * @return {Object.<string,Object>}
		 */
		getSerialized: function () {
			if ( !this.interfaceBuilt ) {
				// We don't have the interface yet, but it'll get filled out as
				// needed.
				return;
			}

			return {
				title: this.titleDetails.getSerialized(),
				caption: this.captionsDetails.getSerialized(),
				description: this.descriptionSameAsCaptionCheckbox.isSelected() ? undefined : this.descriptionsDetails.getSerialized(),
				date: this.dateDetails.getSerialized(),
				categories: this.categoriesDetails.getSerialized(),
				statements: this.serializeStatements(),
				location: this.locationInput.getSerialized(),
				objectLocation: this.objectLocationInput.getSerialized(),
				other: this.otherDetails.getSerialized(),
				campaigns: this.campaignDetailsFields.map( ( field ) => field.fieldWidget.getSerialized() )
			};
		},

		serializeStatements: function () {
			const serialized = {};
			for ( const propertyId in this.statementWidgets ) {
				serialized[ propertyId ] = this.statementWidgets[ propertyId ].getStatementList();
			}
			return serialized;
		},

		setStatementsFromSerialized: function ( serialized ) {
			for ( const propertyId in serialized ) {
				this.statementWidgets[ propertyId ].resetData( serialized[ propertyId ] );
			}
		},

		/**
		 * Set the state of this widget from machine-readable representation, as returned by
		 * #getSerialized.
		 *
		 * Fields from the representation can be omitted to keep the current value.
		 *
		 * @param {Object.<string,Object>} [serialized]
		 */
		setSerialized: function ( serialized ) {
			let i;

			if ( !this.interfaceBuilt ) {
				// There's no interface yet! Don't load the data, just keep it
				// around.
				if ( serialized === undefined ) {
					// Note: This will happen if we "undo" a copy operation while
					// some of the details interfaces aren't loaded.
					this.savedSerialData = undefined;
				} else {
					this.savedSerialData = $.extend( true,
						this.savedSerialData || {},
						serialized
					);
				}
				return;
			}

			if ( serialized === undefined ) {
				// This is meaningless if the interface is already built.
				return;
			}

			if ( serialized.title ) {
				this.titleDetails.setSerialized( serialized.title );
			}
			if ( serialized.caption ) {
				this.captionsDetails.setSerialized( serialized.caption );
			}
			if ( serialized.description ) {
				this.descriptionsDetails.setSerialized( serialized.description );
				this.descriptionSameAsCaptionCheckbox.setSelected( false );
			}
			if ( serialized.date ) {
				this.dateDetails.setSerialized( serialized.date );
			}
			if ( serialized.categories ) {
				this.categoriesDetails.setSerialized( serialized.categories );
			}
			if ( serialized.statements ) {
				this.setStatementsFromSerialized( serialized.statements );
			}
			if ( serialized.location ) {
				this.locationInput.setSerialized( serialized.location );
			}
			if ( serialized.objectLocation ) {
				this.objectLocationInput.setSerialized( serialized.objectLocation );
			}
			if ( serialized.other ) {
				this.otherDetails.setSerialized( serialized.other );
			}
			if ( serialized.campaigns ) {
				for ( i = 0; i < this.campaignDetailsFields.length; i++ ) {
					this.campaignDetailsFields[ i ].fieldWidget.setSerialized( serialized.campaigns[ i ] );
				}
			}
		},

		/**
		 * Convert entire details for this file into wikiText, which will then be posted to the file
		 *
		 * This function assumes that all input is valid.
		 *
		 * @return {string} wikitext representing all details
		 */
		getWikiText: function () {
			let wikiText = '';

			// https://commons.wikimedia.org/wiki/Template:Information
			// can we be more slick and do this with maps, applys, joins?
			const information = {
				// {{lang|description in lang}}* (required)
				description: '',
				// holds {{Prompt}} template ... gets unset if it has no value
				'Other fields 1': '',
				// YYYY, YYYY-MM, or YYYY-MM-DD (required) use jquery but allow editing, then double check for sensible date.
				date: '',
				// {{own}} or wikitext (optional)
				source: '',
				// any wikitext, but particularly {{Creator:Name Surname}} (required)
				author: '',
				// leave blank unless OTRS pending; by default will be "see below" (optional)
				permission: '',
				// pipe separated list, other versions (optional)
				'other versions': ''
			};

			if ( this.descriptionSameAsCaptionCheckbox.isSelected() ) {
				information.description = this.captionsDetails.getWikiText();
			} else {
				information.description = this.descriptionsDetails.getWikiText();
			}

			const deed = this.upload.deedChooser.deed;
			if ( deed.getAiPromptWikitext() ) {
				information[ 'Other fields 1' ] = deed.getAiPromptWikitext();
			} else {
				delete information[ 'Other fields 1' ];
			}

			this.campaignDetailsFields.forEach( ( layout ) => {
				information.description += layout.fieldWidget.getWikiText();
			} );

			information.date = this.dateDetails.getWikiText();

			information.source = deed.getSourceWikiText( this.upload );

			information.author = deed.getAuthorWikiText( this.upload );

			let info = '';

			for ( const key in information ) {
				if ( Object.prototype.hasOwnProperty.call( information, key ) ) {
					info += '|' + key.replace( /:/g, '_' );
					info += '=' + mw.Escaper.escapeForTemplate( information[ key ] ) + '\n';
				}
			}

			wikiText += '=={{int:filedesc}}==\n';
			wikiText += '{{Information\n' + info + '}}\n';

			wikiText += this.locationInput.getWikiText() + '\n';
			wikiText += this.objectLocationInput.getWikiText() + '\n';

			// add an "anything else" template if needed
			wikiText += this.otherDetails.getWikiText() + '\n\n';

			// add licensing information
			wikiText += '\n=={{int:license-header}}==\n';
			wikiText += deed.getLicenseWikiText( this.upload ) + '\n\n';

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

			// templates for other options
			wikiText += deed.getTemplateOptionsWikiText() + '\n\n';

			// categories
			wikiText += '\n' + this.categoriesDetails.getWikiText();

			// sanitize wikitext if TextCleaner is defined (MediaWiki:TextCleaner.js)
			if ( typeof window.TextCleaner !== 'undefined' && typeof window.TextCleaner.sanitizeWikiText === 'function' ) {
				wikiText = window.TextCleaner.sanitizeWikiText( wikiText, true );
			}

			// remove too many newlines in a row
			wikiText = wikiText.replace( /\n{3,}/g, '\n\n' );

			return wikiText;
		},

		/**
		 * @return {jQuery.Promise}
		 */
		submit: function () {
			this.$containerDiv.find( 'form' ).trigger( 'submit' );

			this.upload.title = this.getTitle();
			this.upload.state = 'submitting-details';
			this.setStatus( mw.message( 'mwe-upwiz-submitting-details' ).text() );
			this.showIndicator( 'progress' );

			const wikitext = this.getWikiText();
			let promise = this.submitWikiText( wikitext );

			if ( mw.UploadWizard.config.wikibase.enabled ) {
				promise = promise
					.then( () => {
						// just work out the mediainfo entity id from the page id
						const status = mw.message( 'mwe-upwiz-submitting-structured-data' );
						this.setStatus( status.text() );
						return this.getMediaInfoEntityId(); // (T208545)
					} )
					// submit structured data to wikibase
					.then( this.submitStructuredData.bind( this ) );
			}

			return promise.then( () => {
				// FIXME - structuredDataSubmissionErrors gets set to true in the catch block of
				// postStructuredData which executes AFTER this, and so the error never gets
				// displayed
				if ( this.structuredDataSubmissionErrors ) {
					let errorString = '<strong>' + mw.message(
						'mwe-upwiz-error-submit-structured-data'
					).parse() + '</strong>';

					errorString += '<strong>' + mw.message(
						'mwe-upwiz-error-submit-structured-data-remedy',
						this.upload.imageinfo.canonicaltitle
					).parse() + '</strong>';

					this.upload.state = 'sdc-api-error';
					this.showError(
						'sd-fail',
						errorString
					);
					// If there is a structured data error, then details for how to deal with it are
					// in the errorString above, no need to show anything else
					// eslint-disable-next-line no-jquery/no-global-selector
					$( '#mwe-upwiz-details-warning-count' ).hide();
					// eslint-disable-next-line no-jquery/no-global-selector
					$( '.mwe-upwiz-remove-upload' ).hide();
					// Remove the beforeunload warning, as the image is now as uploaded
					// as it's going to get
					$( window ).off( 'beforeunload' );
				} else {
					this.showIndicator( 'success' );
					this.setStatus( mw.message( 'mwe-upwiz-published' ).text() );
				}
			} );
		},

		/**
		 * @return {jQuery.Promise}
		 */
		getMediaInfoEntityId: function () {
			if ( this.mediaInfoEntityId !== undefined ) {
				return $.Deferred().resolve( this.mediaInfoEntityId ).promise();
			}

			return this.upload.api.get( {
				action: 'query',
				prop: 'info',
				titles: this.getTitle().getPrefixedDb()
			} ).then( ( result ) => {
				let message;

				if ( result.query.pages[ 0 ].missing ) {
					// page doesn't exist (yet)
					message = mw.message( 'mwe-upwiz-error-pageprops-missing-page' ).parse();
					return $.Deferred().reject( 'pageprops-missing-page', { errors: [ { html: message } ] } ).promise();
				}

				// FIXME: This just fetches the pageid and then hard-codes knowing that M+pageid is what we need
				this.mediaInfoEntityId = 'M' + result.query.pages[ 0 ].pageid;
				return this.mediaInfoEntityId;
			} );
		},

		/**
		 * Post wikitext as edited here, to the file
		 *
		 * This function is only called if all input seems valid (which doesn't mean that we can't get
		 * an error, see #processError).
		 *
		 * @param {string} wikiText
		 * @return {jQuery.Promise}
		 */
		submitWikiText: function ( wikiText ) {
			const tags = [ 'uploadwizard' ],
				deed = this.upload.deedChooser.deed,
				config = mw.UploadWizard.config;
			let comment = '';

			this.firstPoll = Date.now();

			if ( this.upload.file.source ) {
				tags.push( 'uploadwizard-' + this.upload.file.source );
			}

			if ( deed.name === 'ownwork' ) {
				// This message does not have any parameters, so there's nothing to substitute
				comment = config.uploadComment.ownWork;
			} else {
				mw.messages.set(
					'mwe-upwiz-upload-comment-third-party',
					config.uploadComment.thirdParty
				);
				comment = mw.message(
					'mwe-upwiz-upload-comment-third-party',
					deed.getAuthorWikiText(),
					deed.getSourceWikiText()
				).plain();
			}

			const params = {
				action: 'upload',
				filekey: this.upload.fileKey,
				filename: this.getTitle().getMain(),
				comment: comment,
				tags: config.CanAddTags ? tags : [],
				// we can ignore upload warnings here, we've already checked
				// when stashing the file
				// not ignoring warnings would prevent us from uploading a file
				// that is a duplicate of something in a foreign repo
				ignorewarnings: true,
				text: wikiText
			};

			// Only enable async publishing if file is larger than 10MiB
			if ( this.upload.transportWeight > 10 * 1024 * 1024 ) {
				params.async = true;
			}

			return this.submitWikiTextInternal( params );
		},

		/**
		 * @param {string} entityId
		 * @return {jQuery.Promise}
		 */
		submitStructuredData: function ( entityId ) {
			let promise = $.Deferred().resolve().promise();
			const config = mw.UploadWizard.config,
				data = {},
				wbDataModel = mw.loader.require( 'wikibase.datamodel' ),
				wbSerialization = mw.loader.require( 'wikibase.serialization' ),
				wbSerializer = new wbSerialization.StatementSerializer();

			const labels = this.prepareLabelsData();
			const statements = this.prepareStatementsData();

			if ( !config.wikibase.enabled ) {
				return promise;
			}

			if ( config.wikibase.captions && Object.keys( labels ).length !== 0 ) {
				data.labels = labels;
			}

			if ( config.wikibase.statements && statements.length !== 0 ) {
				data.claims = statements;
			}

			// eslint-disable-next-line no-undef
			if ( this.dateProperty !== '' && dataValues ) {
				promise = promise
					.then( () => this.dateDetails.parseDate() )
					.then(
						( response ) => {
							const date = response.results[ 0 ].value;
							const dateStatement = wbSerializer.serialize(
								new wbDataModel.Statement(
									new wbDataModel.Claim(
										new wbDataModel.PropertyValueSnak(
											this.dateProperty,
											// eslint-disable-next-line no-undef
											dataValues.TimeValue.newFromJSON( date )
										)
									)
								)
							);
							data.claims = data.claims ? data.claims.concat( dateStatement ) : [ dateStatement ];
						},
						( errorCode ) => {
							mw.log.warn(
								'uw.DateDetailsWidget::parseDate> ' +
								'Parsing into a Wikibase date failed. Reason: ' +
								errorCode
							);
							// Parsing failed: don't add the date statement,
							// but convert back to a resolved promise to keep
							// the chain going
							return $.Deferred().resolve().promise();
						}
					);
			}

			return promise.then(
				() => {
					if ( Object.keys( data ).length > 0 ) {
						return this.postStructuredData( entityId, JSON.stringify( data ) );
					}
				}
			);
		},

		prepareLabelsData: function () {
			const captions = this.captionsDetails.getValues(),
				languages = Object.keys( captions ),
				labels = {};
			for ( let i = 0; i < languages.length; i++ ) {
				labels[ languages[ i ] ] = {
					language: languages[ i ],
					value: captions[ languages[ i ] ]
				};
			}
			return labels;
		},

		prepareStatementsData: function () {
			let claims = [];
			const wikibaseSerialization = mw.loader.require( 'wikibase.serialization' ),
				statementListSerializer = new wikibaseSerialization.StatementListSerializer(),
				deed = this.upload.deedChooser.deed;
			for ( const propertyId in this.statementWidgets ) {
				claims = claims.concat(
					statementListSerializer.serialize(
						this.statementWidgets[ propertyId ].getStatementList()
					)
				);
			}
			const sourceSD = deed.getStructuredDataFromSource();
			if ( sourceSD ) {
				claims = claims.concat( sourceSD );
			}
			return claims;
		},

		/**
		 * @param {string} id
		 * @param {string} data
		 * @return {jQuery.Promise}
		 */
		postStructuredData: function ( id, data ) {
			const config = mw.UploadWizard.config,
				params = {
					action: 'wbeditentity',
					id: id,
					data: data,
					// baserevid is intentionally left blank: SD can be submitted
					// without baserevid just fine - baserevid is to prevent edit conflicts,
					// and this is a new upload so there should be none
					baserevid: undefined
				},
				ajaxOptions = { url: config.wikibase.api };

			return this.upload.api.postWithEditToken(
				params, ajaxOptions
			).catch( () => {
				this.structuredDataSubmissionErrors = true;
			} );
		},

		/**
		 * Perform the API call with given parameters (which is expected to publish this file) and
		 * handle the result.
		 *
		 * @param {Object} params API call parameters
		 * @return {jQuery.Promise}
		 */
		submitWikiTextInternal: function ( params ) {
			const apiPromise = this.upload.api.postWithEditToken( params );

			return apiPromise
				// process the successful (in terms of HTTP status...) API call first:
				// there may be warnings or other issues with the upload that need
				// to be dealt with
				.then( this.validateWikiTextSubmitResult.bind( this, params ) )
				// making it here means the upload is a success, or it would've been
				// rejected by now (either by HTTP status code, or in validateWikiTextSubmitResult)
				.then( ( result ) => {
					this.title = mw.Title.makeTitle( 6, result.upload.filename );
					this.upload.extractImageInfo( result.upload.imageinfo );
					this.upload.thisProgress = 1.0;
					this.upload.state = 'complete';
					return result;
				} )
				// uh-oh - something went wrong!
				.catch( ( code, result ) => {
					this.upload.state = 'error';
					this.processError( code, result );
					return $.Deferred().reject( code, result );
				} )
				.promise( { abort: apiPromise.abort } );
		},

		/**
		 * Validates the result of a submission & returns a resolved promise with
		 * the API response if all went well, or rejects with error code & error
		 * message as you would expect from failed mediawiki API calls.
		 *
		 * @param {Object} params What we passed to the API that caused this response.
		 * @param {Object} result API result of an upload or status check.
		 * @return {jQuery.Promise}
		 */
		validateWikiTextSubmitResult: function ( params, result ) {
			let warnings = null;
			let ignoreTheseWarnings = false;
			const deferred = $.Deferred();

			if ( result && result.upload && result.upload.result === 'Poll' ) {
				// if async publishing takes longer than 10 minutes give up
				if ( ( Date.now() - this.firstPoll ) > 10 * 60 * 1000 ) {
					return deferred.reject( 'server-error', { errors: [ {
						code: 'server-error',
						html: 'Unknown server error'
					} ] } );
				} else {
					if ( result.upload.stage === undefined ) {
						return deferred.reject( 'no-stage', { errors: [ {
							code: 'no-stage',
							html: 'Unable to check file\'s status'
						} ] } );
					} else {
						// Messages that can be returned:
						// * mwe-upwiz-queued
						// * mwe-upwiz-publish
						// * mwe-upwiz-assembling
						this.setStatus( mw.message( 'mwe-upwiz-' + result.upload.stage ).text() );
						setTimeout( () => {
							if ( this.upload.state !== 'aborted' ) {
								this.submitWikiTextInternal( {
									action: 'upload',
									checkstatus: true,
									filekey: this.upload.fileKey
								} ).then( deferred.resolve, deferred.reject );
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
			let existingFile;
			if ( warnings && warnings.exists ) {
				existingFile = warnings.exists;
			} else if ( warnings && warnings[ 'exists-normalized' ] ) {
				existingFile = warnings[ 'exists-normalized' ];
				const existingFileExt = mw.Title.normalizeExtension( existingFile.split( '.' ).pop() );
				const ourFileExt = mw.Title.normalizeExtension( this.getTitle().getExtension() );

				if ( existingFileExt !== ourFileExt ) {
					delete warnings[ 'exists-normalized' ];
					ignoreTheseWarnings = true;
				}
			}
			if ( warnings && warnings[ 'was-deleted' ] ) {
				delete warnings[ 'was-deleted' ];
				ignoreTheseWarnings = true;
			}
			for ( const wx in warnings ) {
				if ( Object.prototype.hasOwnProperty.call( warnings, wx ) ) {
					// if there are other warnings, deal with those first
					ignoreTheseWarnings = false;
				}
			}
			if ( result && result.upload && result.upload.imageinfo ) {
				return $.Deferred().resolve( result );
			} else if ( ignoreTheseWarnings ) {
				params.ignorewarnings = 1;
				return this.submitWikiTextInternal( params );
			} else if ( result && result.upload && result.upload.warnings ) {
				let code, message;
				if ( warnings.thumb || warnings[ 'thumb-name' ] ) {
					code = 'error-title-thumbnail';
					message = mw.message( 'mwe-upwiz-error-title-thumbnail' ).parse();
				} else if ( warnings.badfilename ) {
					code = 'title-invalid';
					message = mw.message( 'mwe-upwiz-error-title-invalid' ).parse();
				} else if ( warnings[ 'bad-prefix' ] ) {
					code = 'title-senselessimagename';
					message = mw.message( 'mwe-upwiz-error-title-senselessimagename' ).parse();
				} else if ( existingFile ) {
					const existingFileUrl = mw.config.get( 'wgServer' ) + mw.Title.makeTitle( NS_FILE, existingFile ).getUrl();
					code = 'api-warning-exists';
					message = mw.message( 'mwe-upwiz-api-warning-exists', existingFileUrl ).parse();
				} else if ( warnings.duplicate ) {
					code = 'upload-error-duplicate';
					message = mw.message( 'mwe-upwiz-upload-error-duplicate' ).parse();
				} else if ( warnings[ 'duplicate-archive' ] !== undefined ) {
					// warnings[ 'duplicate-archive' ] may be '' (empty string) for revdeleted files
					if ( this.upload.handler.isIgnoredWarning( 'duplicate-archive' ) ) {
						// We already told the interface to ignore this warning, so
						// let's steamroll over it and re-call this handler.
						params.ignorewarnings = true;
						return this.submitWikiTextInternal( params );
					} else {
						// This should _never_ happen, but just in case....
						code = 'upload-error-duplicate-archive';
						message = mw.message( 'mwe-upwiz-upload-error-duplicate-archive' ).parse();
					}
				} else {
					const warningsKeys = Object.keys( warnings );
					code = 'unknown-warning';
					message = mw.message( 'api-error-unknown-warning', warningsKeys.join( ', ' ) ).parse();
				}

				return $.Deferred().reject( code, { errors: [ { html: message } ] } );
			} else {
				return $.Deferred().reject( 'this-info-missing', result );
			}
		},

		/**
		 * Create a recoverable error -- show the form again, and highlight the problematic field.
		 *
		 * @param {string} code
		 * @param {string} html Error message to show.
		 */
		recoverFromError: function ( code, html ) {
			this.upload.state = 'recoverable-error';
			this.$dataDiv.morphCrossfade( '.detailsForm' );
			this.titleDetailsField.setErrors( [ { code: code, html: html } ] );
		},

		/**
		 * Show error state, possibly using a recoverable error form
		 *
		 * @param {string} code Error code
		 * @param {string} html Error message
		 */
		showError: function ( code, html ) {
			this.showIndicator( 'error' );
			this.setStatus( Object.assign( html ) );
		},

		/**
		 * Decide how to treat various errors
		 *
		 * @param {string} code Error code
		 * @param {Object} result Result from ajax call
		 */
		processError: function ( code, result ) {
			const recoverable = [
				'abusefilter-disallowed',
				'abusefilter-warning',
				'spamblacklist',
				'fileexists-shared-forbidden',
				'protectedpage',
				'titleblacklist-forbidden',

				// below are not actual API errors, but recoverable warnings that have
				// been discovered in validateWikiTextSubmitResult and fabricated to resemble
				// API errors and end up here to be dealt with
				'error-title-thumbnail',
				'title-invalid',
				'title-senselessimagename',
				'api-warning-exists',
				'upload-error-duplicate',
				'upload-error-duplicate',
				'upload-error-duplicate-archive',
				'unknown-warning'
			];

			if ( code === 'badtoken' ) {
				this.api.badToken( 'csrf' );
				// TODO Automatically try again instead of requiring the user to bonk the button
			}

			if ( code === 'ratelimited' ) {
				// None of the remaining uploads is going to succeed, and every failed one is going to
				// ping the rate limiter again.
				this.upload.wizard.steps.details.queue.abortExecuting();
			} else if ( code === 'http' && result && result.exception === 'abort' ) {
				// This upload has just been aborted because an earlier one got the 'ratelimited' error.
				// This could potentially also come up when an upload is removed by the user, but in that
				// case the UI is invisible anyway, so whatever.
				code = 'ratelimited';
			}

			if ( recoverable.includes( code ) ) {
				this.recoverFromError( code, result.errors[ 0 ].html );
				return;
			}

			this.showError( code, result.errors[ 0 ].html );
		},

		setStatus: function ( s ) {
			const $statusLine = this.$div.find( '.mwe-upwiz-file-status-line' );
			if ( typeof s === 'object' ) {
				$statusLine.html( s );
			} else {
				$statusLine.text( s );
			}
			$statusLine.show();
		},

		// TODO: De-duplicate with code form mw.UploadWizardUploadInterface.js
		showIndicator: function ( status ) {
			const progress = status === 'progress';
			this.$spinner.toggle( progress );
			this.statusMessage.toggle( status && !progress ).setType( status );
			this.$indicator.toggleClass( 'mwe-upwiz-file-indicator-visible', !!status );
		},

		setVisibleTitle: function ( s ) {
			$( this.$submittingDiv )
				.find( '.mwe-upwiz-visible-file-filename-text' )
				.text( s );
		}
	};
	OO.mixinClass( mw.UploadWizardDetails, OO.EventEmitter );

}( mw.uploadWizard ) );
