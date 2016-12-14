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
		var controller = this;

		uw.controller.Step.prototype.load.call( this, uploads );

		// make sure queue is empty before starting this step
		this.queue.abortExecuting();

		$.each( this.uploads, function ( i, upload ) {
			var serialized;

			// get existing details
			serialized = upload.details ? upload.details.getSerialized() : null;

			controller.createDetails( upload );

			if ( upload.file.fromURL || ( upload.deedChooser && upload.deedChooser.deed.name === 'custom' ) ) {
				upload.details.useCustomDeedChooser();
			}

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
		var first,
			// uploads can only be edited when they're in a certain state:
			// a flat out upload failure or a completed upload can not be edited
			invalidStates = [ 'aborted', 'error', 'complete' ],
			invalids = this.getUploadStatesCount( invalidStates ),
			valids = this.uploads.length - invalids;

		// no point in having this feature if there's no target to copy to
		if ( valids < 2 ) {
			return;
		}

		// The first upload is not necessarily the one we want to copy from
		// E.g. the first upload could've gone through successfully, but the
		// rest failed because of abusefilter (or another recoverable error), in
		// which case we'll want the "copy" feature to appear below the 2nd
		// upload (or the first not-yet-completed not flat-out-failed upload)
		$.each( this.uploads, function ( i, upload ) {
			if ( upload && invalidStates.indexOf( upload.state ) === -1 ) {
				first = upload;
				return false;
			}
		} );

		// could not find a source upload to copy from
		if ( !first ) {
			return;
		}

		this.copyMetadataWidget = new uw.CopyMetadataWidget( {
			copyFrom: first,
			// Include the "source" upload in the targets too
			copyTo: this.uploads
		} );

		$( first.details.div ).after( this.copyMetadataWidget.$element );
	};

	uw.controller.Details.prototype.removeCopyMetadataFeature = function () {
		if ( this.copyMetadataWidget ) {
			this.copyMetadataWidget.$element.remove();
		}
	};

	/**
	 * @param {mw.UploadWizardUpload} upload
	 */
	uw.controller.Details.prototype.createDetails = function ( upload ) {
		upload.details = new mw.UploadWizardDetails( upload, $( '#mwe-upwiz-macro-files' ) );
		upload.details.populate();
		upload.details.attach();
	};

	/**
	 * Start details submit.
	 * TODO move the rest of the logic here from mw.UploadWizard
	 */
	uw.controller.Details.prototype.startDetails = function () {
		var details = this;

		this.valid().done( function ( valid ) {
			if ( valid ) {
				details.ui.hideEndButtons();
				details.submit();
			} else {
				details.showErrors();
			}
		} );
	};

	/**
	 * Check details for validity.
	 *
	 * @return {jQuery.Promise}
	 */
	uw.controller.Details.prototype.valid = function () {
		var
			detailsController = this,
			validityPromises = [],
			warningValidityPromises = [],
			titles = {};

		$.each( this.uploads, function ( i, upload ) {
			// Update any error/warning messages about all DetailsWidgets
			upload.details.checkValidity();

			warningValidityPromises.push( upload.details.getWarnings().then( function () {
				// iterate all arguments (which is an array of arrays of
				// warnings) and turn it into a one-dimensional warnings array
				var args = Array.prototype.slice.call( arguments ),
					warnings = args.reduce( function ( result, warnings ) {
						return result.concat( warnings );
					}, [] );

				if ( warnings.length ) {
					// One of the DetailsWidgets has warnings
					return $.Deferred().reject( warnings );
				}
			} ) );

			validityPromises.push( upload.details.getErrors().then( function () {
				var i, title, hasErrors = false;

				for ( i = 0; i < arguments.length; i++ ) {
					if ( arguments[ i ].length ) {
						// One of the DetailsWidgets has errors
						hasErrors = true;
					}
				}

				// Seen this title before?
				title = upload.details.getTitle();
				if ( title ) {
					title = title.getName() + '.' + mw.Title.normalizeExtension( title.getExtension() );
					if ( titles[ title ] ) {
						// Don't submit. Instead, set an error in details step.
						upload.details.setDuplicateTitleError();
						hasErrors = true;
					} else {
						titles[ title ] = true;
					}
				}

				if ( hasErrors ) {
					return $.Deferred().reject();
				}
			} ) );
		} );

		return $.when.apply( $, validityPromises ).then(
			function () {
				var i,
					warningPromises = [],
					combinedWarningPromise = $.Deferred();

				/*
				 * warningValidityPromises will be fail as soon as one of the
				 * promises is rejected. However, we want to know about *all*
				 * rejected promises, since they include the warning messages,
				 * and we'll want to show all of those warnings at once.
				 * Since we can't use warningValidityPromises's failure callback,
				 * we'll create other promises that will always resolve (with
				 * the rejected's warning messages).
				 */
				for ( i = 0; i < warningValidityPromises.length; i++ ) {
					warningPromises[ i ] = $.Deferred();
					warningValidityPromises[ i ].always( warningPromises[ i ].resolve );
				}

				/*
				 * warningPromises will now always resolve (see comment above)
				 * with a bunch of warnings (or undefined, for successful
				 * uploads)
				 * Now we can just wait for all of these to resolve, combine all
				 * warnings, and display the warning dialog!
				 */
				combinedWarningPromise = $.when.apply( $, warningPromises ).then( function () {
					// iterate all arguments (which is an array of arrays of
					// warnings) and turn it into a one-dimensional warnings array
					var args = Array.prototype.slice.call( arguments ),
						// args also includes `undefined`s, from uploads that
						// successfully resolved - we don't need those!
						filtered = args.filter( Array.isArray ),
						warnings = filtered.reduce( function ( result, warnings ) {
							return result.concat( warnings );
						}, [] );

					if ( warnings.length > 0 ) {
						// Update warning count before dialog
						detailsController.showErrors();
						return detailsController.confirmationDialog( warnings );
					}
				} );

				return $.when.apply( $, warningValidityPromises ).then(
					function () {
						// All uploads valid, no warnings
						return $.Deferred().resolve( true );
					},
					function () {
						// There were issues & they are being handled in this
						// other promise :)
						return combinedWarningPromise;
					}
				);
			},
			function () {
				return $.Deferred().resolve( false );
			}
		);
	};

	uw.controller.Details.prototype.confirmationDialog = function ( warnings ) {
		var i,
			$message = $( '<p>' ).text( mw.message( 'mwe-upwiz-dialog-warning' ).text() ),
			$ul = $( '<ul>' );

		// parse warning messages
		warnings = warnings.map( function ( warning ) {
			return warning.text();
		} );

		// omit duplicates
		warnings = warnings.filter( function ( warning, i, warnings ) {
			return warnings.indexOf( warning ) === i;
		} );

		for ( i = 0; i < warnings.length; i++ ) {
			$ul.append( $( '<li>' ).text( warnings[ i ] ) );
		}

		return OO.ui.confirm( $message.append( $ul ), {
			title: mw.message( 'mwe-upwiz-dialog-title' ).text()
		} );
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
		var
			deferred = $.Deferred(),
			details = this;

		$.each( this.uploads, function ( i, upload ) {
			if ( details.canTransition( upload ) ) {
				details.queue.addItem( upload );
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
		var details = this;

		$.each( this.uploads, function ( i, upload ) {
			// Clear error state
			if ( upload.state === 'error' || upload.state === 'recoverable-error' ) {
				upload.state = details.stepName;
			}

			// Set details view to have correct title
			upload.details.setVisibleTitle( upload.details.getTitle().getMain() );
		} );

		// Disable edit interface
		this.ui.disableEdits();
		this.ui.previousButton.$element.hide();
		this.removeCopyMetadataFeature();

		return this.transitionAll().then( function () {
			details.showErrors();

			if ( details.showNext() ) {
				details.moveNext();
			}
		} );
	};

	/**
	 * Show warnings and errors in the form.
	 * See UI class for more.
	 */
	uw.controller.Details.prototype.showErrors = function () {
		this.ui.previousButton.$element.show();

		this.removeCopyMetadataFeature();
		this.addCopyMetadataFeature();

		this.ui.showWarnings(); // Scroll to the warning first so that any errors will have precedence
		this.ui.showErrors();
	};

	/**
	 * Handler for when an upload is removed.
	 *
	 * @param {mw.UploadWizardUpload} upload
	 */
	uw.controller.Details.prototype.removeUpload = function ( upload ) {
		uw.controller.Step.prototype.removeUpload.call( this, upload );

		this.queue.removeItem( upload );

		if ( upload.details && upload.details.div ) {
			upload.details.div.remove();
		}

		if ( this.uploads.length === 0 ) {
			// If we have no more uploads, go to the "Upload" step. (This will go to "Thanks" step,
			// which will skip itself in load() because there are no uploads left.)
			uw.eventFlowLogger.logSkippedStep( this.stepName );
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

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
