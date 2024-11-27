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
	 * Set up the form and deed object for the deed option that says these uploads are all the user's own work.
	 *
	 * @class
	 * @param {Object} config The UW config
	 * @param {mw.UploadWizardUpload[]} uploads Array of uploads that this deed refers to
	 * @param {mw.Api} api API object - useful for doing previews
	 */
	uw.deed.OwnWork = function UWDeedOwnWork( config, uploads, api ) {
		let prefAuthName = mw.user.options.get( 'upwiz_licensename' );
		const revealOptionContent = ( $parent, $child ) => {
			// hide sub-content for all options
			$parent
				.find( '.mwe-upwiz-deed-radio-reveal' )
				// .mwe-upwiz-deed-radio-reveal reveals content when an option is
				// selected, but we need it to ignore nested instances in order not
				// to reveal content from sub-options until they've been selected
				.filter( ( i, el ) => $( el ).parentsUntil( $parent, '.mwe-upwiz-deed-radio-reveal' ).length === 0 )
				.hide();
			// and reveal only in the selected option
			$child
				.find( '.mwe-upwiz-deed-radio-reveal' )
				.filter( ( i, el ) => $( el ).parentsUntil( $child, '.mwe-upwiz-deed-radio-reveal' ).length === 0 )
				.show();
		};

		uw.deed.Abstract.call( this, 'ownwork', config, uploads );

		this.uploadCount = uploads.length;

		if ( !prefAuthName ) {
			prefAuthName = mw.config.get( 'wgUserName' );
		}

		// Author, hidden
		this.authorInput = new OO.ui.HiddenInputWidget( {
			name: 'author',
			value: /^({{.*}}|\[\[.*\]\])$/.test( prefAuthName.trim() ) ?
				prefAuthName :
				'[[User:' + mw.config.get( 'wgUserName' ) + '|' + prefAuthName + ']]'
		} );

		// Origin text input for "work generated by an AI" option
		this.aiTextInput = new OO.ui.MultilineTextInputWidget( {
			rows: 1,
			autosize: true,
			minLength: this.config.minAiInputLength,
			// If the maximum length is reached, the widget will stop further input addition:
			// add + 1, otherwise the expected error message will never display.
			maxLength: this.config.maxAiInputLength + 1
		} );
		this.aiTextInput.$element.find( 'textarea' ).on( 'click', function () {
			// Note: I have not fully figured out exactly why or what is the culprit,
			// but it appears that some node is preventing clicks from propagating,
			// and it's making it impossible to access this input by mouse;
			// this is just a workaround to resolve that
			$( this ).trigger( 'focus' );
		} );
		this.aiTextInput.on( 'change', ( value ) => {
			this.setAuthorInputValue( value );
			// let's also emit a 'change' event on the parent radio to satisfy the listener
			// that checks and shows/hides an error message
			this.originRadio.emit( 'change' );
		} );
		this.aiTextInput.getErrors = ( thorough ) => {
			const errors = [];
			if ( thorough !== true ) {
				// `thorough` is the strict checks executed on submit, but we don't want errors
				// to change/display every change event
				return errors;
			}
			if ( this.originRadio.findSelectedItem().getData() !== 'ai' ) {
				return errors;
			}
			const aiInputValue = this.aiTextInput.getValue().trim();

			if ( aiInputValue === '' ) {
				errors.push( mw.message( 'mwe-upwiz-error-question-blank' ) );
			} else if ( aiInputValue.length < this.config.minAiInputLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-too-short', this.config.minAiInputLength ) );
			} else if ( aiInputValue.length > this.config.maxAiInputLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-too-long', this.config.maxAiInputLength ) );
			}
			return errors;
		};
		this.aiTextInputField = new uw.FieldLayout( this.aiTextInput, {
			label: $( '<div>' )
				.addClass( 'mwe-upwiz-deed-title' )
				.msg(
					'mwe-upwiz-source-ownwork-origin-option-ai-instruction',
					this.uploadCount,
					mw.user
				),
			required: true,
			help: new OO.ui.HtmlSnippet(
				mw.msg( 'mwe-upwiz-source-ownwork-origin-option-ai-description' )
			)
		} );

		// Prompt text input for "work generated by an AI" option
		this.aiPromptTextInput = new OO.ui.MultilineTextInputWidget( {
			autosize: true,
			// If the maximum length is reached, the widget will stop further input addition:
			// add + 1, otherwise the expected error message will never display.
			maxLength: this.config.maxAiInputLength + 1
		} );
		this.aiPromptTextInput.$element.find( 'textarea' ).on( 'click', function () {
			// see also this.aiTextInput.$element.find( 'textarea' ).on( 'click' ) above
			$( this ).trigger( 'focus' );
		} );
		this.aiPromptTextInput.getErrors = ( thorough ) => {
			const errors = [];
			if ( thorough !== true ) {
				// `thorough` is the strict checks executed on submit, but we don't want errors
				// to change/display every change event
				return errors;
			}
			if ( this.originRadio.findSelectedItem().getData() !== 'ai' ) {
				return errors;
			}
			if ( this.aiPromptTextInput.getValue().trim().length > this.config.maxAiInputLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-too-long', this.config.maxAiInputLength ) );
			}
			return errors;
		};
		this.aiPromptTextInputField = new uw.FieldLayout( this.aiPromptTextInput, {
			label: $( '<div>' )
				.addClass( 'mwe-upwiz-deed-title' )
				.addClass( 'mwe-upwiz-ai-prompt' )
				.msg( 'mwe-upwiz-source-ownwork-origin-option-ai-prompt' ),
			// not actually required, but we don't want to display "optional"
			required: true
		} );

		// Main origin radio
		this.originRadio = new OO.ui.RadioSelectWidget( {
			items: [
				new OO.ui.RadioOptionWidget( {
					label: mw.message(
						'mwe-upwiz-source-ownwork-origin-option-own',
						this.uploadCount,
						mw.user
					).parse(),
					data: 'own'
				} ),
				new OO.ui.RadioOptionWidget( {
					label: $( '<div>' )
						.msg(
							'mwe-upwiz-source-ownwork-origin-option-others',
							this.uploadCount,
							mw.user
						)
						.append(
							$( '<span>' )
								.addClass( 'mwe-upwiz-label-extra' )
								.msg(
									'mwe-upwiz-source-ownwork-origin-option-others-explain',
									this.uploadCount,
									mw.user
								),
							$( '<div>' )
								.addClass( 'mwe-upwiz-deed-origin-others-container' )
								.addClass( 'mwe-upwiz-deed-radio-reveal' )
								.addClass( 'mwe-upwiz-deed-subgroup' )
								.append(
									$( '<div>' )
										.addClass( 'mwe-upwiz-deed-title' )
										.msg(
											'mwe-upwiz-source-ownwork-origin-option-others-subquestion',
											this.uploadCount,
											mw.user
										)
									// this.originOthersRadio.$element will be appended in here
									// once it has been created (see below)
								)
								.hide()
						)
						.contents(),
					data: 'others'
				} ),
				new OO.ui.RadioOptionWidget( {
					label: $( '<div>' )
						.append(
							mw.message( 'mwe-upwiz-source-ownwork-origin-option-ai' ).parse()
						).append(
							$( '<div>' )
								.addClass( 'mwe-upwiz-deed-radio-reveal' )
								.addClass( 'mwe-upwiz-deed-subgroup' )
								.append(
									this.aiTextInputField.$element,
									this.aiPromptTextInputField.$element
								).hide()
						)
						.contents(),
					data: 'ai'
				} )
			],
			classes: [ 'mwe-upwiz-deed-origin' ]
		} );
		this.originRadio.on( 'select', ( selectedOption ) => {
			revealOptionContent( this.originRadio.$element, selectedOption.$element );

			// let's also emit a 'change' event to satisfy the listener that checks
			// and shows/hides an error message
			this.originRadio.emit( 'change' );
		} );

		// Origin sub-radio for "work of others" option
		this.originOthersRadio = new OO.ui.RadioSelectWidget( {
			items: [
				new OO.ui.RadioOptionWidget( {
					label: new OO.ui.HtmlSnippet(
						mw.message(
							'mwe-upwiz-source-ownwork-origin-option-others-freelicense',
							this.uploadCount,
							mw.user
						).parse()
					),
					data: 'freelicense'
				} ),
				new OO.ui.RadioOptionWidget( {
					label: mw.message(
						'mwe-upwiz-source-ownwork-origin-option-others-nocopyright',
						this.uploadCount,
						mw.user
					).parse(),
					data: 'nocopyright'
				} ),
				new OO.ui.RadioOptionWidget( {
					label: $( '<div>' )
						.msg(
							'mwe-upwiz-source-ownwork-origin-option-others-copyrighted',
							this.uploadCount,
							mw.user
						)
						.append(
							new OO.ui.MessageWidget( {
								type: 'warning',
								label: new OO.ui.HtmlSnippet(
									mw.message(
										'mwe-upwiz-source-ownwork-origin-option-others-copyrighted-warning',
										this.uploadCount,
										mw.user
									).parse()
								),
								classes: [ 'mwe-upwiz-deed-warning', 'mwe-upwiz-deed-radio-reveal' ]
							} ).$element.hide()
						)
						.contents(),
					data: 'copyrighted'
				} ),
				new OO.ui.RadioOptionWidget( {
					label: $( '<div>' )
						.msg(
							'mwe-upwiz-source-ownwork-origin-option-others-unknown',
							this.uploadCount,
							mw.user
						)
						.append(
							new OO.ui.MessageWidget( {
								type: 'warning',
								label: new OO.ui.HtmlSnippet(
									mw.message(
										'mwe-upwiz-source-ownwork-origin-option-others-unknown-warning',
										this.uploadCount,
										mw.user
									).parse()
								),
								classes: [ 'mwe-upwiz-deed-warning', 'mwe-upwiz-deed-radio-reveal' ]
							} ).$element.hide()
						)
						.contents(),
					data: 'unknown'
				} )
			]
		} );
		this.originRadio.$element.find( '.mwe-upwiz-deed-origin-others-container' ).append( this.originOthersRadio.$element );
		this.originOthersRadio.on( 'select', ( selectedOption ) => {
			revealOptionContent( this.originOthersRadio.$element, selectedOption.$element );

			// let's also emit a 'change' event on the parent radio to satisfy the listener
			// that checks and shows/hides an error message
			this.originRadio.emit( 'change' );
		} );

		this.originRadio.getErrors = this.getOwnWorkErrors.bind(
			this,
			this.originRadio,
			this.originOthersRadio
		);
		this.originRadio.getWarnings = this.getOwnWorkWarnings.bind(
			this,
			this.originRadio,
			this.originOthersRadio,
			this.aiTextInput
		);
		this.originRadioField = new uw.FieldLayout( this.originRadio, {
			label: $( '<div>' ).append(
				$( '<li>' )
					.addClass( 'mwe-upwiz-label-title' )
					.append(
						mw.message(
							'mwe-upwiz-source-ownwork-origin-label',
							this.uploadCount,
							mw.user
						).parseDom()
					)
			),
			required: true
		} );

		this.licenseInput = new mw.UploadWizardLicenseInput(
			this.config.licensing.ownWork,
			this.uploadCount,
			api
		);
		this.licenseInput.$element.addClass( 'mwe-upwiz-deed-forms' );
		this.licenseInputField = new uw.FieldLayout( this.licenseInput, {
			label: $( '<div>' ).append(
				$( '<li>' )
					.addClass( 'mwe-upwiz-label-title' )
					.append( mw.message( 'mwe-upwiz-source-ownwork-question', this.uploadCount, mw.user ).parseDom() )
			),
			required: true
		} );

		this.purposeRadio = new OO.ui.RadioSelectWidget( {
			items: [
				new OO.ui.RadioOptionWidget( {
					label: mw.message( 'mwe-upwiz-source-ownwork-purpose-option-knowledge', this.uploadCount, mw.user ).text(),
					data: 'knowledge'
				} ),
				new OO.ui.RadioOptionWidget( {
					label: $( '<div>' ).msg( 'mwe-upwiz-source-ownwork-purpose-option-personal-use', this.uploadCount, mw.user )
						.append(
							new OO.ui.MessageWidget( {
								type: 'warning',
								label: new OO.ui.HtmlSnippet(
									mw.message(
										'mwe-upwiz-source-ownwork-purpose-option-personal-warning',
										this.uploadCount
									).parse()
								),
								classes: [ 'mwe-upwiz-deed-warning', 'mwe-upwiz-deed-radio-reveal' ]
							} ).$element.hide()
						)
						.contents(),
					data: 'personal'
				} )
			],
			classes: [ 'mwe-upwiz-deed-purpose' ]
		} );
		this.purposeRadio.on( 'select', ( selectedOption ) => {
			revealOptionContent( this.purposeRadio.$element, selectedOption.$element );

			// let's also emit a 'change' event to satisfy the listener that checks
			// and shows/hides an error message
			this.purposeRadio.emit( 'change' );
		} );
		this.purposeRadio.getErrors = ( thorough ) => {
			if ( thorough !== true ) {
				// `thorough` is the strict checks executed on submit, but we don't want errors
				// to change/display every change event
				return [];
			}

			if (
				this.purposeRadio.isElementAttached() &&
				!this.purposeRadio.findSelectedItems()
			) {
				return [ mw.message( 'mwe-upwiz-deeds-require-selection' ) ];
			}

			return [];
		};
		this.purposeRadio.getWarnings = function () {
			// not actually adding a warning here; there already is one shown immediately
			// on the screen when the "wrong" option is selected
			return [];
		};
		this.purposeField = new uw.FieldLayout( this.purposeRadio, {
			label: $( '<div>' ).append(
				$( '<li>' )
					.addClass( 'mwe-upwiz-label-title' )
					.append( mw.message( 'mwe-upwiz-source-ownwork-purpose-label', this.uploadCount, mw.user ).parseDom() )
			),
			required: true
		} );

		// grant patent license
		this.threeDCount = uploads.filter( this.needsPatentAgreement.bind( this ) ).length;
		if ( this.threeDCount > 0 ) {
			this.patentAgreementField = this.getPatentAgreementField( uploads );
		}
	};

	OO.inheritClass( uw.deed.OwnWork, uw.deed.Abstract );

	uw.deed.OwnWork.prototype.unload = function () {
		this.licenseInput.unload();
	};

	/**
	 * @return {uw.FieldLayout[]} Fields that need validation
	 */
	uw.deed.OwnWork.prototype.getFields = function () {
		const fields = [ this.originRadioField, this.licenseInputField ];

		// don't validate purpose field in campaigns (it is not shown)
		if ( !new mw.Uri().query.campaign ) {
			fields.push( this.purposeField );
		}

		if ( this.threeDCount > 0 ) {
			fields.push( this.patentAgreementField );
		}

		if (
			this.originRadio.findSelectedItem() &&
			this.originRadio.findSelectedItem().getData() === 'ai'
		) {
			fields.push( this.aiTextInputField );
			fields.push( this.aiPromptTextInputField );
		}

		return fields;
	};

	uw.deed.OwnWork.prototype.setFormFields = function ( $selector ) {
		const $formFields = $( '<ol>' ).append(
			$( '<div>' ).addClass( 'mwe-upwiz-ownwork-origin' )
				.append( this.originRadioField.$element ),
			$( '<div>' ).addClass( 'mwe-upwiz-ownwork-license' )
				.append( this.licenseInputField.$element )
		);

		// show the purpose field if we aren't in a campaign and the user isn't autoconfirmed
		if (
			!new mw.Uri().query.campaign &&
			mw.config.get( 'wgUserGroups' ).indexOf( 'autoconfirmed' ) === -1
		) {
			$formFields.append(
				$( '<div>' ).addClass( 'mwe-upwiz-ownwork-purpose' )
					.append( this.purposeField.$element )
			);
		}

		// hidden inputs
		$formFields.append( this.authorInput.$element );
		if ( this.threeDCount > 0 ) {
			$formFields.append( this.patentAgreementField.$element );
		}

		$selector.append(
			$( '<form>' )
				.append( $( '<div>' ).addClass( 'mwe-upwiz-deed-form-internal' ).append( $formFields ) )
		);

		this.setDefaultLicense();
	};

	/**
	 * OwnWork's default value is different to the default LicenseInput defaults...
	 * LicenseInput supports multiple default values, but this one does not.
	 */
	uw.deed.OwnWork.prototype.setDefaultLicense = function () {
		const defaultLicense = {};
		const defaultLicenseKey = this.getDefaultLicense();
		if ( defaultLicenseKey ) {
			defaultLicense[ defaultLicenseKey ] = true;
			this.licenseInput.setValues( defaultLicense );
		}
	};

	/**
	 * @inheritdoc
	 */
	uw.deed.OwnWork.prototype.getSourceWikiText = function () {
		return '{{own}}';
	};

	/**
	 * @inheritdoc
	 */
	uw.deed.OwnWork.prototype.getAuthorWikiText = function () {
		const author = this.getAuthorInputValue();

		if ( author ) {
			return author;
		}

		return '[[User:' + mw.config.get( 'wgUserName' ) + ']]';
	};

	/**
	 * @inheritdoc
	 */
	uw.deed.OwnWork.prototype.getLicenseWikiText = function ( upload ) {
		let wikitext = '';

		wikitext += this.licenseInput.getWikiText();

		if ( this.needsPatentAgreement( upload ) ) {
			wikitext += '\n{{' + this.config.patents.template + '|ownwork}}';
		}

		if (
			this.originRadio.findSelectedItem() &&
			this.originRadio.findSelectedItem().getData() === 'ai'
		) {
			wikitext += '\n{{PD-algorithm}}';
		}

		return wikitext;
	};

	/**
	 * @return {string}
	 */
	uw.deed.OwnWork.prototype.getAiPromptWikitext = function () {
		let prompt, wikitext = '';

		if (
			this.originRadio.findSelectedItem() &&
			this.originRadio.findSelectedItem().getData() === 'ai'
		) {
			prompt = this.aiPromptTextInput.getValue().trim();
			if ( prompt ) {
				wikitext = '{{Prompt|' + prompt + '}}';
			}
		}

		return wikitext;
	};

	/**
	 * There's no getValue() on a hidden input in OOUI.
	 * Also handle an AI-generated work.
	 *
	 * @return {string}
	 */
	uw.deed.OwnWork.prototype.getAuthorInputValue = function () {
		return this.authorInput.$element.val().trim();
	};

	uw.deed.OwnWork.prototype.setAuthorInputValue = function ( value ) {
		this.authorInput.$element.val( value );
	};

	/**
	 * @return {Object}
	 */
	uw.deed.OwnWork.prototype.getSerialized = function () {
		const serialized = Object.assign(
			uw.deed.Abstract.prototype.getSerialized.call( this ),
			{ author: this.getAuthorInputValue() }
		);

		serialized.origin = this.originRadio.findSelectedItem() && this.originRadio.findSelectedItem().getData();
		serialized.originOthers = this.originOthersRadio.findSelectedItem() && this.originOthersRadio.findSelectedItem().getData();
		serialized.ai = this.aiTextInput.getValue();
		serialized.aiPrompt = this.aiPromptTextInput.getValue();
		serialized.license = this.licenseInput.getSerialized();
		serialized.purpose = this.purposeRadio.findSelectedItem() && this.purposeRadio.findSelectedItem().getData();

		return serialized;
	};

	/**
	 * @param {Object} serialized
	 */
	uw.deed.OwnWork.prototype.setSerialized = function ( serialized ) {
		uw.deed.Abstract.prototype.setSerialized.call( this, serialized );

		if ( serialized.author ) {
			this.setAuthorInputValue( serialized.author );
		}
		if ( serialized.origin ) {
			this.originRadio.selectItemByData( serialized.origin );
		}
		if ( serialized.originOthers ) {
			this.originOthersRadio.selectItemByData( serialized.originOthers );
		}
		if ( serialized.ai ) {
			this.aiTextInput.setValue( serialized.ai );
		}
		if ( serialized.aiPrompt ) {
			this.aiPromptTextInput.setValue( serialized.aiPrompt );
		}
		this.licenseInput.setSerialized( serialized.license );
		if ( serialized.purpose ) {
			this.purposeRadio.selectItemByData( serialized.purpose );
		}
	};

	uw.deed.OwnWork.prototype.getDefaultLicense = function () {
		let license;
		if (
			this.config.licensing.defaultType === 'ownwork' ||
			this.config.licensing.defaultType === 'choice'
		) {
			license = this.config.licensing.ownWork.defaults;
			return license instanceof Array ? license[ 0 ] : license;
		}
	};

	/**
	 * @param {OO.ui.RadioSelectWidget} originRadio
	 * @param {OO.ui.RadioSelectWidget} originOthersRadio
	 * @param {OO.ui.TextInputWidget} aiTextInput
	 * @param {OO.ui.TextInputWidget} aiPromptTextInput
	 * @param {boolean} thorough
	 * @return {Array<string>}
	 */
	uw.deed.OwnWork.prototype.getOwnWorkErrors = function (
		originRadio, originOthersRadio, thorough
	) {
		const errors = [];

		if ( thorough !== true ) {
			// `thorough` is the strict checks executed on submit, but we don't want errors
			// to change/display every change event
			return [];
		}

		if ( originRadio.findSelectedItem() === null ) {
			errors.push( mw.message( 'mwe-upwiz-deeds-require-selection' ) );
		} else if (
			originRadio.findSelectedItem().getData() === 'others' &&
			originOthersRadio.findSelectedItem() === null
		) {
			errors.push( mw.message( 'mwe-upwiz-deeds-require-selection' ) );
		}

		return errors;
	};

	/**
	 * @return {jQuery.Promise}
	 */
	uw.deed.OwnWork.prototype.getOwnWorkWarnings = function () {
		return $.Deferred().resolve( [] ).promise();
	};

	/**
	 * @param {OO.ui.InputWidget} input
	 * @return {jQuery.Promise}
	 */
	uw.deed.OwnWork.prototype.getAuthorErrors = function ( input ) {
		const
			errors = [],
			minLength = this.config.minAuthorLength,
			maxLength = this.config.maxAuthorLength,
			text = input.getValue().trim();

		if ( text === '' ) {
			errors.push( mw.message( 'mwe-upwiz-error-signature-blank' ) );
		} else if ( text.length < minLength ) {
			errors.push( mw.message( 'mwe-upwiz-error-signature-too-short', minLength ) );
		} else if ( text.length > maxLength ) {
			errors.push( mw.message( 'mwe-upwiz-error-signature-too-long', maxLength ) );
		}

		return $.Deferred().resolve( errors ).promise();
	};

	/**
	 * @return {jQuery.Promise}
	 */
	uw.deed.OwnWork.prototype.getAuthorWarnings = function () {
		return $.Deferred().resolve( [] ).promise();
	};

	/**
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @return {uw.PatentDialog}
	 */
	uw.deed.OwnWork.prototype.getPatentDialog = function ( uploads ) {
		const config = { panels: [ 'warranty', 'license-ownership', 'license-grant' ] };

		// Only show filename list when in "details" step & we're showing the dialog for individual files
		if ( uploads[ 0 ] && uploads[ 0 ].state === 'details' ) {
			config.panels.unshift( 'filelist' );
		}

		return new uw.PatentDialog( config, this.config, uploads );
	};
}( mw.uploadWizard ) );
