/**
 * Create a group of radio buttons for licenses. N.b. the licenses are named after the templates they invoke.
 * Note that this is very anti-MVC. The values are held only in the actual form elements themselves.
 *
 * @param {String|jQuery} selector to place license input
 * @param {Array|undefined} license key name(s) to activate by default
 * @param {Object} configuration of licenseInput. Must have following properties
 *				'type' = ("and"|"or") -- whether inclusive or exclusive license allowed
 *				'licenses' => array of template string names (matching keys in mw.UploadWizard.config.licenses)
 *				optional: 'licenseGroups' => groups of licenses, with more explanation
 *				optional: 'special' => String -- indicates, don't put licenses here, instead use a special widget
 * @param {Number} count of the things we are licensing (it matters to some texts)
 * @param {mw.Api} api object; useful for previews
 */

( function ( mw, uw, $ ) {

	mw.UploadWizardLicenseInput = function ( selector, values, config, count, api ) {
		this.count = count;

		this.api = api;

		if (
			config.type === undefined ||
			( config.licenses === undefined && config.licenseGroups === undefined )
		) {
			throw new Error( 'improper initialization' );
		}

		this.$selector = $( selector );
		this.$selector.append( $( '<div class="mwe-error mwe-error-head"></div>' ) );

		this.type = config.type === 'or' ? 'radio' : 'checkbox';

		this.defaults = [];

		if ( config.defaults && config.defaults[0] ) {
			this.defaults = config.defaults;
		} else if ( config.licenses && config.licenses[0] ) {
			this.defaults = [ config.licenses[0] ];
		}

		mw.UploadWizardLicenseInput.prototype.count++;
		this.name = 'license' + mw.UploadWizardLicenseInput.prototype.count;

		// the jquery wrapped inputs (checkboxes or radio buttons) for this licenseInput.
		this.inputs = [];

		// create inputs and licenses from config
		if ( config.licenseGroups === undefined ) {
			this.createInputs( this.$selector, config );
		} else {
			this.createGroupedInputs( this.$selector, config.licenseGroups );
		}

		// set values of the whole license input
		if ( values ) {
			this.setValues( values );
		}

		// set up preview dialog
		this.$previewDialog = $( '<div></div> ')
			.css( 'padding', 10 )
			.dialog( {
				autoOpen: false,
				width: 800,
				zIndex: 200000,
				modal: true
			} );

		this.$spinner = $( '<div></div>' )
			.addClass( 'mwe-upwiz-status-progress mwe-upwiz-file-indicator' )
			.css( { width: 200, padding: 20, float: 'none', margin: '0 auto' } );
	};

	mw.UploadWizardLicenseInput.prototype = {
		count: 0,

		/**
		 * Creates the license input interface in toggleable groups.
		 * @param jQuery selector
		 * @param license input configuration groups
		 */
		createGroupedInputs: function ( $el, configGroups ) {
			var input = this;
			$.each( configGroups, function ( i, group ) {
				var $body, $toggler, $head, $licensesDiv,
					$group = $( '<div></div>' ).addClass( 'mwe-upwiz-deed-license-group' );
				if ( group.head === undefined ) {
					// if there is no header, just append licenses to the group div.
					$body = $group;
				} else {
					// if there is a header, make a toggle-to-expand div and append inputs there.
					$head = $( '<div></div>' ).append(
						$( '<a>' )
							.addClass( 'mwe-upwiz-deed-license-group-head mwe-upwiz-toggler' )
							.msg( group.head, input.count )
					);
					$body = $( '<div></div>' ).addClass( 'mwe-upwiz-toggler-content' ).css( { marginBottom: '1em' } );
					$toggler = $group.append( $head, $body ).collapseToggle();

				}
				if ( group.subhead !== undefined ) {
					$body.append( $( '<div></div>' ).addClass( 'mwe-upwiz-deed-license-group-subhead' ).msg( group.subhead, input.count ) );
				}
				$licensesDiv = $( '<div></div>' ).addClass( 'mwe-upwiz-deed-license' );
				input.createInputs( $licensesDiv, group, $toggler );
				$body.append( $licensesDiv );
				input.$selector.append( $group );
			} );
		},

		/**
		 * append defined license inputs to element.
		 * SIDE EFFECT: also records licenses and inputs in the object
		 *
		 * Abstracts out simple lists of licenses, more complex groups with layout
		 * @param {jQuery} selector to add inputs to
		 * @param {Array} license configuration, which must have a 'licenses' property, which is an array of license names
		 *			it may also have: 'prependTemplates' or 'template', which alter the final wikitext value
		 *			'prependTemplates' will prepend Templates. If prependTemplates were [ 'pre', 'pended' ], then...
		 *				[ 'fooLicense' ] -> "{{pre}}{{pended}}{{fooLicense}}"
		 *			'template' will filter Templates, as in "own work". If 'filterTemplate' was 'filter', then...
		 *				[ 'fooLicense', 'barLicense' ] -> {{filter|fooLicense|barLicense}}
		 * @param {jQuery} optional - jquery-wrapped element created by $.fn.collapseToggle(), which has 'close' and 'open'
		 *			methods in its data.
		 *
		 */
		createInputs: function ( $el, config, $groupToggler ) {
			var input = this;

			if ( config.licenses === undefined || typeof config.licenses !== 'object' ) {
				throw new Error( 'improper license config' );
			}

			$.each( config.licenses, function ( i, licenseName ) {
				if ( mw.UploadWizard.config.licenses[licenseName] !== undefined ) {
					var $customDiv,
						license = { name: licenseName, props: mw.UploadWizard.config.licenses[licenseName] },
						templates = license.props.templates === undefined ? [ license.name ] : license.props.templates.slice(0),
						$input = input.createInputElement( templates, config ),
						$label = input.createInputElementLabel( license, $input );

					input.inputs.push( $input );
					$el.append( $input, $label, $( '<br/>' ) );
					// TODO add popup help?
					$input.addClass( 'mwe-upwiz-copyright-info-radio' );
					// this is so we can tell if a particular license ought to be set in setValues()
					$input.data( 'licenseName', licenseName );

					// this is so if a single input in a group changes, we open the entire "toggler" that was hiding them
					$input.data( 'groupToggler', $groupToggler );

					if ( config.special === 'custom' ) {
						$customDiv = input.createCustomWikiTextInterface( $input );
						$el.append( $customDiv );
						$input.data( 'textarea', $customDiv.find( 'textarea' ) );
					}
				}
			} );
		},

		/**
		 * License templates are these abstract ideas like cc-by-sa. In general they map directly to a license template.
		 * However, configuration for a particular option can add other templates or transform the templates,
		 * such as wrapping templates in an outer "self" template for own-work
		 * @param {Array} of license template names
		 * @param {Object}, license input configuration
		 * @return {String} of wikitext
		 */
		createInputValueFromTemplateConfig: function ( templates, config ) {
			if ( config.prependTemplates !== undefined ) {
				$.each( config.prependTemplates, function ( i, template ) {
					templates.unshift( template );
				} );
			}
			if ( config.template !== undefined ) {
				templates.unshift( config.template );
				templates = [ templates.join( '|' ) ];
			}
			var wikiTexts = $.map( templates, function (t) { return '{{' + t + '}}'; } );
			return wikiTexts.join( '' );
		},

		/**
		 * Return a radio button or checkbox with appropriate values, depending on config
		 * @param {Array} of template strings
		 * @param {Object} config for this license input
		 * @return {jQuery} wrapped input
		 */
		createInputElement: function ( templates, config ) {
			var input = this,

				attrs = {
					id:  this.name + '_' + this.inputs.length, // unique id
					name: this.name, // name of input, shared among all checkboxes or radio buttons.
					type: this.type, // kind of input
					value: this.createInputValueFromTemplateConfig( templates, config )
				},

				inputHtml = '<input ' +
					$.map( attrs, function ( val, key ) {
						return key + '="' + val.toString().replace( '"', '' ) + '"';
					} ).join( ' ' ) +
				' />';

			// Note we aren't using $('<input>').attr( { ... } ) .  We construct a string of HTML.
			// IE6 is idiotic about radio buttons; you have to create them as HTML or clicks aren't recorded
			return $( inputHtml ).click( function () {
				input.$selector.trigger( 'changeLicenses' );
			} );
		},

		/**
		 * Get a label for the form element
		 * @param {Object} license definition from global config. Will tell us the messages, and maybe icons.
		 * @param {jQuery} wrapped input
		 * @return {jQuery} wrapped label referring to that input, with appropriate HTML, decorations, etc.
		 */
		createInputElementLabel: function ( license, $input ) {
			var messageKey = license.props.msg === undefined ? '[missing msg for ' + license.name + ']' : license.props.msg,
				languageCode = mw.config.get( 'wgUserLanguage' ),

				// The URL is optional, but if the message includes it as $2, we surface the fact
				// that it's misisng.
				licenseURL = license.props.url === undefined ? '#missing license URL' : license.props.url,

				licenseLink = $( '<a>' ).attr( { target: '_blank', href: licenseURL } ),

				$icons = $( '<span></span>' );

			if ( license.props.languageCodePrefix !== undefined ) {
				licenseURL += license.props.languageCodePrefix + languageCode;
			}
			if ( license.props.icons !== undefined ) {
				$.each( license.props.icons, function ( i, icon ) {
					$icons.append( $( '<span></span>' ).addClass( 'mwe-upwiz-license-icon mwe-upwiz-' + icon + '-icon' ) );
				} );
			}
			return $( '<label />' )
				.attr( { for: $input.attr('id') } )
				.msg( messageKey, this.count || 0, licenseLink )
				.append( $icons ).addClass( 'mwe-upwiz-copyright-info' );
		},

		/**
		 * Given an input, return another textarea to be appended below.
		 * When text entered here, auto-selects the input.
		 * @param {jQuery} wrapped input
		 * @return {jQuery} wrapped textarea
		 */
		createCustomWikiTextInterface: function ( $input ) {
			var keydownTimeout,
				input = this,

				nameId = $input.attr( 'id' ) + '_custom',
				$textarea = $( '<textarea></textarea>' )
					.attr( { id: nameId, name: nameId } )
					.growTextArea()
					.focus( function () { input.setInput( $input, true ); } )
					.keydown( function () {
						window.clearTimeout( keydownTimeout );
						keydownTimeout = window.setTimeout(
							function () { input.$selector.trigger( 'changeLicenses' ); },
							2000
						);
					} )
					.css( {
						width: '100%',
						'font-family': 'monospace'
					} ),

				$button = $( '<span></span>' )
					.button( { label: mw.message( 'mwe-upwiz-license-custom-preview' ).escaped() } )
					.css( { width: '8em' } )
					.click( function () { input.showPreview( $textarea.val() ); } );

			return $( '<div></div>' ).css( { width: '100%' } ).append(
				$( '<div><label for="' + nameId + '" class="mwe-error mwe-error-textarea"></label></div>' ),
				$( '<div></div>' ).css( { float: 'right', width: '9em', 'padding-left': '1em' } ).append( $button ),
				$( '<div></div>' ).css( { 'margin-right': '10em' } ).append( $textarea ),
				$( '<div></div>' ).css( { clear: 'both' } )
			);
		},

		/* ---- end creational stuff ----- */

		// Set the input value. If it is part of a group, and this is being turned on, pop open the group so we can see this input.
		setInput: function ( $input, val ) {
			var oldVal = $input.is( ':checked' );
			if ( val ) {
				$input.prop( 'checked', true );
			} else {
				$input.prop( 'checked', false );
			}
			if ( val !== oldVal ) { // loose comparison on purpose
				this.$selector.trigger( 'changeLicenses' );
			}

			// pop open the 'toggle' group if is now on. Do nothing if it is now off.
			if ( val && $input.data( 'groupToggler' ) ) {
				$input.data( 'groupToggler' ).data( 'open' )();
			}
		},

		// this works fine for blanking all of a radio input, or for checking/unchecking individual checkboxes
		setInputsIndividually: function ( values ) {
			var input = this;
			$.each( this.inputs, function ( i, $input ) {
				var licenseName = $input.data( 'licenseName' );
				input.setInput( $input, values[licenseName] );
			} );
		},

		/**
		 * Sets the value(s) of a license input. This is a little bit klugey because it relies on an inverted dict, and in some
		 * cases we are now letting license inputs create multiple templates.
		 * @param object of license-key to boolean values, e.g. { 'cc_by_sa_30': true, gfdl: true, 'flickrreview|cc_by_sa_30': false }
		 */
		setValues: function ( values ) {
			var trueCount, trueLicenseName,
				input = this;
			// ugly division between radio and checkbox, because in jquery 1.6.4 if you set any element of a radio input to false, every element
			// is set to false!Unfortunately the incoming data structure is a key-val object so we have to make extra sure it makes sense for
			// a radio button input.

			if ( this.type === 'radio' ) {
				// check if how many license names are set to true in the values requested. Should be 0 or 1
				trueCount = 0;

				$.each( values, function ( licenseName, val ) {
					if ( val === true ) {
						trueCount++;
						trueLicenseName = licenseName;
					}
				} );

				if ( trueCount === 0 ) {
					this.setInputsIndividually( values );
				} else if ( trueCount === 1 ) {
					// set just one of the radio inputs and don't touch anything else
					$.each( this.inputs, function ( i, $input ) {
						var licenseName = $input.data( 'licenseName' );
						// !!to ensure boolean.
						if ( licenseName === trueLicenseName ) {
							input.setInput( $input, true );
						}
					} );
				} else {
					mw.log.warn( 'Too many true values for a radio button!' );
				}

			} else if ( this.type === 'checkbox' ) {
				this.setInputsIndividually( values );
			} else {
				mw.log.warn( 'Impossible? UploadWizardLicenseInput type neither radio nor checkbox' );
			}
			// we use the selector because events can't be unbound unless they're in the DOM.
			this.$selector.trigger( 'changeLicenses' );
		},

		/**
		 * Set the default configured licenses
		 */
		setDefaultValues: function () {
			var values = {};
			$.each( this.defaults, function ( i, lic ) {
				values[lic] = true;
			} );
			this.setValues( values );
		},

		/**
		 * Gets the wikitext associated with all selected inputs. Some inputs also have associated textareas so we append their contents too.
		 * @return string of wikitext (empty string if no inputs set)
		 */
		getWikiText: function () {
			var input = this,
				wikiTexts = this.getSelectedInputs().map(
					function () {
						return input.getInputWikiText( this );
					}
				);
			// need to use makeArray because a jQuery-returned set of things won't have .join
			return $.makeArray( wikiTexts ).join( '' );
		},

		/**
		 * Get the value of a particular input
		 */
		getInputWikiText: function ( $input) {
			return $input.val() + '\n' + this.getInputTextAreaVal($input);
		},

		/**
		 * Get the value of the associated textarea, if any
		 * @return {String}
		 */
		getInputTextAreaVal: function ( $input ) {
			var extra = '';
			if ( $input.data( 'textarea' ) ) {
				extra = $.trim( $input.data( 'textarea' ).val() );
			}
			return extra;
		},

		/**
		 * Gets which inputs have user-entered values
		 * @return {jQuery Array} of inputs
		 */
		getSelectedInputs: function () {
			// not sure why filter(':checked') doesn't work
			return $( this.inputs ).filter( function (i, $x) { return $x.is(':checked'); } );
		},

		/**
		 * Check if a valid value is set, also look for incompatible choices.
		 * Side effect: if no valid value, add error notices to the interface. Add listeners to interface, to revalidate and remove notices
		 * If I was sufficiently clever, most of these could just be dynamically added & subtracted validation rules.
		 * Instead this is a bit of a recapitulation of jquery.validate
		 * @return boolean; true if a value set and all is well, false otherwise
		 */
		valid: function () {
			var input = this,
				errors = [],
				selectedInputs = this.getSelectedInputs();

			if ( selectedInputs.length === 0 ) {
				errors.push( [ this.$selector.find( '.mwe-error-head' ), 'mwe-upwiz-deeds-need-license' ] );

			} else {
				// It's pretty hard to screw up a radio button, so if even one of them is selected it's okay.
				// But also check that associated textareas are filled for if the input is selected, and that
				// they are the appropriate size.
				$.each( selectedInputs, function (i, $input) {
					if ( !$input.data( 'textarea' ) ) {
						return;
					}

					var textAreaName = $input.data( 'textarea' ).attr( 'name' ),
						$errorEl = $( 'label[for=' + textAreaName + '].mwe-error' ),
						text = input.getInputTextAreaVal( $input );

					if ( text === '' ) {
						errors.push( [ $errorEl, 'mwe-upwiz-error-license-wikitext-missing' ] );
					} else if ( text.length < mw.UploadWizard.config.minCustomLicenseLength ) {
						errors.push( [ $errorEl, 'mwe-upwiz-error-license-wikitext-too-short' ] );
					} else if ( text.length > mw.UploadWizard.config.maxCustomLicenseLength ) {
						errors.push( [ $errorEl, 'mwe-upwiz-error-license-wikitext-too-long' ] );
					}
				} );
			}

			// clear out the errors if we are now valid
			if ( errors.length === 0 ) {
				this.$selector.find( '.mwe-error' ).fadeOut();
			} else {
				// show the errors
				$.each( errors, function ( i, err ) {
					var $el = err[0],
						msg = err[1];
					$el.msg( msg ).show();
				} );

				// and watch for any change at all in the license to revalidate.
				this.$selector.bind( 'changeLicenses.valid', function () {
					input.$selector.unbind( 'changeLicenses.valid' );
					input.valid();
				} );
			}

			return errors.length === 0;
		},

		/**
		 * Returns true if any license is set
		 * @return boolean
		 */
		isSet: function () {
			return this.getSelectedInputs().length > 0;
		},

		/**
		 * Preview wikitext in a popup window
		 * @param {String} wikitext
		 */
		showPreview: function ( wikiText ) {
			this.$previewDialog.html( this.$spinner ).dialog( 'open' );

			var input = this;

			function show( html ) {
				input.$previewDialog.html( html );
				input.$previewDialog.dialog( 'open' );
			}

			function error( code, result ) {
				var message = result.textStatus || result.error && result.error.info || undefined;

				uw.eventFlowLogger.logError( 'license', { code: code, message: message } );
				show( $( '<div></div>' ).append(
					$( '<h3></h3>' ).append( code ),
					$( '<p></p>' ).append( message )
				) );
			}

			this.api.parse( wikiText ).done( show ).fail( error );
		}

	};

} )( mediaWiki, mediaWiki.uploadWizard, jQuery );
