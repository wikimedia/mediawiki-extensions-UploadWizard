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
	var UP;

	/**
	 * Upload step controller.
	 * @class uw.controller.Upload
	 * @extends uw.controller.Step
	 * @constructor
	 * @param {Object} config UploadWizard config object.
	 */
	function Upload( config ) {
		uw.controller.Step.call(
			this,
			new uw.ui.Upload( config )
				.connect( this, {
					retry: 'retry',
					'flickr-ui-init': [ 'emit', 'flickr-ui-init' ]
				} ),
			config
		);

		this.stepName = 'file';
		this.finishState = 'stashed';
	}

	oo.inheritClass( Upload, uw.controller.Step );

	UP = Upload.prototype;

	/**
	 * Updates the upload step data when a file is added or removed.
	 */
	UP.updateFileCounts = function ( uploads ) {
		var fewerThanMax, haveUploads,
			max = this.config.maxUploads;

		this.ui.hideEndButtons();

		haveUploads = uw.controller.Step.prototype.updateFileCounts.call( this, uploads );

		fewerThanMax = this.uploads.length < max;

		this.ui.updateFileCounts( haveUploads, fewerThanMax );

		if ( !haveUploads ) {
			this.emit( 'no-uploads' );
		}
	};

	/**
	 * Shows an error dialog informing the user that some uploads have been omitted
	 * since they went over the max files limit.
	 * @param filesUploaded integer - the number of files that have been attempted to upload
	 */
	UP.showTooManyFilesWarning = function ( filesUploaded ) {
		this.ui.showTooManyFilesWarning( filesUploaded );
	};

	UP.empty = function () {
		this.ui.empty();
	};

	UP.moveTo = function () {
		this.updateFileCounts( [] );
		uw.controller.Step.prototype.moveTo.call( this );
		this.progressBar = undefined;
	};

	/**
	 * Starts the upload progress bar.
	 */
	UP.startProgressBar = function () {
		$( '#mwe-upwiz-progress' ).show();
		this.progressBar = new mw.GroupProgressBar( '#mwe-upwiz-progress',
			mw.message( 'mwe-upwiz-uploading' ).escaped(),
			this.uploads,
			[ 'stashed' ],
			[ 'error' ],
			'transportProgress',
			'transportWeight' );
		this.progressBar.start();
	};

	/**
	 * Starts progress bar if there's not an existing one.
	 */
	UP.maybeStartProgressBar = function () {
		if ( this.progressBarEmptyOrFinished() ) {
			this.startProgressBar();
		}
	};

	/**
	 * Check if there is a vacancy for a new progress bar.
	 */
	UP.progressBarEmptyOrFinished = function () {
		return !this.progressBar || this.progressBar.finished === true;
	};

	/**
	 * Update success count on the progress bar.
	 */
	UP.updateProgressBarCount = function ( okCount ) {
		if ( this.progressBar ) {
			this.progressBar.showCount( okCount );
		}
	};

	UP.canTransition = function ( upload ) {
		return (
			uw.controller.Step.prototype.canTransition.call( this, upload ) &&
			upload.state === 'new'
		);
	};

	UP.transitionOne = function ( upload ) {
		var promise = upload.start();
		this.maybeStartProgressBar();
		return promise;
	};

	/**
	 * Make sure the window doesn't get closed accidentally during upload.
	 */
	UP.transitionAll = function () {
		this.emit( 'prevent-close' );
		return uw.controller.Step.prototype.transitionAll.call( this );
	};

	/**
	 * Kick off the upload processes.
	 * Does some precalculations, changes the interface to be less mutable, moves the uploads to a queue,
	 * and kicks off a thread which will take from the queue.
	 * @return {jQuery.Promise}
	 */
	UP.startUploads = function () {
		var step = this;

		this.ui.hideEndButtons();

		// reset any uploads in error state back to be shiny & new
		$.each( this.uploads, function ( i, upload ) {
			if ( upload === undefined ) {
				return;
			}

			if ( upload.state === 'error' ) {
				upload.state = 'new';
				upload.ui.clearIndicator();
				upload.ui.clearStatus();
			}
		} );

		// remove ability to change files
		// ideally also hide the "button"... but then we require styleable file input CSS trickery
		// although, we COULD do this just for files already in progress...

		// it might be interesting to just make this creational -- attach it to the dom element representing
		// the progress bar and elapsed time

		return this.transitionAll().done( function () {
			step.showNext();
		} );
	};

	UP.retry = function () {
		uw.eventFlowLogger.logEvent( 'retry-uploads-button-clicked' );
		this.startUploads();
	};

	uw.controller.Upload = Upload;
}( mediaWiki.uploadWizard, jQuery, OO ) );
