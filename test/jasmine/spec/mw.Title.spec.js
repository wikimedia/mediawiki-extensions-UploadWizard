describe( "mw.Title", function() {

	// these are typically initialized as globals...
	wgFormattedNamespaces =  {
		"-2":"Media",
		"-1":"Special",
		"0":"",
		"1":"Talk",
		"2":"User",
		"3":"User talk",
		"4":"CommonsDev",
		"5":"CommonsDev talk",
		"6":"File",
		"7":"File talk",
		"8":"MediaWiki",
		"9":"MediaWiki talk",
		"10":"Template",
		"11":"Template talk",
		"12":"Help",
		"13":"Help talk",
		"14":"Category",
		"15":"Category talk",
		/* testing custom / localized */
		"99":"Penguins"
	};
	wgNamespaceIds = {
		"media":-2,
		"special":-1,
		"":0,
		"talk":1,
		"user":2,
		"user_talk":3,
		"commonsdev":4,
		"commonsdev_talk":5,
		"file":6,
		"file_talk":7,
		"mediawiki":8,
		"mediawiki_talk":9,
		"template":10,
		"template_talk":11,
		"help":12,
		"help_talk":13,
		"category":14,
		"category_talk":15,
		"image":6,
		"image_talk":7,
		/* testing custom / localized */
		"antarctic_waterfowl":99
	};


	describe( "basic" , function() { 

		it( "should initialize from filename", function() {
			var title = new mw.Title( "File:foo_bar.JPG" );
			expect( title.getMain() ).toEqual( 'Foo_bar.jpg' );
			expect( title.getMainText() ).toEqual( 'Foo bar.jpg' );
			expect( title.getNameText() ).toEqual( 'Foo bar' );
			expect( title.toString() ).toEqual( "File:Foo_bar.jpg" );
		} );

		it( "should translate back and forth between human-readable and not", function() { 
			var title = new mw.Title( "File:foo_bar.JPG" );
			title.setName( "quux pif" );
			expect( title.getMain() ).toEqual( "Quux_pif.jpg" );
			expect( title.getMainText() ).toEqual( "Quux pif.jpg" );
			expect( title.getNameText() ).toEqual( "Quux pif" );
			expect( title.toString() ).toEqual( "File:Quux_pif.jpg" );
			title.setName( "glarg_foo_glang" );
			expect( title.toString() ).toEqual( "File:Glarg_foo_glang.jpg" );
			expect( title.getMainText() ).toEqual( "Glarg foo glang.jpg" );
		} );

		it( "should allow initialization from filename + namespace", function() { 
			var title = new mw.Title( "catalonian_penguins.PNG" );
			title.setNamespace( 'file' );
			expect( title.toString() ).toEqual( "File:Catalonian_penguins.png" );
		} );

		it( "should allow initialization using mediawiki global namespaces", function() { 
			var title = new mw.Title( "something.PDF" );
			title.setNamespace( 'file' );
			expect( title.toString() ).toEqual( "File:Something.pdf" );

			var title = new mw.Title( "NeilK" );
			title.setNamespace( 'user_talk' );
			expect( title.toString() ).toEqual( "User_talk:NeilK" );
			expect( title.toText() ).toEqual( "User talk:NeilK" );

			var title = new mw.Title( "Frobisher" );
			title.setNamespaceById( 99 );
			expect( title.toString() ).toEqual( "Penguins:Frobisher" );

			var title = new mw.Title( "flightless_yet_cute.jpg" );
			title.setNamespace( "antarctic_waterfowl" );
			expect( title.toString() ).toEqual( "Penguins:Flightless_yet_cute.jpg" );

			var title = new mw.Title( "flightless_yet_cute.jpg" );
			title.setPrefix( "Penguins" );
			expect( title.toString() ).toEqual( "Penguins:Flightless_yet_cute.jpg" );

			var title = new mw.Title( "flightless_yet_cute.jpg" );
			expect( function() { 
				title.setPrefix( "Entirely Unknown" );
			} ).toThrow( "unrecognized prefix" );
		} );
		
	} );

} );
