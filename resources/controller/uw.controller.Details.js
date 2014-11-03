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

( function ( uw, $, oo ) {
	var DP;

	/**
	 * Represents the details step in the wizard.
	 * @class mw.uw.controller.Details
	 * @extends mw.uw.controller.Step
	 * @constructor
	 */
	function Details() {
		uw.controller.Step.call(
			this,
			new uw.ui.Step( $( '#mwe-upwiz-stepdiv-details' ), $( '#mwe-upwiz-step-details' ) )
		);

		this.ui = new uw.ui.Details();
	}

	oo.inheritClass( Details, uw.controller.Step );

	DP = Details.prototype;

	/**
	 * Move to this step.
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	DP.moveTo = function ( uploads ) {
		var successes = 0;

		$.each( uploads, function ( i, upload ) {
			if ( upload && upload.state !== 'aborted' && upload.state !== 'error' ) {
				successes++;

				if ( successes > 1 ) {
					// Break out of the loop, we have enough.
					return false;
				}
			}
		} );

		$.each( uploads, function ( i, upload ) {
			if ( upload === undefined ) {
				return;
			}

			upload.createDetails();

			if ( upload.fromURL || upload.chosenDeed.name === 'custom' ) {
				upload.details.useCustomDeedChooser();
			}

			upload.details.titleInput.checkTitle();

			// Show toggler to copy selected metadata if there's more than one successful upload
			if ( successes > 1 ) {
				uploads[0].details.buildAndShowCopyMetadata();
			}
		} );

		uw.controller.Step.prototype.moveTo.call( this );
	};

	DP.empty = function () {
		this.ui.empty();
	};

	uw.controller.Details = Details;
}( mediaWiki.uploadWizard, jQuery, OO ) );
