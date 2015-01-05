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

	function createTransport( enableChunked, chunkSize ) {
		var config;

		enableChunked = ( enableChunked === undefined ) ? false : enableChunked;
		chunkSize = chunkSize || 0;

		config = {
			chunkSize: chunkSize,
			enableChunked: enableChunked,
			maxPhpUploadSize: 0
		};

		return new mw.FormDataTransport( '/w/api.php', {}, config );
	}

	QUnit.test( 'Constructor sanity test', 1, function ( assert ) {
		var transport = createTransport();

		assert.ok( transport );
	} );

	QUnit.test( 'abort', 3, function ( assert ) {
		var abortStub = this.sandbox.stub(),
			transport = createTransport();

		transport.xhr = { abort: abortStub };

		assert.ok( abortStub.notCalled );

		transport.abort();

		assert.ok( abortStub.called );
		assert.ok( transport.aborted );
	} );

	QUnit.test( 'createXHR', 1, function ( assert ) {
		var transport = createTransport( false, 10 ),
			xhr = transport.createXHR();

		assert.ok( xhr );

		// @TODO there may not be a good way to test events on the XHR,
		// but if such a way crops up later, test 'progress' and 'abort' here.
	} );

	QUnit.test( 'createFormData', 1, function ( assert ) {
		var transport = createTransport( false, 10 ),
			fd = transport.createFormData( 'foobar.jpg', 0 );

		assert.ok( fd );

		// @TODO ARGH APPARENTLY there is no way to access the properties of a
		// FormData object, so until we can figure THAT out, this is incomplete.
	} );

	QUnit.test( 'sendData', 6, function ( assert ) {
		var transport = createTransport( false, 10 ),
			fakexhr = { open: this.sandbox.stub(), send: this.sandbox.stub() },
			fakefd = { send: this.sandbox.stub() };

		transport.insufficientFormDataSupport = true;

		transport.sendData( fakexhr, fakefd );
		assert.ok( fakexhr.open.called );
		assert.ok( !fakexhr.send.called );
		assert.ok( fakefd.send.called );

		transport.insufficientFormDataSupport = false;
		fakexhr.send.reset();
		fakexhr.open.reset();
		fakefd.send.reset();

		transport.sendData( fakexhr, fakefd );
		assert.ok( fakexhr.open.called );
		assert.ok( fakexhr.send.called );
		assert.ok( !fakefd.send.called );
	} );

	QUnit.test( 'upload', 4, function ( assert ) {
		var request,
			transport = createTransport( false, 10 ),
			fakeFile = {
				name: 'test file for fdt.jpg',
				size: 5
			};

		this.sandbox.useFakeXMLHttpRequest();
		this.sandbox.useFakeServer();

		transport.upload( fakeFile );

		assert.strictEqual( this.sandbox.server.requests.length, 1 );
		request = this.sandbox.server.requests[0];
		assert.strictEqual( request.method, 'POST' );
		assert.strictEqual( request.url, '/w/api.php' );
		assert.ok( request.async );
	} );

	QUnit.test( 'uploadChunk', 4, function ( assert ) {
		var request,
			transport = createTransport( true, 10 ),
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
		request = this.sandbox.server.requests[0];
		assert.strictEqual( request.method, 'POST' );
		assert.strictEqual( request.url, '/w/api.php' );
		assert.ok( request.async );
	} );

	QUnit.test( 'checkStatus', 7, function ( assert ) {
		var transport = createTransport( false, 10 ),
			usstub = this.sandbox.stub(),
			tstub = this.sandbox.stub(),
			postd = $.Deferred(),
			poststub = this.sandbox.stub( transport.api, 'post' ).returns( postd.promise() );

		transport.on( 'transported', tstub );
		transport.on( 'update-stage', usstub );

		transport.checkStatus();
		transport.firstPoll = 0;
		postd.resolve( { upload: { result: 'Poll' } } );
		assert.ok( tstub.calledWith( {
			code: 'server-error',
			info: 'unknown server error'
		} ) );

		postd = $.Deferred();
		poststub.reset();
		poststub.returns( postd.promise() );
		tstub.reset();
		transport.checkStatus();
		postd.resolve( { upload: { result: 'Poll', stage: 'test' } } );
		assert.ok( !tstub.called );
		assert.ok( usstub.calledWith( 'test' ) );

		postd = $.Deferred();
		poststub.reset();
		poststub.returns( postd.promise() );
		tstub.reset();
		usstub.reset();
		transport.checkStatus();
		postd.resolve( 'testing' );
		assert.ok( tstub.calledWith( 'testing' ) );
		assert.ok( !usstub.called );

		postd = $.Deferred();
		poststub.reset();
		poststub.returns( postd.promise() );
		tstub.reset();
		usstub.reset();
		transport.checkStatus();
		postd.reject( 500, 'testing' );
		assert.ok( tstub.calledWith( 'testing' ) );
		assert.ok( !usstub.called );
	} );

	QUnit.test( 'parseResponse', 2, function ( assert ) {
		var cbstub = this.sandbox.stub(),
			transport = createTransport( false, 10 );

		transport.parseResponse( {
			target: {
				responseText: '{"testing": "testing"}'
			}
		}, cbstub );

		assert.ok( cbstub.calledWith( { testing: 'testing' } ) );

		cbstub.reset();
		transport.parseResponse( { target: { code: 'test', responseText: 'a test error' } }, cbstub );
		assert.ok( cbstub.calledWith( {
			error: {
				code: 'test',
				info: 'a test error'
			}
		} ) );
	} );

	QUnit.test( 'emitParsedResponse', 2, function ( assert ) {
		var tstub = this.sandbox.stub(),
			transport = createTransport( false, 10 );

		transport.on( 'transported', tstub );

		transport.emitParsedResponse( {
			target: {
				responseText: '{"testing": "testing"}'
			}
		} );

		assert.ok( tstub.calledWith( { testing: 'testing' } ) );
		tstub.reset();

		transport.emitParsedResponse( {
			target: {
				code: 'test',
				responseText: 'a test error'
			}
		} );
		assert.ok( tstub.calledWith( {
			error: {
				code: 'test',
				info: 'a test error'
			}
		} ) );
	} );

	QUnit.test( 'geckoFormData', 4, function ( assert ) {
		var transport = createTransport( false, 10 ),
			fd = transport.geckoFormData();

		assert.ok( $.isFunction( fd.append ) );
		assert.ok( $.isFunction( fd.appendFile ) );
		assert.ok( $.isFunction( fd.appendBlob ) );
		assert.ok( $.isFunction( fd.send ) );
	} );
}( mediaWiki, jQuery ) );
