( function ( mw, uw, $, OO ) {

	/**
	 * A single language input field in UploadWizard's "Details" step form.
	 *
	 * @extends uw.DetailsWidget
	 * @constructor
	 * @param {Object} [config]
	 * @param {boolean} [config.canBeRemoved=true]
	 * @param {mw.Message} [config.placeholder] Placeholder text for input field
	 * @param {mw.Message} [config.remove] Title text for remove icon
	 * @param {number} [config.minLength=0] Minimum input length
	 * @param {number} [config.maxLength=99999] Maximum input length
	 */
	uw.SingleLanguageInputWidget = function UWSingleLanguageInputWidget( config ) {
		var languageOptions = this.getLanguageOptions(),
			defaultLanguage = this.constructor.static.getDefaultLanguage();

		this.config = $.extend( {
			placeholder: mw.message( '' ),
			remove: mw.message( '' ),
			minLength: 0,
			maxLength: 99999
		}, config );

		uw.SingleLanguageInputWidget.parent.call( this );
		uw.ValidationMessageElement.call( this );

		if ( mw.loader.getState( 'ext.uls.mediawiki' ) === 'ready' ) {
			this.languageSelector = new uw.UlsWidget( {
				languages: languageOptions,
				defaultLanguage: defaultLanguage,
				classes: [ 'mwe-upwiz-singleLanguageInputWidget-language' ]
			} );
		} else {
			this.languageSelector = new uw.LanguageDropdownWidget( {
				menuOptionWidgets: this.getLanguageMenuOptionWidgets( languageOptions ),
				classes: [ 'mwe-upwiz-singleLanguageInputWidget-language' ]
			} );
		}

		this.textInput = new OO.ui.MultilineTextInputWidget( {
			classes: [ 'mwe-upwiz-singleLanguageInputWidget-text' ],
			placeholder: this.config.placeholder.exists() ? this.config.placeholder.text() : '',
			autosize: true,
			rows: 2
		} );
		this.removeButton = new OO.ui.ButtonWidget( {
			classes: [ 'mwe-upwiz-singleLanguageInputWidget-removeItem' ],
			icon: 'trash',
			framed: false,
			flags: [ 'destructive' ],
			title: this.config.remove.exists() ? this.config.remove.text() : ''
		} );

		this.removeButton.connect( this, {
			click: 'onRemoveClick'
		} );

		this.languageSelector.setValue( defaultLanguage );

		// Aggregate 'change' event
		// (but do not flash warnings in the user's face while they're typing)
		this.textInput.on( 'change', OO.ui.debounce( this.emit.bind( this, 'change' ), 500 ) );

		this.$element.addClass( 'mwe-upwiz-singleLanguageInputWidget' );
		this.$element.append(
			this.languageSelector.getElement(),
			this.textInput.$element
		);
		// HACK: ValidationMessageElement will append messages after this.$body
		this.$body = this.textInput.$element;
		if ( this.config.canBeRemoved !== false ) {
			this.$element.append( this.removeButton.$element );
			this.$body = this.removeButton.$element; // HACK
		}
	};
	OO.inheritClass( uw.SingleLanguageInputWidget, uw.DetailsWidget );
	OO.mixinClass( uw.SingleLanguageInputWidget, uw.ValidationMessageElement );

	/**
	 * Handle remove button click events.
	 *
	 * @private
	 */
	uw.SingleLanguageInputWidget.prototype.onRemoveClick = function () {
		var element = this.getElementGroup();

		if ( element && $.isFunction( element.removeItems ) ) {
			element.removeItems( [ this ] );
		}
	};

	/**
	 * Check if the given language code can be used for inputs.
	 * If not, try finding a similar language code that can be.
	 *
	 * @private
	 * @param {string} code Language code
	 * @param {string} [fallback] Language code to use when there's nothing close,
	 *   defaults to result of #getDefaultLanguage
	 * @return {string|null}
	 */
	uw.SingleLanguageInputWidget.static.getClosestAllowedLanguage = function ( code, fallback ) {
		// Is this still needed?
		if ( code === 'nan' || code === 'minnan' ) {
			code = 'zh-min-nan';
		}
		if ( mw.UploadWizard.config.uwLanguages[ code ] ) {
			return code;
		}
		if ( code.lastIndexOf( '-' ) !== -1 ) {
			return this.getClosestAllowedLanguage( code.substring( 0, code.lastIndexOf( '-' ) ) );
		}
		return arguments.length > 1 ? fallback : this.getDefaultLanguage();
	};

	/**
	 * Get the default language to use for inputs.
	 * Choose a sane default based on user preferences and wiki config.
	 *
	 * @private
	 * @return {string}
	 */
	uw.SingleLanguageInputWidget.static.getDefaultLanguage = function () {
		var defaultLanguage;

		if ( this.defaultLanguage !== undefined ) {
			return this.defaultLanguage;
		}

		if ( this.getClosestAllowedLanguage( mw.config.get( 'wgUserLanguage' ), null ) ) {
			defaultLanguage = this.getClosestAllowedLanguage( mw.config.get( 'wgUserLanguage' ) );
		} else if ( this.getClosestAllowedLanguage( mw.config.get( 'wgContentLanguage' ), null ) ) {
			defaultLanguage = this.getClosestAllowedLanguage( mw.config.get( 'wgContentLanguage' ) );
		} else if ( this.getClosestAllowedLanguage( 'en', null ) ) {
			defaultLanguage = this.getClosestAllowedLanguage( 'en' );
		} else {
			defaultLanguage = Object.keys( mw.UploadWizard.config.uwLanguages )[ 0 ];
		}

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
	 * Get options for the dropdown list of all allowed languages.
	 *
	 * @private
	 * @param {Object} languages
	 * @return {OO.ui.MenuOptionWidget[]}
	 */
	uw.SingleLanguageInputWidget.prototype.getLanguageMenuOptionWidgets = function ( languages ) {
		var options;

		options = [];
		$.each( languages, function ( code, language ) {
			options.push(
				new OO.ui.MenuOptionWidget( {
					data: code,
					label: language
				} )
			);
		} );
		return options;
	};

	/**
	 * @return {Object}
	 */
	uw.SingleLanguageInputWidget.prototype.getLanguageOptions = function () {
		var languages, code;

		languages = {};
		for ( code in mw.UploadWizard.config.uwLanguages ) {
			if ( mw.UploadWizard.config.uwLanguages.hasOwnProperty( code ) ) {
				languages[ code ] = mw.UploadWizard.config.uwLanguages[ code ];
			}
		}
		return languages;
	};

	/**
	 * @inheritdoc
	 */
	uw.SingleLanguageInputWidget.prototype.getErrors = function () {
		var
			errors = [],
			text = this.textInput.getValue().trim();

		if ( text.length !== 0 && text.length < this.config.minLength ) {
			// Empty input is allowed
			errors.push( mw.message( 'mwe-upwiz-error-too-short', this.config.minLength ) );
		}
		if ( text.length > this.config.maxLength ) {
			errors.push( mw.message( 'mwe-upwiz-error-too-long', this.config.maxLength ) );
		}

		return $.Deferred().resolve( errors ).promise();
	};

	/**
	 * @return {string} language code
	 */
	uw.SingleLanguageInputWidget.prototype.getLanguage = function () {
		return this.languageSelector.getValue();
	};

	/**
	 * @return {string} text input
	 */
	uw.SingleLanguageInputWidget.prototype.getText = function () {
		return this.textInput.getValue().trim();
	};

	/**
	 * @inheritdoc
	 */
	uw.SingleLanguageInputWidget.prototype.getWikiText = function () {
		var
			language = this.getLanguage(),
			text = this.getText();

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
			text: this.textInput.getValue()
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {string} serialized.language Language code
	 * @param {string} serialized.text Text
	 */
	uw.SingleLanguageInputWidget.prototype.setSerialized = function ( serialized ) {
		this.languageSelector.setValue( serialized.language );
		this.textInput.setValue( serialized.text );
	};

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
