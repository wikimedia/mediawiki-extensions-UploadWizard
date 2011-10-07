/**
 * Create a group of radio buttons for licenses. N.b. the licenses are named after the templates they invoke.
 * @param {String|jQuery} selector to place license input 
 * @param {Array} 	  license key name(s) to activate by default
 * @param {Array}	  configuration of licenseInput. Must have following properties
 *				'type' = ("and"|"or") -- whether inclusive or exclusive license allowed
 *				'defaults' => array of template string names (can be empty array), 
 *				'licenses' => array of template string names (matching keys in mw.UploadWizard.config.licenses)
 *				optional: 'licenseGroups' => groups of licenses, with more explanation
 *				optional: 'special' => String -- indicates, don't put licenses here, instead leave a placeholder div, with class based on this string.
 * @param {Numbe}	  count of the things we are licensing (it matters to some texts)
 */

( function( $j ) {
mw.UploadWizardLicenseInput = function( selector, values, config, count ) {
	var _this = this;
	_this.count = count;

	if ( ! ( mw.isDefined(config.type) 
		 && mw.isDefined( config.defaults ) 
		 && ( mw.isDefined( config.licenses ) || mw.isDefined( config.licenseGroups ) ) ) ) {
		throw new Error( 'improper initialization' );
	}

	_this.$selector = $j( selector );
	_this.$selector.append( $j( '<div class="mwe-error"></div>' ) );

	_this.type = config.type === 'or' ? 'radio' : 'checkbox';

	_this.defaults = config.defaults;

	mw.UploadWizardLicenseInput.prototype.count++;
	_this.name = 'license' + mw.UploadWizardLicenseInput.prototype.count;

	
	/**
	 * Define the licenses this input will show:
	 */
	_this.licenses = [];
	_this.inputs = [];
	/**
	 * append defined license inputs to element; also records licenses and inputs in _this
	 * Abstracts out simple lists of licenses, more complex groups with layout
	 * @param {jQuery} selector to add inputs to
	 * @param {Array} license configuration, which must have a 'licenses' property, which is an array of license names
	 * 			it may also have: 'prependTemplates' or 'filterTemplate', which alter the final wikitext value 
	 *			'prependTemplates' will prepend Templates. If prependTemplates were [ 'pre', 'pended' ], then...
	 *				[ 'fooLicense' ] -> "{{pre}}{{pended}}{{fooLicense}}"
	 *			'filterTemplates' will filter Templates, as in "own work". If 'filterTemplate' was 'filter', then...
	 *				[ 'fooLicense', 'barLicense' ] -> {{filter|fooLicense|barLicense}}
	 *
	 */
	function appendLicenses( $el, config ) {
		if ( !mw.isDefined( config['licenses'] && typeof config['licenses'] === 'object' ) ) {
			throw new Error( "improper license config" );
		}
		$j.each( config['licenses'], function( i, name ) {
			if ( mw.isDefined( mw.UploadWizard.config.licenses[name] ) ) {
				var license = { name: name, props: mw.UploadWizard.config.licenses[name] };
				_this.licenses.push( license );
				var templates = mw.isDefined( license.props['templates'] ) ? license.props.templates.slice(0) : [ license.name ];
				var origTemplateString = templates.join( '|' );
				if ( mw.isDefined( config['prependTemplates'] ) ) {
					$j.each( config['prependTemplates'], function( i, template ) {
						templates.unshift( template );
					} );
				}
				if ( mw.isDefined( config['filterTemplate'] ) ) {
					templates.unshift( config['filterTemplate'] );
					templates = [ templates.join( '|' ) ];
				}
				// using inputs length to ensure that you can have two options which deliver same result,
				// but the label association still works
				var id = _this.name + '_' + templates.join('_') + '_' + _this.inputs.length;

				// the value is literal wikitext; turn template names (or template names + args) into wikitext templates
				var value = ( $j.map( templates, function( t ) { return '{{' + t + '}}'; } ) ).join( '' );
				// IE6 is idiotic about radio buttons; you have to create them as HTML or clicks aren't recorded	
				var $input = $j( '<input id="' + id + '" name="' + _this.name + '" type="' + _this.type + '" value="' + value + '" />' );
				$input.click( function() { _this.$selector.trigger( 'changeLicenses' ); } );
				// this is added so that setValues() can find one (or more) checkboxes to check - represent values without wikitext
				$input.data( 'templateString', origTemplateString );
				$input.data( 'licenseName', name );
				_this.inputs.push( $input );
				
				var messageKey = mw.isDefined( license.props['msg'] ) ? license.props.msg : '[missing msg for ' + license.name + ']';
				var $icons = $j( '<span></span>' );
				if ( mw.isDefined( license.props['icons'] ) ) {
					$j.each( license.props.icons, function( i, icon ) { 
						$icons.append( $j( '<span></span>' ).addClass( 'mwe-upwiz-license-icon mwe-upwiz-' + icon + '-icon' ) );		
					} );
				}
				$el.append( 
					$input,
					$j( '<label />' ).attr( { 'for': id } ).msg( messageKey, _this.count ).append( $icons ),
					$j( '<br/>' )
					// XXX help?
				);
			}
		} );
	}
	

	if ( mw.isDefined( config['licenseGroups'] ) ) {
		$j.each( config['licenseGroups'], function( i, group ) { 
			var $group = $j( '<div></div>' ).addClass( 'mwe-upwiz-deed-license-group' );
			// if there is no header, just append licenses to the group div.
			var $body = $group;
			// if there is a header, make a toggle-to-expand div and append to that instead.
			if ( mw.isDefined( group['head'] ) ) {
				var $head = $j( '<div></div>' ).append( 
					$j( '<a>' )
						.addClass( 'mwe-upwiz-deed-license-group-head mwe-upwiz-toggler' )
						.msg( group.head, _this.count )
				);
				$body = $j( '<div></div>' ).addClass( 'mwe-upwiz-toggler-content' ).css( { 'marginBottom': '1em' } );
				$group.append( $head, $body ).collapseToggle();
			}
			if ( mw.isDefined( group['subhead'] ) ) {
				$body.append( $j( '<div></div>' ).addClass( 'mwe-upwiz-deed-license-group-subhead' ).msg( group.subhead, _this.count ) );
			}
			var $licensesDiv = $j( '<div></div>' ).addClass( 'mwe-upwiz-deed-license' );
			if ( mw.isDefined( group['special'] ) ) {
				// put a placeholder in our interface for our caller to place some special interface in
				$licensesDiv.append( $j( '<div></div>' ).addClass( 'mwe-upwiz-license-special-' + group.special ) );
			} else {
				appendLicenses( $licensesDiv, group );
			}
			$body.append( $licensesDiv );
			_this.$selector.append( $group );
		} );


	} else {
		appendLicenses( _this.$selector, config );
	}

	if ( values ) {
		_this.setValues( values );
	}

	return _this;
};

mw.UploadWizardLicenseInput.prototype = {
	count: 0,

	/**
	 * Sets the value(s) of a license input. This is a little bit klugey because it relies on an inverted dict, and in some
	 * cases we are now letting license inputs create multiple templates.
	 * @param object of license-key to boolean values, e.g. { 'cc_by_sa_30': true, 'gfdl': true, 'flickrreview|cc_by_sa_30': false }
	 */
	setValues: function( values ) {
		var _this = this;
		// ugly division between radio and checkbox, because in jquery 1.6.4 if you set any element of a radio input to false, every element
		// is set to false! Unfortunately the incoming data structure is a key-val object so we have to make extra sure it makes sense for 
		// a radio button input.

		// this works fine for blanking all of a radio input, or for checking/unchecking individual checkboxes
		function setInputsIndividually() { 
			$j.each( _this.inputs, function( i, $input ) {
				var licenseName = $input.data( 'licenseName' );
				// !! to ensure boolean.
				$input.attr( 'checked', !!values[licenseName] );
			} );
		}

		if ( _this.type === 'radio' ) {

			// check if how many license names are set to true in the values requested. Should be 0 or 1
			var trueCount = 0;
			var trueLicenseName = undefined;
			$j.each( values, function( licenseName, val ) { 
				if ( val === true ) { 
					trueCount++;
					trueLicenseName = licenseName;
				}
			} );

			if ( trueCount === 0 ) {
				setInputsIndividually();
			} else if ( trueCount === 1 ) {
				// set just one of the radio inputs and don't touch anything else
				$j.each( _this.inputs, function( i, $input ) { 
					var licenseName = $input.data( 'licenseName' );
					// !! to ensure boolean.
					if ( licenseName === trueLicenseName ) {
						$input.attr( 'checked', true );
					}
				} );
			} else {
				mw.log( "too many true values for a radio button!");
			}
							
		} else if ( _this.type === 'checkbox' ) {
			setInputsIndividually();
		} else {
			mw.log( "impossible? UploadWizardLicenseInput type neither radio nor checkbox" );
		}
		// we use the selector because events can't be unbound unless they're in the DOM.
		_this.$selector.trigger( 'changeLicenses' );
	},

	/**
	 * Set the default configured licenses
	 */
	setDefaultValues: function() {
		var _this = this;
		var values = {};
		$j.each( _this.defaults, function( i, lic ) {
			values[lic] = true;
		} );
		_this.setValues( values );
	},

	/**
	 * Gets the wikitext associated with all checked inputs 
	 * @return string of wikitext (empty string if no inputs set)
  	 */
	getWikiText: function() {
		// need to use makeArray because a jQuery-returned set of things won't have .join
		return $j.makeArray( 
				this.getCheckedInputs().map( function() { return this.val(); } ) 
			).join( "" );
	},

	/**
	 * Gets which inputs are checked
	 * @return {jQuery Array} of inputs
	 */
	getCheckedInputs: function() {
		return $j( this.inputs ).filter( function() { return this.is( ':checked' ); } );
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
		return this.getCheckedInputs().length > 0;
	}

};

} )( jQuery );
