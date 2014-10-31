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

( function ( mw, $, uw, oo ) {
	var TP;

	/**
	 * Represents the UI for the wizard's Tutorial step.
	 * @class uw.ui.Tutorial
	 * @extends uw.ui.Step
	 * @constructor
	 */
	function Tutorial() {
		var ui = this;

		uw.ui.Step.call(
			this,
			$( '#mwe-upwiz-stepdiv-tutorial' ),
			$( '#mwe-upwiz-step-tutorial' )
		);

		// Event handlers for EventLogging-type things
		// Skip tutorial checkbox click
		$( '#mwe-upwiz-skip' )
			// Add a friendly "Here's how to get it back" tooltip for users who check the "Skip next time" checkbox
			.tipsy( {
				title: function () {
					return mw.message(
						'mwe-upwiz-tooltip-skiptutorial',
						mw.config.get( 'wgServer' ) + mw.util.getUrl( 'Special:Preferences' ) + '#mw-prefsection-uploads',
						mw.message( 'prefs-uploads' ).escaped(),
						mw.message( 'prefs-upwiz-interface' ).escaped()
					).parse();
				},
				delayIn: 0,
				html: true,
				trigger: 'manual'
			} )

			.click( function () {
				var $this = $( this );

				ui.emit( 'skip-tutorial-click', $this.prop( 'checked' ) );

				if ( $this.prop( 'checked' ) ) {
					$this.tipsy( 'show' );
				} else {
					$this.tipsy( 'hide' );
				}
			} );

		// Helpdesk link click
		$( '#mwe-upwiz-tutorial-helpdesk' ).click( function () {
			ui.emit( 'helpdesk-click' );
		} );

		// handler for next button
		$( '#mwe-upwiz-stepdiv-tutorial .mwe-upwiz-button-next').click( function () {
			ui.emit( 'next-step' );
		} );
	}

	oo.inheritClass( Tutorial, uw.ui.Step );

	TP = Tutorial.prototype;

	uw.ui.Tutorial = Tutorial;
}( mediaWiki, jQuery, mediaWiki.uploadWizard, OO ) );
