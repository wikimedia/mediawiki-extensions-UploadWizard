( function ( uw ) {
	QUnit.module( 'uw.ui.Details', QUnit.newMwEnvironment() );

	QUnit.test( 'cancelSubmitting calls morphCrossfade with .detailsForm, enableEdits, and restores end-step buttons', function ( assert ) {
		const enableEditsStub = this.sandbox.stub();
		const findResults = {};
		const sandbox = this.sandbox;
		const findStub = this.sandbox.stub().callsFake( ( selector ) => {
			if ( !findResults[ selector ] ) {
				findResults[ selector ] = {
					morphCrossfade: sandbox.stub(),
					hide: sandbox.stub(),
					show: sandbox.stub()
				};
			}
			return findResults[ selector ];
		} );
		const ui = {
			$div: { find: findStub },
			enableEdits: enableEditsStub
		};

		uw.ui.Details.prototype.cancelSubmitting.call( ui );

		const dataResult = findResults[ '.mwe-upwiz-data' ];
		const failedResult = findResults[ '.mwe-upwiz-file-next-some-failed, .mwe-upwiz-file-next-all-failed' ];
		const okResult = findResults[ '.mwe-upwiz-file-next-all-ok' ];

		assert.strictEqual( dataResult.morphCrossfade.callCount, 1 );
		assert.strictEqual( dataResult.morphCrossfade.getCall( 0 ).args[ 0 ], '.detailsForm' );
		assert.strictEqual( enableEditsStub.callCount, 1 );
		assert.strictEqual( failedResult.hide.callCount, 1 );
		assert.strictEqual( okResult.show.callCount, 1 );
	} );

}( mw.uploadWizard ) );
