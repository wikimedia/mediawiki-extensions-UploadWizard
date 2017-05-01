/**
 * Object that represents the entire multi-step Upload Wizard
 */
( function ( mw, uw, $ ) {

	mw.UploadWizard = function ( config ) {
		var maxSimPref;

		this.api = this.getApi( { ajax: { timeout: 0 } } );

		// making a sort of global for now, should be done by passing in config or fragments of config
		// when needed elsewhere
		mw.UploadWizard.config = config;
		// Shortcut for local references
		this.config = config;

		this.steps = {};

		maxSimPref = mw.user.options.get( 'upwiz_maxsimultaneous' );

		if ( maxSimPref !== 'default' ) {
			if ( maxSimPref > 0 ) {
				config.maxSimultaneousConnections = maxSimPref;
			} else {
				config.maxSimultaneousConnections = 1;
			}
		}

		this.maxSimultaneousConnections = config.maxSimultaneousConnections;
	};

	mw.UploadWizard.DEBUG = true;

	mw.UploadWizard.userAgent = 'UploadWizard';

	mw.UploadWizard.prototype = {
		stepNames: [ 'tutorial', 'file', 'deeds', 'details', 'thanks' ],

		/**
		 * Create the basic interface to make an upload in this div
		 *
		 * @param {string} selector
		 */
		createInterface: function ( selector ) {
			this.ui = new uw.ui.Wizard( selector );

			this.initialiseSteps();

			// "select" the first step - highlight, make it visible, hide all others
			this.steps.tutorial.load( [] );
		},

		/**
		 * Initialise the steps in the wizard
		 */
		initialiseSteps: function () {
			this.steps.tutorial = new uw.controller.Tutorial( this.api, this.config );
			this.steps.file = new uw.controller.Upload( this.api, this.config );
			this.steps.deeds = new uw.controller.Deed( this.api, this.config );
			this.steps.details = new uw.controller.Details( this.api, this.config );
			this.steps.thanks = new uw.controller.Thanks( this.api, this.config );

			this.steps.tutorial.setNextStep( this.steps.file );

			this.steps.file.setPreviousStep( this.steps.tutorial );
			this.steps.file.setNextStep( this.steps.deeds );

			this.steps.deeds.setPreviousStep( this.steps.file );
			this.steps.deeds.setNextStep( this.steps.details );

			this.steps.details.setPreviousStep( this.steps.deeds );
			this.steps.details.setNextStep( this.steps.thanks );

			// thanks doesn't need a "previous" step, there's no undoing uploads!
			this.steps.thanks.setNextStep( this.steps.file );

			$( '#mwe-upwiz-steps' ).arrowSteps();
		},

		/**
		 * mw.Api's ajax calls are not very consistent in their error handling.
		 * As long as the response comes back, the response will be fine: it'll
		 * get rejected with the error details there. However, if no response
		 * comes back for whatever reason, things can get confusing.
		 * I'll monkeypatch around such cases so that we can always rely on the
		 * error response the way we want it to be.
		 *
		 * @param {Object} options
		 * @return {mw.Api}
		 */
		getApi: function ( options ) {
			var api = new mw.Api( options );

			api.ajax = function ( parameters, ajaxOptions ) {
				$.extend( parameters, {
					errorformat: 'html',
					errorlang: mw.config.get( 'wgUserLanguage' ),
					errorsuselocal: 1,
					formatversion: 2
				} );

				return mw.Api.prototype.ajax.apply( this, [ parameters, ajaxOptions ] ).then(
					null, // done handler - doesn't need overriding
					function ( code, result ) { // fail handler
						var response = { errors: [ {
							code: code,
							html: result.textStatus || mw.message( 'apierror-unknownerror' ).parse()
						} ] };

						if ( result.errors && result.errors[ 0 ] ) {
							// in case of success-but-has-errors, we have a valid result
							response = result;
						} else if ( result && result.textStatus === 'timeout' ) {
							// in case of $.ajax.fail(), there is no response json
							response.errors[ 0 ].html = mw.message( 'api-error-timeout' ).parse();
						} else if ( result && result.textStatus === 'parsererror' ) {
							response.errors[ 0 ].html = mw.message( 'api-error-parsererror' ).parse();
						} else if ( code === 'http' && result && result.xhr && result.xhr.status === 0 ) {
							// failed to even connect to server
							response.errors[ 0 ].html = mw.message( 'api-error-offline' ).parse();
						}

						return $.Deferred().reject( code, response, response );
					}
				);
			};

			return api;
		}
	};

	/**
	 * Get the own work and third party licensing deeds if they are needed.
	 *
	 * @static
	 * @since 1.2
	 * @param {number} uploadsLength
	 * @param {Object} config The UW config object.
	 * @return {mw.UploadWizardDeed[]}
	 */
	mw.UploadWizard.getLicensingDeeds = function ( uploadsLength, config ) {
		var deed, api,
			deeds = {},
			doOwnWork = false,
			doThirdParty = false;

		api = this.prototype.getApi( { ajax: { timeout: 0 } } );

		if ( config.licensing.ownWorkDefault === 'choice' ) {
			doOwnWork = doThirdParty = true;
		} else if ( config.licensing.ownWorkDefault === 'own' ) {
			doOwnWork = true;
		} else {
			doThirdParty = true;
		}

		if ( doOwnWork ) {
			deed = new mw.UploadWizardDeedOwnWork( uploadsLength, api, config );
			deeds[ deed.name ] = deed;
		}
		if ( doThirdParty ) {
			deed = new mw.UploadWizardDeedThirdParty( uploadsLength, api, config );
			deeds[ deed.name ] = deed;
		}

		return deeds;
	};

	/**
	 * Helper method to put a thumbnail somewhere.
	 *
	 * @param {string|jQuery} selector String representing a jQuery selector, or a jQuery object
	 * @param {HTMLCanvasElement|HTMLImageElement|null} image
	 */
	mw.UploadWizard.placeThumbnail = function ( selector, image ) {
		if ( image === null ) {
			$( selector ).addClass( 'mwe-upwiz-file-preview-broken' );
			return;
		}

		$( selector )
			.css( { background: 'none' } )
			.html(
				$( '<a>' )
					.addClass( 'mwe-upwiz-thumbnail-link' )
					.append( image )
			);
	};

}( mediaWiki, mediaWiki.uploadWizard, jQuery ) );
