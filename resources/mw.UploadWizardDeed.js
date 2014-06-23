/**
 * Sort of an abstract class for deeds
 */
( function( mw, $ ) {

// Runs through the third-party license groups and finds the
// relevant ID for that license. Probably really hacky.
// TODO do this properly once we build the license links properly
function findLicenseRecursively( license ) {
	var val,
		count = 0;

	$.each( mw.UploadWizard.config.licensing.thirdParty.licenseGroups, function ( i, licenseGroup ) {
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

mw.UploadWizardDeed = function() {
	mw.UploadWizardDeed.prototype.instanceCount++;

	// prevent from instantiating directly?
	return false;
};

mw.UploadWizardDeed.prototype = {
	instanceCount: 0,

	valid: function() {
		return false;
	},

	getInstanceCount: function() {
		return this.instanceCount;
	},

	setFormFields: function() { },

	getSourceWikiText: function() {
		return $( this.sourceInput ).val();
	},

	getAuthorWikiText: function() {
		return $( this.authorInput ).val();
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

	_this.authorInput = $( '<input type="text" />' )
		.attr( { name: "author" } )
		.addClass( 'mwe-upwiz-sign' );

	var ownWork = mw.UploadWizard.config.licensing.ownWork;
	_this.showCustomDiv = ownWork.licenses.length > 1;

	if ( _this.showCustomDiv ) {
		var licenseInputDiv = $( '<div class="mwe-upwiz-deed-license"></div>' );

		_this.licenseInput = new mw.UploadWizardLicenseInput(
			licenseInputDiv,
			undefined,
			mw.UploadWizard.config.licensing.ownWork,
			_this.uploadCount,
			api
		);
	}

	return $.extend( _this, {

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
			var defaultLicense;
				defaultType = mw.UploadWizard.config.licensing.defaultType;

			if ( defaultType === 'ownwork' ) {
				defaultLicense = mw.UploadWizard.config.licensing.ownWork.defaults[0];
			} else {
				defaultLicense = mw.UploadWizard.config.licensing.ownWork.licenses[0];
			}

			if ( _this.showCustomDiv && this.licenseInput.getWikiText() !== '' ) {
				return this.licenseInput.getWikiText();
			}
			else {
				return '{{' +
							mw.UploadWizard.config.licensing.ownWork.template +
						'|' +
							defaultLicense +
						'}}';
			}
		},

		getSourceWikiText: function() {
			return '{{own}}';
		},

		// XXX do we need to escape authorInput, or is wikitext a feature here?
		// what about scripts?
		getAuthorWikiText: function() {
			var author = $( _this.authorInput ).val();

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

			_this.$form = $( '<form />' );

			_this.$authorInput2 = $( '<input type="text" />' ).attr( { name: "author2" } ).addClass( 'mwe-upwiz-sign' );

			var defaultLicense,
				defaultType = mw.UploadWizard.config.licensing.defaultType;

			if ( defaultType === 'ownwork' ) {
				defaultLicense = mw.UploadWizard.config.licensing.ownWork.defaults[0];
			} else {
				defaultLicense = mw.UploadWizard.config.licensing.ownWork.licenses[0];
			}

			var defaultLicenseURL = mw.UploadWizard.config.licenses[defaultLicense].url === undefined ?
						'#missing license URL' :
						mw.UploadWizard.config.licenses[defaultLicense].url + 'deed.' + languageCode;

			var defaultLicenseMsg = 'mwe-upwiz-source-ownwork-assert-' + defaultLicense;
			var defaultLicenseExplainMsg = 'mwe-upwiz-source-ownwork-' + defaultLicense + '-explain';
			var defaultLicenseLink = $( '<a>' ).attr( { 'target': '_blank', 'href': defaultLicenseURL } );

			var $standardDiv = $( '<div />' ).append(
				$( '<label for="author2" generated="true" class="mwe-validator-error" style="display:block;" />' ),
				$( '<p></p>' ).msg(
						defaultLicenseMsg,
						uploadCount,
						_this.$authorInput2,
						defaultLicenseLink
				),
				$( '<p class="mwe-small-print"></p>' ).msg(
					defaultLicenseExplainMsg,
					uploadCount
				)
			);

			var $crossfader = $( '<div />' ).append( $standardDiv );

			if ( _this.showCustomDiv ) {
				var $customDiv = $('<div />').append(
					$( '<label for="author" generated="true" class="mwe-validator-error" style="display:block;" />' ),
					$( '<p></p>' ).msg( 'mwe-upwiz-source-ownwork-assert-custom',
						uploadCount,
						_this.authorInput ),
					licenseInputDiv
				);

				$crossfader.append( $customDiv );
			}

			var $formFields = $( '<div class="mwe-upwiz-deed-form-internal" />' )
				.append( $crossfader );

			var $toggler = $( '<p class="mwe-more-options" style="text-align: right"></p>' )
				.append( $( '<a />' )
					.msg( 'mwe-upwiz-license-show-all' )
					.click( function() {
						_this.formValidator.resetForm();
						if ( $crossfader.data( 'crossfadeDisplay' ).get(0) === $customDiv.get(0) ) {
							_this.licenseInput.setDefaultValues();
							$crossfader.morphCrossfade( $standardDiv );
							$( this ).msg( 'mwe-upwiz-license-show-all' );
						} else {
							$crossfader.morphCrossfade( $customDiv );
							$( this ).msg( 'mwe-upwiz-license-show-recommended' );
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
					title: mw.message( 'mwe-upwiz-tooltip-sign' ).escaped(),
					value: mw.config.get(  'wgUserName' )
				} )
				.keyup( function() {
					var thisInput = this;
					var thisVal = $( thisInput ).val();
					$.each( $formFields.find( '.mwe-upwiz-sign' ), function( i, input ) {
						if (thisInput !== input) {
							$( input ).val( thisVal );
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
					required: mw.message( 'mwe-upwiz-error-signature-blank' ).escaped(),
					minlength: mw.message( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config.minAuthorLength ).escaped(),
					maxlength: mw.message( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config.maxAuthorLength ).escaped()
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
					required: mw.message( 'mwe-upwiz-error-signature-blank' ).escaped(),
					minlength: mw.message( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config.minAuthorLength ).escaped(),
					maxlength: mw.message( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config.maxAuthorLength ).escaped()
				};
			}

			// and finally, make it validatable
			_this.formValidator = _this.$form.validate( {
				rules: rules,
				messages: messages
			} );

			$.each( mw.UploadWizard.config.licensing.ownWork.licenses, function ( i, license ) {
				if ( license === defaultLicense ) {
					$( '#license1_' + i ).prop( 'checked', true );
					return false;
				}
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
	_this.sourceInput = $('<textarea class="mwe-source mwe-long-textarea" name="source" rows="1" cols="40"></textarea>' )
				.attr( 'id', 'mwe-source-' + _this.getInstanceCount() )
				.growTextArea();
	_this.authorInput = $('<textarea class="mwe-author mwe-long-textarea" name="author" rows="1" cols="40"></textarea>' )
				.attr( 'id', 'mwe-author-' + _this.getInstanceCount() )
				.growTextArea();
	licenseInputDiv = $( '<div class="mwe-upwiz-deed-license-groups"></div>' );

	_this.licenseInput = new mw.UploadWizardLicenseInput(
		licenseInputDiv,
		undefined,
		mw.UploadWizard.config.licensing.thirdParty,
		_this.uploadCount,
		api
	);
	_this.licenseInput.setDefaultValues();


	return $.extend( _this, mw.UploadWizardDeed.prototype, {
		name: 'thirdparty',

		setFormFields: function( $selector ) {
			var $defaultLicense, defaultLicense, defaultLicenseNum, defaultType,
				_this = this;

			_this.$form = $( '<form>' );

			defaultType = mw.UploadWizard.config.licensing.defaultType;
			var $formFields = $( '<div class="mwe-upwiz-deed-form-internal" />' );

			if ( _this.uploadCount > 1 ) {
				$formFields.append( $( '<div>' ).msg( 'mwe-upwiz-source-thirdparty-custom-multiple-intro' ) );
			}

			$formFields.append (
				$( '<div class="mwe-upwiz-source-thirdparty-custom-multiple-intro" />' ),
				$( '<label generated="true" class="mwe-validator-error" style="display:block;" />' )
					.attr( 'for', 'mwe-source-' + _this.getInstanceCount() ),
				$( '<div class="mwe-upwiz-thirdparty-fields" />' )
					.append( $( '<label>' )
							.text( mw.message( 'mwe-upwiz-source' ).text() )
							.attr( 'for', 'mwe-source-' + _this.getInstanceCount() )
							.addHint( 'source' ),
						_this.sourceInput ),
				$( '<label generated="true" class="mwe-validator-error" style="display:block;" />' )
					.attr( 'for', 'mwe-author-' + _this.getInstanceCount() ),
				$( '<div class="mwe-upwiz-thirdparty-fields" />' )
					.append( $( '<label>' )
							.text( mw.message( 'mwe-upwiz-author' ).text() )
							.attr( 'for', 'mwe-author-' + _this.getInstanceCount() )
							.addHint( 'author' ),
						_this.authorInput ),
				$( '<div class="mwe-upwiz-thirdparty-license" />' )
					.append( $( '<div>' ).msg( 'mwe-upwiz-source-thirdparty-cases', _this.uploadCount ) )
					.append( licenseInputDiv )
			);

			_this.$form.validate( {
				rules: {
					source: {
						required: true,
						minlength: mw.UploadWizard.config.minSourceLength,
						maxlength: mw.UploadWizard.config.maxSourceLength
					},
					author: {
						required: true,
						minlength: mw.UploadWizard.config.minAuthorLength,
						maxlength: mw.UploadWizard.config.maxAuthorLength
					}
				},
				messages: {
					source: {
						required: mw.message( 'mwe-upwiz-error-blank' ).escaped(),
						minlength: mw.message( 'mwe-upwiz-error-too-short', mw.UploadWizard.config.minSourceLength ).escaped(),
						maxlength: mw.message( 'mwe-upwiz-error-too-long', mw.UploadWizard.config.maxSourceLength ).escaped()
					},
					author: {
						required: mw.message( 'mwe-upwiz-error-blank' ).escaped(),
						minlength: mw.message( 'mwe-upwiz-error-too-short', mw.UploadWizard.config.minAuthorLength ).escaped(),
						maxlength: mw.message( 'mwe-upwiz-error-too-long', mw.UploadWizard.config.maxAuthorLength ).escaped()
					}
				}
			} );

			_this.$form.append( $formFields );

			$selector.append( _this.$form );

			if ( defaultType === 'thirdparty' ) {
				defaultLicense = mw.UploadWizard.config.licensing.thirdParty.defaults[0];

				defaultLicenseNum = findLicenseRecursively( defaultLicense );

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
	_this.$selector = $( selector );
	_this.uploads = uploads === undefined ? [] : uploads;


	_this.$errorEl = $( '<div class="mwe-error"></div>' );
	_this.$selector.append( _this.$errorEl );

	// name for radio button set
	mw.UploadWizardDeedChooser.prototype.widgetCount++;
	_this.name = 'deedChooser' + mw.UploadWizardDeedChooser.prototype.widgetCount.toString();

	_this.onLayoutReady = function() {};

	$.each( deeds, function ( i, deed ) {
		var id = _this.name + '-' + deed.name;
		var $deedInterface = $(
			'<div class="mwe-upwiz-deed mwe-upwiz-deed-' + deed.name + '">' +
				'<div class="mwe-upwiz-deed-option-title">' +
					'<span class="mwe-upwiz-deed-header">' +
						'<input id="' + id +'" name="' + _this.name + '" type="radio" value="' + deed.name + ' /">' +
						'<label for="' + id + '" class="mwe-upwiz-deed-name">' +
							mw.message( 'mwe-upwiz-source-' + deed.name, _this.uploads.length ).escaped() +
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
				if ( $( this ).is( ':checked' )  ) {
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
		$.each( $deedSelector.find( '.mwe-upwiz-deed-form' ), function( i, form ) {
			var $form = $( form );
			$.each( $form.find(".mwe-upwiz-hint"), function( i, hint ) {
				$( hint ).tipsy("hide");
			} );
			// Remove errors
			var originalResetForm = $.fn.resetForm;
			if ( originalResetForm ) {
				// Make sure that $validator.resetForm() resets only the errors, not the form fields!
				$.fn.resetForm = function() { };
			}
			$.each( $form.find( 'form' ), function( i, form ) {
				var $validator = $( form ).data( 'validator' );
				if ( $validator ) {
					$validator.resetForm(); // Clear out all errors in the form
				}
			} );
			$.fn.resetForm = originalResetForm;
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
		$.each( $deedSelector.find( '.mwe-upwiz-deed-form' ), function( i, form ) {
			var $form = $( form );
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

} )( mediaWiki, jQuery );
