/**
 * Sort of an abstract class for deeds
 */
( function( $j ) {
	
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


mw.UploadWizardNullDeed = $j.extend( new mw.UploadWizardDeed(), {
	valid: function() {
		return false;
	} 
} );

	
/**
 * Set up the form and deed object for the deed option that says these uploads are all the user's own work.
 * XXX these deeds are starting to turn into jquery fns
 */
mw.UploadWizardDeedOwnWork = function( uploadCount ) {
	uploadCount = uploadCount ? uploadCount : 1;

	var _this = new mw.UploadWizardDeed();

	_this.authorInput = $j( '<input type="text" />' )
		.attr( { name: "author" } )
		.addClass( 'mwe-upwiz-sign' );

	var ownWork = mw.UploadWizard.config.licensesOwnWork;
	var licenseIsNotDefault = ( ownWork.licenses.length === 1 && ownWork.licenses[0] !== ownWork.defaults[0] );
	_this.showCustomDiv = ownWork.licenses.length > 1 || licenseIsNotDefault;

	if ( _this.showCustomDiv ) {
		var licenseInputDiv = $j( '<div class="mwe-upwiz-deed-license"></div>' );
		
		_this.licenseInput = new mw.UploadWizardLicenseInput(
			licenseInputDiv, 
			undefined, 
			mw.UploadWizard.config.licensesOwnWork,
			_this.uploadCount
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
			if ( _this.showCustomDiv && this.licenseInput.getWikiText() != '' ) {
				return this.licenseInput.getWikiText();
			}
			else {
				return '{{' + mw.UploadWizard.config.licensesOwnWork.filterTemplate
					+ '|' + mw.UploadWizard.config.licensesOwnWork.defaults[0] + '}}';
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
			
			return "[[User:" + mw.config.get( 'wgUserName' ) + '|' + author + ']]';
		},


		setFormFields: function( $selector ) {
			_this.$selector = $selector;

			_this.$form = $j( '<form />' );

			_this.$authorInput2 = $j( '<input type="text" />' ).attr( { name: "author2" } ).addClass( 'mwe-upwiz-sign' );
			var $standardDiv = $j( '<div />' ).append(
				$j( '<label for="author2" generated="true" class="mwe-validator-error" style="display:block;" />' ),
				$j( '<p></p>' ).msg( 'mwe-upwiz-source-ownwork-assert',
						 uploadCount,
						 _this.$authorInput2 ),
				$j( '<p class="mwe-small-print"></p>' ).msg(
					'mwe-upwiz-source-ownwork-assert-note',
					gM( 'mwe-upwiz-license-' + mw.UploadWizard.config.licensesOwnWork.defaults[0] )
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
					title: gM( 'mwe-upwiz-tooltip-sign' ), 
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
					minlength: mw.UploadWizard.config[  'minAuthorLength'  ],
					maxlength: mw.UploadWizard.config[  'maxAuthorLength'  ]
				}
			};
			
			var messages = {
				author2: {
					required: gM( 'mwe-upwiz-error-signature-blank' ),
					minlength: gM( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config[  'minAuthorLength'  ] ),
					maxlength: gM( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config[  'maxAuthorLength'  ] )
				}
			};
			
			if ( _this.showCustomDiv ) {
				// choose default licenses
				_this.licenseInput.setDefaultValues();			
				
				rules.author = {
					required: function( element ) {
						return $crossfader.data( 'crossfadeDisplay' ).get(0) === $customDiv.get(0);
					},
					minlength: mw.UploadWizard.config[  'minAuthorLength'  ],
					maxlength: mw.UploadWizard.config[  'maxAuthorLength'  ]
				};
				
				messages.author = {
					required: gM( 'mwe-upwiz-error-signature-blank' ),
					minlength: gM( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config[  'minAuthorLength'  ] ),
					maxlength: gM( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config[  'maxAuthorLength'  ] )
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

// XXX these deeds are starting to turn into jquery fns
mw.UploadWizardDeedThirdParty = function( uploadCount ) {
	var _this = new mw.UploadWizardDeed();

	_this.uploadCount = uploadCount ? uploadCount : 1;
	_this.sourceInput = $j('<textarea class="mwe-source mwe-long-textarea" name="source" rows="1" cols="40"></textarea>' )
				.growTextArea();
	_this.authorInput = $j('<textarea class="mwe-author mwe-long-textarea" name="author" rows="1" cols="40"></textarea>' )
				.growTextArea();
	licenseInputDiv = $j( '<div class="mwe-upwiz-deed-license-groups"></div>' );
	_this.licenseInput = new mw.UploadWizardLicenseInput( licenseInputDiv, 
							      undefined, 
							      mw.UploadWizard.config.licensesThirdParty,
							      _this.uploadCount );


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
					.append( $j( '<label for="source" />' ).text( gM( 'mwe-upwiz-source' ) ).addHint( 'source' ), 
						 _this.sourceInput ),
				$j( '<label for="author" generated="true" class="mwe-validator-error" style="display:block;" />' ),
				$j( '<div class="mwe-upwiz-thirdparty-fields" />' )
					.append( $j( '<label for="author" />' ).text( gM( 'mwe-upwiz-author' ) ).addHint( 'author' ),
						 _this.authorInput ),
				$j( '<div class="mwe-upwiz-thirdparty-license" />' )
					.append( $j( '<div></div>' ).msg( 'mwe-upwiz-source-thirdparty-cases', _this.uploadCount ) )
					.append( licenseInputDiv )
			);

			_this.$form.validate( {
				rules: {
					source: { required: true, 
						  minlength: mw.UploadWizard.config[  'minSourceLength'  ],
						  maxlength: mw.UploadWizard.config[  'maxSourceLength'  ] },
					author: { required: true,
						  minlength: mw.UploadWizard.config[  'minAuthorLength'  ],
						  maxlength: mw.UploadWizard.config[  'maxAuthorLength'  ] }
				},
				messages: {
					source: {
						required: gM( 'mwe-upwiz-error-blank' ),
						minlength: gM( 'mwe-upwiz-error-too-short', mw.UploadWizard.config[  'minSourceLength'  ] ),
						maxlength: gM( 'mwe-upwiz-error-too-long', mw.UploadWizard.config[  'maxSourceLength'  ] )
					},
					author: {
						required: gM( 'mwe-upwiz-error-blank' ),
						minlength: gM( 'mwe-upwiz-error-too-short', mw.UploadWizard.config[  'minAuthorLength'  ] ),
						maxlength: gM( 'mwe-upwiz-error-too-long', mw.UploadWizard.config[  'maxAuthorLength'  ] )
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
mw.UploadWizardDeedChooser = function( selector, deeds, uploads ) {
	var _this = this;
	_this.$selector = $j( selector );
	_this.uploads = mw.isDefined( uploads ) ? uploads : [];
	

	_this.$errorEl = $j( '<div class="mwe-error"></div>' );
	_this.$selector.append( _this.$errorEl );

	// name for radio button set
	mw.UploadWizardDeedChooser.prototype.widgetCount++;
	_this.name = 'deedChooser' + mw.UploadWizardDeedChooser.prototype.widgetCount.toString();

	_this.onLayoutReady = function(){};
	
	$j.each( deeds, function (i, deed) {
		var id = _this.name + '-' + deed.name;
		var $deedInterface = $j( 
			'<div class="mwe-upwiz-deed mwe-upwiz-deed-' + deed.name + '">'
		   +  '<div class="mwe-upwiz-deed-option-title">'
		   +    '<span class="mwe-upwiz-deed-header">'
		   +      '<input id="' + id +'" name="' + _this.name + '" type="radio" value="' + deed.name + ' /">'
		   +      '<label for="' + id + '" class="mwe-upwiz-deed-name">'
		   +        gM( 'mwe-upwiz-source-' + deed.name, _this.uploads.length )
		   +      '</label>'
		   +    '</span>'
		   +  '</div>'
		   +  '<div class="mwe-upwiz-deed-form"></div>'
		   +'</div>'
		);

		var $deedSelector = _this.$selector.append( $deedInterface );

		deed.setFormFields( $deedInterface.find( '.mwe-upwiz-deed-form' ) );

		if ( deeds.length == 1 ) {
			_this.onLayoutReady = function() {
				_this.choose( deed );
				_this.selectDeedInterface( $deedInterface );
				$deedInterface.find( 'span.mwe-upwiz-deed-header input' ).attr( 'checked', true );
			}
		}
		else {
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

	// set the "value" to be the null deed; which will cause an error if the data is submitted.
	_this.choose( mw.UploadWizardNullDeed );

	// set the "delete associated upload" option, if available
	// this has a somewhat nasty & twisted dependency on the licenses config, since if you enable the 'special delete'
	// option there, you have to remember to pass a deleter here
	_this.bindDeleter();
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
		} else {
			if ( _this.deed === mw.UploadWizardNullDeed ) {			
				_this.showError( gM( 'mwe-upwiz-deeds-need-deed', _this.uploads.length ) );
				$j( _this ).bind( 'chooseDeed', function() {
					_this.hideError();
				} );
			}
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

	
	// XXX it's impossible to choose the null deed if we stick with radio buttons, so that may be useless later
	choose: function( deed ) {
		var _this = this;
		_this.deed = deed;
		if ( deed === mw.UploadWizardNullDeed ) {
			$j( _this ).trigger( 'chooseNullDeed' );
			_this.$selector
				.find( 'input.mwe-accept-deed' )
				.attr( 'checked', false );
		} else {
			$j( _this ).trigger( 'chooseDeed' );
		}
	},

	/** 
	 * From the deed choices, make a choice fade to the background a bit, hide the extended form
	 */
	deselectDeedInterface: function( $deedSelector ) {
		$deedSelector.removeClass( 'selected' );
		$j.each( $deedSelector.find( '.mwe-upwiz-deed-form' ), function( i, form ) {
			var $form = $j( form );
			if ( $form.parents().is( ':hidden' ) ) {
				$form.hide();
			} else {
				$form.slideUp( 500 );
			}
		} );
		// Hide tipsy balloons
		$("#mwe-upwiz-source-hint").tipsy("hide");
		$("#mwe-upwiz-author-hint").tipsy("hide");
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
			if ( $form.is( ':hidden' ) ) {
				// if the form was hidden, set things up so a slide-down works
				$form.show().slideUp( 0 );
			}
			$form.slideDown( 500 );
		} );
	},

	remove: function() {
		this.$selector.html('');
	},

	/**
	 * This is a bit of a hack -- originally deeds were not supposed to know what uploads they applied to,
	 * the associated upload would just read that data when it needed to, or rebind itself on the fly. 
	 * Unfortunately it's starting to become a bit messed up; to make deleting work, now the deeds know about the uploads,
	 * and the uploads know about the deeds. Really ought to be that there is some channel of communication that the uploads
	 * listen to, which could include a 'delete yourself' event.
	 * So, what this does:
	 * In the event that our license config includes the "special" item for i-don't-know-what-the-license-is, 
	 * this will create a button there that deletes all the associated uploads.
	 */
	bindDeleter: function() {
		var deedChooser = this;

		if ( !mw.isDefined( deedChooser.deleteDialog ) ) {
			deedChooser.deleteDialog = mw.UploadWizardDeleteDialog( 
				deedChooser.uploads, 
				gM( 'mwe-upwiz-license-confirm-remove-title' ),
				gM( 'mwe-upwiz-license-confirm-remove', deedChooser.uploads.length )
			);
		}
		
		$j( deedChooser.$selector.find( '.mwe-upwiz-license-special-delete' ) ).each( function() {
			$j( this ).append( 
							   $j( '<button type="button" name="abandon"></button>' )
									   .msg( 'mwe-upwiz-license-none-applicable', deedChooser.uploads.length )
									   .button()
									   .addClass( 'ui-button-text ui-button-textonly' )
									   .click( function() { 
											   deedChooser.deleteDialog.dialog( 'open' );
									   } )
			);
		} );
	}

}; // end UploadWizardDeed.prototype

} )( jQuery );
