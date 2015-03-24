/*
 * This file is part of the MediaWiki extension DeedWizard.
 *
 * DeedWizard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * DeedWizard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with DeedWizard.  If not, see <http://www.gnu.org/licenses/>.
 */

( function ( uw, $ ) {
	QUnit.module( 'mw.uw.controller.Step', QUnit.newMwEnvironment() );

	QUnit.test( 'Constructor sanity test', 2, function ( assert ) {
		var step = new uw.controller.Step( { on: $.noop }, {} );
		assert.ok( step );
		assert.ok( step.ui );
	} );

	QUnit.test( 'transitionAll', 4, function ( assert ) {
		var tostub, promise,
			donestub = this.sandbox.stub(),
			ds = [ $.Deferred(), $.Deferred(), $.Deferred() ],
			ps = [ ds[0].promise(), ds[1].promise(), ds[2].promise() ],
			calls = [],
			step = new uw.controller.Step( { on: $.noop }, {
				maxSimultaneousConnections: 3
			} );

		step.uploads = [
			{ id: 15 },
			undefined,
			{ id: 21 },
			{ id: 'aoeu' }
		];

		tostub = this.sandbox.stub( step, 'transitionOne' );
		tostub.onFirstCall().returns( ps[0] );
		tostub.onSecondCall().returns( ps[1] );
		tostub.onThirdCall().returns( ps[2] );

		this.sandbox.stub( step, 'canTransition' ).returns( true );

		promise = step.transitionAll().done( donestub );
		calls = [ tostub.getCall( 0 ), tostub.getCall( 1 ), tostub.getCall( 2 ) ];

		assert.strictEqual( calls[0].args[0].id, 15 );
		assert.strictEqual( calls[1].args[0].id, 21 );

		ds[0].resolve();
		ds[1].resolve();
		assert.strictEqual( donestub.called, false );

		ds[2].resolve();
		assert.ok( donestub.called );
	} );
}( mediaWiki.uploadWizard, jQuery ) );
