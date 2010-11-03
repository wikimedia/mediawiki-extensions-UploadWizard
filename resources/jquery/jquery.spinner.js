( function( $ ) {
	/**
	 * Set a given selector html to the loading spinner:
	 */
	$.fn.loadingSpinner = function( ) {
		if ( this ) {
			$j( this ).html(
				$j( '<div />' )
					.addClass( "loadingSpinner" )
			);
		}
		return this;
	}
	/**
	 * Add an absolute overlay spinner useful for cases where the
	 * element does not display child elements, ( images, video )
	 */
	$.fn.getAbsoluteOverlaySpinner = function(){
		var pos = $j( this ).offset();				
		var posLeft = (  $j( this ).width() ) ? 
			parseInt( pos.left + ( .4 * $j( this ).width() ) ) : 
			pos.left + 30;
			
		var posTop = (  $j( this ).height() ) ? 
			parseInt( pos.top + ( .4 * $j( this ).height() ) ) : 
			pos.top + 30;
		
		var $spinner = $j('<div />')
			.loadingSpinner()				
			.css({
				'width' : 32,
				'height' : 32,
				'position': 'absolute',
				'top' : posTop + 'px',
				'left' : posLeft + 'px'
			});
		$j('body').append( $spinner	);
		return $spinner;
	}
} )( jQuery );
