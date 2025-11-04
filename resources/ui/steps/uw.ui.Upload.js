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

( function ( uw ) {
	/**
	 * Represents the UI for the wizard's Upload step.
	 *
	 * @class
	 * @extends uw.ui.Step
	 * @param {Object} config UploadWizard config object.
	 */
	uw.ui.Upload = function UWUIUpload( config ) {
		this.config = config;

		uw.ui.Step.call(
			this,
			'file'
		);

		this.$addFileContainer = $( '<div>' )
			.attr( 'id', 'mwe-upwiz-add-file-container' )
			.addClass( 'mwe-upwiz-add-files-0' );

		this.$uploadCtrl = $( '<div>' )
			.attr( 'id', 'mwe-upwiz-upload-ctrls' )
			.addClass( 'mwe-upwiz-file ui-helper-clearfix' )
			.append( this.$addFileContainer );

		this.addFile = new OO.ui.SelectFileWidget( {
			classes: [ 'mwe-upwiz-add-file' ],
			multiple: true,
			showDropTarget: true,
			button: {
				label: mw.message( 'mwe-upwiz-add-file-0-free' ).text(),
				flags: [ 'progressive', 'primary' ]
			}
		} );
		this.addFile.on( 'change', ( files ) => {
			this.emit( 'files-added', files );
			this.addFile.setValue( null );
		} );

		this.$addFileContainer.append( this.addFile.$element );

		if ( this.isFlickrImportEnabled() ) {
			this.$flickrAddFileContainer = $( '<div>' )
				.attr( 'id', 'mwe-upwiz-upload-ctrl-flickr-container' );

			this.$uploadCenterDivide = $( '<p>' )
				.attr( 'id', 'mwe-upwiz-upload-ctr-divide' )
				.text( mw.message( 'mwe-upwiz-add-flickr-or' ).text() );

			this.addFlickrFile = new OO.ui.ButtonWidget( {
				id: 'mwe-upwiz-add-flickr-file',
				label: mw.message( 'mwe-upwiz-add-file-flickr' ).text(),
				flags: 'progressive'
			} ).on( 'click', () => {
				this.flickrInterfaceInit();
			} );

			this.$flickrAddFileContainer.append(
				this.$uploadCenterDivide,
				this.addFlickrFile.$element
			);

			this.$addFileContainer
				.append( this.$flickrAddFileContainer );

			this.$flickrSelectList = $( '<div>' )
				.attr( 'id', 'mwe-upwiz-flickr-select-list' );

			this.$flickrSelectListContainer = $( '<div>' )
				.attr( 'id', 'mwe-upwiz-flickr-select-list-container' )
				.addClass( 'ui-corner-all' )
				.append(
					$( '<div>' )
						.text( mw.message(
							'mwe-upwiz-multi-file-select2',
							config.maxFlickrUploads
						) ),
					this.$flickrSelectList
				);

			// Button to move on & upload the files that were selected
			this.flickrSelectButton = new OO.ui.ButtonWidget( {
				id: 'mwe-upwiz-select-flickr',
				label: mw.message( 'mwe-upwiz-add-file-0-free' ).text(),
				flags: [ 'progressive', 'primary' ]
			} );
			this.$flickrSelectListContainer.append( this.flickrSelectButton.$element );

			// A container holding a form
			this.$flickrContainer = $( '<div>' ).attr( 'id', 'mwe-upwiz-upload-add-flickr-container' );

			// Form whose submit event will be listened to and prevented
			this.$flickrForm = $( '<form>' ).attr( 'id', 'mwe-upwiz-flickr-url-form' )
				.appendTo( this.$flickrContainer )
				.on( 'submit', () => {
					const checker = new mw.FlickrChecker( this, this.flickrSelectButton );
					this.flickrButton.setDisabled( true );
					this.flickrChecker( checker );
					// TODO Any particular reason to stopPropagation ?
					return false;
				} );

			// The input that will hold a flickr URL entered by the user; will be appended to a form
			this.flickrInput = new OO.ui.TextInputWidget( {
				placeholder: mw.message( 'mwe-upwiz-flickr-input-placeholder' ).text()
			} );

			this.flickrButton = new OO.ui.ButtonInputWidget( {
				label: mw.message( 'mwe-upwiz-add-flickr' ).text(),
				flags: [ 'progressive', 'primary' ],
				type: 'submit'
			} );

			this.flickrField = new OO.ui.ActionFieldLayout(
				this.flickrInput, this.flickrButton, {
					align: 'top',
					classes: [ 'mwe-upwiz-flickr-field' ]
				}
			);

			this.$flickrForm.append( this.flickrField.$element );

			// Add disclaimer
			$( '<div>' ).attr( 'id', 'mwe-upwiz-flickr-disclaimer' )
				.append(
					mw.message( 'mwe-upwiz-flickr-disclaimer1' ).parseDom(),
					$( '<br>' ), mw.message( 'mwe-upwiz-flickr-disclaimer2' ).parseDom()
				)
				.appendTo( this.$flickrContainer );
		}

		this.nextStepButtonAllOk = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-next-file' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', () => {
			this.emit( 'next-step' );
		} );

		this.retryButtonSomeFailed = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-file-retry' ).text(),
			flags: [ 'progressive' ]
		} ).on( 'click', () => {
			this.hideEndButtons();
			this.emit( 'retry' );
		} );

		this.nextStepButtonSomeFailed = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-next-file-despite-failures' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', () => {
			this.emit( 'next-step' );
		} );

		this.retryButtonAllFailed = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-file-retry' ).text(),
			flags: [ 'progressive' ]
		} ).on( 'click', () => {
			this.hideEndButtons();
			this.emit( 'retry' );
		} );

		this.$fileList = $( '<div>' )
			.attr( 'id', 'mwe-upwiz-filelist' )
			.addClass( 'ui-corner-all' );

		this.$progress = $( '<div>' )
			.attr( 'id', 'mwe-upwiz-progress' )
			.addClass( 'ui-helper-clearfix' );

		this.addPreviousButton();
		this.addNextButton();
	};

	OO.inheritClass( uw.ui.Upload, uw.ui.Step );

	uw.ui.Upload.prototype.showProgressBar = function () {
		this.$progress.show();
	};

	/**
	 * Updates the interface based on the number of uploads.
	 *
	 * @param {boolean} haveUploads Whether there are any uploads at all.
	 * @param {boolean} fewerThanMax Whether we can add more uploads.
	 */
	uw.ui.Upload.prototype.updateFileCounts = function ( haveUploads, fewerThanMax ) {
		this.$fileList.toggleClass( 'mwe-upwiz-filled-filelist', haveUploads );
		this.$addFileContainer.toggleClass( 'mwe-upwiz-add-files-0', !haveUploads );

		this.setAddButtonText( haveUploads );

		if ( haveUploads ) {
			// we have uploads ready to go, so allow us to proceed
			this.$addFileContainer.add( this.$buttons ).show();

			if ( this.isFlickrImportEnabled() ) {
				this.$uploadCenterDivide.hide();
			}

			// fix the rounded corners on file elements.
			// we want them to be rounded only when their edge touched the top or bottom of the filelist.
			this.$fileListings = this.$fileList.find( '.filled' );

			this.$visibleFileListings = this.$fileListings.find( '.mwe-upwiz-visible-file' );
			this.$visibleFileListings.removeClass( 'ui-corner-top ui-corner-bottom' );
			this.$visibleFileListings.first().addClass( 'ui-corner-top' );
			this.$visibleFileListings.last().addClass( 'ui-corner-bottom' );
			this.showNoticeForImageMetadata( true );

			// eslint-disable-next-line no-jquery/no-sizzle
			this.$fileListings.filter( ':odd' ).addClass( 'odd' );
			// eslint-disable-next-line no-jquery/no-sizzle
			this.$fileListings.filter( ':even' ).removeClass( 'odd' );
		} else {
			this.hideEndButtons();
			this.showNoticeForImageMetadata( false );

			if ( this.isFlickrImportEnabled() ) {
				this.$uploadCenterDivide.show();
			}
		}

		this.addFile.setDisabled( !fewerThanMax );

		if ( this.isFlickrImportEnabled() ) {
			this.addFlickrFile.setDisabled( !fewerThanMax );
		}
	};

	/**
	 * Changes the initial centered invitation button to something like "add another file"
	 *
	 * @param {boolean} more
	 */
	uw.ui.Upload.prototype.setAddButtonText = function ( more ) {
		let msg = 'mwe-upwiz-add-file-',
			fmsg = 'mwe-upwiz-add-file-flickr';

		if ( more ) {
			msg += 'n';
			fmsg += '-n';
		} else {
			msg += '0-free';
		}

		this.addFile.selectButton.setLabel( mw.message( msg ).text() );

		// if Flickr uploading is available to this user, show the "add more files from flickr" button
		if ( this.isFlickrImportEnabled() ) {
			// changes the flickr add button to "add more files from flickr" if necessary.
			this.addFlickrFile.setLabel( mw.message( fmsg ).text() );
			// jQuery likes to restore the wrong 'display' value when doing .show()
			this.$flickrAddFileContainer.css( 'display', '' );
		}
	};

	uw.ui.Upload.prototype.load = function ( uploads ) {
		uw.ui.Step.prototype.load.call( this, uploads );

		if ( uploads.length === 0 ) {
			this.$fileList.removeClass( 'mwe-upwiz-filled-filelist' );
		}

		const $noticeMessage = $( '<span>' )
			.append(
				$( '<strong>' ).text( mw.message( 'mwe-upwiz-metadata-notice-header' ).text() ),
				$( '<br>' ),
				mw.message( 'mwe-upwiz-metadata-notice-description' ).parseDom()
			);

		this.notice = new OO.ui.MessageWidget( {
			type: 'notice',
			icon: 'pageSettings',
			classes: [ 'mwe-upwiz-metadata-notice' ],
			label: $noticeMessage
		} );

		this.$div.prepend(
			$( '<div>' )
				.attr( 'id', 'mwe-upwiz-files' )
				.append(
					this.$flickrSelectListContainer,
					this.$fileList,
					this.$uploadCtrl,
					this.notice.$element
				)
		);

		this.displayUploads( uploads );
	};

	uw.ui.Upload.prototype.displayUploads = function ( uploads ) {
		let thumbPromise,
			$uploadInterfaceDivs = $( [] );

		uploads.forEach( ( upload ) => {
			// We'll attach all interfaces to the DOM at once rather than one-by-one, for better
			// performance
			$uploadInterfaceDivs = $uploadInterfaceDivs.add( upload.ui.$div );
		} );

		// Attach all interfaces to the DOM
		this.$fileList.append( $uploadInterfaceDivs );

		// Display thumbnails, but not all at once because they're somewhat expensive to generate.
		// This will wait for each thumbnail to be complete before starting the next one.
		thumbPromise = $.Deferred().resolve();
		uploads.forEach( ( upload ) => {
			thumbPromise = thumbPromise.then( () => {
				const deferred = $.Deferred();
				setTimeout( function () {
					if ( this.movedFrom ) {
						// We're no longer displaying any of these thumbnails, stop
						deferred.reject();
					}
					upload.ui.showThumbnail().done( () => {
						deferred.resolve();
					} );
				} );
				return deferred.promise();
			} );
		} );
	};

	uw.ui.Upload.prototype.addNextButton = function () {
		this.nextButtonPromise.done( () => {
			this.$buttons.append(
				$( '<div>' )
					.addClass( 'mwe-upwiz-file-next-all-ok mwe-upwiz-file-endchoice' )
					.append(
						new OO.ui.HorizontalLayout( {
							items: [
								new OO.ui.LabelWidget( {
									label: mw.message( 'mwe-upwiz-file-all-ok' ).text()
								} ),
								this.nextStepButtonAllOk
							]
						} ).$element
					)
			);

			this.$buttons.append(
				$( '<div>' )
					.addClass( 'mwe-upwiz-file-next-some-failed mwe-upwiz-file-endchoice' )
					.append(
						new OO.ui.HorizontalLayout( {
							items: [
								new OO.ui.LabelWidget( {
									label: mw.message( 'mwe-upwiz-file-some-failed' ).text()
								} ),
								this.retryButtonSomeFailed,
								this.nextStepButtonSomeFailed
							]
						} ).$element
					)
			);

			this.$buttons.append(
				$( '<div>' )
					.addClass( 'mwe-upwiz-file-next-all-failed mwe-upwiz-file-endchoice' )
					.append(
						new OO.ui.HorizontalLayout( {
							items: [
								new OO.ui.LabelWidget( {
									label: mw.message( 'mwe-upwiz-file-all-failed' ).text()
								} ),
								this.retryButtonAllFailed
							]
						} ).$element
					)
			);

			this.$buttons.append( this.$progress );
		} );
	};

	/**
	 * Hide the buttons for moving to the next step.
	 */
	uw.ui.Upload.prototype.hideEndButtons = function () {
		this.$div
			.find( '.mwe-upwiz-buttons .mwe-upwiz-file-endchoice' )
			.hide();
	};

	/**
	 * @param {boolean} show
	 */
	uw.ui.Upload.prototype.showNoticeForImageMetadata = function ( show ) {
		this.$div.find( '.mwe-upwiz-metadata-notice' ).toggle( show );
	};

	/**
	 * Shows an error dialog informing the user that some uploads have been omitted
	 * since they went over the max files limit.
	 *
	 * @param {number} filesUploaded The number of files that have been attempted to upload
	 */
	uw.ui.Upload.prototype.showTooManyFilesError = function ( filesUploaded ) {
		mw.errorDialog(
			mw.message(
				'mwe-upwiz-too-many-files-text',
				this.config.maxUploads,
				filesUploaded
			).text(),
			mw.message( 'mwe-upwiz-too-many-files' ).text()
		);
	};

	/**
	 * Shows an error dialog informing the user that an upload omitted because
	 * it is too large.
	 *
	 * @param {number} maxSize The max upload file size
	 * @param {number} size The actual upload file size
	 */
	uw.ui.Upload.prototype.showFileTooLargeError = function ( maxSize, size ) {
		mw.errorDialog(
			mw.message(
				'mwe-upwiz-file-too-large-text',
				uw.units.bytes( maxSize ),
				uw.units.bytes( size )
			).text(),
			mw.message( 'mwe-upwiz-file-too-large' ).text()
		);
	};

	/**
	 * @param {string} filename
	 * @param {string} extension
	 */
	uw.ui.Upload.prototype.showBadExtensionError = function ( filename, extension ) {
		const $errorMessage = $( '<p>' ).msg( 'mwe-upwiz-upload-error-bad-filename-extension', extension );
		this.showFilenameError( $errorMessage );
	};

	uw.ui.Upload.prototype.showMissingExtensionError = function () {
		const $errorMessage = $( '<p>' ).msg( 'mwe-upwiz-upload-error-bad-filename-no-extension' );
		this.showFilenameError(
			$( '<div>' ).append(
				$errorMessage,
				$( '<p>' ).msg( 'mwe-upwiz-allowed-filename-extensions' ),
				$( '<blockquote>' ).append( $( '<tt>' ).append(
					mw.UploadWizard.config.fileExtensions.join( ' ' )
				) )
			)
		);
	};

	/**
	 * @param {string} filename
	 * @param {string} basename
	 */
	uw.ui.Upload.prototype.showDuplicateError = function ( filename, basename ) {
		this.showFilenameError( $( '<p>' ).msg( 'mwe-upwiz-upload-error-duplicate-filename-error', basename ) );
	};

	/**
	 * @param {string} filename
	 */
	uw.ui.Upload.prototype.showUnparseableFilenameError = function ( filename ) {
		this.showFilenameError( mw.msg( 'mwe-upwiz-unparseable-filename', filename ) );
	};

	/**
	 * Shows an error dialog informing the user that an upload has been omitted
	 * over its filename.
	 *
	 * @param {jQuery|string} message The error message
	 */
	uw.ui.Upload.prototype.showFilenameError = function ( message ) {
		mw.errorDialog( message );
	};

	/**
	 * Checks whether flickr import is enabled and the current user has the rights to use it
	 *
	 * @return {boolean}
	 */
	uw.ui.Upload.prototype.isFlickrImportEnabled = function () {
		return this.config.UploadFromUrl && this.config.flickrApiKey !== '';
	};

	/**
	 * Initiates the Interface to upload media from Flickr.
	 * Called when the user clicks on the 'Add images from Flickr' button.
	 */
	uw.ui.Upload.prototype.flickrInterfaceInit = function () {
		// Hide containers for selecting files, and show the flickr interface instead
		this.$addFileContainer.hide();
		this.$flickrAddFileContainer.hide();
		this.$flickrContainer.show();
		this.flickrSelectButton.$element.show();
		this.flickrButton.setDisabled( false );

		// Insert form into the page
		this.$div.find( '#mwe-upwiz-files' ).prepend( this.$flickrContainer );

		this.flickrInput.focus();
	};

	/**
	 * Responsible for fetching license of the provided media.
	 *
	 * @param {mw.FlickrChecker} checker
	 */
	uw.ui.Upload.prototype.flickrChecker = function ( checker ) {
		const flickrInputUrl = this.flickrInput.getValue();

		checker.getLicenses().done( () => {
			checker.checkFlickr( flickrInputUrl );
		} );
	};

	/**
	 * Reset the interface if there is a problem while fetching the images from
	 * the URL entered by the user.
	 */
	uw.ui.Upload.prototype.flickrInterfaceReset = function () {
		// first destroy it completely, then reshow the add button
		this.flickrInterfaceDestroy();
		this.flickrButton.setDisabled( false );
		this.$flickrContainer.show();
		this.flickrSelectButton.$element.show();
	};

	/**
	 * Removes the flickr interface.
	 */
	uw.ui.Upload.prototype.flickrInterfaceDestroy = function () {
		this.flickrInput.setValue( '' );
		this.$flickrSelectList.empty();
		this.$flickrSelectListContainer.off().hide();
		this.$flickrContainer.hide();
		this.flickrButton.setDisabled( true );
		this.flickrSelectButton.$element.hide();
	};

}( mw.uploadWizard ) );
