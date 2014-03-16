/**
 *Object to embed OpenStreetMap into the UploadWizard
 * @class mw.GeoMap
 * @requires leaflet
 * @param {jQuery} $form
 *
 * Wraps a {@link leaflet} map in UploadWizard using the [Leaflet API](http://leaflet.cloudmade.com/reference.html).
 *
 * To use this class you must include an additional JavaScript and a CSS file from resources/leaflet:
 *
 */
( function ( mw, $ ) {

mw.GeoMap = function ( $form ) {
	var _this = this;
	_this.$form = $form;
	_this.isGeoMapInitialized = false;
	_this.map = null;
	_this.address = '';
	_this.zoom = 8;

	mw.GeoMap.mapId = ( mw.GeoMap.mapId || 0 ) + 1;
	_this.mapDiv = $( '<div>' ).addClass( 'mwe-loc-map' ).attr( 'id', 'mwe-location-map' + mw.GeoMap.mapId );

	_this.geoLocation = $( '<div>' ).attr( 'id', 'mwe-loc-map-label' + mw.GeoMap.mapId )
		.append( $( '<div>' ).addClass( 'mwe-loc-map-label' ).attr( 'id', 'simpleSearch' )
			.append( $( '<input>' ).attr( { type: 'text', size: 41, id: 'searchInput', placeholder: 'Search a place' } ),
				$( '<input>' ).addClass( 'searchButton' ).attr( { type: 'button', id: 'searchButton' } ) ) );
	var geoMapDiv = $( '<div>' ).addClass( 'mwe-location-map' ).append( _this.geoLocation, _this.mapDiv );
	_this.$form.find( '.mwe-location-label' ).append( geoMapDiv );

	var $list = _this.$form.find( '.mwe-loc-lat, .mwe-loc-lon' );
	$list.on( 'input keyup change cut paste uw-copy', $.debounce( 250, function () {
		if (  $list.valid() && !( $list.is( ':blank' ) ) ) {
			if ( _this.isGeoMapInitialized ) {
				_this.geoMapInit( $list.eq( 0 ).val(), $list.eq( 1 ).val() );
			}
			else {
				_this.staticMap( $list.eq( 0 ).val(), $list.eq( 1 ).val() );
			}
			_this.reverseGeocoding( $list.eq( 0 ).val(), $list.eq( 1 ).val() );
		}
		else {
			_this.mapRemove();
			_this.geoLocation.find( '#searchInput' ).val( '' );
		} } )
	);

	_this.geoLocation.find( '#searchInput' ).on( 'keypress', function ( e ) {
		if ( e.which === 13 ) {
			_this.geocoding( _this.geoLocation.find( '#searchInput' ).val() );
		}
	} );
	_this.geoLocation.find( '#searchButton' ).click( function () {
		_this.geocoding( _this.geoLocation.find( '#searchInput' ).val() );
	} );

	_this.marker = L.marker( [ 0, 0 ] );
	L.Icon.Default.imagePath = mw.config.get( 'wgScriptPath' ) + '/extensions/UploadWizard/resources/leaflet/images';

};

mw.GeoMap.prototype = {

	/**
	 * Generates static map url
	 *@param {Number} latitude
	 *@param {Number} longitude
	 *@return {String} Returns static map url
	 */
	staticMapLink: function ( latVal, lonVal) {
		var mapLink = new mw.Uri( 'http://staticmap.openstreetmap.de/staticmap.php/?' )
			.extend( { zoom: this.zoom, maptype: 'mapnik', center: latVal + ',' + lonVal, size: '300x300' } );
		return mapLink.toString();
	},

	/**
	 *Displays static map
	 *@param {Number} latitude
	 *@param {Number} longitude
	 */
	staticMap: function ( latVal, lonVal ) {
		var _this = this;
		_this.mapRemove();
		_this.mapDiv.addClass( 'mwe-upwiz-status-progress' );
		var link = _this.staticMapLink( latVal, lonVal );
		$( '<img>' ).attr( 'src', link ).addClass( 'mwe-loc-map' ).appendTo( _this.mapDiv )
			.click( function () {
			_this.mapRemove();
			_this.geoMapInit( latVal, lonVal );
		} );
		$( '<div>' ).addClass( 'mwe-loc-link' ).text( 'Click on image to open leaflet map' ).appendTo( _this.mapDiv ).hide();
		_this.mapDiv.on( 'mouseenter', function () {
			$( this ).find( '.mwe-loc-link' ).show();
		} );
		_this.mapDiv.on( 'mouseleave', function () {
			$( this ).find( '.mwe-loc-link' ).hide();
		} );
	},

	/**
	 *Initializes leaflet map
	 *@param {Number} latitude
	 *@param {Number} longitude
	 */
	geoMapInit: function ( latVal, lonVal ) {
		var _this = this,
			latlng = L.latLng ( latVal, lonVal );
		if ( !_this.isGeoMapInitialized ) {
			_this.map = new L.map( _this.mapDiv.attr( 'id' ), { center: [ latVal, lonVal ], zoom: _this.zoom, dragging: true } );
			_this.map.on( 'click', function ( e ) {
				_this.mapViewToinputs( e.latlng );
			} );
			_this.isGeoMapInitialized = true;
			new L.TileLayer( 'http://{s}.mqcdn.com/tiles/1.0.0/osm/{z}/{x}/{y}.png', {
				minZoom: 1,
				maxZoom: 25,
				attribution: 'Data, imagery and map information provided by' +
					'<a href=' + 'http://open.mapquest.co.uk' + ' target=_blank>MapQuest</a>' + ',' +
					'<a href=' + 'http://www.openstreetmap.org/' + ' target=_blank>OpenStreetMap</a> and contributors',
				subdomains: ['otile1','otile2','otile3','otile4'] } )
			.addTo( _this.map );
		}
		_this.markMapView( latlng );
	},

	/**
	 *Removes  map
	 */
	mapRemove: function () {
		if ( this.isGeoMapInitialized ) {
			this.isGeoMapInitialized = false;
			this.map.removeLayer( this.marker );
			this.map.remove();
			this.map = null;
			this.mapDiv.removeClass( 'leaflet-container leaflet-fade-anim' );
		}
		else {
			this.mapDiv.removeClass( 'mwe-upwiz-status-progress' );
		}
		this.mapDiv.empty();
	},

	/**
	 *Selects input coordinates from map
	 *@param {L.latLng} latlng
	 */
	mapViewToinputs: function ( latlng ) {
		var $list = this.$form.find( '.mwe-loc-lat, .mwe-loc-lon' );
		if ( ( $list.eq( 0 ).val() !== latlng.lat.toFixed( 4 ) ) && ( $list.eq( 1 ).val() !== latlng.lng.toFixed( 4 ) ) ) {
			$list.eq( 0 ).val( latlng.lat.toFixed( 4 ) );
			$list.eq( 1 ).val( latlng.lng.toFixed( 4 ) );
			$list.trigger( 'uw-copy' );
			this.markMapView( latlng );
		}
	},

	/**
	 *Updates marker position on leaflet map
	 *@param {L.latLng} latlng
	 */
	markMapView: function ( latlng ) {
		var _this = this;
		_this.map.setView ( latlng, _this.zoom );
		_this.marker.setLatLng( latlng );
		_this.marker.addTo( _this.map );
	},

	/**
	 * Generates Geocoding  url
	 *@param {String} location
	 *@return {String} Returns geocoding url
	 */
	geocodingUrl: function ( address ) {
		//Sometimes the user may geocode the reverse geocoded output, in that case nominatim geocoding may return null for
		//address search input which contains numeric terms ( house number, postcode etc ). To fix this issue its better to remove
		//numeric elements ( not alphanumeric) from location input.
		var array= address.split( /\s*,\s*/ );
		$.each( array, function ( i, a ) {
			if ( a.match( /(^[0-9\s\(\)\[\]\/\.\,\:\;\-]+$)/ ) ) {
				array[i] = null;
			}
		} );
		address = array.join( ',' );
		var mapLink = new mw.Uri( 'http://nominatim.openstreetmap.org/search/' + address + '?' )
				.extend( { format: 'json', addressdetails: 1 } );
		return mapLink.toString();
	},

	/**
	 * Generates reverse geocoding  url
	 *@param {Number} latitude
	 *@param {Number} longitude
	 *@return {String} Returns reverse geocoding url
	 */
	reverseGeocodingUrl: function ( latVal, lonVal ) {
		var mapLink = new mw.Uri( 'http://nominatim.openstreetmap.org/reverse?' )
			.extend( { format: 'json', lat: latVal, lon: lonVal, addressdetails: 1  } );
		return mapLink.toString();
	},

	/**
	 * Does Geocoding
	 *@param {String} location
	 */
	geocoding: function ( location ) {
		var _this = this,
			url = _this.geocodingUrl( location );
		$.getJSON( url, function ( data ) {
			if ( data.length ) {
				var latlng = L.latLng ( data[0].lat, data[0].lon ),
					$list = _this.$form.find( '.mwe-loc-lat, .mwe-loc-lon' );
				$list.eq( 0 ).val( latlng.lat.toFixed( 4 ) );
				$list.eq( 1 ).val( latlng.lng.toFixed( 4 ) );
				_this.locationResults( data[0] );
				if ( !( _this.isGeoMapInitialized ) ) {
					_this.staticMap( latlng.lat.toFixed( 4 ), latlng.lng.toFixed( 4 ) );
				}
				else {
					_this.markMapView( latlng );
				}
			}
			else {
				_this.geoLocation.find( '#searchInput' ).val( '' ).attr( 'placeholder', 'Incorrect search query, Search again!!' );
			}
		} );
	},

	/**
	 * Does reverse geocoding
	 *@param {Number} latitude
	 *@param {Number} longitude
	 */
	reverseGeocoding: function ( latVal, lonVal ) {
		var _this = this,
			url = _this.reverseGeocodingUrl( latVal, lonVal ),
			address;
		$.getJSON( url, function ( data ) {
			if ( !data.error ) {
				_this.locationResults( data );
			}
		} );
	},

	/**
	 * Displays location search results
	 *@param {json} data
	 */
	locationResults: function ( data ) {
		if ( JSON.stringify( data ).length > 0 ) {
			var _this = this,
				address = '',
				zoom = _this.zoom;

			$.each( data.address, function ( i, value ) {
				// generating display address from geocoded/reverse geocoded result-json object.
				if ( !( ( i === 'country' ) || ( i === 'country_code' )|| ( i === 'postcode' ) ||
					( i === 'state_district' ) || ( i === 'county' ) ) && value
				) {
					address += value + ',';
					value = false;
				}
				else if ( ( i === 'country' ) && value ) {
					address += value;
					value = false;
				}
				else {
					value = false;
				}

				if ( data.importance || !( _this.isGeoMapInitialized ) ){//Setting zoom level according to various types of places during address search
					if ( data.osm_type ) {
						if ( data.osm_type === 'relation' ) {//most probably a country|state
							zoom = 5;
							if ( data.type ) {
							//'type' as its name suggests describes type of location|place.
							//There are plenty of 'types' defined|approved by nominatim
							//most relevant for our purpose is 'administrative'.
							//for more info on 'type' refer --->[ http://taginfo.openstreetmap.org/]
								if ( data.type === 'administrative' ) {
									address = data.display_name;
									if ( data.address.city ) {//most probably a capital city
										zoom = 12;
									}
									else if ( data.address.state_district ) {//most probably a district
										zoom = 10;
									}
									else if ( data.address.state ) {//most probably a state
										zoom = 8;
									}
								}
							}
						}
						else if ( data.osm_type === 'node' ) {
							zoom = 12;
						}
						else if ( data.osm_type === 'way' ) {//Most probably a house|restaurant|street etc
							zoom = 15;
						}

						if ( data.class === 'tourism' ) {//A tourist spot
							zoom = 17;
							address = data.display_name;
						}
						else if ( data.class === 'amenity' ) {//park, hospital, university etc
							zoom = 16;
							address = data.display_name;
						}
					}
				}
			} );

			_this.zoom = zoom;
			_this.address = address;

			if ( _this.isGeoMapInitialized ) {
				_this.map.on( 'zoomend', function () {
					_this.zoom = _this.map.getZoom();
				} );
			}

			_this.geoLocation.find( '#searchInput' ).val( _this.address ).attr( 'placeholder', 'Search a place' );
		}

	}
};

}( mediaWiki, jQuery ) );