/**
 * Create 'show thumbnail' control, with optional tooltips.  works like the 'remove' control.
 */
( function ( $ ) {
	$.fn.showThumbCtrl = function( msgKey, tooltipMsgKey, callback ) {
		var msg = (msgKey === null) ? '' : mw.msg( msgKey );
		return $( '<div class="mwe-upwiz-show-thumb-ctrl ui-corner-all" />' )
			.attr( 'title', mw.msg( tooltipMsgKey ) )
			.click( function() { $( this ).removeClass( 'hover' ).addClass( 'disabled' ).unbind( 'mouseenter mouseover mouseleave mouseout mouseup mousedown' ); callback(); } )
			.hover( function() { $( this ).addClass( 'hover' ); },
				function() { $( this ).removeClass( 'hover' ); } )
			.append( $( '<div class="ui-icon ui-icon-image" /><div class="mwe-upwiz-show-thumb-ctrl-msg">' + msg + '</div>' ) );
	};
} )( jQuery );
