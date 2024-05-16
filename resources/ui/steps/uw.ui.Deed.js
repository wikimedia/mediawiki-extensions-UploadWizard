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

( function ( uw ) {
	/**
	 * Represents the UI for the wizard's Deed step.
	 *
	 * @class
	 * @extends uw.ui.Step
	 */
	uw.ui.Deed = function UWUIDeed() {
		uw.ui.Step.call(
			this,
			'deeds'
		);

		this.addPreviousButton();
		this.addNextButton();
	};

	OO.inheritClass( uw.ui.Deed, uw.ui.Step );

	uw.ui.Deed.prototype.load = function ( uploads ) {
		var self = this;

		uw.ui.Step.prototype.load.call( this, uploads );

		this.$deedsContainer = $( '<div>' ).attr( 'id', 'mwe-upwiz-deeds' );
		this.$thumbsContainer = $( '<div>' ).attr( 'id', 'mwe-upwiz-deeds-thumbnails' );

		this.$div.prepend(
			this.$thumbsContainer.addClass( 'ui-helper-clearfix' ),
			$( '<div>' )
				.attr( 'id', 'mwe-upwiz-deeds-intro' )
				.msg( 'mwe-upwiz-deeds-macro-prompt-text', uploads.length, mw.user ),
			this.$deedsContainer.addClass( 'ui-helper-clearfix' )
		);

		this.nextButtonPromise.done( function () {
			// hide "next" button, controller will only show it once license has
			// been selected
			self.nextButton.$element.hide();
		} );
	};

	uw.ui.Deed.prototype.clearForm = function () {
		this.$deedsContainer.empty();
		this.$thumbsContainer.empty();
	};

	/**
	 * @param {OO.ui.RadioSelectWidget} multiDeedRadio
	 */
	uw.ui.Deed.prototype.showMultiDeedRadio = function ( multiDeedRadio ) {
		this.$div.prepend( multiDeedRadio.$element );
	};

	/**
	 * @param {mw.UploadWizardDeedChooser} deedChooser
	 */
	uw.ui.Deed.prototype.showCommonForm = function ( deedChooser ) {
		var self = this;

		this.clearForm();

		this.$deedsContainer.append( deedChooser.$element );
		deedChooser.onLayoutReady();

		deedChooser.uploads.forEach( function ( upload ) {
			var $element = $( '<div>' ).addClass( 'mwe-upwiz-thumbnail' );

			// Add previews and details to the DOM
			if ( !upload.file.fromURL ) {
				// This must match the CSS dimensions of .mwe-upwiz-thumbnail
				upload.getThumbnail( 120, 120 ).done( function ( thumb ) {
					mw.UploadWizard.placeThumbnail( $element, thumb );
				} );

				self.$thumbsContainer.append( $element );
			}
		} );
	};

	/**
	 * @param {mw.UploadWizardDeedChooser[]} deedChoosers
	 */
	uw.ui.Deed.prototype.showIndividualForm = function ( deedChoosers ) {
		var self = this;

		this.clearForm();

		deedChoosers.forEach( function ( deedChooser ) {
			deedChooser.uploads.forEach( function ( upload ) {
				var $thumbContainer = $( '<div>' ).addClass( 'mwe-upwiz-deeds-individual-thumbnail' ),
					$element = $( '<div>' ).addClass( 'mwe-upwiz-thumbnail' );

				// Add previews and details to the DOM
				if ( !upload.file.fromURL ) {
					upload.getThumbnail( 150, 150 ).done( function ( thumb ) {
						mw.UploadWizard.placeThumbnail( $element, thumb );
					} );

					$thumbContainer.append( $element );
				}

				self.$deedsContainer.append(
					$( '<div>' )
						.addClass( 'mwe-upwiz-deeds-individual' )
						.append(
							$thumbContainer,
							deedChooser.$element
						)
				);
				deedChooser.onLayoutReady();
			} );
		} );
	};

	/**
	 * @param {boolean} visible
	 */
	uw.ui.Deed.prototype.toggleNext = function ( visible ) {
		if ( visible ) {
			this.nextButton.$element.show();
		} else {
			this.nextButton.$element.hide();
		}
	};
}( mw.uploadWizard ) );
