QUnit.module( 'mw.uploadWizard.LocationDetailsWidget' );

[
	[ '', 0 ],
	[ '1', 1 ],
	[ ' -1,20° ', -1.2 ],
	[ '1.2 N', 1.2 ],
	[ '1.2 S', -1.2 ],
	[ '1.2 E', 1.2 ],
	[ '1.2 W', -1.2 ],
	[ '-1.2 W', 1.2 ],
	[ '3° 12.75\'', 3.2125 ],
	[ '3° 12\' 45"', 3.2125 ],
	[ '3° 12\' 100"', NaN ],
	[ '3° 100\' 45"', NaN ],
	[ '1000° 12\' 45"', NaN ],
	[ '0 1 2 3', 123 ],
	[ '1 2 3 4', NaN ],
	[ '3° 12\' 45" N 1° 00\' 00" E', NaN ],
	[ '1.2.3', NaN ]
].forEach( ( testCase ) => {
	const input = testCase[ 0 ],
		expected = testCase[ 1 ];
	QUnit.test( 'normalizeCoordinate( \'' + input + '\' )', ( assert ) => {
		const result = mw.uploadWizard.LocationDetailsWidget.prototype.normalizeCoordinate( input );
		assert.true( isFinite( result ) === isFinite( expected ) );
		if ( isFinite( expected ) ) {
			assert.strictEqual( result, expected );
		}
	} );
} );

QUnit.test.each( 'setupInputs / setSerialized trims excess coordinate precision to 6 decimal places', {
	'excess precision': [ '52.52000659999999', '52.520007' ],
	'negative excess precision': [ '-13.404953999999998', '-13.404954' ],
	'number, e.g. from EXIF': [ 52.52000659999999, '52.520007' ],
	zero: [ 0, '0' ],
	'empty value': [ '', '' ],
	'invalid text is kept': [ 'abc', 'abc' ],
	'out of range is kept': [ '1000', '1000' ],
	'degrees, minutes, seconds': [ '40° 26\' 46" S', '-40.446111' ]
}, ( assert, [ input, expected ] ) => {
	const widget = new mw.uploadWizard.LocationDetailsWidget( {
		latitudeKey: 'latitude',
		longitudeKey: 'longitude',
		headingKey: 'heading'
	} );

	widget.setSerialized( { latitude: input, longitude: input, heading: '180' } );

	assert.strictEqual( widget.getSerialized().latitude, expected, 'latitude' );
	assert.strictEqual( widget.getSerialized().longitude, expected, 'longitude' );
	assert.strictEqual( widget.getSerialized().heading, '180', 'heading' );
} );
