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

		this.stepName = 'thanks';
	}

	oo.inheritClass( Thanks, uw.controller.Step );

	TP = Thanks.prototype;

	TP.moveTo = function ( uploads ) {
		var thanks = this;

		uw.controller.Step.prototype.moveTo.call( this );

		$.each( uploads, function ( i, upload ) {
			thanks.ui.addUpload( upload );
		} );

		this.uploads = undefined;
	};

	TP.isComplete = function () {
		return true;
	};

	uw.controller.Thanks = Thanks;
}( mediaWiki.uploadWizard, jQuery, OO ) );
