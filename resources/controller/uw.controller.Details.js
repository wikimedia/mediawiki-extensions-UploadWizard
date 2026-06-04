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
		this.currentCaptchaData = null;
		this.captchaPromptedEagerly = false;

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

		// Render the CAPTCHA widget on entry to the Details step so the user can solve it
		// while filling out the form rather than being interrupted at publish time. The
		// widget is torn down on unload, so this re-arms on every visit.
		this.captchaPromptedEagerly = false;
		if ( this.shouldPromptCaptchaEagerly() ) {
			this.captchaPromptedEagerly = true;
			// On a load failure, drop the flag so the next Publish click re-attempts via submit().
			this.ui.showCaptcha( mw.UploadWizard.config.publishCaptchaType ).catch( () => {
				this.captchaPromptedEagerly = false;
			} );
		}

		// make sure queue is empty before starting this step
		this.queue.abortExecuting();

		this.uploads.forEach( ( upload ) => {
			// get existing details
			const serialized = upload.details ? upload.details.getSerialized() : null;

			this.createDetails( upload );
			upload.details.attach();
			upload.details.on( 'change', () => this.emit( 'change' ) );

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
			if ( upload && !invalidStates.includes( upload.state ) ) {
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
			.always( () => this.updateErrorSummary() )
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
		const titles = [],
			fieldPromises = [];

		this.uploads.forEach( ( upload ) => {
			// Seen this title before?
			let title = upload.details.getTitle();
			if ( title ) {
				title = title.getName() + '.' + mw.Title.normalizeExtension( title.getExtension() );
				upload.details.titleDetails.setIsDuplicate( title in titles );
				titles[ title ] = true;
			}

			upload.details.getAllFields().forEach( ( fieldLayout ) => {
				fieldPromises.push( fieldLayout.validate( thorough ) );
			} );
		} );

		return uw.ValidationStatus.mergePromises( ...fieldPromises );
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
		return upload.details.submit( this.currentCaptchaData );
	};

	/**
	 * Perform this step's changes on all uploads.
	 *
	 * @return {jQuery.Promise}
	 */
	uw.controller.Details.prototype.transitionAll = function () {
		const deferred = $.Deferred();
		const uploads = this.uploads.filter( ( upload ) => this.canTransition( upload ) );

		if ( this.hasCaptchaToken() && uploads.length > 1 ) {
			const [ first, ...rest ] = uploads;
			// First upload sets the timestamp for the last time a captcha was solved in the backend session
			// before the rest run in parallel.
			this.queue.once( 'progress', () => {
				if ( !first.captchaError ) {
					rest.forEach( ( upload ) => this.queue.addItem( upload ) );
				}
			} );
			this.queue.addItem( first );
		} else {
			uploads.forEach( ( upload ) => this.queue.addItem( upload ) );
		}

		this.queue.once( 'complete', deferred.resolve );
		this.queue.startExecuting();

		return deferred.promise();
	};

	uw.controller.Details.prototype.hasCaptchaToken = function () {
		return !!this.currentCaptchaData;
	};

	uw.controller.Details.prototype.consumeCaptchaError = function () {
		const failed = this.uploads.filter( ( upload ) => upload.captchaError );
		if ( failed.length === 0 ) {
			return null;
		}
		const pendingCaptchaData = failed[ 0 ].captchaError;
		failed.forEach( ( upload ) => {
			upload.captchaError = null;
		} );
		return pendingCaptchaData;
	};

	/**
	 * Submit details to the API.
	 *
	 * @return {Promise<void>}
	 */
	uw.controller.Details.prototype.submit = async function () {
		if ( this.shouldPromptCaptchaEagerly() ) {
			this.captchaPromptedEagerly = true;
			this.ui.cancelSubmitting();
			this.ui.showCaptcha( mw.UploadWizard.config.publishCaptchaType );
			return;
		}

		this.prepareUploadsForSubmit();
		this.ui.disableEdits();
		this.removeCopyMetadataFeature();

		await this.acquireCaptchaToken();
		await this.transitionAll();
		await this.finishSubmit();
	};

	/**
	 * Render the CAPTCHA widget before hitting the publish API. Server-side
	 * enforcement remains authoritative — the reactive error path covers a
	 * stale or bypassed flag.
	 *
	 * @return {boolean}
	 */
	uw.controller.Details.prototype.shouldPromptCaptchaEagerly = function () {
		return !this.captchaPromptedEagerly &&
			!!mw.UploadWizard.config.publishCaptchaRequired &&
			!!mw.UploadWizard.config.publishCaptchaType;
	};

	uw.controller.Details.prototype.prepareUploadsForSubmit = function () {
		this.uploads.forEach( ( upload ) => {
			// Clear error state
			if ( upload.state === 'error' || upload.state === 'recoverable-error' ) {
				upload.state = this.stepName;
			}

			// Set details view to have correct title
			upload.details.setVisibleTitle( upload.details.getTitle().getMain() );
		} );
	};

	uw.controller.Details.prototype.acquireCaptchaToken = async function () {
		try {
			this.currentCaptchaData = await this.ui.getCaptchaToken();
		} catch ( e ) {
			this.currentCaptchaData = null;
			this.ui.cancelSubmitting();
			this.addCopyMetadataFeature();
			throw new Error( 'captcha-cancelled' );
		}
	};

	uw.controller.Details.prototype.finishSubmit = async function () {
		this.currentCaptchaData = null;

		const failedCaptchaData = this.consumeCaptchaError();
		if ( failedCaptchaData ) {
			if ( await this.ui.showCaptcha( failedCaptchaData ).catch( () => false ) ) {
				// ConfirmEdit signalled the captcha re-validated silently —
				// re-fire publish without making the user click again.
				return this.submit();
			}
			this.ui.cancelSubmitting();
			this.addCopyMetadataFeature();
			return;
		}

		if ( this.showNext() ) {
			this.moveNext();
		}
	};

	/**
	 * Show errors, warnings & notices in the form.
	 * See UI class for more.
	 */
	uw.controller.Details.prototype.updateErrorSummary = function () {
		this.ui.enableEdits();

		this.removeCopyMetadataFeature();
		this.addCopyMetadataFeature();

		this.ui.updateErrorSummary();
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
