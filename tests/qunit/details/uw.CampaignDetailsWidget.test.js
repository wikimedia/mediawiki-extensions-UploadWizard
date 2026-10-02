QUnit.module( 'mw.uploadWizard.CampaignDetailsWidget' );

QUnit.test( 'text field', ( assert ) => {
	const widget = new mw.uploadWizard.CampaignDetailsWidget( {
		wikitext: '{{Foo|$1}}',
		maxLength: 25
	} );

	assert.true( widget.input instanceof OO.ui.TextInputWidget );
	assert.false( widget.input instanceof OO.ui.MultilineTextInputWidget );
	assert.strictEqual( widget.input.$input.attr( 'maxlength' ), '25' );

	widget.setSerialized( { value: ' Bar ' } );
	assert.strictEqual( widget.getWikiText(), '{{Foo|Bar}}' );
} );

QUnit.test( 'textarea field', ( assert ) => {
	const widget = new mw.uploadWizard.CampaignDetailsWidget( {
		wikitext: '{{Foo|$1}}',
		type: 'textarea',
		maxLength: 1000
	} );

	assert.true( widget.input instanceof OO.ui.MultilineTextInputWidget );
	assert.strictEqual( widget.input.$input.prop( 'tagName' ), 'TEXTAREA' );
	assert.strictEqual( widget.input.$input.attr( 'maxlength' ), '1000' );

	widget.setSerialized( { value: 'Bar\nBaz\n' } );
	assert.strictEqual( widget.getWikiText(), '{{Foo|Bar\nBaz}}' );
	assert.deepEqual( widget.getSerialized(), { value: 'Bar\nBaz\n' } );
} );

QUnit.test( 'select field', ( assert ) => {
	const widget = new mw.uploadWizard.CampaignDetailsWidget( {
		wikitext: '{{Foo|$1}}',
		type: 'select',
		options: { bar: 'Bar', baz: 'Baz' }
	} );

	assert.true( widget.input instanceof OO.ui.DropdownInputWidget );
	widget.setSerialized( { value: 'baz' } );
	assert.strictEqual( widget.getWikiText(), '{{Foo|baz}}' );
} );

QUnit.test( 'unknown field type', ( assert ) => {
	assert.throws(
		() => new mw.uploadWizard.CampaignDetailsWidget( { wikitext: '$1', type: 'foo' } ),
		/Unknown campaign field type: foo/
	);
} );
