( function () {
	QUnit.module( 'mw.UploadWizardDetails', QUnit.newMwEnvironment() );

	QUnit.test.each( 'processError: captcha error', {
		'valid captchaInfo sets captchaError and morphs back to detailsForm': {
			result: { errors: [ { code: 'captcha', html: 'oops', data: { captcha: { type: 'hcaptcha', key: 'abc' } } } ] },
			expectedCaptchaError: { type: 'hcaptcha', key: 'abc' },
			expectedState: 'recoverable-error',
			expectedMorphCount: 1,
			expectedShowErrorCount: 0
		},
		'missing captchaInfo calls showError': {
			result: { errors: [ { html: 'oops' } ] },
			expectedCaptchaError: null,
			expectedState: undefined,
			expectedMorphCount: 0,
			expectedShowErrorCount: 1
		},
		'captchaInfo missing type calls showError': {
			result: { errors: [ { html: 'oops', data: { captcha: { id: '456' } } } ] },
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

	QUnit.test( 'submitWikiText: always sends uploadwizardpublish param', function ( assert ) {
		this.sandbox.stub( mw.UploadWizard, 'config' ).value( {
			uploadComment: { ownWork: 'Own work' },
			CanAddTags: false
		} );

		const details = {
			upload: {
				fileKey: 'key123',
				deedChooser: { deed: { name: 'ownwork' } },
				file: { source: 'web' },
				transportWeight: 0
			},
			getTitle: this.sandbox.stub().returns( { getMain: () => 'Foo.jpg' } ),
			submitWikiTextInternal: this.sandbox.stub().returns( $.Deferred().resolve().promise() ),
			firstPoll: null
		};

		mw.UploadWizardDetails.prototype.submitWikiText.call( details, 'wikitext' );

		assert.strictEqual( details.submitWikiTextInternal.callCount, 1 );
		const params = details.submitWikiTextInternal.getCall( 0 ).args[ 0 ];
		assert.strictEqual( params.uploadwizardpublish, 1 );
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

	QUnit.test( 'showPreview: opens the dialog with the rendered wikitext', function ( assert ) {
		const open = this.sandbox.stub( mw.uploadWizard.PreviewDialog, 'open' );
		const promise = $.Deferred().promise();
		const details = { renderWikiText: this.sandbox.stub().returns( promise ) };

		mw.UploadWizardDetails.prototype.showPreview.call( details );

		assert.strictEqual( open.callCount, 1 );
		assert.strictEqual( open.getCall( 0 ).args[ 0 ], promise, 'dialog gets the render promise' );
	} );

	QUnit.test( 'renderWikiText: parses the wikitext and assembles the result', function ( assert ) {
		const done = assert.async();
		const load = this.sandbox.stub( mw.loader, 'load' );

		const post = this.sandbox.stub().returns( $.Deferred().resolve( {
			parse: {
				text: '<div class="mw-parser-output"><p>Hello</p></div>',
				categorieshtml: '<div class="catlinks">Cats</div>',
				modules: [ 'ext.foo' ],
				modulestyles: [ 'ext.foo.styles' ]
			}
		} ).promise() );

		const details = {
			api: { post: post },
			getTitle: () => ( { getPrefixedText: () => 'File:Bar.jpg' } ),
			getWikiText: () => 'some wikitext'
		};

		mw.UploadWizardDetails.prototype.renderWikiText.call( details ).then( ( $content ) => {
			const params = post.getCall( 0 ).args[ 0 ];
			assert.strictEqual( params.action, 'parse' );
			assert.strictEqual( params.title, 'File:Bar.jpg' );
			assert.strictEqual( params.text, 'some wikitext' );
			assert.true( params.pst, 'pre-save transform applied' );

			assert.strictEqual( $content.find( '.mw-parser-output' ).length, 1, 'parser output included' );
			assert.strictEqual( $content.find( '.catlinks' ).length, 1, 'category links included' );
			assert.deepEqual( load.getCall( 0 ).args[ 0 ], [ 'ext.foo.styles' ], 'styles loaded' );
			assert.strictEqual( load.callCount, 1, 'only styles loaded' );
			done();
		} );
	} );

	QUnit.test( 'renderWikiText: falls back to a placeholder title', function ( assert ) {
		const post = this.sandbox.stub().returns( $.Deferred().promise() );

		mw.UploadWizardDetails.prototype.renderWikiText.call( {
			api: { post: post },
			getTitle: () => null,
			getWikiText: () => ''
		} );

		assert.strictEqual( post.getCall( 0 ).args[ 0 ].title, 'File:UploadWizard preview' );
	} );
	function createSerializableDetails( sandbox, captionsAvailable, sameAsCaption ) {
		const widget = () => ( { getSerialized: sandbox.stub().returns( {} ), setSerialized: sandbox.stub() } );
		return {
			interfaceBuilt: true,
			captionsAvailable,
			descriptionSameAsCaptionCheckbox: new OO.ui.CheckboxMultioptionWidget( { selected: sameAsCaption } ),
			titleDetails: widget(),
			captionsDetails: widget(),
			descriptionsDetails: widget(),
			dateDetails: widget(),
			categoriesDetails: widget(),
			locationInput: widget(),
			objectLocationInput: widget(),
			otherDetails: widget(),
			statementWidgets: {},
			campaignDetailsFields: [],
			serializeStatements: mw.UploadWizardDetails.prototype.serializeStatements
		};
	}

	QUnit.test( 'getSerialized: includes whether the description is the same as the caption', function ( assert ) {
		let details = createSerializableDetails( this.sandbox, true, true );
		let serialized = mw.UploadWizardDetails.prototype.getSerialized.call( details );
		assert.strictEqual( serialized.descriptionSameAsCaption, true );
		assert.strictEqual( serialized.description, undefined );

		details = createSerializableDetails( this.sandbox, true, false );
		serialized = mw.UploadWizardDetails.prototype.getSerialized.call( details );
		assert.strictEqual( serialized.descriptionSameAsCaption, false );
		assert.deepEqual( serialized.description, {} );
	} );

	QUnit.test( 'setSerialized: restores whether the description is the same as the caption', function ( assert ) {
		// T427890: e.g. when copying from an upload with the box ticked to one with a description
		let details = createSerializableDetails( this.sandbox, true, false );
		mw.UploadWizardDetails.prototype.setSerialized.call( details, { descriptionSameAsCaption: true } );
		assert.true( details.descriptionSameAsCaptionCheckbox.isSelected() );

		details = createSerializableDetails( this.sandbox, true, true );
		const description = { inputs: [ { language: 'en', text: 'foo' } ] };
		mw.UploadWizardDetails.prototype.setSerialized.call( details, { description, descriptionSameAsCaption: false } );
		assert.false( details.descriptionSameAsCaptionCheckbox.isSelected() );
		assert.true( details.descriptionsDetails.setSerialized.calledWith( description ) );

		details = createSerializableDetails( this.sandbox, true, true );
		mw.UploadWizardDetails.prototype.setSerialized.call( details, {} );
		assert.true( details.descriptionSameAsCaptionCheckbox.isSelected(), 'kept when not serialized' );

		details = createSerializableDetails( this.sandbox, false, false );
		mw.UploadWizardDetails.prototype.setSerialized.call( details, { descriptionSameAsCaption: true } );
		assert.false( details.descriptionSameAsCaptionCheckbox.isSelected(), 'not selected without captions' );
	} );
}() );
