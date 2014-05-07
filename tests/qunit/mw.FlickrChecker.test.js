( function( mw ) {
	'use strict';

	QUnit.module( 'ext.uploadWizard/mw.FlickrChecker.test.js', QUnit.newMwEnvironment( {
		setup: function() {
			mw.FlickrChecker.fileNames = {};
		}
	} ) );

	function getInstance() {
		var wizard = new mw.UploadWizard( {} ),
		// FlickrChecker doesn't actually do much with the upload so we can omit some of its dependencies
			upload = new mw.UploadWizardUpload( wizard);
		return new mw.FlickrChecker(wizard, upload);
	}

	QUnit.test( 'getFilenameFromItem() simple case', 1, function() {
		var flickrChecker = getInstance();
		QUnit.equal(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo.jpg'
		);
	} );

	QUnit.test( 'getFilenameFromItem() with empty title', 1, function() {
		var flickrChecker = getInstance();
		QUnit.equal(
			flickrChecker.getFilenameFromItem( '', 123, 'johndoe' ),
			'johndoe - 123.jpg'
		);
	} );

	QUnit.test( 'getFilenameFromItem() name conflict within instance', 2, function() {
		var flickrChecker = getInstance(),
			fileName = flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' );
		QUnit.equal(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo.jpg'
		);
		flickrChecker.reserveFileName( fileName );
		QUnit.equal(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo - 123.jpg'
		);
	} );

	QUnit.test( 'getFilenameFromItem() name conflict between different instances', 2, function() {
		var flickrChecker = getInstance(),
			fileName = flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' );
		QUnit.equal(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo.jpg'
		);
		flickrChecker.reserveFileName( fileName );
		flickrChecker = getInstance();
		QUnit.equal(
			flickrChecker.getFilenameFromItem( 'foo', 123, 'johndoe' ),
			'foo - 123.jpg'
		);
	} );
} ( mediaWiki ) );