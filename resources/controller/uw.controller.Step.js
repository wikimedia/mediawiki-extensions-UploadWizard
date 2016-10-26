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

( function ( mw, uw, OO, $ ) {
	/**
	 * Represents a step in the wizard.
	 *
	 * @class
	 * @mixins OO.EventEmitter
	 * @abstract
	 * @param {uw.ui.Step} ui The UI object that controls this step.
	 * @param {mw.Api} api
	 * @param {Object} config UploadWizard config object.
	 */
	uw.controller.Step = function UWControllerStep( ui, api, config ) {
		var step = this;

		OO.EventEmitter.call( this );

		/**
		 * @property {Object} config
		 */
		this.config = config;
		/**
		 * @property {mw.Api} api
		 */
		this.api = api;

		this.ui = ui;

		this.uploads = [];

		this.ui.on( 'next-step', function () {
			step.moveNext();
		} );

		this.ui.on( 'previous-step', function () {
			step.movePrevious();
		} );

		/**
		 * @property {uw.controller.Step} nextStep
		 * The next step in the process.
		 */
		this.nextStep = null;

		/**
		 * @property {uw.controller.Step} previousStep
		 * The previous step in the process.
		 */
		this.previousStep = null;
	};

	OO.mixinClass( uw.controller.Step, OO.EventEmitter );

	/**
	 * Empty the step of all data.
	 */
	uw.controller.Step.prototype.empty = function () {
		this.ui.empty();
	};

	/**
	 * Set the next step in the process.
	 *
	 * @param {uw.controller.Step} step
	 */
	uw.controller.Step.prototype.setNextStep = function ( step ) {
		this.nextStep = step;
		this.ui.enableNextButton();
	};

	/**
	 * Set the previous step in the process.
	 *
	 * @param {uw.controller.Step} step
	 */
	uw.controller.Step.prototype.setPreviousStep = function ( step ) {
		this.previousStep = step;
		this.ui.enablePreviousButton();
	};

	/**
	 * Move to this step.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	uw.controller.Step.prototype.moveTo = function ( uploads ) {
		var step = this;

		this.movedFrom = false;

		this.emit( 'load' );

		this.uploads = uploads || [];

		$.each( this.uploads, function ( i, upload ) {
			if ( upload !== undefined ) {
				upload.state = step.stepName;
			}
		} );

		this.ui.moveTo( uploads );
		uw.eventFlowLogger.logStep( this.stepName );

		this.updateFileCounts( this.uploads );
	};

	/**
	 * Move to the next step.
	 */
	uw.controller.Step.prototype.moveNext = function () {
		this.ui.moveNext( this.uploads );

		this.movedFrom = true;

		if ( this.nextStep ) {
			this.nextStep.moveTo( this.uploads );
		}
	};

	/**
	 * Move to the previous step.
	 */
	uw.controller.Step.prototype.movePrevious = function () {
		this.ui.movePrevious( this.uploads );

		this.movedFrom = true;

		if ( this.previousStep ) {
			this.previousStep.moveTo( this.uploads );
		}
	};

	/**
	 * Count the number of empty (undefined) uploads in our list.
	 */
	uw.controller.Step.prototype.countEmpties = function () {
		var count = 0;

		$.each( this.uploads, function ( i, upload ) {
			if ( !upload ) {
				count += 1;
			}
		} );

		return count;
	};

	/**
	 * Update file counts for the step.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @return {boolean} Whether there are uploads present in the list
	 */
	uw.controller.Step.prototype.updateFileCounts = function ( uploads ) {
		if ( uploads ) {
			this.uploads = uploads;
		} else {
			this.uploads = [];
		}

		if ( uploads.length - this.countEmpties() <= 0 ) {
			this.uploads = [];
			this.emit( 'no-uploads' );
			return false;
		}

		return true;
	};

	/**
	 * Check if upload is able to be put through this step's changes.
	 *
	 * @return {boolean}
	 */
	uw.controller.Step.prototype.canTransition = function () {
		return true;
	};

	/**
	 * Figure out what to do and what options to show after the uploads have stopped.
	 * Uploading has stopped for one of the following reasons:
	 * 1) The user removed all uploads before they completed, in which case we are at upload.length === 0. We should start over and allow them to add new ones
	 * 2) All succeeded - show link to next step
	 * 3) Some failed, some succeeded - offer them the chance to retry the failed ones or go on to the next step
	 * 4) All failed -- have to retry, no other option
	 * In principle there could be other configurations, like having the uploads not all in error or stashed state, but
	 * we trust that this hasn't happened.
	 *
	 * For uploads that have succeeded, now is the best time to add the relevant previews and details to the DOM
	 * in the right order.
	 *
	 * @return {boolean} Whether all of the uploads are in a successful state.
	 */
	uw.controller.Step.prototype.showNext = function () {
		var okCount = this.getUploadStatesCount( this.finishState ),
			$buttons;

		// abort if all uploads have been removed
		if ( this.uploads.length === 0 ) {
			return false;
		}

		this.updateProgressBarCount( okCount );

		$buttons = this.ui.$div.find( '.mwe-upwiz-buttons' );
		$buttons.show();

		$buttons.find( '.mwe-upwiz-file-next-all-ok' ).hide();
		$buttons.find( '.mwe-upwiz-file-next-some-failed' ).hide();
		$buttons.find( '.mwe-upwiz-file-next-all-failed' ).hide();

		if ( okCount === ( this.uploads.length - this.countEmpties() ) ) {
			$buttons.find( '.mwe-upwiz-file-next-all-ok' ).show();
			return true;
		}

		if ( this.getUploadStatesCount( 'error' ) === ( this.uploads.length - this.countEmpties() ) ) {
			$buttons.find( '.mwe-upwiz-file-next-all-failed' ).show();
		} else if ( this.getUploadStatesCount( 'transporting' ) === 0 ) {
			$buttons.find( '.mwe-upwiz-file-next-some-failed' ).show();
		}

		return false;
	};

	/**
	 * @param {string|string[]} states List of upload states we want the count for
	 * @return {number}
	 */
	uw.controller.Step.prototype.getUploadStatesCount = function ( states ) {
		var count = 0;

		// normalize to array of states, even though input can be 1 string
		states = Array.isArray( states ) ? states : [ states ];

		$.each( this.uploads, function ( i, upload ) {
			if ( upload === undefined ) {
				return;
			}

			if ( states.indexOf( upload.state ) > -1 ) {
				count++;
			}
		} );

		return count;
	};

	/**
	 * Function used by some steps to update progress bar for the whole
	 * batch of uploads.
	 */
	uw.controller.Step.prototype.updateProgressBarCount = function () {};

	/**
	 * Check whether this step has been completed, or is in progress.
	 * The default check is for the three middle steps - tutorial and
	 * thanks have their own.
	 *
	 * @return {boolean}
	 */
	uw.controller.Step.prototype.isComplete = function () {
		return this.uploads === undefined || this.uploads.length === 0 || this.movedFrom;
	};

	/**
	 * Clear out uploads that are in error mode, perhaps before proceeding to the next step
	 */
	uw.controller.Step.prototype.removeErrorUploads = function () {
		// We must not remove items from an array while iterating over it with $.each (it causes the
		// next item to be skipped). Find and queue them first, then remove them.
		var toRemove = [];
		$.each( this.uploads, function ( i, upload ) {
			if ( upload !== undefined && upload.state === 'error' ) {
				toRemove.push( upload );
			}
		} );
		$.each( toRemove, function ( i, upload ) {
			upload.remove();
		} );
	};

}( mediaWiki, mediaWiki.uploadWizard, OO, jQuery ) );
