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
	var SP;

	/**
	 * Represents a step in the wizard.
	 * @class mw.uw.controller.Step
	 * @abstract
	 * @constructor
	 * @param {mw.uw.ui.Step} ui The UI object that controls this step.
	 */
	function Step( ui ) {
		this.ui = ui;
	}

	SP = Step.prototype;

	/**
	 * Empty the step of all data.
	 */
	SP.empty = function () {
		this.ui.empty();
	};

	/**
	 * Move to this step.
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	SP.moveTo = function () {
		this.ui.moveTo();
	};

	/**
	 * Move out of this step.
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	SP.moveFrom = function () {
		this.ui.moveFrom();
	};

	uw.controller.Step = Step;
}( mediaWiki.uploadWizard ) );
