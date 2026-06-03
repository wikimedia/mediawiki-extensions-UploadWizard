( function ( uw ) {
	QUnit.module( 'uw.CaptchaHandler', QUnit.newMwEnvironment() );

	QUnit.test( 'clear removes container + message and nulls all fields', function ( assert ) {
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		const containerRemoveStub = this.sandbox.stub();
		const messageRemoveStub = this.sandbox.stub();
		handler.$captchaContainer = { remove: containerRemoveStub };
		handler.captchaMessage = { $element: { remove: messageRemoveStub } };
		handler.captchaWidget = { foo: 'bar' };
		handler.captchaLoadingPromise = $.Deferred().promise();
		handler.hasLoadError = true;

		handler.clear();

		assert.strictEqual( containerRemoveStub.callCount, 1 );
		assert.strictEqual( messageRemoveStub.callCount, 1 );
		assert.strictEqual( handler.$captchaContainer, null );
		assert.strictEqual( handler.captchaWidget, null );
		assert.strictEqual( handler.captchaMessage, null );
		assert.strictEqual( handler.captchaLoadingPromise, null );
		assert.false( handler.hasLoadError );
	} );

	QUnit.test( 'getCaptchaToken resolves to null when captchaWidget is null and no loading promise', ( assert ) => {
		const handler = new uw.CaptchaHandler( $( '<div>' ) );

		return handler.getCaptchaToken().then( ( result ) => {
			assert.strictEqual( result, null );
		} );
	} );

	QUnit.test( 'getCaptchaToken calls getCaptchaDataForSubmission when widget present', ( assert ) => {
		const captchaDataResult = { captchaId: '42', captchaWord: 'foo' };
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		handler.captchaWidget = {
			getCaptchaDataForSubmission: () => $.Deferred().resolve( captchaDataResult ).promise()
		};

		return handler.getCaptchaToken().then( ( result ) => {
			assert.deepEqual( result, captchaDataResult );
		} );
	} );

	QUnit.test( 'getCaptchaToken waits for captchaLoadingPromise before reading widget', ( assert ) => {
		const deferred = $.Deferred();
		const captchaDataResult = { captchaId: '99' };
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		handler.captchaLoadingPromise = deferred.promise();

		const promise = handler.getCaptchaToken();

		handler.captchaWidget = {
			getCaptchaDataForSubmission: () => $.Deferred().resolve( captchaDataResult ).promise()
		};
		deferred.resolve();

		return promise.then( ( result ) => {
			assert.deepEqual( result, captchaDataResult );
		} );
	} );

	QUnit.test( 'showLoadError removes previous captchaMessage and inserts new error widget', function ( assert ) {
		const oldRemoveStub = this.sandbox.stub();
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		handler.captchaMessage = { $element: { remove: oldRemoveStub } };
		this.sandbox.stub( OO.ui.Element.static, 'scrollIntoView' );

		handler.showLoadError( $( '<div>' ) );

		assert.strictEqual( oldRemoveStub.callCount, 1, 'old captchaMessage.$element.remove called' );
		assert.notStrictEqual( handler.captchaMessage, null );
		assert.true( handler.captchaMessage instanceof OO.ui.MessageWidget );
		assert.true( handler.hasLoadError, 'hasLoadError is set to true' );
	} );

	QUnit.test( 'getCaptchaToken rejects with \'captcha-load-failed\' when hasLoadError is set', async ( assert ) => {
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		handler.hasLoadError = true;

		await assert.rejects(
			handler.getCaptchaToken(),
			/captcha-load-failed/,
			'getCaptchaToken() should reject when hasLoadError is set'
		);
	} );

	QUnit.test( 'scrollTo uses captchaWidget input field when available, falls back to $captchaContainer otherwise', function ( assert ) {
		const scrollStub = this.sandbox.stub( OO.ui.Element.static, 'scrollIntoView' );
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		const $captchaContainer = $( '<div>' );

		handler.scrollTo( $captchaContainer );
		assert.strictEqual( scrollStub.getCall( 0 ).args[ 0 ], $captchaContainer[ 0 ], 'falls back to container[0]' );

		const inputField = { tagName: 'INPUT' };
		handler.captchaWidget = { getInputField: this.sandbox.stub().returns( inputField ) };
		handler.scrollTo( $captchaContainer );
		assert.strictEqual( scrollStub.getCall( 1 ).args[ 0 ], inputField, 'uses widget input field when available' );
	} );

	QUnit.test( 'show() rejection nulls captchaLoadingPromise so retry can re-attempt load', async function ( assert ) {
		const $buttons = $( '<div>' ).appendTo( '#qunit-fixture' );
		const handler = new uw.CaptchaHandler( $buttons );
		this.sandbox.stub( mw.loader, 'using' ).returns( $.Deferred().reject().promise() );
		this.sandbox.stub( OO.ui.Element.static, 'scrollIntoView' );

		await assert.rejects(
			handler.show( { type: 'math' } ),
			/captcha-load-failed/,
			'show() should reject when mw.loader.using rejects'
		);
		assert.strictEqual( handler.captchaLoadingPromise, null );
		assert.strictEqual( handler.captchaWidget, null );
	} );

	QUnit.test( 'getCaptchaToken logs, shows submit error, and re-throws when getCaptchaDataForSubmission rejects', async function ( assert ) {
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		const error = new Error( 'Captcha execution failed' );
		handler.$captchaContainer = $( '<div>' );
		handler.captchaWidget = {
			getCaptchaDataForSubmission: () => Promise.reject( error )
		};
		const logErrorStub = this.sandbox.stub( mw.errorLogger, 'logError' );
		const showSubmitErrorStub = this.sandbox.stub( handler, 'showSubmitError' );

		await assert.rejects(
			handler.getCaptchaToken(),
			error,
			'Promise should have rejected but it resolved'
		);
		assert.strictEqual( logErrorStub.callCount, 1 );
		assert.strictEqual( logErrorStub.getCall( 0 ).args[ 0 ], error );
		assert.strictEqual( logErrorStub.getCall( 0 ).args[ 1 ], 'error.uploadwizard' );
		assert.strictEqual( showSubmitErrorStub.callCount, 1 );
		assert.strictEqual( showSubmitErrorStub.getCall( 0 ).args[ 0 ], error );
	} );

	QUnit.test( 'showLoadError uses error.message when provided', function ( assert ) {
		this.sandbox.stub( OO.ui.Element.static, 'scrollIntoView' );
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		handler.showLoadError( $( '<div>' ), new Error( 'My captcha failed' ) );
		assert.strictEqual( handler.captchaMessage.getLabel(), 'My captcha failed' );
	} );

	QUnit.test( 'showLoadError falls back to default message when no error passed', function ( assert ) {
		this.sandbox.stub( OO.ui.Element.static, 'scrollIntoView' );
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		handler.showLoadError( $( '<div>' ) );
		assert.strictEqual( handler.captchaMessage.getLabel(), mw.message( 'mwe-upwiz-captcha-load-failed' ).text() );
	} );

	QUnit.test( 'showLoadError falls back to default message when error.message is empty', function ( assert ) {
		this.sandbox.stub( OO.ui.Element.static, 'scrollIntoView' );
		const handler = new uw.CaptchaHandler( $( '<div>' ) );
		handler.showLoadError( $( '<div>' ), new Error( '' ) );
		assert.strictEqual( handler.captchaMessage.getLabel(), mw.message( 'mwe-upwiz-captcha-load-failed' ).text() );
	} );

}( mw.uploadWizard ) );
