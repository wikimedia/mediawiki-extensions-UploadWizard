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

( function ( mw, uw, $, oo ) {
	var DP;

	/**
	 * Deed step controller.
	 * @param {mw.Api} api
	 * @param {Object} config Only the licensing section of the UploadWizard config.
	 */
	function Deed( api, config ) {
		this.api = api;

		uw.controller.Step.call(
			this,
			new uw.ui.Deed()
				.connect( this, {
					'next-step': 'validate'
				} ),
			config
		);

		this.stepName = 'deeds';
	}

	oo.inheritClass( Deed, uw.controller.Step );

	DP = Deed.prototype;

	DP.validate = function () {
		// validate has the side effect of notifying the user of problems, or removing existing notifications.
		// if returns false, you can assume there are notifications in the interface.
		if ( this.deedChooser.valid() ) {
			this.emit( 'next-step' );
		}
	};

	/**
	 * Move to this step.
	 */
	DP.moveTo = function ( uploads ) {
		var customDeed, deeds,
			showDeed = false,
			step = this;

		uw.controller.Step.prototype.moveTo.call( this, uploads );

		$.each( this.uploads, function ( i, upload ) {
			if ( !upload.fromURL ) {
				showDeed = true;
				return false;
			}
		} );

		// If all of the uploads are from URLs, then we know the licenses
		// already, we don't need this step.
		if ( !showDeed ) {
			this.moveFrom();
			return;
		}

		deeds = mw.UploadWizard.getLicensingDeeds( this.uploads.length, this.config );

		// if we have multiple uploads, also give them the option to set
		// licenses individually
		if ( this.uploads.length > 1 && this.shouldShowIndividualDeed( this.config ) ) {
			customDeed = $.extend( new mw.UploadWizardDeed(), {
				valid: function () { return true; },
				name: 'custom'
			} );
			deeds.push( customDeed );
		}

		this.deedChooser = new mw.UploadWizardDeedChooser(
			this.config,
			'#mwe-upwiz-deeds',
			deeds,
			this.uploads
		);

		$( '<div>' )
			.insertBefore( this.deedChooser.$selector.find( '.mwe-upwiz-deed-ownwork' ) )
			.msg( 'mwe-upwiz-deeds-macro-prompt', this.uploads.length, mw.user );

		$.each( uploads, function ( i, upload ) {
			// Add previews and details to the DOM
			if ( !upload.fromURL ) {
				upload.deedPreview = new uw.ui.DeedPreview( upload, step.config );
			}
		} );

		this.deedChooser.onLayoutReady();
	};

	/**
	 * Check whether we should give the user the option to choose licenses for
	 * individual files on the details step.
	 * @private
	 */
	DP.shouldShowIndividualDeed = function ( config ) {
		var ownWork;

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
	 * Empty out all upload information.
	 */
	DP.empty = function () {
		if ( this.deedChooser !== undefined ) {
			this.deedChooser.remove();
		}
	};

	uw.controller.Deed = Deed;
}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
