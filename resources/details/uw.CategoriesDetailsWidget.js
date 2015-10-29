( function ( mw, uw, $, OO ) {

	/**
	 * A categories field in UploadWizard's "Details" step form.
	 *
	 * @extends uw.DetailsWidget
	 */
	uw.CategoriesDetailsWidget = function UWCategoriesDetailsWidget() {
		var categories;

		uw.CategoriesDetailsWidget.parent.call( this );

		this.categoriesWidget = new mw.widgets.CategorySelector();

		this.categoriesWidget.createItemWidget = function ( data ) {
			var widget = this.constructor.prototype.createItemWidget.call( this, data );
			widget.setMissing = function ( missing ) {
				this.constructor.prototype.setMissing.call( this, missing );
				if ( !missing ) {
					this.$element.removeAttr( 'title' );
				} else {
					this.$element
						.attr( 'title', mw.msg( 'mwe-upwiz-categories-missing' ) )
						.tipsy()
						.tipsy( 'show' );
				}
			};
			return widget;
		};

		categories = ( mw.UploadWizard.config.defaults.categories || [] ).filter( function ( cat ) {
			// Keep only valid titles
			return !!mw.Title.newFromText( 'Category:' + cat );
		} );
		this.categoriesWidget.setItemsFromData( categories );

		this.categoriesWidgetPrevItems = this.categoriesWidget.getItems();
		this.categoriesWidget.on( 'change', function () {
			var i;
			// Kill any active tipsies, they like to get stuck
			for ( i = 0; i < this.categoriesWidgetPrevItems.length; i++ ) {
				this.categoriesWidgetPrevItems[ i ].$element.tipsy( 'hide' );
			}
			this.categoriesWidgetPrevItems = this.categoriesWidget.getItems();
		}.bind( this ) );

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
		var i;
		// Kill any active tipsies, they like to get stuck.
		// TODO This is a really stupid place to put this.
		// It's here to ensure we clear them when we advance to next step.
		for ( i = 0; i < this.categoriesWidgetPrevItems.length; i++ ) {
			this.categoriesWidgetPrevItems[ i ].$element.tipsy( 'hide' );
		}

		return $.Deferred().resolve( [] ).promise();
	};

	/**
	 * @inheritdoc
	 */
	uw.CategoriesDetailsWidget.prototype.getWarnings = function () {
		var warnings = [];
		if ( mw.UploadWizard.config.enableCategoryCheck && this.categoriesWidget.getItemsData().length === 0 ) {
			warnings.push( mw.message( 'mwe-upwiz-warning-categories-missing' ) );
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
		hiddenCats = hiddenCats.filter( function ( cat ) {
			// Keep only valid titles
			return !!mw.Title.newFromText( 'Category:' + cat );
		} );

		missingCatsWikiText = null;
		if (
			typeof mw.UploadWizard.config.missingCategoriesWikiText === 'string' &&
			mw.UploadWizard.config.missingCategoriesWikiText.length > 0
		) {
			missingCatsWikiText = mw.UploadWizard.config.missingCategoriesWikiText;
		}

		categories = this.categoriesWidget.getItemsData();

		// add all categories
		wikiText = categories.concat( hiddenCats )
			.map( function ( cat ) {
				return '[[' + mw.Title.newFromText( 'Category:' + cat ).getPrefixedText() + ']]';
			} )
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
			value: this.categoriesWidget.getItemsData()
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {string[]} serialized.value List of categories
	 */
	uw.CategoriesDetailsWidget.prototype.setSerialized = function ( serialized ) {
		this.categoriesWidget.setItemsFromData( serialized.value );
	};

} )( mediaWiki, mediaWiki.uploadWizard, jQuery, OO );
