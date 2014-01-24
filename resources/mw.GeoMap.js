/**
 *Object to embed OpenStreetMap into the UploadWizard
 * @class mw.GeoMap
 * @param {jQuery} $form
 *
 * Wraps a {@link leaflet} map in UploadWizard using the [Leaflet API](http://leaflet.cloudmade.com/reference.html).
 *
 * To use this class you must include an additional JavaScript and a CSS file from resources/leaflet:
 *
 *
 */
( function ( mw, $ ) {

mw.GeoMap = function( $form ) {
	var _this = this;
	_this.$form = $form;

	mw.GeoMap.mapId = ( mw.GeoMap.mapId || 0 ) + 1;
	var mapDiv = $( '<div>' ).addClass( 'mwe-loc-map' ).attr( 'id', 'mwe-location-map'+mw.GeoMap.mapId );

	_this.$form.find( '.mwe-location-label' ).append( mapDiv );

	var $list = _this.$form.find( '.mwe-loc-lat, .mwe-loc-lon' );
	$list.on( 'input keyup change cut paste uw-copy', $.debounce( 250, function() {
		if (  $list.valid() && !( $list.is(':blank') ) ){
			if( _this.isGeoMapInitialized ){
				_this.geoMapInit( $list.eq( 0 ).val(), $list.eq( 1 ).val(), mapDiv );
			}
			else{
				_this.staticMap( $list.eq( 0 ).val(), $list.eq( 1 ).val(), mapDiv );
			}
		}
		else{
			_this.mapRemove( mapDiv );
		} })
	);


	_this.marker = L.marker([ 0, 0 ]);
	L.Icon.Default.imagePath = mw.config.get( 'wgScriptPath' ) + '/extensions/UploadWizard/resources/leaflet/images';

};

mw.GeoMap.prototype = {

	/**
	 * Generates static map url
	 *@param {Number} latitude
	 *@param {Number} longitude
	 *@return {String} Returns static map url
	 */
	staticMapLink: function( latVal, lonVal) {
		var mapLink = new mw.Uri( 'http://staticmap.openstreetmap.de/staticmap.php/?' )
			.extend( { zoom: 14, maptype: 'mapnik', center: latVal + ',' + lonVal, size: '280x230' } );
		return mapLink.toString();
	},

	/**
	 *Displays static map
	 *@param {Number} latitude
	 *@param {Number} longitude
	 *@param {HTMLDivElement} MapDiv The div to append the map into
	 */
	staticMap: function ( latVal, lonVal, mapDiv ) {
		var _this =this;
		_this.mapRemove( mapDiv );
		mapDiv.addClass( 'mwe-upwiz-status-progress' );
		var link = this.staticMapLink( latVal, lonVal );
		$( '<img>' ).attr( 'src', link ).addClass( 'mwe-loc-map' ).appendTo( mapDiv ).click( function(){
			_this.mapRemove( mapDiv );
			_this.geoMapInit( latVal, lonVal, mapDiv  );
		});
	},

	/**
	 *Initializes leaflet map
	 *@param {Number} latitude
	 *@param {Number} longitude
	 *@param {HTMLDivElement} MapDiv The div to append the map into
	 */
	geoMapInit: function( latVal, lonVal, mapDiv) {
		var _this = this,
			latlng = L.latLng ( latVal, lonVal );
		if( !_this.isGeoMapInitialized ){
			mapDiv.removeClass( 'mwe-loc-map' ).addClass( 'mwe-location-map' );
			_this.map = new L.map( mapDiv.attr('id'), { center: [ latVal, lonVal ], zoom: 14, dragging: false } );
			_this.map.on('click', function( e ) {
				_this.mapViewToinputs( e.latlng );
				_this.markMapView( e.latlng );
			});
			_this.isGeoMapInitialized = true;
			new L.TileLayer( 'http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', {
				minZoom: 1,
				maxZoom: 16,
				attribution: 'Data, imagery and map information provided by' +
					'<a href='+'http://open.mapquest.co.uk' + ' target=_blank>MapQuest</a>' + ',' +
					'<a href=' + 'http://www.openstreetmap.org/' + ' target=_blank>OpenStreetMap</a> and contributors',
				subdomains: ['otile1','otile2','otile3','otile4'] } )
			.addTo( _this.map );
		}
		_this.markMapView( latlng );
	},

	/**
	 *Removes  map
	 *@param {HTMLDivElement} MapDiv
	 */
	mapRemove: function( mapDiv ) {
		if( this.isGeoMapInitialized ){
			this.isGeoMapInitialized = false;
			this.map.removeLayer( this.marker );
			this.map.remove();
			this.map = null;
			mapDiv.removeClass( 'leaflet-container leaflet-fade-anim' );
			mapDiv.removeClass( 'mwe-location-map' );
			mapDiv.addClass( 'mwe-loc-map' );
		}
		else{
			mapDiv.removeClass( 'mwe-upwiz-status-progress' );
		}
		mapDiv.empty();
	},

	/**
	 *Selects input coordinates from map
	 *@param {L.LatLng} latlng
	 */
	mapViewToinputs: function( latlng ) {
		var $list = this.$form.find( '.mwe-loc-lat, .mwe-loc-lon' );
		$list.eq( 0 ).val( latlng.lat.toFixed( 4 ) );
		$list.eq( 1 ).val( latlng.lng.toFixed( 4 ) );
		$list.trigger( 'uw-copy' );
	},

	/**
	 *Updates marker position on leaflet map
	 *@param {L.LatLng} latlng
	 */
	markMapView: function( latlng ) {
		this.map.panTo( latlng );
		this.marker.setLatLng( latlng );
		this.marker.addTo( this.map );
	}
};

}( mediaWiki, jQuery ));