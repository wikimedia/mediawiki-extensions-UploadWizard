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
	QUnit.module( 'uw.CopyMetadataWidget', QUnit.newMwEnvironment() );

	QUnit.test( 'copy title "Wikipedia"', ( assert ) => {
		const titles = copyMetadataTitle( 'Wikipedia' );
		assert.deepEqual( titles, [ 'Wikipedia 01', 'Wikipedia 02', 'Wikipedia 03' ] );
	} );

	QUnit.test( 'copy title "Wikipedia 0"', ( assert ) => {
		const titles = copyMetadataTitle( 'Wikipedia 0' );
		assert.deepEqual( titles, [ 'Wikipedia 0', 'Wikipedia 1', 'Wikipedia 2' ] );
	} );

	QUnit.test( 'copy title "Wikipedia 4"', ( assert ) => {
		const titles = copyMetadataTitle( 'Wikipedia 4' );
		assert.deepEqual( titles, [ 'Wikipedia 4', 'Wikipedia 5', 'Wikipedia 6' ] );
	} );

	QUnit.test( 'copy title "Wikipedia 05"', ( assert ) => {
		const titles = copyMetadataTitle( 'Wikipedia 05' );
		assert.deepEqual( titles, [ 'Wikipedia 05', 'Wikipedia 06', 'Wikipedia 07' ] );
	} );

	QUnit.test( 'copy title "2024, Windows (01)"', ( assert ) => {
		const titles = copyMetadataTitle( '2024, Windows (01)' );
		assert.deepEqual( titles, [ '2024, Windows (01)', '2024, Windows (02)', '2024, Windows (03)' ] );
	} );

	QUnit.test( 'copy title "John Smith (2019)"', ( assert ) => {
		const titles = copyMetadataTitle( 'John Smith (2019)' );
		assert.deepEqual( titles, [ 'John Smith (2019) 01', 'John Smith (2019) 02', 'John Smith (2019) 03' ] );
	} );

	QUnit.test( 'copy title "COVID-19 pandemic"', ( assert ) => {
		const titles = copyMetadataTitle( 'COVID-19 pandemic' );
		assert.deepEqual( titles, [ 'COVID-19 pandemic 01', 'COVID-19 pandemic 02', 'COVID-19 pandemic 03' ] );
	} );

	QUnit.test( 'copy title "Wikimania 2011 Celebration"', ( assert ) => {
		const titles = copyMetadataTitle( 'Wikimania 2011 Celebration' );
		assert.deepEqual( titles, [ 'Wikimania 2011 Celebration 01', 'Wikimania 2011 Celebration 02', 'Wikimania 2011 Celebration 03' ] );
	} );

	QUnit.test( 'copy title "whitespace "', ( assert ) => {
		const titles = copyMetadataTitle( 'whitespace ' );
		assert.deepEqual( titles, [ 'whitespace 01', 'whitespace 02', 'whitespace 03' ] );
	} );

	QUnit.test( 'copy title "whitespace 04 "', ( assert ) => {
		const titles = copyMetadataTitle( 'whitespace 04 ' );
		assert.deepEqual( titles, [ 'whitespace 04', 'whitespace 05', 'whitespace 06' ] );
	} );

	function copyMetadataTitle( title ) {
		const titles = [];
		uw.CopyMetadataWidget.copyMetadataSerialized(
			[ 'title', 'caption', 'description', 'categories', 'other' ],
			{
				title: { title },
				caption: {
					inputs: [ { language: 'en', text: 'foo12345', removable: false } ]
				},
				description: {
					inputs: [ { language: 'en', text: 'bar67890', removable: false } ]
				},
				date: { mode: 'calendar', value: '' },
				categories: { value: [ 'cat1', 'cat2' ] },
				statements: {},
				location: { latitude: '', longitude: '', heading: '' },
				other: { other: '' },
				campaigns: []
			},
			3,
			( i, sourceValue ) => titles.push( sourceValue.title.title ) );
		return titles;
	}
}( mw.uploadWizard ) );
