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

( function ( mw, uw ) {
	/**
	 * Represents a generic deed.
	 *
	 * @class uw.deed.Abstract
	 * @constructor
	 * @param {string} name The name of this step
	 * @param {Object} config The UW config
	 */
	uw.deed.Abstract = function UWDeedInterface( name, config ) {
		this.name = name;
		this.config = config;
		uw.deed.Abstract.prototype.instanceCount++;
		this.instanceCount = uw.deed.Abstract.prototype.instanceCount;
	};

	/**
	 * @type {number}
	 */
	uw.deed.Abstract.prototype.instanceCount = 0;

	/**
	 * @return {number}
	 */
	uw.deed.Abstract.prototype.getInstanceCount = function () {
		return this.instanceCount;
	};

	/**
	 * @return {uw.FieldLayout[]} Fields that need validation
	 */
	uw.deed.Abstract.prototype.getFields = function () {
		return [];
	};

	/**
	 * @param {jQuery} $selector
	 */
	/* eslint-disable no-unused-vars */
	uw.deed.Abstract.prototype.setFormFields = function ( $selector ) {};
	/* eslint-enable no-unused-vars */

	/* eslint-disable valid-jsdoc */
	/**
	 * @return {string}
	 */
	/* eslint-enable valid-jsdoc */
	uw.deed.Abstract.prototype.getSourceWikiText = function () {
		throw new Error( 'Not implemented.' );
	};

	/* eslint-disable valid-jsdoc */
	/**
	 * @return {string}
	 */
	/* eslint-enable valid-jsdoc */
	uw.deed.Abstract.prototype.getAuthorWikiText = function () {
		throw new Error( 'Not implemented.' );
	};

	/* eslint-disable valid-jsdoc */
	/**
	 * Get wikitext representing the licenses selected in the license object
	 *
	 * @return {string} wikitext of all applicable license templates.
	 */
	/* eslint-enable valid-jsdoc */
	uw.deed.Abstract.prototype.getLicenseWikiText = function () {
		throw new Error( 'Not implemented.' );
	};

	/**
	 * @return {Object}
	 */
	uw.deed.Abstract.prototype.getSerialized = function () {
		return {
			name: this.name
		};
	};

	/**
	 * @param {Object} serialized
	 */
	uw.deed.Abstract.prototype.setSerialized = function ( serialized ) {
		if ( serialized.name ) {
			this.name = serialized.name;
		}
	};

	/**
	 * @param {mw.UploadWizardUpload[]} uploads Array of uploads
	 * @return {number}
	 */
	uw.deed.Abstract.prototype.get3DCount = function ( uploads ) {
		var extensions = this.config.patents ? this.config.patents.extensions : [],
			threeDCount = 0;

		$.each( uploads, function ( i, upload ) {
			if ( $.inArray( upload.title.getExtension().toLowerCase(), extensions ) >= 0 ) {
				threeDCount++;
			}
		} );

		return threeDCount;
	};

	/**
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @return {uw.FieldLayout}
	 */
	uw.deed.Abstract.prototype.getPatentAgreementField = function ( uploads ) {
		var field = new OO.ui.HiddenInputWidget();
		field.getErrors = this.getPatentAgreementErrors.bind( this, field, uploads );
		field.getWarnings = $.Deferred().resolve( [] ).promise.bind();

		return new uw.FieldLayout( field );
	};

	/**
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @return {uw.PatentDialog}
	 */
	uw.deed.Abstract.prototype.getPatentDialog = function ( uploads ) {
		var config = { panels: [ 'warranty' ] };

		// Only show filename list when in "details" step & we're showing the dialog for individual files
		if ( uploads[ 0 ] && uploads[ 0 ].state === 'details' ) {
			config.panels.unshift( 'filelist' );
		}

		return new uw.PatentDialog( config, this.config, uploads );
	};

	/**
	 * @param {OO.ui.InputWidget} input
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @param {boolean} thorough
	 * @return {jQuery.Promise}
	 */
	uw.deed.Abstract.prototype.getPatentAgreementErrors = function ( input, uploads, thorough ) {
		var deed = this,
			windowManager, dialog, deferred;

		// We only want to test this on submit
		if ( !thorough ) {
			return $.Deferred().resolve( [] ).promise();
		}

		if ( this.patentAgreed !== true ) {
			deferred = $.Deferred();
			windowManager = new OO.ui.WindowManager();
			dialog = this.getPatentDialog( uploads );

			$( 'body' ).append( windowManager.$element );
			windowManager.addWindows( [ dialog ] );
			windowManager.openWindow( dialog );

			dialog.on( 'disagree', function () {
				deferred.resolve( [ mw.message( 'mwe-upwiz-error-patent-disagree' ) ] );
			} );
			dialog.on( 'agree', function () {
				deed.patentAgreed = true;
				deferred.resolve( [] );
			} );

			return deferred.promise();
		} else {
			return $.Deferred().resolve( [] ).promise();
		}
	};
}( mediaWiki, mediaWiki.uploadWizard ) );
