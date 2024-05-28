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
	QUnit.module( 'mw.uploadWizard.controller.Thanks', QUnit.newMwEnvironment() );

	QUnit.test( 'Constructor sanity test', function ( assert ) {
		var step = new uw.controller.Thanks( new mw.Api(), { display: { thanksLabel: 'Thanks!' } } );
		assert.true( step instanceof uw.controller.Step );
		assert.true( !!step.ui );
	} );

	QUnit.test( 'load', function ( assert ) {
		var step = new uw.controller.Thanks( new mw.Api(), {} ),
			auStub = this.sandbox.stub( step.ui, 'addUpload' );

		this.sandbox.stub( step.ui, 'load' );
		step.load( [
			{ on: function () {} },
			{ on: function () {} },
			{ on: function () {} }
		] );

		assert.strictEqual( auStub.callCount, 3 );
	} );

	QUnit.test( 'Custom button configuration', function ( assert ) {
		var config = {
				display: {
					homeButton: {
						label: 'This is a homepage URL',
						target: 'https://wiki.example.com/wiki/Main_Page'
					},
					beginButton: {
						label: 'Let me start again',
						target: 'https://commons.wikimedia.org/wiki/Special:UploadWizard'
					}
				}
			},
			uiThanks = new uw.ui.Thanks( config ),
			homeButtonNonMainNamespaceTarget = 'Vacation:Home',
			homeButtonRelativeTarget = 'Home_Sweet_Home';

		assert.strictEqual(
			uiThanks.homeButton.getLabel(),
			'This is a homepage URL',
			'The label of the home button matches the configured text.'
		);

		assert.strictEqual(
			uiThanks.homeButton.getHref(),
			'https://wiki.example.com/wiki/Main_Page',
			'The href of the home button matches the configured absolute URL.'
		);

		assert.strictEqual(
			uiThanks.beginButton.getLabel(),
			'Let me start again',
			'The label of the begin button matches the configured text.'
		);

		assert.strictEqual(
			uiThanks.beginButton.getHref(),
			'https://commons.wikimedia.org/wiki/Special:UploadWizard',
			'The href of the begin button matches the configured URL.'
		);

		// Test a home button with a non-main namespace target
		config.display.homeButton.target = homeButtonNonMainNamespaceTarget;
		uiThanks = new uw.ui.Thanks( config );

		assert.strictEqual(
			uiThanks.homeButton.getHref(),
			mw.config.get( 'wgArticlePath' ).replace( '$1', homeButtonNonMainNamespaceTarget ),
			'The href of the home button matches the configured non-main namespace URL.'
		);

		// Test a home button with a relative target
		config.display.homeButton.target = homeButtonRelativeTarget;
		uiThanks = new uw.ui.Thanks( config );

		assert.strictEqual(
			uiThanks.homeButton.getHref(),
			mw.config.get( 'wgArticlePath' ).replace( '$1', homeButtonRelativeTarget ),
			'The href of the home button matches the configured relative URL.'
		);

	} );

	QUnit.test( 'Method drops the given parameter', function ( assert ) {
		var uiThanks = new uw.ui.Thanks( {} ),
			locationHref = 'https://commons.wikimedia.org/wiki/Special:UploadWizard?campaign=somecampaign&objref=testRef|MyPage|342&updateList=1&somevar=someval';

		assert.strictEqual(
			uiThanks.dropParameterFromURL( locationHref, 'updateList' ),
			'https://commons.wikimedia.org/wiki/Special:UploadWizard?campaign=somecampaign&objref=testRef%7CMyPage%7C342&somevar=someval',
			'The href of the begin button does not contain the updateList parameter.'
		);
	} );

}( mw.uploadWizard ) );
