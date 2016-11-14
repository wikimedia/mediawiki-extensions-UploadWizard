( function ( mw, uw, $ ) {

	function swapNodes( a, b ) {
		var
			parentA = a.parentNode,
			parentB = b.parentNode,
			nextA = a.nextSibling,
			nextB = b.nextSibling;

		// This is not correct if a and b are siblings, or if one is a child of the
		// other, or if they're detached, or maybe in other cases, but we don't care
		parentA[ nextA ? 'insertBefore' : 'appendChild' ]( b, nextA );
		parentB[ nextB ? 'insertBefore' : 'appendChild' ]( a, nextB );
	}

	/**
	 * Set up the form and deed object for the deed option that says these uploads are all the user's own work.
	 *
	 * @param {number} uploadCount Integer count of uploads that this deed refers to (useful for message pluralization)
	 * @param {mw.Api} api API object - useful for doing previews
	 * @param {Object} config The UW config
	 */
	mw.UploadWizardDeedOwnWork = function ( uploadCount, api, config ) {
		var
			deed = new mw.UploadWizardDeed(),
			ownWork = config.licensing.ownWork;

		uploadCount = uploadCount ? uploadCount : 1;

		deed.authorInput = new OO.ui.TextInputWidget( {
			name: 'author',
			title: mw.message( 'mwe-upwiz-tooltip-sign' ).text(),
			value: mw.config.get( 'wgUserName' ),
			classes: [ 'mwe-upwiz-sign' ]
		} );
		deed.fakeAuthorInput = new OO.ui.TextInputWidget( {
			readOnly: true,
			value: mw.config.get( 'wgUserName' ),
			classes: [ 'mwe-upwiz-sign' ]
		} );
		deed.authorInput.on( 'change', function () {
			deed.fakeAuthorInput.setValue( deed.authorInput.getValue() );
		} );

		deed.showCustomDiv = ownWork.licenses.length > 1;

		if ( deed.showCustomDiv ) {
			deed.licenseInput = new mw.UploadWizardLicenseInput(
				undefined,
				config.licensing.ownWork,
				deed.uploadCount,
				api
			);
			deed.licenseInput.$element.addClass( 'mwe-upwiz-deed-license' );
			deed.licenseInputField = new uw.FieldLayout( deed.licenseInput );
		}

		return $.extend( deed, {

			name: 'ownwork',

			/**
			 * @return {uw.FieldLayout[]} Fields that need validation
			 */
			getFields: function () {
				var fields = [ this.authorInputField ];
				if ( this.showCustomDiv ) {
					fields.push( this.licenseInputField );
				}
				return fields;
			},

			getDefaultLicense: function () {
				if ( config.licensing.defaultType === 'ownwork' ) {
					return config.licensing.ownWork.defaults;
				} else {
					return config.licensing.ownWork.licenses[ 0 ];
				}
			},

			getLicenseWikiText: function () {
				if ( this.showCustomDiv && this.licenseInput.getWikiText() !== '' ) {
					return this.licenseInput.getWikiText();
				} else {
					return '{{' +
								config.licensing.ownWork.template +
							'|' +
								this.getDefaultLicense() +
							'}}';
				}
			},

			getSourceWikiText: function () {
				return '{{own}}';
			},

			// XXX do we need to escape authorInput, or is wikitext a feature here?
			// what about scripts?
			getAuthorWikiText: function () {
				var author = this.authorInput.getValue();

				if ( author.indexOf( '[' ) >= 0 || author.indexOf( '{' ) >= 0 ) {
					return author;
				}

				return '[[User:' + mw.config.get( 'wgUserName' ) + '|' + author + ']]';
			},

			setFormFields: function ( $selector ) {
				var $customDiv, $formFields, $toggler, crossfaderWidget, defaultLicense,
					defaultLicenseURL, defaultLicenseMsg, defaultLicenseExplainMsg,
					defaultLicenseLink, $standardDiv, $crossfader, thisDeed, languageCode;

				this.$selector = $selector;
				thisDeed = this;
				languageCode = mw.config.get( 'wgUserLanguage' );

				defaultLicense = this.getDefaultLicense();

				defaultLicenseURL = config.licenses[ defaultLicense ].url === undefined ?
						'#missing license URL' :
						config.licenses[ defaultLicense ].url + 'deed.' + languageCode;
				defaultLicenseMsg = 'mwe-upwiz-source-ownwork-assert-' + defaultLicense;
				defaultLicenseExplainMsg = 'mwe-upwiz-source-ownwork-' + defaultLicense + '-explain';
				defaultLicenseLink = $( '<a>' ).attr( { target: '_blank', href: defaultLicenseURL } );

				this.$form = $( '<form>' );

				$standardDiv = $( '<div class="mwe-upwiz-standard" />' ).append(
					$( '<p></p>' ).msg(
							defaultLicenseMsg,
							uploadCount,
							this.authorInput.$element,
							defaultLicenseLink,
							mw.user
					),
					$( '<p class="mwe-small-print"></p>' ).msg(
						defaultLicenseExplainMsg,
						uploadCount
					)
				);
				$crossfader = $( '<div class="mwe-upwiz-crossfader" />' ).append( $standardDiv );

				if ( this.showCustomDiv ) {
					$customDiv = $( '<div class="mwe-upwiz-custom" />' ).append(
						$( '<p></p>' ).msg( 'mwe-upwiz-source-ownwork-assert-custom',
							uploadCount,
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
						minLength = config.minAuthorLength,
						maxLength = config.maxAuthorLength,
						text = thisDeed.authorInput.getValue().trim();

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
								thisDeed.standardLicense();
							} else {
								thisDeed.customLicense();
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

				$.each( config.licensing.ownWork.licenses, function ( i, license ) {
					if ( license === defaultLicense ) {
						$( '#license1_' + i ).prop( 'checked', true );
						return false;
					}
				} );
			},

			standardLicense: function () {
				var deed = this,
					$crossfader = this.$selector.find( '.mwe-upwiz-crossfader' ),
					$standardDiv = this.$selector.find( '.mwe-upwiz-standard' ),
					$toggler = this.$selector.find( '.mwe-more-options a' );

				this.licenseInput.setDefaultValues();

				$crossfader.morphCrossfade( $standardDiv )
					.promise().done( function () {
						swapNodes( deed.authorInput.$element[ 0 ], deed.fakeAuthorInput.$element[ 0 ] );
					} );

				this.licenseInputField.$element
					.slideUp()
					.animate( { opacity: 0 }, { queue: false, easing: 'linear' } );

				$toggler.msg( 'mwe-upwiz-license-show-all' );
			},

			customLicense: function () {
				var deed = this,
					$crossfader = this.$selector.find( '.mwe-upwiz-crossfader' ),
					$customDiv = this.$selector.find( '.mwe-upwiz-custom' ),
					$toggler = this.$selector.find( '.mwe-more-options a' );

				$crossfader.morphCrossfade( $customDiv )
					.promise().done( function () {
						swapNodes( deed.authorInput.$element[ 0 ], deed.fakeAuthorInput.$element[ 0 ] );
					} );

				this.licenseInputField.$element
					.slideDown()
					.css( { opacity: 0 } ).animate( { opacity: 1 }, { queue: false, easing: 'linear' } );

				$toggler.msg( 'mwe-upwiz-license-show-recommended' );
			},

			/**
			 * @return {Object}
			 */
			getSerialized: function () {
				var serialized = $.extend( mw.UploadWizardDeed.prototype.getSerialized.call( this ), {
					author: this.authorInput.getValue()
				} );

				if ( this.showCustomDiv ) {
					serialized.license = this.licenseInput.getSerialized();
				}

				return serialized;
			},

			/**
			 * @param {Object} serialized
			 */
			setSerialized: function ( serialized ) {
				mw.UploadWizardDeed.prototype.setSerialized.call( this, serialized );

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
			}
		} );
	};

} )( mediaWiki, mediaWiki.uploadWizard, jQuery );
