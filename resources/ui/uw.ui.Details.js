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

( function ( mw, $, ui, oo ) {
	var DP;

	/**
	 * Represents the UI for the wizard's Details step.
	 * @class uw.ui.Details
	 * @extends uw.ui.Step
	 * @constructor
	 */
	function Details() {
		var details = this;

		function startDetails() {
			var isPopupOpen = false;

			$( '.categoryInput' ).each( function () {
				if ( $( this ).data( 'popupOpen' ) === true ) {
					isPopupOpen = true;
					$( this ).bind( 'popupClose', startDetails );
				}
			});

			if ( isPopupOpen ) {
				return;
			}

			$( '.mwe-upwiz-hint' ).each( function () { $( this ).tipsy( 'hide' ); } ); // close tipsy help balloons

			details.emit( 'start-details' );
		}

		ui.Step.call(
			this,
			$( '#mwe-upwiz-stepdiv-details' ),
			$( '#mwe-upwiz-step-details' )
		);

		this.$nextSomeFailed = this.$div
			.find( '.mwe-upwiz-file-next-some-failed' )
			.hide();

		this.$nextAllFailed = this.$div
			.find( '.mwe-upwiz-file-next-all-failed' )
			.hide();

		this.$nextButton = this.$div
			.find( '.mwe-upwiz-start-next .mwe-upwiz-button-next' )
			.click( startDetails );

		this.$nextButtonDespiteFailures = this.$div
			.find( '.mwe-upwiz-buttons .mwe-upwiz-button-next-despite-failures' )
			.click( function () {
				details.emit( 'finalize-details-after-removal' );
			} );

		this.$retryButton = this.$div
			.find( '.mwe-upwiz-buttons .mwe-upwiz-button-retry' )
			.click( startDetails );
	}

	oo.inheritClass( Details, ui.Step );

	DP = Details.prototype;

	/**
	 * Empty out all upload information.
	 */
	DP.empty = function () {
		// reset buttons on the details page
		this.$div.find( '.mwe-upwiz-file-next-some-failed' ).hide();
		this.$div.find( '.mwe-upwiz-file-next-all-failed' ).hide();
		this.$div.find( '.mwe-upwiz-start-next' ).show();
	};

	/**
	 * Hide buttons for moving to the next step.
	 */
	DP.hideEndButtons = function () {
		this.$div
			.find( '.mwe-upwiz-buttons .mwe-upwiz-file-endchoice' )
			.hide();
	};

	ui.Details = Details;
}( mediaWiki, jQuery, mediaWiki.uploadWizard.ui, OO ) );
