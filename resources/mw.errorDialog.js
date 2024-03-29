( function () {

	OO.ui.getWindowManager().addWindows( {
		upwizErrorDialog: new OO.ui.MessageDialog( { size: 'medium' } )
	} );

	/**
	 * Displays an error message.
	 *
	 * @param {jQuery|string} errorMessage
	 * @param {string} [title]
	 */
	mw.errorDialog = function ( errorMessage, title ) {
		OO.ui.getWindowManager().openWindow( 'upwizErrorDialog', {
			message: new OO.ui.HtmlSnippet( errorMessage ),
			title: title || mw.message( 'mwe-upwiz-errordialog-title' ).text(),
			verbose: true,
			actions: [
				{
					label: mw.message( 'mwe-upwiz-errordialog-ok' ).text(),
					action: 'accept'
				}
			]
		} );
	};

}() );
