/**
 * Sort of an abstract class for deeds
 */
( function( $j, undefined ) {

mw.UploadWizardDeed = function() {
	var _this = this;
	// prevent from instantiating directly?
	return false;
};

mw.UploadWizardDeed.prototype = {
	valid: function() {
		return false;
	},

	setFormFields: function() { },

	getSourceWikiText: function() {
		return $j( this.sourceInput ).val();
	},

	getAuthorWikiText: function() {
		return $j( this.authorInput ).val();
	},

	/**
	 * Get wikitext representing the licenses selected in the license object
	 * @return wikitext of all applicable license templates.
	 */
	getLicenseWikiText: function() {
		return this.licenseInput.getWikiText();
	}

};

/**
 * Set up the form and deed object for the deed option that says these uploads are all the user's own work.
 * @param {Number} integer count of uploads that this deed refers to (useful for message pluralization)
 * @param {mw.Api} api object - useful for doing previews
 */
mw.UploadWizardDeedOwnWork = function( uploadCount, api ) {
	uploadCount = uploadCount ? uploadCount : 1;

	var _this = new mw.UploadWizardDeed();

	_this.authorInput = $j( '<input type="text" />' )
		.attr( { name: "author" } )
		.addClass( 'mwe-upwiz-sign' );

	var ownWork = mw.UploadWizard.config.licensing.ownWork;
	_this.showCustomDiv = ownWork.licenses.length > 1;

	if ( _this.showCustomDiv ) {
		var licenseInputDiv = $j( '<div class="mwe-upwiz-deed-license"></div>' );

		_this.licenseInput = new mw.UploadWizardLicenseInput(
			licenseInputDiv,
			undefined,
			mw.UploadWizard.config.licensing.ownWork,
			_this.uploadCount,
			api
		);
	}

	return $j.extend( _this, {

		name: 'ownwork',

		/**
		 * Is this correctly set, with side effects of causing errors to show in interface.
		 * @return boolean true if valid, false if not
		 */
		valid: function() {
			// n.b. valid() has side effects and both should be called every time the function is called.
			// do not short-circuit.
			var formValid = _this.$form.valid();
			var licenseInputValid = !_this.showCustomDiv || _this.licenseInput.valid();
			return formValid && licenseInputValid;
		},

		getLicenseWikiText: function() {
			if ( _this.showCustomDiv && this.licenseInput.getWikiText() !== '' ) {
				return this.licenseInput.getWikiText();
			}
			else {
				return '{{' +
							mw.UploadWizard.config.licensing.ownWork.template +
						'|' +
							mw.UploadWizard.config.licensing.ownWork.licenses[0] +
						'}}';
			}
		},

		getSourceWikiText: function() {
			return '{{own}}';
		},

		// XXX do we need to escape authorInput, or is wikitext a feature here?
		// what about scripts?
		getAuthorWikiText: function() {
			var author = $j( _this.authorInput ).val();

			if ( author === '' ) {
				author = _this.$authorInput2.val();
			}

			if ( author.indexOf( '[' ) >= 0 || author.indexOf( '{' ) >= 0 ) {
				return author;
			}

			return '[[User:' + mw.config.get( 'wgUserName' ) + '|' + author + ']]';
		},


		setFormFields: function( $selector ) {
			_this.$selector = $selector;
			var languageCode = mw.config.get( 'wgUserLanguage' );

			_this.$form = $j( '<form />' );

			_this.$authorInput2 = $j( '<input type="text" />' ).attr( { name: "author2" } ).addClass( 'mwe-upwiz-sign' );

			var defaultLicense = mw.UploadWizard.config.licensing.ownWork.licenses[0];
			var defaultLicenseURL = mw.UploadWizard.config.licenses[defaultLicense].url === undefined ?
						'#missing license URL' :
						mw.UploadWizard.config.licenses[defaultLicense].url + 'deed.' + languageCode;
			var defaultLicenseMsg = 'mwe-upwiz-source-ownwork-assert-' + defaultLicense;
			var defaultLicenseExplainMsg = 'mwe-upwiz-source-ownwork-' + defaultLicense + '-explain';
			var defaultLicenseLink = $j( '<a>' ).attr( { 'target': '_blank', 'href': defaultLicenseURL } );

			var $standardDiv = $j( '<div />' ).append(
				$j( '<label for="author2" generated="true" class="mwe-validator-error" style="display:block;" />' ),
				$j( '<p></p>' ).msg(
						defaultLicenseMsg,
						uploadCount,
						_this.$authorInput2,
						defaultLicenseLink
				),
				$j( '<p class="mwe-small-print"></p>' ).msg(
					defaultLicenseExplainMsg,
					uploadCount
				)
			);

			var $crossfader = $j( '<div />' ).append( $standardDiv );

			if ( _this.showCustomDiv ) {
				var $customDiv = $j('<div />').append(
					$j( '<label for="author" generated="true" class="mwe-validator-error" style="display:block;" />' ),
					$j( '<p></p>' ).msg( 'mwe-upwiz-source-ownwork-assert-custom',
						uploadCount,
						_this.authorInput ),
					licenseInputDiv
				);

				$crossfader.append( $customDiv );
			}

			var $formFields = $j( '<div class="mwe-upwiz-deed-form-internal" />' )
				.append( $crossfader );

			var $toggler = $j( '<p class="mwe-more-options" style="text-align: right"></p>' )
				.append( $j( '<a />' )
					.msg( 'mwe-upwiz-license-show-all' )
					.click( function() {
						_this.formValidator.resetForm();
						if ( $crossfader.data( 'crossfadeDisplay' ).get(0) === $customDiv.get(0) ) {
							_this.licenseInput.setDefaultValues();
							$crossfader.morphCrossfade( $standardDiv );
							$j( this ).msg( 'mwe-upwiz-license-show-all' );
						} else {
							$crossfader.morphCrossfade( $customDiv );
							$j( this ).msg( 'mwe-upwiz-license-show-recommended' );
						}
					} ) );

			if ( _this.showCustomDiv ) {
				$formFields.append( $toggler );
			}

			// synchronize both username signatures
			// set initial value to configured username
			// if one changes all the others change (keyup event)
			$formFields.find( '.mwe-upwiz-sign' )
				.attr( {
					title: mw.msg( 'mwe-upwiz-tooltip-sign' ),
					value: mw.config.get(  'wgUserName' )
				} )
				.keyup( function() {
					var thisInput = this;
					var thisVal = $j( thisInput ).val();
					$j.each( $formFields.find( '.mwe-upwiz-sign' ), function( i, input ) {
						if (thisInput !== input) {
							$j( input ).val( thisVal );
						}
					} );
				} );

			_this.$form.append( $formFields );
			$selector.append( _this.$form );

			// done after added to the DOM, so there are true heights
			$crossfader.morphCrossfader();

			var rules = {
				author2: {
					required: function( element ) {
						return $crossfader.data( 'crossfadeDisplay' ).get(0) === $standardDiv.get(0);
					},
					minlength: mw.UploadWizard.config.minAuthorLength,
					maxlength: mw.UploadWizard.config.maxAuthorLength
				}
			};

			var messages = {
				author2: {
					required: mw.msg( 'mwe-upwiz-error-signature-blank' ),
					minlength: mw.msg( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config.minAuthorLength ),
					maxlength: mw.msg( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config.maxAuthorLength )
				}
			};

			if ( _this.showCustomDiv ) {
				// choose default licenses
				_this.licenseInput.setDefaultValues();

				rules.author = {
					required: function( element ) {
						return $crossfader.data( 'crossfadeDisplay' ).get(0) === $customDiv.get(0);
					},
					minlength: mw.UploadWizard.config.minAuthorLength,
					maxlength: mw.UploadWizard.config.maxAuthorLength
				};

				messages.author = {
					required: mw.msg( 'mwe-upwiz-error-signature-blank' ),
					minlength: mw.msg( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config.minAuthorLength ),
					maxlength: mw.msg( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config.maxAuthorLength )
				};
			}

			// and finally, make it validatable
			_this.formValidator = _this.$form.validate( {
				rules: rules,
				messages: messages
			} );
		}


	} );

};

/**
 * Set up the form and deed object for the deed option that says these uploads are the work of a third party.
 * @param {Number} integer count of uploads that this deed refers to (useful for message pluralization)
 * @param {mw.Api} api object - useful for doing previews
 */
mw.UploadWizardDeedThirdParty = function( uploadCount, api ) {
	var _this, licenseInputDiv;

	_this = new mw.UploadWizardDeed();

	_this.uploadCount = uploadCount ? uploadCount : 1;
	_this.sourceInput = $j('<textarea class="mwe-source mwe-long-textarea" name="source" rows="1" cols="40"></textarea>' )
				.growTextArea();
	_this.authorInput = $j('<textarea class="mwe-author mwe-long-textarea" name="author" rows="1" cols="40"></textarea>' )
				.growTextArea();
	licenseInputDiv = $j( '<div class="mwe-upwiz-deed-license-groups"></div>' );
	_this.licenseInput = new mw.UploadWizardLicenseInput(
		licenseInputDiv,
		undefined,
		mw.UploadWizard.config.licensing.thirdParty,
		_this.uploadCount,
		api
	);
	_this.licenseInput.setDefaultValues();


	return $j.extend( _this, mw.UploadWizardDeed.prototype, {
		name: 'thirdparty',

		setFormFields: function( $selector ) {
			var _this = this;
			_this.$form = $j( '<form />' );

			var $formFields = $j( '<div class="mwe-upwiz-deed-form-internal" />' );

			if ( _this.uploadCount > 1 ) {
				$formFields.append( $j( '<div />' ).msg( 'mwe-upwiz-source-thirdparty-custom-multiple-intro' ) );
			}

			$formFields.append (
				$j( '<div class="mwe-upwiz-source-thirdparty-custom-multiple-intro" />' ),
				$j( '<label for="source" generated="true" class="mwe-validator-error" style="display:block;" />' ),
				$j( '<div class="mwe-upwiz-thirdparty-fields" />' )
					.append( $j( '<label for="source" />' ).text( mw.msg( 'mwe-upwiz-source' ) ).addHint( 'source' ),
						_this.sourceInput ),
				$j( '<label for="author" generated="true" class="mwe-validator-error" style="display:block;" />' ),
				$j( '<div class="mwe-upwiz-thirdparty-fields" />' )
					.append( $j( '<label for="author" />' ).text( mw.msg( 'mwe-upwiz-author' ) ).addHint( 'author' ),
						_this.authorInput ),
				$j( '<div class="mwe-upwiz-thirdparty-license" />' )
					.append( $j( '<div></div>' ).msg( 'mwe-upwiz-source-thirdparty-cases', _this.uploadCount ) )
					.append( licenseInputDiv )
			);

			_this.$form.validate( {
				rules: {
					source: { required: true,
						minlength: mw.UploadWizard.config.minSourceLength,
						maxlength: mw.UploadWizard.config.maxSourceLength },
					author: { required: true,
						minlength: mw.UploadWizard.config.minAuthorLength,
						maxlength: mw.UploadWizard.config.maxAuthorLength }
				},
				messages: {
					source: {
						required: mw.msg( 'mwe-upwiz-error-blank' ),
						minlength: mw.msg( 'mwe-upwiz-error-too-short', mw.UploadWizard.config.minSourceLength ),
						maxlength: mw.msg( 'mwe-upwiz-error-too-long', mw.UploadWizard.config.maxSourceLength )
					},
					author: {
						required: mw.msg( 'mwe-upwiz-error-blank' ),
						minlength: mw.msg( 'mwe-upwiz-error-too-short', mw.UploadWizard.config.minAuthorLength ),
						maxlength: mw.msg( 'mwe-upwiz-error-too-long', mw.UploadWizard.config.maxAuthorLength )
					}
				}
			} );

			_this.$form.append( $formFields );

			$selector.append( _this.$form );
		},

		/**
		 * Is this correctly set, with side effects of causing errors to show in interface.
		 * this is exactly the same as the ownwork valid() function... hopefully we can reduce these to nothing if we make
		 * all validators work the same.
		 * @return boolean true if valid, false if not
		 */
		valid: function() {
			// n.b. valid() has side effects and both should be called every time the function is called.
			// do not short-circuit.
			var formValid = _this.$form.valid();
			var licenseInputValid = _this.licenseInput.valid();
			return formValid && licenseInputValid;
		}
	} );
};




/**
 * Interface widget to choose among various deeds -- for instance, if own work, or not own work, or other such cases.
 * @param {String|jQuery} selector where to put this deed chooser
 * @param {Array[UploadWizardDeed]} deeds
 * @param {Array[UploadWizardUpload]} uploads that this applies to (this is just to make deleting and plurals work)
 */
mw.UploadWizardDeedChooser = function( selector, deeds, uploads, api ) {
	var _this = this;
	_this.$selector = $j( selector );
	_this.uploads = uploads === undefined ? [] : uploads;


	_this.$errorEl = $j( '<div class="mwe-error"></div>' );
	_this.$selector.append( _this.$errorEl );

	// name for radio button set
	mw.UploadWizardDeedChooser.prototype.widgetCount++;
	_this.name = 'deedChooser' + mw.UploadWizardDeedChooser.prototype.widgetCount.toString();

	_this.onLayoutReady = function() {};

	$j.each( deeds, function ( i, deed ) {
		var id = _this.name + '-' + deed.name;
		var $deedInterface = $j(
			'<div class="mwe-upwiz-deed mwe-upwiz-deed-' + deed.name + '">' +
				'<div class="mwe-upwiz-deed-option-title">' +
					'<span class="mwe-upwiz-deed-header">' +
						'<input id="' + id +'" name="' + _this.name + '" type="radio" value="' + deed.name + ' /">' +
						'<label for="' + id + '" class="mwe-upwiz-deed-name">' +
							mw.msg( 'mwe-upwiz-source-' + deed.name, _this.uploads.length ) +
						'</label>' +
					'</span>' +
				'</div>' +
				'<div class="mwe-upwiz-deed-form"></div>' +
			'</div>'
		);

		var $deedSelector = _this.$selector.append( $deedInterface );

		deed.setFormFields( $deedInterface.find( '.mwe-upwiz-deed-form' ) );

		var selectDeedFunction = function() {
			_this.choose( deed );
			_this.selectDeedInterface( $deedInterface );
			$deedInterface.find( 'span.mwe-upwiz-deed-header input' ).attr( 'checked', true );
		};

		if ( deeds.length == 1 ) {
			_this.onLayoutReady = selectDeedFunction;
		}
		else {
			if ( mw.UploadWizard.config.licensing.defaultType === deed.name ) {
				_this.onLayoutReady = selectDeedFunction;
			}
			$deedInterface.find( 'span.mwe-upwiz-deed-header input' ).click( function() {
				if ( $j( this ).is( ':checked' )  ) {
					_this.choose( deed );
					_this.selectDeedInterface( $deedInterface );
				}
			} );
		}
	} );

	// deselect all deeds
	_this.deselectDeedInterface( this.$selector.find( '.mwe-upwiz-deed' ) );
};


mw.UploadWizardDeedChooser.prototype = {

	/**
	 * How many deed choosers there are (important for creating unique ids, element names)
	 */
	widgetCount: 0,

	/**
	 * Check if this form is filled out correctly, with side effects of showing error messages if invalid
	 * @return boolean; true if valid, false if not
	 */
	valid: function() {
		var _this = this;
		// we assume there is always a deed available, even if it's just the null deed.
		var valid = _this.deed.valid();
		// the only time we need to set an error message is if the null deed is selected.
		// otherwise, we can assume that the widgets have already added error messages.
		if (valid) {
			_this.hideError();
		}
		return valid;
	},

	showError: function( error ) {
		this.$errorEl.html( error );
		this.$errorEl.fadeIn();
	},

	hideError: function() {
		this.$errorEl.fadeOut();
		this.$errorEl.empty();
	},

	/**
	 * Uploads this deed controls
	 */
	uploads: [],


	choose: function( deed ) {
		var _this = this;
		_this.deed = deed;
		$( '#mwe-upwiz-stepdiv-deeds .mwe-upwiz-button-next' ).show();
	},

	/**
	 * From the deed choices, make a choice fade to the background a bit, hide the extended form
	 */
	deselectDeedInterface: function( $deedSelector ) {
		$deedSelector.removeClass( 'selected' );
		$j.each( $deedSelector.find( '.mwe-upwiz-deed-form' ), function( i, form ) {
			var $form = $j( form );
			$j.each( $form.find(".mwe-upwiz-hint"), function( i, hint ) {
				$j( hint ).tipsy("hide");
			} );
			// Remove errors
			var originalResetForm = $j.fn.resetForm;
			if ( originalResetForm ) {
				// Make sure that $validator.resetForm() resets only the errors, not the form fields!
				$j.fn.resetForm = function() { };
			}
			$j.each( $form.find( 'form' ), function( i, form ) {
				var $validator = $j( form ).data( 'validator' );
				if ( $validator ) {
					$validator.resetForm(); // Clear out all errors in the form
				}
			} );
			$j.fn.resetForm = originalResetForm;
			// Prevent validation of deselected deeds by disabling all form inputs
			$form.find( ':input' ).attr( 'disabled', true );
			if ( $form.parents().is( ':hidden' ) ) {
				$form.hide();
			} else {
				$form.slideUp( 500 );
			}
		} );
	},

	/**
	 * From the deed choice page, show a particular deed
	 */
	selectDeedInterface: function( $deedSelector ) {
		var $otherDeeds = $deedSelector.siblings().filter( '.mwe-upwiz-deed' );
		this.deselectDeedInterface( $otherDeeds );
		$deedSelector.addClass( 'selected' ).fadeTo( 'fast', 1.0 );
		$j.each( $deedSelector.find( '.mwe-upwiz-deed-form' ), function( i, form ) {
			var $form = $j( form );
			// (Re-)enable all form inputs
			$form.find( ':input' ).removeAttr( 'disabled' );
			if ( $form.is( ':hidden' ) ) {
				// if the form was hidden, set things up so a slide-down works
				$form.show().slideUp( 0 );
			}
			$form.slideDown( 500 );
		} );
	},

	remove: function() {
		this.$selector.html('');
	}

}; // end UploadWizardDeed.prototype

} )( jQuery );
