( function ( uw ) {

	'use strict';

	/**
	 * @constructor
	 * @param {mw.UploadWizardUpload} upload
	 * @param {Object} [config] Configuration options
	 */
	uw.MetadataPage = function UWMetadataPage( upload, config ) {
		var self = this;

		uw.MetadataPage.parent.call( this, upload.getFilename(), config );

		this.upload = upload;
		this.$thumbnailDiv = $( '<div>' ).addClass( 'mwe-upwiz-metadata-page-thumbnail' );
		this.upload.getThumbnail( 30, 30 ).done( function ( thumb ) {
			mw.UploadWizard.placeThumbnail( self.$thumbnailDiv, thumb );
		} );
	};
	OO.inheritClass( uw.MetadataPage, OO.ui.PageLayout );

	/**
	 * @inheritdoc
	 */
	uw.MetadataPage.prototype.setupOutlineItem = function ( outlineItem ) {
		var filename = this.upload.details ? this.upload.details.getTitle().getMain() : this.upload.getFilename();

		uw.MetadataPage.parent.prototype.setupOutlineItem.call( this, outlineItem );

		this.outlineItem.$element.addClass( 'mwe-upwiz-metadata-page' );
		this.outlineItem.setLabel(
			this.$thumbnailDiv.append( $( '<span>' ).addClass( 'mwe-upwiz-thumbnail-filename' ).text( filename ) )
		);
	};

}( mw.uploadWizard ) );
