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
].forEach( function ( testCase ) {
	var input = testCase[ 0 ],
		expected = testCase[ 1 ];
	QUnit.test( 'normalizeCoordinate( \'' + input + '\' )', function ( assert ) {
		var result = mw.uploadWizard.LocationDetailsWidget.prototype.normalizeCoordinate( input );
		assert.true( isFinite( result ) === isFinite( expected ) );
		if ( isFinite( expected ) ) {
			assert.strictEqual( result, expected );
		}
	} );
} );
