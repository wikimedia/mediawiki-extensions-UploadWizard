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
	QUnit.module( 'mw.uw.controller.Thanks', QUnit.newMwEnvironment() );

	QUnit.test( 'Constructor sanity test', 3, function ( assert ) {
		var step;

		mw.UploadWizard.config = { display: { thanksLabel: 'Thanks!' } };

		step = new uw.controller.Thanks();
		assert.ok( step );
		assert.ok( step instanceof uw.controller.Step );
		assert.ok( step.ui );
	} );

	QUnit.test( 'moveTo', 1, function ( assert ) {
		var step = new uw.controller.Thanks(),
			auStub = this.sandbox.stub( step.ui, 'addUpload' );

		this.sandbox.stub( step.ui, 'moveTo' );
		step.moveTo( [ 1, 2, 3 ] );

		assert.strictEqual( auStub.callCount, 3 );
	} );
}( mediaWiki.uploadWizard ) );
