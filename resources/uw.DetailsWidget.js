( function ( uw ) {

	/**
	 * A single logical field in UploadWizard's "Details" step form.
	 *
	 * This can be composed of multiple smaller widgets, but represents a single unit (e.g. a
	 * "location" field could be composed of "latitude" and "longitude" inputs).
	 *
	 * @class
	 * @extends OO.ui.Widget
	 * @abstract
	 */
	uw.DetailsWidget = function UWDetailsWidget() {
		uw.DetailsWidget.super.call( this );
	};
	OO.inheritClass( uw.DetailsWidget, OO.ui.Widget );
	OO.mixinClass( uw.DetailsWidget, uw.ValidatableElement );

	/**
	 * A 'change' event is emitted when the state of this widget (and the serialized value) changes.
	 *
	 * @event uw.DetailsWidget.change
	 */

	/**
	 * @inheritdoc OO.ui.mixin.PendingElement#pushPending
	 */
	uw.DetailsWidget.prototype.pushPending = function () {
		// Do nothing by default
	};

	/**
	 * @inheritdoc OO.ui.mixin.PendingElement#popPending
	 */
	uw.DetailsWidget.prototype.popPending = function () {
		// Do nothing by default
	};

	/**
	 * Get a wikitext snippet generated from current state of the widget.
	 *
	 * @method
	 * @return {string} Wikitext
	 */
	uw.DetailsWidget.prototype.getWikiText = null;

	/**
	 * Get a machine-readable representation of the current state of the widget. It can be passed to
	 * #setSerialized to restore this state (or to set it for another instance of the same class).
	 *
	 * @method
	 * @return {Object}
	 */
	uw.DetailsWidget.prototype.getSerialized = null;

	/**
	 * Set the state of this widget from machine-readable representation, as returned by
	 * #getSerialized.
	 *
	 * @method
	 * @param {Object} serialized
	 */
	uw.DetailsWidget.prototype.setSerialized = null;

}( mw.uploadWizard ) );
