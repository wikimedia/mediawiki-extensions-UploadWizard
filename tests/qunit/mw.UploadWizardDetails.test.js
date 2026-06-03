( function () {
	QUnit.module( 'mw.UploadWizardDetails', QUnit.newMwEnvironment() );

	QUnit.test.each( 'processError: captcha error', {
		'valid captchaInfo sets captchaError and morphs back to detailsForm': {
			result: { error: { captcha: { type: 'math', id: '123' } } },
			expectedCaptchaError: { type: 'math', id: '123' },
			expectedState: 'recoverable-error',
			expectedMorphCount: 1,
			expectedShowErrorCount: 0
		},
		'missing captchaInfo calls showError': {
			result: { error: {}, errors: [ { html: 'oops' } ] },
			expectedCaptchaError: null,
			expectedState: undefined,
			expectedMorphCount: 0,
			expectedShowErrorCount: 1
		},
		'captchaInfo missing type calls showError': {
			result: { error: { captcha: { id: '456' } }, errors: [ { html: 'oops' } ] },
			expectedCaptchaError: null,
			expectedState: undefined,
			expectedMorphCount: 0,
			expectedShowErrorCount: 1
		}
	}, function ( assert, { result, expectedCaptchaError, expectedState, expectedMorphCount, expectedShowErrorCount } ) {
		const morphStub = this.sandbox.stub();
		const details = {
			upload: { captchaError: null },
			handleCaptchaError: mw.UploadWizardDetails.prototype.handleCaptchaError,
			recoverFromError: this.sandbox.stub(),
			showError: this.sandbox.stub(),
			$dataDiv: { morphCrossfade: morphStub }
		};

		mw.UploadWizardDetails.prototype.processError.call( details, 'captcha', result );

		assert.deepEqual( details.upload.captchaError, expectedCaptchaError );
		assert.strictEqual( details.upload.state, expectedState );
		assert.strictEqual( morphStub.callCount, expectedMorphCount );
		if ( expectedMorphCount > 0 ) {
			assert.strictEqual( morphStub.getCall( 0 ).args[ 0 ], '.detailsForm' );
		}
		assert.strictEqual( details.recoverFromError.callCount, 0 );
		assert.strictEqual( details.showError.callCount, expectedShowErrorCount );
		if ( expectedShowErrorCount > 0 ) {
			assert.strictEqual( details.showError.getCall( 0 ).args[ 0 ], 'captcha' );
		}
	} );

	QUnit.test( 'submitWikiText: captchaData is merged into API params with fixed params taking precedence', function ( assert ) {
		this.sandbox.stub( mw.UploadWizard, 'config' ).value( {
			uploadComment: { ownWork: 'Own work' },
			CanAddTags: false
		} );

		const details = {
			upload: {
				fileKey: 'key123',
				deedChooser: { deed: { name: 'ownwork' } },
				file: {},
				transportWeight: 0
			},
			getTitle: this.sandbox.stub().returns( { getMain: () => 'Foo.jpg' } ),
			submitWikiTextInternal: this.sandbox.stub().returns( $.Deferred().resolve().promise() ),
			firstPoll: null
		};

		mw.UploadWizardDetails.prototype.submitWikiText.call(
			details,
			'wikitext',
			{ captchaId: '999', captchaWord: 'foo', action: 'SHOULD_BE_OVERWRITTEN' }
		);

		assert.strictEqual( details.submitWikiTextInternal.callCount, 1 );
		const params = details.submitWikiTextInternal.getCall( 0 ).args[ 0 ];
		assert.strictEqual( params.action, 'upload' );
		assert.strictEqual( params.captchaId, '999' );
		assert.strictEqual( params.captchaWord, 'foo' );
		assert.strictEqual( params.filekey, 'key123' );
	} );

	QUnit.test( 'submitWikiText: null captchaData does not break params', function ( assert ) {
		this.sandbox.stub( mw.UploadWizard, 'config' ).value( {
			uploadComment: { ownWork: 'Own work' },
			CanAddTags: false
		} );

		const details = {
			upload: {
				fileKey: 'key123',
				deedChooser: { deed: { name: 'ownwork' } },
				file: {},
				transportWeight: 0
			},
			getTitle: this.sandbox.stub().returns( { getMain: () => 'Foo.jpg' } ),
			submitWikiTextInternal: this.sandbox.stub().returns( $.Deferred().resolve().promise() ),
			firstPoll: null
		};

		mw.UploadWizardDetails.prototype.submitWikiText.call( details, 'wikitext', null );

		assert.strictEqual( details.submitWikiTextInternal.callCount, 1 );
		const params = details.submitWikiTextInternal.getCall( 0 ).args[ 0 ];
		assert.strictEqual( params.action, 'upload' );
	} );

	QUnit.test( 'submit: threads captchaData to submitWikiText', function ( assert ) {
		this.sandbox.stub( mw.UploadWizard, 'config' ).value(
			Object.assign( {}, mw.UploadWizard.config, { wikibase: { enabled: false } } )
		);

		const details = {
			upload: { state: 'details', title: null, deedChooser: { deed: { name: 'ownwork' } } },
			getTitle: this.sandbox.stub().returns( {
				getMain: () => 'Bar.jpg',
				getPrefixedDb: () => 'File:Bar.jpg'
			} ),
			getWikiText: this.sandbox.stub().returns( 'some wikitext' ),
			submitWikiText: this.sandbox.stub().returns( $.Deferred().resolve().promise() ),
			setStatus: this.sandbox.stub(),
			showIndicator: this.sandbox.stub(),
			showError: this.sandbox.stub(),
			$containerDiv: { find: () => ( { trigger: () => {} } ) }
		};

		const captchaData = { captchaId: 'abc', captchaWord: 'xyz' };
		mw.UploadWizardDetails.prototype.submit.call( details, captchaData );

		assert.strictEqual( details.submitWikiText.callCount, 1 );
		assert.deepEqual( details.submitWikiText.getCall( 0 ).args, [ 'some wikitext', captchaData ] );
	} );
}() );
