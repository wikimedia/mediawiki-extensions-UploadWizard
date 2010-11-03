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
		var _this = this;
		var wikiText = ''; 
		$j.each ( _this.licenseInput.getTemplates(), function( i, template ) {
			wikiText += "{{" + template + "}}\n";
		} );
	
		return wikiText;
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

	_this.authorInput = $j( '<input />')
		.attr( { name: "author", type: "text" } )
		.addClass( 'mwe-upwiz-sign' );

	var licenseInputDiv = $j( '<div class="mwe-upwiz-deed-license"></div>' );
	_this.licenseInput = new mw.UploadWizardLicenseInput( licenseInputDiv );
	_this.licenseInput.setDefaultValues();

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
			var licenseInputValid = _this.licenseInput.valid();
			return formValid && licenseInputValid; 
		},

		getSourceWikiText: function() {
			return '{{own}}';
		},

		// XXX do we need to escape authorInput, or is wikitext a feature here?
		// what about scripts?
		getAuthorWikiText: function() {
			return "[[User:" + mw.UploadWizard.config[ 'userName' ] + '|' + $j( _this.authorInput ).val() + ']]';
		},


		getLicenseWikiText: function() {
			var wikiText = '{{self';
			$j.each( _this.licenseInput.getTemplates(), function( i, template ) {
				wikiText += '|' + template;
			} );
			wikiText += '}}';
			return wikiText;
		},

		setFormFields: function( $selector ) {
			_this.$selector = $selector;

			_this.$form = $j( '<form/>' );

			var $standardDiv = $j( '<div />' ).append(
				$j( '<label for="author2" generated="true" class="mwe-validator-error" style="display:block;"/>' ),
				$j( '<p>' )
					.html( gM( 'mwe-upwiz-source-ownwork-assert',
						   uploadCount,
						   '<span class="mwe-standard-author-input"></span>' )
					),
				$j( '<p class="mwe-small-print" />' ).append( gM( 'mwe-upwiz-source-ownwork-assert-note' ) )
			); 
			$standardDiv.find( '.mwe-standard-author-input' ).append( $j( '<input name="author2" type="text" class="mwe-upwiz-sign" />' ) );
			
			var $customDiv = $j('<div/>').append( 
				$j( '<label for="author" generated="true" class="mwe-validator-error" style="display:block;"/>' ),
				$j( '<p>' )
					.html( gM( 'mwe-upwiz-source-ownwork-assert-custom', 
						uploadCount,
						'<span class="mwe-custom-author-input"></span>' ) ),
				licenseInputDiv
			);
			// have to add the author input this way -- gM() will flatten it to a string and we'll lose it as a dom object
			$customDiv.find( '.mwe-custom-author-input' ).append( _this.authorInput );


			var $crossfader = $j( '<div>' ).append( $standardDiv, $customDiv );
			var $toggler = $j( '<p class="mwe-more-options" style="text-align: right" />' )
				.append( $j( '<a />' )
					.append( gM( 'mwe-upwiz-license-show-all' ) )
					.click( function() {
						_this.formValidator.resetForm();
						if ( $crossfader.data( 'crossfadeDisplay' ) === $customDiv ) {
							_this.licenseInput.setDefaultValues();
							$crossfader.morphCrossfade( $standardDiv );
							$j( this ).html( gM( 'mwe-upwiz-license-show-all' ) );
						} else {
							$crossfader.morphCrossfade( $customDiv );
							$j( this ).html( gM( 'mwe-upwiz-license-show-recommended' ) );
						}
					} ) );

			var $formFields = $j( '<div class="mwe-upwiz-deed-form-internal" />' )
				.append( $crossfader, $toggler );
			

			// synchronize both username signatures
			// set initial value to configured username
			// if one changes all the others change (keyup event)
			//
			// also set tooltips ( the title, tipsy() )
			$formFields.find( '.mwe-upwiz-sign' )
				.attr( {
					title: gM( 'mwe-upwiz-tooltip-sign' ), 
					value: mw.UploadWizard.config[  'userName'  ] 
				} )
				.tipsyPlus()
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


			// and finally, make it validatable
			_this.formValidator = _this.$form.validate( {
				rules: {
					author2: {
						required: function( element ) {
							return $crossfader.data( 'crossfadeDisplay' ).get(0) === $standardDiv.get(0);
						},
						minlength: mw.UploadWizard.config[  'minAuthorLength'  ],
						maxlength: mw.UploadWizard.config[  'maxAuthorLength'  ]
					},
					author: {
						required: function( element ) {
							return $crossfader.data( 'crossfadeDisplay' ).get(0) === $customDiv.get(0);
						},
						minlength: mw.UploadWizard.config[  'minAuthorLength'  ],
						maxlength: mw.UploadWizard.config[  'maxAuthorLength'  ]
					}
				},
				messages: {
					author2: {
						required: gM( 'mwe-upwiz-error-signature-blank' ),
						minlength: gM( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config[  'minAuthorLength'  ] ),
						maxlength: gM( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config[  'maxAuthorLength'  ] )
					},
					author: {
						required: gM( 'mwe-upwiz-error-signature-blank' ),
						minlength: gM( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config[  'minAuthorLength'  ] ),
						maxlength: gM( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config[  'maxAuthorLength'  ] )
					}
				}
			} );
		}


	} );

};

// XXX these deeds are starting to turn into jquery fns
mw.UploadWizardDeedThirdParty = function( uploadCount ) {
	var _this = new mw.UploadWizardDeed();

	_this.uploadCount = uploadCount ? uploadCount : 1;
	_this.sourceInput = $j('<textarea class="mwe-source mwe-long-textarea" name="source" rows="1" cols="40"></textarea>' )
				.growTextArea()
				.attr( 'title', gM( 'mwe-upwiz-tooltip-source' ) )
				.tipsyPlus();
	_this.authorInput = $j('<textarea class="mwe-author mwe-long-textarea" name="author" rows="1" cols="40"></textarea>' )
				.growTextArea()
				.attr( 'title', gM( 'mwe-upwiz-tooltip-author' ) )
				.tipsyPlus();
	licenseInputDiv = $j( '<div class="mwe-upwiz-deed-license"></div>' );
	_this.licenseInput = new mw.UploadWizardLicenseInput( licenseInputDiv );


	return $j.extend( _this, mw.UploadWizardDeed.prototype, {
		name: 'thirdparty',

		setFormFields: function( $selector ) {
			var _this = this;
			_this.$form = $j( '<form/>' );

			var $formFields = $j( '<div class="mwe-upwiz-deed-form-internal"/>' );

			if ( uploadCount > 1 ) { 
				$formFields.append( $j( '<div />' ).append( gM( 'mwe-upwiz-source-thirdparty-custom-multiple-intro' ) ) );
			}

			$formFields.append (
				$j( '<div class="mwe-upwiz-source-thirdparty-custom-multiple-intro" />' ),
				$j( '<label for="source" generated="true" class="mwe-validator-error" style="display:block;"/>' ),
				$j( '<div class="mwe-upwiz-thirdparty-fields" />' )
					.append( $j( '<label for="source"/>' ).text( gM( 'mwe-upwiz-source' ) ), 
						 _this.sourceInput ),
				$j( '<label for="author" generated="true" class="mwe-validator-error" style="display:block;"/>' ),
				$j( '<div class="mwe-upwiz-thirdparty-fields" />' )
					.append( $j( '<label for="author"/>' ).text( gM( 'mwe-upwiz-author' ) ),
						 _this.authorInput ),
				$j( '<div class="mwe-upwiz-thirdparty-license" />' )
					.append( gM( 'mwe-upwiz-source-thirdparty-license', uploadCount ) ),
				licenseInputDiv
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
 * @param selector where to put this deed chooser
 * @param isPlural whether this chooser applies to multiple files (changes messaging mostly)
 */ 
mw.UploadWizardDeedChooser = function( selector, deeds, uploadCount ) {
	var _this = this;
	_this.$selector = $j( selector );
	_this.uploadCount = uploadCount ? uploadCount : 1;
	

	_this.$errorEl = $j( '<div class="mwe-error"></div>' );
	_this.$selector.append( _this.$errorEl );

	// name for radio button set
	mw.UploadWizardDeedChooser.prototype.widgetCount++;
	_this.name = 'deedChooser' + mw.UploadWizardDeedChooser.prototype.widgetCount.toString();

	$j.each( deeds, function (i, deed) {
		var id = _this.name + '-' + deed.name;
 
		var $deedInterface = $j( 
			'<div class="mwe-upwiz-deed mwe-upwiz-deed-' + deed.name + '">'
		       +   '<div class="mwe-upwiz-deed-option-title">'
		       +     '<span class="mwe-upwiz-deed-header">'
		       +        '<input id="' + id +'" name="' + _this.name + '" type="radio" value="' + deed.name + '">'
		       +	  '<label for="' + id + '" class="mwe-upwiz-deed-name">'
		       +            gM( 'mwe-upwiz-source-' + deed.name, _this.uploadCount )
		       +          '</label>'
		       +        '</input>'
		       +     '</span>'
		       +   '</div>'
		       +   '<div class="mwe-upwiz-deed-form">'
		       + '</div>'
		);

		var $deedSelector = _this.$selector.append( $deedInterface );

		deed.setFormFields( $deedInterface.find( '.mwe-upwiz-deed-form' ) );

		$deedInterface.find( 'span.mwe-upwiz-deed-header input' ).click( function() {
			if ( $j( this ).is(':checked' )  ) {
				_this.choose( deed );
				_this.showDeed( $deedInterface );
			}
		} );

	} );

	_this.choose( mw.UploadWizardNullDeed );
	_this.showDeedChoice();		
	

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
				_this.showError( gM( 'mwe-upwiz-deeds-need-deed', _this.uploadCount ) );
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
 	 * How many uploads this deed controls
	 */
	uploadCount: 0,

	
	// XXX it's impossible to choose the null deed if we stick with radio buttons, so that may be useless later
	choose: function( deed ) {
		var _this = this;
		_this.deed = deed;
		if ( deed === mw.UploadWizardNullDeed ) {
			$j( _this ).trigger( 'chooseNullDeed' );
			//_this.trigger( 'isNotReady' );
			_this.$selector
				.find( 'input.mwe-accept-deed' )
				.attr( 'checked', false );
		} else {
			$j( _this ).trigger( 'chooseDeed' );
		}
	},

	/**
	 * Go back to original source choice. 
	 */
	showDeedChoice: function() {
		var $allDeeds = this.$selector.find( '.mwe-upwiz-deed' );
		this.deselectDeed( $allDeeds );
		// $allDeeds.fadeTo( 'fast', 1.0 );   //maskSafeShow();
	},

	/** 
	 * From the deed choices, make a choice fade to the background a bit, hide the extended form
	 */
	deselectDeed: function( $deedSelector ) {
		$deedSelector.removeClass( 'selected' );
		// $deedSelector.find( 'a.mwe-upwiz-macro-deeds-return' ).hide();
		$deedSelector.find( '.mwe-upwiz-deed-form' ).slideUp( 500 );   //.maskSafeHide();
	},

	/**
	 * From the deed choice page, show a particular deed
	 */
	showDeed: function( $deedSelector ) {
		var $otherDeeds = $deedSelector.siblings().filter( '.mwe-upwiz-deed' );
		this.deselectDeed( $otherDeeds );
		// $siblings.fadeTo( 'fast', 0.5 ) // maskSafeHide();

		$deedSelector
			.addClass('selected')
			.fadeTo( 'fast', 1.0 )
			.find( '.mwe-upwiz-deed-form' ).slideDown( 500 ); // maskSafeShow(); 
		// $deedSelector.find( 'a.mwe-upwiz-macro-deeds-return' ).show();
	}

};

} )( jQuery );
