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
	 * Upload step controller.
	 *
	 * @class
	 * @extends uw.controller.Step
	 * @param {mw.Api} api
	 * @param {Object} config UploadWizard config object.
	 */
	uw.controller.Upload = function UWControllerUpload( api, config ) {
		var step = this;

		uw.controller.Step.call(
			this,
			new uw.ui.Upload( config )
				.connect( this, {
					retry: 'retry',
					'flickr-ui-init': [ 'emit', 'flickr-ui-init' ]
				} ),
			api,
			config
		);

		this.stepName = 'file';
		this.finishState = 'stashed';

		this.queue = new uw.ConcurrentQueue( {
			count: this.config.maxSimultaneousConnections,
			action: this.transitionOne.bind( this )
		} );
		this.queue.on( 'complete', this.showNext.bind( this ) );

		this.ui.on( 'files-added', function ( files ) {
			var totalFiles = files.length + step.uploads.length,
				tooManyFiles = totalFiles > step.config.maxUploads;

			if ( tooManyFiles ) {
				step.showTooManyFilesWarning( totalFiles );
			} else {
				step.addUploads( files );
			}
		} );
	};

	OO.inheritClass( uw.controller.Upload, uw.controller.Step );

	/**
	 * Updates the upload step data when a file is added or removed.
	 */
	uw.controller.Upload.prototype.updateFileCounts = function ( uploads ) {
		var fewerThanMax, haveUploads,
			max = this.config.maxUploads;

		haveUploads = uw.controller.Step.prototype.updateFileCounts.call( this, uploads );

		fewerThanMax = this.uploads.length < max;

		this.updateProgressBarCount( this.uploads.length );
		this.ui.updateFileCounts( haveUploads, fewerThanMax );

		if ( !haveUploads ) {
			this.emit( 'no-uploads' );
		}
	};

	/**
	 * Shows an error dialog informing the user that some uploads have been omitted
	 * since they went over the max files limit.
	 *
	 * @param {number} filesUploaded integer - the number of files that have been attempted to upload
	 */
	uw.controller.Upload.prototype.showTooManyFilesWarning = function ( filesUploaded ) {
		this.ui.showTooManyFilesWarning( filesUploaded );
	};

	uw.controller.Upload.prototype.empty = function () {
		this.ui.empty();
	};

	uw.controller.Upload.prototype.moveTo = function ( uploads ) {
		var controller = this;

		uw.controller.Step.prototype.moveTo.call( this, uploads );
		this.startProgressBar();

		if ( uploads.length > 0 ) {
			/*
			 * If we have uploads already, we'll want to to update the "next"
			 * buttons accordingly. showNext() does that, but relies on upload
			 * state being set correctly.
			 * Since every step overwrites the upload state, we'll need to reset
			 * it to reflect the correct upload success state.
			 * If other files are to be added, the showNext() callback will deal
			 * with new uploads, and still understand the existing files that
			 * we've just reset the state for.
			 */
			$.each( uploads, function ( i, upload ) {
				upload.state = upload.fileKey === undefined ? 'error' : controller.finishState;
			} );

			this.showNext();
		}
	};

	uw.controller.Upload.prototype.moveNext = function () {
		this.removeErrorUploads();

		uw.controller.Step.prototype.moveNext.call( this );
	};

	/**
	 * Starts the upload progress bar.
	 */
	uw.controller.Upload.prototype.startProgressBar = function () {
		this.ui.showProgressBar();
		this.progressBar = new mw.GroupProgressBar( this.ui.$progress,
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
	uw.controller.Upload.prototype.maybeStartProgressBar = function () {
		if ( this.progressBarEmptyOrFinished() ) {
			this.startProgressBar();
		}
	};

	/**
	 * Check if there is a vacancy for a new progress bar.
	 */
	uw.controller.Upload.prototype.progressBarEmptyOrFinished = function () {
		return !this.progressBar || this.progressBar.finished === true;
	};

	/**
	 * Update success count on the progress bar.
	 */
	uw.controller.Upload.prototype.updateProgressBarCount = function ( okCount ) {
		if ( this.progressBar ) {
			this.progressBar.showCount( okCount );
		}
	};

	uw.controller.Upload.prototype.canTransition = function ( upload ) {
		return (
			uw.controller.Step.prototype.canTransition.call( this, upload ) &&
			upload.state === 'new'
		);
	};

	/**
	 * Perform this step's changes on one upload.
	 *
	 * @return {jQuery.Promise}
	 */
	uw.controller.Upload.prototype.transitionOne = function ( upload ) {
		var promise = upload.start();
		this.maybeStartProgressBar();
		return promise;
	};

	/**
	 * Queue an upload object to be uploaded.
	 *
	 * @param {mw.UploadWizardUpload} upload
	 */
	uw.controller.Upload.prototype.queueUpload = function ( upload ) {
		if ( this.canTransition( upload ) ) {
			this.queue.addItem( upload );
		}
	};

	/**
	 * Kick off the upload processes.
	 */
	uw.controller.Upload.prototype.startQueuedUploads = function () {
		this.queue.startExecuting();
	};

	uw.controller.Upload.prototype.retry = function () {
		var controller = this;
		uw.eventFlowLogger.logEvent( 'retry-uploads-button-clicked' );

		$.each( this.uploads, function ( i, upload ) {
			if ( upload === undefined ) {
				return;
			}

			if ( upload.state === 'error' ) {
				// reset any uploads in error state back to be shiny & new
				upload.state = 'new';
				upload.ui.clearIndicator();
				upload.ui.clearStatus();
				// and queue them
				controller.queueUpload( upload );
			}
		} );

		this.startQueuedUploads();
	};

	/**
	 * Create the upload interface, a handler to transport it to the server, and UI for the upload
	 * itself; and immediately fill it with a file and add it to the list of uploads.
	 *
	 * @param {File} file
	 * @return {UploadWizardUpload|false} The new upload, or false if it can't be added
	 */
	uw.controller.Upload.prototype.addUpload = function ( file ) {
		var upload,
			controller = this;

		if ( this.uploads.length >= this.config.maxUploads ) {
			return false;
		}

		upload = new mw.UploadWizardUpload( this )
			.on( 'filled', function () {
				controller.setUploadFilled( upload );
			} )

			.on( 'filename-accepted', function () {
				controller.updateFileCounts( controller.uploads );
			} )

			.on( 'remove-upload', function () {
				controller.removeUpload( upload );
			} );

		upload.fill( file );
		upload.checkFile( upload.ui.getFilename(), file );

		return upload;
	};

	/**
	 * Do everything that needs to be done to start uploading a file. Calls #addUpload, then appends
	 * each mw.UploadWizardUploadInterface to the DOM and queues thumbnails to be generated.
	 *
	 * @param {File[]} files
	 */
	uw.controller.Upload.prototype.addUploads = function ( files ) {
		var
			uploadObj,
			uploadObjs = [],
			controller = this;

		$.each( files, function ( i, file ) {
			uploadObj = controller.addUpload( file );
			uploadObjs.push( uploadObj );
		} );

		this.ui.displayUploads( uploadObjs );

		uw.eventFlowLogger.logUploadEvent( 'uploads-added', { quantity: files.length } );
	};

	/**
	 * Remove an upload from our array of uploads, and the HTML UI
	 * We can remove the HTML UI directly, as jquery will just get the parent.
	 * We need to grep through the array of uploads, since we don't know the current index.
	 * We need to update file counts for obvious reasons.
	 *
	 * @param {UploadWizardUpload} upload
	 */
	uw.controller.Upload.prototype.removeUpload = function ( upload ) {
		// remove the div that passed along the trigger
		var $div = $( upload.ui.div ),
			index;

		$div.unbind(); // everything
		$div.remove();

		// Remove the upload from the uploads array (modify in-place, as this is
		// shared among various things that rely on having current information).
		index = this.uploads.indexOf( upload );
		if ( index !== -1 ) {
			this.uploads.splice( index, 1 );
		}

		this.queue.removeItem( upload );

		this.updateFileCounts( this.uploads );

		// check all uploads, if they're complete, show the next button
		this.showNext();
	};

	/**
	 * When an upload is filled with a real file, accept it in the list of uploads
	 * and set up some other interfaces
	 *
	 * @param {UploadWizardUpload} upload
	 */
	uw.controller.Upload.prototype.setUploadFilled = function ( upload ) {
		this.uploads.push( upload );
		this.updateFileCounts( this.uploads );
		// Start uploads now, no reason to wait--leave the remove button alone
		this.queueUpload( upload );
		this.startQueuedUploads();
	};

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
