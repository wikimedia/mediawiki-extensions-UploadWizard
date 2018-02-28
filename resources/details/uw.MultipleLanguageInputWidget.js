( function ( mw, uw, $, OO ) {

	/**
	 * A multi-language input field in UploadWizard's "Details" step form.
	 *
	 * @class uw.MultipleLanguageInputWidget
	 * @extends uw.DetailsWidget
	 * @mixins OO.ui.mixin.GroupElement
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {boolean} [required=true]
	 * @cfg {mw.Message} [label] Text for label
	 * @cfg {mw.Message} [placeholder] Placeholder text for input field
	 * @cfg {mw.Message} [remove] Title text for remove icon
	 * @cfg {mw.Message} [error] Error message
	 * @cfg {number} [minLength=0] Minimum input length
	 * @cfg {number} [maxLength=99999] Maximum input length
	 */
	uw.MultipleLanguageInputWidget = function UWMultipleLanguageInputWidget( config ) {
		this.config = $.extend( { required: true, label: mw.message( '' ) }, config );
		uw.MultipleLanguageInputWidget.parent.call( this );
		OO.ui.mixin.GroupElement.call( this );

		this.required = !!this.config.required;
		this.addButton = new OO.ui.ButtonWidget( {
			framed: false,
			flags: [ 'progressive' ],
			label: this.getLabelText()
		} );
		this.addButton.connect( this, { click: [ 'add', 1 ] } );

		this.connect( this, { change: 'recount' } );

		// Aggregate 'change' event
		this.aggregate( {
			change: 'change'
		} );

		this.$element.addClass( 'mwe-upwiz-multipleLanguageInputsWidget' );
		this.$element.append(
			this.$group,
			this.addButton.$element
		);

		// Add empty input (non-removable if this field is required)
		this.addItems( [
			new uw.SingleLanguageInputWidget(
				$.extend( { canBeRemoved: !this.required }, this.config )
			)
		] );
	};
	OO.inheritClass( uw.MultipleLanguageInputWidget, uw.DetailsWidget );
	OO.mixinClass( uw.MultipleLanguageInputWidget, OO.ui.mixin.GroupElement );

	/**
	 * Add multiple inputs in another language.
	 *
	 * @param {number} n Number of inputs
	 */
	uw.MultipleLanguageInputWidget.prototype.add = function ( n ) {
		var items = [];
		while ( n-- ) {
			items.push( new uw.SingleLanguageInputWidget( $.extend( {}, this.config ) ) );
		}
		this.addItems( items );
	};

	/**
	 * Update the button label after adding or removing inputs.
	 */
	uw.MultipleLanguageInputWidget.prototype.recount = function () {
		var text = this.getLabelText();
		this.addButton.setLabel( text );
	};

	/**
	 * @return {string}
	 */
	uw.MultipleLanguageInputWidget.prototype.getLabelText = function () {
		var text = '', msg;
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
	 * @inheritdoc
	 */
	uw.MultipleLanguageInputWidget.prototype.getErrors = function () {
		var self = this,
			// Gather errors from each item
			errorPromises = this.getItems().map( function ( item ) {
				return item.getErrors();
			} );

		return $.when.apply( $, errorPromises ).then( function () {
			var i, errors;
			errors = [];
			// Fold all errors into a single one (they are displayed in the UI for each item, but we still
			// need to return an error here to prevent form submission).
			for ( i = 0; i < arguments.length; i++ ) {
				if ( arguments[ i ].length ) {
					// One of the items has errors
					errors.push( self.config.error );
					break;
				}
			}
			// And add some more:
			if ( this.required && this.getWikiText() === '' ) {
				errors.push( mw.message( 'mwe-upwiz-error-blank' ) );
			}
			// TODO Check for duplicate languages
			return errors;
		}.bind( this ) );
	};

	/**
	 * @return {object} Object where the properties are language codes & values are input
	 */
	uw.MultipleLanguageInputWidget.prototype.getValues = function () {
		var values = {},
			widgets = this.getItems(),
			language,
			text,
			i;

		for ( i = 0; i < widgets.length; i++ ) {
			language = widgets[ i ].getLanguage();
			text = widgets[ i ].getText();

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
		return this.getItems().map( function ( widget ) {
			return widget.getWikiText();
		} ).filter( function ( wikiText ) {
			return !!wikiText;
		} ).join( '\n' );
	};

	/**
	 * @inheritdoc
	 * @return {Object} See #setSerialized
	 */
	uw.MultipleLanguageInputWidget.prototype.getSerialized = function () {
		var inputs = this.getItems().map( function ( widget ) {
			return widget.getSerialized();
		} );
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
		var i, items;
		items = this.getItems();
		if ( items.length > serialized.inputs.length ) {
			// Remove any additional, no longer needed inputs
			this.removeItems( items.slice( /* start= */ serialized.inputs.length ) );
		} else if ( items.length < serialized.inputs.length ) {
			// Add more inputs if we had too few
			this.add( serialized.inputs.length - items.length );
		}
		items = this.getItems();
		// Copy contents
		for ( i = 0; i < serialized.inputs.length; i++ ) {
			items[ i ].setSerialized( serialized.inputs[ i ] );
		}
	};

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
