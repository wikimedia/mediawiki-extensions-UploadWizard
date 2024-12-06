( function ( uw ) {

	/**
	 * A single language input field in UploadWizard's "Details" step form.
	 *
	 * @extends uw.DetailsWidget
	 * @class
	 * @param {Object} config
	 * @param {Object} config.languages { langcode: text } map of languages
	 * @param {Object} [config.defaultLanguage]
	 * @param {boolean} [config.removable=true]
	 * @param {mw.Message} [config.remove] Title text for remove icon
	 * @param {number} [config.minLength=0] Minimum input length
	 * @param {number} [config.maxLength=99999] Maximum input length
	 */
	uw.SingleLanguageInputWidget = function UWSingleLanguageInputWidget( config ) {
		this.config = Object.assign( {
			inputWidgetConstructor: OO.ui.MultilineTextInputWidget.bind( null, {
				classes: [ 'mwe-upwiz-singleLanguageInputWidget-text' ],
				autosize: true
			} ),
			removable: true,
			remove: mw.message( '' ),
			minLength: 0,
			maxLength: 99999
		}, config );

		uw.SingleLanguageInputWidget.super.call( this );
		uw.ValidationMessageElement.call( this );

		if ( mw.loader.getState( 'ext.uls.mediawiki' ) === 'ready' ) {
			this.languageSelector = new uw.UlsWidget( {
				languages: config.languages,
				classes: [ 'mwe-upwiz-singleLanguageInputWidget-language' ]
			} );
		} else {
			this.languageSelector = new uw.LanguageDropdownWidget( {
				languages: config.languages,
				classes: [ 'mwe-upwiz-singleLanguageInputWidget-language' ]
			} );
		}

		// eslint-disable-next-line new-cap
		this.textInput = new this.config.inputWidgetConstructor();
		this.removeButton = new OO.ui.ButtonWidget( {
			classes: [ 'mwe-upwiz-singleLanguageInputWidget-removeItem' ],
			icon: 'trash',
			framed: false,
			title: this.config.remove.exists() ? this.config.remove.text() : ''
		} );

		this.removeButton.connect( this, {
			click: 'onRemoveClick'
		} );

		this.setLanguage( config.defaultLanguage || this.getDefaultLanguage() );
		this.languageSelector.on( 'select', () => {
			this.textInput.$input.attr( 'lang', this.languageSelector.getValue() );
		} );
		this.languageSelector.connect( this, { select: [ 'emit', 'select' ] } );
		// Aggregate 'change' event
		// (but do not flash warnings in the user's face while they're typing)
		this.textInput.on( 'change', OO.ui.debounce( this.emit.bind( this, 'change' ), 500 ) );

		// Note: ValidationMessageElement will append messages after this.$body
		this.$body = $( '<div>' ).addClass( 'mwe-upwiz-singleLanguageInputWidget-body' ).append(
			this.languageSelector.getElement(),
			// remove button will be hidden with CSS if it's not meant to be removable
			this.removeButton.$element,
			this.textInput.$element
		);
		this.$element.addClass( 'mwe-upwiz-singleLanguageInputWidget' ).append( this.$body );
		this.setRemovable( this.config.removable );
	};
	OO.inheritClass( uw.SingleLanguageInputWidget, uw.DetailsWidget );
	OO.mixinClass( uw.SingleLanguageInputWidget, uw.ValidatableElement );

	/**
	 * Handle remove button click events.
	 *
	 * @private
	 */
	uw.SingleLanguageInputWidget.prototype.onRemoveClick = function () {
		const element = this.getElementGroup();

		if ( element && typeof element.removeItems === 'function' ) {
			element.removeItems( [ this ] );
		}
	};

	/**
	 * Check if the given language code can be used for inputs.
	 * If not, try finding a similar language code that can be.
	 *
	 * @public
	 * @param {string} code Language code
	 * @param {string} [fallback] Language code to use when there's nothing close,
	 *   defaults to result of #getDefaultLanguage
	 * @return {string|null}
	 */
	uw.SingleLanguageInputWidget.prototype.getClosestAllowedLanguage = function ( code, fallback ) {
		// Is this still needed?
		if ( code === 'nan' || code === 'minnan' ) {
			code = 'zh-min-nan';
		}
		if ( this.config.languages[ code ] ) {
			return code;
		}
		if ( code.lastIndexOf( '-' ) !== -1 ) {
			return this.getClosestAllowedLanguage( code.slice( 0, code.lastIndexOf( '-' ) ), fallback );
		}
		return arguments.length > 1 ? fallback : this.getDefaultLanguage();
	};

	/**
	 * Get the default language to use for inputs.
	 * Choose a sane default based on user preferences and wiki config.
	 *
	 * @public
	 * @return {string}
	 */
	uw.SingleLanguageInputWidget.prototype.getDefaultLanguage = function () {
		if ( this.defaultLanguage !== undefined ) {
			return this.defaultLanguage;
		}

		let defaultLanguage = this.getClosestAllowedLanguage( mw.config.get( 'wgUserLanguage' ), null ) ||
			this.getClosestAllowedLanguage( mw.config.get( 'wgContentLanguage' ), null ) ||
			this.getClosestAllowedLanguage( 'en', null ) ||
			Object.keys( this.config.languages )[ 0 ];

		// Logic copied from MediaWiki:UploadForm.js
		// Per request from Portuguese and Brazilian users, treat Brazilian Portuguese as Portuguese.
		if ( defaultLanguage === 'pt-br' ) {
			defaultLanguage = 'pt';
		// this was also in UploadForm.js, but without the heartwarming justification
		} else if ( defaultLanguage === 'en-gb' ) {
			defaultLanguage = 'en';
		}

		this.defaultLanguage = defaultLanguage;
		return defaultLanguage;
	};

	/**
	 * @inheritdoc
	 */
	// eslint-disable-next-line no-unused-vars
	uw.SingleLanguageInputWidget.prototype.validate = function ( thorough ) {
		const status = new mw.uploadWizard.ValidationStatus(),
			text = this.textInput.getValue().trim();

		if ( text.length !== 0 && text.length < this.config.minLength ) {
			// Empty input is allowed
			status.addError( mw.message( 'mwe-upwiz-error-too-short', this.config.minLength ) );
		}
		if ( text.length > this.config.maxLength ) {
			status.addError( mw.message( 'mwe-upwiz-error-too-long', this.config.maxLength ) );
		}

		return status.getErrors().length === 0 ? status.resolve() : status.reject();
	};

	/**
	 * @param {Object} languages
	 */
	uw.SingleLanguageInputWidget.prototype.updateLanguages = function ( languages ) {
		this.languageSelector.updateLanguages( languages );
	};

	/**
	 * @return {string} language code
	 */
	uw.SingleLanguageInputWidget.prototype.getLanguage = function () {
		return this.languageSelector.getValue();
	};

	/**
	 * @param {string} value language code
	 */
	uw.SingleLanguageInputWidget.prototype.setLanguage = function ( value ) {
		this.languageSelector.setValue( value );
		this.textInput.$input.attr( 'lang', value );
		this.textInput.$input.attr( 'spellcheck', '' );
	};

	/**
	 * @return {string} text input
	 */
	uw.SingleLanguageInputWidget.prototype.getText = function () {
		return this.textInput.getValue().trim();
	};

	/**
	 * @param {string} value text input
	 */
	uw.SingleLanguageInputWidget.prototype.setText = function ( value ) {
		this.textInput.setValue( value );
	};

	/**
	 * @inheritdoc
	 */
	uw.SingleLanguageInputWidget.prototype.getWikiText = function () {
		let language = this.getLanguage();
		const text = this.getText();

		if ( !text ) {
			return '';
		}

		if ( mw.UploadWizard.config.languageTemplateFixups[ language ] ) {
			language = mw.UploadWizard.config.languageTemplateFixups[ language ];
		}

		return '{{' + language + '|1=' + mw.Escaper.escapeForTemplate( text ) + '}}';
	};

	/**
	 * @inheritdoc
	 * @return {Object} See #setSerialized
	 */
	uw.SingleLanguageInputWidget.prototype.getSerialized = function () {
		return {
			language: this.languageSelector.getValue(),
			text: this.textInput.getValue(),
			removable: this.config.removable
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {string} serialized.language Language code
	 * @param {string} serialized.text Text
	 * @param {boolean} serialized.removable
	 */
	uw.SingleLanguageInputWidget.prototype.setSerialized = function ( serialized ) {
		this.setLanguage( serialized.language );
		this.setText( serialized.text );
		this.setRemovable( serialized.removable );
	};

	/**
	 * @param {boolean} removable
	 */
	uw.SingleLanguageInputWidget.prototype.setRemovable = function ( removable ) {
		this.config.removable = !!removable;
		this.$element.toggleClass( 'mwe-upwiz-singleLanguageInputWidget-removable', this.config.removable );
	};

}( mw.uploadWizard ) );
