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
	var UWIP;

	/**
	 * Represents the UI for the wizard.
	 * @class mw.UploadWizardInterface
	 * @mixins OO.EventEmitter
	 * @constructor
	 * @param {mw.UploadWizard} wizard
	 */
	function UploadWizardInterface( wizard ) {
		oo.EventEmitter.call( this );

		this.wizard = wizard;

		// remove first spinner
		$( '#mwe-first-spinner' ).remove();

		this.initHeader( mw.UploadWizard.config );

		this.initButtons();

		this.initTutorial();
		this.initUpload();
		this.initDeeds();
	}

	oo.mixinClass( UploadWizardInterface, oo.EventEmitter );

	UWIP = UploadWizardInterface.prototype;

	/**
	 * Initializes the static stuff above the wizard.
	 */
	UWIP.initHeader = function ( config ) {
		// feedback request
		if ( typeof config.feedbackPage === 'string' && config.feedbackPage.length > 0 ) {
			this.initFeedback(
				config.feedbackPage,
				config.bugList
			);
		}

		if ( config.altUploadForm ) {
			this.initAltUploadForm( config.altUploadForm );
		}

		// Separate each link in the header with a dot.
		$( '#contentSub .contentSubLink:not(:last)' ).after( '&nbsp;&middot;&nbsp;' );

		// construct the arrow steps from the UL in the HTML
		this.initArrowSteps();
	};

	/**
	 * Initializes the feedback interface.
	 * @param {string} feedbackPage URL where we send the feedback.
	 * @param {string} bugList URL where a list of known bugs can be found.
	 */
	UWIP.initFeedback = function ( feedbackPage, bugList ) {
		var ui = this;

		this.feedback = new mw.Feedback( {
			title: new mw.Title( feedbackPage ),
			dialogTitleMessageKey: 'mwe-upwiz-feedback-title',
			bugsLink: new mw.Uri( 'https://bugzilla.wikimedia.org/enter_bug.cgi?product=MediaWiki%20extensions&component=UploadWizard' ),
			bugsListLink: new mw.Uri( bugList )
		} );

		this.$feedbackLink = $( '<a>' )
			.addClass( 'contentSubLink' )
			// Make it a link, and show the feedback page URL - we
			// cancel the event propagation anyway, so the user won't
			// see the actual page.
			.prop( 'href', mw.util.getUrl( feedbackPage ) )
			.msg( 'mwe-upwiz-feedback-prompt' )
			.click(
				function () {
					ui.feedback.launch();
					return false;
				}
			);

		$( '#contentSub' ).append( this.$feedbackLink );
	};

	/**
	 * Initializes a link to the alternate upload form, if any.
	 * @param {Object|string} configAltUploadForm A link or map of languages to links, pointing at an alternate form.
	 */
	UWIP.initAltUploadForm = function ( configAltUploadForm ) {
		var altUploadForm, userLanguage, title, $altLink;

		if ( typeof configAltUploadForm === 'object' ) {
			userLanguage = mw.config.get( 'wgUserLanguage' );

			if ( configAltUploadForm[userLanguage] ) {
				altUploadForm = configAltUploadForm[userLanguage];
			} else if ( configAltUploadForm['default'] ) {
				altUploadForm = configAltUploadForm['default'];
			}
		} else {
			altUploadForm = configAltUploadForm;
		}

		// altUploadForm is expected to be a page title like 'Commons:Upload', so convert to URL
		if ( typeof altUploadForm === 'string' && altUploadForm.length > 0 ) {
			try {
				title = new mw.Title( altUploadForm );

				$altLink = $( '<a>' )
					.msg( 'mwe-upwiz-subhead-alt-upload' )
					.addClass( 'contentSubLink' )
					.attr( 'href', title.getUrl() )
					.appendTo( '#contentSub' );
			} catch ( e ) {
				// page was empty, or impossible on this wiki (missing namespace or some other issue). Give up.
			}
		}
	};

	/**
	 * Initializes the arrow steps above the wizard.
	 */
	UWIP.initArrowSteps = function () {
		$( '#mwe-upwiz-steps' )
			.addClass( 'ui-helper-clearfix ui-state-default ui-widget ui-helper-reset ui-helper-clearfix' )
			.arrowSteps()
			.show();
	};

	/**
	 * Initialize all of the buttons in the interface.
	 */
	UWIP.initButtons = function () {
		var ui = this;

		// make all stepdiv proceed buttons into jquery buttons
		$( '.mwe-upwiz-stepdiv .mwe-upwiz-buttons button' )
			.button()
			.css( { 'margin-left': '1em' } );

		$( '.mwe-upwiz-button-begin' )
			.click( function () { ui.emit( 'reset-wizard' ); } );

		$( '.mwe-upwiz-button-home' )
			.click( function () { window.location.href = mw.config.get( 'wgArticlePath' ).replace( '$1', '' ); } );

	};

	/**
	 * Initialize the tutorial page interface.
	 */
	UWIP.initTutorial = function () {
		var ui = this;

		// Event handlers for EventLogging-type things
		// Skip tutorial checkbox click
		$( '#mwe-upwiz-skip' )
			// Add a friendly "Here's how to get it back" tooltip for users who check the "Skip next time" checkbox
			.tipsy( {
				title: function () {
					return mw.message(
						'mwe-upwiz-tooltip-skiptutorial',
						mw.config.get( 'wgServer' ) + mw.util.getUrl( 'Special:Preferences' ) + '#mw-prefsection-uploads',
						mw.message( 'prefs-uploads' ).escaped(),
						mw.message( 'prefs-upwiz-interface' ).escaped()
					).parse();
				},
				delayIn: 0,
				html: true,
				trigger: 'manual'
			} )

			.click( function () {
				var $this = $( this );

				ui.emit( 'skip-tutorial-click', $this.prop( 'checked' ) );

				if ( $this.prop( 'checked' ) ) {
					$this.tipsy( 'show' );
				} else {
					$this.tipsy( 'hide' );
				}
			} );

		// Helpdesk link click
		$( '#mwe-upwiz-tutorial-helpdesk' ).click( function () {
			ui.emit( 'helpdesk-click' );
		} );

		// handler for next button
		$( '#mwe-upwiz-stepdiv-tutorial .mwe-upwiz-button-next').click( function () {
			ui.emit( 'next-from-tutorial' );
		} );
	};

	/**
	 * Initialize the upload step interface.
	 */
	UWIP.initUpload = function () {
		var ui = this;

		$( '#mwe-upwiz-add-file, #mwe-upwiz-upload-ctrl-flickr' ).button();

		// Call Flickr Initiator function on click event
		$( '#mwe-upwiz-upload-ctrl-flickr' ).click( function () {
			ui.emit( 'flickr-ui-init' );
		} );

		$( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons .mwe-upwiz-button-next' ).click( function () {
			ui.emit( 'next-from-upload' );
		} );

		$( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons .mwe-upwiz-button-retry' ).click( function () {
			ui.emit( 'retry-uploads' );
		} );
	};

	/**
	 * Initializes the deed step interface.
	 */
	UWIP.initDeeds = function () {
		var ui = this;

		$( '#mwe-upwiz-stepdiv-deeds .mwe-upwiz-button-next').click( function () {
			$( '.mwe-upwiz-hint' ).each( function () {
				// Close tipsy help balloons
				$( this ).tipsy( 'hide' );
			} );

			ui.emit( 'next-from-deeds' );
		} );
	};

	/**
	 * Hide the button choices at the end of the file step.
	 */
	UWIP.hideFileEndButtons = function () {
		$( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons .mwe-upwiz-file-endchoice' ).hide();
	};

	ui.Wizard = UploadWizardInterface;
}( mediaWiki, jQuery, mediaWiki.uploadWizard.ui, OO ) );
