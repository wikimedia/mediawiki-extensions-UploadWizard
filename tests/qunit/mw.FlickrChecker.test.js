QUnit.module( 'ext.uploadWizard/mw.FlickrChecker.test.js', ( hooks ) => {
	'use strict';

	hooks.beforeEach( () => {
		mw.FlickrChecker.fileNames = {};
	} );

	function getInstance() {
		const wizard = new mw.UploadWizard( {} );
		// FlickrChecker doesn't actually do much with the upload so we can omit some of its dependencies
		const upload = new mw.UploadWizardUpload( wizard, {} );
		return new mw.FlickrChecker( wizard, upload );
	}

	QUnit.test( 'getFilenameFromItem() simple case', ( assert ) => {
		const flickrChecker = getInstance();
		assert.strictEqual(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo.jpg'
		);
	} );

	QUnit.test( 'getFilenameFromItem() with empty title', ( assert ) => {
		const flickrChecker = getInstance();
		assert.strictEqual(
			flickrChecker.getFilenameFromItem( '', 123, 'johndoe' ),
			'johndoe - 123.jpg'
		);
	} );

	QUnit.test( 'getFilenameFromItem() name conflict within instance', ( assert ) => {
		const flickrChecker = getInstance(),
			fileName = flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' );
		assert.strictEqual(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo.jpg'
		);
		flickrChecker.reserveFileName( fileName );
		assert.strictEqual(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo - 123.jpg'
		);
	} );

	QUnit.test( 'getFilenameFromItem() name conflict between different instances', ( assert ) => {
		let flickrChecker = getInstance();
		const fileName = flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' );
		assert.strictEqual(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo.jpg'
		);

		flickrChecker.reserveFileName( fileName );
		flickrChecker = getInstance();
		assert.strictEqual(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo - 123.jpg'
		);
	} );

	QUnit.test( 'setUploadDescription', function ( assert ) {
		const flickrChecker = getInstance();
		let upload = {};
		const sidstub = this.sandbox.stub( flickrChecker, 'setImageDescription' );

		flickrChecker.setUploadDescription( upload );
		assert.true( sidstub.called );
		assert.true( !upload.description );

		sidstub.reset();
		upload = {};
		flickrChecker.setUploadDescription( upload, 'Testing' );
		assert.strictEqual( upload.description, 'Testing' );
		assert.false( sidstub.called );

		sidstub.reset();
		upload = {};
		flickrChecker.setUploadDescription( upload, 'Testing | 1234' );
		assert.strictEqual( upload.description, 'Testing &#124; 1234' );
		assert.false( sidstub.called );

		upload = {};
		flickrChecker.setUploadDescription( upload, 'Testing | 1234 | 5678' );
		assert.strictEqual( upload.description, 'Testing &#124; 1234 &#124; 5678' );

		sidstub.reset();
		upload = {};
		flickrChecker.setUploadDescription( upload, '' );
		assert.false( sidstub.called );
		assert.strictEqual( upload.description, '' );
	} );

	QUnit.test( 'checkFlickr() passes the input URL to getPhotostream() for favorites', function ( assert ) {
		const flickrChecker = getInstance(),
			url = 'https://www.flickr.com/photos/johndoe/favorites',
			stub = this.sandbox.stub( flickrChecker, 'getPhotostream' );

		flickrChecker.checkFlickr( url );

		assert.true( stub.calledOnceWithExactly( 'favorites', url ) );
	} );

	QUnit.test( 'lookupUrl() resolves with the entity', function ( assert ) {
		const flickrChecker = getInstance();
		this.sandbox.stub( flickrChecker, 'flickrRequest' ).returns(
			$.Deferred().resolve( { user: { id: '123@N00' } } ).promise()
		);

		return flickrChecker.lookupUrl( 'flickr.urls.lookupUser', 'https://www.flickr.com/photos/johndoe', 'user' )
			.then( ( user ) => {
				assert.strictEqual( user.id, '123@N00' );
			} );
	} );

	[
		[ 'the response has no entity', () => $.Deferred().resolve( { stat: 'fail' } ).promise() ],
		[ 'the request fails', () => $.Deferred().reject().promise() ]
	].forEach( ( [ name, response ] ) => {
		QUnit.test( 'lookupUrl() shows an error and resets the interface when ' + name, function ( assert ) {
			const flickrChecker = getInstance(),
				errorDialog = this.sandbox.stub( mw, 'errorDialog' ),
				reset = this.sandbox.stub(),
				remove = this.sandbox.stub();
			flickrChecker.ui = { flickrInterfaceReset: reset };
			flickrChecker.$spinner = { remove: remove };
			this.sandbox.stub( flickrChecker, 'flickrRequest' ).returns( response() );

			return flickrChecker.lookupUrl( 'flickr.urls.lookupUser', 'https://www.flickr.com/photos/johndoe', 'user' )
				.then(
					() => assert.true( false, 'should not resolve' ),
					() => {
						assert.true( errorDialog.calledOnce, 'error shown once' );
						assert.true( remove.calledOnce, 'spinner removed' );
						assert.true( reset.calledOnce, 'interface reset' );
					}
				);
		} );
	} );

	QUnit.test( 'getCollection() shows an error when the user has no collections', function ( assert ) {
		const flickrChecker = getInstance(),
			errorDialog = this.sandbox.stub( mw, 'errorDialog' ),
			remove = this.sandbox.stub();
		flickrChecker.ui = { flickrInterfaceReset: this.sandbox.stub() };
		flickrChecker.$spinner = { remove: remove };
		this.sandbox.stub( flickrChecker, 'flickrRequest' )
			.onFirstCall().returns( $.Deferred().resolve( { user: { id: '123@N00' } } ).promise() )
			.onSecondCall().returns( $.Deferred().resolve( { collections: {} } ).promise() );

		return flickrChecker.getCollection( [], 'https://www.flickr.com/photos/johndoe/collections' ).then(
			() => assert.true( false, 'should not resolve' ),
			() => {
				assert.true( errorDialog.calledOnce, 'error shown once' );
				assert.true( remove.calledOnce, 'spinner removed' );
			}
		);
	} );

	QUnit.test( 'getPhotos() shows the license error when no photo has a usable license', function ( assert ) {
		const flickrChecker = getInstance(),
			errorDialog = this.sandbox.stub( mw, 'errorDialog' );
		flickrChecker.ui = { flickrInterfaceReset: this.sandbox.stub() };
		flickrChecker.$spinner = { remove: this.sandbox.stub() };
		flickrChecker.selectButton = {
			setLabel: this.sandbox.stub(),
			setDisabled: this.sandbox.stub(),
			on: this.sandbox.stub()
		};
		this.sandbox.stub( flickrChecker, 'flickrRequest' ).returns(
			$.Deferred().resolve( { photos: { photo: [ { license: '0' } ] } } ).promise()
		);
		this.sandbox.stub( flickrChecker, 'getBlacklist' ).returns( $.Deferred().resolve( {} ).promise() );
		this.sandbox.stub( flickrChecker, 'checkLicense' ).returns( { licenseValue: 'invalid' } );

		return flickrChecker.getPhotos( 'photos', {} ).then(
			() => assert.true( false, 'should not resolve' ),
			() => {
				assert.true( errorDialog.calledOnce, 'error shown once' );
				assert.strictEqual(
					errorDialog.firstCall.args[ 0 ],
					mw.msg( 'mwe-upwiz-license-photoset-invalid' )
				);
			}
		);
	} );

	QUnit.test( 'getPhotos() shows a message, not the failed request, when the request fails', function ( assert ) {
		const flickrChecker = getInstance(),
			errorDialog = this.sandbox.stub( mw, 'errorDialog' );
		flickrChecker.ui = { flickrInterfaceReset: this.sandbox.stub() };
		flickrChecker.$spinner = { remove: this.sandbox.stub() };
		flickrChecker.selectButton = { setLabel: this.sandbox.stub(), setDisabled: this.sandbox.stub() };
		this.sandbox.stub( flickrChecker, 'flickrRequest' ).returns( $.Deferred().reject( { status: 500 } ).promise() );
		this.sandbox.stub( flickrChecker, 'getBlacklist' ).returns( $.Deferred().resolve( {} ).promise() );

		return flickrChecker.getPhotos( 'photos', {} ).then(
			() => assert.true( false, 'should not resolve' ),
			() => {
				assert.true( errorDialog.calledOnce, 'error shown once' );
				assert.strictEqual(
					errorDialog.firstCall.args[ 0 ],
					mw.msg( 'mwe-upwiz-url-invalid', 'Flickr' )
				);
			}
		);
	} );
} );
