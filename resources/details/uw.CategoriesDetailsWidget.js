( function ( uw ) {

	var NS_CATEGORY = mw.config.get( 'wgNamespaceIds' ).category;

	/**
	 * A categories field in UploadWizard's "Details" step form.
	 *
	 * @param config
	 * @extends uw.DetailsWidget
	 */
	uw.CategoriesDetailsWidget = function UWCategoriesDetailsWidget( config ) {
		var categories, catDetails = this;

		uw.CategoriesDetailsWidget.super.call( this );

		this.categoriesWidget = new mw.widgets.CategoryMultiselectWidget( config );

		this.categoriesWidget.createTagItemWidget = function ( data ) {
			var widget = this.constructor.prototype.createTagItemWidget.call( this, data );
			if ( !widget ) {
				return null;
			}
			widget.setMissing = function ( missing ) {
				this.constructor.prototype.setMissing.call( this, missing );
				// Aggregate 'change' event
				catDetails.emit( 'change' );
			};
			return widget;
		};

		// Keep only valid titles
		categories = ( mw.UploadWizard.config.defaults.categories || [] ).filter( ( cat ) => !!mw.Title.makeTitle( NS_CATEGORY, cat ) );
		this.categoriesWidget.setValue( categories );

		this.$element.addClass( 'mwe-upwiz-categoriesDetailsWidget' );
		this.$element.append( this.categoriesWidget.$element );

		// Aggregate 'change' event
		this.categoriesWidget.connect( this, { change: [ 'emit', 'change' ] } );
	};
	OO.inheritClass( uw.CategoriesDetailsWidget, uw.DetailsWidget );

	/**
	 * @inheritdoc
	 */
	uw.CategoriesDetailsWidget.prototype.getErrors = function () {
		return $.Deferred().resolve( [] ).promise();
	};

	/**
	 * @inheritdoc
	 */
	uw.CategoriesDetailsWidget.prototype.getWarnings = function () {
		var warnings = [],
			missing = this.categoriesWidget.getItems().filter( ( item ) => item.missing );

		if ( missing.length > 0 ) {
			warnings.push( mw.message( 'mwe-upwiz-categories-missing', missing.length ) );
		}

		return $.Deferred().resolve( warnings ).promise();
	};

	/**
	 * @inheritdoc
	 */
	uw.CategoriesDetailsWidget.prototype.getWikiText = function () {
		var hiddenCats, missingCatsWikiText, categories, wikiText;

		hiddenCats = [];
		if ( mw.UploadWizard.config.autoAdd.categories ) {
			hiddenCats = hiddenCats.concat( mw.UploadWizard.config.autoAdd.categories );
		}
		if ( mw.UploadWizard.config.trackingCategory ) {
			if ( mw.UploadWizard.config.trackingCategory.all ) {
				hiddenCats.push( mw.UploadWizard.config.trackingCategory.all );
			}
			if ( mw.UploadWizard.config.trackingCategory.campaign ) {
				hiddenCats.push( mw.UploadWizard.config.trackingCategory.campaign );
			}
		}
		// Keep only valid titles
		hiddenCats = hiddenCats.filter( ( cat ) => !!mw.Title.makeTitle( NS_CATEGORY, cat ) );

		missingCatsWikiText = null;
		if (
			typeof mw.UploadWizard.config.missingCategoriesWikiText === 'string' &&
			mw.UploadWizard.config.missingCategoriesWikiText.length > 0
		) {
			missingCatsWikiText = mw.UploadWizard.config.missingCategoriesWikiText;
		}

		categories = this.categoriesWidget.getItems().map( ( item ) => item.data );

		// add all categories
		wikiText = categories.concat( hiddenCats )
			.map( ( cat ) => '[[' + mw.Title.makeTitle( NS_CATEGORY, cat ).getPrefixedText() + ']]' )
			.join( '\n' );

		// if so configured, and there are no user-visible categories, add warning
		if ( missingCatsWikiText !== null && categories.length === 0 ) {
			wikiText += '\n\n' + missingCatsWikiText;
		}

		return wikiText;
	};

	/**
	 * @inheritdoc
	 * @return {Object} See #setSerialized
	 */
	uw.CategoriesDetailsWidget.prototype.getSerialized = function () {
		return {
			value: this.categoriesWidget.getItems().map( ( item ) => item.data )
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {string[]} serialized.value List of categories
	 */
	uw.CategoriesDetailsWidget.prototype.setSerialized = function ( serialized ) {
		this.categoriesWidget.setValue( serialized.value );
	};

}( mw.uploadWizard ) );
