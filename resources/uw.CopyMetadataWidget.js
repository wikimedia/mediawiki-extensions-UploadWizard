( function ( uw ) {

	/**
	 * Metadata copier in UploadWizard's "Details" step form.
	 *
	 * @extends OO.ui.Widget
	 * @class
	 * @param {Object} [config] Configuration options
	 * @param {mw.UploadWizardUpload} config.copyFrom Upload to copy the details from
	 * @param {mw.UploadWizardUpload[]} config.copyTo Uploads to copy the details to
	 * @param {mw.UploadWizardUpload} config.captionsAvailable True if captions are available
	 */
	uw.CopyMetadataWidget = function UWCopyMetadataWidget( config ) {
		const metadataTypes = uw.CopyMetadataWidget.static.copyMetadataTypes,
			checkboxes = [],
			propertyCopyLabels = mw.config.get( 'upwizPropertyCopyLabels' ) || {},
			statementCheckboxes = {};

		uw.CopyMetadataWidget.super.call( this );

		this.copyFrom = config.copyFrom;
		this.copyTo = config.copyTo;
		this.savedSerializedData = [];

		metadataTypes.statements.properties = this.copyFrom.details.getStatementProperties();

		for ( const metadataType in metadataTypes ) {
			if ( metadataType !== 'statements' ) {
				const defaultStatus = metadataTypes[ metadataType ];
				// The following messages are used here:
				// * mwe-upwiz-copy-title-label
				// * mwe-upwiz-copy-caption-label
				// * mwe-upwiz-copy-description-label
				// * mwe-upwiz-copy-date-label
				// * mwe-upwiz-copy-categories-label
				// * mwe-upwiz-copy-location-label
				// * mwe-upwiz-copy-other-label
				const copyMetadataMsg = mw.message( 'mwe-upwiz-copy-' + metadataType + '-label' ).text();

				if ( metadataType === 'caption' && !config.captionsAvailable ) {
					// do nothing - we don't want an option to copy captions if captions turned off
				} else {
					checkboxes.push( new OO.ui.CheckboxMultioptionWidget( {
						data: metadataType,
						label: copyMetadataMsg,
						selected: defaultStatus
					} ) );
				}
			} else {
				metadataTypes.statements.properties.forEach( ( property ) => {
					statementCheckboxes[ property.id ] = new OO.ui.CheckboxMultioptionWidget( {
						data: 'statements.' + property.id,
						label: propertyCopyLabels[ property.id ] || property.id,
						selected: metadataTypes.statements.checked
					} );
					checkboxes.push( statementCheckboxes[ property.id ] );

					if ( !( property.id in propertyCopyLabels ) ) {
						// for statement inputs added by a campaign we probably don't have a defined label, so grab
						// the label from wikibase and add the checkbox once we have it
						this.copyFrom.details.getPropertyLabel( property.id ).then( ( label ) => {
							statementCheckboxes[ property.id ].setLabel( label );
						} );
					}
				} );
			}
		}

		this.$success = $( '<span>' ).addClass( 'mwe-upwiz-copy-metadata-success' );
		this.checkboxesWidget = new OO.ui.CheckboxMultiselectWidget( {
			items: checkboxes
		} );

		this.copyButton = new OO.ui.ButtonWidget( {
			label: $( '<span>' ).append(
				new OO.ui.IconWidget( { icon: 'copy' } ).$element,
				' ',
				mw.message( 'mwe-upwiz-copy-metadata-button-text' ).text()
			)
		} );
		this.undoButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-copy-metadata-button-undo' ).text()
		} );

		this.checkboxesWidget.connect( this, {
			select: 'onCheckboxesSelect'
		} );
		this.copyButton.connect( this, {
			click: 'onCopyClick'
		} );
		this.undoButton.connect( this, {
			click: 'onUndoClick'
		} );

		this.undoButton.toggle( false );
		this.$element.append(
			$( '<div>' )
				.addClass( 'mwe-upwiz-copy-metadata-subtitle' )
				.text( mw.message( 'mwe-upwiz-copy-metadata-subtitle' ).text() ),
			this.checkboxesWidget.$element,
			this.copyButton.$element,
			this.undoButton.$element,
			this.$success
		);
	};
	OO.inheritClass( uw.CopyMetadataWidget, OO.ui.Widget );

	/**
	 * Metadata which we can copy over to other details objects.
	 *
	 * Object with key: metadata name and value: boolean value indicating default checked status
	 *
	 * @property {Object}
	 * @static
	 */
	uw.CopyMetadataWidget.static.copyMetadataTypes = {
		title: true,
		caption: true,
		description: true,
		date: false,
		statements: { checked: true },
		categories: true,
		location: false,
		other: true
	};

	/**
	 * Checkbox multiselect widget select event handler.
	 *
	 * @private
	 */
	uw.CopyMetadataWidget.prototype.onCheckboxesSelect = function () {
		this.copyButton.setDisabled( this.checkboxesWidget.findSelectedItemsData().length === 0 );
	};

	/**
	 * Button click event handler.
	 *
	 * @private
	 */
	uw.CopyMetadataWidget.prototype.onCopyClick = function () {
		const metadataTypes = this.checkboxesWidget.findSelectedItemsData();
		this.copyMetadata( metadataTypes );

		this.undoButton.toggle( true );
		// FIXME: Use CSS transition
		// eslint-disable-next-line no-jquery/no-fade
		this.$success
			.text( mw.message( 'mwe-upwiz-copied-metadata' ).text() )
			.show()
			.fadeOut( 5000, 'linear' );
	};

	/**
	 * Button click event handler.
	 *
	 * @private
	 */
	uw.CopyMetadataWidget.prototype.onUndoClick = function () {
		this.restoreMetadata();

		this.undoButton.toggle( false );
		// FIXME: Use CSS transition
		// eslint-disable-next-line no-jquery/no-fade
		this.$success
			.text( mw.message( 'mwe-upwiz-undid-metadata' ).text() )
			.show()
			.fadeOut( 5000, 'linear' );
	};

	/**
	 * Copy metadata from the first upload to other uploads.
	 *
	 * @param {string[]} metadataTypes Types to copy, as defined in the copyMetadataTypes property
	 */
	uw.CopyMetadataWidget.prototype.copyMetadata = function ( metadataTypes ) {
		uw.CopyMetadataWidget.copyMetadataSerialized(
			metadataTypes,
			this.copyFrom.details.getSerialized(),
			this.copyTo.length,
			( i, sourceValue ) => {
				this.savedSerializedData[ i ] = this.copyTo[ i ].details.getSerialized();
				this.copyTo[ i ].details.setSerialized( sourceValue );
			} );
	};

	/**
	 * Copy metadata from the first upload to other uploads.
	 *
	 * @param {string[]} metadataTypes Types to copy, as defined in the copyMetadataTypes property
	 * @param {Object} serialized copyFrom.details.getSerialized
	 * @param {number} length copyTo.length
	 * @param {Function} callback callback(i, sourceValue)
	 */
	uw.CopyMetadataWidget.copyMetadataSerialized = function ( metadataTypes, serialized, length, callback ) {
		// Values to copy
		const sourceValue = {};
		// Checks for extra behaviors
		let copyingTitle = false,
			copyingOther = false;

		let titleZero;
		// Filter serialized data to only the types we want to copy
		metadataTypes.forEach( ( type ) => {
			const typeParts = type.split( '.' );
			if ( typeParts.length === 2 ) {
				if ( serialized[ typeParts[ 0 ] ][ typeParts[ 1 ] ] ) {
					if ( !sourceValue[ typeParts[ 0 ] ] ) {
						sourceValue[ typeParts[ 0 ] ] = {};
					}
					sourceValue[ typeParts[ 0 ] ][ typeParts[ 1 ] ] =
						serialized[ typeParts[ 0 ] ][ typeParts[ 1 ] ];
				}
			} else {
				sourceValue[ type ] = serialized[ type ];
			}
			copyingTitle = copyingTitle || type === 'title';
			copyingOther = copyingOther || type === 'other';
		} );

		if ( copyingOther ) {
			// Campaign fields are grouped with this, hmph
			sourceValue.campaigns = serialized.campaigns;
		}

		if ( copyingTitle ) {
			titleZero = sourceValue.title.title.trim();
			// Add number suffix to first title if no numbering present

			const matches = titleZero.match( /(\D+)(\d{1,3})([.)]\D*)?$/ );
			if ( matches === null ) {
				titleZero = titleZero + ' 01';
			}
		}

		// And apply
		for ( let i = 0; i < length; i++ ) {
			if ( copyingTitle ) {
				// Overwrite remaining title inputs with first title + increment of rightmost
				// number in the title. Note: We ignore numbers with more than three digits, because these
				// are more likely to be years ("Wikimania 2011 Celebration") or other non-sequence
				// numbers.
				sourceValue.title.title = titleZero.replace( /(\D+)(\d{1,3})(\D*)$/,
					( str, m1, m2, m3 ) => {
						const newstr = String( +m2 + i );
						return m1 + new Array( m2.length + 1 - newstr.length )
							.join( '0' ) + newstr + m3;
					}
				);
			}

			callback( i, sourceValue );
		}
	};

	/**
	 * Restore previously saved metadata that we backed up when copying.
	 */
	uw.CopyMetadataWidget.prototype.restoreMetadata = function () {
		const uploads = this.copyTo;

		for ( let i = 0; i < uploads.length; i++ ) {
			uploads[ i ].details.setSerialized( this.savedSerializedData[ i ] );
		}
	};

}( mw.uploadWizard ) );
