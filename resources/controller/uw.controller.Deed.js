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
	 * Deed step controller.
	 *
	 * @class
	 * @extends uw.controller.Step
	 * @param {mw.Api} api
	 * @param {Object} config UploadWizard config object.
	 */
	uw.controller.Deed = function UWControllerDeed( api, config ) {
		uw.controller.Step.call(
			this,
			new uw.ui.Deed(),
			api,
			config
		);

		this.stepName = 'deeds';
	};
	OO.inheritClass( uw.controller.Deed, uw.controller.Step );

	uw.controller.Deed.prototype.moveNext = function () {
		const deedChoosers = this.getUniqueDeedChoosers( this.uploads );

		if ( deedChoosers.length === 0 ) {
			uw.controller.Step.prototype.moveNext.call( this );
			return;
		}

		this.validate( true )
			.always( () => this.ui.updateErrorSummary() )
			.done( () => uw.controller.Step.prototype.moveNext.call( this ) );
	};

	uw.controller.Deed.prototype.unload = function () {
		const deedChoosers = this.getUniqueDeedChoosers( this.uploads );
		uw.controller.Step.prototype.unload.call( this );

		// serialize the first deed so we can use it to pre-populate the choices if someone is
		// uploading files in batches
		this.uploadedDeedSerialization =
			deedChoosers[ Object.keys( deedChoosers )[ 0 ] ].getSerialized();

		deedChoosers.forEach( ( deedChooser ) => {
			deedChooser.remove();
		} );
	};

	/**
	 * Move to this step.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads
	 */
	uw.controller.Deed.prototype.load = function ( uploads ) {
		// select "provide same information for all files" by default
		let defaultDeedInterface = 'common';
		const localUploads = uploads.filter( ( upload ) => {
				let deed;
				if ( upload.file.fromURL ) {
					// external uploads should get a custom deed...
					deed = new uw.deed.Custom( this.config, upload );
					upload.deedChooser = new mw.UploadWizardDeedChooser(
						this.config,
						{ [ deed.name ]: deed },
						[ upload ]
					);
					upload.deedChooser.selectDeed( deed );
					// ... and be filtered out of the list for which to select a license
					return false;
				}
				return true;
			} ),
			// figure out how many unique deed choosers there were, so
			// we can restore the same (common/individual) interface
			uniqueExistingDeedChoosers = this.getUniqueDeedChoosers( localUploads ),
			// grab a serialized copy of previous deeds' details (if any)
			serializedDeeds = localUploads.reduce( ( map, upload ) => {
				if ( upload.deedChooser ) {
					map[ upload.getFilename() ] = upload.deedChooser.getSerialized();
				}
				return map;
			}, {} ),
			showDeed = localUploads.length > 0,
			fromStepName = uploads[ 0 ].state;

		uw.controller.Step.prototype.load.call( this, uploads );

		// If all of the uploads are from URLs, then we know the licenses
		// already, we don't need this step.
		if ( !showDeed ) {
			// this is a bit of a hack: when images from flickr are uploaded, we
			// don't get to choose the license anymore, and this step will be
			// skipped ... but we could reach this step from either direction
			if ( fromStepName === 'details' ) {
				this.movePrevious();
			} else {
				this.moveNext();
			}
			return;
		}

		const multiDeedRadio = new OO.ui.RadioSelectWidget( {
			classes: [ 'mwe-upwiz-source-multiple' ],
			items: [
				new OO.ui.RadioOptionWidget( {
					label: mw.message(
						'mwe-upwiz-source-multiple-label-common',
						localUploads.length,
						mw.user
					).parse(),
					data: 'common'
				} ),
				new OO.ui.RadioOptionWidget( {
					label: mw.message(
						'mwe-upwiz-source-multiple-label-individual',
						localUploads.length,
						mw.user
					).parse(),
					data: 'individual'
				} )
			]
		} );

		// if we have multiple uploads, also give them the option to set
		// licenses individually
		if ( localUploads.length > 1 && this.shouldShowIndividualDeed( this.config ) ) {
			this.ui.showMultiDeedRadio( multiDeedRadio );

			if ( uniqueExistingDeedChoosers.length > 1 ) {
				// we also had more than 1 deed in the past, so default
				// to loading the individual deed selection
				defaultDeedInterface = 'individual';
			}
		}

		// wire up handler to toggle common/individual deed selection forms
		multiDeedRadio.on( 'select', ( selectedOption ) => {
			if ( selectedOption.getData() === 'common' ) {
				this.loadCommon( localUploads );
			} else if ( selectedOption.getData() === 'individual' ) {
				this.loadIndividual( localUploads );
			}
			this.emit( 'change' );
		} );

		multiDeedRadio.selectItemByData( defaultDeedInterface );

		// restore serialized data (if any)
		uploads.forEach( ( upload ) => {
			if ( serializedDeeds[ upload.getFilename() ] ) {
				upload.deedChooser.setSerialized( serializedDeeds[ upload.getFilename() ] );
			} else if ( this.uploadedDeedSerialization ) {
				upload.deedChooser.setSerialized( this.uploadedDeedSerialization );
			}
		} );
	};

	/**
	 * Loads the deed form for providing information for a single file, or multiple
	 * files all at once.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads
	 */
	uw.controller.Deed.prototype.loadCommon = function ( uploads ) {
		const deeds = this.getLicensingDeeds( uploads ),
			deedChooser = new mw.UploadWizardDeedChooser(
				this.config,
				deeds,
				uploads
			);

		uploads.forEach( ( upload ) => {
			upload.deedChooser = deedChooser;
		} );

		this.ui.showCommonForm( deedChooser );

		// reveal next button when deed has been chosen
		deedChooser.on( 'choose', this.enableNextIfAllDeedsChosen.bind( this ) );
		this.enableNextIfAllDeedsChosen();

		// aggregate change events within
		deedChooser.on( 'choose', () => this.emit( 'change' ) );
		Object.keys( deeds ).forEach( ( name ) => {
			deeds[ name ].on( 'change', () => this.emit( 'change' ) );
		} );
	};

	/**
	 * Loads the deed form for providing individual license information per file.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads
	 */
	uw.controller.Deed.prototype.loadIndividual = function ( uploads ) {
		uploads.forEach( ( upload ) => {
			const deeds = this.getLicensingDeeds( uploads ),
				deedChooser = new mw.UploadWizardDeedChooser(
					this.config,
					deeds,
					[ upload ]
				);

			upload.deedChooser = deedChooser;

			// reveal next button when deeds for all files have been chosen
			deedChooser.on( 'choose', this.enableNextIfAllDeedsChosen.bind( this ) );

			// aggregate change events within
			deedChooser.on( 'choose', () => this.emit( 'change' ) );
			Object.keys( deeds ).forEach( ( name ) => {
				deeds[ name ].on( 'change', () => this.emit( 'change' ) );
			} );
		} );

		this.ui.showIndividualForm( this.getUniqueDeedChoosers( uploads ) );

		this.enableNextIfAllDeedsChosen();
	};

	/**
	 * Check whether we should give the user the option to choose licenses for
	 * individual files on the details step.
	 *
	 * @private
	 * @param {Object} config
	 * @return {boolean}
	 */
	uw.controller.Deed.prototype.shouldShowIndividualDeed = function ( config ) {
		let ownWork;
		if ( config.licensing.ownWorkDefault === 'choice' ) {
			return true;
		} else if ( config.licensing.ownWorkDefault === 'own' ) {
			ownWork = config.licensing.ownWork;
			return ownWork.licenses.length > 1;
		} else {
			return true; // TODO: might want to have similar behaviour here
		}
	};

	/**
	 * Get the own work and third party licensing deeds if they are needed.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @return {mw.deed.Abstract[]}
	 */
	uw.controller.Deed.prototype.getLicensingDeeds = function ( uploads ) {
		const deeds = {};
		let doOwnWork = false,
			doThirdParty = false;

		if ( this.config.licensing.ownWorkDefault === 'choice' ) {
			doOwnWork = doThirdParty = true;
		} else if ( this.config.licensing.ownWorkDefault === 'own' ) {
			doOwnWork = true;
		} else {
			doThirdParty = true;
		}

		if ( doOwnWork ) {
			const deed = new uw.deed.OwnWork( this.config, uploads, this.api );
			deeds[ deed.name ] = deed;
		}
		if ( doThirdParty ) {
			const deed = new uw.deed.ThirdParty( this.config, uploads, this.api );
			deeds[ deed.name ] = deed;
		}

		return deeds;
	};

	/**
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @return {mw.UploadWizardDeedChooser[]}
	 */
	uw.controller.Deed.prototype.getUniqueDeedChoosers = function ( uploads ) {
		return uploads.reduce( ( uniques, upload ) => {
			if ( upload.deedChooser && uniques.indexOf( upload.deedChooser ) < 0 ) {
				uniques.push( upload.deedChooser );
			}
			return uniques;
		}, [] );
	};

	/**
	 * Checks deeds for validity.
	 *
	 * @param {boolean} thorough
	 * @return {jQuery.Promise<uw.ValidationStatus>}
	 */
	uw.controller.Deed.prototype.validate = function ( thorough ) {
		const deedChoosers = this.getUniqueDeedChoosers( this.uploads ),
			deedPromises = this.getUniqueDeedChoosers( this.uploads ).map( ( deedChooser ) => deedChooser.validate( thorough ) ),
			mergedPromise = uw.ValidationStatus.mergePromises( ...deedPromises );

		return mergedPromise.then(
			( status ) => {
				if ( thorough !== true ) {
					return status;
				}

				// if (and only if) deed choosers are selected, we'll validate their contents
				const fieldPromises = [];
				deedChoosers.forEach( ( deedChooser ) => {
					deedChooser.deed.getFields().forEach( ( fieldLayout ) => {
						fieldPromises.push( fieldLayout.validate( thorough ) );
					} );
				} );
				return uw.ValidationStatus.mergePromises( mergedPromise, ...fieldPromises );
			}
		);
	};

	/**
	 * Enable/disable the next button based on whether all deeds have been chosen.
	 */
	uw.controller.Deed.prototype.enableNextIfAllDeedsChosen = function () {
		// Note: wrapping this inside setTimeout to ensure this is added
		// at the end of the call stack; otherwise, due to how this is all
		// set up, timing can be unpredictable: when re-loading the form
		// after coming back from a later step, this ends being called more
		// than once - both uninitialized (where it should not be visible),
		// and initialized (after resetting the serialized state), where
		// the event handlers end up invoking this.
		// Stuffing this inside a setTimeout helps ensure that things
		// actually execute in the order they're supposed to; i.e. the order
		// they've been called in.
		setTimeout( () => {
			this.validate( false ).always( ( status ) => {
				this.ui.updateErrorSummary();
				this.ui.toggleNext( status.getErrors().length === 0 );
			} );
		} );
	};

}( mw.uploadWizard ) );
