/**
 * JavaScript for the Upload Wizard MediaWiki extension.
 * @see https://www.mediawiki.org/wiki/Extension:UploadWizard
 *
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw <jeroendedauw at gmail dot com>
 */

(function( $, mw ) {

	$( document ).ready( function() {

		$( '.mw-htmlform-submit, #cancelEdit' ).button();

	} );

})( window.jQuery, window.mediaWiki );