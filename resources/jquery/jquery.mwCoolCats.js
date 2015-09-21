/**
 * Simple predictive typing category adder for Mediawiki.
 * Relies on mw.Title, mw.api.category, $.fn.removeCtrl
 * Add to the page and then use getWikiText() to get wiki text representing the categories.
 *
 * N.B. Relies on the DOM to store the widget state.
 * On user action, list items are created, which have Titles as data properties.
 * To get the wikiText, we just select the list items again, get the Titles, convert to text, and return that.
 * This gets a bit complex as there is a hack for hidden categories too, and then another hack for default text
 * when the user hasn't entered any categories (not counting hidden categories!).
 * This should probably not be going through the DOM, could be more MVC.
 */
( function ( mw, $ ) {
$.fn.mwCoolCats = function ( options ) {

	var defaults, settings, cx, seenCat, $container, $template,
		NS_CATEGORY = mw.config.get( 'wgNamespaceIds' ).category;

	/**
	 * Get content from our text field, and attempt to insert it as a category.
	 * May require confirmation from user if they appear to be adding a new category.
	 */
	function processInput( input, shouldcreate ) {
		var text, title, cat,
			$input = $( input ),
			$label = $input.closest('p');
		$( '.mwe-upwiz-category-will-be-added', $label ).remove();
		if ( $input.length === 0 ) {
			$input = $( 'input', $container );
			if ( $input.length === 0 ) {
				return;
			}
		}

		text = $input.val();
		title = mw.Title.newFromUserInput( text, NS_CATEGORY );
		if ( !title ) {
			// This also checks for empty $input
			$input.removeData( 'title' );
			return;
		}

		$input.data( 'title', title );

		cat = title.getMainText();

		$input.removeClass( 'will-be-added' );
		if ( seenCat[cat] !== true && !doesCatExist( cat ) ) {
			$label.append( '<span class="mwe-upwiz-category-will-be-added"></span>' );
			$input.addClass( 'will-be-added' );
			$( '.mwe-upwiz-category-will-be-added', $label ).text( settings.willbeaddedtext );
		}

		if ( shouldcreate === true ) {
			insertCat( title );
		}
	}

	function doesCatExist( cat ) {
		var exists = false;
		$( 'input.will-be-added' ).each(function () {
			if ( $( this ).data( 'title' ) && $( this ).data( 'title' ).getMainText() === cat ) {
				exists = true;
				return false;
			}
		});
		return exists;
	}

	/**
	 * Add a new category to the page
	 * @param {mw.Title|null} title of category -- should already be in category namespace
	 * @param {boolean} whether this category is visible to the user
	 */
	function insertCat( title, isHidden ) {
		var $li, $anchor;

		if ( !title ) {
			return;
		}
		if ( containsCat( title ) ) {
			return;
		}

		$li = $( '<li/>' ).addClass( 'cat' );
		$anchor = $( '<a/>' ).addClass( 'cat' ).append( title.getMainText() );
		$li.append( $anchor );
		$li.data( 'title', title );
		if ( isHidden ) {
			$li.hide().addClass( 'hidden' );
			// extra 'hidden' class is necessary to distinguish deliberately hidden categories from those
			// which are hidden because the whole widget is closed
		} else {
			$anchor.attr( { target: '_blank', href: title.getUrl() } );
			$li.append( $.fn.removeCtrl( null, 'mwe-upwiz-category-remove', function () { $li.remove(); } ) );
		}
		$container.find( 'ul' ).append( $li );
	}

	/**
	 * Get all the categories on the page as mw.Titles, optionally filtered
	 * @param selector {String} optional extra filter
	 * @return {Array of mw.Title}
	 */
	function getCats( selector ) {
		if ( typeof selector === 'undefined' ) {
			selector = '*'; // fetch _ALL_ the categories!
		}
		return $container.find( 'ul li.cat, .categoryInput' )
				.filter( selector )
				.map( function () { return $( this ).data( 'title' ); } );
	}

	/**
	 * Check if we already have this category on the page
	 * @param {mw.Title}
	 * @return boolean, true if already on the page
	 */
	function containsCat( title ) {
		var s = title.toString();
		return getCats().filter( function () { return this.toString() === s; } ).length !== 0;
	}

	/**
	 * Return the wikitext formatted, newline separated list of categories
	 */
	function getWikiText() {

		var wikiText = getCats().map( function () { return '[[' + this.getPrefixedText() + ']]'; } )
						.toArray()
						.join( '\n' );

		// if so configured, and there are no user-visible categories, add warning
		if ( settings.missingCatsWikiText !== null && !( getCats( ':not(.hidden)' ).length ) ) {
			wikiText += '\n\n' + settings.missingCatsWikiText;
		}

		return wikiText;
	}

	/**
	 * Clear out all categories.
	 */
	function removeAllCats() {
		$container.find( 'ul li.cat' ).remove();
	}

	/**
	 * Add a new input to the categories form
	 */
	function newInput() {
		var $newInput = $template.clone();
		$newInput.mwCoolCats( $.extend( options, { link: false } ) );
		$newInput.wrap( '<p></p>' );
		$( 'a[name=catbutton]', $container ).before( $newInput.closest('p') );
	}

	/**
	 * Fetch and display suggestions for categories, based on what the user has already typed
	 * into the text field
	 */
	function fetchSuggestions() {
		var prefix, title,
			input = this;

		// Stripping out bad characters as necessary.
		title = mw.Title.newFromUserInput( $( this ).val(), NS_CATEGORY );
		if ( !title ) {
			return;
		}
		prefix = title.getPrefixedText();

		$( input ).data( 'request', settings.api.get( {
			action: 'opensearch',
			namespace: NS_CATEGORY,
			limit: 10,
			search: prefix
		} ).done( function ( res ) {
			var c,
				catList = res[1].map( function ( name ) {
					return mw.Title.newFromText( name, NS_CATEGORY ).getMainText();
				} );

			for ( c in catList ) {
				seenCat[catList[c]] = true;
			}
			$( input ).suggestions( 'suggestions', catList );
		} ) );
	}

	defaults = {
		buttontext: 'Add',
		hiddenCats: [],
		missingCatsWikiText: null,
		cats: []
	};

	settings = $.extend( {}, defaults, options );
	if ( !settings.api ) {
		throw new Error( 'jQuery.mwCoolCats needs an \'api\' argument' );
	}

	seenCat = {};
	for ( cx in settings.cats ) {
		seenCat[settings.cats[cx]] = true;
	}

	/**
	 * Initialize the text field(s) the widget was given to be category pickers.
	 */
	return this.each( function () {

		var input = $( this );

		input.addClass( 'categoryInput' );

		input.suggestions( {
			fetch: fetchSuggestions,
			cancel:function () {
				var req = $( this ).data( 'request' );
				// XMLHttpRequest.abort is unimplemented in IE6, also returns nonstandard value of "unknown" for typeof
				if ( req && ( typeof req.abort !== 'unknown' ) && ( typeof req.abort !== 'undefined' ) && req.abort ) {
					req.abort();
				}
			},
			result:{ select:function () {
				processInput( input );
			} }
		} );
		input.suggestions();

		if ( settings.link !== false ) {
			input.wrap( '<div class="cat-widget"></div>' ).wrap( '<p></p>' );
			$container = input.closest( '.cat-widget' ); // set to the cat-widget class we just wrapped
			$container.prepend( '<ul class="cat-list pkg"></ul>' );
			$container.append( $( '<a href="javascript:" name="catbutton"></a>' ).text( settings.buttontext )
				.click( function (e) {
					e.stopPropagation();
					e.preventDefault();
					newInput();
					return false;
				})
			);
		} else {
			$container = input.closest( '.cat-widget' );
		}

		//XXX ensure this isn't blocking other stuff needed.
		input.parents( 'form' ).submit( function () {
			$( 'input.categoryInput', $( this ) ).each( function () {
				processInput( this, true );
			});
		});

		input.keyup( function (e) {
			if ( e.keyCode === 13 ) {
				e.stopPropagation();
				e.preventDefault();
			}
			processInput(this);
		});
		input.blur( function () {
			processInput(this);
		});

		// We may want to call these functions from the input DOM element.
		this.getCats = getCats;
		this.insertCat = insertCat;
		this.removeAllCats = removeAllCats;
		this.getWikiText = getWikiText;

		// initialize with some categories, if so configured
		$.each( settings.cats, function ( i, cat ) {
			insertCat( mw.Title.newFromText( cat, NS_CATEGORY ) );
		} );
		$.each( settings.hiddenCats, function ( i, cat ) {
			insertCat( mw.Title.newFromText( cat, NS_CATEGORY ), true );
		} );

		processInput();

		$template = input.clone();
	} );

};
} )( mediaWiki, jQuery );
