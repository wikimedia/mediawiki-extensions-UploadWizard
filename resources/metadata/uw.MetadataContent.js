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
			propertiesInfo = mw.config.get( 'wbmiProperties', {} ),
			dataTypeMap = mw.config.get( 'wbDataTypes', {} );

		uw.MetadataContent.parent.call( this, $.extend( { classes: [ 'mwe-upwiz-metadata-content' ] }, config ) );

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

		if ( mw.config.get( 'wbmiEnableOtherStatements', false ) ) {
			addPropertyWidget = new AddPropertyWidget( { propertyIds: propertyIds } );
			addPropertyWidget.on( 'choose', function ( item, data ) {
				var statement;
				propertiesInfo[ data.id ] = dataTypeMap[ data.datatype ].dataValueType;
				statement = new StatementWidget( {
					entityId: entityId,
					propertyId: data.id,
					properties: propertiesInfo,
					isDefaultProperty: false,
					helpUrls: mw.config.get( 'wbmiHelpUrls' ) || {}
				} );
				self.emit( 'statementSectionAdded', statement );
				propertyIds.push( data.id );
				statements.push( statement );
				addPropertyWidget.$element.before( statement.$element );
			} );
			this.$element.append( addPropertyWidget.$element );
		}
	};
	OO.inheritClass( uw.MetadataContent, OO.ui.Widget );

}( mw.uploadWizard ) );
