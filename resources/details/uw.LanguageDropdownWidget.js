( function ( mw, uw, $, OO ) {

	/**
	 * A language dropdown within a description field in UploadWizard's "Details" step form.
	 *
	 * @constructor
	 * @param {Object} [config]
	 */
	uw.LanguageDropdownWidget = function UWLanguageDropdownWidget( config ) {
		config = config || {};

		this.languageDropdown = new OO.ui.DropdownWidget( {
			menu: { items: config.menuOptionWidgets },
			classes: config.classes
		} );
	};

	/**
	 * @param {string} value
	 */
	uw.LanguageDropdownWidget.prototype.setValue = function ( value ) {
		this.languageDropdown.getMenu().selectItemByData( value );
	};

	/**
	 * @return {string}
	 */
	uw.LanguageDropdownWidget.prototype.getValue = function () {
		return this.languageDropdown.getMenu().findSelectedItem().getData();
	};

	/**
	 * @return {OO.ui.DropdownWidget}
	 */
	uw.LanguageDropdownWidget.prototype.getElement = function () {
		return this.languageDropdown.$element;
	};

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
