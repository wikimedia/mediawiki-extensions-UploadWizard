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

( function ( uw ) {
	QUnit.module( 'mw.uw.controller.Upload', QUnit.newMwEnvironment() );

	QUnit.test( 'Constructor sanity test', 3, function ( assert ) {
		var step = new uw.controller.Upload();
		assert.ok( step );
		assert.ok( step instanceof uw.controller.Step );
		assert.ok( step.ui );
	} );

	QUnit.test( 'updateFileCounts', 3, function ( assert ) {
		var step = new uw.controller.Upload(),
			ufcStub = this.sandbox.stub( step.ui, 'updateFileCounts' );

		step.updateFileCounts( true, 5, [ 1, 2 ] );
		assert.ok( ufcStub.calledWith( true, true ) );

		step.updateFileCounts( false, 5, [] );
		assert.ok( ufcStub.calledWith( false, true ) );

		step.updateFileCounts( true, 5, [ 1, 2, 3, 4, 5, 6 ] );
		assert.ok( ufcStub.calledWith( true, false ) );
	} );

	QUnit.test( 'canTransition', 4, function ( assert ) {
		var upload = {},
			step = new uw.controller.Upload( {
				maxSimultaneousConnections: 1
			} );

		assert.strictEqual( step.canTransition( upload ), false );
		upload.state = 'new';
		assert.strictEqual( step.canTransition( upload ), true );
		step.uploadsTransitioning = 1;
		assert.strictEqual( step.canTransition( upload ), false );
		step.uploadsTransitioning = 0;
		upload.state = 'stashed';
		assert.strictEqual( step.canTransition( upload ), false );
	} );

	QUnit.test( 'isTransitioning', 6, function ( assert ) {
		var upload = {},
			step = new uw.controller.Upload( {
				maxSimultaneousConnections: 1
			} );

		assert.strictEqual( step.isTransitioning( upload ), false );
		upload.state = 'new';
		assert.strictEqual( step.isTransitioning( upload ), false );
		upload.state = 'transporting';
		assert.strictEqual( step.isTransitioning( upload ), true );
		upload.state = 'transported';
		assert.strictEqual( step.isTransitioning( upload ), true );
		upload.state = 'metadata';
		assert.strictEqual( step.isTransitioning( upload ), true );
		upload.state = 'stashed';
		assert.strictEqual( step.isTransitioning( upload ), false );
	} );

	QUnit.test( 'isDoneTransitioning', 5, function ( assert ) {
		var upload = {},
			step = new uw.controller.Upload( {
				maxSimultaneousConnections: 1
			} );

		assert.strictEqual( step.isDoneTransitioning( upload ), false );
		upload.state = 'new';
		assert.strictEqual( step.isDoneTransitioning( upload ), false );
		upload.state = 'transporting';
		assert.strictEqual( step.isDoneTransitioning( upload ), false );
		upload.state = 'stashed';
		assert.strictEqual( step.isDoneTransitioning( upload ), true );
		upload.state = 'error';
		assert.strictEqual( step.isDoneTransitioning( upload ), true );
	} );

	QUnit.test( 'transitionStarter', 2, function ( assert ) {
		var upload = {
				start: this.sandbox.stub()
			},
			step = new uw.controller.Upload();

		assert.strictEqual( upload.start.called, false );
		step.transitionStarter( upload );
		assert.ok( upload.start.called );
	} );
}( mediaWiki.uploadWizard ) );
