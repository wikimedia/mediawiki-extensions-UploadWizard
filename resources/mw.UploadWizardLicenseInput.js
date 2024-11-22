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
	const groups = [];
	if ( config.licenseGroups === undefined ) {
		const group = new mw.uploadWizard.LicenseGroup( config, this.type, this.api, this.count );
		groups.push( group );
		this.$element.append( this.$group );
	} else {
		const input = this,
			$container = $( '<div>' ).addClass( 'mwe-upwiz-deed-license-group-container' );

		this.widget = this.type === 'radio' ? new OO.ui.RadioSelectWidget() : new OO.ui.CheckboxMultiselectWidget();

		this.$element.append( $container );

		config.licenseGroups.forEach( ( groupConfig ) => {
			const classes = [ 'mwe-upwiz-deed-license-group-head', 'mwe-upwiz-deed-license-group-' + groupConfig.head ];

			const $icons = $( '<span>' );
			( groupConfig.icons || [] ).forEach( ( icon ) => {
				$icons.append( $( '<span>' ).addClass( 'mwe-upwiz-license-icon mwe-upwiz-' + icon + '-icon' ) );
			} );

			// 'url' can be either a single (string) url, or an array of (string) urls;
			// hence this convoluted variable-length parameters assembly...
			const labelParams = [ groupConfig.head, input.count ].concat( groupConfig.url ).concat( $icons );
			const label = groupConfig.head && mw.message.apply( mw.message, labelParams ).parse() || '';

			let option;
			if ( input.type === 'radio' ) {
				option = new OO.ui.RadioOptionWidget( {
					label: new OO.ui.HtmlSnippet( label ),
					classes: classes
				} );
			} else if ( input.type === 'checkbox' ) {
				option = new OO.ui.CheckboxMultioptionWidget( {
					label: new OO.ui.HtmlSnippet( label ),
					classes: classes
				} );
			}
			input.widget.addItems( [ option ] );

			const group = new mw.uploadWizard.LicenseGroup(
				Object.assign( {}, groupConfig, { option: option } ),
				// group config can override overall type; e.g. a single group can be "and", while
				// the rest of the config can be "or"
				( groupConfig.type || config.type ) === 'or' ? 'radio' : 'checkbox',
				input.api,
				input.count
			);
			group.$element.addClass( 'mwe-upwiz-deed-subgroup' );
			groups.push( group );
		} );
		$container.append( input.widget.$element );

		this.widget.on( 'select', ( selectedOption, isSelected ) => {
			// radios don't have a second 'selected' arg; they're always true
			isSelected = isSelected || true;

			// radio groups won't fire events for group that got deselected
			// (as a results of a new one being selected), so we'll iterate
			// all groups to remove no-longer-active ones
			groups.forEach( ( group ) => {
				const option = group.config.option,
					defaultLicenses = ( group.config.defaults || [] ).reduce( ( defaults, license ) => {
						defaults[ license ] = true;
						return defaults;
					}, {} );

				if ( !option.isSelected() ) {
					// collapse & nix any inputs that may have been selected in groups that
					// are no longer active/selected
					group.$element.detach();
					group.setValue( {} );
				} else {
					// attach group license selector
					option.$element.after( group.$element );

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

	this.addItems( groups );
	this.aggregate( { change: 'change' } );

	// [wikitext => list of templates used in wikitext] map, used in
	// getUsedTemplates to reduce amount of API calls
	this.templateCache = {};
};
OO.inheritClass( mw.UploadWizardLicenseInput, OO.ui.Widget );
OO.mixinClass( mw.UploadWizardLicenseInput, OO.ui.mixin.GroupElement );

Object.assign( mw.UploadWizardLicenseInput.prototype, {
	unload: function () {
		this.getItems().forEach( ( group ) => {
			group.unload();
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

		const input = this;
		this.getItems().forEach( ( group ) => {
			if ( groupName === undefined || group.getGroup() === groupName ) {
				group.setValue( values );
				if ( Object.keys( group.getValue() ).length > 0 ) {
					selectedGroups.push( group );
				}
			} else if ( input.type === 'radio' ) {
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
		this.getItems().forEach( ( group ) => {
			const option = group.config.option,
				selected = Object.keys( group.getValue() ).length > 0;

			if ( !option ) {
				return;
			}

			option.setSelected( selected );
			if ( selected ) {
				option.$element.append( group.$element );
				// there's an event listener bound to respond to changes when an option
				// is selected, but that in only triggered by manual (user) selection;
				// we're programmatically updating values here, and need to make sure
				// it also responds to these
				input.widget.emit( 'select', option, true );
			} else {
				group.$element.detach();
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

		this.getItems().forEach( ( group ) => {
			const licenseNames = Object.keys( group.getValue() );
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
		return this.getItems().map( ( group ) => group.getWikiText() ).join( '' ).trim();
	},

	/**
	 * Returns a list of templates used & transcluded in given wikitext
	 *
	 * @memberof mw.UploadWizardLicenseInput
	 * @param {string} wikitext
	 * @return {jQuery.Promise} Promise that resolves with an array of template names
	 */
	getUsedTemplates: function ( wikitext ) {
		if ( wikitext in this.templateCache ) {
			return $.Deferred().resolve( this.templateCache[ wikitext ] ).promise();
		}

		const input = this;
		return this.api.get( {
			action: 'parse',
			pst: true,
			prop: 'templates',
			title: 'File:UploadWizard license verification.png',
			text: wikitext
		} ).then( ( result ) => {
			const templates = [];
			for ( let i = 0; i < result.parse.templates.length; i++ ) {
				const template = result.parse.templates[ i ];

				// normalize templates to mw.Title.getPrefixedDb() format
				const title = new mw.Title( template.title, template.ns );
				templates.push( title.getPrefixedDb() );
			}

			// cache result so we won't have to fire another API request
			// for the same content
			input.templateCache[ wikitext ] = templates;

			return templates;
		} );
	},

	/**
	 * See mw.uploadWizard.DetailsWidget
	 *
	 * @memberof mw.UploadWizardLicenseInput
	 * @return {jQuery.Promise}
	 */
	getErrors: function () {
		let errors = $.Deferred().resolve( [] ).promise();
		const addError = function ( message ) {
			errors = errors.then( ( errors ) => {
				errors.push( mw.message( message ) );
				return errors;
			} );
		};
		const selectedInputs = this.getSerialized();

		if ( Object.keys( selectedInputs ).length === 0 ) {
			addError( 'mwe-upwiz-deeds-require-selection' );
		} else {
			const input = this;
			// It's pretty hard to screw up a radio button, so if even one of them is selected it's okay.
			// But also check that associated text inputs are filled for if the input is selected, and that
			// they are the appropriate size.
			Object.keys( selectedInputs ).forEach( ( name ) => {
				const licenseMap = selectedInputs[ name ];

				Object.keys( licenseMap ).forEach( ( license ) => {
					const licenseValue = licenseMap[ license ];
					if ( typeof licenseValue !== 'string' ) {
						return;
					}

					const wikitext = licenseValue.trim();

					if ( wikitext === '' ) {
						addError( 'mwe-upwiz-error-license-wikitext-missing' );
					} else if ( wikitext.length < mw.UploadWizard.config.minCustomLicenseLength ) {
						addError( 'mwe-upwiz-error-license-wikitext-too-short' );
					} else if ( wikitext.length > mw.UploadWizard.config.maxCustomLicenseLength ) {
						addError( 'mwe-upwiz-error-license-wikitext-too-long' );
					} else if ( !/\{\{(.+?)\}\}/g.test( wikitext ) ) {
						// if text doesn't contain a template, we don't even
						// need to validate it any further...
						addError( 'mwe-upwiz-error-license-wikitext-missing-template' );
					} else if ( mw.UploadWizard.config.customLicenseTemplate !== false ) {
						// now do a thorough test to see if the text actually
						// includes a license template
						errors = $.when(
							errors, // array of existing errors
							input.getUsedTemplates( wikitext )
						).then( ( errors, usedTemplates ) => {
							if ( usedTemplates.indexOf( mw.UploadWizard.config.customLicenseTemplate ) < 0 ) {
								// no license template found, add another error
								errors.push( mw.message( 'mwe-upwiz-error-license-wikitext-missing-template' ) );
							}

							return errors;
						} );
					}
				} );
			} );
		}

		return errors;
	},

	/**
	 * See mw.uploadWizard.DetailsWidget
	 *
	 * @memberof mw.UploadWizardLicenseInput
	 * @return {jQuery.Promise}
	 */
	getWarnings: function () {
		return $.Deferred().resolve( [] ).promise();
	},

	/**
	 * @memberof mw.UploadWizardLicenseInput
	 * @return {Object}
	 */
	getSerialized: function () {
		const values = {};

		this.getItems().forEach( ( group ) => {
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
		const input = this;

		Object.keys( serialized ).forEach( ( groupName ) => {
			input.setValues( serialized[ groupName ], groupName );
		} );
	}

} );
