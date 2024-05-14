( function ( uw ) {

	/**
	 * Element that is able to display validation messages from itself or another widget.
	 *
	 * @abstract
	 * @class
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @param {OO.ui.Widget} [config.validatedWidget] Widget to validate
	 */
	uw.ValidationMessageElement = function UWValidationMessageElement( config ) {
		config = config || {};

		this.validatedWidget = config.validatedWidget || this;
		this.$messages = $( '<ul>' );

		this.errors = [];
		this.warnings = [];
		this.successMessages = [];
		this.notices = [];

		this.validatedWidget.connect( this, {
			change: 'checkValidity'
		} );

		this.$messages.addClass( 'oo-ui-fieldLayout-messages' );
		this.$element.addClass( 'mwe-upwiz-validationMessageElement' );
	};

	// Hack: Steal methods from OO.ui.FieldLayout.
	// TODO: Upstream ValidationMessageElement to OOUI, make FieldLayout use it.
	uw.ValidationMessageElement.prototype.setErrors = OO.ui.FieldLayout.prototype.setErrors;
	uw.ValidationMessageElement.prototype.setNotices = OO.ui.FieldLayout.prototype.setNotices;
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
			( this.validatedWidget.getWarnings ? this.validatedWidget.getWarnings( thorough ) : [] ),
			( this.validatedWidget.getNotices ? this.validatedWidget.getNotices( thorough ) : [] )
		).then( function ( errors, warnings, notices ) {
			// this.errors, this.warnings and this.notices are arrays of mw.Messages and not strings in this subclass
			element.setErrors( errors );
			element.setWarnings( warnings );
			element.setNotices( notices );

			return $.Deferred().resolve( errors, warnings, notices ).promise();
		} ).always( function () {
			if ( element.validatedWidget.popPending ) {
				element.validatedWidget.popPending();
			}
		} );
	};

	/**
	 * @protected
	 * @param {string} kind 'error', 'warning', or 'notice'
	 * @param {mw.Message|Object} error Message, or an object in { key: ..., html: ... } format
	 * @return {jQuery}
	 */
	uw.ValidationMessageElement.prototype.makeMessage = function ( kind, error ) {
		var icons = {
				error: 'error',
				warning: 'notice',
				notice: 'bellOutline'
			},
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

		return new OO.ui.MessageWidget( {
			type: kind,
			inline: true,
			label: $content,
			icon: icons[ kind ] || kind
		} ).$element.addClass( 'mwe-upwiz-fieldLayout-' + kind + '-' + code );
	};

}( mw.uploadWizard ) );
