( function ( uw ) {

	const NS_CATEGORY = mw.config.get( 'wgNamespaceIds' ).category;

	/**
	 * Collects category suggestions from a set of providers and combines them into
	 * a single, de-duplicated, ranked list.
	 *
	 * Providers are run independently and tolerantly: one that is disabled, throws,
	 * or rejects simply contributes nothing and never blocks the others. This is
	 * what lets the feature degrade gracefully on installs where a given signal
	 * source (GeoData, CirrusSearch, ...) is unavailable.
	 *
	 * @class
	 * @constructor
	 * @param {uw.CategorySuggestionProvider[]} [providers]
	 */
	uw.CategorySuggestionAggregator = function UWCategorySuggestionAggregator( providers ) {
		this.providers = providers || [];
	};

	/**
	 * Normalize a category title to a canonical form for de-duplication and
	 * comparison. Returns null for titles that aren't valid categories.
	 *
	 * @private
	 * @param {string} title
	 * @return {string|null}
	 */
	uw.CategorySuggestionAggregator.prototype.normalizeTitle = function ( title ) {
		const mwTitle = mw.Title.newFromText( title, NS_CATEGORY );
		return mwTitle ? mwTitle.getMainText() : null;
	};

	/**
	 * Gather suggestions from all enabled providers.
	 *
	 * @param {Object} context Passed verbatim to each provider
	 * @param {mw.UploadWizardUpload} context.upload
	 * @param {string} context.title File title text (without namespace/extension)
	 * @param {Object} context.metadata Image metadata (EXIF etc.), may be empty
	 * @param {string[]} context.selected Category titles already selected
	 * @param {mw.Api} context.api
	 * @return {jQuery.Promise} Promise resolving to a ranked array of
	 *   `{ title, score, source }` suggestions
	 */
	uw.CategorySuggestionAggregator.prototype.getSuggestions = function ( context ) {
		const enabled = this.providers.filter( ( provider ) => provider.isEnabled() );

		// Run each provider, turning any rejection or thrown error into an empty
		// result so a single misbehaving provider can't block or break the rest.
		const results = enabled.map( ( provider ) => {
			let promise;
			try {
				promise = provider.getSuggestions( context );
			} catch ( e ) {
				return $.Deferred().resolve( [] ).promise();
			}
			return promise.then(
				( suggestions ) => Array.isArray( suggestions ) ? suggestions : [],
				() => []
			);
		} );

		return $.when.apply( $, results ).then( ( ...providerResults ) => {
			const flat = providerResults.reduce( ( all, list ) => all.concat( list ), [] );
			return this.combine( flat, context.selected || [] );
		} );
	};

	/**
	 * De-duplicate, drop already-selected categories, and rank.
	 *
	 * Suggestions for the same category (after normalization) are merged, keeping
	 * the highest score and its source. The result is sorted by score descending.
	 *
	 * @private
	 * @param {Object[]} suggestions Raw `{ title, score, source }` objects
	 * @param {string[]} selected Category titles already selected
	 * @return {Object[]} Ranked, de-duplicated suggestions
	 */
	uw.CategorySuggestionAggregator.prototype.combine = function ( suggestions, selected ) {
		const selectedKeys = {};
		selected.forEach( ( title ) => {
			const key = this.normalizeTitle( title );
			if ( key !== null ) {
				selectedKeys[ key ] = true;
			}
		} );

		const byTitle = {};
		suggestions.forEach( ( suggestion ) => {
			const key = this.normalizeTitle( suggestion.title );
			if ( key === null || selectedKeys[ key ] ) {
				return;
			}

			const score = Number( suggestion.score ) || 0;
			const count = suggestion.count !== undefined ? suggestion.count : null;
			const existing = byTitle[ key ];
			if ( !existing ) {
				byTitle[ key ] = {
					title: key,
					score: score,
					source: suggestion.source,
					// Number of category members, for display; a property of the
					// category, so the first non-null value wins on merge below.
					count: count,
					// Strongest individual contribution, used only to attribute the
					// merged suggestion; stripped from the returned objects below.
					topScore: score
				};
				return;
			}

			// A category suggested by several providers is more likely to be
			// relevant, so reward agreement: combine the scores with a
			// probabilistic OR ( 1 - (1 - a)(1 - b) ). This raises the merged
			// score above either input while staying within the 0..1 range that
			// providers promise (see uw.CategorySuggestionProvider#getSuggestions).
			existing.score = 1 - ( 1 - existing.score ) * ( 1 - score );
			if ( existing.count === null && count !== null ) {
				existing.count = count;
			}
			if ( score > existing.topScore ) {
				existing.topScore = score;
				existing.source = suggestion.source;
			}
		} );

		return Object.keys( byTitle )
			.map( ( key ) => ( {
				title: byTitle[ key ].title,
				score: byTitle[ key ].score,
				source: byTitle[ key ].source,
				count: byTitle[ key ].count
			} ) )
			.sort( ( a, b ) => b.score - a.score );
	};

}( mw.uploadWizard ) );
