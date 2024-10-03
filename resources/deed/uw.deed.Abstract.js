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
	 * Represents a generic deed.
	 *
	 * @class
	 * @param {string} name The name of this step
	 * @param {Object} config The UW config
	 * @param {mw.UploadWizardUpload[]} uploads Array of uploads that this deed refers to
	 */
	uw.deed.Abstract = function UWDeedInterface( name, config, uploads ) {
		var tcName, details, field, input;
		this.name = name;
		this.config = config;
		uw.deed.Abstract.prototype.instanceCount++;
		this.instanceCount = uw.deed.Abstract.prototype.instanceCount;

		this.templateOptions = {};
		if ( config.templateOptions && config.templateOptions[ name ] ) {
			for ( tcName in this.config.templateOptions[ name ] ) {
				details = this.config.templateOptions[ name ][ tcName ];
				input = new OO.ui.CheckboxInputWidget( {
					name: tcName,
					value: details.template
				} );
				field = new uw.FieldLayout(
					input,
					{
						label: mw.message(
							details.label,
							uploads.length,
							mw.user
						).parse(),
						align: 'inline',
						required: true // not really required, set true so "optional" won't display
					}
				);
				this.templateOptions[ tcName ] = {
					field: field,
					input: input
				};
			}
		}
	};

	/**
	 * @type {number}
	 */
	uw.deed.Abstract.prototype.instanceCount = 0;

	uw.deed.Abstract.prototype.unload = function () {};

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
	uw.deed.Abstract.prototype.setFormFields = function () {};

	/**
	 * @method
	 * @abstract
	 * @param {mw.UploadWizardUpload} upload
	 * @return {string}
	 */
	uw.deed.Abstract.prototype.getSourceWikiText = null;

	/**
	 * @method
	 * @abstract
	 * @param {mw.UploadWizardUpload} upload
	 * @return {string}
	 */
	uw.deed.Abstract.prototype.getAuthorWikiText = null;

	/**
	 * Get wikitext representing the licenses selected in the license object
	 *
	 * @method
	 * @abstract
	 * @param {mw.UploadWizardUpload} upload
	 * @return {string} wikitext of all applicable license templates.
	 */
	uw.deed.Abstract.prototype.getLicenseWikiText = null;

	/**
	 * @return {Object}
	 */
	uw.deed.Abstract.prototype.getSerialized = function () {
		var name, selectedTemplateOptions = [];
		for ( name in this.templateOptions ) {
			if ( this.templateOptions[ name ].input.isSelected() ) {
				selectedTemplateOptions.push( name );
			}
		}
		return {
			name: this.name,
			selectedTemplateOptions: selectedTemplateOptions
		};
	};

	/**
	 * @param {Object} serialized
	 */
	uw.deed.Abstract.prototype.setSerialized = function ( serialized ) {
		var self = this;
		if ( serialized.name ) {
			this.name = serialized.name;
		}
		serialized.selectedTemplateOptions.forEach( ( name ) => {
			self.templateOptions[ name ].input.setSelected( true );
		} );
	};

	/**
	 * @param {mw.UploadWizardUpload} upload
	 * @return {boolean}
	 */
	uw.deed.Abstract.prototype.needsPatentAgreement = function ( upload ) {
		var extensions = this.config.patents ? this.config.patents.extensions : [];

		return extensions.indexOf( upload.title.getExtension().toLowerCase() ) !== -1;
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

			$( document.body ).append( windowManager.$element );
			windowManager.addWindows( [ dialog ] );
			windowManager.openWindow( dialog );

			dialog.on( 'disagree', () => {
				deferred.resolve( [ mw.message( 'mwe-upwiz-error-patent-disagree' ) ] );
			} );
			dialog.on( 'agree', () => {
				deed.patentAgreed = true;
				deferred.resolve( [] );
			} );

			return deferred.promise();
		} else {
			return $.Deferred().resolve( [] ).promise();
		}
	};

	/**
	 * @return {string}
	 */
	uw.deed.Abstract.prototype.getTemplateOptionsWikiText = function () {
		var name, option, wikitext = '';
		for ( name in this.templateOptions ) {
			option = this.templateOptions[ name ].input;
			if ( option.isSelected() ) {
				wikitext += option.getValue();
			}
		}
		return wikitext;
	};

	/**
	 * Only implemented for OwnWork
	 */
	uw.deed.Abstract.prototype.getAiPromptWikitext = function () {};

}( mw.uploadWizard ) );
