/*
 * This file is part of the MediaWiki extension UploadWizard.
 *
 * UploadWizard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * UploadWizard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with UploadWizard.  If not, see <http://www.gnu.org/licenses/>.
 */

( function () {
	QUnit.module( 'mw.FormDataTransport', QUnit.newMwEnvironment() );

	function createTransport( chunkSize, api ) {
		chunkSize = chunkSize || 0;
		api = api || {};

		const config = {
			useRetryTimeout: false,
			chunkSize: chunkSize,
			maxPhpUploadSize: chunkSize
		};

		return new mw.FormDataTransport( api, {}, config );
	}

	QUnit.test( 'Constructor sense-check', ( assert ) => {
		const transport = createTransport();

		assert.true( !!transport );
	} );

	QUnit.test( 'abort', function ( assert ) {
		const transport = createTransport( 0 ),
			request = $.Deferred().promise( { abort: this.sandbox.stub() } );

		transport.request = request;

		assert.true( request.abort.notCalled );

		transport.abort();

		assert.true( request.abort.called );
		assert.true( transport.aborted );
	} );

	QUnit.test( 'createParams', ( assert ) => {
		const transport = createTransport( 10 ),
			params = transport.createParams( 'foobar.jpg', 0 );

		assert.true( !!params );

		assert.strictEqual( params.filename, 'foobar.jpg' );
		assert.strictEqual( params.offset, 0 );
	} );

	QUnit.test( 'post', function ( assert ) {
		const stub = this.sandbox.stub(),
			// post() works on a promise and binds .then, so we have to make
			// sure it actually is a promise, but also that it calls our stub
			transport = createTransport( 10, { post: function () {
				stub();
				return $.Deferred().resolve();
			} } );

		this.sandbox.useFakeServer();

		assert.true( stub.notCalled );

		transport.post( {} );

		assert.true( stub.called );
	} );

	QUnit.test( 'upload', function ( assert ) {
		const transport = createTransport( 10, new mw.Api() ),
			fakeFile = {
				name: 'test file for fdt.jpg',
				size: 5
			};

		this.sandbox.useFakeServer();

		transport.upload( fakeFile, 'test file for fdt.jpg' );

		assert.strictEqual( this.sandbox.server.requests.length, 1 );
		const request = this.sandbox.server.requests[ 0 ];
		assert.strictEqual( request.method, 'POST' );
		assert.strictEqual( request.url, mw.util.wikiScript( 'api' ) );
		assert.true( request.async );

		transport.abort();
	} );

	QUnit.test( 'uploadChunk', function ( assert ) {
		const transport = createTransport( 10, new mw.Api() ),
			fakeFile = {
				name: 'test file for fdt.jpg',
				size: 20,
				slice: function ( offset ) {
					return {
						name: 'test file for fdt.jpg',
						offset: offset,
						size: 10
					};
				}
			};

		this.sandbox.useFakeServer();

		transport.uploadChunk( fakeFile, 0 );

		assert.strictEqual( this.sandbox.server.requests.length, 1 );
		const request = this.sandbox.server.requests[ 0 ];
		assert.strictEqual( request.method, 'POST' );
		assert.strictEqual( request.url, mw.util.wikiScript( 'api' ) );
		assert.true( request.async );

		transport.abort();
	} );

	// test invalid server response (in missing 'stage' param)
	QUnit.test( 'checkStatus invalid API response', function ( assert ) {
		const done = assert.async(),
			transport = createTransport( 10, new mw.Api() ),
			tstub = this.sandbox.stub(),
			poststub = this.sandbox.stub( transport.api, 'post' ),
			postd = $.Deferred();

		// prepare a bogus invalid API result
		poststub.returns( postd.promise() );
		postd.resolve( { upload: { result: 'Poll' } } );

		// call tstub upon checkStatus failure, and verify it got called correctly
		transport.checkStatus().fail( tstub, () => {
			assert.true( tstub.calledWith( 'server-error', { errors: [ {
				code: 'server-error',
				html: mw.message( 'api-clientside-error-invalidresponse' ).parse()
			} ] } ) );
			done();
		} );
	} );

	// test retry after server responds upload is still incomplete
	QUnit.test( 'checkStatus retry', function ( assert ) {
		const transport = createTransport( 10, new mw.Api() ),
			usstub = this.sandbox.stub(),
			poststub = this.sandbox.stub( transport.api, 'post' ),
			postd = $.Deferred(),
			postd2 = $.Deferred();

		transport.on( 'update-stage', usstub );

		// prepare a first API call that responds with 'Poll' (upload
		// concatenation is not yet complete) followed by a second call that
		// marks the upload successful
		poststub
			.onFirstCall().returns( postd.promise() )
			.onSecondCall().returns( postd2.promise() );

		// resolve 3 API calls, where server first responds upload is not yet
		// assembled, and second says it's published
		postd.resolve( { upload: { result: 'Poll', stage: 'queued' } } );
		postd2.resolve( { upload: { result: 'Success' } } );

		// confirm that, once second API call was successful, status resolves,
		// 2 API calls have gone out & the failed call updates stage accordingly
		return transport.checkStatus().done( () => {
			assert.true( poststub.calledTwice );
			assert.true( usstub.firstCall.calledWith( 'queued' ) );
		} );
	} );

	QUnit.test( 'checkStatus success', function ( assert ) {
		const transport = createTransport( 10, new mw.Api() ),
			tstub = this.sandbox.stub(),
			usstub = this.sandbox.stub(),
			poststub = this.sandbox.stub( transport.api, 'post' ),
			postd = $.Deferred();

		transport.on( 'update-stage', usstub );

		// prepare a bogus valid API result
		poststub.returns( postd.promise() );
		postd.resolve( 'testing' );

		return transport.checkStatus().done( tstub, () => {
			assert.true( tstub.calledWith( 'testing' ) );
			assert.false( usstub.called );
		} );
	} );

	QUnit.test( 'checkStatus error API response', function ( assert ) {
		const done = assert.async(),
			transport = createTransport( 10, new mw.Api() ),
			tstub = this.sandbox.stub(),
			usstub = this.sandbox.stub(),
			poststub = this.sandbox.stub( transport.api, 'post' ),
			postd = $.Deferred();

		transport.on( 'update-stage', usstub );

		// prepare an error API response
		poststub.returns( postd.promise() );
		postd.reject( 'testing', { error: 'testing' } );

		transport.checkStatus().fail( tstub, () => {
			assert.true( tstub.calledWith( 'testing', { error: 'testing' } ) );
			assert.false( usstub.called );
			done();
		} );
	} );

}() );
