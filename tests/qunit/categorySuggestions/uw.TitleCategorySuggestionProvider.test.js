QUnit.module( 'mw.uploadWizard.TitleCategorySuggestionProvider' );

( function ( uw ) {

	/**
	 * Build a fake context with a stubbed API.
	 *
	 * @param {string} title
	 * @param {Object} response Value the API's get() resolves with
	 * @param {Object} [calls] Object whose `count` is incremented on each get()
	 * @return {Object}
	 */
	function fakeContext( title, response, calls ) {
		return {
			title: title,
			api: {
				get: () => {
					if ( calls ) {
						calls.count++;
					}
					return $.Deferred().resolve( response ).promise();
				}
			}
		};
	}

	QUnit.test( 'resolves to an empty list (and skips the API) for a blank title', ( assert ) => {
		const done = assert.async();
		const calls = { count: 0 };
		const provider = new uw.TitleCategorySuggestionProvider();

		provider.getSuggestions( fakeContext( '   ', {}, calls ) ).then( ( result ) => {
			assert.deepEqual( result, [] );
			assert.strictEqual( calls.count, 0, 'API is not queried for a blank title' );
			done();
		} );
	} );

	QUnit.test( 'maps prefix-search results to scored suggestions', ( assert ) => {
		const done = assert.async();
		const provider = new uw.TitleCategorySuggestionProvider( { limit: 5 } );
		const response = {
			query: {
				pages: [
					{ title: 'Category:Birds', index: 1, categoryinfo: { size: 45 } },
					{ title: 'Category:Bird sounds', index: 2, categoryinfo: { size: 3 } }
				]
			}
		};

		provider.getSuggestions( fakeContext( 'Bird', response ) ).then( ( result ) => {
			// Normalized to 0..1: ( limit - index + 1 ) / limit, i.e. 5/5 and 4/5;
			// count comes from categoryinfo.size
			assert.deepEqual( result, [
				{ title: 'Birds', score: 1, source: 'title', count: 45 },
				{ title: 'Bird sounds', score: 0.8, source: 'title', count: 3 }
			] );
			done();
		} );
	} );

	QUnit.test( 'sets count to null when categoryinfo is absent', ( assert ) => {
		const done = assert.async();
		const provider = new uw.TitleCategorySuggestionProvider( { limit: 5 } );
		const response = {
			query: {
				pages: [
					// e.g. an empty / red-link category with no categoryinfo record
					{ title: 'Category:Birds', index: 1 }
				]
			}
		};

		provider.getSuggestions( fakeContext( 'Bird', response ) ).then( ( result ) => {
			assert.strictEqual( result.length, 1 );
			assert.strictEqual( result[ 0 ].count, null );
			done();
		} );
	} );

	QUnit.test( 'drops results that are not valid category titles', ( assert ) => {
		const done = assert.async();
		const provider = new uw.TitleCategorySuggestionProvider( { limit: 5 } );
		const response = {
			query: {
				pages: [
					{ title: 'Category:Birds', index: 1 },
					// '|' is illegal in titles, so mw.Title.newFromText returns null
					{ title: 'Category:Birds|invalid', index: 2 }
				]
			}
		};

		provider.getSuggestions( fakeContext( 'Bird', response ) ).then( ( result ) => {
			assert.deepEqual( result.map( ( s ) => s.title ), [ 'Birds' ] );
			done();
		} );
	} );

	QUnit.test( 'resolves to an empty list when the API returns no pages', ( assert ) => {
		const done = assert.async();
		const provider = new uw.TitleCategorySuggestionProvider();

		provider.getSuggestions( fakeContext( 'Nothingmatcheshere', {} ) ).then( ( result ) => {
			assert.deepEqual( result, [] );
			done();
		} );
	} );

}( mw.uploadWizard ) );
