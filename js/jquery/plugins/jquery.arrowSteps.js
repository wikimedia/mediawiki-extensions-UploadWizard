/**
 * jQuery arrowSteps plugin
 * Copyright Neil Kandalgaonkar, 2010
 * 
 * This work is licensed under the terms of the GNU General Public License, 
 * version 2 or later. 
 * (see http://www.fsf.org/licensing/licenses/gpl.html). 
 * Derivative works and later versions of the code must be free software 
 * licensed under the same or a compatible license.
 *
 * Sometimes we want to show the user their progress through steps. One typical
 * way to show this is with a row of text blocks connected by arrows, with the 
 * current step highlighted.
 *
 * Create a list in HTML -- ordered or unordered. It works better if it has a fixed width. 
 *
 *  <ul id="robin-hood-daffy" style="width:600px">
 *    <li id="guard">Guard!</li>
 *    <li id="turn"/>Turn!</li>
 *    <li id="parry"/>Parry!</li>
 *    <li id="dodge"/>Dodge!</li>
 *    <li id="spin"/>Spin!</li>
 *    <li id="ha"/>Ha!</li>
 *    <li id="thrust"/>Thrust!</li>
 *  </ul>
 *
 * Initialize:
 *
 *   $( '#robin-hood-daffy' ).arrowSteps();
 * 
 * And then use:
 *  
 *   $( '#robin-hood-daffy' ).arrowStepsHighlight( '#guard' );
 *
 *
 */

( function( $j ) { 
	$j.fn.arrowSteps = function() {
		this.addClass( 'arrowSteps ui-helper-clearfix ui-state-default ui-widget ui-helper-reset ui-helper-clearfix' );
		$steps = this.find( 'li' );
		var arrowWidth = parseInt( this.outerHeight(), 10 );
		var basePadding = Math.max( 5, parseInt( this.outerHeight() / 5, 10 ) );
		// every LI element except for the last has an arrow portion
		// li1> li2> li3 
		var baseWidth = parseInt(  ( this.width() 
					     - ( basePadding + basePadding + arrowWidth ) * ( $steps.length - 1 )
					     - ( basePadding + basePadding ) 
                                           ) / $steps.length, 10 );
		var lastStepIndex = $steps.length - 1;
		$j.each( $steps, function( i, step ) {
			var $step = $j( step );
			$step.css( { 
				'margin': '0px', 
				'width': baseWidth + 'px' 
			} );
			if ( i == lastStepIndex ) {
				$step.css( { 
					'padding': basePadding + 'px',
				} );
			} else {
				$step.addClass( 'arrow' ).css( {
					'padding-top': basePadding + 'px',
					'padding-right': ( basePadding + arrowWidth ).toString() + 'px',
					'padding-bottom': basePadding + 'px',
					'padding-left': basePadding + 'px'
				} );
			}
		} );
		this.data( 'arrowSteps', $steps );
		return this;
	};
	
	$j.fn.arrowStepsHighlight = function( selector ) {
		var $steps = this.data( 'arrowSteps' );
		var $previous;
		$j.each( $steps, function( i, step ) {
			var $step = $j( step );
			if ( $step.is( selector ) ) {
				if ($previous) {
					$previous.addClass( 'tail' );
				}
				$step.addClass( 'head' );
			} else {
				$step.removeClass( 'head tail lasthead' );
			}
			$previous = $step;
		} ); 
	};

} )( jQuery );
