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
		);

		this.stepName = 'tutorial';
	}

	oo.inheritClass( Tutorial, uw.controller.Step );

	TP = Tutorial.prototype;

	/**
	 * Set the skip tutorial user preference via the options API
	 */
	TP.setSkipPreference = function () {
		var api = this.api,
			allowCloseWindow = mw.confirmCloseWindow( {
				message: function () { return mw.message( 'mwe-upwiz-prevent-close-wait' ).text(); }
			} );

		api.postWithToken( 'options', {
			action: 'options',
			change: 'upwiz_skiptutorial=1'
		} ).done( function () {
			allowCloseWindow();
		} ).fail( function ( code, err ) {
			mw.notify( err.textStatus );
		} );
	};

	TP.moveTo = function () {
		var tconf = mw.config.get( 'UploadWizardConfig' ).tutorial;

		if (
			mw.user.options.get( 'upwiz_skiptutorial' ) ||
			( tconf && tconf.skip )
		) {
			this.skip();
		} else {
			uw.controller.Step.prototype.moveTo.call( this );
		}
	};

	TP.moveFrom = function () {
		( new mw.UploadWizardTutorialEvent( 'continue' ) ).dispatch();

		// if the skip checkbox is checked, set the skip user preference
		if ( $( '#mwe-upwiz-skip' ).is( ':checked' ) ) {
			$( '#mwe-upwiz-skip' ).tipsy( 'hide' );
			this.setSkipPreference();
		}

		uw.controller.Step.prototype.moveFrom.call( this );
	};

	TP.isComplete = function () {
		return true;
	};

	uw.controller.Tutorial = Tutorial;
}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
