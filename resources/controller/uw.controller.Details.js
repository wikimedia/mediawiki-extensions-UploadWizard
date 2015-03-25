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
	function Details( config ) {
		uw.controller.Step.call(
			this,
			new uw.ui.Details()
				.connect( this, {
					'start-details': 'startDetails',
					'finalize-details-after-removal': [ 'emit', 'start-details' ]
				} ),
			config
		);

		this.stepName = 'details';
		this.finishState = 'complete';
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

		uw.controller.Step.prototype.moveTo.call( this, uploads );
	};

	DP.empty = function () {
		this.ui.empty();
	};

	/**
	 * Start details submit.
	 * @TODO move the rest of the logic here from mw.UploadWizard
	 */
	DP.startDetails = function () {
		var details = this;

		this.valid().done( function () {
			details.ui.hideEndButtons();
			details.submit();
			details.emit( 'start-details' );
		} ).fail( function () {
			details.emit( 'details-error' );
		} );
	};

	/**
	 * Check details for validity.
	 * @return {jQuery.Promise}
	 */
	DP.valid = function () {
		var confirmationDialog, title,
			d = $.Deferred(),
			valid = 0,
			necessary = 0,
			total = 0,
			buttons = {},
			titles = {};

		$.each( this.uploads, function ( i, upload ) {
			if ( upload === undefined ) {
				return;
			}

			total += 1;

			if ( upload.details.clearDuplicateTitleError().valid() ) {
				title = upload.title.getName();

				// Seen this title before?
				if ( titles[title] ) {

					// Don't submit. Instead, set an error in details step.
					upload.details.setDuplicateTitleError();
					return;
				} else {
					titles[title] = true;
				}
				valid += 1;

				if ( upload.details.necessaryFilled() ) {
					necessary += 1;
				}
			}
		} );

		// Set up buttons for dialog box. We have to do it the hard way since the json keys are localized
		buttons[ mw.message( 'mwe-upwiz-dialog-yes' ).escaped() ] = function () {
			$( this ).dialog( 'close' );
			d.resolve();
		};
		buttons[ mw.message( 'mwe-upwiz-dialog-no' ).escaped() ] = function () {
			$( this ).dialog( 'close' );
		};
		confirmationDialog = $( '<div></div>' )
			.text( mw.message( 'mwe-upwiz-necessary-confirm' ).text() )
			.dialog( {
				width: 500,
				zIndex: 200000,
				autoOpen: false,
				modal: true,
				buttons: buttons,
				title: mw.message( 'mwe-upwiz-dialog-title' ).escaped(),
				open: function () {
					$( this ).siblings( '.ui-dialog-buttonpane' ).find( 'button:eq(1)' ).focus();
				}
			} );

		if ( valid === total ) {
			if ( necessary === total ) {
				return d.resolve();
			} else {
				confirmationDialog.dialog( 'open' );
				return d.promise();
			}
		} else {
			return d.reject();
		}
	};

	DP.canTransition = function ( upload ) {
		return (
			uw.controller.Step.prototype.canTransition.call( this, upload ) &&
			upload.state === 'details'
		);
	};

	DP.transitionOne = function ( upload ) {
		return upload.details.submit();
	};

	/**
	 * Submit details to the API.
	 * @returns {jQuery.Promise}
	 */
	DP.submit = function () {
		var details = this;

		$.each( this.uploads, function ( i, upload ) {
			// Skip empty uploads
			if ( upload === undefined ) {
				return;
			}

			// Clear error state
			if ( upload.state === 'error' ) {
				upload.state = 'details';
			}

			// Set details view to have correct title
			upload.details.setVisibleTitle( upload.title.getMain() );
		} );

		// Disable edit interface
		this.ui.disableEdits();

		// Hide errors (maybe this submission fixes them)
		this.ui.hideErrors();

		return this.transitionAll().then( function () {
			details.showErrors();

			if ( details.showNext() ) {
				details.moveFrom();
			}
		} );
	};

	/**
	 * Show errors in the form.
	 * See UI class for more.
	 */
	DP.showErrors = function () {
		this.ui.showErrors();
	};

	uw.controller.Details = Details;
}( mediaWiki.uploadWizard, jQuery, OO ) );
