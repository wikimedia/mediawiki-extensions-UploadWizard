( function ( uw ) {

	/**
	 * A multi-language input field in UploadWizard's "Details" step form.
	 *
	 * @class
	 * @extends uw.DetailsWidget
	 * @mixes OO.ui.mixin.GroupElement
	 * @param {Object} [config]
	 * @param {boolean} [config.required=true]
	 * @param {mw.Message} [config.label] Text for label
	 * @param {mw.Message} [config.placeholder] Placeholder text for input field
	 * @param {mw.Message} [config.remove] Title text for remove icon
	 * @param {mw.Message} [config.error] Error message
	 * @param {mw.Message} [config.errorBlank] Error message for blank input
	 * @param {number} [config.minLength=0] Minimum input length
	 * @param {number} [config.maxLength=99999] Maximum input length
	 * @param {Object} [config.languages] { langcode: text } map of languages
	 */
	uw.MultipleLanguageInputWidget = function UWMultipleLanguageInputWidget( config ) {
		this.config = Object.assign( {
			required: true,
			label: mw.message( '' ),
			errorBlank: mw.message( 'mwe-upwiz-error-blank' ),
			languages: this.getLanguageOptions()
		}, config );
		uw.MultipleLanguageInputWidget.super.call( this );
		OO.ui.mixin.GroupElement.call( this );

		this.required = !!this.config.required;
		this.addButton = new OO.ui.ButtonWidget( {
			classes: [ 'mwe-upwiz-multipleLanguageInputWidget-addItem' ],
			framed: true,
			icon: 'add',
			label: this.getLabelText()
		} );

		// if a language becomes available because the input gets removed,
		// or unavailable because it gets added, we'll need to update other
		// language dropdowns to reflect the change
		this.connect( this, { add: 'onChangeLanguages' } );
		this.connect( this, { remove: 'onChangeLanguages' } );

		// update the 'add language' button accordingly
		this.connect( this, { add: 'recount' } );
		this.connect( this, { remove: 'recount' } );

		// Aggregate 'change' event
		this.aggregate( { change: 'change' } );

		this.$element.addClass( 'mwe-upwiz-multipleLanguageInputsWidget' );
		this.$element.append(
			this.$group,
			this.addButton.$element
		);

		// Add empty input (non-removable if this field is required)
		this.addLanguageInput( Object.assign( {}, this.config, { removable: !this.required } ) );
		// Clicking the button will add new, removable, language inputs
		this.addButton.connect( this, { click: [ 'addLanguageInput', Object.assign( {}, this.config, { removable: true } ) ] } );
	};
	OO.inheritClass( uw.MultipleLanguageInputWidget, uw.DetailsWidget );
	OO.mixinClass( uw.MultipleLanguageInputWidget, OO.ui.mixin.GroupElement );

	/**
	 * @param {Object} config
	 * @param {string} [text]
	 */
	uw.MultipleLanguageInputWidget.prototype.addLanguageInput = function ( config, text ) {
		const allLanguages = this.config.languages,
			unusedLanguages = this.getUnusedLanguages();

		if ( unusedLanguages.length === 0 ) {
			return;
		}

		let languages = {};
		// only add given language + unused/remaining languages - we don't want
		// languages that have already been selected to show up in the next dropdown...
		if ( config.defaultLanguage ) {
			languages[ config.defaultLanguage ] = allLanguages[ config.defaultLanguage ];
			languages = Object.assign( {}, languages, unusedLanguages );
		} else {
			languages = unusedLanguages;
		}

		config = Object.assign( {}, config, { languages: languages } );
		const item = new uw.SingleLanguageInputWidget( config );
		item.setText( text || '' );

		// if a language is changed, we'll need to update other language dropdowns
		// to reflect the change
		item.connect( this, { select: 'onChangeLanguages' } );

		this.addItems( [ item ] );
	};

	/**
	 * When a language changes (or an input is removed), the old language
	 * becomes available again in other language dropdowns, and the new
	 * language should no longer be selected.
	 * This will iterate all inputs, destroy then, and construct new ones
	 * with the updated language selections.
	 */
	uw.MultipleLanguageInputWidget.prototype.onChangeLanguages = function () {
		const allLanguages = this.config.languages,
			unusedLanguages = this.getUnusedLanguages(),
			items = this.getItems();

		for ( let i = 0; i < items.length; i++ ) {
			const item = items[ i ];

			// only add existing language + unused/remaining languages - we don't want
			// languages that have already been selected to show up in the next dropdown...
			let languages = {};
			languages[ item.getLanguage() ] = allLanguages[ item.getLanguage() ];
			languages = Object.assign( {}, languages, unusedLanguages );
			item.updateLanguages( languages );
		}
	};

	/**
	 * Returns an object of `langcode: text` pairs with the languages
	 * already used in dropdowns.
	 *
	 * @return {Object}
	 */
	uw.MultipleLanguageInputWidget.prototype.getUsedLanguages = function () {
		const allLanguages = this.config.languages,
			items = this.getItems();

		return items.reduce( ( obj, item ) => {
			const languageCode = item.getLanguage();
			obj[ languageCode ] = allLanguages[ languageCode ];
			return obj;
		}, {} );
	};

	/**
	 * Returns an object of `langcode: text` pairs with remaining languages
	 * not yet used in dropdowns.
	 *
	 * @return {Object}
	 */
	uw.MultipleLanguageInputWidget.prototype.getUnusedLanguages = function () {
		const allLanguages = this.config.languages,
			usedLanguageCodes = Object.keys( this.getUsedLanguages() );

		return Object.keys( allLanguages ).reduce( ( remaining, language ) => {
			if ( usedLanguageCodes.indexOf( language ) < 0 ) {
				remaining[ language ] = allLanguages[ language ];
			}
			return remaining;
		}, {} );
	};

	/**
	 * Update the button label after adding or removing inputs.
	 */
	uw.MultipleLanguageInputWidget.prototype.recount = function () {
		const text = this.getLabelText(),
			unusedLanguages = this.getUnusedLanguages();

		this.addButton.setLabel( text );
		// hide the button if there are no remaining languages...
		this.addButton.toggle( Object.keys( unusedLanguages ).length > 0 );
	};

	/**
	 * @return {string}
	 */
	uw.MultipleLanguageInputWidget.prototype.getLabelText = function () {
		let text = '', msg;
		if ( this.config.label.exists() ) {
			// clone the original object: `.params` doesn't replace existing
			// params so follow-up calls here would otherwise just keep adding
			// to the params instead of setting a new value for the first param
			msg = mw.message( this.config.label.key ).params( this.config.label.parameters );
			text = msg.params( [ this.items.length ] ).text();
		}

		return text;
	};

	/**
	 * @return {Object}
	 */
	uw.MultipleLanguageInputWidget.prototype.getLanguageOptions = function () {
		const languages = {};
		for ( const code in mw.UploadWizard.config.uwLanguages ) {
			if ( Object.prototype.hasOwnProperty.call( mw.UploadWizard.config.uwLanguages, code ) ) {
				languages[ code ] = mw.UploadWizard.config.uwLanguages[ code ];
			}
		}
		return languages;
	};

	/**
	 * @inheritdoc
	 */
	uw.MultipleLanguageInputWidget.prototype.getErrors = function ( thorough ) {
		const self = this,
			// Gather errors from each item
			errorPromises = this.getItems().map( ( item ) => item.getErrors() );

		return $.when.apply( $, errorPromises ).then( function () {
			const errors = [];
			// Fold all errors into a single one (they are displayed in the UI for each item, but we still
			// need to return an error here to prevent form submission).
			if ( [ ...arguments ].some( ( arg ) => arg.length ) ) {
				// One of the items has errors
				errors.push( self.config.error );
			}
			// And add some more:
			if ( thorough && this.required && this.getWikiText() === '' ) {
				errors.push( self.config.errorBlank );
			}
			// TODO Check for duplicate languages
			return errors;
		}.bind( this ) );
	};

	/**
	 * @return {Object} an object of `{ language code: text }` pairs
	 */
	uw.MultipleLanguageInputWidget.prototype.getValues = function () {
		const values = {},
			widgets = this.getItems();

		for ( let i = 0; i < widgets.length; i++ ) {
			const language = widgets[ i ].getLanguage();
			const text = widgets[ i ].getText();

			if ( text !== '' ) {
				values[ language ] = text;
			}
		}

		return values;
	};

	/**
	 * @inheritdoc
	 */
	uw.MultipleLanguageInputWidget.prototype.getWikiText = function () {
		// Some code here and in mw.UploadWizardDetails relies on this function returning an empty
		// string when there are some inputs, but all are empty.
		return this.getItems().map( ( widget ) => widget.getWikiText() ).filter( ( wikiText ) => !!wikiText ).join( '\n' );
	};

	/**
	 * @inheritdoc
	 * @return {Object} See #setSerialized
	 */
	uw.MultipleLanguageInputWidget.prototype.getSerialized = function () {
		const inputs = this.getItems().map( ( widget ) => widget.getSerialized() );
		return {
			inputs: inputs
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {Object[]} serialized.inputs Array of serialized inputs,
	 *   see uw.SingleLanguageInputWidget#setSerialized
	 */
	uw.MultipleLanguageInputWidget.prototype.setSerialized = function ( serialized ) {
		let config = this.config,
			i;

		// remove all existing
		this.removeItems( this.getItems() );

		for ( i = 0; i < serialized.inputs.length; i++ ) {
			config = Object.assign( {}, config, {
				defaultLanguage: serialized.inputs[ i ].language,
				removable: serialized.inputs[ i ].removable
			} );

			this.addLanguageInput( config, serialized.inputs[ i ].text );
		}
	};

	/**
	 * @param {boolean} required
	 */
	uw.MultipleLanguageInputWidget.prototype.setRequired = function ( required ) {
		this.required = !!required;
		this.getItems()[ 0 ].setRemovable( !this.required );

		// emit change event - while no content has changed, the state has, and
		// whatever (lack of) content there was may now have become (in)valid
		this.emit( 'change' );
	};

}( mw.uploadWizard ) );
