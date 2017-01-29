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
	 * Set up the form and deed object for the deed option that says these uploads are all the user's own work.
	 *
	 * @class uw.deed.OwnWork
	 * @constructor
	 * @param {Object} config The UW config
	 * @param {mw.UploadWizardUpload[]} uploads Array of uploads that this deed refers to
	 * @param {mw.Api} api API object - useful for doing previews
	 */
	uw.deed.OwnWork = function UWDeedOwnWork( config, uploads, api ) {
		var deed = this,
			prefAuthName = mw.user.options.get( 'upwiz_licensename' );

		uw.deed.Abstract.call( this, 'ownwork', config );

		this.uploadCount = uploads.length;

		if ( !prefAuthName ) {
			prefAuthName = mw.config.get( 'wgUserName' );
		}

		// copyright holder
		this.authorInput = new OO.ui.TextInputWidget( {
			name: 'author',
			title: mw.message( 'mwe-upwiz-tooltip-sign' ).text(),
			value: prefAuthName,
			classes: [ 'mwe-upwiz-sign' ]
		} );
		this.fakeAuthorInput = new OO.ui.TextInputWidget( {
			readOnly: true,
			value: prefAuthName,
			classes: [ 'mwe-upwiz-sign' ]
		} );
		this.authorInput.on( 'change', function () {
			deed.fakeAuthorInput.setValue( deed.authorInput.getValue() );
		} );

		// "use a different license"
		this.showCustomDiv = this.config.licensing.ownWork.licenses.length > 1;
		if ( this.showCustomDiv ) {
			this.licenseInput = new mw.UploadWizardLicenseInput(
				undefined,
				this.config.licensing.ownWork,
				this.uploadCount,
				api
			);
			this.licenseInput.$element.addClass( 'mwe-upwiz-deed-license' );
			this.licenseInputField = new uw.FieldLayout( this.licenseInput );
		}
	};

	OO.inheritClass( uw.deed.OwnWork, uw.deed.Abstract );

	/**
	 * @return {uw.FieldLayout[]} Fields that need validation
	 */
	uw.deed.OwnWork.prototype.getFields = function () {
		var fields = [ this.authorInputField ];
		if ( this.showCustomDiv ) {
			fields.push( this.licenseInputField );
		}
		return fields;
	};

	uw.deed.OwnWork.prototype.setFormFields = function ( $selector ) {
		var $customDiv, $formFields, $toggler, crossfaderWidget, defaultLicense,
			defaultLicenseURL, defaultLicenseMsg, defaultLicenseExplainMsg,
			defaultLicenseLink, $standardDiv, $crossfader, deed, languageCode;

		this.$selector = $selector;
		deed = this;
		languageCode = mw.config.get( 'wgUserLanguage' );

		defaultLicense = this.getDefaultLicense();

		defaultLicenseURL = this.config.licenses[ defaultLicense ].url === undefined ?
			'#missing license URL' :
			this.config.licenses[ defaultLicense ].url + 'deed.' + languageCode;
		defaultLicenseMsg = 'mwe-upwiz-source-ownwork-assert-' + defaultLicense;
		defaultLicenseExplainMsg = 'mwe-upwiz-source-ownwork-' + defaultLicense + '-explain';
		defaultLicenseLink = $( '<a>' ).attr( { target: '_blank', href: defaultLicenseURL } );

		this.$form = $( '<form>' );

		$standardDiv = $( '<div class="mwe-upwiz-standard" />' ).append(
			$( '<p>' ).msg(
				defaultLicenseMsg,
				this.uploadCount,
				this.authorInput.$element,
				defaultLicenseLink,
				mw.user
			),
			$( '<p class="mwe-small-print"></p>' ).msg(
				defaultLicenseExplainMsg,
				this.uploadCount
			)
		);
		$crossfader = $( '<div class="mwe-upwiz-crossfader" />' ).append( $standardDiv );

		if ( this.showCustomDiv ) {
			$customDiv = $( '<div class="mwe-upwiz-custom" />' ).append(
				$( '<p>' ).msg( 'mwe-upwiz-source-ownwork-assert-custom',
					this.uploadCount,
					this.fakeAuthorInput.$element )
			);

			$crossfader.append( $customDiv );
		}

		crossfaderWidget = new OO.ui.Widget();
		crossfaderWidget.$element.append( $crossfader );
		// See uw.DetailsWidget
		crossfaderWidget.getErrors = function () {
			var
				errors = [],
				minLength = deed.config.minAuthorLength,
				maxLength = deed.config.maxAuthorLength,
				text = deed.authorInput.getValue().trim();

			if ( text === '' ) {
				errors.push( mw.message( 'mwe-upwiz-error-signature-blank' ) );
			} else if ( text.length < minLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-signature-too-short', minLength ) );
			} else if ( text.length > maxLength ) {
				errors.push( mw.message( 'mwe-upwiz-error-signature-too-long', maxLength ) );
			}

			return $.Deferred().resolve( errors ).promise();
		};
		// See uw.DetailsWidget
		crossfaderWidget.getWarnings = function () {
			return $.Deferred().resolve( [] ).promise();
		};
		this.authorInputField = new uw.FieldLayout( crossfaderWidget );
		// Aggregate 'change' event
		this.authorInput.on( 'change', OO.ui.debounce( function () {
			crossfaderWidget.emit( 'change' );
		}, 500 ) );

		$formFields = $( '<div class="mwe-upwiz-deed-form-internal" />' )
			.append(
				this.authorInputField.$element,
				this.showCustomDiv ? this.licenseInputField.$element.hide() : ''
		);

		$toggler = $( '<p class="mwe-more-options" style="text-align: right"></p>' )
			.append( $( '<a />' )
				.msg( 'mwe-upwiz-license-show-all' )
				.click( function () {
					if ( $crossfader.data( 'crossfadeDisplay' ).get( 0 ) === $customDiv.get( 0 ) ) {
						deed.standardLicense();
					} else {
						deed.customLicense();
					}
				} ) );

		if ( this.showCustomDiv ) {
			$formFields.append( $toggler );
		}

		this.$form.append( $formFields ).appendTo( $selector );

		// done after added to the DOM, so there are true heights
		$crossfader.morphCrossfader();

		if ( this.showCustomDiv ) {
			// choose default licenses
			this.licenseInput.setDefaultValues();
		}

		$.each( this.config.licensing.ownWork.licenses, function ( i, license ) {
			if ( license === defaultLicense ) {
				$( '#license1_' + i ).prop( 'checked', true );
				return false;
			}
		} );
	};

	uw.deed.OwnWork.prototype.getSourceWikiText = function () {
		return '{{own}}';
	};

	// XXX do we need to escape authorInput, or is wikitext a feature here?
	// what about scripts?
	uw.deed.OwnWork.prototype.getAuthorWikiText = function () {
		var author = this.authorInput.getValue();

		if ( author.indexOf( '[' ) >= 0 || author.indexOf( '{' ) >= 0 ) {
			return author;
		}

		return '[[User:' + mw.config.get( 'wgUserName' ) + '|' + author + ']]';
	};

	uw.deed.OwnWork.prototype.getLicenseWikiText = function () {
		if ( this.showCustomDiv && this.licenseInput.getWikiText() !== '' ) {
			return this.licenseInput.getWikiText();
		} else {
			return '{{' +
				this.config.licensing.ownWork.template +
				'|' +
				this.getDefaultLicense() +
				'}}';
		}
	};

	/**
	 * @return {Object}
	 */
	uw.deed.OwnWork.prototype.getSerialized = function () {
		var serialized = $.extend( uw.deed.Abstract.prototype.getSerialized.call( this ), {
			author: this.authorInput.getValue()
		} );

		if ( this.showCustomDiv ) {
			serialized.license = this.licenseInput.getSerialized();
		}

		return serialized;
	};

	/**
	 * @param {Object} serialized
	 */
	uw.deed.OwnWork.prototype.setSerialized = function ( serialized ) {
		uw.deed.Abstract.prototype.setSerialized.call( this, serialized );

		if ( serialized.author ) {
			this.authorInput.setValue( serialized.author );
		}

		if ( this.showCustomDiv && serialized.license ) {
			// only need to set license if it's not the default license
			if ( !( this.getDefaultLicense() in serialized.license ) ) {
				// expand licenses container
				this.customLicense();
				this.licenseInput.setSerialized( serialized.license );
			}
		}
	};

	uw.deed.OwnWork.prototype.swapNodes = function ( a, b ) {
		var
			parentA = a.parentNode,
			parentB = b.parentNode,
			nextA = a.nextSibling,
			nextB = b.nextSibling;

		// This is not correct if a and b are siblings, or if one is a child of the
		// other, or if they're detached, or maybe in other cases, but we don't care
		parentA[ nextA ? 'insertBefore' : 'appendChild' ]( b, nextA );
		parentB[ nextB ? 'insertBefore' : 'appendChild' ]( a, nextB );
	};

	uw.deed.OwnWork.prototype.getDefaultLicense = function () {
		if ( this.config.licensing.defaultType === 'ownwork' ) {
			return this.config.licensing.ownWork.defaults;
		} else {
			return this.config.licensing.ownWork.licenses[ 0 ];
		}
	};

	uw.deed.OwnWork.prototype.standardLicense = function () {
		var deed = this,
			$crossfader = this.$selector.find( '.mwe-upwiz-crossfader' ),
			$standardDiv = this.$selector.find( '.mwe-upwiz-standard' ),
			$toggler = this.$selector.find( '.mwe-more-options a' );

		this.licenseInput.setDefaultValues();

		$crossfader.morphCrossfade( $standardDiv )
			.promise().done( function () {
				deed.swapNodes( deed.authorInput.$element[ 0 ], deed.fakeAuthorInput.$element[ 0 ] );
			} );

		this.licenseInputField.$element
			.slideUp()
			.animate( { opacity: 0 }, { queue: false, easing: 'linear' } );

		$toggler.msg( 'mwe-upwiz-license-show-all' );
	};

	uw.deed.OwnWork.prototype.customLicense = function () {
		var deed = this,
			$crossfader = this.$selector.find( '.mwe-upwiz-crossfader' ),
			$customDiv = this.$selector.find( '.mwe-upwiz-custom' ),
			$toggler = this.$selector.find( '.mwe-more-options a' );

		$crossfader.morphCrossfade( $customDiv )
			.promise().done( function () {
				deed.swapNodes( deed.authorInput.$element[ 0 ], deed.fakeAuthorInput.$element[ 0 ] );
			} );

		this.licenseInputField.$element
			.slideDown()
			.css( { opacity: 0 } ).animate( { opacity: 1 }, { queue: false, easing: 'linear' } );

		$toggler.msg( 'mwe-upwiz-license-show-recommended' );
	};
}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
