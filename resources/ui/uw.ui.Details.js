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

( function ( mw, $, uw, OO ) {
	/**
	 * Represents the UI for the wizard's Details step.
	 * @class uw.ui.Details
	 * @extends uw.ui.Step
	 * @constructor
	 */
	uw.ui.Details = function UWUIDetails() {
		var details = this;

		function startDetails() {
			// close tipsy help balloons
			$( '.mwe-upwiz-hint' ).each( function () {
				$( this ).tipsy( 'hide' );
			} );

			details.emit( 'start-details' );
		}

		uw.ui.Step.call(
			this,
			$( '#mwe-upwiz-stepdiv-details' ),
			$( '#mwe-upwiz-step-details' )
		);

		this.nextButton = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-next-details' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', startDetails );

		this.$div.find( '.mwe-upwiz-start-next' ).append( this.nextButton.$element );

		this.nextButtonDespiteFailures = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-next-file-despite-failures' ).text(),
			flags: [ 'progressive' ]
		} ).on( 'click', function () {
			details.emit( 'finalize-details-after-removal' );
		} );

		this.retryButtonSomeFailed = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-file-retry' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', startDetails );

		this.$div.find( '.mwe-upwiz-file-next-some-failed' ).append(
			new OO.ui.HorizontalLayout( {
				items: [
					new OO.ui.LabelWidget( {
						label: mw.message( 'mwe-upwiz-file-some-failed' ).text()
					} ),
					this.nextButtonDespiteFailures,
					this.retryButtonSomeFailed
				]
			} ).$element
		);

		this.retryButtonAllFailed = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-file-retry' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', startDetails );

		this.$div.find( '.mwe-upwiz-file-next-all-failed' ).append(
			new OO.ui.HorizontalLayout( {
				items: [
					new OO.ui.LabelWidget( {
						label: mw.message( 'mwe-upwiz-file-all-failed' ).text()
					} ),
					this.retryButtonAllFailed
				]
			} ).$element
		);

		this.$errorCount = this.$div.find( '#mwe-upwiz-details-error-count' );
	};

	OO.inheritClass( uw.ui.Details, uw.ui.Step );

	/**
	 * Empty out all upload information.
	 */
	uw.ui.Details.prototype.empty = function () {
		// reset buttons on the details page
		this.$div.find( '.mwe-upwiz-file-next-some-failed' ).hide();
		this.$div.find( '.mwe-upwiz-file-next-all-failed' ).hide();
		this.$div.find( '.mwe-upwiz-start-next' ).show();
	};

	/**
	 * Hide buttons for moving to the next step.
	 */
	uw.ui.Details.prototype.hideEndButtons = function () {
		this.$div
			.find( '.mwe-upwiz-buttons .mwe-upwiz-file-endchoice' )
			.hide();
	};

	/**
	 * Disable edits to the details.
	 */
	uw.ui.Details.prototype.disableEdits = function () {
		this.$div
			.find( '.mwe-upwiz-data' )
			.morphCrossfade( '.mwe-upwiz-submitting' );
	};

	/**
	 * Hide validation errors.
	 */
	uw.ui.Details.prototype.hideErrors = function () {
		this.$div
			.find( 'label.mwe-error' )
			.hide().empty();

		this.$div
			.find( 'input.mwe-error' )
			.removeClass( 'mwe-error' );
	};

	/**
	 * Show errors in the form.
	 * The details page can be vertically long so sometimes it is not obvious there are errors above. This counts them and puts the count
	 * right next to the submit button, so it should be obvious to the user they need to fix things.
	 * This is a bit of a hack. The validator library actually already has a way to count errors but some errors are generated
	 * outside of that library. So we are going to just look for any visible inputs in an error state.
	 * This method also opens up "more info" if the form has errors.
	 */
	uw.ui.Details.prototype.showErrors = function () {
		var $errorElements = this.$div
				.find( '.mwe-error:not(:empty):not(#mwe-upwiz-details-error-count), input.mwe-validator-error, textarea.mwe-validator-error' ),
			errorCount = $errorElements.length;

		// Open "more info" if that part of the form has errors
		$errorElements.each( function () {
			if ( $( this ).parents( '.mwe-more-details' ).length === 1 ) {
				var moreInfo = $( this ).parents( '.detailsForm' ).find( '.mwe-upwiz-details-more-options a' );
				if ( !moreInfo.hasClass( 'mwe-upwiz-toggler-open' ) ) {
					moreInfo.click();
				}
			}
		} );

		if ( errorCount > 0 ) {
			this.$errorCount.msg( 'mwe-upwiz-details-error-count', errorCount, this.uploads.length );
			// Scroll to the first error
			$( 'html, body' ).animate( { scrollTop: $( $errorElements[0] ).offset().top - 50 }, 'slow' );
		} else {
			this.$errorCount.empty();
		}
	};

}( mediaWiki, jQuery, mediaWiki.uploadWizard, OO ) );
