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
	 * @class
	 * @param {Object} config The UW config
	 * @param {mw.UploadWizardUpload[]} uploads Array of uploads that this deed refers to
	 * @param {mw.Api} api API object - useful for doing previews
	 */
	uw.deed.ThirdParty = function UWDeedThirdParty( config, uploads, api ) {
		uw.deed.Abstract.call( this, 'thirdparty', config, uploads );

		this.uploadCount = uploads.length;
		this.threeDCount = uploads.filter( this.needsPatentAgreement.bind( this ) ).length;

		this.sourceInput = new OO.ui.MultilineTextInputWidget( {
			autosize: true,
			classes: [ 'mwe-source' ],
			name: 'source'
		} );
		this.sourceInput.$input.attr( 'id', 'mwe-source-' + this.getInstanceCount() );
		// See uw.DetailsWidget
		this.sourceInput.getErrors = ( thorough ) => {
			const
				errors = [],
				minLength = this.config.minSourceLength,
				maxLength = this.config.maxSourceLength,
				text = this.sourceInput.getValue().trim();

			if ( thorough !== true ) {
				// `thorough` is the strict checks executed on submit, but we don't want errors
				// to change/display every change event
				return [];
			}

			if ( text === '' ) {
				errors.push( mw.message( 'mwe-upwiz-error-question-blank' ) );
			} else if ( text.length < minLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-too-short', minLength ) );
			} else if ( text.length > maxLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-too-long', maxLength ) );
			}

			return errors;
		};
		// See uw.DetailsWidget
		this.sourceInput.getWarnings = function () {
			return $.Deferred().resolve( [] ).promise();
		};
		this.sourceInputField = new uw.FieldLayout( this.sourceInput, {
			label: $( '<li>' )
				.addClass( 'mwe-upwiz-label-title' )
				.msg( 'mwe-upwiz-source-text', this.uploadCount, mw.user ),
			required: true
		} );

		this.authorInput = new OO.ui.MultilineTextInputWidget( {
			autosize: true,
			classes: [ 'mwe-author' ],
			name: 'author'
		} );
		this.authorInput.$input.attr( 'id', 'mwe-author-' + this.getInstanceCount() );
		this.authorInput.getErrors = ( thorough ) => {
			const
				errors = [],
				minLength = this.config.minAuthorLength,
				maxLength = this.config.maxAuthorLength,
				text = this.authorInput.getValue().trim();

			if ( thorough !== true ) {
				// `thorough` is the strict checks executed on submit, but we don't want errors
				// to change/display every change event
				return [];
			}

			if ( this.authorInput.isDisabled() ) {
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
			label: $( '<li>' )
				.addClass( 'mwe-upwiz-label-title' )
				.msg( 'mwe-upwiz-author-text', this.uploadCount, mw.user ),
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
			label: $( '<div>' ).append(
				$( '<li>' )
					.addClass( 'mwe-upwiz-label-title' )
					.append( mw.message( 'mwe-upwiz-source-thirdparty-cases-text', this.uploadCount, mw.user ).parseDom() ),
				$( '<span>' )
					.addClass( 'mwe-upwiz-label-extra' )
					.text( mw.message( 'mwe-upwiz-tooltip-thirdparty-license', this.uploadCount, mw.user ).text() )
			),
			required: true
		} );

		this.complianceCheck = new OO.ui.CheckboxMultiselectWidget( {
			items: [
				new OO.ui.CheckboxMultioptionWidget( {
					label: mw.message( 'mwe-upwiz-source-thirdparty-compliance-option-copyright', this.uploadCount, mw.user ).text(),
					data: 'copyright'
				} )
			],
			classes: [ 'mwe-upwiz-deed-compliance' ]
		} );
		this.complianceCheck.getErrors = ( thorough ) => {
			const allSelected = this.complianceCheck.getItems().reduce( ( result, item ) => result && item.isSelected(), true );

			if ( thorough !== true ) {
				// `thorough` is the strict checks executed on submit, but we don't want errors
				// to change/display every change event
				return [];
			}

			if ( !allSelected ) {
				return [ mw.message( 'mwe-upwiz-deeds-require-selection' ) ];
			}

			return [];
		};
		this.complianceCheck.getWarnings = function () {
			// just here for completeness; there is no warning ATM
			return [];
		};
		this.complianceField = new uw.FieldLayout( this.complianceCheck, {
			label: $( '<div>' ).append(
				$( '<li>' )
					.addClass( 'mwe-upwiz-label-title' )
					.append( mw.message( 'mwe-upwiz-source-thirdparty-compliance-label', this.uploadCount, mw.user ).parseDom() )
			),
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
		const fields = [
			this.authorInputField,
			this.sourceInputField,
			this.licenseInputField,
			this.complianceField
		];
		if ( this.threeDCount > 0 ) {
			fields.push( this.patentAgreementField );
		}
		return fields;
	};

	uw.deed.ThirdParty.prototype.setFormFields = function ( $selector ) {
		const $formFields = $( '<div>' ).addClass( 'mwe-upwiz-deed-form-internal' );

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
					.append( this.authorInputField.$element ),
				$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-fields' )
					.append( this.complianceField.$element )
			)
		);

		if ( this.templateOptions.aiGenerated ) {
			// add the element inside sourceInputField so any error msgs will be displayed for
			// the field (containing the text input and checkbox) rather than just the text input
			this.sourceInput.$element.after(
				$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-checkbox' )
					.append( this.templateOptions.aiGenerated.field.$element )
			);
			this.templateOptions.aiGenerated.input.$element.on( 'change', () => {
				this.updateAuthorFieldForAI();
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
		if ( this.templateOptions.authorUnknown ) {
			// add the element inside authorInputField so any error msgs will be displayed for
			// the field (containing the text input and checkbox) rather than just the text input
			if ( this.templateOptions.aiGenerated ) {
				this.authorInputField.help.$element.after(
					$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-checkbox' )
						.append( this.templateOptions.authorUnknown.field.$element )
				);
			} else {
				this.authorInput.$element.after(
					$( '<div>' ).addClass( 'mwe-upwiz-thirdparty-checkbox' )
						.append( this.templateOptions.authorUnknown.field.$element )
				);
			}

			this.templateOptions.authorUnknown.input.$element.on( 'change', () => {
				if ( this.templateOptions.authorUnknown.input.isSelected() ) {
					this.authorInput.setDisabled( true );
					this.authorInput.setValue( '' );
					this.authorInputField.checkValidity( false );
				} else {
					this.authorInput.setDisabled( false );
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
		if ( this.templateOptions.aiGenerated.input.isSelected() ) {
			this.authorInputField.setLabel(
				$( '<li>' )
					.addClass( 'mwe-upwiz-label-title' )
					.msg( 'mwe-upwiz-author-text-ai' )
			);
			this.authorInputField.help.$element.show();
			if ( this.templateOptions.authorUnknown ) {
				this.templateOptions.authorUnknown.field.setLabel(
					mw.message(
						'mwe-upwiz-author-not-known'
					).text()
				);
			}
		} else {
			this.authorInputField.setLabel(
				$( '<li>' )
					.addClass( 'mwe-upwiz-label-title' )
					.msg( 'mwe-upwiz-author-text' )
			);
			this.authorInputField.help.$element.hide();
			if ( this.templateOptions.authorUnknown ) {
				this.templateOptions.authorUnknown.field.setLabel(
					mw.message(
						this.config.templateOptions.thirdparty.authorUnknown.label
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
		return this.authorInput.getValue() || '{{Unknown|author}}';
	};

	/**
	 * @inheritdoc
	 */
	uw.deed.Abstract.prototype.getLicenseWikiText = function ( upload ) {
		let wikitext = this.licenseInput.getWikiText();

		if ( this.needsPatentAgreement( upload ) ) {
			wikitext += '\n{{' + this.config.patents.template + '}}';
		}

		return wikitext;
	};

	/**
	 * @return {Object}
	 */
	uw.deed.ThirdParty.prototype.getSerialized = function () {
		return Object.assign( uw.deed.Abstract.prototype.getSerialized.call( this ), {
			source: this.sourceInput.getValue(),
			author: this.authorInput.getValue(),
			license: this.licenseInput.getSerialized(),
			compliance: this.complianceCheck.findSelectedItems().map( ( item ) => item.getData() )
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
		if ( serialized.compliance ) {
			this.complianceCheck.selectItemsByData( serialized.compliance );
		}

		if ( this.templateOptions.authorUnknown ) {
			this.authorInput.setDisabled(
				!!this.templateOptions.authorUnknown.input.isSelected()
			);

			if ( this.templateOptions.aiGenerated ) {
				this.updateAuthorFieldForAI();
			}
		}
	};

	uw.deed.ThirdParty.prototype.getStructuredDataFromSource = function () {
		const source = this.getSourceWikiText(),
			config = mw.UploadWizard.config,
			urlRegex = /^https?:\/\/\S*\.\S*$/,
			sourceRegex = new RegExp(
				'(' +
				Object.keys( config.sourceStringToWikidataIdMapping ).join( '|' ) +
				')'
			),
			sourceStringMatch = sourceRegex.exec( source ) ? sourceRegex.exec( source )[ 0 ] : false;

		if ( !config.wikibase.enabled ) {
			return false;
		}

		if ( !sourceStringMatch && !urlRegex.test( source ) ) {
			return false;
		}

		const wbDataModel = mw.loader.require( 'wikibase.datamodel' );

		const sourceClaim = new wbDataModel.Claim(
			new wbDataModel.PropertyValueSnak(
				config.wikibase.properties.source,
				// eslint-disable-next-line no-undef
				dataValues.newDataValue( 'wikibase-entityid', {
					id: config.wikibase.items.file_available_on_the_internet
				} )
			)
		);

		const sourceQualifiers = new wbDataModel.SnakList();
		if ( ( config.wikibase.properties.operator !== undefined ) && sourceStringMatch ) {
			sourceQualifiers.addItem(
				new wbDataModel.PropertyValueSnak(
					config.wikibase.properties.operator,
					// eslint-disable-next-line no-undef
					dataValues.newDataValue( 'wikibase-entityid', {
						id: config.sourceStringToWikidataIdMapping[ sourceStringMatch ]
					} )
				)
			);
		}
		if ( urlRegex.test( source ) ) {
			sourceQualifiers.addItem(
				new wbDataModel.PropertyValueSnak(
					config.wikibase.properties.described_at_url,
					// eslint-disable-next-line no-undef
					dataValues.newDataValue( 'string', source )
				)
			);
		}
		sourceClaim.setQualifiers( sourceQualifiers );

		const wbSerialization = mw.loader.require( 'wikibase.serialization' );
		const wbSerializer = new wbSerialization.StatementSerializer();
		return wbSerializer.serialize(
			new wbDataModel.Statement( sourceClaim )
		);
	};

}( mw.uploadWizard ) );
