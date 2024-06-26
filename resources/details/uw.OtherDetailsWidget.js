( function ( uw ) {

	/**
	 * An other informations field in UploadWizard's "Details" step form.
	 *
	 * @class
	 * @extends uw.DetailsWidget
	 */
	uw.OtherDetailsWidget = function UWOtherDetailsWidget() {
		uw.OtherDetailsWidget.super.call( this );

		this.textInput = new OO.ui.MultilineTextInputWidget( {
			classes: [ 'mwe-upwiz-other-textarea', 'mwe-upwiz-otherDetailsWidget-other' ],
			autosize: true
		} );

		// Aggregate 'change' event
		// (but do not flash warnings in the user's face while they're typing)
		this.textInput.on( 'change', OO.ui.debounce( this.emit.bind( this, 'change' ), 500 ) );

		this.$element.addClass( 'mwe-upwiz-otherDetailsWidget' );
		this.$element.append(
			this.textInput.$element
		);
	};
	OO.inheritClass( uw.OtherDetailsWidget, uw.DetailsWidget );

	/**
	 * @inheritdoc
	 */
	uw.OtherDetailsWidget.prototype.getWikiText = function () {
		return this.textInput.getValue().trim();
	};

	/**
	 * @inheritdoc
	 * @return {Object} See #setSerialized
	 */
	uw.OtherDetailsWidget.prototype.getSerialized = function () {
		return {
			other: this.textInput.getValue()
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {string} serialized.other Other informations text
	 */
	uw.OtherDetailsWidget.prototype.setSerialized = function ( serialized ) {
		this.textInput.setValue( serialized.other );
	};

}( mw.uploadWizard ) );
