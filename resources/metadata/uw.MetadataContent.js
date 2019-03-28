( function ( uw ) {

	'use strict';

	/**
	 * @constructor
	 * @param {mw.UploadWizardUpload} upload
	 * @param {mw.mediaInfo.statements.DepictsWidget} depicts
	 * @param {Object} [config] Configuration options
	 */
	uw.MetadataContent = function UWMetadataContent( upload, depicts, config ) {
		var $titleDiv = $( '<h2>' )
				.addClass( 'mwe-upwiz-metadata-content-caption' )
				.text( upload.details.getThumbnailCaption() ),
			$filenameDiv = $( '<p>' )
				.addClass( 'mwe-upwiz-metadata-content-filename' )
				.text( upload.details.getTitle().getMain() ),
			$thumbnailDiv = $( '<div>' )
				.addClass( 'mwe-upwiz-metadata-content-thumbnail' ),
			$depictsTitle = $( '<h3>' )
				.addClass( 'mwe-upwiz-metadata-content-depicts-title' )
				.text( mw.message( 'mwe-upwiz-depicts-title' ).text() );

		uw.MetadataContent.parent.call( this, $.extend( { classes: [ 'mwe-upwiz-metadata-content' ] }, config ) );

		upload.getThumbnail( 625 ).done( function ( thumb ) {
			mw.UploadWizard.placeThumbnail( $thumbnailDiv, thumb );
		} );

		this.$element.append(
			$titleDiv,
			$filenameDiv,
			$thumbnailDiv,
			$depictsTitle,
			depicts.$element
		);
	};
	OO.inheritClass( uw.MetadataContent, OO.ui.Widget );

}( mw.uploadWizard ) );
