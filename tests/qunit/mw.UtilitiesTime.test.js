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

( function ( mw ) {
	QUnit.module( 'mw.UtilitiesTime', QUnit.newMwEnvironment() );

	QUnit.test( 'Basic maths testing', 3, function ( assert ) {
		assert.deepEqual(
			mw.seconds2Measurements( 1500 ),
			{ days: 0, hours: 0, minutes: 25, seconds: 0 },
			'Basic time conversion test, minutes only'
		);

		assert.deepEqual(
			mw.seconds2Measurements( 1893 ),
			{ days: 0, hours: 0, minutes: 31, seconds: 33 },
			'Basic time conversion test, minutes and seconds'
		);

		assert.deepEqual(
			mw.seconds2Measurements( 159291 ),
			{ days: 1, hours: 20, minutes: 14, seconds: 51 },
			'Basic time conversion test, bigger number, all units'
		);
	} );
}( mediaWiki ) );
