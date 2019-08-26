( function ( uw ) {
	'use strict';

	/**
	 * @constructor
	 * @param {mw.UploadWizardUpload} upload
	 * @param {Object} [config] Configuration options
	 */
	uw.MetadataContent = function UWMetadataContent( upload, config ) {
		var $titleDiv,
			$filenameDiv,
			$thumbnailDiv,
			self = this;

		uw.MetadataContent.parent.call(
			this,
			$.extend( { classes: [ 'mwe-upwiz-metadata-content' ] }, config )
		);

		// Set up widget data
		this.upload = upload;
		this.entityId = undefined;
		this.propertyIds = [];
		this.statementWidgets = [];
		this.properties = this.getWikibaseProperties();
		this.dataTypeMap = mw.config.get( 'wbDataTypes', {} );

		// Build the UI
		$titleDiv = $( '<h2>' )
			.addClass( 'mwe-upwiz-metadata-content-caption' )
			.text( upload.details.getThumbnailCaption() );
		$filenameDiv = $( '<p>' )
			.addClass( 'mwe-upwiz-metadata-content-filename' )
			.text( upload.details.getTitle().getMain() );
		$thumbnailDiv = $( '<div>' )
			.addClass( 'mwe-upwiz-metadata-content-thumbnail' );

		// Load thumbnail and append elements to page once ready
		upload.getThumbnail( 630, 360 ).then( function ( thumb ) {
			mw.UploadWizard.placeThumbnail( $thumbnailDiv, thumb );
			self.$element.prepend(
				$titleDiv,
				$filenameDiv,
				$thumbnailDiv
			);
		} );

		// Call the setup method and append statementWidgets once ready
		self.setup().then( function () {
			self.statementWidgets.forEach( function ( sw ) {
				self.$element.append( sw.$element );
			} );
			self.createAddPropertyWidgetIfNecessary();
		} );
	};

	OO.inheritClass( uw.MetadataContent, OO.ui.Widget );

	/**
	 * Setup method. Fetch the mediainfo ID of the relevant file and create
	 * widgets for default statements. If default statements are added,
	 * a "change" event is emitted so that the user can immediately publish
	 * using the suggested data.
	 *
	 * @return {jQuery.Promise}
	 * @fires change
	 */
	uw.MetadataContent.prototype.setup = function () {
		var self = this;

		return this.upload.details.getMediaInfoEntityId().then( function ( entityId ) {
			self.entityId = entityId;

			// Create a statement widget for each default property
			Object.keys( self.properties ).forEach( function ( propertyId ) {
				var statementWidget = self.createStatementWidget( propertyId, true ),
					defaultData = self.getDefaultDataForProperty( propertyId );

				// pre-populate statements with data if necessary (campaigns only)
				if ( defaultData ) {
					defaultData.forEach( function ( statement ) {
						var mainSnak = statement.getClaim().getMainSnak(),
							itemWidget;

						if ( mainSnak.getPropertyId() === propertyId ) {
							itemWidget = statementWidget.createItem( mainSnak.getValue() );
							itemWidget.setData( statement );
							statementWidget.insertItem( itemWidget );
							// treat pre-populated statement the same as a user-provided one
							// and emit a "change" event to enable publication
							self.emit( 'change' );
						}
					} );
				}
			} );
		} );
	};

	/**
	 * @return {Object} properties map
	 */
	uw.MetadataContent.prototype.getWikibaseProperties = function () {
		var properties = mw.config.get( 'wbmiProperties' ) || {};

		if ( mw.UploadWizard.config.defaults.statements ) {
			mw.UploadWizard.config.defaults.statements.forEach( function ( statement ) {
				// Only entity ids are currently supported
				if ( statement.dataType === 'wikibase-entityid' && statement.propertyId ) {
					properties[ statement.propertyId ] = statement.dataType;
				}
			} );
		}

		return properties;
	};

	/**
	 * @param {string} propertyId
	 * @return {wikibase.datamodel.Statement[]|null}
	 */
	uw.MetadataContent.prototype.getDefaultDataForProperty = function ( propertyId ) {
		var defaultStatements = mw.UploadWizard.config.defaults.statements,
			guidGenerator = new wikibase.utilities.ClaimGuidGenerator( this.entityId ),
			defaultData;

		if ( !defaultStatements ) {
			return null;
		}

		defaultData = defaultStatements.filter( function ( statement ) {
			return statement.propertyId === propertyId && statement.values;
		} )[ 0 ];

		if ( !defaultData || !defaultData.values ) {
			return null;
		}

		return defaultData.values.map( function ( itemId ) {
			return new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						propertyId,
						new wikibase.datamodel.EntityId( itemId )
					),
					null,
					guidGenerator.newGuid()
				)
			);
		} );
	};

	/**
	 * Creates and sets up the AddPropertyWidget if other statements are enabled.
	 */
	uw.MetadataContent.prototype.createAddPropertyWidgetIfNecessary = function () {
		var AddPropertyWidget;
		if ( mw.UploadWizard.config.wikibase.nonDefaultStatements !== false ) {
			AddPropertyWidget = require( 'wikibase.mediainfo.statements' ).AddPropertyWidget;
			this.addPropertyWidget = new AddPropertyWidget( { propertyIds: this.propertyIds } );
			this.$element.append( this.addPropertyWidget.$element );
			this.addPropertyWidget.connect( this, { choose: 'onPropertyAdded' } );
		}
	};

	/**
	 * Creates and returns a new StatementWidget, with appropriate event handlers
	 * attached. Also stashes the statement's property ID.
	 *
	 * @param {string} propertyId P123, etc.
	 * @param {bool} [isDefault] Whether or not this is a default property (non-removable)
	 * @return {Object} StatementWidget
	 */
	uw.MetadataContent.prototype.createStatementWidget = function ( propertyId, isDefault ) {
		var StatementWidget = require( 'wikibase.mediainfo.statements' ).StatementWidget,
			widget;

		// Add the propertyID to the collection if it is not present already
		if ( this.propertyIds.indexOf( propertyId ) === -1 ) {
			this.propertyIds.push( propertyId );
		}

		widget = new StatementWidget( {
			editing: true,
			entityId: this.entityId,
			propertyId: propertyId,
			properties: this.properties,
			isDefaultProperty: isDefault || false,
			helpUrls: mw.config.get( 'wbmiHelpUrls' ) || {}
		} );

		widget.connect( this, { widgetRemoved: 'onStatementWidgetRemoved' } );
		widget.connect( this, { change: 'checkForChanges' } );

		this.statementWidgets.push( widget );
		return widget;
	};

	/**
	 * Handles the selection by user of a new property to add to page. Creates a
	 * new appropriate StatementWidget, updates internal datatype map, and
	 * appends widget to DOM.
	 *
	 * @param {Object} item
	 * @param {Object} data
	 */
	uw.MetadataContent.prototype.onPropertyAdded = function ( item, data ) {
		var propertyId = data.id,
			propertyDataType = data.datatype,
			statementWidget;

		this.properties[ propertyId ] = this.dataTypeMap[ propertyDataType ].dataValueType;
		statementWidget = this.createStatementWidget( propertyId, false );
		this.addPropertyWidget.$element.before( statementWidget.$element );
		// emit an event here?
	};

	/**
	 * Handles the removal of non-default StatementWidgets by the user.
	 * Also cleans up the propertyID and statementWidget arrays.
	 *
	 * @param {string} propertyId
	 * @throws {Error} Raises error if any item to remove is not found
	 */
	uw.MetadataContent.prototype.onStatementWidgetRemoved = function ( propertyId ) {
		var removeFromArray,
			removedWidget;

		// This function mutates the original array in-place rather than
		// returning a new one
		removeFromArray = function ( itemToRemove, array ) {
			var removedIndex;

			if ( array.indexOf( itemToRemove ) === -1 ) {
				throw new Error( 'item' + itemToRemove + ' not found in array' );
			}

			removedIndex = array.indexOf( itemToRemove );
			array.splice( removedIndex, 1 );
		};

		removedWidget = this.statementWidgets.filter( function ( sw ) {
			return sw.propertyId === propertyId;
		} )[ 0 ];

		removeFromArray( propertyId, this.propertyIds );
		removeFromArray( removedWidget, this.statementWidgets );

		removedWidget.$element.remove();
		this.addPropertyWidget.onStatementPanelRemoved( propertyId );
	};

	/**
	 * Check all the statement widgets associated with the given file;
	 * Returns true if any changes or removals are detected from any
	 * StatementWidget;
	 *
	 * @fires change
	 */
	uw.MetadataContent.prototype.checkForChanges = function () {
		var hasChanges;

		hasChanges = this.statementWidgets.some( function ( sw ) {
			var changes = sw.getChanges(),
				removals = sw.getRemovals();

			return changes.length > 0 || removals.length > 0;
		} );

		if ( hasChanges ) {
			this.emit( 'change' );
		}
	};

	uw.MetadataContent.prototype.getStatements = function () {
		return this.statementWidgets;
	};

}( mw.uploadWizard ) );
