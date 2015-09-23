( function ( mw, $ ) {

	/**
	 * Displays an error message.
	 * @param {string} errorMessage
	 * @param {string} [title]
	 */
	mw.ErrorDialog = function ( errorMessage, title ) {
		this.errorMessage = errorMessage;
		this.title = title || mw.message( 'mwe-upwiz-errordialog-title' ).text();
		this.windowManager = new OO.ui.WindowManager();
		$( 'body' ).append( this.windowManager.$element );
		this.dialog = new OO.ui.MessageDialog();
		this.windowManager.addWindows( [ this.dialog ] );
	};

	mw.ErrorDialog.prototype.open = function () {
		this.windowManager.openWindow( this.dialog, {
			title: this.title,
			message: this.errorMessage,
			verbose: true,
			actions: [
				{
					label: mw.message( 'mwe-upwiz-errordialog-ok' ).text(),
					action: 'accept'
				}
			]
		} );
	};

}( mediaWiki, jQuery ) );
