( function ( uw ) {

	/**
	 * Element that is able to display validation messages from itself or another widget.
	 *
	 * @abstract
	 * @class
	 *
	 * @param {Object} [config]
	 * @param {OO.ui.Widget} [config.validatedWidget] Widget to validate
	 */
	uw.ValidationMessageElement = function UWValidationMessageElement( config ) {
		config = config || {};

		this.validatedWidget = config.validatedWidget || this;
		this.$messages = $( '<ul>' );

		this.errors = [];
		this.warnings = [];
		this.successMessages = []; // unused, but OO.ui.FieldLayout.prototype.updateMessages assumes this exists
		this.notices = []; // unused, but OO.ui.FieldLayout.prototype.updateMessages assumes this exists

		this.validatedWidget.on( 'change', OO.ui.debounce( () => {
			this.checkValidity( false );
		}, 250 ) );

		this.$messages.addClass( 'oo-ui-fieldLayout-messages' );
		this.$element.addClass( 'mwe-upwiz-validationMessageElement' );
	};

	// Hack: Steal methods from OO.ui.FieldLayout.
	// TODO: Upstream ValidationMessageElement to OOUI, make FieldLayout use it.
	uw.ValidationMessageElement.prototype.setErrors = OO.ui.FieldLayout.prototype.setErrors;
	uw.ValidationMessageElement.prototype.setWarnings = OO.ui.FieldLayout.prototype.setWarnings;
	uw.ValidationMessageElement.prototype.updateMessages = OO.ui.FieldLayout.prototype.updateMessages;

	/**
	 * Check the field's widget for errors and warnings and display them in the UI.
	 *
	 * @param {boolean} thorough True to perform a thorough validity check. Defaults to false for a fast on-change check.
	 * @return {jQuery.Promise}
	 */
	uw.ValidationMessageElement.prototype.checkValidity = function ( thorough ) {
		var element = this;
		thorough = thorough || false;

		if ( this.validatedWidget.pushPending ) {
			this.validatedWidget.pushPending();
		}

		return $.when(
			( this.validatedWidget.getErrors ? this.validatedWidget.getErrors( thorough ) : [] ),
			( this.validatedWidget.getWarnings ? this.validatedWidget.getWarnings( thorough ) : [] )
		).then( ( errors, warnings ) => {
			// this.errors & this.warnings are arrays of mw.Messages and not strings in this subclass
			element.setErrors( errors );
			element.setWarnings( warnings );

			if ( errors.length > 0 ) {
				return $.Deferred().reject( errors, warnings ).promise();
			}

			return $.Deferred().resolve( errors, warnings ).promise();
		} ).always( () => {
			if ( element.validatedWidget.popPending ) {
				element.validatedWidget.popPending();
			}
		} );
	};

	/**
	 * @protected
	 * @param {string} kind 'error' or 'warning'
	 * @param {mw.Message|Object} error Message, or an object in { key: ..., html: ... } format
	 * @return {jQuery}
	 */
	uw.ValidationMessageElement.prototype.makeMessage = function ( kind, error ) {
		var messageKind = kind === 'warning' ? 'notice' : kind,
			code, $content;

		if ( error.parseDom ) {
			// mw.Message object
			code = error.key;
			$content = error.parseDom();
		} else {
			// { key: ..., html: ... } object (= formatted API error responses)
			code = error.code;
			$content = $( $.parseHTML( error.html ) );
		}

		return OO.ui.FieldLayout.prototype.makeMessage.call( this, messageKind, $content )
			.addClass( 'mwe-upwiz-fieldLayout-' + kind )
			.addClass( 'mwe-upwiz-fieldLayout-' + kind + '-' + code );
	};

}( mw.uploadWizard ) );
