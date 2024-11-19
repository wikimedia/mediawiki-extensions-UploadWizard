( function () {

	/**
	 * Interface widget to choose among various deeds -- for instance, if own work, or not own work, or other such cases.
	 *
	 * @class
	 * @mixes OO.EventEmitter
	 * @param {Object} config The UW config
	 * @param {Object} deeds Keyed object of UploadWizardDeed items
	 * @param {mw.UploadWizardUpload[]} uploads Uploads that this applies to (this is just to make deleting and plurals work)
	 */
	mw.UploadWizardDeedChooser = function ( config, deeds, uploads ) {
		OO.EventEmitter.call( this );

		this.uploads = uploads;
		this.deeds = deeds;

		// Name for radio button set
		mw.UploadWizardDeedChooser.prototype.widgetCount++;
		this.name = 'deedChooser' + mw.UploadWizardDeedChooser.prototype.widgetCount.toString();

		this.onLayoutReady = function () {};

		const $radioContainer = $( '<div>' ).addClass( 'mwe-upwiz-deed-radios' );
		const $formContainer = $( '<div>' ).addClass( 'mwe-upwiz-deed-forms' );
		this.$element = $( '<div>' ).addClass( 'mwe-upwiz-deeds-container' ).append(
			$radioContainer, $formContainer
		);

		Object.keys( this.deeds ).forEach( ( name ) => {
			const deed = this.deeds[ name ],
				radio = new OO.ui.RadioSelectWidget( { classes: [ 'mwe-upwiz-deed-radio-' + name ] } ),
				option = new OO.ui.RadioOptionWidget(),
				// Separate the radio option from its form
				$deedRadio = $( '<div>' ).addClass( 'mwe-upwiz-deed-option-title' ).append(
					$( '<span>' ).addClass( 'mwe-upwiz-deed-header' ).append(
						radio.$element
					)
				),
				$deedForm = $( '<div>' ).addClass( 'mwe-upwiz-deed mwe-upwiz-deed-' + deed.name ).append(
					$( '<div>' ).addClass( 'mwe-upwiz-deed-form' )
				).hide();

			option.setLabel( mw.message(
				'mwe-upwiz-source-' + deed.name + '-label',
				this.uploads.length
			).text() );

			radio.addItems( [ option ] );

			// Set the name attribute manually. We can't use RadioInputWidget which has
			// a name config because they don't emit change events. Ideally we would use
			// one RadioSelectWidget and not have to set this property.
			radio.items[ 0 ].radio.$input.attr( 'name', this.name );

			// Append intermediate containers
			$radioContainer.append( $deedRadio );
			$formContainer.append( $deedForm );

			deed.setFormFields( $deedForm.find( '.mwe-upwiz-deed-form' ) );

			if ( Object.keys( this.deeds ).length === 1 ) {
				this.onLayoutReady = this.selectDeed.bind( this, deed );
			} else {
				if ( config.licensing.defaultType === deed.name ) {
					this.onLayoutReady = this.selectDeed.bind( this, deed );
				}
				radio.on( 'choose', () => {
					this.selectDeed( deed );
				} );
			}
		} );

		// Deselect all deeds
		Object.keys( this.deeds ).forEach( ( name ) => {
			this.deselectDeedInterface( name );
		} );
	};
	OO.mixinClass( mw.UploadWizardDeedChooser, OO.EventEmitter );

	/**
	 * How many deed choosers there are (important for creating unique ids, element names)
	 */
	mw.UploadWizardDeedChooser.prototype.widgetCount = 0;

	/**
	 * Check if this form is filled out correctly.
	 *
	 * @return {boolean} true if valid, false if not
	 */
	mw.UploadWizardDeedChooser.prototype.valid = function () {
		return !!this.deed;
	};

	/**
	 * Uploads this deed controls
	 */
	mw.UploadWizardDeedChooser.prototype.uploads = [];

	mw.UploadWizardDeedChooser.prototype.selectDeed = function ( deed ) {
		this.choose( deed );
		this.selectDeedInterface( deed.name );
	};

	mw.UploadWizardDeedChooser.prototype.choose = function ( deed ) {
		this.deed = deed;
		this.emit( 'choose' );
	};

	/**
	 * From the deed choices, make a choice fade to the background a bit, hide the extended form
	 *
	 * @param {string} deedName
	 */
	mw.UploadWizardDeedChooser.prototype.deselectDeedInterface = function ( deedName ) {
		const $deedRadio = this.$element.find( '.mwe-upwiz-deed-radio-' + deedName + ' input' ),
			$deedForm = this.$element.find( '.mwe-upwiz-deed.mwe-upwiz-deed-' + deedName );

		$deedRadio.prop( 'checked', false );
		$deedForm.removeClass( 'selected' );
		// Prevent validation of deselected deeds by disabling all form inputs
		// TODO: Use a tag selector
		// eslint-disable-next-line no-jquery/no-sizzle
		$deedForm.find( ':input' ).prop( 'disabled', true );
		$deedForm.hide();
	};

	/**
	 * From the deed choice page, show a particular deed
	 *
	 * @param {string} deedName
	 */
	mw.UploadWizardDeedChooser.prototype.selectDeedInterface = function ( deedName ) {
		const $deedRadio = this.$element.find( '.mwe-upwiz-deed-radio-' + deedName + ' input' ),
			$deedForm = this.$element.find( '.mwe-upwiz-deed.mwe-upwiz-deed-' + deedName );

		// deselect all other deeds
		Object.keys( this.deeds ).forEach( ( name ) => {
			if ( name === deedName ) {
				return;
			}
			this.deselectDeedInterface( name );
		} );

		$deedRadio.prop( 'checked', true );
		$deedForm.addClass( 'selected' );
		// (Re-)enable all form inputs
		// TODO: Use a tag selector
		// eslint-disable-next-line no-jquery/no-sizzle
		$deedForm.find( ':input' ).prop( 'disabled', false );
		$deedForm.show();
	};

	mw.UploadWizardDeedChooser.prototype.remove = function () {
		Object.keys( this.deeds ).forEach( ( name ) => {
			this.deeds[ name ].unload();
		} );

		this.$element.remove();
	};

	/**
	 * @return {Object}
	 */
	mw.UploadWizardDeedChooser.prototype.getSerialized = function () {
		return this.valid() ? this.deed.getSerialized() : {};
	};

	/**
	 * @param {Object} serialized
	 */
	mw.UploadWizardDeedChooser.prototype.setSerialized = function ( serialized ) {
		let deed;

		if ( serialized.name && serialized.name in this.deeds ) {
			deed = this.deeds[ serialized.name ];
			deed.setSerialized( serialized );
			this.selectDeed( deed );
		}
	};

}() );
