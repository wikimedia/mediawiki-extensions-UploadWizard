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
	 * @class uw.deed.OwnWork
	 * @constructor
	 * @param {Object} config The UW config
	 * @param {mw.UploadWizardUpload[]} uploads Array of uploads that this deed refers to
	 * @param {mw.Api} api API object - useful for doing previews
	 */
	uw.deed.OwnWork = function UWDeedOwnWork( config, uploads, api ) {
		var self = this,
			prefAuthName = mw.user.options.get( 'upwiz_licensename' );

		uw.deed.Abstract.call( this, 'ownwork', config );

		this.uploadCount = uploads.length;
		this.threeDCount = uploads.filter( this.needsPatentAgreement.bind( this ) ).length;

		if ( !prefAuthName ) {
			prefAuthName = mw.config.get( 'wgUserName' );
		}

		// copyright holder
		this.authorInput = new OO.ui.HiddenInputWidget( {
			name: 'author',
			value: prefAuthName
		} );

		this.licenseInput = new mw.UploadWizardLicenseInput(
			this.config.licensing.ownWork,
			this.uploadCount,
			api
		);
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
					label: $( '<div>' ).msg( 'mwe-upwiz-source-ownwork-purpose-option-personal', this.uploadCount, mw.user )
						.append(
							$( '<div>' )
								.addClass( 'mwe-upwiz-deed-warning' )
								.append( mw.message(
									'mwe-upwiz-source-ownwork-purpose-warning-personal',
									this.uploadCount,
									'//commons.wikimedia.org/wiki/Commons:What_Commons_is_not',
									'//commons.wikimedia.org/wiki/Commons:Licensing',
									'//commons.wikimedia.org/wiki/Commons:Village_pump/Copyright'
								).parseDom() )
								.hide()
						)
						.contents(),
					data: 'personal'
				} )
			],
			classes: [ 'mwe-upwiz-deed-purpose' ]
		} );
		this.purposeRadio.on( 'select', function ( selectedOption ) {
			var $warning = self.purposeRadio.$element.find( '.mwe-upwiz-deed-warning' );
			if ( selectedOption.getData() === 'personal' ) {
				$warning.show();
			} else {
				$warning.hide();
			}
			// let's also emit a 'change' event to satisfy the listener that checks
			// and shows/hides an error message
			self.purposeRadio.emit( 'change' );
		} );
		this.purposeField = new uw.FieldLayout( this.purposeRadio, {
			label: $( '<div>' ).append(
				$( '<li>' )
					.addClass( 'mwe-upwiz-label-title' )
					.append( mw.message( 'mwe-upwiz-source-ownwork-purpose-label', this.uploadCount, mw.user ).parseDom() )
			),
			required: true
		} );
		this.purposeRadio.getErrors = function () {
			if ( !self.purposeRadio.findSelectedItems() ) {
				return [ mw.message( 'mwe-upwiz-deeds-need-license' ) ];
			}
			return [];
		};
		this.purposeRadio.getWarnings = function () {
			// not actually adding a warning here; there already is one shown immediately
			// on the screen when the "wrong" option is selected
			return [];
		};

		// grant patent license
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
		var fields = [ this.licenseInputField, this.purposeField ];
		if ( this.threeDCount > 0 ) {
			fields.push( this.patentAgreementField );
		}
		return fields;
	};

	uw.deed.OwnWork.prototype.setFormFields = function ( $selector ) {
		var $formFields;

		this.$selector = $selector;

		this.$form = $( '<form>' );

		$formFields = $( '<div>' ).addClass( 'mwe-upwiz-deed-form-internal' ).append(
			$( '<ol>' ).append(
				$( '<div>' ).addClass( 'mwe-upwiz-ownwork-license' )
					.append( this.licenseInputField.$element ),
				$( '<div>' ).addClass( 'mwe-upwiz-ownwork-purpose' )
					.append( this.purposeField.$element )
			)
		);

		// hidden inputs
		$formFields.append( this.authorInput.$element );
		if ( this.threeDCount > 0 ) {
			$formFields.append( this.patentAgreementField.$element );
		}

		this.$form.append( $formFields ).appendTo( $selector );

		this.setDefaultLicense();
	};

	/**
	 * OwnWork's default value is different to the default LicenseInput defaults...
	 * LicenseInput supports multiple default values, but this one does not.
	 */
	uw.deed.OwnWork.prototype.setDefaultLicense = function () {
		var defaultLicenseKey, defaultLicense = {};
		defaultLicenseKey = this.getDefaultLicense();
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
		var author = this.getAuthorInputValue();

		if ( author.indexOf( '[' ) >= 0 || author.indexOf( '{' ) >= 0 ) {
			return author;
		}

		return '[[User:' + mw.config.get( 'wgUserName' ) + '|' + author + ']]';
	};

	/**
	 * @inheritdoc
	 */
	uw.deed.OwnWork.prototype.getLicenseWikiText = function ( upload ) {
		var wikitext = '';

		wikitext += this.licenseInput.getWikiText();

		if ( this.needsPatentAgreement( upload ) ) {
			wikitext += '\n{{' + this.config.patents.template + '|ownwork}}';
		}

		return wikitext;
	};

	/**
	 * There's no getValue() on a hidden input in OOUI
	 *
	 * @return string
	 */
	uw.deed.OwnWork.prototype.getAuthorInputValue = function () {
		return this.authorInput.$element.val();
	};

	uw.deed.OwnWork.prototype.setAuthorInputValue = function ( value ) {
		this.authorInput.$element.val( value );
	};

	/**
	 * @return {Object}
	 */
	uw.deed.OwnWork.prototype.getSerialized = function () {
		var serialized = $.extend( uw.deed.Abstract.prototype.getSerialized.call( this ), {
			author: this.getAuthorInputValue()
		} );

		serialized.purpose = this.purposeRadio.findSelectedItem().getData();
		serialized.license = this.licenseInput.getSerialized();

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

		this.purposeRadio.selectItemByData( serialized.purpose );
		this.licenseInput.setSerialized( serialized.license );
	};

	uw.deed.OwnWork.prototype.getDefaultLicense = function () {
		var license;
		if (
			this.config.licensing.defaultType === 'ownwork' ||
			this.config.licensing.defaultType === 'choice'
		) {
			license = this.config.licensing.ownWork.defaults;
			return license instanceof Array ? license[ 0 ] : license;
		}
	};

	/**
	 * @param {OO.ui.InputWidget} input
	 * @return {jQuery.Promise}
	 */
	uw.deed.OwnWork.prototype.getAuthorErrors = function ( input ) {
		var
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
		var config = { panels: [ 'warranty', 'license-ownership', 'license-grant' ] };

		// Only show filename list when in "details" step & we're showing the dialog for individual files
		if ( uploads[ 0 ] && uploads[ 0 ].state === 'details' ) {
			config.panels.unshift( 'filelist' );
		}

		return new uw.PatentDialog( config, this.config, uploads );
	};
}( mw.uploadWizard ) );
