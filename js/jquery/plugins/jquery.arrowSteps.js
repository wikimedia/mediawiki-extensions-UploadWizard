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
 *
 * DESCRIPTION
 *
 * Show users their progress through a series of steps, via a row of items that fit 
 * together like arrows. One item can be highlighted at a time.
 *
 *
 * SYNOPSIS 
 *
 * <ul id="robin-hood-daffy" style="width:600px">
 *   <li id="guard">Guard!</li>
 *   <li id="turn"/>Turn!</li>
 *   <li id="parry"/>Parry!</li>
 *   <li id="dodge"/>Dodge!</li>
 *   <li id="spin"/>Spin!</li>
 *   <li id="ha"/>Ha!</li>
 *   <li id="thrust"/>Thrust!</li>
 * </ul>
 *
 * <script language="javascript"><!-- 
 *   $( '#robin-hood-daffy' ).arrowSteps();
 *
 *   $( '#robin-hood-daffy' ).arrowStepsHighlight( '#guard' );
 *   // 'Guard!' is highlighted.
 *
 *   // ... user completes the 'guard' step ...
 * 
 *   $( '#robin-hood-daffy' ).arrowStepsHighlight( '#turn' );
 *   // 'Turn!' is highlighted.
 *
 *   //-->
 * </script>
 *
 */

( function( $j ) { 
	$j.fn.arrowSteps = function() {
		this.addClass( 'arrowSteps ui-helper-clearfix ui-state-default ui-widget ui-helper-reset ui-helper-clearfix' );
		var $steps = this.find( 'li' );

		var width = parseInt( 100 / $steps.length, 10 );
		$steps.css( 'width', width + '%' );

		// every step except the last one has an arrow at the right hand side. Also add in the padding 
		// for the calculated arrow width.
		var arrowWidth = parseInt( this.outerHeight(), 10 );
		$steps.filter( ':not(:last-child)' ).addClass( 'arrow' )
		      .find( 'div' ).css( 'padding-right', arrowWidth.toString() + 'px' );

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
