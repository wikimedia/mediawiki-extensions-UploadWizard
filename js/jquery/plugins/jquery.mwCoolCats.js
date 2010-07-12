RegExp.escape = (function() {
  var specials = [
	'/', '.', '*', '+', '?', '|',
	'(', ')', '[', ']', '{', '}', '\\'
  ];

  sRE = new RegExp(
	'(\\' + specials.join('|\\') + ')', 'g'
  );
  
  return function(text) {
	return text.replace(sRE, '\\$1');
  }
})();
(function($){
	$.fn.mwCoolCats = function(options) {
	var defaults = {
		buttontext: 'Add'
	};
	var settings = $.extend( {}, defaults, options);
	var $container;
	return this.each( function() {
		var _this = $j( this );

		_this.suggestions( {
			'fetch': _fetchSuggestions,
			'cancel': function() {
				var req = $j( this ).data( 'request' );
				if ( req.abort ) {
					req.abort();
					}
			}
		} );
		_this.suggestions();

		_this.wrap('<div class="cat-widget"></div>');
		$container = _this.parent(); // set to the cat-widget class we just wrapped
		$container.append( $j( '<button type="button">'+settings.buttontext+'</button>' ) 
				.click( function(e) {
				e.stopPropagation(); 
				e.preventDefault(); 
				_processInput();
				return false;
				}) );
		$container.prepend('<ul class="cat-list pkg"></ul>');

		//XXX ensure this isn't blocking other stuff needed.
		_this.parents('form').submit( function() {
			_processInput();
		});
		
		_this.keyup(function(e) { 
			if(e.keyCode == 13) { 
				e.stopPropagation(); 
				e.preventDefault(); 
				_processInput();
			} 
		});

		var categoryNamespace = mw.getConfig( 'categoryNamespace' );
		this.getWikiText = function() {
			return _getCats().map( function() { return '[[' + categoryNamespace + ':' + this + ']]'; } )
				 .toArray()
				 .join( "\n" );
		};

		_processInput();
	});
	
	function _processInput() {
		var $input = $container.find( 'input' );
		_insertCat( $input.val().trim() );
		$input.val("");
	}

	function _insertCat( cat ) {
		if ( mw.isEmpty( cat ) || _containsCat( cat ) ) { 
			return; 
		}
		var href = _catLink( cat );
		var $li = $j( '<li class="cat"></li>' );
		$container.find( 'ul' ).append( $li );
		$li.append( '<a class="cat" target="_new" href="' + href + '">' + cat +' </a>' );
		$li.append( $j.fn.removeCtrl( 'mwe-upwiz-category-remove', function() { $li.remove(); } ) );
	}

	function _catLink( cat ) {
		var catLink = 
			encodeURIComponent( wgFormattedNamespaces[wgNamespaceIds['category']] )
			+ ':'
			+ encodeURIComponent( mw.ucfirst( $j.trim( cat ).replace(/ /g, '_' ) ) );

		// wgServer typically like 'http://commons.prototype.wikimedia.org'	
		// wgArticlePath typically like '/wiki/$1'
		if ( ! ( mw.isEmpty( wgServer ) && mw.isEmpty( wgArticlePath ) ) ) {
			catLink = wgServer + wgArticlePath.replace( /\$1/, catLink );
		}

		return catLink;
	}

	function _getCats() {
		return $container.find('ul li a.cat').map( function() { return this.text; } );
	}

	function _containsCat( cat ) {
		return _getCats().filter( function() { return this == cat; } ).length !== 0;
	}

	function _fetchSuggestions( query ) {
		var _this = this;
		var request = $j.ajax( {
			url: wgScriptPath + '/api.php',
			data: {
				'action': 'query',
				'list': 'allpages',
				'apnamespace': wgNamespaceIds['category'],
				'apprefix': $j( this ).val(),
				'format': 'json'
			},
			dataType: 'json',
			success: function( data ) {
				// Process data.query.allpages into an array of titles
				var pages = data.query.allpages;
				var titleArr = [];

				$j.each( pages, function( i, page ) {
					var title = page.title.split( ':', 2 )[1];
					titleArr.push( title );
				} );

				$j( _this ).suggestions( 'suggestions', titleArr );
			}
		} );

		$j( _this ).data( 'request', request );
	}


	}})(jQuery);
