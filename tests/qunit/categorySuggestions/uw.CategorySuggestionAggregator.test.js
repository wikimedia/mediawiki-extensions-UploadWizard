QUnit.module( 'mw.uploadWizard.CategorySuggestionAggregator' );

( function ( uw ) {

	/**
	 * Build a stub provider.
	 *
	 * @param {Object[]|jQuery.Promise} suggestions Result, or a promise for it
	 * @param {Object} [options]
	 * @param {boolean} [options.enabled=true]
	 * @param {boolean} [options.throws=false] Throw synchronously from getSuggestions
	 * @return {Object}
	 */
	function stubProvider( suggestions, options ) {
		options = options || {};
		return {
			isEnabled: () => options.enabled !== false,
			getSuggestions: () => {
				if ( options.throws ) {
					throw new Error( 'boom' );
				}
				if ( suggestions && typeof suggestions.then === 'function' ) {
					return suggestions;
				}
				return $.Deferred().resolve( suggestions ).promise();
			}
		};
	}

	QUnit.test( 'ranks suggestions by score descending', ( assert ) => {
		const done = assert.async();
		const aggregator = new uw.CategorySuggestionAggregator( [
			stubProvider( [
				{ title: 'Mammals', score: 0.4, source: 'a' },
				{ title: 'Birds', score: 0.9, source: 'a' }
			] )
		] );

		aggregator.getSuggestions( { selected: [] } ).then( ( result ) => {
			assert.deepEqual(
				result.map( ( s ) => s.title ),
				[ 'Birds', 'Mammals' ]
			);
			done();
		} );
	} );

	QUnit.test( 'merges a category found by several providers and boosts its score', ( assert ) => {
		const done = assert.async();
		const aggregator = new uw.CategorySuggestionAggregator( [
			stubProvider( [ { title: 'Birds', score: 0.5, source: 'a' } ] ),
			stubProvider( [ { title: 'Birds', score: 0.75, source: 'b' } ] )
		] );

		aggregator.getSuggestions( { selected: [] } ).then( ( result ) => {
			assert.strictEqual( result.length, 1, 'duplicate is merged into one entry' );
			assert.strictEqual( result[ 0 ].title, 'Birds' );
			// Probabilistic OR: 1 - (1 - 0.5)(1 - 0.75) = 0.875
			assert.strictEqual( result[ 0 ].score, 0.875, 'agreement raises the score above either input' );
			assert.strictEqual( result[ 0 ].source, 'b', 'attributed to the strongest individual contributor' );
			done();
		} );
	} );

	QUnit.test( 'carries the count through, preferring a non-null value on merge', ( assert ) => {
		const done = assert.async();
		const aggregator = new uw.CategorySuggestionAggregator( [
			stubProvider( [ { title: 'Birds', score: 0.5, source: 'a', count: null } ] ),
			stubProvider( [ { title: 'Birds', score: 0.5, source: 'b', count: 45 } ] ),
			stubProvider( [ { title: 'Mammals', score: 0.4, source: 'a', count: 12 } ] )
		] );

		aggregator.getSuggestions( { selected: [] } ).then( ( result ) => {
			const byTitle = {};
			result.forEach( ( s ) => {
				byTitle[ s.title ] = s.count;
			} );
			assert.strictEqual( byTitle.Birds, 45, 'non-null count is kept when merging duplicates' );
			assert.strictEqual( byTitle.Mammals, 12, 'count passes through for a single source' );
			done();
		} );
	} );

	QUnit.test( 'agreement can outrank a single stronger source', ( assert ) => {
		const done = assert.async();
		const aggregator = new uw.CategorySuggestionAggregator( [
			stubProvider( [
				{ title: 'Birds', score: 0.5, source: 'a' },
				{ title: 'Mammals', score: 0.7, source: 'a' }
			] ),
			stubProvider( [ { title: 'Birds', score: 0.5, source: 'b' } ] )
		] );

		aggregator.getSuggestions( { selected: [] } ).then( ( result ) => {
			// Birds: 1 - (1 - 0.5)(1 - 0.5) = 0.75 > Mammals: 0.7
			assert.deepEqual( result.map( ( s ) => s.title ), [ 'Birds', 'Mammals' ] );
			done();
		} );
	} );

	QUnit.test( 'filters out already-selected categories', ( assert ) => {
		const done = assert.async();
		const aggregator = new uw.CategorySuggestionAggregator( [
			stubProvider( [
				{ title: 'Birds', score: 0.5, source: 'a' },
				{ title: 'Mammals', score: 0.2, source: 'a' }
			] )
		] );

		aggregator.getSuggestions( { selected: [ 'Birds' ] } ).then( ( result ) => {
			assert.deepEqual( result.map( ( s ) => s.title ), [ 'Mammals' ] );
			done();
		} );
	} );

	QUnit.test( 'skips disabled providers', ( assert ) => {
		const done = assert.async();
		const aggregator = new uw.CategorySuggestionAggregator( [
			stubProvider( [ { title: 'Birds', score: 0.5, source: 'a' } ], { enabled: false } ),
			stubProvider( [ { title: 'Mammals', score: 0.2, source: 'b' } ] )
		] );

		aggregator.getSuggestions( { selected: [] } ).then( ( result ) => {
			assert.deepEqual( result.map( ( s ) => s.title ), [ 'Mammals' ] );
			done();
		} );
	} );

	QUnit.test( 'tolerates a rejecting provider', ( assert ) => {
		const done = assert.async();
		const aggregator = new uw.CategorySuggestionAggregator( [
			stubProvider( $.Deferred().reject( 'nope' ).promise() ),
			stubProvider( [ { title: 'Mammals', score: 0.2, source: 'b' } ] )
		] );

		aggregator.getSuggestions( { selected: [] } ).then( ( result ) => {
			assert.deepEqual( result.map( ( s ) => s.title ), [ 'Mammals' ] );
			done();
		} );
	} );

	QUnit.test( 'tolerates a provider that throws synchronously', ( assert ) => {
		const done = assert.async();
		const aggregator = new uw.CategorySuggestionAggregator( [
			stubProvider( null, { throws: true } ),
			stubProvider( [ { title: 'Mammals', score: 0.2, source: 'b' } ] )
		] );

		aggregator.getSuggestions( { selected: [] } ).then( ( result ) => {
			assert.deepEqual( result.map( ( s ) => s.title ), [ 'Mammals' ] );
			done();
		} );
	} );

	QUnit.test( 'resolves to an empty list when there are no providers', ( assert ) => {
		const done = assert.async();
		const aggregator = new uw.CategorySuggestionAggregator( [] );

		aggregator.getSuggestions( { selected: [] } ).then( ( result ) => {
			assert.deepEqual( result, [] );
			done();
		} );
	} );

}( mw.uploadWizard ) );
