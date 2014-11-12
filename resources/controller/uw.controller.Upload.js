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
	var UP;

	function Upload() {
		uw.controller.Step.call(
			this,
			new uw.ui.Upload()
		);
	}

	oo.inheritClass( Upload, uw.controller.Step );

	UP = Upload.prototype;

	/**
	 * Updates the upload step data when a file is added or removed.
	 */
	UP.updateFileCounts = function ( haveUploads, max, uploads ) {
		var fewerThanMax;

		if ( uploads ) {
			this.uploads = uploads;
		}

		fewerThanMax = this.uploads.length < max;

		this.ui.updateFileCounts( haveUploads, fewerThanMax );
	};

	UP.empty = function () {
		this.ui.empty();
	};

	uw.controller.Upload = Upload;
}( mediaWiki.uploadWizard, jQuery, OO ) );
