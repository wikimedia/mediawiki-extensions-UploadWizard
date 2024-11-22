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
		const self = this;

		uw.LicenseGroup.super.call( this, {} );

		if ( typeof config.licenses !== 'object' ) {
			throw new Error( 'improper license config' );
		}

		if ( [ 'radio', 'checkbox' ].indexOf( type ) < 0 ) {
			throw new Error( 'Invalid type: ' + type );
		}

		this.config = config;
		this.type = type;
		this.api = api;
		this.count = count;
		this.customInputs = {};
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
		this.on( 'change', ( group, item ) => {
			if ( item && item.isSelected && item.isSelected() ) {
				// wrapped inside setTimeout to ensure it goes at the end of the call stack,
				// just in case something steals focus in the meantime...
				setTimeout( () => {
					const name = item.getData();
					if ( self.customInputs[ name ] ) {
						self.customInputs[ name ].focus();
					}
				} );
			}
		} );

		this.fieldset = this.createFieldset( this.group );
		this.$element = this.fieldset.$element;
	};
	OO.inheritClass( uw.LicenseGroup, OO.ui.Widget );

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
		const self = this,
			options = [];

		this.config.licenses.forEach( ( licenseName ) => {
			if ( mw.UploadWizard.config.licenses[ licenseName ] === undefined ) {
				// unknown license
				return;
			}

			const option = new OO.ui.RadioOptionWidget( {
				label: self.createLabel( licenseName ),
				data: licenseName
			} );

			// when custom text area receives focus, we should make sure this element is selected
			if ( self.customInputs[ licenseName ] ) {
				self.customInputs[ licenseName ].on( 'focus', () => {
					option.setSelected( true );
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
		const self = this,
			options = [];

		this.config.licenses.forEach( ( licenseName ) => {
			if ( mw.UploadWizard.config.licenses[ licenseName ] === undefined ) {
				// unknown license
				return;
			}

			const option = new OO.ui.CheckboxMultioptionWidget( {
				label: self.createLabel( licenseName ),
				data: licenseName
			} );

			// when custom input fields changes, we should make sure this element is selected when
			// there is content, or deselected when empty
			if ( self.customInputs[ licenseName ] ) {
				self.customInputs[ licenseName ].on( 'focus', () => {
					option.setSelected( true );
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
		const self = this,
			values = this.getValue();

		const wikiTexts = Object.keys( values ).map( ( name ) => {
			let wikiText = self.getLicenceWikiText( name );
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
		const self = this,
			result = {};

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
				result[ name ] = !self.customInputs[ name ] || self.customInputs[ name ].getValue();
			} );
		}

		return result;
	};

	/**
	 * @param {Object} values Map of { licenseName: true }, or { licenseName: "custom input" }
	 */
	uw.LicenseGroup.prototype.setValue = function ( values ) {
		const self = this,
			selectArray = [];

		Object.keys( values ).forEach( ( name ) => {
			const value = values[ name ];
			if ( typeof value === 'string' && self.customInputs[ name ] ) {
				self.customInputs[ name ].setValue( value );
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

		const $label = $( '<label>' )
			.msg( messageKey, this.count || 0, $licenseLink, $icons )
			.addClass( 'mwe-upwiz-copyright-info' );

		if ( this.config.special === 'custom' ) {
			$label.append( this.createCustom( name, licenseInfo.props.defaultText ) );
			$label.append(
				$( '<span>' )
					.msg( 'mwe-upwiz-license-custom-explain', this.count || 0, $licenseLink )
					.addClass( 'mwe-upwiz-label-extra' )
			);
		}

		if ( licenseInfo.props.msgExplain !== undefined ) {
			$label.append(
				$( '<span>' )
					.msg( licenseInfo.props.msgExplain, this.count || 0, $licenseLink )
					.addClass( 'mwe-upwiz-label-extra mwe-upwiz-label-explainer' )
			);
		}

		return $label.contents();
	};

	/**
	 * @private
	 * @param {string} name license name
	 * @param {string} [defaultText] Default custom license text
	 * @return {jQuery} Wrapped textarea
	 */
	uw.LicenseGroup.prototype.createCustom = function ( name, defaultText ) {
		const self = this;

		this.customInputs[ name ] = new OO.ui.TextInputWidget( {
			value: defaultText
		} );

		// Update displayed errors as the user is typing
		this.customInputs[ name ].on( 'change', OO.ui.debounce( this.emit.bind( this, 'change', this ), 500 ) );

		const button = new OO.ui.ButtonWidget( {
			label: mw.message( 'mwe-upwiz-license-custom-preview' ).text(),
			flags: [ 'progressive' ]
		} ).on( 'click', () => {
			self.showPreview( self.customInputs[ name ].getValue() );
		} );

		return $( '<div>' ).addClass( 'mwe-upwiz-license-custom' ).append(
			this.customInputs[ name ].$element,
			button.$element
		).on( 'mousedown ', ( event ) => {
			// T294389 "Another reason not mentioned above" license input textarea: Text is unclickable.
			// No not propagate event to RadioSelectWidget.
			event.stopPropagation();
		} );
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

		const input = this;

		function show( html ) {
			input.previewDialog.setPreview( html );
			input.windowManager.openWindow( input.previewDialog );
		}

		function error( code, result ) {
			const message = result.errors[ 0 ].html;

			show( $( '<div>' ).append(
				$( '<h3>' ).append( code ),
				$( '<p>' ).append( message )
			) );
		}

		this.api.parse( wikiText, { pst: true } ).done( show ).fail( error );
	};

}( mw.uploadWizard ) );
