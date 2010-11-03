/**
 * Create a group of checkboxes for licenses. N.b. the licenses are named after the templates they invoke.
 * @param div 
 * @param values  (optional) array of license key names to activate by default
 */

( function( $j ) {
mw.UploadWizardLicenseInput = function( selector, values ) {
	var _this = this;

	var widgetCount = mw.UploadWizardLicenseInput.prototype.count++;
	
	_this.inputs = [];

	// TODO incompatibility check of this license versus others

	_this.$selector = $j( selector );
	_this.$selector.append( $j( '<div class="mwe-error"></div>' ) );

	$j.each( mw.UploadWizard.config[  'licenses'  ], function( i, licenseConfig ) {
		var template = licenseConfig.template;
		var messageKey = licenseConfig.messageKey;
		
		var name = 'license_' + template;
		var id = 'licenseInput' + widgetCount + '_' + name;
		var $input = $j( '<input />' ) 
			.attr( { id: id, name: name, type: 'checkbox', value: template  } )
			// we use the selector because events can't be unbound unless they're in the DOM.
			.click( function() { _this.$selector.trigger( 'changeLicenses' ); } );
		_this.inputs.push( $input );
		_this.$selector.append( 
			$input,
			$j( '<label />' ).attr( { 'for': id } ).html( gM( messageKey ) ),
			$j( '<br/>' )
		);
	} );

	if ( values ) {
		_this.setValues( values );
	}

	return _this;
};

mw.UploadWizardLicenseInput.prototype = {
	count: 0,

	/**
	 * Sets the value(s) of a license input.
	 * @param object of license-key to boolean values, e.g. { cc_by_sa_30: true, gfdl: true }
	 */
	setValues: function( licenseValues ) {
		var _this = this;
		$j.each( _this.inputs, function( i, $input ) {
			var template = $input.val();
			$input.attr( 'checked', ~~!!licenseValues[template] );
		} );
		// we use the selector because events can't be unbound unless they're in the DOM.
		_this.$selector.trigger( 'changeLicenses' );
	},

	/**
	 * Set the default configured licenses
	 */
	setDefaultValues: function() {
		var _this = this;
		var values = {};
		$j.each( mw.UploadWizard.config[  'licenses'  ], function( i, licenseConfig ) {
			values[ licenseConfig.template ] = licenseConfig['default'];
		} );
		_this.setValues( values );
	},

	/**
	 * Gets the templates associated with checked inputs 
	 * @return array of template names
  	 */
	getTemplates: function() {
		return $j( this.inputs )
			.filter( function() { return this.is( ':checked' ); } )
			.map( function() { return this.val(); } );
	},

	/**
	 * Check if a valid value is set, also look for incompatible choices. 
	 * Side effect: if no valid value, add notes to the interface. Add listeners to interface, to revalidate and remove notes.
	 * @return boolean; true if a value set, false otherwise
	 */
	valid: function() {
		var _this = this;
		var isValid = true;

		if ( ! _this.isSet() ) {
			isValid = false;
			errorHtml = gM( 'mwe-upwiz-deeds-need-license' );
		}

		// XXX something goes here for licenses incompatible with each other

		var $errorEl = this.$selector.find( '.mwe-error' );
		if (isValid) {
			$errorEl.fadeOut();
		} else {
			// we bind to $selector because unbind() doesn't work on non-DOM objects
			_this.$selector.bind( 'changeLicenses.valid', function() {
				_this.$selector.unbind( 'changeLicenses.valid' );
				_this.valid();
			} );	
			$errorEl.html( errorHtml ).show();
		}

		return isValid;
	},


	/**
  	 * Returns true if any license is set
	 * @return boolean
	 */
	isSet: function() {
		return this.getTemplates().length > 0;
	}

};

} )( jQuery );
