/*
 * This file is part of the MediaWiki extension UploadWizard.
 *
 * UploadWizard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * UploadWizard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with UploadWizard.  If not, see <http://www.gnu.org/licenses/>.
 */

( function ( uw ) {
	'use strict';

	QUnit.module( 'mw.uploadWizard.CategoriesDetailsWidget', QUnit.newMwEnvironment( {
		config: {
			wgFormattedNamespaces: {
				14: 'Category'
			},
			wgNamespaceIds: {
				category: 14,
				kategorie: 14,
				// eslint-disable-next-line camelcase
				catégorie_test: 14
			}
		},
		messages: {
			'mwe-upwiz-categories-current': '$1 parent category'
		}
	} ) );

	function createMockWidget( menuItems ) {
		return {
			searchLimit: 50,
			subLimit: 500,
			api: {},
			getItems: function () {
				return [];
			},
			pushPending: function () {},
			popPending: function () {},
			input: {
				$input: {
					is: function ( selector ) {
						return selector === ':focus';
					}
				}
			},
			getMenu: function () {
				return {
					clearItems: function () {
						menuItems.length = 0;
						return this;
					},
					addItems: function ( items ) {
						menuItems.push.apply( menuItems, items );
						return this;
					},
					toggle: function () {
						return this;
					}
				};
			}
		};
	}

	QUnit.test( 'updateMenuItems escaping behavior without subcategories', ( assert ) => {
		const done = assert.async();
		const menuItems = [];
		const widget = createMockWidget( menuItems );
		const results = $.Deferred().resolve( [
			{ title: 'Category:Vroom & Dreesmann', categoryinfo: { subcats: 0 } }
		] ).promise();

		uw.CategoriesDetailsWidget.prototype.updateMenuItems.call( widget, results, '' );

		results.then( () => {
			assert.strictEqual( menuItems.length, 1, 'One menu item added for category without subcategories' );
			assert.strictEqual(
				menuItems[ 0 ].getLabel().toString(),
				'Vroom &amp; Dreesmann',
				'Label for category without subcategories is escaped exactly once'
			);
			done();
		} );
	} );

	QUnit.test( 'updateMenuItems escaping behavior with subcategories', ( assert ) => {
		const done = assert.async();
		const menuItems = [];
		const widget = createMockWidget( menuItems );
		const results = $.Deferred().resolve( [
			{ title: 'Category:Vroom & Dreesmann', categoryinfo: { subcats: 5 } }
		] ).promise();

		uw.CategoriesDetailsWidget.prototype.updateMenuItems.call( widget, results, '' );

		results.then( () => {
			assert.strictEqual( menuItems.length, 1, 'One menu item added for category with subcategories' );
			const labelHtml = menuItems[ 0 ].getLabel().toString();
			assert.true(
				labelHtml.includes( 'Vroom &amp; Dreesmann' ),
				'Label contains single-escaped category name: ' + labelHtml
			);
			assert.false(
				labelHtml.includes( 'Vroom &amp;amp; Dreesmann' ),
				'Label does NOT contain double-escaped category name'
			);
			done();
		} );
	} );

	QUnit.test( 'updateMenuItems escaping behavior for current category', ( assert ) => {
		const done = assert.async();
		const menuItems = [];
		const widget = createMockWidget( menuItems );
		const results = $.Deferred().resolve( [
			{ title: 'Category:Vroom & Dreesmann', categoryinfo: { subcats: 5 }, current: true }
		] ).promise();

		uw.CategoriesDetailsWidget.prototype.updateMenuItems.call( widget, results, '' );

		results.then( () => {
			assert.strictEqual( menuItems.length, 1, 'One menu item added for current category' );
			const currentLabelHtml = menuItems[ 0 ].getLabel().toString();
			assert.true(
				currentLabelHtml.includes( 'Vroom &amp; Dreesmann' ),
				'Current label contains single-escaped category name: ' + currentLabelHtml
			);
			assert.false(
				currentLabelHtml.includes( 'Vroom &amp;amp; Dreesmann' ),
				'Current label does NOT contain double-escaped category name'
			);
			done();
		} );
	} );

	QUnit.test( 'updateMenuItems with categories without members', ( assert ) => {
		// T429154: categories without members have no categoryinfo
		const done = assert.async();
		const menuItems = [];
		const widget = createMockWidget( menuItems );
		const results = $.Deferred().resolve( [
			{ title: 'Category:Charité', categoryinfo: { subcats: 5 } },
			{ title: 'Category:Charites' }
		] ).promise();

		uw.CategoriesDetailsWidget.prototype.updateMenuItems.call( widget, results, 'Charite' );

		results.then( () => {
			assert.deepEqual(
				menuItems.map( ( item ) => item.getData().title ),
				[ 'Category:Charité', 'Category:Charites' ],
				'All categories are listed'
			);
			done();
		} );
	} );

	QUnit.test( 'searchCategories keeps the order of the search results', async ( assert ) => {
		const widget = createMockWidget( [] );
		widget.cacheSearch = {};
		widget.api = {
			abort: function () {},
			get: () => $.Deferred().resolve( { query: { pages: [
				{ title: 'Category:C', index: 3 },
				{ title: 'Category:A', index: 1 },
				{ title: 'Category:B', index: 2 }
			] } } ).promise()
		};

		const results = await uw.CategoriesDetailsWidget.prototype.searchCategories.call( widget, 'X' );

		assert.deepEqual(
			results.map( ( page ) => page.title ),
			[ 'Category:A', 'Category:B', 'Category:C' ]
		);
	} );

	QUnit.test.each( 'getWikiText with missingCategoriesWikiText', {
		'no categories': [ [], undefined, '\n\n{{Uncategorized}}' ],
		categories: [ [ 'Foo' ], undefined, '[[Category:Foo]]' ],
		'categories in other wikitext': [ [], 'Bar\n[[Category:Foo|sort key]]', '' ],
		'lowercase category in other wikitext': [ [], '[[ category :Foo]]', '' ],
		'category alias in other wikitext': [ [], '[[KATEGORIE:Foo]]', '' ],
		'category alias with space in other wikitext': [ [], '[[Catégorie test:Foo]]', '' ],
		'category talk link in other wikitext': [ [], '[[Category talk:Foo]]', '\n\n{{Uncategorized}}' ],
		'category link in other wikitext': [ [], '[[:Category:Foo]]', '\n\n{{Uncategorized}}' ],
		'only links in other wikitext': [ [], '[[Foo]] [[File:Foo.jpg]]', '\n\n{{Uncategorized}}' ]
	}, ( assert, [ categories, otherWikiText, expected ] ) => {
		const oldConfig = mw.UploadWizard.config;
		mw.UploadWizard.config = { autoAdd: {}, missingCategoriesWikiText: '{{Uncategorized}}' };
		const widget = {
			getItems: () => categories.map( ( category ) => ( { data: category } ) )
		};

		assert.strictEqual(
			uw.CategoriesDetailsWidget.prototype.getWikiText.call( widget, otherWikiText ),
			expected
		);
		mw.UploadWizard.config = oldConfig;
	} );

}( mw.uploadWizard ) );
