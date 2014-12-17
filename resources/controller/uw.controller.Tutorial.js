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

( function ( mw, uw, $, oo ) {
	var TP;

	function Tutorial( api ) {
		var tutorial = this;

		this.api = api;

		uw.controller.Step.call(
			this,
			new uw.ui.Tutorial()
				.on( 'skip-tutorial-click', function ( skipped ) {
					if ( skipped ) {
						( new mw.UploadWizardTutorialEvent( 'skip-check' ) ).dispatch();
					} else {
						( new mw.UploadWizardTutorialEvent( 'skip-uncheck' ) ).dispatch();
					}
				} )

				.on( 'helpdesk-click', function () {
					( new mw.UploadWizardTutorialEvent( 'helpdesk-click' ) ).dispatch();
				} )

				.on( 'next-step', function () {
					( new mw.UploadWizardTutorialEvent( 'continue' ) ).dispatch();

					// if the skip checkbox is checked, set the skip user preference
					if ( $( '#mwe-upwiz-skip' ).is( ':checked' ) ) {
						$( '#mwe-upwiz-skip' ).tipsy( 'hide' );
						tutorial.setSkipPreference();
					}

					tutorial.emit( 'next-step' );
				} )
		);
	}

	oo.inheritClass( Tutorial, uw.controller.Step );

	TP = Tutorial.prototype;

	/**
	 * Set the skip tutorial user preference via the options API
	 */
	TP.setSkipPreference = function () {
		var api = this.api,
			isComplete = false,
			allowCloseWindow = mw.confirmCloseWindow( {
				message: function () { return mw.message( 'mwe-upwiz-prevent-close-wait' ).text(); },
				test: function () { return !isComplete; }
			} );

		api.postWithToken( 'options', {
			action: 'options',
			change: 'upwiz_skiptutorial=1'
		} ).done( function () {
			isComplete = true;
			allowCloseWindow();
			return true;
		} ).fail( function ( code, err ) {
			mw.notify( err.textStatus );
		} );
	};

	uw.controller.Tutorial = Tutorial;
}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
