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

( function ( mw, $ ) {
	QUnit.module( 'mw.FormDataTransport', QUnit.newMwEnvironment() );

	function createTransport( chunkSize, api ) {
		var config;

		chunkSize = chunkSize || 0;
		api = api || {};

		config = {
			useRetryTimeout: false,
			chunkSize: chunkSize,
			maxPhpUploadSize: chunkSize
		};

		return new mw.FormDataTransport( api, {}, config );
	}

	QUnit.test( 'Constructor sanity test', 1, function ( assert ) {
		var transport = createTransport();

		assert.ok( transport );
	} );

	QUnit.test( 'abort', 3, function ( assert ) {
		var transport = createTransport( 0, { abort: this.sandbox.stub() } );

		assert.ok( transport.api.abort.notCalled );

		transport.abort();

		assert.ok( transport.api.abort.called );
		assert.ok( transport.aborted );
	} );

	QUnit.test( 'createParams', 3, function ( assert ) {
		var transport = createTransport( 10 ),
			params = transport.createParams( 'foobar.jpg', 0 );

		assert.ok( params );

		assert.strictEqual( params.filename, 'foobar.jpg' );
		assert.strictEqual( params.offset, 0 );
	} );

	QUnit.test( 'post', 2, function ( assert ) {
		var stub = this.sandbox.stub(),
		// post() works on a promise and binds .then, so we have to make
		// sure it actually is a promise, but also that it calls our stub
			transport = createTransport( 10, { post: function () {
				stub();
				return $.Deferred().resolve();
			} } );

		this.sandbox.useFakeXMLHttpRequest();
		this.sandbox.useFakeServer();

		assert.ok( stub.notCalled );

		transport.post( {} );

		assert.ok( stub.called );
	} );

	QUnit.test( 'upload', 4, function ( assert ) {
		var request,
			transport = createTransport( 10, new mw.Api() ),
			fakeFile = {
				name: 'test file for fdt.jpg',
				size: 5
			};

		this.sandbox.useFakeXMLHttpRequest();
		this.sandbox.useFakeServer();

		transport.upload( fakeFile, 'test file for fdt.jpg' );

		assert.strictEqual( this.sandbox.server.requests.length, 1 );
		request = this.sandbox.server.requests[ 0 ];
		assert.strictEqual( request.method, 'POST' );
		assert.strictEqual( request.url, mw.util.wikiScript( 'api' ) );
		assert.ok( request.async );

		transport.abort();
	} );

	QUnit.test( 'uploadChunk', 4, function ( assert ) {
		var request,
			transport = createTransport( 10, new mw.Api() ),
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

		this.sandbox.useFakeXMLHttpRequest();
		this.sandbox.useFakeServer();

		transport.uploadChunk( fakeFile, 0 );

		assert.strictEqual( this.sandbox.server.requests.length, 1 );
		request = this.sandbox.server.requests[ 0 ];
		assert.strictEqual( request.method, 'POST' );
		assert.strictEqual( request.url, mw.util.wikiScript( 'api' ) );
		assert.ok( request.async );

		transport.abort();
	} );

	QUnit.test( 'checkStatus', 8, function ( assert ) {
		var transport = createTransport( 10, new mw.Api() ),
			usstub = this.sandbox.stub(),
			tstub = this.sandbox.stub(),
			poststub = this.sandbox.stub( transport.api, 'post' ),
			postd, postd2;

		transport.on( 'update-stage', usstub );

		postd = $.Deferred();
		poststub.returns( postd.promise() );
		transport.checkStatus().fail( tstub );
		transport.firstPoll = 0;
		postd.resolve( { upload: { result: 'Poll' } } );
		assert.ok( tstub.calledWith( 'server-error', { error: {
			code: 'server-error',
			html: mw.message( 'apierror-unknownerror' ).parse()
		} } ) );

		postd = $.Deferred();
		postd2 = $.Deferred();
		poststub.reset();
		poststub
			.onFirstCall().returns( postd.promise() )
			.onSecondCall().returns( postd2.promise() );
		tstub.reset();
		transport.checkStatus();
		postd.resolve( { upload: { result: 'Poll', stage: 'test' } } );
		assert.ok( !tstub.called );
		assert.ok( usstub.calledWith( 'test' ) );
		postd2.resolve( { upload: { result: 'Success' } } );
		assert.ok( poststub.calledTwice );
		poststub.resetBehavior();

		postd = $.Deferred();
		poststub.reset();
		poststub.returns( postd.promise() );
		tstub.reset();
		usstub.reset();
		transport.checkStatus().done( tstub );
		postd.resolve( 'testing' );
		assert.ok( tstub.calledWith( 'testing' ) );
		assert.ok( !usstub.called );

		postd = $.Deferred();
		poststub.reset();
		poststub.returns( postd.promise() );
		tstub.reset();
		usstub.reset();
		transport.checkStatus().fail( tstub );
		postd.reject( 'testing', { error: 'testing' } );
		assert.ok( tstub.calledWith( 'testing', { error: 'testing' } ) );
		assert.ok( !usstub.called );
	} );

}( mediaWiki, jQuery ) );
