/*
 * This file is part of the MediaWiki extension UploadWizard.
 *
 * UploadWizard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * UploadWizard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with UploadWizard.  If not, see <http://www.gnu.org/licenses/>.
 */

( function ( $, ui ) {
	var DPP;

	/**
	 * Represents the UI for a thumbnail in the Deed step.
	 * @class uw.ui.DeedPreview
	 * @constructor
	 * @param {mw.UploadWizardUpload} upload
	 * @param {Object} config The UW config object.
	 */
	function DeedPreview( upload, config ) {
		this.$thumbnailDiv = $( '<div>' ).addClass( 'mwe-upwiz-thumbnail' );
		upload.setThumbnail(
			this.$thumbnailDiv,
			config.thumbnailWidth,
			config.thumbnailMaxHeight,
			true
		);
		$( '#mwe-upwiz-deeds-thumbnails' ).append( this.$thumbnailDiv );
	}

	DPP = DeedPreview.prototype;

	DPP.remove = function () {
		if ( this.$thumbnailDiv ) {
			this.$thumbnailDiv.remove();
		}
	};

	ui.DeedPreview = DeedPreview;
}( jQuery, mediaWiki.uploadWizard.ui ) );
