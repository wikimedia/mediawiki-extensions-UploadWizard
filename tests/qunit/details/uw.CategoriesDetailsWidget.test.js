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
				category: 14
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

}( mw.uploadWizard ) );
