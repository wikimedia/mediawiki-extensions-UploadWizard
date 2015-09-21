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
	 * Represents the UI for the wizard.
	 * @class mw.uw.ui.Wizard
	 * @mixins OO.EventEmitter
	 * @constructor
	 * @param {mw.UploadWizard} wizard
	 */
	uw.ui.Wizard = function UWUIWizard( wizard ) {
		OO.EventEmitter.call( this );

		this.wizard = wizard;

		this.initHeader( mw.UploadWizard.config );
	};

	OO.mixinClass( uw.ui.Wizard, OO.EventEmitter );

	/**
	 * Initializes the static stuff above the wizard.
	 */
	uw.ui.Wizard.prototype.initHeader = function ( config ) {
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
	uw.ui.Wizard.prototype.initFeedback = function ( feedbackPage, bugList ) {
		var ui = this;

		this.feedback = new mw.Feedback( {
			title: new mw.Title( feedbackPage ),
			dialogTitleMessageKey: 'mwe-upwiz-feedback-title',
			bugsLink: new mw.Uri( 'https://phabricator.wikimedia.org/maniphest/task/create/?projects=MediaWiki-extensions-UploadWizard' ),
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
	uw.ui.Wizard.prototype.initAltUploadForm = function ( configAltUploadForm ) {
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
	uw.ui.Wizard.prototype.initArrowSteps = function () {
		$( '#mwe-upwiz-steps' )
			.addClass( 'ui-helper-clearfix ui-state-default ui-widget ui-helper-reset ui-helper-clearfix' )
			.arrowSteps()
			.show();
	};

}( mediaWiki, jQuery, mediaWiki.uploadWizard, OO ) );
