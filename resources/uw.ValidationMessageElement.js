( function ( uw ) {

	/**
	 * Element that is able to display validation messages from itself or another widget.
	 *
	 * @abstract
	 * @class
	 *
	 * @param {Object} [config]
	 * @param {uw.ValidatableElement} [config.validatedWidget] Widget to validate
	 */
	uw.ValidationMessageElement = function UWValidationMessageElement( config ) {
		config = config || {};

		this.validatedWidget = config.validatedWidget || this;
		this.$messages = $( '<ul>' );

		this.errors = [];
		this.warnings = [];
		this.notices = [];
		this.successMessages = []; // unused, but OO.ui.FieldLayout.prototype.updateMessages assumes this exists

		this.validatedWidget.on( 'change', () => this.validate && this.validate( false ) );

		this.$messages.addClass( 'oo-ui-fieldLayout-messages' );
		this.$element.addClass( 'mwe-upwiz-validationMessageElement' );
	};
	OO.initClass( uw.ValidationMessageElement );
	OO.mixinClass( uw.ValidationMessageElement, uw.ValidatableElement );

	// Hack: Steal methods from OO.ui.FieldLayout.
	// TODO: Upstream ValidationMessageElement to OOUI, make FieldLayout use it.
	uw.ValidationMessageElement.prototype.setErrors = OO.ui.FieldLayout.prototype.setErrors;
	uw.ValidationMessageElement.prototype.setWarnings = OO.ui.FieldLayout.prototype.setWarnings;
	uw.ValidationMessageElement.prototype.setNotices = OO.ui.FieldLayout.prototype.setNotices;
	uw.ValidationMessageElement.prototype.updateMessages = OO.ui.FieldLayout.prototype.updateMessages;

	uw.ValidationMessageElement.prototype.preValidate = function () {
		if ( this.validatedWidget.pushPending ) {
			this.validatedWidget.pushPending();
		}
	};

	/**
	 * Check the field's widget for errors, warnings & notices and display them in the UI.
	 *
	 * @param {boolean} thorough True to perform a thorough validity check. Defaults to false for a fast on-change check.
	 * @return {jQuery.Promise<uw.ValidationStatus>}
	 */
	uw.ValidationMessageElement.prototype.validate = function ( thorough ) {
		thorough = thorough || false;

		return $.Deferred().resolve().promise()
			.then( () => this.preValidate() )
			.then( () => this.validatedWidget.validate( thorough ) )
			.always( ( status ) => this.postValidate( status ) );
	};

	/**
	 * @param {uw.ValidationStatus} status
	 */
	uw.ValidationMessageElement.prototype.postValidate = function ( status ) {
		// errors, warnings & notices are arrays of mw.Messages and not strings in this subclass
		this.setErrors( status.getErrors() );
		this.setWarnings( status.getWarnings() );
		this.setNotices( status.getNotices() );

		if ( this.validatedWidget.popPending ) {
			this.validatedWidget.popPending();
		}
	};

	/**
	 * @protected
	 * @param {string} kind 'error', 'warning' or 'notice'
	 * @param {mw.Message|Object} error Message, or an object in { key: ..., html: ... } format
	 * @return {jQuery}
	 */
	uw.ValidationMessageElement.prototype.makeMessage = function ( kind, error ) {
		let code, $content;

		if ( error.parseDom ) {
			// mw.Message object
			code = error.key;
			$content = error.parseDom();
		} else {
			// { key: ..., html: ... } object (= formatted API error responses)
			code = error.code;
			$content = $( $.parseHTML( error.html ) );
		}

		return OO.ui.FieldLayout.prototype.makeMessage.call( this, kind, $content )
			.addClass( 'mwe-upwiz-fieldLayout-' + kind )
			.addClass( 'mwe-upwiz-fieldLayout-' + kind + '-' + code );
	};

}( mw.uploadWizard ) );
