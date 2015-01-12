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
	 * Represents the UI for the wizard's Deed step.
	 * @class uw.ui.Deed
	 * @extends uw.ui.Step
	 * @constructor
	 */
	function Deed() {
		var deed = this;

		ui.Step.call(
			this,
			$( '#mwe-upwiz-stepdiv-deeds' ),
			$( '#mwe-upwiz-step-deeds' )
		);

		this.$div.find( '.mwe-upwiz-button-next' ).click( function () {
			$( '.mwe-upwiz-hint' ).each( function () {
				// Close tipsy help balloons
				$( this ).tipsy( 'hide' );
			} );

			deed.emit( 'next-step' );
		} );
	}

	oo.inheritClass( Deed, ui.Step );

	DP = Deed.prototype;

	ui.Deed = Deed;
}( mediaWiki, jQuery, mediaWiki.uploadWizard.ui, OO ) );
