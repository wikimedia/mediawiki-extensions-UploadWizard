/*
 * This file is part of the MediaWiki extension DetailsWizard.
 *
 * DetailsWizard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * DetailsWizard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with DetailsWizard.  If not, see <http://www.gnu.org/licenses/>.
 */

( function ( uw ) {
	QUnit.module( 'mw.uploadWizard.controller.Details', QUnit.newMwEnvironment( {
		beforeEach() {
			this.originalUploadWizardConfig = mw.UploadWizard.config;
			mw.UploadWizard.config = Object.assign( {}, this.originalUploadWizardConfig );
		},
		afterEach() {
			mw.UploadWizard.config = this.originalUploadWizardConfig;
		}
	} ) );

	function createTestUpload( sandbox, aborted ) {
		const stubs = {
			getSerialized: sandbox.stub(),
			setSerialized: sandbox.stub(),
			attach: sandbox.stub()
		};

		return {
			deedChooser: { deed: { name: 'cc-by-sa-4.0' } },

			on: function () {},

			details: {
				getSerialized: stubs.getSerialized,
				setSerialized: stubs.setSerialized,
				attach: stubs.attach,
				on: function () {}
			},

			state: aborted ? 'aborted' : 'stashed',

			stubs: stubs
		};
	}

	QUnit.test( 'Constructor sense-check', ( assert ) => {
		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);
		assert.true( step instanceof uw.controller.Step );
		assert.true( !!step.ui );
	} );

	QUnit.test( 'load', function ( assert ) {
		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);
		const stepUiStub = this.sandbox.stub( step.ui, 'load' );

		let testUpload = createTestUpload( this.sandbox );

		// replace createDetails with a stub; UploadWizardDetails needs way too
		// much setup to actually be able to create it
		step.createDetails = this.sandbox.stub();

		step.load( [ testUpload ] );

		assert.strictEqual( step.createDetails.callCount, 1 );
		assert.true( stepUiStub.called );

		testUpload = createTestUpload( this.sandbox, true );
		step.load( [ testUpload ] );

		assert.strictEqual( step.createDetails.callCount, 2 );
		assert.true( stepUiStub.called );

		testUpload = createTestUpload( this.sandbox );
		step.load( [ testUpload, createTestUpload( this.sandbox ) ] );

		assert.strictEqual( step.createDetails.callCount, 4 );
		assert.true( stepUiStub.called );

		testUpload = createTestUpload( this.sandbox );
		step.load( [ testUpload, createTestUpload( this.sandbox, false, true ) ] );

		assert.strictEqual( step.createDetails.callCount, 6 );
		assert.true( stepUiStub.called );
	} );

	QUnit.test( 'load shows captcha eagerly when publishCaptchaRequired and publishCaptchaType are set', function ( assert ) {
		const captchaType = { type: 'hcaptcha', mime: 'application/javascript', key: 'k' };
		mw.UploadWizard.config.publishCaptchaRequired = true;
		mw.UploadWizard.config.publishCaptchaType = captchaType;

		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);
		this.sandbox.stub( step.ui, 'load' );
		const showCaptchaStub = this.sandbox.stub( step.ui, 'showCaptcha' )
			.returns( $.Deferred().resolve().promise() );
		step.createDetails = this.sandbox.stub();

		step.load( [ createTestUpload( this.sandbox ) ] );

		assert.strictEqual( showCaptchaStub.callCount, 1, 'showCaptcha called once on entry' );
		assert.deepEqual( showCaptchaStub.getCall( 0 ).args[ 0 ], captchaType, 'showCaptcha called with publishCaptchaType' );
		assert.true( step.captchaPromptedEagerly, 'captchaPromptedEagerly flag set' );
	} );

	QUnit.test( 'load does not show captcha when publishCaptchaRequired is false', function ( assert ) {
		mw.UploadWizard.config.publishCaptchaRequired = false;
		mw.UploadWizard.config.publishCaptchaType = { type: 'hcaptcha', mime: 'application/javascript', key: 'k' };

		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);
		this.sandbox.stub( step.ui, 'load' );
		const showCaptchaStub = this.sandbox.stub( step.ui, 'showCaptcha' );
		step.createDetails = this.sandbox.stub();

		step.load( [ createTestUpload( this.sandbox ) ] );

		assert.strictEqual( showCaptchaStub.callCount, 0, 'showCaptcha not called' );
		assert.false( step.captchaPromptedEagerly, 'captchaPromptedEagerly flag unset' );
	} );

	QUnit.test( 'load resets captchaPromptedEagerly when ui.showCaptcha rejects', function ( assert ) {
		const done = assert.async();
		mw.UploadWizard.config.publishCaptchaRequired = true;
		mw.UploadWizard.config.publishCaptchaType = { type: 'hcaptcha', mime: 'application/javascript', key: 'k' };

		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);
		this.sandbox.stub( step.ui, 'load' );
		this.sandbox.stub( step.ui, 'showCaptcha' )
			.returns( $.Deferred().reject( 'captcha-load-failed' ).promise() );
		step.createDetails = this.sandbox.stub();

		step.load( [ createTestUpload( this.sandbox ) ] );

		assert.true( step.captchaPromptedEagerly, 'flag set synchronously while showCaptcha is pending' );

		// .catch fires on the microtask queue; wait it out before asserting the reset.
		setTimeout( () => {
			assert.false( step.captchaPromptedEagerly, 'flag reset after showCaptcha rejection so Publish click can retry' );
			done();
		}, 0 );
	} );

	QUnit.test( 'canTransition', ( assert ) => {
		const upload = {};
		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);

		assert.strictEqual( step.canTransition( upload ), false );
		upload.state = 'details';
		assert.strictEqual( step.canTransition( upload ), true );
		upload.state = 'complete';
		assert.strictEqual( step.canTransition( upload ), false );
	} );

	QUnit.test( 'transitionAll runs all uploads concurrently when no captcha', function ( assert ) {
		const done = assert.async(),
			donestub = this.sandbox.stub(),
			ds = [ $.Deferred(), $.Deferred(), $.Deferred() ],
			ps = [ ds[ 0 ].promise(), ds[ 1 ].promise(), ds[ 2 ].promise() ];

		const tostub = this.sandbox.stub( uw.controller.Details.prototype, 'transitionOne' );
		tostub.onFirstCall().returns( ps[ 0 ] );
		tostub.onSecondCall().returns( ps[ 1 ] );
		tostub.onThirdCall().returns( ps[ 2 ] );

		this.sandbox.stub( uw.controller.Details.prototype, 'canTransition' ).returns( true );

		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 3 }
		);

		step.uploads = [
			{ id: 15 },
			undefined,
			{ id: 21 },
			{ id: 'aoeu' }
		];

		step.transitionAll().done( donestub );
		setTimeout( () => {
			const calls = [ tostub.getCall( 0 ), tostub.getCall( 1 ), tostub.getCall( 2 ) ];

			assert.strictEqual( calls[ 0 ].args[ 0 ].id, 15 );
			assert.strictEqual( calls[ 1 ].args[ 0 ].id, 21 );

			ds[ 0 ].resolve();
			ds[ 1 ].resolve();
			setTimeout( () => {
				assert.strictEqual( donestub.called, false );

				ds[ 2 ].resolve();
				setTimeout( () => {
					assert.true( donestub.called );

					done();
				} );
			} );
		} );
	} );

	QUnit.test( 'transitionAll with captcha serializes first upload before the rest', function ( assert ) {
		const done = assert.async();
		const uploads = [ { id: 1 }, { id: 2 }, { id: 3 } ];
		const finishUpload = uploads.map( () => $.Deferred() );

		const transitionOneStub = this.sandbox.stub( uw.controller.Details.prototype, 'transitionOne' );
		finishUpload.forEach( ( d, i ) => transitionOneStub.onCall( i ).returns( d.promise() ) );

		this.sandbox.stub( uw.controller.Details.prototype, 'canTransition' ).returns( true );

		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 3 }
		);
		step.currentCaptchaData = { captchaWord: 'token' };
		step.uploads = uploads;

		step.transitionAll();
		setTimeout( () => {
			assert.strictEqual( transitionOneStub.callCount, 1, 'only first upload started' );
			assert.strictEqual( transitionOneStub.getCall( 0 ).args[ 0 ], uploads[ 0 ] );

			finishUpload[ 0 ].resolve();
			setTimeout( () => {
				assert.strictEqual( transitionOneStub.callCount, uploads.length, 'remaining uploads started after first completes' );
				uploads.forEach( ( upload, i ) => {
					assert.strictEqual( transitionOneStub.getCall( i ).args[ 0 ], upload );
				} );
				done();
			} );
		} );
	} );

	QUnit.test( 'consumeCaptchaError returns the first upload\'s captchaError and clears every upload that had one', function ( assert ) {
		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);

		const uploadA = createTestUpload( this.sandbox );
		const uploadB = createTestUpload( this.sandbox );
		const uploadC = createTestUpload( this.sandbox );
		uploadA.captchaError = { id: 'captcha-1' };
		uploadC.captchaError = { id: 'captcha-3' };
		step.uploads = [ uploadA, uploadB, uploadC ];

		const result = step.consumeCaptchaError();

		assert.deepEqual( result, { id: 'captcha-1' } );
		assert.strictEqual( uploadA.captchaError, null );
		assert.strictEqual( uploadB.captchaError, undefined );
		assert.strictEqual( uploadC.captchaError, null );
	} );

	QUnit.test( 'submit calls ui.showCaptcha when an upload has a captchaError after transitionAll', async function ( assert ) {
		const captchaData = { id: 'captcha-failed' };

		this.sandbox.stub( uw.controller.Details.prototype, 'transitionAll' )
			.returns( $.Deferred().resolve().promise() );
		this.sandbox.stub( uw.controller.Details.prototype, 'showNext' ).returns( false );
		const addCopyStub = this.sandbox.stub( uw.controller.Details.prototype, 'addCopyMetadataFeature' );
		this.sandbox.stub( uw.controller.Details.prototype, 'removeCopyMetadataFeature' );

		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);

		this.sandbox.stub( step.ui, 'disableEdits' );
		this.sandbox.stub( step.ui, 'enableEdits' );
		const cancelSubmittingStub = this.sandbox.stub( step.ui, 'cancelSubmitting' );
		this.sandbox.stub( step.ui, 'getCaptchaToken' ).returns(
			$.Deferred().resolve( null ).promise()
		);
		const showCaptchaStub = this.sandbox.stub( step.ui, 'showCaptcha' );

		const upload = createTestUpload( this.sandbox );
		upload.state = 'details';
		upload.captchaError = captchaData;
		upload.details.setVisibleTitle = this.sandbox.stub();
		upload.details.getTitle = this.sandbox.stub().returns( {
			getMain: () => 'Foo.jpg'
		} );
		step.uploads = [ upload ];

		await step.submit();
		assert.strictEqual( showCaptchaStub.callCount, 1 );
		assert.deepEqual( showCaptchaStub.getCall( 0 ).args[ 0 ], captchaData );
		assert.strictEqual( step.currentCaptchaData, null );
		assert.strictEqual( addCopyStub.callCount, 1 );
		assert.strictEqual( cancelSubmittingStub.callCount, 1 );
		assert.true(
			cancelSubmittingStub.calledBefore( showCaptchaStub ),
			'cancelSubmitting called before showCaptcha'
		);
	} );

	QUnit.test( 'submit handles getCaptchaToken rejection by cancelling and restoring copy metadata', async function ( assert ) {
		const transitionAllStub = this.sandbox.stub( uw.controller.Details.prototype, 'transitionAll' )
			.returns( $.Deferred().resolve().promise() );
		this.sandbox.stub( uw.controller.Details.prototype, 'showNext' ).returns( false );
		const addCopyStub = this.sandbox.stub( uw.controller.Details.prototype, 'addCopyMetadataFeature' );
		this.sandbox.stub( uw.controller.Details.prototype, 'removeCopyMetadataFeature' );

		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);

		const cancelSubmittingStub = this.sandbox.stub();
		step.ui = {
			disableEdits: this.sandbox.stub(),
			enableEdits: this.sandbox.stub(),
			cancelSubmitting: cancelSubmittingStub,
			getCaptchaToken: this.sandbox.stub().returns(
				$.Deferred().reject().promise()
			),
			showCaptcha: this.sandbox.stub()
		};

		const upload = createTestUpload( this.sandbox );
		upload.state = 'details';
		upload.details.setVisibleTitle = this.sandbox.stub();
		upload.details.getTitle = this.sandbox.stub().returns( {
			getMain: () => 'Foo.jpg'
		} );
		step.uploads = [ upload ];

		await assert.rejects(
			step.submit(),
			/captcha-cancelled/,
			'submit() should reject when getCaptchaToken rejects'
		);
		assert.strictEqual( cancelSubmittingStub.callCount, 1 );
		assert.strictEqual( addCopyStub.callCount, 1 );
		assert.strictEqual( step.currentCaptchaData, null );
		assert.strictEqual( transitionAllStub.callCount, 0 );
	} );

	QUnit.test( 'submit can be re-invoked after captcha recovery and proceeds to moveNext', async function ( assert ) {
		this.sandbox.stub( uw.controller.Details.prototype, 'transitionAll' )
			.returns( $.Deferred().resolve().promise() );
		const showNextStub = this.sandbox.stub( uw.controller.Details.prototype, 'showNext' ).returns( true );
		const moveNextStub = this.sandbox.stub( uw.controller.Details.prototype, 'moveNext' );
		this.sandbox.stub( uw.controller.Details.prototype, 'addCopyMetadataFeature' );
		this.sandbox.stub( uw.controller.Details.prototype, 'removeCopyMetadataFeature' );

		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);

		this.sandbox.stub( step.ui, 'disableEdits' );
		this.sandbox.stub( step.ui, 'enableEdits' );
		this.sandbox.stub( step.ui, 'cancelSubmitting' );
		this.sandbox.stub( step.ui, 'getCaptchaToken' ).returns(
			$.Deferred().resolve( null ).promise()
		);
		const showCaptchaStub = this.sandbox.stub( step.ui, 'showCaptcha' );

		const upload = createTestUpload( this.sandbox );
		upload.state = 'details';
		upload.captchaError = { id: 'captcha-1' };
		upload.details.setVisibleTitle = this.sandbox.stub();
		upload.details.getTitle = this.sandbox.stub().returns( {
			getMain: () => 'Foo.jpg'
		} );
		step.uploads = [ upload ];

		await step.submit();
		assert.strictEqual( showCaptchaStub.callCount, 1, 'showCaptcha called on first submit' );
		assert.strictEqual( moveNextStub.callCount, 0, 'moveNext not called on first submit' );

		// Simulate user solving the captcha: upload's error is cleared.
		upload.captchaError = null;

		await step.submit();
		assert.strictEqual( showCaptchaStub.callCount, 1, 'showCaptcha not called again on second submit' );
		assert.strictEqual( showNextStub.callCount, 1, 'showNext only called on the recovery submit, not the captcha submit' );
		assert.strictEqual( moveNextStub.callCount, 1, 'moveNext called on second submit' );
	} );

	QUnit.test( 'submit shows captcha eagerly when publishCaptchaRequired and publishCaptchaType are set', function ( assert ) {
		const captchaType = { type: 'image', mime: 'image/png', url: '/captcha.png' };
		const { step, stubs } = createSubmitTestStep( this.sandbox, {
			publishCaptchaRequired: true,
			publishCaptchaType: captchaType
		} );

		const result = step.submit();

		assert.strictEqual( stubs.cancelSubmitting.callCount, 1, 'cancelSubmitting called once' );
		assert.strictEqual( stubs.showCaptcha.callCount, 1, 'showCaptcha called once' );
		assert.deepEqual( stubs.showCaptcha.getCall( 0 ).args[ 0 ], captchaType, 'showCaptcha called with publishCaptchaType' );
		assert.strictEqual( stubs.prepare.callCount, 0, 'prepareUploadsForSubmit not called' );
		assert.strictEqual( stubs.disableEdits.callCount, 0, 'ui.disableEdits not called' );
		assert.strictEqual( stubs.acquire.callCount, 0, 'acquireCaptchaToken not called' );
		assert.true( step.captchaPromptedEagerly, 'captchaPromptedEagerly flag set' );
		assert.true( result instanceof Promise, 'returned value is a Promise' );
	} );

	QUnit.test( 'submit proceeds normally on second call after eager captcha prompt', async function ( assert ) {
		const { step, stubs } = createSubmitTestStep( this.sandbox, {
			publishCaptchaRequired: true,
			publishCaptchaType: { type: 'image', mime: 'image/png', url: '/captcha.png' }
		} );

		// First call: eager prompt
		step.submit();
		assert.strictEqual( stubs.showCaptcha.callCount, 1, 'first submit shows captcha' );
		assert.strictEqual( stubs.prepare.callCount, 0, 'first submit skips prepareUploadsForSubmit' );

		// Second call: should proceed normally
		await step.submit();
		assert.strictEqual( stubs.showCaptcha.callCount, 1, 'second submit does NOT re-show captcha' );
		assert.strictEqual( stubs.cancelSubmitting.callCount, 1, 'cancelSubmitting not called again on second submit' );
		assert.strictEqual( stubs.prepare.callCount, 1, 'prepareUploadsForSubmit called on second submit' );
		assert.strictEqual( stubs.disableEdits.callCount, 1, 'ui.disableEdits called on second submit' );
		assert.strictEqual( stubs.acquire.callCount, 1, 'acquireCaptchaToken called on second submit' );
	} );

	QUnit.test( 'submit proceeds normally when publishCaptchaRequired is false', async function ( assert ) {
		const { step, stubs } = createSubmitTestStep( this.sandbox, {
			publishCaptchaRequired: false,
			publishCaptchaType: { type: 'image', mime: 'image/png', url: '/captcha.png' }
		} );

		await step.submit();
		assert.strictEqual( stubs.showCaptcha.callCount, 0, 'showCaptcha not called' );
		assert.strictEqual( stubs.prepare.callCount, 1, 'prepareUploadsForSubmit called' );
		assert.strictEqual( stubs.disableEdits.callCount, 1, 'ui.disableEdits called' );
		assert.strictEqual( stubs.acquire.callCount, 1, 'acquireCaptchaToken called' );
	} );

	function createSubmitTestStep( sandbox, opts ) {
		mw.UploadWizard.config.publishCaptchaRequired = opts.publishCaptchaRequired;
		mw.UploadWizard.config.publishCaptchaType = opts.publishCaptchaType;

		const prepare = sandbox.stub( uw.controller.Details.prototype, 'prepareUploadsForSubmit' );
		const acquire = sandbox.stub( uw.controller.Details.prototype, 'acquireCaptchaToken' )
			.returns( $.Deferred().resolve().promise() );
		const transitionAll = sandbox.stub( uw.controller.Details.prototype, 'transitionAll' )
			.returns( $.Deferred().resolve().promise() );
		const finishSubmit = sandbox.stub( uw.controller.Details.prototype, 'finishSubmit' );
		sandbox.stub( uw.controller.Details.prototype, 'removeCopyMetadataFeature' );

		const step = new uw.controller.Details(
			new mw.Api(),
			{ maxSimultaneousConnections: 1 }
		);

		const disableEdits = sandbox.stub( step.ui, 'disableEdits' );
		const cancelSubmitting = sandbox.stub( step.ui, 'cancelSubmitting' );
		const showCaptcha = sandbox.stub( step.ui, 'showCaptcha' );

		return {
			step,
			stubs: { prepare, acquire, transitionAll, finishSubmit, disableEdits, cancelSubmitting, showCaptcha }
		};
	}

}( mw.uploadWizard ) );
