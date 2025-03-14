( function ( uw ) {
	/**
	 * @class
	 * @extends OO.ui.Dialog
	 * @inheritdoc
	 */
	uw.LicensePreviewDialog = function UWLicensePreviewDialog( config ) {
		uw.LicensePreviewDialog.super.call( this, config );
	};
	OO.inheritClass( uw.LicensePreviewDialog, OO.ui.Dialog );

	uw.LicensePreviewDialog.static.name = 'licensePreviewDialog';

	uw.LicensePreviewDialog.prototype.initialize = function () {
		uw.LicensePreviewDialog.super.prototype.initialize.call( this );

		this.content = new OO.ui.PanelLayout( { padded: true, expanded: false } );
		this.$body.append( this.content.$element );
		this.$spinner = $.createSpinner( { size: 'large', type: 'block' } )
			.css( { width: 200, padding: 20, float: 'none', margin: '0 auto' } );

		$( document.body ).on( 'click', ( e ) => {
			if ( !$.contains( this.$body.get( 0 ), e.target ) ) {
				this.close();
			}
		} );
	};

	uw.LicensePreviewDialog.prototype.addCloseButton = function () {
		const closeButton = new OO.ui.ButtonWidget( {
			label: OO.ui.msg( 'ooui-dialog-process-dismiss' )
		} );

		closeButton.on( 'click', () => {
			this.close();
		} );

		this.content.$element.append( closeButton.$element );
	};

	uw.LicensePreviewDialog.prototype.getBodyHeight = function () {
		return this.content.$element.outerHeight( true );
	};

	uw.LicensePreviewDialog.prototype.setLoading = function ( isLoading ) {
		if ( isLoading ) {
			this.content.$element.empty().append( this.$spinner );
			this.addCloseButton();
		} else {
			this.content.$element.empty();
		}

		this.updateSize();
	};

	uw.LicensePreviewDialog.prototype.setPreview = function ( html ) {
		this.content.$element.empty().append( html );
		this.addCloseButton();
		this.updateSize();
	};

}( mw.uploadWizard ) );
