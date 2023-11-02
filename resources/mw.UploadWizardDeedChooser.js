( function () {

	/**
	 * Interface widget to choose among various deeds -- for instance, if own work, or not own work, or other such cases.
	 *
	 * @param {Object} config The UW config
	 * @param {string|jQuery} selector Where to put this deed chooser
	 * @param {Object} deeds Keyed object of UploadWizardDeed items
	 * @param {mw.UploadWizardUpload[]} uploads Uploads that this applies to (this is just to make deleting and plurals work)
	 */
	mw.UploadWizardDeedChooser = function ( config, selector, deeds, uploads ) {
		var chooser = this,
			$radioContainer,
			$formContainer,
			$mainContainer;

		this.$selector = $( selector );
		this.uploads = uploads;
		this.deeds = deeds;

		// Name for radio button set
		mw.UploadWizardDeedChooser.prototype.widgetCount++;
		this.name = 'deedChooser' + mw.UploadWizardDeedChooser.prototype.widgetCount.toString();

		this.onLayoutReady = function () {};

		$radioContainer = $( '<div>' ).addClass( 'mwe-upwiz-deed-radios' );
		$formContainer = $( '<div>' ).addClass( 'mwe-upwiz-deed-forms' );
		$mainContainer = $( '<div>' ).addClass( 'mwe-upwiz-deeds-container' ).append(
			$radioContainer, $formContainer
		);

		Object.keys( this.deeds ).forEach( function ( name ) {
			var deed = chooser.deeds[ name ],
				radio = new OO.ui.RadioSelectWidget( { classes: [ 'mwe-upwiz-deed-radio-' + name ] } ),
				option = new OO.ui.RadioOptionWidget(),
				$label = $( '<span>' ).append(
					// label text
					mw.message(
						'mwe-upwiz-source-' + deed.name + '-label',
						chooser.uploads.length
					).text(),
					// label description
					$( '<span>' )
						.addClass( 'mwe-upwiz-label-extra mwe-upwiz-label-explainer' )
						.text(
							mw.message(
								'mwe-upwiz-source-' + deed.name + '-description',
								chooser.uploads.length
							).text()
						)
				).contents(),
				// Separate the radio option from its form
				$deedRadio = $( '<div>' ).addClass( 'mwe-upwiz-deed-option-title' ).append(
					$( '<span>' ).addClass( 'mwe-upwiz-deed-header' ).append(
						radio.$element
					)
				),
				$deedForm = $( '<div>' ).addClass( 'mwe-upwiz-deed mwe-upwiz-deed-' + deed.name ).append(
					$( '<div>' ).addClass( 'mwe-upwiz-deed-form' )
				).hide();

			option.setLabel( $label );

			radio.addItems( [ option ] );

			// Set the name attribute manually. We can't use RadioInputWidget which has
			// a name config because they don't emit change events. Ideally we would use
			// one RadioSelectWidget and not have to set this property.
			radio.items[ 0 ].radio.$input.attr( 'name', chooser.name );

			// Append intermediate containers
			$radioContainer.append( $deedRadio );
			$formContainer.append( $deedForm );

			deed.setFormFields( $deedForm.find( '.mwe-upwiz-deed-form' ) );

			if ( Object.keys( chooser.deeds ).length === 1 ) {
				chooser.onLayoutReady = chooser.selectDeed.bind( chooser, deed );
			} else {
				if ( config.licensing.defaultType === deed.name ) {
					chooser.onLayoutReady = chooser.selectDeed.bind( chooser, deed );
				}
				radio.on( 'choose', function () {
					chooser.selectDeed( deed );
				} );
			}
		} );

		// Append main container
		this.$selector.append( $mainContainer );

		// Deselect all deeds
		Object.keys( this.deeds ).forEach( function ( name ) {
			chooser.deselectDeedInterface( name );
		} );
	};

	mw.UploadWizardDeedChooser.prototype = {
		/**
		 * How many deed choosers there are (important for creating unique ids, element names)
		 */
		widgetCount: 0,

		/**
		 * Check if this form is filled out correctly.
		 *
		 * @return {boolean} true if valid, false if not
		 */
		valid: function () {
			return !!this.deed;
		},

		/**
		 * Uploads this deed controls
		 */
		uploads: [],

		selectDeed: function ( deed ) {
			this.choose( deed );
			this.selectDeedInterface( deed.name );
		},

		choose: function ( deed ) {
			var chooser = this;

			this.deed = deed;

			this.uploads.forEach( function ( upload ) {
				upload.deedChooser = chooser;
			} );

			// eslint-disable-next-line no-jquery/no-global-selector
			$( '#mwe-upwiz-stepdiv-deeds .mwe-upwiz-button-next' ).show();
		},

		/**
		 * From the deed choices, make a choice fade to the background a bit, hide the extended form
		 *
		 * @param {string} deedName
		 */
		deselectDeedInterface: function ( deedName ) {
			var $deedRadio = this.$selector.find( '.mwe-upwiz-deed-radio-' + deedName + ' input' ),
				$deedForm = this.$selector.find( '.mwe-upwiz-deed.mwe-upwiz-deed-' + deedName );

			$deedRadio.prop( 'checked', false );
			$deedForm.removeClass( 'selected' );
			// Prevent validation of deselected deeds by disabling all form inputs
			// TODO: Use a tag selector
			// eslint-disable-next-line no-jquery/no-sizzle
			$deedForm.find( ':input' ).prop( 'disabled', true );
			// eslint-disable-next-line no-jquery/no-sizzle
			$deedForm.hide();
		},

		/**
		 * From the deed choice page, show a particular deed
		 *
		 * @param {string} deedName
		 */
		selectDeedInterface: function ( deedName ) {
			var self = this,
				$deedRadio = this.$selector.find( '.mwe-upwiz-deed-radio-' + deedName + ' input' ),
				$deedForm = this.$selector.find( '.mwe-upwiz-deed.mwe-upwiz-deed-' + deedName );

			// deselect all other deeds
			Object.keys( this.deeds ).forEach( function ( name ) {
				if ( name === deedName ) {
					return;
				}
				self.deselectDeedInterface( name );
			} );

			$deedRadio.prop( 'checked', true );
			$deedForm.addClass( 'selected' );
			// (Re-)enable all form inputs
			// TODO: Use a tag selector
			// eslint-disable-next-line no-jquery/no-sizzle
			$deedForm.find( ':input' ).prop( 'disabled', false );
			// eslint-disable-next-line no-jquery/no-sizzle
			$deedForm.show();
		},

		remove: function () {
			this.$selector.empty();
		},

		/**
		 * @return {Object}
		 */
		getSerialized: function () {
			return this.valid() ? this.deed.getSerialized() : {};
		},

		/**
		 * @param {Object} serialized
		 */
		setSerialized: function ( serialized ) {
			var deed;

			if ( serialized.name && serialized.name in this.deeds ) {
				deed = this.deeds[ serialized.name ];
				deed.setSerialized( serialized );
				this.selectDeed( deed );
			}
		}

	};

}() );
