( function ( mw, uw, $ ) {

	/**
	 * Set up the form and deed object for the deed option that says these uploads are all the user's own work.
	 *
	 * @param {number} uploadCount Integer count of uploads that this deed refers to (useful for message pluralization)
	 * @param {mw.Api} api API object - useful for doing previews
	 * @param {Object} config The UW config
	 */
	mw.UploadWizardDeedOwnWork = function ( uploadCount, api, config ) {
		var licenseInputDiv,
			deed = new mw.UploadWizardDeed(),
			ownWork = config.licensing.ownWork;

		uploadCount = uploadCount ? uploadCount : 1;

		deed.authorInput = new OO.ui.TextInputWidget( {
			name: 'author',
			title: mw.message( 'mwe-upwiz-tooltip-sign' ).text(),
			value: mw.config.get( 'wgUserName' ),
			classes: [ 'mwe-upwiz-sign' ]
		} );

		deed.showCustomDiv = ownWork.licenses.length > 1;

		if ( deed.showCustomDiv ) {
			licenseInputDiv = $( '<div class="mwe-upwiz-deed-license"></div>' );

			deed.licenseInput = new mw.UploadWizardLicenseInput(
				licenseInputDiv,
				undefined,
				config.licensing.ownWork,
				deed.uploadCount,
				api
			);
		}

		return $.extend( deed, {

			name: 'ownwork',

			/**
			 * Is this correctly set, with side effects of causing errors to show in interface.
			 *
			 * @return {boolean} true if valid, false if not
			 */
			valid: function () {
				// n.b. valid() has side effects and both should be called every time the function is called.
				// do not short-circuit.
				var formValid = this.$form.valid(),
					licenseInputValid = !this.showCustomDiv || this.licenseInput.valid();
				return formValid && licenseInputValid;
			},

			getLicenseWikiText: function () {
				var defaultLicense,
					defaultType = config.licensing.defaultType;

				if ( defaultType === 'ownwork' ) {
					defaultLicense = config.licensing.ownWork.defaults[ 0 ];
				} else {
					defaultLicense = config.licensing.ownWork.licenses[ 0 ];
				}

				if ( this.showCustomDiv && this.licenseInput.getWikiText() !== '' ) {
					return this.licenseInput.getWikiText();
				} else {
					return '{{' +
								config.licensing.ownWork.template +
							'|' +
								defaultLicense +
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

				if ( author === '' ) {
					author = this.$authorInput2.val();
				}

				if ( author.indexOf( '[' ) >= 0 || author.indexOf( '{' ) >= 0 ) {
					return author;
				}

				return '[[User:' + mw.config.get( 'wgUserName' ) + '|' + author + ']]';
			},

			setFormFields: function ( $selector ) {
				var $customDiv, $formFields, $toggler, rules, messages, defaultLicense,
					defaultLicenseURL, defaultLicenseMsg, defaultLicenseExplainMsg,
					defaultLicenseLink, $standardDiv, $crossfader, thisDeed, languageCode, defaultType;

				this.$selector = $selector;
				thisDeed = this;
				languageCode = mw.config.get( 'wgUserLanguage' );
				defaultType = config.licensing.defaultType;

				if ( defaultType === 'ownwork' ) {
					defaultLicense = config.licensing.ownWork.defaults[ 0 ];
				} else {
					defaultLicense = config.licensing.ownWork.licenses[ 0 ];
				}

				defaultLicenseURL = config.licenses[ defaultLicense ].url === undefined ?
						'#missing license URL' :
						config.licenses[ defaultLicense ].url + 'deed.' + languageCode;
				defaultLicenseMsg = 'mwe-upwiz-source-ownwork-assert-' + defaultLicense;
				defaultLicenseExplainMsg = 'mwe-upwiz-source-ownwork-' + defaultLicense + '-explain';
				defaultLicenseLink = $( '<a>' ).attr( { target: '_blank', href: defaultLicenseURL } );

				this.$form = $( '<form>' );
				this.authorInput2 = new OO.ui.TextInputWidget( {
					name: 'author2',
					classes: [ 'mwe-upwiz-sign' ],
					title: mw.message( 'mwe-upwiz-tooltip-sign' ).text(),
					value: mw.config.get( 'wgUserName' )
				} );

				$standardDiv = $( '<div />' ).append(
					$( '<label for="author2" generated="true" class="mwe-validator-error" style="display: block;" />' ),
					$( '<p></p>' ).msg(
							defaultLicenseMsg,
							uploadCount,
							this.authorInput2.$element,
							defaultLicenseLink
					),
					$( '<p class="mwe-small-print"></p>' ).msg(
						defaultLicenseExplainMsg,
						uploadCount
					)
				);
				$crossfader = $( '<div />' ).append( $standardDiv );

				if ( this.showCustomDiv ) {
					$customDiv = $( '<div />' ).append(
						$( '<label for="author" generated="true" class="mwe-validator-error" style="display: block;" />' ),
						$( '<p></p>' ).msg( 'mwe-upwiz-source-ownwork-assert-custom',
							uploadCount,
							this.authorInput.$element ),
						licenseInputDiv
					);

					$crossfader.append( $customDiv );
				}

				$formFields = $( '<div class="mwe-upwiz-deed-form-internal" />' )
					.append( $crossfader );

				$toggler = $( '<p class="mwe-more-options" style="text-align: right"></p>' )
					.append( $( '<a />' )
						.msg( 'mwe-upwiz-license-show-all' )
						.click( function () {
							thisDeed.formValidator.resetForm();
							if ( $crossfader.data( 'crossfadeDisplay' ).get( 0 ) === $customDiv.get( 0 ) ) {
								thisDeed.licenseInput.setDefaultValues();
								$crossfader.morphCrossfade( $standardDiv );
								$( this ).msg( 'mwe-upwiz-license-show-all' );
							} else {
								$crossfader.morphCrossfade( $customDiv );
								$( this ).msg( 'mwe-upwiz-license-show-recommended' );
							}
						} ) );

				if ( this.showCustomDiv ) {
					$formFields.append( $toggler );
				}

				// synchronize both username signatures
				// set initial value to configured username
				// if one changes all the others change (keyup event)
				$formFields.find( '.mwe-upwiz-sign input' )
					.keyup( function () {
						var thisInput = this,
							thisVal = $( thisInput ).val();
						$.each( $formFields.find( '.mwe-upwiz-sign input' ), function ( i, input ) {
							if ( thisInput !== input ) {
								$( input ).val( thisVal );
								$( input ).trigger( 'change' );
							}
						} );
					} );

				this.$form.append( $formFields ).appendTo( $selector );

				// done after added to the DOM, so there are true heights
				$crossfader.morphCrossfader();

				rules = {
					author2: {
						required: function () {
							return $crossfader.data( 'crossfadeDisplay' ).get( 0 ) === $standardDiv.get( 0 );
						},
						minlength: config.minAuthorLength,
						maxlength: config.maxAuthorLength
					}
				};

				messages = {
					author2: {
						required: mw.message( 'mwe-upwiz-error-signature-blank' ).escaped(),
						minlength: mw.message( 'mwe-upwiz-error-signature-too-short', config.minAuthorLength ).escaped(),
						maxlength: mw.message( 'mwe-upwiz-error-signature-too-long', config.maxAuthorLength ).escaped()
					}
				};

				if ( this.showCustomDiv ) {
					// choose default licenses
					this.licenseInput.setDefaultValues();

					rules.author = {
						required: function () {
							return $crossfader.data( 'crossfadeDisplay' ).get( 0 ) === $customDiv.get( 0 );
						},
						minlength: config.minAuthorLength,
						maxlength: config.maxAuthorLength
					};

					messages.author = {
						required: mw.message( 'mwe-upwiz-error-signature-blank' ).escaped(),
						minlength: mw.message( 'mwe-upwiz-error-signature-too-short', config.minAuthorLength ).escaped(),
						maxlength: mw.message( 'mwe-upwiz-error-signature-too-long', config.maxAuthorLength ).escaped()
					};
				}

				// and finally, make it validatable
				this.formValidator = this.$form.validate( {
					rules: rules,
					messages: messages
				} );

				$.each( config.licensing.ownWork.licenses, function ( i, license ) {
					if ( license === defaultLicense ) {
						$( '#license1_' + i ).prop( 'checked', true );
						return false;
					}
				} );
			}
		} );
	};

} )( mediaWiki, mediaWiki.uploadWizard, jQuery );
