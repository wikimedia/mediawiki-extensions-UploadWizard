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
	QUnit.module( 'mw.uploadWizard.controller.Upload', QUnit.newMwEnvironment() );

	QUnit.test( 'Constructor sense-check', ( assert ) => {
		const step = new uw.controller.Upload( new mw.Api(), {
			maxUploads: 10,
			maxSimultaneousConnections: 3
		} );
		assert.true( step instanceof uw.controller.Step );
		assert.true( !!step.ui );
	} );

	QUnit.test( 'updateFileCounts', function ( assert ) {
		const step = new uw.controller.Upload( new mw.Api(), {
				maxUploads: 5,
				maxSimultaneousConnections: 3
			} ),
			ufcStub = this.sandbox.stub( step.ui, 'updateFileCounts' );

		step.uploads = [ 1, 2 ];
		step.updateFileCounts();
		assert.true( ufcStub.calledWith( true, true ) );

		ufcStub.reset();
		step.uploads = [];
		step.updateFileCounts();
		assert.true( ufcStub.calledWith( false, true ) );

		ufcStub.reset();
		step.uploads = [ 1, 2, 3, 4, 5, 6 ];
		step.updateFileCounts();
		assert.true( ufcStub.calledWith( true, false ) );
	} );

	QUnit.test( 'canTransition', ( assert ) => {
		const upload = {},
			step = new uw.controller.Upload( new mw.Api(), {
				maxSimultaneousConnections: 1
			} );

		assert.strictEqual( step.canTransition( upload ), false );
		upload.state = 'new';
		assert.strictEqual( step.canTransition( upload ), true );
		upload.state = 'stashed';
		assert.strictEqual( step.canTransition( upload ), false );
	} );

	QUnit.test( 'transitionOne', function ( assert ) {
		const upload = {
				start: this.sandbox.stub()
			},
			step = new uw.controller.Upload( new mw.Api(), {
				maxSimultaneousConnections: 1
			} );

		this.sandbox.stub( step, 'maybeStartProgressBar' );
		assert.strictEqual( upload.start.called, false );
		step.transitionOne( upload );
		assert.true( upload.start.called );
	} );
}( mw.uploadWizard ) );
