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

( function ( uw, oo, $ ) {
	var SP;

	/**
	 * Represents a step in the wizard.
	 * @class mw.uw.controller.Step
	 * @mixins oo.EventEmitter
	 * @abstract
	 * @constructor
	 * @param {mw.uw.ui.Step} ui The UI object that controls this step.
	 * @param {Object} config The UW config object, or relevant subset.
	 */
	function Step( ui, config ) {
		var step = this;

		oo.EventEmitter.call( this );

		/**
		 * @property {Object} config
		 */
		this.config = config;

		/**
		 * @property {number} uploadsTransitioning The number of uploads currently in this step and in transition.
		 */
		this.uploadsTransitioning = 0;

		this.ui = ui;

		this.ui.on( 'next-step', function () {
			step.moveFrom();
		} );

		/**
		 * @property {mw.uw.controller.Step} nextStep
		 * The next step in the process.
		 */
		this.nextStep = null;
	}

	oo.mixinClass( Step, oo.EventEmitter );

	SP = Step.prototype;

	/**
	 * Empty the step of all data.
	 */
	SP.empty = function () {
		this.ui.empty();
	};

	/**
	 * Set the next step in the process.
	 * @param {mw.uw.controller.Step} step
	 */
	SP.setNextStep = function ( step ) {
		this.nextStep = step;
	};

	/**
	 * Move to this step.
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	SP.moveTo = function ( uploads ) {
		var step = this;

		this.movedFrom = false;

		this.uploads = uploads || [];

		$.each( this.uploads, function ( i, upload ) {
			if ( upload !== undefined ) {
				upload.state = step.stepName;
			}
		} );

		this.ui.moveTo( uploads );
		( new mw.UploadWizardTutorialEvent( 'load' ) ).dispatch();
		uw.eventFlowLogger.logStep( this.stepName );
		this.emit( 'load' );

		this.updateFileCounts( this.uploads );
	};

	/**
	 * Move out of this step.
	 */
	SP.moveFrom = function () {
		this.ui.moveFrom( this.uploads );

		this.movedFrom = true;

		if ( this.nextStep ) {
			this.nextStep.moveTo( this.uploads );
		}
	};

	/**
	 * Skip this step.
	 */
	SP.skip = function () {
		uw.eventFlowLogger.logSkippedStep( this.stepName );
		this.moveFrom();
	};

	/**
	 * Count the number of empty (undefined) uploads in our list.
	 */
	SP.countEmpties = function () {
		var count = 0;

		$.each( this.uploads, function ( i, upload ) {
			if ( mw.isEmpty( upload ) ) {
				count += 1;
			}
		} );

		return count;
	};

	/**
	 * Update file counts for the step.
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @return {boolean} Whether there are uploads present in the list
	 */
	SP.updateFileCounts = function ( uploads ) {
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
	 * Perform this step's changes on all uploads. Replaces makeTransitioner
	 * in the UploadWizard class.
	 * @return {jQuery.Promise}
	 */
	SP.transitionAll = function () {
		var i,
			step = this,
			transpromises = [],
			uploadsQueued = [];

		function startNextUpload() {
			var ix, upload;

			// Run through uploads looking for one we can transition. In most
			// cases this will be the next upload.
			while ( uploadsQueued.length > 0 ) {
				ix = uploadsQueued.shift();
				upload = step.uploads[ix];

				if ( step.canTransition( upload ) ) {
					return step.transitionOne( upload ).then( startNextUpload );
				}
			}

			return $.Deferred().resolve();
		}

		$.each( this.uploads, function ( i, upload ) {
			if ( upload === undefined ) {
				return;
			}

			uploadsQueued.push( i );
		} );

		for ( i = 0; i < this.config.maxSimultaneousConnections; i++ ) {
			transpromises.push( startNextUpload() );
		}

		return $.when.apply( $, transpromises );
	};

	/**
	 * Check if upload is able to be put through this step's changes.
	 * @param {mw.UploadWizardUpload} upload
	 * @return {boolean}
	 */
	SP.canTransition = function () {
		return this.uploadsTransitioning < this.config.maxSimultaneousConnections;
	};

	/**
	 * Perform this step's changes on one upload.
	 * @return {jQuery.Promise}
	 */
	SP.transitionOne = function () {
		return $.Deferred().reject( 'Using default transitioner is not supported' );
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
	 * @return {boolean} Whether all of the uploads are in a successful state.
	 */
	SP.showNext = function () {
		var errorCount = 0,
			okCount = 0,
			stillGoing = 0,
			selector = null,
			allOk = false,
			desiredState = this.finishState;

		// abort if all uploads have been removed
		if ( this.uploads.length === 0 ) {
			return false;
		}

		$.each( this.uploads, function ( i, upload ) {
			if ( upload === undefined ) {
				return;
			}
			if ( upload.state === 'error' ) {
				errorCount++;
			} else if ( upload.state === desiredState ) {
				okCount++;
			} else if ( upload.state === 'transporting' ) {
				stillGoing += 1;
			}
		} );

		this.updateProgressBarCount( okCount );

		if ( okCount === ( this.uploads.length - this.countEmpties() ) ) {
			allOk = true;
			selector = '.mwe-upwiz-file-next-all-ok';
		} else if ( errorCount === ( this.uploads.length - this.countEmpties() ) ) {
			selector = '.mwe-upwiz-file-next-all-failed';
		} else if ( stillGoing !== 0 ) {
			return false;
		} else {
			selector = '.mwe-upwiz-file-next-some-failed';
		}

		this.ui.$div.find( '.mwe-upwiz-buttons' ).show().find( selector ).show();

		return allOk;
	};

	/**
	 * Function used by some steps to update progress bar for the whole
	 * batch of uploads.
	 */
	SP.updateProgressBarCount = function () {};

	/**
	 * Check whether this step has been completed, or is in progress.
	 * The default check is for the three middle steps - tutorial and
	 * thanks have their own.
	 * @return {boolean}
	 */
	SP.isComplete = function () {
		return this.uploads === undefined || this.uploads.length === 0 || this.movedFrom;
	};

	uw.controller.Step = Step;
}( mediaWiki.uploadWizard, OO, jQuery ) );
