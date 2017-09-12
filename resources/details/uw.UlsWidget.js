( function ( mw, uw, $ ) {

	/**
	 * A ULS within a description field in UploadWizard's "Details" step form.
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {string} [defaultLanguage] 2-letter language code
	 * @cfg {Object} [languages] Keys are 2-letter language codes, values are language autonyms
	 * @cfg {Array} [classes] Classes to apply to the ULS container div
	 */
	uw.UlsWidget = function UWUlsWidget( config ) {
		var i;

		this.$element = $( '<div>' )
			.append(
				$( '<span>' )
					.attr( 'tabindex', 0 )
					.addClass( 'oo-ui-dropdownWidget-handle' )
					.addClass( 'oo-ui-indicatorElement' )
					.append(
						$( '<span>' ).addClass( 'oo-ui-labelElement-label' ),
						$( '<span>' )
							.addClass( 'oo-ui-indicatorElement-indicator' )
							.addClass( 'oo-ui-indicator-down' )
					)
			)
			.addClass( 'oo-ui-dropdownWidget' )
			.addClass( 'oo-ui-widget-enabled' );
		for ( i = 0; i < config.classes.length; i++ ) {
			this.$element.addClass( config.classes[ i ] );
		}

		this.languages = config.languages;
	};

	/**
	 * Initialise the ULS
	 *
	 * Not called from the constructor because we don't want the ULS to be in its default position,
	 * and in order to know where to re-position to we must wait until the widgets have been
	 * attached to the DOM
	 *
	 * Called from containing widget (DescriptionsDetailsWidget)
	 */
	uw.UlsWidget.prototype.initialiseUls = function () {
		var ulsWidget = this,
			offset = this.$element.offset();
		this.uls = $( this.$element ).uls( {
			onSelect: function ( language ) {
				ulsWidget.setValue( language );
				ulsWidget.$element.parent().find( '.oo-ui-inputWidget-input' ).focus();
			},
			languages: ulsWidget.languages,
			top: offset.top,
			left: offset.left
		} );
		// Show the ULS when a user tabs into the language selection field
		this.$element.find( '.oo-ui-dropdownWidget-handle' ).on( 'focus', function () {
			$( this ).click();
		} );
	};

	/**
	 * @param {string} value
	 */
	uw.UlsWidget.prototype.setValue = function ( value ) {
		this.languageValue = value;
		this.$element.find( '.oo-ui-labelElement-label' ).text( this.languages[ value ] );
	};

	/**
	 * @return {string}
	 */
	uw.UlsWidget.prototype.getValue = function () {
		return this.languageValue;
	};

	/**
	 * @returns {uw.UlsWidget}
	 */
	uw.UlsWidget.prototype.getElement = function () {
		return this.$element;
	};

}( mediaWiki, mediaWiki.uploadWizard, jQuery, OO ) );
