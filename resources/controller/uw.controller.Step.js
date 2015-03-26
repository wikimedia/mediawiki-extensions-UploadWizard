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

( function ( uw, oo, $ ) {
	var SP;

	/**
	 * Represents a step in the wizard.
	 * @class mw.uw.controller.Step
	 * @mixins oo.EventEmitter
	 * @abstract
	 * @constructor
	 * @param {mw.uw.ui.Step} ui The UI object that controls this step.
	 * @param {Object} config The UW config object, or relevant subset.
	 */
	function Step( ui, config ) {
		oo.EventEmitter.call( this );

		/**
		 * @property {Object} config
		 */
		this.config = config;

		/**
		 * @property {number} uploadsTransitioning The number of uploads currently in this step and in transition.
		 */
		this.uploadsTransitioning = 0;

		this.ui = ui;
	}

	oo.mixinClass( Step, oo.EventEmitter );

	SP = Step.prototype;

	/**
	 * Empty the step of all data.
	 */
	SP.empty = function () {
		this.ui.empty();
	};

	/**
	 * Move to this step.
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	SP.moveTo = function ( uploads ) {
		this.uploads = uploads;
		this.ui.moveTo( uploads );
	};

	/**
	 * Move out of this step.
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	SP.moveFrom = function () {
		this.ui.moveFrom();
	};

	/**
	 * Count the number of empty (undefined) uploads in our list.
	 */
	SP.countEmpties = function () {
		var count = 0;

		$.each( this.uploads, function ( i, upload ) {
			if ( mw.isEmpty( upload ) ) {
				count += 1;
			}
		} );

		return count;
	};

	/**
	 * Update file counts for the step.
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @return {boolean} Whether there are uploads present in the list
	 */
	SP.updateFileCounts = function ( uploads ) {
		if ( uploads ) {
			this.uploads = uploads;
		} else {
			this.uploads = [];
		}

		if ( uploads.length - this.countEmpties() <= 0 ) {
			this.uploads = [];
			this.emit( 'no-uploads' );
			return false;
		}

		return true;
	};

	/**
	 * Perform this step's changes on all uploads. Replaces makeTransitioner
	 * in the UploadWizard class.
	 * @return {jQuery.Promise}
	 */
	SP.transitionAll = function () {
		var i,
			step = this,
			transpromises = [],
			uploadsQueued = [];

		function startNextUpload() {
			var ix, upload;

			// Run through uploads looking for one we can transition. In most
			// cases this will be the next upload.
			while ( uploadsQueued.length > 0 ) {
				ix = uploadsQueued.shift();
				upload = step.uploads[ix];

				if ( step.canTransition( upload ) ) {
					return step.transitionOne( upload ).then( startNextUpload );
				}
			}

			return $.Deferred().resolve();
		}

		$.each( this.uploads, function ( i, upload ) {
			if ( upload === undefined ) {
				return;
			}

			uploadsQueued.push( i );
		} );

		for ( i = 0; i < this.config.maxSimultaneousConnections; i++ ) {
			transpromises.push( startNextUpload() );
		}

		return $.when.apply( $, transpromises );
	};

	/**
	 * Check if upload is able to be put through this step's changes.
	 * @param {mw.UploadWizardUpload} upload
	 * @return {boolean}
	 */
	SP.canTransition = function () {
		return this.uploadsTransitioning < this.config.maxSimultaneousConnections;
	};

	/**
	 * Perform this step's changes on one upload.
	 * @return {jQuery.Promise}
	 */
	SP.transitionOne = function () {
		return $.Deferred().reject( 'Using default transitioner is not supported' );
	};

	uw.controller.Step = Step;
}( mediaWiki.uploadWizard, OO, jQuery ) );
