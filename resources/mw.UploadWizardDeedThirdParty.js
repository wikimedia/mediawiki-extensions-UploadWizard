( function ( mw, uw, $ ) {

	// Runs through the third-party license groups and finds the
	// relevant ID for that license. Probably really hacky.
	// TODO do this properly once we build the license links properly
	function findLicenseRecursively( config, license ) {
		var val,
			count = 0;

		$.each( config.licensing.thirdParty.licenseGroups, function ( i, licenseGroup ) {
			$.each( licenseGroup.licenses, function ( j, licenseCandidate ) {
				if ( licenseCandidate === license ) {
					val = '2_' + count;
					return false;
				}

				count++;
			} );

			if ( val !== undefined ) {
				return false;
			}
		} );

		return val;
	}

	/**
	 * Set up the form and deed object for the deed option that says these uploads are the work of a third party.
	 *
	 * @param {number} uploadCount Integer count of uploads that this deed refers to (useful for message pluralization)
	 * @param {mw.Api} api API object - useful for doing previews
	 * @param {Object} config The UW config
	 */
	mw.UploadWizardDeedThirdParty = function ( uploadCount, api, config ) {
		var licenseInputDiv,
			deed = new mw.UploadWizardDeed();

		deed.uploadCount = uploadCount ? uploadCount : 1;
		deed.sourceInput = new OO.ui.TextInputWidget( {
			multiline: true,
			autosize: true,
			classes: [ 'mwe-source' ],
			name: 'source'
		} );
		deed.sourceInput.$input.attr( 'id', 'mwe-source-' + deed.getInstanceCount() );

		deed.authorInput = new OO.ui.TextInputWidget( {
			multiline: true,
			autosize: true,
			classes: [ 'mwe-author' ],
			name: 'author'
		} );
		deed.authorInput.$input.attr( 'id', 'mwe-author-' + deed.getInstanceCount() );

		licenseInputDiv = $( '<div class="mwe-upwiz-deed-license-groups"></div>' );

		deed.licenseInput = new mw.UploadWizardLicenseInput(
			licenseInputDiv,
			undefined,
			config.licensing.thirdParty,
			deed.uploadCount,
			api
		);
		deed.licenseInput.setDefaultValues();

		return $.extend( deed, mw.UploadWizardDeed.prototype, {
			name: 'thirdparty',

			setFormFields: function ( $selector ) {
				var $defaultLicense, defaultLicense, defaultLicenseNum, defaultType,
					$formFields = $( '<div class="mwe-upwiz-deed-form-internal" />' );

				this.$form = $( '<form>' );

				defaultType = config.licensing.defaultType;

				if ( this.uploadCount > 1 ) {
					$formFields.append( $( '<div>' ).msg( 'mwe-upwiz-source-thirdparty-custom-multiple-intro' ) );
				}

				$formFields.append(
					$( '<div class="mwe-upwiz-source-thirdparty-custom-multiple-intro" />' ),
					$( '<label generated="true" class="mwe-validator-error" style="display: block;" />' )
						.attr( 'for', 'mwe-source-' + this.getInstanceCount() ),
					$( '<div class="mwe-upwiz-thirdparty-fields" />' )
						.append( $( '<label>' )
								.text( mw.message( 'mwe-upwiz-source' ).text() )
								.attr( 'for', 'mwe-source-' + this.getInstanceCount() )
								.addHint( 'source' )
								.requiredFieldLabel(),
							this.sourceInput.$element ),
					$( '<label generated="true" class="mwe-validator-error" style="display: block;" />' )
						.attr( 'for', 'mwe-author-' + this.getInstanceCount() ),
					$( '<div class="mwe-upwiz-thirdparty-fields" />' )
						.append( $( '<label>' )
								.text( mw.message( 'mwe-upwiz-author' ).text() )
								.attr( 'for', 'mwe-author-' + this.getInstanceCount() )
								.addHint( 'author' )
								.requiredFieldLabel(),
							this.authorInput.$element ),
					$( '<div class="mwe-upwiz-thirdparty-license" />' )
						.append( $( '<div>' ).msg( 'mwe-upwiz-source-thirdparty-cases', this.uploadCount ) )
						.append( licenseInputDiv )
				);

				this.$form.validate( {
					rules: {
						source: {
							required: true,
							minlength: config.minSourceLength,
							maxlength: config.maxSourceLength
						},
						author: {
							required: true,
							minlength: config.minAuthorLength,
							maxlength: config.maxAuthorLength
						}
					},
					messages: {
						source: {
							required: mw.message( 'mwe-upwiz-error-blank' ).escaped(),
							minlength: mw.message( 'mwe-upwiz-error-too-short', config.minSourceLength ).escaped(),
							maxlength: mw.message( 'mwe-upwiz-error-too-long', config.maxSourceLength ).escaped()
						},
						author: {
							required: mw.message( 'mwe-upwiz-error-blank' ).escaped(),
							minlength: mw.message( 'mwe-upwiz-error-too-short', config.minAuthorLength ).escaped(),
							maxlength: mw.message( 'mwe-upwiz-error-too-long', config.maxAuthorLength ).escaped()
						}
					}
				} );

				this.$form.append( $formFields );

				$selector.append( this.$form );

				if ( defaultType === 'thirdparty' ) {
					defaultLicense = config.licensing.thirdParty.defaults[ 0 ];

					defaultLicenseNum = findLicenseRecursively( config, defaultLicense );

					if ( defaultLicenseNum ) {
						$defaultLicense = $( '#license' + defaultLicenseNum );
						$defaultLicense
							.closest( '.mwe-upwiz-deed-license-group' )
							.find( '.mwe-upwiz-toggler' )
							.click();
						$defaultLicense.prop( 'checked', true );
					}
				}
			},

			/**
			 * Is this correctly set, with side effects of causing errors to show in interface.
			 * this is exactly the same as the ownwork valid() function... hopefully we can reduce these to nothing if we make
			 * all validators work the same.
			 *
			 * @return {boolean} true if valid, false if not
			 */
			valid: function () {
				// n.b. valid() has side effects and both should be called every time the function is called.
				// do not short-circuit.
				var formValid = this.$form.valid(),
					licenseInputValid = this.licenseInput.valid();

				return formValid && licenseInputValid;
			}
		} );
	};

} )( mediaWiki, mediaWiki.uploadWizard, jQuery );
