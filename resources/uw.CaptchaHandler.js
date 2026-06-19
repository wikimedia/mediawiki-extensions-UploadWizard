( function ( uw ) {
	/**
	 * Manages the CAPTCHA widget lifecycle for a publish step.
	 *
	 * Handles loading ext.confirmEdit.CaptchaWidget on demand, rendering the
	 * challenge after a publish fails with a captcha error, collecting the
	 * solved token for the next publish attempt, and cleaning up state when
	 * the step is unloaded.
	 *
	 * @class
	 * @param {jQuery} $buttons Element before which the captcha message is inserted
	 */
	uw.CaptchaHandler = class {
		constructor( $buttons ) {
			this.$buttons = $buttons;
			this.captchaWidget = null;
			this.captchaMessage = null;
			this.$captchaContainer = null;
			this.captchaLoadingPromise = null;
			this.hasLoadError = false;
		}

		clear() {
			if ( this.$captchaContainer ) {
				this.$captchaContainer.remove();
				this.$captchaContainer = null;
			}
			if ( this.captchaMessage ) {
				this.captchaMessage.$element.remove();
			}
			this.captchaWidget = null;
			this.captchaMessage = null;
			this.captchaLoadingPromise = null;
			this.hasLoadError = false;
		}

		scrollTo( $captchaContainer ) {
			const inputField = this.captchaWidget && this.captchaWidget.getInputField();
			const target = inputField || $captchaContainer[ 0 ];
			if ( target ) {
				OO.ui.Element.static.scrollIntoView( target );
			}
		}

		/**
		 * Load and render the CAPTCHA widget after a publish fails with a captcha error.
		 *
		 * @param {Object} captchaData Captcha data from the API error response
		 * @return {jQuery.Promise}
		 */
		show( captchaData ) {
			this.clear();

			const $captchaContainer = $( '<div>' ).insertBefore( this.$buttons );
			$( '<p>' )
				.addClass( 'mwe-upwiz-captcha-description' )
				.text( mw.message( 'mwe-upwiz-captcha-description' ).text() )
				.appendTo( $captchaContainer );
			this.$captchaContainer = $captchaContainer;

			this.captchaLoadingPromise = mw.loader.using( 'ext.confirmEdit.CaptchaWidget' ).then(
				() => this.renderWidget( $captchaContainer, captchaData ),
				() => {
					this.showLoadError( $captchaContainer );
					// Allow a future show() to re-attempt the load instead of replaying this rejection.
					this.captchaLoadingPromise = null;
					return $.Deferred().reject( 'captcha-load-failed' ).promise();
				}
			);

			return this.captchaLoadingPromise;
		}

		async renderWidget( $captchaContainer, captchaData ) {
			this.captchaWidget = new mw.libs.confirmEdit.CaptchaWidget( {
				container: $captchaContainer[ 0 ],
				interfaceName: 'uploadwizard',
				showLoadingIndicator: true
			} );

			try {
				// ConfirmEdit's updateForFailure may resolve to true when the
				// widget has silently re-validated (e.g. hCaptcha satisfying an
				// AbuseFilter forceshowcaptcha challenge without user input).
				// In that case the caller can re-fire the API request immediately.
				const shouldAutoResubmit = await this.captchaWidget.updateForFailure( captchaData );
				await this.captchaWidget.renderCaptcha();
				this.scrollTo( $captchaContainer );
				return shouldAutoResubmit === true;
			} catch ( error ) {
				mw.errorLogger.logError( error, 'error.uploadwizard' );
				this.showLoadError( $captchaContainer, error );
				// Drop the rejection so getCaptchaToken() sees a resolved promise with no widget.
				this.captchaLoadingPromise = null;
				return false;
			}
		}

		showLoadError( $captchaContainer, error ) {
			this.hasLoadError = true;
			$captchaContainer.remove();
			this.$captchaContainer = null;
			this.captchaWidget = null;
			if ( this.captchaMessage ) {
				this.captchaMessage.$element.remove();
			}
			this.captchaMessage = new OO.ui.MessageWidget( {
				type: 'error',
				label: ( error && error.message ) || mw.message( 'mwe-upwiz-captcha-load-failed' ).text(),
				id: 'mwe-upwiz-captcha-message'
			} );
			this.captchaMessage.$element.insertBefore( this.$buttons );
			OO.ui.Element.static.scrollIntoView( this.captchaMessage.$element[ 0 ] );
		}

		showSubmitError( error ) {
			if ( !this.$captchaContainer ) {
				return;
			}
			this.$captchaContainer.find( '.mwe-upwiz-captcha-submit-error' ).remove();
			new OO.ui.MessageWidget( {
				type: 'error',
				label: ( error && error.message ) || mw.message( 'mwe-upwiz-captcha-load-failed' ).text(),
				classes: [ 'mwe-upwiz-captcha-submit-error' ]
			} ).$element.appendTo( this.$captchaContainer );
		}

		/**
		 * Get the CAPTCHA submission data from the current widget.
		 *
		 * If the widget is still loading (show() was called but not yet settled),
		 * waits for it to finish before requesting data.
		 *
		 * @return {jQuery.Promise<Object|null>}
		 */
		getCaptchaToken() {
			return $.when( this.captchaLoadingPromise ).then( () => {
				if ( this.hasLoadError ) {
					// Don't let the publish API fire when we couldn't render a widget —
					// the server would reject it anyway and the user has nothing to retry with.
					return $.Deferred().reject( 'captcha-load-failed' ).promise();
				}
				if ( !this.captchaWidget ) {
					return null;
				}

				return this.captchaWidget.getCaptchaDataForSubmission();
			} ).catch( ( error ) => {
				if ( error !== 'captcha-load-failed' ) {
					mw.errorLogger.logError( error, 'error.uploadwizard' );
					this.showSubmitError( error );
				}
				// Re-throw so the caller can react (e.g. cancel submitting).
				return $.Deferred().reject( error ).promise();
			} );
		}
	};

}( mw.uploadWizard ) );
