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

( function ( mw, $, ui, oo ) {
	var SP;

	/**
	 * Represents a generic UI for a step.
	 * @class mw.uw.ui.Step
	 * @mixins OO.EventEmitter
	 * @constructor
	 * @param {jQuery} $div The div that contains the step.
	 * @param {jQuery} $arrow The arrow that represents the step.
	 */
	function Step( $div, $arrow ) {
		oo.EventEmitter.call( this );

		this.$div = $div;
		this.$arrow = $arrow;
	}

	oo.mixinClass( Step, oo.EventEmitter );

	SP = Step.prototype;

	/**
	 * Move to the step.
	 * @param {mw.UploadWizardUpload[]} uploads
	 */
	SP.moveTo = function ( uploads ) {
		var offset = $( 'h1:first' ).offset();

		this.uploads = uploads;
		// Remove the initial spinner if it's still present
		$( '#mwe-first-spinner' ).remove();
		this.$div.show();
		$( '#mwe-upwiz-steps' ).arrowStepsHighlight( this.$arrow );

		$( 'html, body' ).animate( {
			scrollTop: offset.top,
			scrollLeft: offset.left
		}, 'slow' );
	};

	/**
	 * Move out of the step.
	 */
	SP.moveFrom = function () {
		this.$div.hide();
	};

	/**
	 * Empty data from the step.
	 */
	SP.empty = function () {};

	ui.Step = Step;
}( mediaWiki, jQuery, mediaWiki.uploadWizard.ui, OO ) );
