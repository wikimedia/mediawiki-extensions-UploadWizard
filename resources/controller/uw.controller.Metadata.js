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
	 * Represents the metadata step in the wizard.
	 *
	 * @class
	 * @extends uw.controller.Step
	 * @param {mw.Api} api
	 * @param {Object} config UploadWizard config object.
	 */
	uw.controller.Metadata = function UWControllerDetails( api, config ) {
		uw.controller.Step.call(
			this,
			new uw.ui.Metadata(),
			api,
			config
		);

		this.stepName = 'metadata';
		this.ui.connect( this, { submit: 'onSubmit' } );
	};

	OO.inheritClass( uw.controller.Metadata, uw.controller.Step );

	/**
	 * Move to this step.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	uw.controller.Metadata.prototype.load = function ( uploads ) {
		var pages;

		uw.controller.Step.prototype.load.call( this, uploads );

		this.booklet = new OO.ui.BookletLayout( {
			expanded: false,
			outlined: true,
			classes: [ 'mwe-upwiz-metadata-booklet' ]
		} );

		pages = this.generateBookletPages( uploads );
		this.booklet.addPages( pages );

		this.disableSubmit();
		this.booklet.selectFirstSelectablePage();
		this.ui.renderContent( this.booklet.$element );
	};

	/**
	 * Generate MetadataPage and MetadataContent objects for each file being uploaded.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads array of files being uploaded
	 * @return {uw.MetadataPage[]} array of MetadataPages for use in BookletLayout widget
	 */
	uw.controller.Metadata.prototype.generateBookletPages = function ( uploads ) {
		var self = this;

		return uploads.map( function ( upload ) {
			var content = new uw.MetadataContent( upload );
			content.connect( self, { change: 'enableSubmit' } );

			return new uw.MetadataPage( upload, {
				expanded: false,
				content: [ content ]
			} );
		} );
	};

	/**
	 * Enable the "publish data" button.
	 */
	uw.controller.Metadata.prototype.enableSubmit = function () {
		this.ui.disableNextButton( false );
	};

	/**
	 * Disable the "publish data" button.
	 */
	uw.controller.Metadata.prototype.disableSubmit = function () {
		this.ui.disableNextButton( true );
	};

	/**
	 * Submit the data for all pages/files
	 */
	uw.controller.Metadata.prototype.onSubmit = function () {
		var queue = $.Deferred().resolve().promise(),
			uploads = Object.keys( this.booklet.pages ),
			self = this;

		this.setPending();

		// Collect each statement from each page into a single array
		uploads.forEach( function ( upload ) {
			self.booklet.pages[ upload ].getStatements().forEach( function ( statement ) {
				queue = queue.then( statement.submit.bind( statement, undefined ) );
			} );
		} );

		// Wait until all requests are finished, and move forward if successful;
		// Always remove the pending overlay so that user can attempt to
		// re-submit if something goes wrong.
		queue
			.then( this.moveNext.bind( this ) )
			.always( this.removePending.bind( this ) );
	};

	/**
	 * Display an indicator element (spinner + overlay) after the user has
	 * submitted data.
	 */
	uw.controller.Metadata.prototype.setPending = function () {
		var $div = this.ui.$div;
		this.$overlay = $( '<div>', { class: 'mwe-upwiz-metadata-pendingOverlay' } );
		this.$spinner = $.createSpinner( {
			size: 'large',
			type: 'block',
			id: 'mwe-upwiz-metadata-pendingSpinner',
			class: 'mwe-upwiz-metadata-pendingSpinner'
		} );

		this.$spinner.appendTo( this.$overlay );
		this.$overlay.appendTo( $div );
	};

	/**
	 * Remove the pending indicator (overlay + spinner) from the page.
	 */
	uw.controller.Metadata.prototype.removePending = function () {
		this.$overlay.remove();
	};

}( mw.uploadWizard ) );
