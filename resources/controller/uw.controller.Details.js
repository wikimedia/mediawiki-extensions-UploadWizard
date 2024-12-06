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
	 * Represents the details step in the wizard.
	 *
	 * @class
	 * @extends uw.controller.Step
	 * @param {mw.Api} api
	 * @param {Object} config UploadWizard config object.
	 */
	uw.controller.Details = function UWControllerDetails( api, config ) {
		uw.controller.Step.call(
			this,
			new uw.ui.Details()
				.on( 'start-details', this.startDetails.bind( this ) )
				.on( 'finalize-details-after-removal', this.moveNext.bind( this ) ),
			api,
			config
		);

		this.stepName = 'details';
		this.finishState = 'complete';

		this.queue = new uw.ConcurrentQueue( {
			count: this.config.maxSimultaneousConnections,
			action: this.transitionOne.bind( this )
		} );
	};

	OO.inheritClass( uw.controller.Details, uw.controller.Step );

	/**
	 * Move to this step.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	uw.controller.Details.prototype.load = function ( uploads ) {
		uw.controller.Step.prototype.load.call( this, uploads );

		// make sure queue is empty before starting this step
		this.queue.abortExecuting();

		this.uploads.forEach( ( upload ) => {
			// get existing details
			const serialized = upload.details ? upload.details.getSerialized() : null;

			this.createDetails( upload );
			upload.details.attach();

			// restore earlier details (user may have started inputting details,
			// then went back some steps, and now got here again)
			if ( serialized ) {
				upload.details.setSerialized( serialized );
			}
		} );

		// Show the widget allowing to copy selected metadata if there's more than one successful upload
		if ( this.config.copyMetadataFeature ) {
			this.addCopyMetadataFeature();
		}
	};

	uw.controller.Details.prototype.moveNext = function () {
		this.removeErrorUploads();

		uw.controller.Step.prototype.moveNext.call( this );
	};

	uw.controller.Details.prototype.addCopyMetadataFeature = function () {
		// uploads can only be edited when they're in a certain state:
		// a flat out upload failure or a completed upload can not be edited
		const invalidStates = [ 'aborted', 'error', 'complete' ],
			invalids = this.getUploadStatesCount( invalidStates ),
			valids = this.uploads.length - invalids;

		// no point in having this feature if there's no target to copy to
		if ( valids < 2 ) {
			return;
		}

		let first;
		// The first upload is not necessarily the one we want to copy from
		// E.g. the first upload could've gone through successfully, but the
		// rest failed because of abusefilter (or another recoverable error), in
		// which case we'll want the "copy" feature to appear below the 2nd
		// upload (or the first not-yet-completed not flat-out-failed upload)
		this.uploads.some( ( upload ) => {
			if ( upload && invalidStates.indexOf( upload.state ) === -1 ) {
				first = upload;
				return true; // Break Array.some loop
			}
			return false;
		} );

		// could not find a source upload to copy from
		if ( !first ) {
			return;
		}

		this.copyMetadataWidget = new uw.CopyMetadataWidget( {
			copyFrom: first,
			// Include the "source" upload in the targets too
			copyTo: this.uploads,
			captionsAvailable: this.config.wikibase.enabled && this.config.wikibase.captions
		} );
		this.copyMetadataField = new uw.FieldLayout( this.copyMetadataWidget, {
			label: $( '<span>' ).append(
				new OO.ui.IconWidget( { icon: 'expand' } ).$element,
				new OO.ui.IconWidget( { icon: 'collapse' } ).$element,
				' ',
				mw.msg( 'mwe-upwiz-copy-metadata-text' )
			),
			classes: [
				'mwe-upwiz-fieldLayout-additional-info', 'mwe-upwiz-copyMetadataWidget',
				'mwe-upwiz-fieldLayout-additional-info-clickable'
			]
		} );
		this.copyMetadataWidget.$element.makeCollapsible( {
			collapsed: true,
			$customTogglers: this.copyMetadataField.$element.find( '.oo-ui-fieldLayout-header' )
		} );
		// the field isn't actually required, but we want to hide the "optional" text
		this.copyMetadataField.setRequired( true );

		first.details.$form.append( this.copyMetadataField.$element );
	};

	uw.controller.Details.prototype.removeCopyMetadataFeature = function () {
		if ( this.copyMetadataField ) {
			this.copyMetadataField.$element.remove();
		}
	};

	/**
	 * @param {mw.UploadWizardUpload} upload
	 */
	uw.controller.Details.prototype.createDetails = function ( upload ) {
		// eslint-disable-next-line no-jquery/no-global-selector
		upload.details = new mw.UploadWizardDetails( upload, $( '#mwe-upwiz-macro-files' ) );
	};

	/**
	 * Start details submit.
	 * TODO move the rest of the logic here from mw.UploadWizard
	 */
	uw.controller.Details.prototype.startDetails = function () {
		this.validate( true )
			.always( ( status ) => this.showStatus( status ) )
			.done( () => {
				this.ui.hideEndButtons();
				this.submit();
			} );
	};

	/**
	 * Check details for validity.
	 *
	 * @param {boolean} thorough
	 * @return {jQuery.Promise<uw.ValidationStatus>}
	 */
	uw.controller.Details.prototype.validate = function ( thorough ) {
		const status = new uw.ValidationStatus(),
			titles = [],
			fieldPromises = [];

		this.uploads.forEach( ( upload ) => {
			// Seen this title before?
			let title = upload.details.getTitle();
			if ( title ) {
				title = title.getName() + '.' + mw.Title.normalizeExtension( title.getExtension() );
				if ( titles[ title ] ) {
					// Don't submit. Instead, set an error in details step.
					upload.details.setDuplicateTitleError();
					status.addError( mw.message( 'mwe-upwiz-error-title-duplicate' ) );
				} else {
					titles[ title ] = true;
				}
			}

			upload.details.getAllFields().forEach( ( fieldLayout ) => {
				fieldPromises.push( fieldLayout.validate( thorough ) );
			} );
		} );

		return uw.ValidationStatus.mergePromises(
			status.getErrors().length === 0 ? status.resolve() : status.reject(),
			...fieldPromises
		);
	};

	uw.controller.Details.prototype.canTransition = function ( upload ) {
		return (
			uw.controller.Step.prototype.canTransition.call( this, upload ) &&
			upload.state === this.stepName
		);
	};

	/**
	 * Perform this step's changes on one upload.
	 *
	 * @param {mw.UploadWizardUpload} upload
	 * @return {jQuery.Promise}
	 */
	uw.controller.Details.prototype.transitionOne = function ( upload ) {
		return upload.details.submit();
	};

	/**
	 * Perform this step's changes on all uploads.
	 *
	 * @return {jQuery.Promise}
	 */
	uw.controller.Details.prototype.transitionAll = function () {
		const deferred = $.Deferred();

		this.uploads.forEach( ( upload ) => {
			if ( this.canTransition( upload ) ) {
				this.queue.addItem( upload );
			}
		} );

		this.queue.on( 'complete', deferred.resolve );
		this.queue.startExecuting();

		return deferred.promise();
	};

	/**
	 * Submit details to the API.
	 *
	 * @return {jQuery.Promise}
	 */
	uw.controller.Details.prototype.submit = function () {
		this.uploads.forEach( ( upload ) => {
			// Clear error state
			if ( upload.state === 'error' || upload.state === 'recoverable-error' ) {
				upload.state = this.stepName;
			}

			// Set details view to have correct title
			upload.details.setVisibleTitle( upload.details.getTitle().getMain() );
		} );

		// Disable edit interface
		this.ui.disableEdits();
		this.removeCopyMetadataFeature();

		return this.transitionAll().then( () => {
			if ( this.showNext() ) {
				this.moveNext();
			}
		} );
	};

	/**
	 * Show errors, warnings & notices in the form.
	 * See UI class for more.
	 *
	 * @param {uw.ValidationStatus} status
	 */
	uw.controller.Details.prototype.showStatus = function ( status ) {
		this.ui.enableEdits();

		this.removeCopyMetadataFeature();
		this.addCopyMetadataFeature();

		this.ui.showStatus( status );
	};

	/**
	 * Handler for when an upload is removed.
	 *
	 * @param {mw.UploadWizardUpload} upload
	 */
	uw.controller.Details.prototype.removeUpload = function ( upload ) {
		uw.controller.Step.prototype.removeUpload.call( this, upload );

		this.queue.removeItem( upload );

		if ( upload.details && upload.details.$div ) {
			upload.details.$div.remove();
		}

		if ( this.uploads.length === 0 ) {
			// If we have no more uploads, go to the "Upload" step. (This will go to "Thanks" step,
			// which will skip itself in load() because there are no uploads left.)
			this.moveNext();
			return;
		}

		this.removeCopyMetadataFeature();
		// Make sure we still have more multiple uploads adding the
		// copy feature again
		if ( this.config.copyMetadataFeature ) {
			this.addCopyMetadataFeature();
		}
	};

}( mw.uploadWizard ) );
