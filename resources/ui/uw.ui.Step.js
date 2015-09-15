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

( function ( mw, $, uw, OO ) {
	/**
	 * Represents a generic UI for a step.
	 * @class mw.uw.ui.Step
	 * @mixins OO.EventEmitter
	 * @constructor
	 * @param {jQuery} $div The div that contains the step.
	 * @param {jQuery} $arrow The arrow that represents the step.
	 */
	uw.ui.Step = function UWUIStep( $div, $arrow ) {
		OO.EventEmitter.call( this );

		this.$div = $div;
		this.$arrow = $arrow;
	};

	OO.mixinClass( uw.ui.Step, OO.EventEmitter );

	/**
	 * Move to the step.
	 * @param {mw.UploadWizardUpload[]} uploads
	 */
	uw.ui.Step.prototype.moveTo = function ( uploads ) {
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
	uw.ui.Step.prototype.moveFrom = function () {
		this.$div.hide();
	};

	/**
	 * Empty data from the step.
	 */
	uw.ui.Step.prototype.empty = function () {};

	/**
	 * Add a 'next' button to the step's button container
	 */
	uw.ui.Step.prototype.addNextButton = function () {
		var ui = this;

		this.$buttons = this.$div.find( '.mwe-upwiz-buttons' );

		this.nextButton = new OO.ui.ButtonWidget( {
			classes: [ 'mwe-upwiz-button-next' ],
			label: mw.message( 'mwe-upwiz-next' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', function () {
			$( '.mwe-upwiz-hint' ).each( function () {
				// Close tipsy help balloons
				$( this ).tipsy( 'hide' );
			} );

			ui.emit( 'next-step' );
		} );

		this.$buttons.append( this.nextButton.$element );
	};

}( mediaWiki, jQuery, mediaWiki.uploadWizard, OO ) );
