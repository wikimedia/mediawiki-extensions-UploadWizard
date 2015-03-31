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

( function ( mw, uw ) {
	QUnit.module( 'uw.EventFlowLogger', QUnit.newMwEnvironment() );

	QUnit.test( 'sanity test', 1, function ( assert ) {
		var eventLog = { logEvent: this.sandbox.stub() },
			logger = new uw.EventFlowLogger( eventLog );

		logger.logStep( 'foo' );
		logger.logSkippedStep( 'bar' );
		logger.logEvent( 'baz' );
		assert.ok( eventLog.logEvent.calledThrice, 'all steps were logged' );
	} );

	QUnit.test( 'installExceptionLogger', 3, function () {
		var eventLog = { logEvent: this.sandbox.stub() },
			logger = new uw.EventFlowLogger( eventLog );

		this.sandbox.stub( mw, 'trackSubscribe' );

		logger.installExceptionLogger();

		sinon.assert.calledWith( mw.trackSubscribe, 'global.error', sinon.match.typeOf( 'function' ) );
		mw.trackSubscribe.firstCall.args[1]( 'global.error', {
			errorMessage: 'Foo',
			url: 'http://example.com/bar.js',
			lineNumber: 123,
			columnNumber: '45',
			errorObject: { stack: 'foo() at bar.js#123' }
		} );
		sinon.assert.calledWith( eventLog.logEvent, 'UploadWizardExceptionFlowEvent', {
			flowId: sinon.match.defined,
			message: 'Foo',
			url: 'http://example.com/bar.js',
			line: 123,
			column: 45,
			stack: undefined
		} );
		eventLog.logEvent.reset();
		mw.trackSubscribe.firstCall.args[1]( 'global.error', {
			errorMessage: 'Foo',
			url: 'http://example.com/bar.js',
			lineNumber: undefined,
			columnNumber: null,
			errorObject: undefined
		} );
		sinon.assert.calledWith( eventLog.logEvent, 'UploadWizardExceptionFlowEvent', {
			flowId: sinon.match.defined,
			message: 'Foo',
			url: 'http://example.com/bar.js',
			line: undefined,
			column: undefined,
			stack: undefined
		} );
	} );
} ( mediaWiki, mediaWiki.uploadWizard ) );
