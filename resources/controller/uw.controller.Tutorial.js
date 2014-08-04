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
	function Tutorial() {
		var tutorial = this;

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
					tutorial.emit( 'next-step' );
				} )
		);
	}

	oo.inheritClass( Tutorial, uw.controller.Step );

	uw.controller.Tutorial = Tutorial;
}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
