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
	/**
	 * Represents a generic UI for a step.
	 *
	 * @class
	 * @mixes OO.EventEmitter
	 * @param {string} name The name of this step
	 */
	uw.ui.Step = function UWUIStep( name ) {
		OO.EventEmitter.call( this );

		this.name = name;

		this.$buttons = $( '<div>' ).addClass( 'mwe-upwiz-buttons' );

		this.$div = $( '<div>' )
			.attr( 'id', 'mwe-upwiz-stepdiv-' + this.name )
			.addClass( 'mwe-upwiz-stepdiv' )
			.hide();

		// eslint-disable-next-line no-jquery/no-global-selector
		$( '#mwe-upwiz-content' ).append( this.$div );

		// this will make sure that buttons will only be added if they've been
		// set in the controller, otherwise there's nowhere to go...
		this.nextButtonPromise = $.Deferred();
		this.previousButtonPromise = $.Deferred();

		this.$errorCount = $( '<div>' )
			.attr( 'id', 'mwe-upwiz-details-error-count' );
		this.$buttons.append( this.$errorCount );
	};

	OO.mixinClass( uw.ui.Step, OO.EventEmitter );

	/**
	 * Initialize this step.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads
	 */
	uw.ui.Step.prototype.load = function ( uploads ) {
		// eslint-disable-next-line no-jquery/no-global-selector
		const offset = $( 'h1' ).first().offset();

		this.movedFrom = false;

		this.uploads = uploads;
		this.$div.append( this.$buttons ).show();

		// eslint-disable-next-line no-jquery/no-global-selector
		$( 'html, body' ).animate( {
			scrollTop: offset.top,
			scrollLeft: offset.left
		}, 'slow' );
	};

	/**
	 * Cleanup this step.
	 */
	uw.ui.Step.prototype.unload = function () {
		this.movedFrom = true;

		this.$div.children().detach();
	};

	uw.ui.Step.prototype.enableNextButton = function () {
		this.nextButtonPromise.resolve();
	};

	uw.ui.Step.prototype.enablePreviousButton = function () {
		this.previousButtonPromise.resolve();
	};

	/**
	 * Add a 'next' button to the step's button container
	 */
	uw.ui.Step.prototype.addNextButton = function () {
		this.nextButton = new OO.ui.ButtonWidget( {
			classes: [ 'mwe-upwiz-button-next' ],
			label: mw.message( 'mwe-upwiz-next' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', () => {
			this.emit( 'next-step' );
		} );

		this.nextButtonPromise.done( () => {
			this.$buttons.append( this.nextButton.$element );
		} );
	};

	/**
	 * Add a 'previous' button to the step's button container
	 */
	uw.ui.Step.prototype.addPreviousButton = function () {
		this.previousButton = new OO.ui.ButtonWidget( {
			classes: [ 'mwe-upwiz-button-previous' ],
			label: mw.message( 'mwe-upwiz-previous' ).text()
		} ).on( 'click', () => {
			this.emit( 'previous-step' );
		} );

		this.previousButtonPromise.done( () => {
			this.$buttons.append( this.previousButton.$element );
		} );
	};

	/**
	 * Show errors/warnings/notices in the form.
	 * Some pages can be vertically long, so sometimes it is not obvious there are errors above.
	 * This counts them and puts the count right next to the submit button,
	 * so it should be obvious to the user they need to fix things.
	 * This is a bit of a hack. We should already know how many errors there are, and where.
	 * This method also opens up collapsed elements if the form has errors.
	 *
	 * @param {uw.ValidationStatus} status
	 */
	// eslint-disable-next-line no-unused-vars
	uw.ui.Step.prototype.showStatus = function ( status ) {
		const show = ( kind ) => {
			// eslint-disable-next-line no-jquery/no-sizzle
			const $elements = this.$div.find( '.mwe-upwiz-fieldLayout-' + kind ).filter( ':visible' ),
				count = $elements.length;

			if ( count === 0 ) {
				return 0;
			}

			// Open collapsed elements that contain errors
			$elements.each( function () {
				const $collapsibleWrapper = $( this ).closest( '.mw-collapsible' );
				if ( $collapsibleWrapper.length ) {
					$collapsibleWrapper.data( 'mw-collapsible' ).expand();
				}
			} );

			this.$errorCount.append(
				new OO.ui.MessageWidget( {
					type: kind,
					inline: true,
					label: mw.message( 'mwe-upwiz-details-' + kind + '-count', count, this.uploads.length ).text()
				} ).$element
			);

			// Immediately stop existing animations, then scroll to first error
			// eslint-disable-next-line no-jquery/no-global-selector
			$( 'html, body' ).stop().animate( { scrollTop: $( $elements[ 0 ] ).offset().top - 50 }, 'slow' );

			return count;
		};

		// Default to showing errors; warnings are shown only if there are no errors
		this.$errorCount.empty();

		// show errors first; warnings only when there are no errors
		// don't bother with notices; no need to inform user about those merely showing them near the input
		// eslint-disable-next-line no-unused-expressions
		show( 'error' ) || show( 'warning' );
	};

}( mw.uploadWizard ) );
