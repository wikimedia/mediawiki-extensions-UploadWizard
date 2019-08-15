( function ( uw ) {

	'use strict';

	/**
	 * @constructor
	 * @param {mw.UploadWizardUpload} upload
	 * @param {StatementWidget[]} statements
	 * @param {Object} [config] Configuration options
	 */
	uw.MetadataContent = function UWMetadataContent( upload, statements, config ) {
		var $titleDiv = $( '<h2>' )
				.addClass( 'mwe-upwiz-metadata-content-caption' )
				.text( upload.details.getThumbnailCaption() ),
			$filenameDiv = $( '<p>' )
				.addClass( 'mwe-upwiz-metadata-content-filename' )
				.text( upload.details.getTitle().getMain() ),
			$thumbnailDiv = $( '<div>' )
				.addClass( 'mwe-upwiz-metadata-content-thumbnail' ),
			StatementWidget = require( 'wikibase.mediainfo.statements' ).StatementWidget,
			AddPropertyWidget = require( 'wikibase.mediainfo.statements' ).AddPropertyWidget,
			addPropertyWidget,
			propertyIds = [],
			entityId,
			self = this,
			// clone wbmiProperties
			propertiesInfo = JSON.parse(
				JSON.stringify( mw.config.get( 'wbmiProperties', {} ) )
			),
			dataTypeMap = mw.config.get( 'wbDataTypes', {} ),
			// handle widget removal
			onStatementWidgetRemoved = function ( propertyId ) {
				var removed,
					removedIndex;

				// Find the StatementWidget that needs to be removed
				removed = statements.filter( function ( item ) {
					return item.propertyId === propertyId;
				} )[ 0 ];

				removedIndex = statements.indexOf( removed );

				// mutate the the statements array to remove the widget
				statements.splice( removedIndex, 1 );

				// remove the widget from the DOM
				removed.$element.remove();

				// ensure that the AddPropertyWidget can restore it if necessary
				addPropertyWidget.onStatementPanelRemoved( propertyId );
			};

		uw.MetadataContent.parent.call(
			this,
			$.extend( { classes: [ 'mwe-upwiz-metadata-content' ] }, config )
		);

		// get a thumbnail that doesn't exceed a width of 630px, or a height of 360px
		upload.getThumbnail( 630, 360 ).done( function ( thumb ) {
			mw.UploadWizard.placeThumbnail( $thumbnailDiv, thumb );
		} );

		this.$element.append(
			$titleDiv,
			$filenameDiv,
			$thumbnailDiv,
			statements.map( function ( statement ) {
				propertyIds.push( statement.propertyId );
				entityId = statement.entityId;
				return statement.$element;
			} )
		);

		if (
			mw.config.get( 'wbmiEnableOtherStatements', false ) &&
			mw.UploadWizard.config.wikibase.nonDefaultStatements !== false
		) {
			addPropertyWidget = new AddPropertyWidget( { propertyIds: propertyIds } );
			addPropertyWidget.on( 'choose', function ( item, data ) {
				var statement;

				propertiesInfo[ data.id ] = dataTypeMap[ data.datatype ].dataValueType;

				statement = new StatementWidget( {
					editing: true,
					entityId: entityId,
					propertyId: data.id,
					properties: propertiesInfo,
					isDefaultProperty: false,
					helpUrls: mw.config.get( 'wbmiHelpUrls' ) || {}
				} );

				self.emit( 'statementSectionAdded', statement );
				statement.on( 'widgetRemoved', onStatementWidgetRemoved );

				propertyIds.push( data.id );
				statements.push( statement );

				addPropertyWidget.$element.before( statement.$element );
			} );

			this.$element.append( addPropertyWidget.$element );
		}
	};
	OO.inheritClass( uw.MetadataContent, OO.ui.Widget );

}( mw.uploadWizard ) );
