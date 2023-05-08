( function ( uw ) {
	'use strict';

	var makeTitleInFileNSCases = [ {
		filename: 'foo.png',
		prefixedText: 'File:Foo.png',
		desc: 'filename without namespace starting with a lower case letter'
	}, {
		filename: 'foo_bar-baz.jpg',
		prefixedText: 'File:Foo bar-baz.jpg',
		desc: 'filename without namespace with space in it'
	}, {
		filename: 'MediaWiki:foo_bar.jpg',
		prefixedText: null,
		desc: 'filename starting with MediaWiki: (colons are disallowed)'
	}, {
		filename: 'File:foo_bar.jpg',
		prefixedText: 'File:Foo bar.jpg',
		desc: 'filename starting with File:'
	}, {
		filename: 'file:foo_bar.jpg',
		prefixedText: 'File:Foo bar.jpg',
		desc: 'filename starting with file:'
	}, {
		filename: 'Foo part 1/2.jpg',
		prefixedText: null,
		desc: 'filename with characters disallowed in file names'
	}, {
		filename: 'Foo #1.jpg',
		prefixedText: null,
		desc: 'filename including a # (disallowed in file names)'
	} ];

	QUnit.module( 'mw.uploadWizard.TitleDetailsWidget', QUnit.newMwEnvironment( {
		// mw.Title relies on these three config vars
		// Restore them after each test run
		config: {
			wgFormattedNamespaces: {
				'-2': 'Media',
				'-1': 'Special',
				0: '',
				1: 'Talk',
				2: 'User',
				3: 'User talk',
				4: 'Wikipedia',
				5: 'Wikipedia talk',
				6: 'File',
				7: 'File talk',
				8: 'MediaWiki',
				9: 'MediaWiki talk',
				10: 'Template',
				11: 'Template talk',
				12: 'Help',
				13: 'Help talk',
				14: 'Category',
				15: 'Category talk',
				// testing custom / localized namespace
				100: 'Penguins'
			},
			wgNamespaceIds: {
				/* eslint-disable camelcase */
				media: -2,
				special: -1,
				'': 0,
				talk: 1,
				user: 2,
				user_talk: 3,
				wikipedia: 4,
				wikipedia_talk: 5,
				file: 6,
				file_talk: 7,
				mediawiki: 8,
				mediawiki_talk: 9,
				template: 10,
				template_talk: 11,
				help: 12,
				help_talk: 13,
				category: 14,
				category_talk: 15,
				image: 6,
				image_talk: 7,
				project: 4,
				project_talk: 5,
				// Testing custom namespaces and aliases
				penguins: 100,
				antarctic_waterfowl: 100
				/* eslint-enable camelcase */
			},
			wgCaseSensitiveNamespaces: []
		}
	} ) );

	QUnit.test( '.static.makeTitleInFileNS()', function ( assert ) {
		var makeTitleInFileNS = uw.TitleDetailsWidget.static.makeTitleInFileNS;

		makeTitleInFileNSCases.forEach( function ( test ) {
			var title = makeTitleInFileNS( test.filename );
			assert.strictEqual(
				title ? title.getPrefixedText() : title,
				test.prefixedText,
				test.desc
			);
		} );
	} );
}( mw.uploadWizard ) );
