( function ( uw ) {
	let dialog, windowManager;

	/**
	 * Modal dialog showing the rendered preview of the wikitext an upload will
	 * be saved with.
	 *
	 * @class
	 * @extends OO.ui.ProcessDialog
	 * @inheritdoc
	 */
	uw.PreviewDialog = function UWPreviewDialog( config ) {
		uw.PreviewDialog.super.call( this, config );
	};
	OO.inheritClass( uw.PreviewDialog, OO.ui.ProcessDialog );

	uw.PreviewDialog.static.name = 'uwPreviewDialog';
	uw.PreviewDialog.static.size = 'larger';
	uw.PreviewDialog.static.title = OO.ui.deferMsg( 'mwe-upwiz-preview-title' );
	uw.PreviewDialog.static.actions = [ {
		action: 'close',
		label: OO.ui.deferMsg( 'ooui-dialog-process-dismiss' ),
		flags: [ 'safe', 'close' ]
	} ];

	uw.PreviewDialog.prototype.initialize = function () {
		uw.PreviewDialog.super.prototype.initialize.call( this );

		// expanded + scrollable: the body has a fixed height (see getBodyHeight),
		// and the rendered content scrolls within it
		this.content = new OO.ui.PanelLayout( { padded: true, expanded: true, scrollable: true } );
		this.$body.append( this.content.$element );
	};

	uw.PreviewDialog.prototype.getActionProcess = function () {
		return new OO.ui.Process( () => {
			this.close();
		} );
	};

	uw.PreviewDialog.prototype.getBodyHeight = function () {
		// The rendered page is usually taller than the viewport, so rather than
		// sizing to the content we claim most of the window and scroll.
		return Math.round( $( window ).height() * 0.75 );
	};

	/**
	 * @param {jQuery} $content
	 */
	uw.PreviewDialog.prototype.setContent = function ( $content ) {
		this.content.$element.empty().append( $content );
	};

	/**
	 * Open the shared preview dialog, spinning until the given promise resolves
	 * with the content to show.
	 *
	 * @param {jQuery.Promise} promise Promise resolving with {jQuery} content
	 */
	uw.PreviewDialog.open = function ( promise ) {
		if ( !windowManager ) {
			dialog = new uw.PreviewDialog();
			windowManager = new OO.ui.WindowManager();
			windowManager.addWindows( [ dialog ] );
			$( document.body ).append( windowManager.$element );
		}

		dialog.setContent( $.createSpinner( { size: 'large', type: 'block' } ) );
		windowManager.openWindow( dialog );

		promise.then(
			( $content ) => dialog.setContent( $content ),
			( code, result ) => dialog.setContent( new OO.ui.MessageWidget( {
				type: 'error',
				label: $( '<div>' ).append(
					$( '<p>' ).html( result && result.errors ? result.errors[ 0 ].html : '' ),
					$( '<p>' ).append( $( '<code>' ).text( code ) )
				)
			} ).$element )
		);
	};

}( mw.uploadWizard ) );
