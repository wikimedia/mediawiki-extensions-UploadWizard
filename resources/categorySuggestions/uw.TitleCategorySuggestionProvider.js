( function ( uw ) {

	const NS_CATEGORY = mw.config.get( 'wgNamespaceIds' ).category;

	/**
	 * Reference category suggestion provider based on the file title.
	 *
	 * This is a deliberately simple provider whose purpose is to exercise the
	 * suggestion pipeline end-to-end: it runs a prefix search for categories
	 * matching the file's title and returns the matches as suggestions.
	 *
	 * It is a placeholder. The dedicated full-text search provider (T428065) is
	 * expected to supersede it with proper relevance-based matching.
	 *
	 * @class
	 * @extends uw.CategorySuggestionProvider
	 * @constructor
	 * @param {Object} [config]
	 * @param {number} [config.limit=5] Maximum number of suggestions to return
	 */
	uw.TitleCategorySuggestionProvider = function UWTitleCategorySuggestionProvider( config ) {
		uw.TitleCategorySuggestionProvider.super.call( this );
		config = config || {};
		this.limit = config.limit || 5;
	};
	OO.inheritClass( uw.TitleCategorySuggestionProvider, uw.CategorySuggestionProvider );

	/**
	 * @inheritdoc
	 */
	uw.TitleCategorySuggestionProvider.prototype.getSuggestions = function ( context ) {
		const title = ( context.title || '' ).trim();
		if ( title === '' ) {
			return $.Deferred().resolve( [] ).promise();
		}

		return context.api.get( {
			formatversion: 2,
			action: 'query',
			generator: 'prefixsearch',
			gpsnamespace: NS_CATEGORY,
			gpslimit: this.limit,
			gpssearch: title,
			prop: 'categoryinfo'
		} ).then( ( res ) => {
			const pages = res && res.query && res.query.pages || [];
			return pages
				.map( ( page ) => {
					const pageTitle = mw.Title.newFromText( page.title, NS_CATEGORY );
					const index = page.index || 0;
					// Normalize the prefix-search rank to the 0..1 range required by
					// uw.CategorySuggestionProvider#getSuggestions: earlier (lower
					// index) hits score higher, the first hit scoring 1.
					const score = Math.max( 0, Math.min( 1, ( this.limit - index + 1 ) / this.limit ) );
					return {
						title: pageTitle ? pageTitle.getMainText() : null,
						score: score,
						source: 'title',
						// Total category members; absent for empty/red-link categories.
						count: page.categoryinfo ? page.categoryinfo.size : null
					};
				} )
				.filter( ( suggestion ) => suggestion.title !== null );
		} );
	};

}( mw.uploadWizard ) );
