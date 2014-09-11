/**
 * Create 'remove' control, an X which highlights in some standardized way, with optional tooltips
 */
( function ( $ ) {
	$.fn.removeCtrl = function ( msgKey, tooltipMsgKey, callback ) {
		var msg = (msgKey === null) ? '' : mw.message( msgKey ).escaped();
		return $( '<div class="mwe-upwiz-remove-ctrl ui-corner-all" />' )
			.attr( 'title', mw.message( tooltipMsgKey ).escaped() )
			.click( callback )
			.hover( function () { $( this ).addClass( 'hover' ); },
				function () { $( this ).removeClass( 'hover' ); } )
			.append( $( '<div class="ui-icon ui-icon-close" /><div class="mwe-upwiz-remove-ctrl-msg">' + msg + '</div>' ) );
	};
} )( jQuery );
