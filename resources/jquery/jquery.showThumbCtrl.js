/**
 * Create 'show thumbnail' control, with optional tooltips.  works like the 'remove' control.
 */
( function ( mw, $ ) {
	$.fn.showThumbCtrl = function ( msgKey, tooltipMsgKey, callback ) {
		var msg = (msgKey === null) ? '' : mw.message( msgKey ).escaped();
		return $( '<div class="mwe-upwiz-show-thumb-ctrl ui-corner-all" />' )
			.attr( 'title', mw.message( tooltipMsgKey ).text() )
			.click( function () {
				$( this )
					.addClass( 'disabled' )
					.unbind( 'mouseenter mouseover mouseleave mouseout mouseup mousedown' );
				callback();
			} )
			.append( $( '<div class="ui-icon ui-icon-image" /><div class="mwe-upwiz-show-thumb-ctrl-msg">' + msg + '</div>' ) );
	};
} )( mediaWiki, jQuery );
