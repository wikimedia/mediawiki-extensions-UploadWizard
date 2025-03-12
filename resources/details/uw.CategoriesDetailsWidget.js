( function ( uw ) {

	const NS_CATEGORY = mw.config.get( 'wgNamespaceIds' ).category;

	/**
	 * @constructor
	 * @param {Object} [config] Configuration options
	 * @param {mw.Api} [config.api] Instance of mw.Api (or subclass thereof) to use for queries
	 * @param {number} [config.searchLimit=50] Maximum number of category search results to load
	 * @param {number} [config.subLimit=500] Maximum number of sub-categories to load
	 */
	uw.CategoriesDetailsWidget = function MWCategoryMultiselectWidget( config ) {
		// Config initialization
		config = Object.assign( {
			searchLimit: 50,
			subLimit: 500,
			classes: [ 'mwe-upwiz-categoriesDetailsWidget' ]
		}, config );
		this.searchLimit = config.searchLimit;
		this.subLimit = config.subLimit;

		// Parent constructor
		uw.CategoriesDetailsWidget.super.call( this, $.extend( true, {}, config, {
			menu: {
				filterFromInput: false,
				width: '100%'
			},
			// This allows the user to both select non-existent categories, and prevents the selector from
			// being wiped from #onMenuItemsChange when we change the available options in the dropdown
			allowArbitrary: true
		} ) );

		// Mixin constructors
		OO.ui.mixin.PendingElement.call( this, Object.assign( {}, config, { $pending: this.$handle } ) );

		// Initialize
		this.api = config.api || new mw.Api();

		this.cacheSearch = {};
		this.cacheChildren = {};

		// Event handler to call the autocomplete methods
		this.input.$input.on(
			'change input cut paste',
			OO.ui.debounce( () => this.updateMenuItems(
				this.searchCategories( this.input.$input.val().trim() ),
				this.input.$input.val().trim()
			), 100 )
		);

		// Keep only valid titles
		const categories = ( mw.UploadWizard.config.defaults.categories || [] ).filter( ( cat ) => !!mw.Title.makeTitle( NS_CATEGORY, cat ) );
		this.setValue( categories );
	};
	OO.inheritClass( uw.CategoriesDetailsWidget, OO.ui.MenuTagMultiselectWidget );
	OO.mixinClass( uw.CategoriesDetailsWidget, OO.ui.mixin.PendingElement );
	OO.mixinClass( uw.CategoriesDetailsWidget, uw.ValidatableElement );

	uw.CategoriesDetailsWidget.prototype.updateMenuItems = function ( results, input ) {
		const arrowParent = document.documentElement.dir === 'ltr' ? '←' : '→';
		const arrowChildren = document.documentElement.dir === 'ltr' ? '→' : '←';

		this.getMenu().clearItems();

		this.pushPending();

		results
			.then( ( items ) => {
				const menu = this.getMenu();

				// Never show the menu if the input lost focus in the meantime
				if ( !this.input.$input.is( ':focus' ) ) {
					return;
				}

				menu
					// menu should already have been cleared, but since this is an async callback,
					// let's clear it once more to ensure no race conditions
					.clearItems()
					.addItems(
						items
							.filter( ( data ) => {
								// sanity check
								const title = mw.Title.newFromText( data.title, NS_CATEGORY );
								return title !== null;
							} )
							.map( ( data ) => {
								// clone data to avoid modifying the original object, as that will
								// be passed forward to the subcategory handler
								const menuData = Object.assign( {}, data );
								const title = mw.Title.newFromText( menuData.title, NS_CATEGORY );

								// ensure title is properly escaped; we'll be inserting it unescaped
								// (some will get additional HTML) later on
								let text = title.getMainText();
								text = $( '<span>' ).text( text ).html();

								if ( menuData.parent ) {
									// indicate that this navigates to the parent category
									menuData.handler = () => this.updateMenuItems(
										menuData.parent.results,
										menuData.parent.input
									);
									text = arrowParent;
								} else if ( menuData.current ) {
									// indicate that this is the current category (and clicking it
									// will not navigate to its subcategories, but select it instead)
									text = $( '<span>' ).addClass( 'mwe-upwiz-categories-category-title' ).text( text )[ 0 ].outerHTML;
									text = mw.message( 'mwe-upwiz-categories-current', text ).text();
								} else if ( menuData.categoryinfo.subcats > 0 ) {
									// indicate that the category has subcategories
									menuData.handler = () => this.updateMenuItems(
										this.getSubCategories( title.getMainText() ).then( ( subcategories ) => {
											const navigation = [
												// upwards navigation, back to parent
												Object.assign( {}, data, { parent: { results: results, input: input } } ),
												// current category selector (i.e. allow selection despite it having subcats)
												Object.assign( {}, data, { current: true } )
											];
											return navigation.concat( subcategories );
										} ),
										title.getMainText()
									);
									text = $( '<span>' ).addClass( 'mwe-upwiz-categories-category-title' ).text( text )[ 0 ].outerHTML + ' ' + arrowChildren;
								}

								return new OO.ui.MenuOptionWidget( {
									data: menuData,
									label: new OO.ui.HtmlSnippet( text ),
									selected: !menuData.parent && this.getItems().some( ( item ) => item.data === title.getMainText() )
								} );
							} )
					)
					.toggle( true );
			} )
			.always( this.popPending.bind( this ) );
	};

	uw.CategoriesDetailsWidget.prototype.clearInput = function () {
		uw.CategoriesDetailsWidget.super.prototype.clearInput.call( this );
		// Abort all pending requests, we won't need their results
		this.api.abort();
	};

	uw.CategoriesDetailsWidget.prototype.onMenuChoose = function ( menuItem, selected ) {
		// some menu items are not meant for selection, but for navigation; those should not
		// result in tags being added!
		const data = menuItem.getData();
		if ( data.handler ) {
			data.handler();
			return;
		}

		uw.CategoriesDetailsWidget.super.prototype.onMenuChoose.call( this, menuItem, selected );
	};

	uw.CategoriesDetailsWidget.prototype.titleFromData = function ( data ) {
		return mw.Title.newFromText(
			// manual input is string (just category name; selection from menu is object)
			typeof data === 'string' ? data : data.title,
			NS_CATEGORY
		);
	};

	uw.CategoriesDetailsWidget.prototype.isAllowedData = function ( data ) {
		const title = this.titleFromData( data );
		if ( !title ) {
			return false;
		}

		return uw.CategoriesDetailsWidget.super.prototype.isAllowedData.call( this, data );
	};

	uw.CategoriesDetailsWidget.prototype.findItemFromData = function ( data ) {
		const title = this.titleFromData( data );
		if ( !title ) {
			return null;
		}
		return OO.ui.mixin.GroupElement.prototype.findItemFromData.call( this, title.getMainText() );
	};

	uw.CategoriesDetailsWidget.prototype.createTagItemWidget = function ( data ) {
		const title = this.titleFromData( data );

		const widget = new mw.widgets.CategoryTagItemWidget( {
			apiUrl: this.api.apiUrl || undefined,
			title: title
		} );
		widget.setMissing = ( missing ) => {
			widget.constructor.prototype.setMissing.call( widget, missing );
			// Aggregate 'change' event
			this.emit( 'change' );
		};

		return widget;
	};

	uw.CategoriesDetailsWidget.prototype.searchCategories = function ( input ) {
		const cacheKey = input;

		// Abort all pending requests, we won't need their results
		this.api.abort();

		if ( input.trim() === '' ) {
			return $.Deferred().resolve( [] ).promise();
		}

		// Check cache
		if ( Object.prototype.hasOwnProperty.call( this.cacheSearch, cacheKey ) ) {
			return this.cacheSearch[ cacheKey ];
		}

		this.cacheSearch[ cacheKey ] = this.api.get( {
			formatversion: 2,
			action: 'query',
			generator: 'prefixsearch',
			gpsnamespace: NS_CATEGORY,
			gpslimit: this.searchLimit,
			gpssearch: input,
			prop: 'categoryinfo'
		} )
			.then( ( res ) => Object.keys( res && res.query && res.query.pages || [] )
				.map( ( key ) => res.query.pages[ key ] )
				.sort( ( a, b ) => a.index > b.index )
			)
			.fail( () => delete this.cacheSearch[ cacheKey ] );

		return this.cacheSearch[ cacheKey ];
	};

	uw.CategoriesDetailsWidget.prototype.getSubCategories = function ( input ) {
		const cacheKey = input;

		// Abort all pending requests, we won't need their results
		this.api.abort();

		// Check cache
		if ( Object.prototype.hasOwnProperty.call( this.cacheChildren, cacheKey ) ) {
			return this.cacheChildren[ cacheKey ];
		}

		this.cacheChildren[ cacheKey ] = this.api.get( {
			formatversion: 2,
			action: 'query',
			generator: 'categorymembers',
			gcmnamespace: NS_CATEGORY,
			gcmlimit: this.subLimit,
			gcmtitle: mw.Title.newFromText( input, NS_CATEGORY ).getPrefixedDb(),
			prop: 'categoryinfo'
		} )
			.then( ( res ) => Object.keys( res && res.query && res.query.pages || [] ).map( ( key ) => res.query.pages[ key ] ) )
			.fail( () => delete this.cacheChildren[ cacheKey ] );

		return this.cacheChildren[ cacheKey ];
	};

	uw.CategoriesDetailsWidget.prototype.validate = function () {
		const status = new uw.ValidationStatus(),
			missing = this.getItems().filter( ( item ) => item.missing );

		if ( missing.length > 0 ) {
			status.addWarning( mw.message( 'mwe-upwiz-categories-missing', missing.length ) );
		}

		return status.resolve();
	};

	uw.CategoriesDetailsWidget.prototype.getWikiText = function () {
		let hiddenCats = [];
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

		let missingCatsWikiText = null;
		if (
			typeof mw.UploadWizard.config.missingCategoriesWikiText === 'string' &&
			mw.UploadWizard.config.missingCategoriesWikiText.length > 0
		) {
			missingCatsWikiText = mw.UploadWizard.config.missingCategoriesWikiText;
		}

		const categories = this.getItems().map( ( item ) => item.data );

		// add all categories
		let wikiText = categories.concat( hiddenCats )
			.map( ( cat ) => '[[' + mw.Title.makeTitle( NS_CATEGORY, cat ).getPrefixedText() + ']]' )
			.join( '\n' );

		// if so configured, and there are no user-visible categories, add warning
		if ( missingCatsWikiText !== null && categories.length === 0 ) {
			wikiText += '\n\n' + missingCatsWikiText;
		}

		return wikiText;
	};

	uw.CategoriesDetailsWidget.prototype.getSerialized = function () {
		return {
			value: this.getItems().map( ( item ) => item.data )
		};
	};

	uw.CategoriesDetailsWidget.prototype.setSerialized = function ( serialized ) {
		this.setValue( serialized.value );
	};

}( mw.uploadWizard ) );
