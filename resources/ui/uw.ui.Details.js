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
		ui.Step.call(
			this,
			$( '#mwe-upwiz-stepdiv-details' ),
			$( '#mwe-upwiz-step-details' )
		);
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

	ui.Details = Details;
}( mediaWiki, jQuery, mediaWiki.uploadWizard.ui, OO ) );
