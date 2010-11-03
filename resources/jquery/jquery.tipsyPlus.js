( function( $j ) {
	$j.fn.tipsyPlus = function( optionsArg ) {
		// use extend!
		var titleOption = 'title';
		var htmlOption = false;

		var options = $j.extend( 
			{ type: 'help', shadow: true },
			optionsArg
		);

		var el = this;

		if (options.plus) {
			htmlOption = true;
			titleOption = function() {
				return $j( '<span />' ).append(
					$j( this ).attr( 'original-title' ),
					$j( '<a class="mwe-upwiz-tooltip-link"/>' )
						.attr( 'href', '#' )
						.append( gM( 'mwe-upwiz-tooltip-more-info' ) )
						.mouseenter( function() {
							el.data('tipsy').sticky = true;
						} )
						.mouseleave( function() {
							el.data('tipsy').sticky = false;
						} )
						.click( function() {
							// show the wiki page with more
							alert( options.plus );
							// pass this in as a closure to be called on dismiss
							el.focus();
							el.data('tipsy').sticky = false;
						} )
				);
			};
		}

		return this.tipsy( { 
			gravity: 'w', 
			trigger: 'focus',
			title: titleOption,
			html: htmlOption,
			type: options.type,
			shadow: options.shadow
		} );
	};
} )( jQuery );

