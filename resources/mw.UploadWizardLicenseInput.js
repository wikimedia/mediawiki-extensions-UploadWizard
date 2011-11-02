/**
 * Create a group of radio buttons for licenses. N.b. the licenses are named after the templates they invoke.
 * Note that this is very anti-MVC. The values are held only in the actual form elements themselves.
 *
 * @param {String|jQuery} selector to place license input 
 * @param {Array} 	  license key name(s) to activate by default
 * @param {Array}	  configuration of licenseInput. Must have following properties
 *				'type' = ("and"|"or") -- whether inclusive or exclusive license allowed
 *				'defaults' => array of template string names (can be empty array), 
 *				'licenses' => array of template string names (matching keys in mw.UploadWizard.config.licenses)
 *				optional: 'licenseGroups' => groups of licenses, with more explanation
 *				optional: 'special' => String -- indicates, don't put licenses here, instead use a special widget
 * @param {Number}	  count of the things we are licensing (it matters to some texts)
 * @param {mw.Api}	  api object; useful for previews
 */

( function( $j, undefined ) {

mw.UploadWizardLicenseInput = function( selector, values, config, count, api ) {
	var _this = this;
	_this.count = count;
	_this.api = api;

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
	 * @param {jQuery} optional - jquery-wrapped element created by $j.fn.collapseToggle(), which has 'close' and 'open' 
	 *			methods in its data.
	 *
	 */
	function appendLicenses( $el, config, groupToggler ) {

		if ( !mw.isDefined( config['licenses'] && typeof config['licenses'] === 'object' ) ) {
			throw new Error( "improper license config" );
		}
		$j.each( config['licenses'], function( i, licenseName ) {
			if ( mw.isDefined( mw.UploadWizard.config.licenses[licenseName] ) ) {
				var license = { name: licenseName, props: mw.UploadWizard.config.licenses[licenseName] };
				_this.licenses.push( license );
				
				var templates = _this.getTemplatesForLicense( license );

				var $input = _this.getInputElement( templates, config );
				_this.inputs.push( $input );

				var $label = _this.getInputElementLabel( license, $input );
				$el.append( $input, $label, $j( '<br/>' ) ); 
				// TODO add popup help?

				// this is so we can tell if a particular license ought to be set in setValues()
				$input.data( 'licenseName', licenseName );

				// this is so if a single input in a group changes, we open the entire "toggler" that was hiding them
				$input.data( 'groupToggler', groupToggler );

				if ( licenseName === 'custom' ) {
					$el.append( _this.getInputElementRelatedTextarea( $input ) );
				}
			}
		} );
	}
	

	if ( mw.isDefined( config['licenseGroups'] ) ) {
		$j.each( config['licenseGroups'], function( i, group ) { 
			var toggler;
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
				toggler = $group.append( $head, $body ).collapseToggle();
			}
			if ( mw.isDefined( group['subhead'] ) ) {
				$body.append( $j( '<div></div>' ).addClass( 'mwe-upwiz-deed-license-group-subhead' ).msg( group.subhead, _this.count ) );
			}
			var $licensesDiv = $j( '<div></div>' ).addClass( 'mwe-upwiz-deed-license' );
			appendLicenses( $licensesDiv, group, toggler );
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

	// Set the input value. If it is part of a group, and this is being turned on, pop open the group so we can see this input.
	setInput: function( $input, val ) {
		var _this = this;
		var oldVal = $input.attr( 'checked' );
		// !! to ensure boolean.
		var bool = !!val;
		$input.attr( 'checked', bool );
		if ( bool !== oldVal ) {
			_this.$selector.trigger( 'changeLicenses' );
		}
		// pop open the 'toggle' group if is now on. Do nothing if it is now off.
		if ( bool && $input.data( 'groupToggler' ) ) {
			$input.data( 'groupToggler' ).data( 'open' )();
		}
	},

	// this works fine for blanking all of a radio input, or for checking/unchecking individual checkboxes
	setInputsIndividually: function( values ) { 
		var _this = this;
		$j.each( _this.inputs, function( i, $input ) {
			var licenseName = $input.data( 'licenseName' );
			_this.setInput( $input, values[licenseName] );
		} );
	},

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
				_this.setInputsIndividually( values );
			} else if ( trueCount === 1 ) {
				// set just one of the radio inputs and don't touch anything else
				$j.each( _this.inputs, function( i, $input ) { 
					var licenseName = $input.data( 'licenseName' );
					// !! to ensure boolean.
					if ( licenseName === trueLicenseName ) {
						_this.setInput( $input, true );
					}
				} );
			} else {
				mw.log( "too many true values for a radio button!");
			}
							
		} else if ( _this.type === 'checkbox' ) {
			_this.setInputsIndividually( values );
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
	 * Gets the wikitext associated with all selected inputs.
	 * Anything from a text input is automatically suspect, because it might not be valid. So we append a template to double check.
	 * This is a bit of a hack, in the ideal case we'd make all the inputs into objects that returned their own wikitext, but 
	 * it is easier to extend the current interface (which assumes form input value is all we want).
	 * @return string of wikitext (empty string if no inputs set)
  	 */
	getWikiText: function() {
		var wikiTexts = this.getSelectedInputs().map( 
			function() { 
				return this.val() + "\n"; 
			}
		);
		// need to use makeArray because a jQuery-returned set of things won't have .join
		return $j.makeArray( wikiTexts ).join( '' );
	},

	/**
	 * Gets which inputs have user-entered values
	 * @return {jQuery Array} of inputs
	 */
	getSelectedInputs: function() {
		// not sure why filter(':checked') doesn't work
		return $j( this.inputs ).filter( function(i, $x) { return $x.is(':checked'); } );
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
		return this.getSelectedInputs().length > 0;
	},

	/**
	 * Given a license name, return template names
	 * Note we return copies, so as not to perturb the configuration itself
	 * @param {String} license name
	 * @return {Array} of strings of template names
	 */
	getTemplatesForLicense: function( license ) {
		return mw.isDefined( license.props['templates'] ) ? license.props.templates.slice(0) : [ license.name ];
	},

	/**
	 * License templates are these abstract ideas like cc-by-sa. In general they map directly to a license template.
	 * However, configuration for a particular option can add other templates or transform the templates, 
	 * such as wrapping templates in an outer "self" template for own-work
	 * @param {Array} of license template names
	 * @param {Object}, license input configuration
	 * @return {String} of wikitext
	 */
	getWikiTextForTemplates: function( templates, config ) {
		if ( mw.isDefined( config['prependTemplates'] ) ) {
			$j.each( config['prependTemplates'], function( i, template ) {
				templates.unshift( template );
			} );
		}
		if ( mw.isDefined( config['filterTemplate'] ) ) {
			templates.unshift( config['filterTemplate'] );
			templates = [ templates.join( '|' ) ];
		}
		return $j.map( templates, function(t) { return '{{' + t + '}}'; } ).join( '' );
	},

	/**
	 * Return a radio button or checkbox with appropriate values, depending on config
	 * @param {Array} of template strings
	 * @param {Object} config for this license input
	 * @return {jQuery} wrapped input
	 */
	getInputElement: function( templates, config ) {
		var _this = this;
					
		var attrs = {
			id:  _this.name + '_' + _this.inputs.length, // unique id
			name: _this.name, // name of input, shared among all checkboxes or radio buttons.
			type: _this.type, // kind of input
			value: _this.getWikiTextForTemplates( templates, config )
		};

		var inputHtml = '<input ' + 
			$j.map( attrs, function(val, key) { 
				return key + '="' + val.toString().replace( '"', '' ) + '"'; 
			} ).join( " " ) 
		+ ' />';

		// Note we aren't using $('<input>').attr( { ... } ) .  We construct a string of HTML.
		// IE6 is idiotic about radio buttons; you have to create them as HTML or clicks aren't recorded	
		return $j( inputHtml ).click( function() { 
			_this.$selector.trigger( 'changeLicenses' ); 
		} );
	},

	/**
	 * Get a label for the form element
	 * @param {Object} license definition from global config. Will tell us the messages, and maybe icons.
	 * @param {jQuery} wrapped input
	 * @return {jQuery} wrapped label referring to that input, with appropriate HTML, decorations, etc.
	 */
	getInputElementLabel: function( license, $input ) {	
		var messageKey = mw.isDefined( license.props['msg'] ) ? license.props.msg : '[missing msg for ' + license.name + ']';
		var $icons = $j( '<span></span>' );
		if ( mw.isDefined( license.props['icons'] ) ) {
			$j.each( license.props.icons, function( i, icon ) { 
				$icons.append( $j( '<span></span>' ).addClass( 'mwe-upwiz-license-icon mwe-upwiz-' + icon + '-icon' ) );		
			} );
		}
		return $j( '<label />' )
			.attr( { 'for': $input.attr('id') } )
			.msg( messageKey, this.count )
			.append( $icons );
	},

	/**
	 * Given an input, return another textarea to be appended below.
	 * When text entered here, auto-selects the input.
	 * @param {jQuery} wrapped input
	 * @return {jQuery} wrapped textarea
	 */
	getInputElementRelatedTextarea: function( $input ) {
		var _this = this;

		var $textarea = $j( '<textarea></textarea>' )
				.attr( { id: $input.attr( 'id' ) + '_custom' } )
				.growTextArea()
				.focus( function() { _this.setInput( $input, true ); } )
				.css( { 
					'width': '100%', 
					'font-family': 'monospace' 
				} );

		var $button = $j( '<span></span>' )
				.button( { label: gM( 'mwe-upwiz-license-custom-preview' ) } )
				.css( { 'width': '8em' } )
				.click( function() { _this.showPreview( $textarea.val() ); } );

		return $j( '<div></div>' ).css( { 'width': '100%' } ).append(
			$j( '<div></div>' ).css( { 'float': 'right', 'width': '9em', 'padding-left': '1em' } ).append( $button ),
			$j( '<div></div>' ).css( { 'margin-right': '10em' } ).append( $textarea ),
			$j( '<div></div>' ).css( { 'clear':'both' } )
		);
	},

	/**
	 * Preview license
	 */
	showPreview: function() {
		// do stuff with this.api
	}


};

} )( jQuery );
