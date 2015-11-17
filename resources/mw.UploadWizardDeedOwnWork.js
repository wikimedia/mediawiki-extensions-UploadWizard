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

				$standardDiv = $( '<div />' ).append(
					$( '<p></p>' ).msg(
							defaultLicenseMsg,
							uploadCount,
							this.authorInput.$element,
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
						$( '<p></p>' ).msg( 'mwe-upwiz-source-ownwork-assert-custom',
							uploadCount,
							this.fakeAuthorInput.$element ),
						licenseInputDiv
					);

					$crossfader.append( $customDiv );
				}

				$formFields = $( '<div class="mwe-upwiz-deed-form-internal" />' )
					.append(
						$( '<label for="author" generated="true" class="mwe-validator-error" style="display: block;" />' ),
						$crossfader
					);

				$toggler = $( '<p class="mwe-more-options" style="text-align: right"></p>' )
					.append( $( '<a />' )
						.msg( 'mwe-upwiz-license-show-all' )
						.click( function () {
							thisDeed.formValidator.resetForm();
							if ( $crossfader.data( 'crossfadeDisplay' ).get( 0 ) === $customDiv.get( 0 ) ) {
								thisDeed.licenseInput.setDefaultValues();
								$crossfader.morphCrossfade( $standardDiv )
									.promise().done( function () {
										swapNodes( thisDeed.authorInput.$element[ 0 ], thisDeed.fakeAuthorInput.$element[ 0 ] );
									} );
								$( this ).msg( 'mwe-upwiz-license-show-all' );
							} else {
								$crossfader.morphCrossfade( $customDiv )
									.promise().done( function () {
										swapNodes( thisDeed.authorInput.$element[ 0 ], thisDeed.fakeAuthorInput.$element[ 0 ] );
									} );
								$( this ).msg( 'mwe-upwiz-license-show-recommended' );
							}
						} ) );

				if ( this.showCustomDiv ) {
					$formFields.append( $toggler );
				}

				this.$form.append( $formFields ).appendTo( $selector );

				// done after added to the DOM, so there are true heights
				$crossfader.morphCrossfader();

				rules = {
					author: {
						required: function () {
							return true;
						},
						minlength: config.minAuthorLength,
						maxlength: config.maxAuthorLength
					}
				};

				messages = {
					author: {
						required: mw.message( 'mwe-upwiz-error-signature-blank' ).escaped(),
						minlength: mw.message( 'mwe-upwiz-error-signature-too-short', config.minAuthorLength ).escaped(),
						maxlength: mw.message( 'mwe-upwiz-error-signature-too-long', config.maxAuthorLength ).escaped()
					}
				};

				if ( this.showCustomDiv ) {
					// choose default licenses
					this.licenseInput.setDefaultValues();
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
