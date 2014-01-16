
( function ( mw, $ ) {

/**
 * Object to embed OpenStreetMap into UploadWizard
 * @class mw.GeoMap
 * @param {jQuery} $form
 */
mw.GeoMap = function( $form ) {
	var _this = this;
	_this.$form = $form;

	mw.GeoMap.numInstances = ( mw.GeoMap.numInstances || 0 ) + 1;
	var mapId = 'mwe-loc-map-' + mw.GeoMap.numInstances;
	var mapDiv = $( '<div>' )
		.addClass( 'mwe-loc-map' )
		.attr( 'id', mapId );

	_this.$form.find( '.mwe-location-label' ).append( mapDiv );

	var $list = _this.$form.find( '.mwe-loc-lat, .mwe-loc-lon' );
	$list.on( 'input keyup change cut paste uw-copy', $.debounce( 250, function() {
		if (  $list.valid() ) {
			_this.staticMap( $list.eq( 0 ).val(), $list.eq( 1 ).val(), mapDiv );
		} else {
			_this.staticMapRemove( mapDiv );
		}
	} ) );
};

mw.GeoMap.prototype = {

	/**
	 * Generates static map url
	 * @param {Number} latitude
	 * @param {Number} longitude
	 * @return {String} Returns static map url
	 */
	staticMapLink: function ( latVal, lonVal) {
		var mapLink = new mw.Uri( 'http://staticmap.openstreetmap.de/staticmap.php/?' )
			.extend( { zoom: 14, maptype: 'mapnik', center: latVal + ',' + lonVal, size: '280x230' } );
		return mapLink.toString();
	},

	/**
	 * Displays static map.
	 * @param {Number} latitude
	 * @param {Number} longitude
	 * @param {HTMLDivElement} MapDiv The div to append the map into
	 */
	staticMap: function ( latVal, lonVal, mapDiv ) {
		this.staticMapRemove( mapDiv );
		mapDiv.addClass( 'mwe-upwiz-status-progress' );
		var link = this.staticMapLink( latVal, lonVal );
		$( '<img>' ).attr( 'src', link ).addClass( 'mwe-loc-map' ).appendTo( mapDiv );
	},

	/**
	 * Removes static map.
	 * @param {HTMLDivElement} MapDiv The div that contains static map
	 */
	staticMapRemove: function( mapDiv ){
		mapDiv.removeClass( 'mwe-upwiz-status-progress' );
		mapDiv.empty();
	}

};

}( mediaWiki, jQuery ));