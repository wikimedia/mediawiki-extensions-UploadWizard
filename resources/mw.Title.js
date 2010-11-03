/**
 * Represents a "title", or some piece of content, tracked by MediaWiki.
 * There are numerous ways of representing the title, so this bundles them all together so you
 * don't have to write conversion functions between human-readable version, api version, local filename...
 *
 * Let's learn how MediaWiki thinks of all this (see Title.php).
 *
 * MEDIAWIKI'S TERMINOLOGY
 * 'text' form means that underscores are changed to spaces. human-readable.
 *
 * Title = PrefixedDb "User_talk:Foo_bar.jpg"   
 *         PrefixedText = "User talk:Foo bar.jpg"
 *   - Prefix = "User_talk"  (also called namespace, this is a controlled list of namespaces (see wg* globals))
 *   - Main = "Foo_bar.jpg"  
 *   - MainText = "Foo bar.jpg"
 *      - Name = "Foo_bar"
 *      - NameText = "Foo bar"
 *      - Extension "jpg"
 *
 * n.b. this class does not handle URI-escaping
 *
 * n.b. this class relies on the existence of two globals:
 *   wgFormattedNamespaces - array of id numbers (as strings) to localized namespace names
 *   wgNamespaceIds - abstract namespace names to integer ids
 */

/** 
 * Constructor
 */
( function( $j ) { mw.Title = function( title, namespace ) {
	// integer namespace id
	var ns = 0;

	// should be '' if ns == 0, or namespace name plus ':' 
	var prefix = '';

	// name in canonical 'database' form
	var name = null;

	// extension
	var ext = null;

	/** 
	 * strip every illegal char we can think of
	 * yes, I know this leaves other insanity intact, like unicode bidi chars, but let's start someplace
	 * @return {String}
	 */
	function clean( s ) {
		if ( mw.isDefined( s ) ) {
			return s.replace( /[\x00-\x1f\s]+/g, '_' );
		}
	}

	/**
	 * Convenience method: return string like ".jpg", or "" if no extension
	 * @return {String}
	 */
	function getDotExtension() {
		return ext ? '.' + ext : '';
	}

	function text( s ) {
		return s.replace( /_/g, ' ' );
	}

	/** 
	 * Get in prefixed DB form = File:Foo_bar.jpg
	 * most useful for API calls, anything that must id the "title"
	 */
	this.toString = this.getPrefixedDb = function() {
		return prefix + this.getMain();
	};

	/**
	 * Get in a form similar to how it's displayed in heading on MediaWiki: "File:Foo bar.jpg"
	 * @return {String}
	 */
	this.toText = this.getPrefixedText = function() {
		return text( this.toString() );
	};

	/**
	 * The file without namespace, "Foo_bar.jpg" 
	 * @return {String}
	 */
	this.getMain = function() {
		return name + getDotExtension();
	};

	/**
	 * The "text" form "Foo bar.jpg" 
	 * @return {String}
	 */
	this.getMainText = function() {
		return text( this.getMain() );
	};

	/**
	 * the name, as "Foo bar"
	 * @return {String}
	 */
	this.getNameText = function() {
		return text( name );
	};
	
	/**
	 * Set the "name" portion, removing illegal characters and canonicalizing with first character uppercased.
	 * @param {String} s: name
	 * @return {mw.Title} this
	 */
	this.setName = function( s ) {
		name = mw.ucfirst( $j.trim( clean ( s ) ) );
		return this;
	};

	/**
	 * Set the name portion from human readable text, e.g. "foo bar" -> "Foo_bar"
	 * @param {String} s: name
	 * @return {mw.Title} this
	 */
	this.setNameText = function( s ) { 
		name = mw.ucfirst( $j.trim( clean ( s ) ) ).replace( / /g, '_' );
		return this;
	}

	/**
	 * Set namespace by canonical namespace id (integer)
	 * This global is an object of string key-vals, so we make sure to look up "-2" not -2
	 * @param id 
	 * @return {mw.Title} this
	 */	
	this.setNamespaceById = function( id ) {
		ns = id;
		prefix = wgFormattedNamespaces[ "" + id ].replace( / /g, '_' ) + ':';
		return this;
	};

	/**
	 * Set namespace by canonical name like 'file';
	 * @param namespace name
	 * @return {mw.Title} this
	 */	
	this.setNamespace = function( s ) { 
		if ( !mw.isDefined( wgNamespaceIds[ s ] ) ) { 
			throw new Error( 'unrecognized namespace: ' + s );
		}
		return this.setNamespaceById( wgNamespaceIds[ s ] );
	};

	/**
	 * Given a localized prefix like "File" set the namespace id
	 * Note that for most wikis, "" is a valid prefix, will set namespace to 0
	 * @param localized namespace name
	 * @return {mw.Title} this
	 */
	this.setPrefix = function( s ) {
		var found = false;
		var _this = this;
		$j.each( wgFormattedNamespaces, function( k, v ) {
			if ( s === v ) {
				found = true;
				_this.setNamespaceById( parseInt( k, 10 ) );
				return false;
			} 	
		} );
		if ( !found ) { 
			throw new Error( "unrecognized prefix" );
		}
		return this;
	};

	/**
	 * Set the "extension" portion, removing illegal characters
	 * @param {String} s: name
	 * @return {mw.Title} this
	 */
	this.setExtension = function(s) {
		ext = clean( s.toLowerCase() );
		return this;
	};


	/**
	 * Get the extension (returns null if there was none)
	 * @return {String|null} extension
	 */
	this.getExtension = function() {
		return ext;
	}


	// initialization
	var matches = title.match( /^(?:([^:]+):)?(.*?)(?:\.(\w{1,5}))?$/ );
	if ( matches.length ) {
		matches[1] && this.setPrefix( matches[1] );
		matches[2] && this.setName( matches[2] );
		matches[3] && this.setExtension( matches[3] );
	} else {
		throw new Error( "couldn't parse title '" + title + "'" );
	}

	if ( mw.isDefined( namespace ) ) {
		this.setNamespace( namespace );
	}

}; } )( jQuery );

