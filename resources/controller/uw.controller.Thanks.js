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

( function ( uw, $, oo ) {
	var TP;

	/**
	 * The thanks step.
	 * @class
	 * @constructor
	 */
	function Thanks() {
		uw.controller.Step.call(
			this,
			new uw.ui.Thanks()
		);
	}

	oo.inheritClass( Thanks, uw.controller.Step );

	TP = Thanks.prototype;

	TP.moveTo = function ( uploads ) {
		var thanks = this;

		$.each( uploads, function ( i, upload ) {
			thanks.ui.addUpload( upload );
		} );

		uw.controller.Step.prototype.moveTo.call( this );
	};

	/**
	 * Empty the step of data.
	 */
	TP.empty = function () {
		uw.controller.Step.prototype.empty.call( this );
	};

	uw.controller.Thanks = Thanks;
}( mediaWiki.uploadWizard, jQuery, OO ) );
