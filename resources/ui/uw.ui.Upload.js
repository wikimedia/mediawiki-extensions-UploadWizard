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

( function ( mw, $, ui, oo ) {
	var UP;

	/**
	 * Represents the UI for the wizard's Upload step.
	 * @class uw.ui.Upload
	 * @extends uw.ui.Step
	 * @constructor
	 * @param {Object} config UploadWizard config object.
	 */
	function Upload( config ) {
		var upload = this;

		this.config = config;

		ui.Step.call(
			this,
			$( '#mwe-upwiz-stepdiv-file' ),
			$( '#mwe-upwiz-step-file' )
		);

		this.$uploadCtrl = $( '#mwe-upwiz-upload-ctrls' );
		this.$uploadCtrlContainer = $( '#mwe-upwiz-upload-ctrl-container' );
		this.$uploadCenterDivide = $( '#mwe-upwiz-upload-ctr-divide' );
		this.$uploadStepButtons = $( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons' );

		this.$addFile = $( '#mwe-upwiz-add-file' )
			.button();
		this.$addFileContainer = $( '#mwe-upwiz-add-file-container' );

		this.$flickrAddFile = $( '#mwe-upwiz-upload-ctrl-flickr' )
			.button()
			.click( function () {
				upload.emit( 'flickr-ui-init' );
			} );
		this.$flickrAddFileContainer = $( '#mwe-upwiz-upload-ctrl-flickr-container' );

		this.$flickrSelect = $( '#mwe-upwiz-select-flickr' );
		this.$flickrSelectList = $( '#mwe-upwiz-flickr-select-list' );
		this.$flickrSelectListContainer = $( '#mwe-upwiz-flickr-select-list-container' );

		this.$nextStepButton = this.$div
			.find( '.mwe-upwiz-buttons .mwe-upwiz-button-next' )
			.click( function () {
				upload.emit( 'next-step' );
			} );

		this.$retryButton = this.$div
			.find( '.mwe-upwiz-buttons .mwe-upwiz-button-retry' )
			.click( function () {
				upload.hideEndButtons();
				upload.emit( 'retry' );
			} );

		this.$fileList = $( '#mwe-upwiz-filelist' );

		this.$progress = $( '#mwe-upwiz-progress' );
	}

	oo.inheritClass( Upload, ui.Step );

	UP = Upload.prototype;

	/**
	 * Updates the interface based on the number of uploads.
	 * @param {boolean} haveUploads Whether there are any uploads at all.
	 * @param {boolean} fewerThanMax Whether we can add more uploads.
	 */
	UP.updateFileCounts = function ( haveUploads, fewerThanMax ) {
		this.$fileList.toggleClass( 'mwe-upwiz-filled-filelist', haveUploads );
		this.$addFile.add( this.$flickrAddFile ).toggleClass( 'mwe-upwiz-add-files-n', haveUploads );
		this.$addFileContainer.toggleClass( 'mwe-upwiz-add-files-0', !haveUploads );

		this.setAddButtonText( haveUploads && this.config.enableMultipleFiles === true );

		if ( haveUploads ) {
			// we have uploads ready to go, so allow us to proceed
			this.$uploadCtrlContainer.add( this.$uploadStepButtons ).show();
			this.$uploadCenterDivide.hide();

			if ( mw.UploadWizard.config.enableMultipleFiles !== true ) {
				$( '.mwe-upwiz-file-input' )
					.add( this.$addFile )
					.add( this.$flickrAddFileContainer )
					.add( this.$flickrSelectListContainer )
					.hide();
			}

			// fix the rounded corners on file elements.
			// we want them to be rounded only when their edge touched the top or bottom of the filelist.
			this.$fileListings = this.$fileList.find( '.filled' );

			this.$visibleFileListings = this.$fileListings.find( '.mwe-upwiz-visible-file' );
			this.$visibleFileListings.removeClass( 'ui-corner-top ui-corner-bottom' );
			this.$visibleFileListings.first().addClass( 'ui-corner-top' );
			this.$visibleFileListings.last().addClass( 'ui-corner-bottom' );

			this.$fileListings.filter( ':odd' ).addClass( 'odd' );
			this.$fileListings.filter( ':even' ).removeClass( 'odd' );
		} else {
			this.$uploadStepButtons.hide();

			if ( this.isFlickrImportEnabled() ) {
				this.$uploadCenterDivide.show();
			}
		}

		this.$addFile
			.add( this.$flickrAddFile )
			.button( 'option', 'disabled', !fewerThanMax );

		this.$fileList.find( '.mwe-upwiz-file:not(.filled) .mwe-upwiz-file-input' ).prop( 'disabled', !fewerThanMax );
	};

	/**
	 * Changes the initial centered invitation button to something like "add another file"
	 */
	UP.setAddButtonText = function ( more ) {
		var msg = 'mwe-upwiz-add-file-',
			fmsg = 'mwe-upwiz-add-file-flickr';

		if ( more ) {
			msg += 'n';
			fmsg += '-n';
		} else {
			msg += '0-free';
		}

		this.$addFile.button( 'option', 'label', mw.message( msg ).escaped() );

		// if Flickr uploading is available to this user, show the "add more files from flickr" button
		if ( this.isFlickrImportEnabled() ) {
			// changes the flickr add button to "add more files from flickr"
			this.$flickrAddFile.button( 'option', 'label', mw.message( fmsg ).escaped() );
		}
	};

	/**
	 * Empties the upload list.
	 */
	UP.empty = function () {
		this.$uploadCtrlContainer
			.add( this.$uploadStepButtons )
			.add( this.$progress )
			.hide();

		this.$addFileContainer
			.add( this.$addFile )
			.show();

		if ( this.isFlickrImportEnabled() ) {
			this.$flickrAddFileContainer
				.add( this.$uploadCenterDivide )
				.show();
		}

		// changes the button back from "add another file" to the initial centered invitation button
		this.$addFile.button( 'option', 'label', mw.message( 'mwe-upwiz-add-file-0-free' ).escaped() );

		// changes the button back from "add more files from flickr" to the initial text
		this.$flickrAddFile.button( 'option', 'label', mw.message( 'mwe-upwiz-add-file-flickr' ).escaped() );

		this.emptyFlickrLists();
	};

	/**
	 * Empties the Flickr selection lists.
	 */
	UP.emptyFlickrLists = function () {
		// empty the flickr lists
		this.$flickrSelectList.empty();
		this.$flickrSelectListContainer.unbind();
		this.$flickrSelect.unbind();
	};

	UP.moveTo = function () {
		ui.Step.prototype.moveTo.call( this );

		this.$addFile.add( this.$flickrAddFile ).removeClass( 'mwe-upwiz-add-files-n' );
		this.$addFileContainer.addClass( 'mwe-upwiz-add-files-0' );
		this.$fileList.removeClass( 'mwe-upwiz-filled-filelist' );

		// Show the upload button, and the add file button
		$( '#mwe-upwiz-upload-ctrls' ).show();
		$( '#mwe-upwiz-add-file' ).show();
	};

	/**
	 * Hide the buttons for moving to the next step.
	 */
	UP.hideEndButtons = function () {
		this.$div
			.find( '.mwe-upwiz-buttons .mwe-upwiz-file-endchoice' )
			.hide();
	};

	/**
	 * Shows an error dialog informing the user that some uploads have been omitted
	 * since they went over the max files limit.
	 * @param filesUploaded integer - the number of files that have been attempted to upload
	 */
	UP.showTooManyFilesWarning = function ( filesUploaded ) {
		var buttons = [
			{
				text: mw.message( 'mwe-upwiz-too-many-files-ok' ).escaped(),
				click: function () {
					$( this ).dialog('destroy').remove();
				}
			}
		];

		$( '<div>' )
			.msg(
				'mwe-upwiz-too-many-files-text',
				this.config.maxUploads,
				filesUploaded
			)
			.dialog( {
				width: 500,
				zIndex: 200000,
				autoOpen: true,
				title: mw.message( 'mwe-upwiz-too-many-files' ).escaped(),
				modal: true,
				buttons: buttons
			} );
	};

	/**
	 * Checks whether flickr import is enabled and the current user has the rights to use it
	 * @returns {Boolean}
	 */
	UP.isFlickrImportEnabled = function () {
		return mw.UploadWizard.config.UploadFromUrl && mw.UploadWizard.config.flickrApiKey !== '';
	};

	ui.Upload = Upload;
}( mediaWiki, jQuery, mediaWiki.uploadWizard.ui, OO ) );
