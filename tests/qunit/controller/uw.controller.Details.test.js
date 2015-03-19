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
	QUnit.module( 'mw.uw.controller.Details', QUnit.newMwEnvironment() );

	function createTestUpload( sandbox, customDeedChooser, aborted ) {
		var stubs = {
			bascm: sandbox.stub(),
			cd: sandbox.stub(),
			ct: sandbox.stub(),
			ucdc: sandbox.stub()
		};

		return {
			chosenDeed: {
				name: customDeedChooser ? 'custom' : 'cc-by-sa-4.0'
			},

			createDetails: stubs.cd,

			details: {
				buildAndShowCopyMetadata: stubs.bascm,

				titleInput: {
					checkTitle: stubs.ct
				},

				useCustomDeedChooser: stubs.ucdc
			},

			state: aborted ? 'aborted' : 'stashed',

			stubs: stubs
		};
	}

	QUnit.test( 'Constructor sanity test', 3, function ( assert ) {
		var step = new uw.controller.Details();
		assert.ok( step );
		assert.ok( step instanceof uw.controller.Step );
		assert.ok( step.ui );
	} );

	QUnit.test( 'moveTo', 16, function ( assert ) {
		var step = new uw.controller.Details(),
			testUpload = createTestUpload( this.sandbox ),
			stepUiStub = this.sandbox.stub( step.ui, 'moveTo' );

		step.moveTo( [ testUpload ] );

		assert.strictEqual( testUpload.stubs.bascm.called, false );
		assert.strictEqual( testUpload.stubs.ucdc.called, false );
		assert.ok( testUpload.stubs.cd.called );
		assert.ok( stepUiStub.called );

		testUpload = createTestUpload( this.sandbox, true );
		step.moveTo( [ testUpload ] );

		assert.strictEqual( testUpload.stubs.bascm.called, false );
		assert.ok( testUpload.stubs.ucdc.called );
		assert.ok( testUpload.stubs.cd.called );
		assert.ok( stepUiStub.called );

		testUpload = createTestUpload( this.sandbox );
		step.moveTo( [ testUpload, createTestUpload( this.sandbox ) ] );

		assert.ok( testUpload.stubs.bascm.called );
		assert.strictEqual( testUpload.stubs.ucdc.called, false );
		assert.ok( testUpload.stubs.cd.called );
		assert.ok( stepUiStub.called );

		testUpload = createTestUpload( this.sandbox );
		step.moveTo( [ testUpload, createTestUpload( this.sandbox, false, true ) ] );

		assert.strictEqual( testUpload.stubs.bascm.called, false );
		assert.strictEqual( testUpload.stubs.ucdc.called, false );
		assert.ok( testUpload.stubs.cd.called );
		assert.ok( stepUiStub.called );
	} );

	QUnit.test( 'canTransition', 4, function ( assert ) {
		var upload = {},
			step = new uw.controller.Details( {
				maxSimultaneousConnections: 1
			} );

		assert.strictEqual( step.canTransition( upload ), false );
		upload.state = 'details';
		assert.strictEqual( step.canTransition( upload ), true );
		step.uploadsTransitioning = 1;
		assert.strictEqual( step.canTransition( upload ), false );
		step.uploadsTransitioning = 0;
		upload.state = 'complete';
		assert.strictEqual( step.canTransition( upload ), false );
	} );
}( mediaWiki.uploadWizard ) );
