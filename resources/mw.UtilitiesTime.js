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
	/**
	 * @class mw.UtilitiesTime
	 * @singleton
	 */

	/**
	 * Convert number into an object representing an amount of time.
	 * @param {number} sec Seconds to be converted into time measurements
	 * @return {Object}
	 * @return {number} return.days
	 * @return {number} return.hours
	 * @return {number} return.minutes
	 * @return {number} return.seconds
	 */
	mw.seconds2Measurements = function ( sec ) {
		var tm = {};
		tm.days = Math.floor( sec / ( 3600 * 24 ) );
		tm.hours = Math.floor( ( sec / 3600 ) % 24 );
		tm.minutes = Math.floor( ( sec / 60 ) % 60 );
		tm.seconds = sec % 60;
		return tm;
	};

	/**
	 * @class mw
	 * @mixins mw.UtilitiesTime.seconds2Measurements
	 */
}( mediaWiki ) );
