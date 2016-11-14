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

( function ( mw, uw, $, OO ) {

	/**
	 * Tutorial step controller.
	 *
	 * @class
	 * @extends uw.controller.Step
	 * @param {mw.Api} api
	 * @param {Object} config UploadWizard config object.
	 */
	uw.controller.Tutorial = function UWControllerTutorial( api, config ) {
		var controller = this;

		this.skipPreference = Boolean( mw.user.options.get( 'upwiz_skiptutorial' ) );

		this.shouldSkipTutorial = false;

		uw.controller.Step.call(
			this,
			new uw.ui.Tutorial()
				.on( 'skip-tutorial-click', function ( skipped ) {
					controller.shouldSkipTutorial = skipped;
					if ( skipped ) {
						uw.eventFlowLogger.logTutorialAction( 'skip-check' );
					} else {
						uw.eventFlowLogger.logTutorialAction( 'skip-uncheck' );
					}
				} )

				.on( 'helpdesk-click', function () {
					uw.eventFlowLogger.logTutorialAction( 'helpdesk-click' );
				} ),
			api,
			config
		);

		this.stepName = 'tutorial';

		this.ui.setSelected( this.skipPreference || ( config && config.tutorial && config.tutorial.skip ) );
	};

	OO.inheritClass( uw.controller.Tutorial, uw.controller.Step );

	/**
	 * Set the skip tutorial user preference via the options API
	 *
	 * @param {boolean} skip
	 */
	uw.controller.Tutorial.prototype.setSkipPreference = function ( skip ) {
		var controller = this,
			allowCloseWindow = mw.confirmCloseWindow( {
				message: function () { return mw.message( 'mwe-upwiz-prevent-close-wait' ).text(); }
			} );

		this.api.postWithToken( 'options', {
			action: 'options',
			change: skip ? 'upwiz_skiptutorial=1' : 'upwiz_skiptutorial'
		} ).done( function () {
			allowCloseWindow.release();
			controller.skipPreference = controller.shouldSkipTutorial;
		} ).fail( function ( code, err ) {
			mw.notify( err.textStatus );
		} );
	};

	uw.controller.Tutorial.prototype.moveTo = function ( uploads ) {
		uw.controller.Step.prototype.moveTo.call( this, uploads );
		uw.eventFlowLogger.logTutorialAction( 'load' );
	};

	uw.controller.Tutorial.prototype.moveNext = function () {
		uw.eventFlowLogger.logTutorialAction( 'continue' );

		// if the skip checkbox is checked, set the skip user preference
		if ( this.shouldSkipTutorial !== this.skipPreference ) {
			this.setSkipPreference( this.shouldSkipTutorial );
		}

		uw.controller.Step.prototype.moveNext.call( this );
	};

	uw.controller.Tutorial.prototype.isComplete = function () {
		return true;
	};

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
