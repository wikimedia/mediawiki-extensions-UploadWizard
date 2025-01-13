/**
 * Create a group of radio buttons for licenses. N.B. the licenses are named after the templates they invoke.
 * Note that this is very anti-MVC. The values are held only in the actual form elements themselves.
 *
 * @class
 * @extends OO.ui.Widget
 * @param {Object} config Configuration. Must have following properties:
 * @param {string} config.type Whether inclusive or exclusive license allowed ("and"|"or")
 * @param {string[]} config.licenses Template string names (matching keys in mw.UploadWizard.config.licenses)
 * @param {Object[]} [config.licenseGroups] Groups of licenses, with more explanation
 * @param {string} [config.special] Indicates, don't put licenses here, instead use a special widget
 * @param {number} count Number of the things we are licensing (it matters to some texts)
 * @param {mw.Api} api API object, used for wikitext previews
 */
mw.UploadWizardLicenseInput = function ( config, count, api ) {
	mw.UploadWizardLicenseInput.super.call( this );
	OO.ui.mixin.GroupElement.call( this );

	this.count = count;
	this.api = api;

	if (
		config.type === undefined ||
		( config.licenses === undefined && config.licenseGroups === undefined )
	) {
		throw new Error( 'improper initialization' );
	}

	this.type = config.type === 'or' ? 'radio' : 'checkbox';

	this.defaults = [];
	if ( config.defaults ) {
		this.defaults = config.defaults instanceof Array ? config.defaults : [ config.defaults ];
	}

	// create inputs and licenses from config
	if ( config.licenseGroups === undefined ) {
		const group = new mw.uploadWizard.LicenseGroup( config, this.type, this.api, this.count );
		const groupField = new mw.uploadWizard.FieldLayout( group, {} );
		group.connect( groupField, { change: [ 'emit', 'change' ] } );

		this.addItems( [ groupField ] );
		this.$element.append( this.$group );
	} else {
		const options = config.licenseGroups.map( ( groupConfig ) => {
			const classes = [ 'mwe-upwiz-deed-license-group-head', 'mwe-upwiz-deed-license-group-' + groupConfig.head ];

			const $icons = $( '<span>' );
			( groupConfig.icons || [] ).forEach( ( icon ) => {
				$icons.append( $( '<span>' ).addClass( 'mwe-upwiz-license-icon mwe-upwiz-' + icon + '-icon' ) );
			} );

			// 'url' can be either a single (string) url, or an array of (string) urls;
			// hence this convoluted variable-length parameters assembly...
			const labelParams = [ groupConfig.head, this.count ].concat( groupConfig.url ).concat( $icons );
			const label = groupConfig.head && mw.message.apply( mw.message, labelParams ).parse() || '';
			const labelExtraParams = [ groupConfig[ 'head-extra' ], this.count ].concat( groupConfig.url ).concat( $icons );
			const labelExtra = groupConfig[ 'head-extra' ] && mw.message.apply( mw.message, labelExtraParams ).parse() || '';

			if ( this.type === 'radio' ) {
				return new OO.ui.RadioOptionWidget( {
					label: $( '<span>' )
						.append( label )
						.append( $( '<span>' ).addClass( 'mwe-upwiz-label-extra' ).append( labelExtra ) )
						.contents(),
					classes: classes
				} );
			} else { // if ( this.type === 'checkbox' ) {
				return new OO.ui.CheckboxMultioptionWidget( {
					label: $( '<span>' )
						.append( label )
						.append( $( '<span>' ).addClass( 'mwe-upwiz-label-extra' ).append( labelExtra ) )
						.contents(),
					classes: classes
				} );
			}
		} );
		this.widget = this.type === 'radio' ? new OO.ui.RadioSelectWidget() : new OO.ui.CheckboxMultiselectWidget();
		this.widget.addItems( options );

		const groupFields = config.licenseGroups.map( ( groupConfig ) => {
			const group = new mw.uploadWizard.LicenseGroup(
				groupConfig,
				// group config can override overall type; e.g. a single group can be "and", while
				// the rest of the config can be "or"
				( groupConfig.type || config.type ) === 'or' ? 'radio' : 'checkbox',
				this.api,
				this.count
			);

			const groupField = new mw.uploadWizard.FieldLayout( group, {} );
			groupField.$element.addClass( 'mwe-upwiz-deed-subgroup' );
			group.connect( groupField, { change: [ 'emit', 'change' ] } );

			return groupField;
		} );
		this.addItems( groupFields );

		// link option to the groups they're associated with, so we can easily move from
		// one to the other when they need to be interacted with
		groupFields.forEach( ( groupField, i ) => {
			groupField.option = options[ i ];
		} );

		this.$element.append(
			$( '<div>' )
				.addClass( 'mwe-upwiz-deed-license-group-container' )
				.append( this.widget.$group )
		);

		this.widget.on( 'select', ( selectedOption, isSelected ) => {
			this.emit( 'change' );

			// radios don't have a second 'selected' arg; they're always true
			isSelected = isSelected || true;

			// radio groups won't fire events for group that got deselected
			// (as a results of a new one being selected), so we'll iterate
			// all groups to remove no-longer-active ones
			this.getItems().forEach( ( groupField ) => {
				const group = groupField.fieldWidget,
					option = groupField.option,
					defaultLicenses = ( group.config.defaults || [] ).reduce( ( defaults, license ) => {
						defaults[ license ] = true;
						return defaults;
					}, {} );

				if ( !option.isSelected() ) {
					// collapse & nix any inputs that may have been selected in groups that
					// are no longer active/selected
					groupField.$element.detach();
					group.setValue( {} );
				} else {
					// attach group license selector
					option.$label.append( groupField.$element );

					// check the defaults (insofar they exist) for newly selected groups;
					// ignore groups that had already been selected to ensure existing
					// user input is not tampered with
					if (
						isSelected &&
						option === selectedOption &&
						Object.keys( group.getValue() ).length <= 0
					) {
						group.setValue( defaultLicenses );
					}
				}
			} );
		} );
	}

	this.aggregate( { change: 'change' } );

};
OO.inheritClass( mw.UploadWizardLicenseInput, OO.ui.Widget );
OO.mixinClass( mw.UploadWizardLicenseInput, OO.ui.mixin.GroupElement );
OO.mixinClass( mw.UploadWizardLicenseInput, mw.uploadWizard.ValidatableElement );

Object.assign( mw.UploadWizardLicenseInput.prototype, {
	unload: function () {
		this.getItems().forEach( ( groupField ) => {
			groupField.fieldWidget.unload();
		} );
	},

	/**
	 * Sets the value(s) of a license input. This is a little bit klugey because it relies on an inverted dict, and in some
	 * cases we are now letting license inputs create multiple templates.
	 *
	 * @memberof mw.UploadWizardLicenseInput
	 * @param {Object} values License-key to boolean values, e.g. { 'cc_by_sa_30': true, gfdl: true, 'flickrreview|cc_by_sa_30': false }
	 * @param {string} [groupName] Name of group, when values are only relevant to this group
	 */
	setValues: function ( values, groupName ) {
		const selectedGroups = [];

		this.getItems().forEach( ( groupField ) => {
			const group = groupField.fieldWidget;
			if ( groupName === undefined || group.getGroup() === groupName ) {
				group.setValue( values );
				if ( Object.keys( group.getValue() ).length > 0 ) {
					selectedGroups.push( group );
				}
			} else if ( this.type === 'radio' ) {
				// when we're dealing with radio buttons and there are changes in another
				// group, then we'll need to clear out this group...
				group.setValue( {} );
			}
		} );

		if ( selectedGroups.length > 1 && this.type === 'radio' ) {
			// leave the last one alone - that one can remain selected
			selectedGroups.pop();

			// if we've selected things in multiple groups (= when the group was not defined,
			// which is basically only when dealing with defaults, from config or user
			// preferences), we need to make sure we're left with only 1 selected radio in
			// 1 group
			// in that case, we're only going to select the *last* occurrence, which is what
			// a browser would do when trying to find/select a radio that occurs twice
			selectedGroups.forEach( ( group ) => {
				group.setValue( {} );
			} );
		}

		// in the case of multiple option groups (with a parent radio/check to expand/collapse),
		// we need to make sure the parent option and expanded state match the state of the
		// group - when the group has things that are selected, it must be active
		this.getItems().forEach( ( groupField ) => {
			const group = groupField.fieldWidget,
				option = groupField.option,
				selected = Object.keys( group.getValue() ).length > 0;

			if ( !option ) {
				return;
			}

			option.setSelected( selected );
			if ( selected ) {
				option.$element.append( groupField.$element );
				// there's an event listener bound to respond to changes when an option
				// is selected, but that in only triggered by manual (user) selection;
				// we're programmatically updating values here, and need to make sure
				// it also responds to these
				this.widget.emit( 'select', option, true );
			} else {
				groupField.$element.detach();
			}
		} );
	},

	/**
	 * Set the default configured licenses
	 *
	 * @memberof mw.UploadWizardLicenseInput
	 */
	setDefaultValues: function () {
		const values = {};
		this.defaults.forEach( ( license ) => {
			values[ license ] = true;
		} );
		this.setValues( values );
	},

	/**
	 * Gets the selected license(s). The returned value will be a license
	 * key => license props map, as defined in UploadWizard.config.php.
	 *
	 * @memberof mw.UploadWizardLicenseInput
	 * @return {Object}
	 */
	getLicenses: function () {
		const licenses = {};

		this.getItems().forEach( ( groupField ) => {
			const group = groupField.fieldWidget,
				licenseNames = Object.keys( group.getValue() );

			licenseNames.forEach( ( name ) => {
				licenses[ name ] = mw.UploadWizard.config.licenses[ name ] || {};
			} );
		} );

		return licenses;
	},

	/**
	 * Gets the wikitext associated with all selected inputs. Some inputs also have associated textareas so we append their contents too.
	 *
	 * @memberof mw.UploadWizardLicenseInput
	 * @return {string} of wikitext (empty string if no inputs set)
	 */
	getWikiText: function () {
		return this.getItems().map( ( groupField ) => groupField.fieldWidget.getWikiText() ).join( '' ).trim();
	},

	/**
	 * See mw.uploadWizard.DetailsWidget
	 *
	 * @memberof mw.UploadWizardLicenseInput
	 * @param {boolean} thorough
	 * @return {jQuery.Promise<mw.uploadWizard.ValidationStatus>}
	 */
	validate: function ( thorough ) {
		// Gather errors from each item
		const status = new mw.uploadWizard.ValidationStatus(),
			selectedGroupPromises = this.getItems()
				.reduce( ( promises, groupField ) => {
					// validate all fields; allowing previously invalid subgroups to be re-validated
					// (e.g. clearing out errors), even when they're not selected
					const promise = groupField.validate( thorough );
					// but only use the validation result of the selected groups (or the only available
					// group if there is no choice)
					if ( groupField.option === undefined || groupField.option.isSelected() ) {
						promises.push( promise );
					}
					return promises;
				}, [] );

		if ( thorough !== true ) {
			// `thorough` is the strict checks executed on submit, but we don't want errors
			// to change/display every change event
			return status.resolve();
		}

		if ( selectedGroupPromises.length === 0 ) {
			status.addError( mw.message( 'mwe-upwiz-deeds-require-selection' ) );
		}

		return mw.uploadWizard.ValidationStatus.mergePromises( ...selectedGroupPromises ).then(
			// license groups are valid
			() => status.getErrors().length === 0 ? status.resolve() : status.reject(),
			// there was an error in one of the license groups; we'll still want
			// to reject, but those child messages need not be added into this status
			// object, since they'll already be displayed within those child widgets
			() => status.reject()
		);
	},

	/**
	 * @memberof mw.UploadWizardLicenseInput
	 * @return {Object}
	 */
	getSerialized: function () {
		const values = {};

		this.getItems().forEach( ( groupField ) => {
			const group = groupField.fieldWidget;
			const groupName = group.getGroup();
			const value = group.getValue();

			if ( Object.keys( value ).length > 0 ) {
				// $.extend just in case there are multiple groups with the same name...
				values[ groupName ] = Object.assign( {}, values[ groupName ] || {}, value );
			}
		} );

		return values;
	},

	/**
	 * @memberof mw.UploadWizardLicenseInput
	 * @param {Object} serialized
	 */
	setSerialized: function ( serialized ) {
		Object.keys( serialized ).forEach( ( groupName ) => {
			this.setValues( serialized[ groupName ], groupName );
		} );
	}

} );
