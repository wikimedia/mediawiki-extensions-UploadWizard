( function ( mw, uw, $, OO ) {

	/**
	 * A descriptions field in UploadWizard's "Details" step form.
	 *
	 * @class uw.DescriptionsDetailsWidgets
	 * @extends uw.DetailsWidget
	 * @mixins OO.ui.mixin.GroupElement
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {boolean} [required=true]
	 */
	uw.DescriptionsDetailsWidget = function UWDescriptionsDetailsWidget( config ) {
		config = $.extend( { required: true }, config );
		uw.DescriptionsDetailsWidget.parent.call( this );
		OO.ui.mixin.GroupElement.call( this );

		this.required = !!config.required;
		this.addDescriptionButton = new OO.ui.ButtonWidget( {
			classes: [ 'mwe-upwiz-details-descriptions-add' ],
			framed: false,
			flags: [ 'progressive' ],
			// Messages: mwe-upwiz-desc-add-0, mwe-upwiz-desc-add-n
			label: mw.msg( 'mwe-upwiz-desc-add-' + ( !this.required ? '0' : 'n' ) )
		} );
		this.addDescriptionButton.connect( this, { click: [ 'addDescriptions', 1 ] } );

		this.connect( this, { change: 'recountDescriptions' } );

		// Aggregate 'change' event
		this.aggregate( {
			change: 'change'
		} );

		this.$element.addClass( 'mwe-upwiz-descriptionsDetailsWidget' );
		this.$element.append(
			this.$group,
			this.addDescriptionButton.$element
		);

		// Add empty non-removable description if this field is required
		if ( this.required ) {
			this.addItems( [
				new uw.DescriptionDetailsWidget( {
					canBeRemoved: false
				} )
			] );
		}
	};
	OO.inheritClass( uw.DescriptionsDetailsWidget, uw.DetailsWidget );
	OO.mixinClass( uw.DescriptionsDetailsWidget, OO.ui.mixin.GroupElement );

	/**
	 * Add multiple descriptions in another language.
	 *
	 * @param {number} n Number of descriptions
	 */
	uw.DescriptionsDetailsWidget.prototype.addDescriptions = function ( n ) {
		var i, items = [];
		while ( n-- ) {
			items.push( new uw.DescriptionDetailsWidget() );
		}
		this.addItems( items );
		for ( i = 0; i < items.length; i++ ) {
			items[ i ].initialiseUls();
		}
	};

	/**
	 * Update the button label after adding or removing descriptions.
	 */
	uw.DescriptionsDetailsWidget.prototype.recountDescriptions = function () {
		// Messages: mwe-upwiz-desc-add-0, mwe-upwiz-desc-add-n
		var label = mw.msg( 'mwe-upwiz-desc-add-' + ( this.items.length === 0 ? '0' : 'n' ) );
		this.addDescriptionButton.setLabel( label );
	};

	/**
	 * @inheritdoc
	 */
	uw.DescriptionsDetailsWidget.prototype.getErrors = function () {
		// Gather errors from each item
		var errorPromises = this.getItems().map( function ( item ) {
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
					errors.push( mw.message( 'mwe-upwiz-error-bad-descriptions' ) );
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
	 * @inheritdoc
	 */
	uw.DescriptionsDetailsWidget.prototype.getWikiText = function () {
		// Some code here and in mw.UploadWizardDetails relies on this function returning an empty
		// string when there are some descriptions, but all are empty.
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
	uw.DescriptionsDetailsWidget.prototype.getSerialized = function () {
		var descriptions = this.getItems().map( function ( widget ) {
			return widget.getSerialized();
		} );
		return {
			descriptions: descriptions
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {Object[]} serialized.descriptions Array of serialized descriptions,
	 *   see uw.DescriptionDetailsWidget#setSerialized
	 */
	uw.DescriptionsDetailsWidget.prototype.setSerialized = function ( serialized ) {
		var i, items;
		items = this.getItems();
		if ( items.length > serialized.descriptions.length ) {
			// Remove any additional, no longer needed descriptions
			this.removeItems( items.slice( /* start= */ serialized.descriptions.length ) );
		} else if ( items.length < serialized.descriptions.length ) {
			// Add more descriptions if we had too few
			this.addDescriptions( serialized.descriptions.length - items.length );
		}
		items = this.getItems();
		// Copy contents
		for ( i = 0; i < serialized.descriptions.length; i++ ) {
			items[ i ].setSerialized( serialized.descriptions[ i ] );
		}
	};

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
