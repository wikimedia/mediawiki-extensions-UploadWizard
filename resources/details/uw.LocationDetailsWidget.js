( function ( uw ) {

	/**
	 * A set of location fields in UploadWizard's "Details" step form.
	 *
	 * @extends uw.DetailsWidget
	 * @class
	 * @param {Object} [config] Configuration options
	 * @param {string} [config.latitudeKey]
	 * @param {string} [config.longitudeKey]
	 * @param {string} [config.headingKey]
	 * @param {string} [config.templateName]
	 */
	uw.LocationDetailsWidget = function UWLocationDetailsWidget( config ) {
		this.config = config || {};

		uw.LocationDetailsWidget.super.call( this );

		this.$element.addClass( 'mwe-upwiz-locationDetailsWidget' );

		this.latitudeInput = new OO.ui.TextInputWidget();
		this.longitudeInput = new OO.ui.TextInputWidget();
		this.headingInput = new OO.ui.TextInputWidget();
		this.$map = $( '<div>' ).css( { width: 500, height: 300 } );
		this.mapButton = new OO.ui.PopupButtonWidget( {
			icon: 'mapPin',
			title: mw.message( 'mwe-upwiz-location-button' ).text(),
			popup: {
				$content: this.$map,
				width: 500,
				height: 300
			}
		} );

		this.$element.append(
			new OO.ui.FieldLayout( this.latitudeInput, {
				align: 'top',
				label: mw.message( 'mwe-upwiz-location-lat' ).text()
			} ).$element,
			new OO.ui.FieldLayout( this.longitudeInput, {
				align: 'top',
				label: mw.message( 'mwe-upwiz-location-lon' ).text()
			} ).$element
		);

		if ( this.config.headingKey ) {
			this.$element.append(
				new OO.ui.FieldLayout( this.headingInput, {
					align: 'top',
					label: mw.message( 'mwe-upwiz-location-heading' ).text()
				} ).$element
			);
		}

		this.mapButton.setDisabled( true );
		this.$element.append( this.mapButton.$element );

		// Aggregate 'change' events
		this.latitudeInput.connect( this, { change: [ 'emit', 'change' ] } );
		this.longitudeInput.connect( this, { change: [ 'emit', 'change' ] } );
		this.headingInput.connect( this, { change: [ 'emit', 'change' ] } );

		this.mapButton.connect( this, { click: 'onMapButtonClick' } );
		this.connect( this, { change: 'onChange' } );

		this.mapButton.toggle( false );
		mw.loader.using( [ 'ext.kartographer.box', 'ext.kartographer.editing' ] ).done( () => {
			// Kartographer is installed and we'll be able to show the map. Display the button.
			this.mapButton.toggle( true );
		} );
	};

	OO.inheritClass( uw.LocationDetailsWidget, uw.DetailsWidget );

	/**
	 * @private
	 */
	uw.LocationDetailsWidget.prototype.onChange = function () {
		this.getErrors().done( ( errors ) => {
			this.mapButton.setDisabled( !( errors.length === 0 && this.getWikiText() !== '' ) );
		} );
	};

	/**
	 * @private
	 */
	uw.LocationDetailsWidget.prototype.onMapButtonClick = function () {
		const latitude = this.normalizeCoordinate( this.latitudeInput.getValue() ),
			longitude = this.normalizeCoordinate( this.longitudeInput.getValue() );

		// Disable clipping because it doesn't play nicely with the map
		this.mapButton.getPopup().toggleClipping( false );

		if ( !this.map ) {
			this.map = require( 'ext.kartographer.box' ).map( {
				container: this.$map[ 0 ]
			} );
		}
		require( 'ext.kartographer.editing' ).getKartographerLayer( this.map ).setGeoJSON( {
			type: 'Feature',
			properties: {},
			geometry: { type: 'Point', coordinates: [ longitude, latitude ] }
		} );
		this.map.setView( [ latitude, longitude ], 9 );
	};

	/**
	 * @inheritdoc
	 */
	uw.LocationDetailsWidget.prototype.getErrors = function () {
		const errors = [],
			latInput = this.latitudeInput.getValue(),
			lonInput = this.longitudeInput.getValue(),
			headInput = this.headingInput.getValue(),
			latNum = this.normalizeCoordinate( latInput ),
			lonNum = this.normalizeCoordinate( lonInput ),
			headNum = parseFloat( headInput );

		// input is invalid if the coordinates are out of bounds, or if the
		// coordinates that were derived from the input are 0, without a 0 even
		// being present in the input
		if ( latInput || lonInput ) {
			if ( latNum > 90 || latNum < -90 || ( latNum === 0 && latInput.indexOf( '0' ) < 0 ) || isNaN( latNum ) ) {
				errors.push( mw.message( 'mwe-upwiz-error-latitude' ) );
			}

			if ( lonNum > 180 || lonNum < -180 || ( lonNum === 0 && lonInput.indexOf( '0' ) < 0 ) || isNaN( lonNum ) ) {
				errors.push( mw.message( 'mwe-upwiz-error-longitude' ) );
			}
		}

		if ( headInput !== '' && ( headInput > 360 || headInput < 0 || isNaN( headNum ) ) ) {
			errors.push( mw.message( 'mwe-upwiz-error-heading' ) );
		}

		return $.Deferred().resolve( errors );
	};

	/**
	 * Set up the input fields.
	 *
	 * @param {string} [lat] Latitude value to set.
	 * @param {string} [lon] Longitude value to set.
	 * @param {string} [head] Heading value to set.
	 * @private
	 */
	uw.LocationDetailsWidget.prototype.setupInputs = function ( lat, lon, head ) {
		if ( lat !== undefined ) {
			this.latitudeInput.setValue( lat );
		}

		if ( lon !== undefined ) {
			this.longitudeInput.setValue( lon );
		}

		if ( head !== undefined ) {
			this.headingInput.setValue( head );
		}
	};

	/**
	 * @inheritdoc
	 */
	uw.LocationDetailsWidget.prototype.getWikiText = function () {
		const latInput = this.latitudeInput.getValue(),
			lonInput = this.longitudeInput.getValue(),
			headInput = this.headingInput.getValue(),
			latNum = this.normalizeCoordinate( latInput ),
			lonNum = this.normalizeCoordinate( lonInput ),
			headNum = parseFloat( headInput );

		// input is invalid if the coordinates are out of bounds, or if the
		// coordinates that were derived from the input are 0, without a 0 even
		// being present in the input
		if ( latNum !== 0 || latInput.indexOf( '0' ) >= 0 || lonNum !== 0 || lonInput.indexOf( '0' ) >= 0 ) {
			// {{Location}} or {{Object location}}
			const locationParts = [ '{{' + this.config.templateName, latNum, lonNum ];

			if ( !isNaN( headNum ) ) {
				locationParts.push( 'heading:' + headNum );
			}

			return locationParts.join( '|' ) + '}}';
		}

		return '';
	};

	/**
	 * @inheritdoc
	 * @return {Object} See #setSerialized
	 */
	uw.LocationDetailsWidget.prototype.getSerialized = function () {
		return {
			[ this.config.latitudeKey ]: this.latitudeInput.getValue(),
			[ this.config.longitudeKey ]: this.longitudeInput.getValue(),
			[ this.config.headingKey ]: this.headingInput.getValue()
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {string} serialized.latitude Latitude value
	 * @param {string} serialized.longitude Longitude value
	 * @param {string} serialized.heading Heading value
	 */
	uw.LocationDetailsWidget.prototype.setSerialized = function ( serialized ) {
		this.setupInputs(
			serialized[ this.config.latitudeKey ],
			serialized[ this.config.longitudeKey ],
			serialized[ this.config.headingKey ]
		);
	};

	/**
	 * Interprets a wide variety of coordinate input formats, it'll return the
	 * coordinate in decimal degrees.
	 *
	 * Formats understood include:
	 * - degrees minutes seconds: 40° 26' 46" S
	 * - degrees decimal minutes: 40° 26.767' S
	 * - decimal degrees: 40.446° S
	 * - decimal degrees exact value: -40.446
	 *
	 * This code is shared with the Kartographer extension. Please consider updating both when you
	 * touch this.
	 *
	 * @param {string} input
	 * @return {number|NaN} NaN when normalization was not possible
	 */
	uw.LocationDetailsWidget.prototype.normalizeCoordinate = function ( input ) {
		const sign = input.match( /[sw]/i ) ? -1 : 1;

		// fix commonly used character alternatives
		let value = input.trim()
			.replace( /−/g, '-' )
			.replace( /\s*[,.]\s*/g, '.' );

		// convert degrees, minutes, seconds (or degrees & decimal minutes) to
		// decimal degrees
		// there can be a lot of variation in the notation, so let's only
		// focus on "groups of digits" (and not whether e.g. ″ or " is used)
		const parts = value.match( /^\D*(-?\d{1,3}\b[\d.]*)[^\d.]+(\d{1,2}\b[\d.]*)(?:[^\d.]+(\d{1,2}\b[\d.]*))?\D*$/ );
		if ( parts ) {
			value = parts[ 1 ] * 1 + parts[ 2 ] / 60 + ( parts[ 3 ] || 0 ) / 3600;
		} else {
			value = value.replace( /[^-\d.]+/g, '' ) * 1;
			if ( Math.abs( value ) > 360 ) {
				return NaN;
			}
		}

		// Round to 6 decimal places, this approx. corresponds to a precision of 0.1 meter or less
		return Math.round( sign * value * 1000000 ) / 1000000;
	};

}( mw.uploadWizard ) );
