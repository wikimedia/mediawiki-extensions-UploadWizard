( function ( uw ) {

	/**
	 * A date field in UploadWizard's "Details" step form.
	 *
	 * @extends uw.DetailsWidget
	 * @class
	 * @param {Object} config Configuration options
	 * @param {mw.UploadWizardUpload} config.upload
	 */
	uw.DateDetailsWidget = function UWDateDetailsWidget( config ) {
		uw.DateDetailsWidget.super.call( this );

		this.upload = config.upload;
		this.prefilled = false;
		this.calendarButtonWidget = new OO.ui.ButtonWidget( {
			icon: 'calendar',
			flags: [ 'progressive' ],
			title: mw.msg( 'mwe-upwiz-calendar-date' )
		} );

		this.dateInputWidget = new OO.ui.TextInputWidget( {
			classes: [ 'mwe-date' ],
			placeholder: mw.msg( 'mwe-upwiz-select-date' )
		} );

		this.calendar = new mw.widgets.CalendarWidget( {
			lazyInitOnToggle: true
		} );
		this.calendar.toggle( false );
		// clicking the calendar icon toggles the calendar on/off,
		// clicking the input field always closes it
		this.calendarButtonWidget.on( 'click', () => this.calendar.toggle( !this.calendar.visible ) );
		this.dateInputWidget.on( 'click', () => this.calendar.toggle( false ) );
		// selecting a date from the calendar writes that date into the input field;
		// when anything changes in the input (either manual input or calendar selection),
		// the calendar closes & change event is emitted (but only once every 500ms)
		this.calendar.on( 'change', ( value ) => {
			this.dateInputWidget.setValue( value );
		} );
		this.dateInputWidget.on( 'change', () => {
			this.calendar.toggle( false );
		} );
		this.dateInputWidget.on( 'change', OO.ui.debounce( ( value ) => {
			this.emit( 'change', value );
		}, 500 ) );

		this.$element
			.addClass( 'mwe-upwiz-dateDetailsWidget' )
			.append(
				this.calendarButtonWidget.$element,
				$( '<div>' )
					.addClass( 'mw-widget-dateInputWidget' )
					.addClass( 'mwe-upwiz-dateDetailsWidget-date' )
					.append(
						this.dateInputWidget.$element,
						this.calendar.$element
							.addClass( 'mw-widget-dateInputWidget-calendar' )
					)
			);
	};
	OO.inheritClass( uw.DateDetailsWidget, uw.DetailsWidget );
	OO.mixinClass( uw.StatementWidget, uw.ValidatableElement );

	/**
	 * Tell whether the date input field was prefilled
	 * with a value extracted from the upload's metadata.
	 *
	 * @param {boolean} prefilled Whether the date is prefilled
	 */
	uw.DateDetailsWidget.prototype.setPrefilled = function ( prefilled ) {
		this.prefilled = prefilled;
	};

	/**
	 * Parse user input into a Wikibase date
	 * via the `wbparsevalue` API endpoint.
	 * See https://www.wikidata.org/w/api.php?action=help&modules=wbparsevalue
	 * and https://www.wikidata.org/wiki/Help:Dates.
	 *
	 * @return {jQuery.Promise} Promise with the API response
	 */
	uw.DateDetailsWidget.prototype.parseDate = function () {
		const userInput = this.dateInputWidget.getValue(),
			// Handle input that includes time:
			// it typically comes from the upload's EXIF metadata,
			// but might also be inserted by the user.
			// The Wikibase value parser won't accept it,
			// since dates with precision higher than day aren't supported.
			// See https://phabricator.wikimedia.org/T57755.
			// The API would return an opaque
			// 'wikibase-validator-malformed-value' error code:
			// avoid this by stripping time (in standard format)
			userInputWithoutTime = userInput.replace( /\D\d\d:\d\d:\d\d/, '' ),
			params = {
				action: 'wbparsevalue',
				datatype: 'time',
				validate: true,
				options: JSON.stringify(
					{ lang: mw.config.get( 'wgUserLanguage' ) }
				),
				values: userInputWithoutTime
			};

		return this.upload.api.get( params );
	};

	/**
	 * Gets the selected license(s). The returned value will be a license
	 * key => license props map, as defined in UploadWizard.config.php.
	 *
	 * @return {Object}
	 */
	uw.DateDetailsWidget.prototype.getLicenses = function () {
		if ( this.upload.deedChooser && this.upload.deedChooser.deed && this.upload.deedChooser.deed.licenseInput ) {
			return this.upload.deedChooser.deed.licenseInput.getLicenses();
		}

		// no license has been selected yet
		// this could happen when uploading multiple files and selecting to
		// provide copyright information for each file individually
		return {};
	};

	/**
	 * @inheritdoc
	 */
	// eslint-disable-next-line no-unused-vars
	uw.DateDetailsWidget.prototype.validate = function ( thorough ) {
		const status = new uw.ValidationStatus(),
			trimmedInput = this.dateInputWidget.getValue().trim(),
			inputDate = new Date( trimmedInput ),
			now = new Date(),
			licenses = this.getLicenses(),
			// Timestamps: milliseconds
			utc14 = 14 * 60 * 60 * 1000, // 14 hours in milliseconds
			// Dates: years, months, days
			old95 = new Date( now.getFullYear() - 95 ), // Only the year is relevant
			old70 = new Date( now.getFullYear() - 70, now.getMonth(), now.getDate() ),
			old100 = new Date( now.getFullYear() - 100, now.getMonth(), now.getDate() );

		let promise = $.Deferred().resolve().promise();

		if ( this.parseDateValidation ) {
			this.parseDateValidation.abort();
		}

		// Blank
		if ( trimmedInput === '' ) {
			status.addError( mw.message( 'mwe-upwiz-error-date-blank' ) );
			// Date in the future.
			// We don't really know what timezone this datetime is in. It could be the user's timezone, or
			// it could be the camera's timezone for data imported from EXIF, and we don't know what
			// timezone that is. UTC+14 is the highest timezone that currently exists, so assume that to
			// avoid giving false errors.
		} else if ( inputDate.getTime() > now.getTime() + utc14 ) {
			status.addError( mw.message( 'mwe-upwiz-error-postdate' ) );
			// License mismatch.
			// Public domain work in the U.S.: it must've been created at least 95 years ago.
		} else if ( 'pd-us' in licenses && inputDate >= old95 ) {
			status.addError(
				mw.message(
					'mwe-upwiz-error-date-license-mismatch',
					mw.message( licenses[ 'pd-us' ].msg ).parseDom()
				)
			);
		} else if ( 'pd-us-generic' in licenses && inputDate >= old95 ) {
			status.addError(
				mw.message(
					'mwe-upwiz-error-date-license-mismatch',
					mw.message( licenses[ 'pd-us-generic' ].msg ).parseDom()
				)
			);
			// The author died 70 years ago: the date should reflect that
		} else if ( 'pd-old-70' in licenses && inputDate > old70 ) {
			status.addError(
				mw.message(
					'mwe-upwiz-error-date-license-mismatch',
					mw.message( licenses[ 'pd-old-70' ].msg ).parseDom()
				)
			);
			// The author died 100 years ago: the date should reflect that
		} else if ( 'pd-old-100' in licenses && inputDate > old100 ) {
			status.addError(
				mw.message(
					'mwe-upwiz-error-date-license-mismatch',
					mw.message( licenses[ 'pd-old-100' ].msg ).parseDom()
				)
			);
		}

		// Unlikely license.
		if (
			// The `Date` constructor returns `NaN` if it couldn't parse the date.
			!isNaN( inputDate.valueOf() ) &&
			// It's unlikely for public-domain images to have been published today
			now.toISOString().slice( 0, 10 ) === inputDate.toISOString().slice( 0, 10 )
		) {
			// Public-domain licenses that likely mean
			// the image date is some time in the past.
			[ 'pd-usgov', 'pd-usgov-nasa', 'pd-art' ].forEach( ( warnLicense ) => {
				if ( warnLicense in licenses ) {
					const license = licenses[ warnLicense ];
					const licenseMsg = mw.message(
						license.msg,
						0,
						license.url ? license.url : '#missing license URL'
					);
					status.addWarning(
						mw.message(
							'mwe-upwiz-error-date-license-unlikely',
							licenseMsg.parseDom()
						)
					);
				}
			} );
		}

		if ( this.prefilled ) {
			status.addNotice( mw.message( 'mwe-upwiz-warning-date-prefilled' ) );
		}

		if ( this.dateInputWidget.getValue().trim() !== '' ) {
			this.parseDateValidation = this.parseDate();
			promise = this.parseDateValidation.then(
				( data ) => {
					const dayPrecision = 11;
					if ( data.results && data.results[ 0 ] && data.results[ 0 ].value.precision < dayPrecision ) {
						status.addNotice( mw.message( 'mwe-upwiz-notice-date-imprecise' ) );
					}
				},
				( code ) => {
					// warn on failures, except when the failure is http (request aborted
					// or network issues)
					if ( code !== 'http' ) {
						status.addNotice( mw.message( 'mwe-upwiz-notice-date-imprecise' ) );
					}
				}
			);
		}

		return promise.then( () => status.getErrors().length === 0 ? status.resolve() : status.reject() );
	};

	/**
	 * @inheritdoc
	 */
	uw.DateDetailsWidget.prototype.getWikiText = function () {
		return this.dateInputWidget.getValue().trim();
	};

	/**
	 * @inheritdoc
	 * @return {Object} See #setSerialized
	 */
	uw.DateDetailsWidget.prototype.getSerialized = function () {
		return {
			prefilled: this.prefilled,
			value: this.dateInputWidget.getValue()
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {boolean} serialized.prefilled Whether the date is prefilled
	 * @param {string} serialized.value Date value for the given mode
	 */
	uw.DateDetailsWidget.prototype.setSerialized = function ( serialized ) {
		// select the given date in the input widget
		this.calendar.setDate( serialized.value );
		// update the input widget last, at the end of the call stack (i.e.
		// after the calendar's change event has been emitted/handled), to
		// ensure the date input widget has the actual value, which may have
		// more precision (hours, minutes, seconds) than the calendar value
		setTimeout( () => {
			this.prefilled = serialized.prefilled;
			this.dateInputWidget.setValue( serialized.value );
		} );
	};

}( mw.uploadWizard ) );
