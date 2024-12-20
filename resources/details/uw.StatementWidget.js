( function ( uw ) {

	/**
	 * @constructor
	 * @param {Object} config Configuration options
	 * @param {string} config.propertyId Property ID (e.g. P180 id of `depicts` property)
	 */
	uw.StatementWidget = function UWStatementWidget( config ) {
		const EntityInputWidget =
			mw.loader.require( 'wikibase.mediainfo.statements' ).inputs.EntityInputWidget,
			FormatValueElement =
				mw.loader.require( 'wikibase.mediainfo.base' ).FormatValueElement;

		this.propertyId = config.propertyId;
		this.datamodel = mw.loader.require( 'wikibase.datamodel' );
		this.formatValueElement = new FormatValueElement();
		this.placeholder = config.placeholder;

		uw.StatementWidget.super.call( this, config );
		this.$element.addClass( 'mwe-upwiz-statementWidget' );

		this.input = new EntityInputWidget( {
			isQualifier: false,
			type: 'wikibase-entityid',
			disabled: false,
			hideSnakTypeWidget: true,
			$overlay: true,
			icon: '',
			label: '',
			placeholder: this.placeholder
		} );
		this.input.$element.addClass( 'mwe-upwiz-statement-input' );
		this.$element.append( this.input.$element );
		this.input.connect( this, { add: 'addTagFromInput' } );
		this.input.connect( this, { focus: 'onFocus' } );
		this.input.connect( this, { blur: 'onBlur' } );

		OO.ui.mixin.GroupWidget.call( this, config );
		this.setGroupElement( this.$element );
		this.aggregate( {
			remove: 'itemRemove',
			change: [ 'emit', 'change' ]
		} );
		this.connect( this, {
			itemRemove: 'onTagRemove'
		} );
	};

	OO.inheritClass( uw.StatementWidget, OO.ui.Widget );
	OO.mixinClass( uw.StatementWidget, OO.ui.mixin.GroupWidget );
	OO.mixinClass( uw.StatementWidget, uw.ValidatableElement );

	uw.StatementWidget.prototype.onFocus = function () {
		this.$element.addClass( 'mwe-upwiz-statementWidget-active' );
	};

	uw.StatementWidget.prototype.onBlur = function () {
		this.input.clear();
		this.$element.removeClass( 'mwe-upwiz-statementWidget-active' );
	};

	/**
	 * Receives a DataValue from the input widget and uses it to create a new Tag
	 */
	uw.StatementWidget.prototype.addTagFromInput = function () {
		this.addTag( this.input.getData() );
	};

	/**
	 * @param {dataValues.DataValue} dataValue
	 */
	uw.StatementWidget.prototype.addTag = function ( dataValue ) {
		const data = this.createStatement( dataValue );

		this.formatValueElement.formatValue(
			dataValue, 'text/plain', null, this.propertyId
		).then( ( label ) => {
			if ( this.findItemFromData( data ) === null ) {
				const tag = new OO.ui.TagItemWidget( {
					label: label, data: data
				} );
				this.addItems( [ tag ] );
				this.updateInputSize();
			}
			this.input.clear();
		} );
	};

	/**
	 * @inheritDoc
	 */
	// eslint-disable-next-line no-unused-vars
	uw.StatementWidget.prototype.validate = function ( thorough ) {
		const status = new uw.ValidationStatus(),
			maxDepicts = 3;

		if ( this.getItems().length > maxDepicts ) {
			status.addNotice( mw.message( 'mwe-upwiz-statements-too-many-items', maxDepicts ) );
		}

		return status.resolve();
	};

	/**
	 * @param {datamodel.StatementList} data
	 */
	uw.StatementWidget.prototype.setData = function ( data ) {
		const statements = data.toArray();

		statements.forEach( ( statement ) => {
			const dataValue = statement.getClaim().getMainSnak().getValue();
			this.addTag( dataValue );
		} );
	};

	/**
	 * @param {datamodel.StatementList} data
	 */
	uw.StatementWidget.prototype.resetData = function ( data ) {
		this.clearItems();
		this.setData( data );
	};

	uw.StatementWidget.prototype.onTagRemove = function ( tag ) {
		const item = this.findItemFromData( tag.getData() );
		this.removeItems( [ item ] );
		this.updateInputSize();
	};

	/**
	 * @param {dataValues.DataValue} dataValue
	 * @return {datamodel.Statement}
	 */
	uw.StatementWidget.prototype.createStatement = function ( dataValue ) {
		const snak = new this.datamodel.PropertyValueSnak( this.propertyId, dataValue, null );

		return new this.datamodel.Statement(
			new this.datamodel.Claim(
				snak
			)
		);
	};

	/**
	 * @return {datamodel.StatementList}
	 */
	uw.StatementWidget.prototype.getStatementList = function () {
		return new this.datamodel.StatementList(
			this.getItems().map( ( item ) => item.getData() )
		);
	};

	/**
	 * Copied (more or less) from OO.ui.TagMultiselectWidget
	 *
	 * Update the dimensions of the text input field to encompass all available area.
	 * This is especially relevant for when the input is at the edge of a line
	 * and should get smaller. The usual operation (as an inline-block with min-width)
	 * does not work in that case, pushing the input downwards to the next line.
	 *
	 * @private
	 */
	uw.StatementWidget.prototype.updateInputSize = function () {
		const containerWidth = this.$element.width();

		let tagsWidth = 0;
		this.input.$element.detach();
		this.getItems().forEach( ( item ) => {
			tagsWidth += item.$element.outerWidth();
		} );
		let newWidth = containerWidth - tagsWidth - 20;

		// if the new width is too narrow, expand to the container size instead (forces input onto
		// a new line)
		if ( this.placeholderWidth === undefined ) {
			// FIXME - calculate this rather than setting an arbitrary value
			this.placeholderWidth = 200;
		}
		if ( newWidth < this.placeholderWidth ) {
			newWidth = containerWidth;
		}

		this.input.$element.width( newWidth );
		this.$group.append( this.input.$element );
	};

}( mw.uploadWizard ) );
