( function ( uw ) {

	/**
	 * @extends OO.ui.LicenseGroup
	 *
	 * @class
	 * @inheritdoc
	 * @param {Object} config License configuration
	 * @param {Array} config.licenses Array of license names
	 * @param {string} [config.head] Header for the group of licenses (if present, the group of
	 *   licenses will be collapsed and this will be the clickable title to expand the group)
	 * @param {string} [config.subhead] Subtitle for the group of licenses
	 * @param {string} [config.special] 'custom' if a text input field should be added
	 * @param {string} [config.template] Filter templates. If 'filterTemplate' was 'filter',
	 *   then  [ 'fooLicense', 'barLicense' ] -> {{filter|fooLicense|barLicense}}
	 * @param {Array} [config.prependTemplates] Array of templates to prepend. If prependTemplates
	 *   were [ 'pre', 'pended' ], then [ 'fooLicense' ] -> "{{pre}}{{pended}}{{fooLicense}}"
	 * @param {string} type 'radio' or 'checkbox'
	 * @param {mw.Api} api API object, used for wikitext previews
	 * @param {number} count Number of the things we are licensing (it matters to some texts)
	 */
	uw.LicenseGroup = function UWLicenseGroup( config, type, api, count ) {
		uw.LicenseGroup.super.call( this, {} );

		if ( typeof config.licenses !== 'object' ) {
			throw new Error( 'improper license config' );
		}

		if ( [ 'radio', 'checkbox' ].indexOf( type ) < 0 ) {
			throw new Error( 'Invalid type: ' + type );
		}

		// [wikitext => list of templates used in wikitext] map, used in
		// getUsedTemplates to reduce amount of API calls
		this.templateCache = {};
		this.config = config;
		this.type = type;
		this.api = api;
		this.count = count;
		this.customInputs = {};
		this.customInputFields = {};
		this.previewDialog = new uw.LicensePreviewDialog();
		this.windowManager = new OO.ui.WindowManager();
		this.windowManager.addWindows( [ this.previewDialog ] );
		$( document.body ).append( this.windowManager.$element );

		if ( this.type === 'radio' ) {
			this.group = this.createRadioGroup( [ 'mwe-upwiz-deed-license-group-body' ] );
			this.group.connect( this, { choose: [ 'emit', 'change', this ] } );
		} else if ( this.type === 'checkbox' ) {
			this.group = this.createCheckboxGroup( [ 'mwe-upwiz-deed-license-group-body' ] );
			this.group.connect( this, { select: [ 'emit', 'change', this ] } );
		}

		// when selecting an item that has a custom input, we'll immediately focus it
		// this would be easier to implement by listening to the "change" event that this object
		// emits, but those are also triggered for keyboard navigation, and we don't want to focus
		// the input field in that case as it steals focus away from the radios/checkboxes (which,
		// in this case of nested radios/checkboxes, can't easily be restored - it'll also focus
		// the parent radio, which would mess up navigation)
		this.group.$element.on( 'click', ( event ) => {
			// wrapped inside setTimeout to ensure it doesn't execute until OOUI has done its thing
			setTimeout( () => {
				// first find selected thing(s), then figure out if the one we just clicked is among
				// them; if so and if that option has an input field, immediately focus it
				let selectedItems;
				if ( this.type === 'radio' ) {
					selectedItems = this.group.findSelectedItem() ? [ this.group.findSelectedItem() ] : [];
				} else if ( this.type === 'checkbox' ) {
					selectedItems = this.group.findSelectedItems();
				}
				selectedItems.forEach( ( item ) => {
					const name = item.getData();
					if ( item.$element.has( event.target ) && this.customInputs[ name ] ) {
						this.customInputs[ name ].focus();
					}
				} );
			} );
		} );

		this.fieldset = this.createFieldset( this.group );
		this.$element = this.fieldset.$element;
	};
	OO.inheritClass( uw.LicenseGroup, OO.ui.Widget );
	OO.mixinClass( uw.LicenseGroup, uw.ValidatableElement );

	uw.LicenseGroup.prototype.unload = function () {
		this.windowManager.$element.remove();
	};

	/**
	 * @param {OO.ui.RadioSelectWidget|OO.ui.CheckboxMultiselectInputWidget} group
	 * @return {OO.ui.FieldsetLayout}
	 */
	uw.LicenseGroup.prototype.createFieldset = function ( group ) {
		const fieldset = new OO.ui.FieldsetLayout( {
			items: [ group ],
			classes: [ 'mwe-upwiz-deed-license-group' ]
		} );

		if ( this.config.subhead ) {
			// 'url' can be either a single (string) url, or an array of (string) urls;
			// hence this convoluted variable-length parameters assembly...
			const labelParams = [ this.config.subhead, this.count ].concat( this.config.url );
			const $subhead = $( '<div>' )
				.addClass( 'mwe-upwiz-deed-license-group-subhead mwe-upwiz-deed-title' )
				.append( mw.message.apply( mw.message, labelParams ).parseDom() );

			if ( this.config[ 'subhead-extra' ] ) {
				const labelExtraParams = [ this.config[ 'subhead-extra' ], this.count ].concat( this.config.url );
				$subhead.append(
					$( '<span>' )
						.addClass( 'mwe-upwiz-label-extra' )
						.append( mw.message.apply( mw.message, labelExtraParams ).parse() )
				);
			}

			// make all links open in a new tab in order to not disrupt the upload process
			$subhead.find( 'a' ).attr( { target: '_blank' } );

			fieldset.addItems(
				[
					new OO.ui.FieldLayout(
						new OO.ui.Widget( { content: [] } ),
						{ label: $subhead, align: 'top' }
					)
				],
				0 // = index; add to top
			);
		}

		return fieldset;
	};

	/**
	 * @param {Array} classes to add
	 * @return {OO.ui.RadioSelectWidget}
	 */
	uw.LicenseGroup.prototype.createRadioGroup = function ( classes ) {
		const options = [];

		this.config.licenses.forEach( ( licenseName ) => {
			if ( mw.UploadWizard.config.licenses[ licenseName ] === undefined ) {
				// unknown license
				return;
			}

			const option = new OO.ui.RadioOptionWidget( {
				label: this.createLabel( licenseName ),
				data: licenseName,
				classes: [ 'mwe-upwiz-license-option-' + licenseName ]
			} );

			// when custom text field receives input, we should make sure this option is selected
			if ( this.customInputs[ licenseName ] ) {
				this.customInputs[ licenseName ].$input.on( 'input', () => {
					option.setSelected( this.customInputs[ licenseName ].getValue() !== '' );
				} );
			}

			options.push( option );
		} );

		// eslint-disable-next-line mediawiki/class-doc
		return new OO.ui.RadioSelectWidget( { items: options, classes: classes } );
	};

	/**
	 * @param {Array} classes to add
	 * @return {OO.ui.CheckboxMultiselectInputWidget}
	 */
	uw.LicenseGroup.prototype.createCheckboxGroup = function ( classes ) {
		const options = [];

		this.config.licenses.forEach( ( licenseName ) => {
			if ( mw.UploadWizard.config.licenses[ licenseName ] === undefined ) {
				// unknown license
				return;
			}

			const option = new OO.ui.CheckboxMultioptionWidget( {
				label: this.createLabel( licenseName ),
				data: licenseName,
				classes: [ 'mwe-upwiz-license-option-' + licenseName ]
			} );

			// when custom text field receives input, we should make sure this option is selected
			if ( this.customInputs[ licenseName ] ) {
				this.customInputs[ licenseName ].$input.on( 'input', () => {
					option.setSelected( this.customInputs[ licenseName ].getValue() !== '' );
				} );
			}

			options.push( option );
		} );

		// eslint-disable-next-line mediawiki/class-doc
		return new OO.ui.CheckboxMultiselectWidget( { items: options, classes: classes } );
	};

	/**
	 * @return {string}
	 */
	uw.LicenseGroup.prototype.getWikiText = function () {
		const values = this.getValue();

		const wikiTexts = Object.keys( values ).map( ( name ) => {
			let wikiText = this.getLicenceWikiText( name );
			const value = values[ name ];
			if ( typeof value === 'string' ) {
				// `value` is custom input
				wikiText += '\n' + value.trim();
			}
			return wikiText;
		} );

		return wikiTexts.join( '' ).trim();
	};

	/**
	 * Returns a string unique to the group (if defined)
	 *
	 * @return {string}
	 */
	uw.LicenseGroup.prototype.getGroup = function () {
		return this.config.head || '';
	};

	/**
	 * @return {string}
	 */
	uw.LicenseGroup.prototype.getData = function () {
		return this.getGroup();
	};

	/**
	 * @return {Object} Map of { licenseName: true }, or { licenseName: "custom input" }
	 */
	uw.LicenseGroup.prototype.getValue = function () {
		const result = {};

		let selected, name;
		if ( this.type === 'radio' ) {
			selected = this.group.findSelectedItem();
			if ( selected ) {
				name = selected.getData();
				result[ name ] = !this.customInputs[ name ] || this.customInputs[ name ].getValue();
			}
		} else if ( this.type === 'checkbox' ) {
			selected = this.group.findSelectedItems();
			selected.forEach( ( item ) => {
				name = item.getData();
				result[ name ] = !this.customInputs[ name ] || this.customInputs[ name ].getValue();
			} );
		}

		return result;
	};

	/**
	 * @param {Object} values Map of { licenseName: true }, or { licenseName: "custom input" }
	 */
	uw.LicenseGroup.prototype.setValue = function ( values ) {
		const selectArray = [];

		Object.keys( values ).forEach( ( name ) => {
			const value = values[ name ];
			if ( typeof value === 'string' && this.customInputs[ name ] ) {
				this.customInputs[ name ].setValue( value );
				// add to list of items to select
				selectArray.push( name );
			}

			// add to list of items to select
			// (only true/string values should be included in `values`, but might
			// as well play it safe...)
			if ( value === true ) {
				selectArray.push( name );
			}
		} );

		if ( this.type === 'radio' ) {
			this.group.selectItemByData( selectArray[ 0 ] );
		} else if ( this.type === 'checkbox' ) {
			this.group.selectItemsByData( selectArray );
		}
	};

	uw.LicenseGroup.prototype.validate = function ( thorough ) {
		const status = new uw.ValidationStatus();

		if ( thorough !== true ) {
			// `thorough` is the strict checks executed on submit, but we don't want errors
			// to change/display every change event
			return status.resolve();
		}

		let selected, name;
		if ( this.type === 'radio' ) {
			selected = this.group.findSelectedItem() ? [ this.group.findSelectedItem() ] : [];
		} else if ( this.type === 'checkbox' ) {
			selected = this.group.findSelectedItems();
		}

		if ( selected.length === 0 ) {
			return status
				.addError( mw.message( 'mwe-upwiz-deeds-require-selection' ) )
				.reject();
		}

		const customInputPromises = [];
		selected.forEach( ( item ) => {
			name = item.getData();
			if ( name in this.customInputFields ) {
				customInputPromises.push( this.customInputFields[ name ].validate( thorough ) );
			}
		} );

		return uw.ValidationStatus.mergePromises( ...customInputPromises ).then(
			// custom input (if any) is fine
			() => status.getErrors().length === 0 ? status.resolve() : status.reject(),
			// there was an error in one of the custom inputs; we'll still want
			// to reject, but those child messages need not be added into this status
			// object, since they'll already be displayed within those child widgets
			() => status.reject()
		);
	};

	/**
	 * @private
	 * @param {string} name
	 * @return {Object}
	 */
	uw.LicenseGroup.prototype.getLicenseInfo = function ( name ) {
		return {
			name: name,
			props: mw.UploadWizard.config.licenses[ name ]
		};
	};

	/**
	 * @private
	 * @param {string} name
	 * @return {string[]}
	 */
	uw.LicenseGroup.prototype.getTemplates = function ( name ) {
		const licenseInfo = this.getLicenseInfo( name );
		return licenseInfo.props.templates === undefined ?
			[ licenseInfo.name ] :
			licenseInfo.props.templates.slice( 0 );
	};

	/**
	 * License templates are these abstract ideas like cc-by-sa. In general they map directly to a license template.
	 * However, configuration for a particular option can add other templates or transform the templates,
	 * such as wrapping templates in an outer "self" template for own-work
	 *
	 * @private
	 * @param {string} name license template name
	 * @return {string} of wikitext
	 */
	uw.LicenseGroup.prototype.getLicenceWikiText = function ( name ) {
		let templates = this.getTemplates( name );

		if ( this.config.prependTemplates !== undefined ) {
			this.config.prependTemplates.forEach( ( template ) => {
				templates.unshift( template );
			} );
		}

		if ( this.config.template !== undefined ) {
			templates.unshift( this.config.template );
			templates = [ templates.join( '|' ) ];
		}

		const wikiTexts = templates.map( ( t ) => '{{' + t + '}}' );
		return wikiTexts.join( '' );
	};

	/**
	 * Get a label for the form element
	 *
	 * @private
	 * @param {string} name license template name
	 * @return {jQuery}
	 */
	uw.LicenseGroup.prototype.createLabel = function ( name ) {
		const licenseInfo = this.getLicenseInfo( name ),
			messageKey = licenseInfo.props.msg === undefined ?
				'[missing msg for ' + licenseInfo.name + ']' :
				licenseInfo.props.msg,
			$icons = $( '<span>' );
			// The URL is optional, but if the message includes it as $2, we surface the fact
			// that it's missing.
		let licenseURL = licenseInfo.props.url === undefined ? '#missing license URL' : licenseInfo.props.url;

		if (
			licenseInfo.props.languageCodePrefix !== undefined &&
			licenseInfo.props.availableLanguages !== undefined
		) {
			let targetLanguageCode = 'en'; // final fallback
			const fallbackChain = mw.language.getFallbackLanguageChain();
			for ( let i = 0; i < fallbackChain.length; i++ ) {
				if ( licenseInfo.props.availableLanguages.indexOf( fallbackChain[ i ] ) !== -1 ) {
					targetLanguageCode = fallbackChain[ i ];
					break;
				}
			}
			licenseURL += licenseInfo.props.languageCodePrefix + targetLanguageCode;
		}
		const $licenseLink = $( '<a>' ).attr( { target: '_blank', href: licenseURL } );
		if ( licenseInfo.props.icons !== undefined ) {
			licenseInfo.props.icons.forEach( ( icon ) => {
				// The following classes are used here:
				// * mwe-upwiz-cc-public-domain-icon
				// * mwe-upwiz-cc-zero-icon
				// * mwe-upwiz-cc-sa-icon
				// * mwe-upwiz-cc-by-icon
				$icons.append( $( '<span>' ).addClass( 'skin-invert mwe-upwiz-license-icon mwe-upwiz-' + icon + '-icon' ) );
			} );
		}

		const $label = $( '<label>' ).msg( messageKey, this.count || 0, $licenseLink, $icons );

		if (
			this.config.special === 'custom' ||
			licenseInfo.props.special === 'input'
		) {
			const inputField = this.createInput( name, licenseInfo.props.defaultText );

			$label.append( inputField.$element );
			if ( licenseInfo.props.msgSpecial !== undefined ) {
				inputField.$body.append(
					$( '<span>' )
						.html( mw.message( licenseInfo.props.msgSpecial, this.count || 0, $licenseLink ).parse() )
						.addClass( 'mwe-upwiz-label-extra' )
				);
			}
		}

		if ( licenseInfo.props.msgExplain !== undefined ) {
			$label.append(
				$( '<span>' )
					.msg( licenseInfo.props.msgExplain, this.count || 0, $licenseLink )
					.addClass( 'mwe-upwiz-label-extra mwe-upwiz-label-explainer' )
			);
		}

		if ( licenseInfo.props.msgWarning !== undefined ) {
			$label.append(
				$( '<span>' )
					.msg( licenseInfo.props.msgWarning, this.count || 0, $licenseLink )
					.addClass( 'mwe-upwiz-label-extra mwe-upwiz-label-warning' )
			);
		}

		return $label.contents();
	};

	/**
	 * Returns a list of templates used & transcluded in given wikitext
	 *
	 * @private
	 * @param {string} wikitext
	 * @return {jQuery.Promise} Promise that resolves with an array of template names
	 */
	uw.LicenseGroup.prototype.getUsedTemplates = function ( wikitext ) {
		if ( wikitext in this.templateCache ) {
			return $.Deferred().resolve( this.templateCache[ wikitext ] ).promise();
		}
		return this.api.get( {
			action: 'parse',
			pst: true,
			prop: 'templates',
			title: 'File:UploadWizard license verification.png',
			text: wikitext
		} ).then( ( result ) => {
			const templates = [];
			for ( let i = 0; i < result.parse.templates.length; i++ ) {
				const template = result.parse.templates[ i ];
				// normalize templates to mw.Title.getPrefixedDb() format
				const title = new mw.Title( template.title, template.ns );
				templates.push( title.getPrefixedDb() );
			}
			// cache result so we won't have to fire another API request
			// for the same content
			this.templateCache[ wikitext ] = templates;
			return templates;
		} );
	};

	/**
	 * @private
	 * @param {string} name license name
	 * @param {string} [defaultText] Default custom license text
	 * @return {uw.FieldLayout}
	 */
	uw.LicenseGroup.prototype.createInput = function ( name, defaultText ) {
		const input = new OO.ui.TextInputWidget( {
			value: defaultText
		} );

		const button = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-license-custom-preview' ).text(),
			flags: [ 'progressive' ]
		} );

		input.on( 'change', () => {
			// Update displayed errors as the user is typing
			this.emit( 'change' );
		} );
		input.$element.on( 'mousedown', ( event ) => {
			// T294389 "Another reason not mentioned above" license input textarea: Text is unclickable.
			// When used inside other widgets (e.g. RadioSelectWidget or CheckboxMultioptionWidget),
			// those may have event handlers to respond to clicks (e.g. selecting the radio/checkbox)
			// that would steal focus from the input. We do not want that to happen, as it may
			// interfere with operations within the input field (e.g. selecting text), so we'll
			// avoid that by not propagating the event (to RadioSelectWidget/CheckboxMultioptionWidget),
			// but that'll then require those parent widgets to handle such relevant events themselves.
			event.stopPropagation();
		} );
		input.$element.on( 'keydown', ( event ) => {
			switch ( event.which ) {
				case OO.ui.Keys.UP:
				case OO.ui.Keys.LEFT:
				case OO.ui.Keys.DOWN:
				case OO.ui.Keys.RIGHT:
					// Similar to the mouse events issue described above; parent widgets may also
					// handle some keyboard events (e.g. RadioSelectWidget or CheckboxMultioptionWidget
					// capture up/left and down/right to navigate to previous/next item)
					// Once again, this is undesirable, as these keys are likely used for operations
					// within the input field (moving the cursor), so once again we're preventing
					// propagation of these events to the parent nodes.
					event.stopPropagation();
					break;
				case OO.ui.Keys.ENTER:
					// Hitting enter should not trigger the default button action (submitting a form),
					// but open the preview dialog instead.
					event.preventDefault();
					button.emit( 'click' );
					break;
			}
		} );

		button.on( 'click', () => {
			this.showPreview( input.getValue() );
		} );

		uw.ValidatableElement.decorate( input );
		input.validate = ( thorough ) => {
			const status = new uw.ValidationStatus();
			let promise = $.Deferred().resolve().promise();

			if ( thorough !== true ) {
				return status.resolve();
			}

			const wikitext = input.getValue().trim();
			if ( wikitext === '' ) {
				status.addError( mw.message( 'mwe-upwiz-error-license-wikitext-missing' ) );
			} else if ( wikitext.length < mw.UploadWizard.config.minCustomLicenseLength ) {
				status.addError( mw.message( 'mwe-upwiz-error-license-wikitext-too-short' ) );
			} else if ( wikitext.length > mw.UploadWizard.config.maxCustomLicenseLength ) {
				status.addError( mw.message( 'mwe-upwiz-error-license-wikitext-too-long' ) );
			} else if ( !/\{\{(.+?)\}\}/g.test( wikitext ) ) {
				// if text doesn't contain a template, we don't even
				// need to validate it any further...
				status.addError( mw.message( 'mwe-upwiz-error-license-wikitext-missing-template' ) );
			} else if ( mw.UploadWizard.config.customLicenseTemplate !== false ) {
				// now do a thorough test to see if the text actually
				// includes a license template
				promise = this.getUsedTemplates( wikitext ).then( ( usedTemplates ) => {
					if ( usedTemplates.indexOf( mw.UploadWizard.config.customLicenseTemplate ) < 0 ) {
						// no license template found, add another error
						status.addError( mw.message( 'mwe-upwiz-error-license-wikitext-missing-template' ) );
					}
				} );
			}

			return promise.then( () => status.getErrors().length === 0 ? status.resolve() : status.reject() );
		};

		const inputField = new uw.FieldLayout( input, {
			classes: [ 'mwe-upwiz-license-custom', 'mwe-upwiz-label-input' ]
		} );
		inputField.$body.append( button.$element );
		input.connect( inputField, { change: [ 'emit', 'change' ] } );

		this.customInputs[ name ] = input;
		this.customInputFields[ name ] = inputField;

		return inputField;
	};

	/**
	 * Preview wikitext in a popup window
	 *
	 * @private
	 * @param {string} wikiText
	 */
	uw.LicenseGroup.prototype.showPreview = function ( wikiText ) {
		this.previewDialog.setLoading( true );
		this.windowManager.openWindow( this.previewDialog );

		const show = ( html ) => {
			this.previewDialog.setPreview( html );
			this.windowManager.openWindow( this.previewDialog );
		};

		const error = ( code, result ) => {
			const message = result.errors[ 0 ].html;

			show( $( '<div>' ).append(
				$( '<h3>' ).append( code ),
				$( '<p>' ).append( message )
			) );
		};

		this.api.parse( wikiText, { pst: true } ).done( show ).fail( error );
	};

}( mw.uploadWizard ) );
