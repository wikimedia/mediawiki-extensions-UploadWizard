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
	 * Set up the form and deed object for the deed option that says these uploads are the work of a third party.
	 *
	 * @class uw.deed.ThirdParty
	 * @constructor
	 * @param {Object} config The UW config
	 * @param {mw.UploadWizardUpload[]} uploads Array of uploads that this deed refers to
	 * @param {mw.Api} api API object - useful for doing previews
	 */
	uw.deed.ThirdParty = function UWDeedThirdParty( config, uploads, api ) {
		var deed = this;

		uw.deed.Abstract.call( this, 'thirdparty', config );

		this.uploadCount = uploads.length;
		this.threeDCount = uploads.filter( this.needsPatentAgreement.bind( this ) ).length;

		this.sourceInput = new OO.ui.TextInputWidget( {
			classes: [ 'mwe-source' ],
			name: 'source'
		} );
		this.sourceInput.$input.attr( 'id', 'mwe-source-' + this.getInstanceCount() );
		// See uw.DetailsWidget
		this.sourceInput.getErrors = function () {
			var
				errors = [],
				minLength = deed.config.minSourceLength,
				maxLength = deed.config.maxSourceLength,
				text = this.getValue().trim();

			// input not required when "this is AI generated media" is selected
			if ( deed.templateCheckboxes.aiGenerated && deed.templateCheckboxes.aiGenerated.input.isSelected() ) {
				return [];
			}

			if ( text === '' ) {
				errors.push( mw.message( 'mwe-upwiz-error-question-blank' ) );
			} else if ( text.length < minLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-too-short', minLength ) );
			} else if ( text.length > maxLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-too-long', maxLength ) );
			}

			return $.Deferred().resolve( errors ).promise();
		};
		// See uw.DetailsWidget
		this.sourceInput.getWarnings = function () {
			return $.Deferred().resolve( [] ).promise();
		};
		this.sourceInputField = new uw.FieldLayout( this.sourceInput, {
			label: $( '<li>' ).msg( 'mwe-upwiz-source-text' ),
			required: true
		} );

		this.authorInput = new OO.ui.TextInputWidget( {
			classes: [ 'mwe-author' ],
			name: 'author'
		} );
		this.authorInput.$input.attr( 'id', 'mwe-author-' + this.getInstanceCount() );
		this.authorInput.getErrors = function () {
			var
				errors = [],
				minLength = deed.config.minAuthorLength,
				maxLength = deed.config.maxAuthorLength,
				text = this.getValue().trim();

			if ( this.isDisabled() ) {
				return [];
			}

			if ( text === '' ) {
				errors.push( mw.message( 'mwe-upwiz-error-question-blank' ) );
			} else if ( text.length < minLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-too-short', minLength ) );
			} else if ( text.length > maxLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-too-long', maxLength ) );
			}

			return $.Deferred().resolve( errors ).promise();
		};
		// See uw.DetailsWidget
		this.authorInput.getWarnings = function () {
			return $.Deferred().resolve( [] ).promise();
		};
		this.authorInputField = new uw.FieldLayout( this.authorInput, {
			label: $( '<li>' ).msg( 'mwe-upwiz-author-text' ),
			required: true
		} );

		this.licenseInput = new mw.UploadWizardLicenseInput(
			this.config.licensing.thirdParty,
			this.uploadCount,
			api
		);
		this.licenseInput.$element.addClass( 'mwe-upwiz-deed-license-groups' );
		this.licenseInput.setDefaultValues();
		this.licenseInputField = new uw.FieldLayout( this.licenseInput, {
			label: $( '<li>' ).msg( 'mwe-upwiz-source-thirdparty-cases-text', this.uploadCount ),
			help: mw.message( 'mwe-upwiz-tooltip-thirdparty-license' ).text(),
			required: true
		} );

		if ( this.threeDCount > 0 ) {
			this.patentAgreementField = this.getPatentAgreementField( uploads );
		}
	};

	OO.inheritClass( uw.deed.ThirdParty, uw.deed.Abstract );

	uw.deed.ThirdParty.prototype.unload = function () {
		this.licenseInput.unload();
	};

	/**
	 * @return {uw.FieldLayout[]} Fields that need validation
	 */
	uw.deed.ThirdParty.prototype.getFields = function () {
		var fields = [ this.authorInputField, this.sourceInputField, this.licenseInputField ];
		if ( this.threeDCount > 0 ) {
			fields.push( this.patentAgreementField );
		}
		return fields;
	};

	uw.deed.ThirdParty.prototype.setFormFields = function ( $selector ) {
		var $formFields = $( '<div>' ).addClass( 'mwe-upwiz-deed-form-internal' ), self = this;

		this.$form = $( '<form>' );

		$formFields.append(
			$( '<div>' )
				.addClass( 'mwe-upwiz-source-thirdparty-explain' )
				.msg( 'mwe-upwiz-source-thirdparty-explain' )
		);

		if ( this.uploadCount > 1 ) {
			$formFields.append(
				$( '<div>' )
					.addClass( 'mwe-upwiz-source-thirdparty-custom-multiple-intro' )
					.msg( 'mwe-upwiz-source-thirdparty-custom-multiple-intro' )
			);
		}

		$formFields.append(
			$( '<ol>' ).append(
				$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-license' )
					.append( this.licenseInputField.$element ),
				$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-fields' )
					.append( this.sourceInputField.$element ),
				$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-fields' )
					.append( this.authorInputField.$element )
			)
		);

		if ( this.templateCheckboxes.aiGenerated ) {
			// add the element inside sourceInputField so any error msgs will be displayed for
			// the field (containing the text input and checkbox) rather than just the text input
			this.sourceInput.$element.after(
				$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-checkbox' )
					.append( this.templateCheckboxes.aiGenerated.field.$element )
			);
			this.templateCheckboxes.aiGenerated.input.$element.on( 'change', function () {
				self.updateAuthorFieldForAI();
			} );

			// Set up ai-relevant help text for the author input field that can be shown
			// whenever the checkbox is selected
			this.authorInputField.help = new OO.ui.LabelWidget( {
				label: $( '<div>' ).msg( 'mwe-upwiz-author-text-ai-help' )
			} );
			this.authorInput.$element.after(
				this.authorInputField.help.$element.addClass( 'mwe-upwiz-details-help' )
			);
			this.authorInputField.help.$element.hide();
		}
		if ( this.templateCheckboxes.authorUnknown ) {
			// add the element inside authorInputField so any error msgs will be displayed for
			// the field (containing the text input and checkbox) rather than just the text input
			if ( this.templateCheckboxes.aiGenerated ) {
				this.authorInputField.help.$element.after(
					$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-checkbox' )
						.append( this.templateCheckboxes.authorUnknown.field.$element )
				);
			} else {
				this.authorInput.$element.after(
					$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-checkbox' )
						.append( this.templateCheckboxes.authorUnknown.field.$element )
				);
			}

			this.templateCheckboxes.authorUnknown.input.$element.on( 'change', function () {
				if ( self.templateCheckboxes.authorUnknown.input.isSelected() ) {
					self.authorInput.setDisabled( true );
					self.authorInput.setValue( '' );
					self.authorInputField.checkValidity( false );
				} else {
					self.authorInput.setDisabled( false );
				}
			} );
		}

		if ( this.threeDCount > 0 ) {
			$formFields.append( this.patentAgreementField.$element );
		}

		this.$form.append( $formFields );

		$selector.append( this.$form );
	};

	/**
	 * @inheritdoc
	 */
	uw.deed.ThirdParty.prototype.updateAuthorFieldForAI = function () {
		if ( this.templateCheckboxes.aiGenerated.input.isSelected() ) {
			this.authorInputField.setLabel(
				$( '<li>' ).msg( 'mwe-upwiz-author-text-ai' )
			);
			this.authorInputField.help.$element.show();
			if ( this.templateCheckboxes.authorUnknown ) {
				this.templateCheckboxes.authorUnknown.field.setLabel(
					mw.message(
						'mwe-upwiz-author-not-known'
					).text()
				);
			}
		} else {
			this.authorInputField.setLabel(
				$( '<li>' ).msg( 'mwe-upwiz-author-text' )
			);
			this.authorInputField.help.$element.hide();
			if ( this.templateCheckboxes.authorUnknown ) {
				this.templateCheckboxes.authorUnknown.field.setLabel(
					mw.message(
						this.config.templateCheckboxes.thirdparty.authorUnknown.label
					).text()
				);
			}
		}
	};

	/**
	 * @inheritdoc
	 */
	uw.deed.Abstract.prototype.getSourceWikiText = function () {
		return this.sourceInput.getValue();
	};

	/**
	 * @inheritdoc
	 */
	uw.deed.Abstract.prototype.getAuthorWikiText = function () {
		return this.authorInput.getValue();
	};

	/**
	 * @inheritdoc
	 */
	uw.deed.Abstract.prototype.getLicenseWikiText = function ( upload ) {
		var wikitext = this.licenseInput.getWikiText();

		if ( this.needsPatentAgreement( upload ) ) {
			wikitext += '\n{{' + this.config.patents.template + '}}';
		}

		return wikitext;
	};

	/**
	 * @return {Object}
	 */
	uw.deed.ThirdParty.prototype.getSerialized = function () {
		return $.extend( uw.deed.Abstract.prototype.getSerialized.call( this ), {
			source: this.sourceInput.getValue(),
			author: this.authorInput.getValue(),
			license: this.licenseInput.getSerialized()
		} );
	};

	/**
	 * @param {Object} serialized
	 */
	uw.deed.ThirdParty.prototype.setSerialized = function ( serialized ) {
		uw.deed.Abstract.prototype.setSerialized.call( this, serialized );

		if ( serialized.source ) {
			this.sourceInput.setValue( serialized.source );
		}
		if ( serialized.author ) {
			this.authorInput.setValue( serialized.author );
		}
		if ( serialized.license ) {
			this.licenseInput.setSerialized( serialized.license );
		}

		if ( this.templateCheckboxes.authorUnknown ) {
			this.authorInput.setDisabled(
				!!this.templateCheckboxes.authorUnknown.input.isSelected()
			);

			if ( this.templateCheckboxes.aiGenerated ) {
				this.updateAuthorFieldForAI();
			}
		}
	};
}( mw.uploadWizard ) );
