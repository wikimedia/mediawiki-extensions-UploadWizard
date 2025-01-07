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

		this.nextButton = new OO.ui.ButtonWidget( {
			classes: [ 'mwe-upwiz-button-next' ],
			label: mw.message( 'mwe-upwiz-next' ).text(),
			flags: [ 'progressive', 'primary' ]
		} ).on( 'click', () => {
			this.emit( 'next-step' );
		} );
		this.previousButton = new OO.ui.ButtonWidget( {
			classes: [ 'mwe-upwiz-button-previous' ],
			label: mw.message( 'mwe-upwiz-previous' ).text()
		} ).on( 'click', () => {
			this.emit( 'previous-step' );
		} );

		// this will make sure that buttons will only be added if they've been
		// set in the controller, otherwise there's nowhere to go...
		this.nextButtonPromise = $.Deferred();
		this.previousButtonPromise = $.Deferred();

		this.$errorCount = $( '<div>' ).attr( 'id', 'mwe-upwiz-details-error-count' );
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

		// clear any errors that may have been visible
		this.updateErrorSummary();

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
		this.nextButtonPromise.done( () => {
			this.$buttons.append( this.nextButton.$element );
		} );
	};

	/**
	 * Add a 'previous' button to the step's button container
	 */
	uw.ui.Step.prototype.addPreviousButton = function () {
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
	 */
	// eslint-disable-next-line no-unused-vars
	uw.ui.Step.prototype.updateErrorSummary = function () {
		// eslint-disable-next-line no-jquery/no-sizzle
		const getElements = ( kind ) => this.$div.find( '.mwe-upwiz-fieldLayout-' + kind ).filter( ':visible' );
		const uploadCount = ( this.uploads || [] ).length;

		const scrollTo = ( $element ) => {
			// Immediately stop existing animations, then scroll to error
			// eslint-disable-next-line no-jquery/no-global-selector
			$( 'html, body' ).stop().animate( { scrollTop: $( $element ).offset().top - 50 }, 'slow' );
		};

		const updateSummary = ( kind, message ) => {
			const $elements = getElements( kind );
			const errorCount = $elements.length;

			// reset to pristine state: no error, no scroll button, visible next button
			this.$errorCount.empty();
			this.$div.find( '.mwe-upwiz-details-error-scroll' ).remove();
			this.nextButton.$element.show();

			if ( errorCount === 0 ) {
				return;
			}

			const warningWidget = new OO.ui.MessageWidget( {
				type: kind,
				inline: true,
				label: message.params( [ errorCount, uploadCount ] ).text()
			} );
			this.$errorCount.append( warningWidget.$element );

			const scrollWidget = new OO.ui.ButtonWidget( {
				classes: [ 'mwe-upwiz-details-error-scroll' ],
				label: mw.message( 'mwe-upwiz-details-' + kind + '-scroll', errorCount, uploadCount ).text(),
				flags: [ 'progressive' ]
			} );
			scrollWidget.on( 'click', () => scrollTo( $elements[ 0 ] ) );
			this.nextButton.$element.hide().before( scrollWidget.$element );
		};

		const observe = ( element, kind ) => {
			const observer = new MutationObserver( () => {
				observer.disconnect();
				updateSummary( kind, mw.message( 'mwe-upwiz-details-' + kind + '-generic' ) );
			} );
			observer.observe(
				element.parentNode,
				{ childList: true }
			);
		};

		const show = ( kind ) => {
			const $elements = getElements( kind );

			updateSummary( kind, mw.message( 'mwe-upwiz-details-' + kind + '-count' ) );

			if ( $elements.length > 0 ) {
				$elements.each( function () {
					observe( this, kind );

					// Open collapsed elements that contain errors
					const $collapsibleWrapper = $( this ).closest( '.mw-collapsible' );
					if ( $collapsibleWrapper.length ) {
						$collapsibleWrapper.data( 'mw-collapsible' ).expand();
					}
				} );

				scrollTo( $elements[ 0 ] );
			}

			return $elements.length;
		};

		// show errors first; warnings only when there are no errors
		// don't bother with notices; no need to inform user about those merely showing them near the input
		// eslint-disable-next-line no-unused-expressions
		show( 'error' ) || show( 'warning' );
	};

}( mw.uploadWizard ) );
