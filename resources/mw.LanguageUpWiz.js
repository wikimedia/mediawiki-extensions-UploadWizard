( function( mw ) {
mediaWiki.messages.set( {
	"mwe-upwiz-code-unknown": "Unknown language"
} );

/**
 * Utility class which knows about languages, and how to construct HTML to select them
 * TODO: make this a more common library, used by this and TimedText
 */
mw.LanguageUpWiz = {

	defaultCode: null,

	initialized: false,

	UNKNOWN: 'unknown',

	/**
	 * List of default languages
	 * Make sure you have language templates set up for each of these on your wiki, e.g. {{en}}
	 * TODO make this more configurable.
	 */
	languages: ( function () {
		var langs = UploadWizardConfig.uwLanguages;
		var list = [];
		for ( var langcode in langs ) {
			list.push( { code: langcode, text: langs[langcode] } );
		}
		return list;
	} )(),

	// Helper function to see if a language is in the list.
	checkForLang: function( lang ) {
		for ( var langIndex in mw.LanguageUpWiz.languages ) {
			if ( mw.LanguageUpWiz.languages[langIndex].code === lang ) {
				return true;
			}
		}
		return false;
	},


	/**
	 * cache some useful objects
	 * 1) mostly ready-to-go language HTML menu. When/if we upgrade, make it a jQuery combobox
	 * 2) dict of language code to name -- useful for testing for existence, maybe other things.
	 */
	initialize: function() {
		if ( mw.LanguageUpWiz.initialized ) {
			return;
		}

		// If a descriptionlang param is passed in the query string, use that,
		// otherwise choose a good default for the description language.
		var thisUri = new mw.Uri( window.location.href, { overrideKeys: true } );
		if ( thisUri.query.descriptionlang && mw.LanguageUpWiz.checkForLang( thisUri.query.descriptionlang ) ) {
			mw.LanguageUpWiz.defaultCode = thisUri.query.descriptionlang;
		} else if ( mw.LanguageUpWiz.checkForLang( mw.config.get( 'wgUserLanguage' ) ) ) {
			mw.LanguageUpWiz.defaultCode = mw.config.get( 'wgUserLanguage' );
		} else if ( mw.LanguageUpWiz.checkForLang( mw.config.get( 'wgContentLanguage' ) ) ) {
			mw.LanguageUpWiz.defaultCode = mw.config.get( 'wgContentLanguage' );
		} else if ( mw.LanguageUpWiz.checkForLang( 'en' ) ) {
			mw.LanguageUpWiz.defaultCode = 'en';
		} else {
			mw.LanguageUpWiz.defaultCode = mw.LanguageUpWiz.languages[0].code;
		}

		mw.LanguageUpWiz._codes = {};
		var select = $j( '<select/>' );
		$j.each( mw.LanguageUpWiz.languages, function( i, language ) {
			// add an option for each language
			var $opt = $j( '<option>' )
				.attr( 'value', language.code )
				.append( language.text );

			if ( language.code === this.defaultCode ) {
				$opt.prop( 'selected', true );
			}

			select.append( $opt );

			// add each language into dictionary
			mw.LanguageUpWiz._codes[language.code] = language.text;
		} );
		mw.LanguageUpWiz.$_select = select;
		mw.LanguageUpWiz.initialized = true;
	},

	/**
	 * Get an HTML select menu of all our languages.
	 * @param name	desired name of select element
	 * @param code	selected language code
	 * @return HTML	select element configured as desired
	 */
	getMenu: function( name, code ) {
		mw.LanguageUpWiz.initialize();
		/* If we did not request a specific selected language code, see if we have a default. */
		if ( mw.LanguageUpWiz.defaultCode !== null && code === mw.LanguageUpWiz.UNKNOWN ) {
			code = mw.LanguageUpWiz.defaultCode;
		}

		var $select = mw.LanguageUpWiz.$_select.clone();
		$select.attr( 'name', name );
		if ( code === mw.LanguageUpWiz.UNKNOWN ) {
			// n.b. MediaWiki LanguageHandler has ability to add custom label for 'Unknown'; possibly as pseudo-label
			$select.prepend( $j( '<option>' ).attr( 'value', mw.LanguageUpWiz.UNKNOWN ).append( mw.msg( 'mwe-upwiz-code-unknown' )) );
			$select.val( mw.LanguageUpWiz.UNKNOWN );
		}

		/* Pre select the 'code' language */
		if ( code !== undefined && mw.LanguageUpWiz.checkForLang( code ) ) {
			$select.val( mw.LanguageUpWiz.getClosest( code ));
		}
		return $select.get( 0 );
	},

	/**
 	 * Figure out the closest language we have to a supplied language code.
	 * It seems that people on Mediawiki set their language code as freetext, and it could be anything, even
	 * variants we don't have a record for, or ones that are not in any ISO standard.
	 *
	 * Logic copied from MediaWiki:LanguageHandler.js
	 * handle null cases, special cases for some Chinese variants
	 * Otherwise, if handed "foo-bar-baz" language, try to match most specific language,
	 *    "foo-bar-baz", then "foo-bar", then "foo"
	 *
	 * @param code 	A string representing a language code, which we may or may not have.
	 *		Expected to be separated with dashes as codes from ISO 639, e.g. "zh-tw" for Chinese ( Traditional )
	 * @return a language code which is close to the supplied parameter, or fall back to mw.LanguageUpWiz.defaultCode
	 */
	getClosest: function( code ) {
		mw.LanguageUpWiz.initialize();
		if ( typeof ( code ) != 'string' || code === null || code.length === 0 ) {
			return mw.LanguageUpWiz.defaultCode;
		}
    		if ( code == 'nan' || code == 'minnan' ) {
			return 'zh-min-nan';
		} else if ( mw.LanguageUpWiz._codes[code] !== undefined ) {
			return code;
		}
		return mw.LanguageUpWiz.getClosest( code.substring( 0, code.indexOf( '-' )) );
	}
};

} )( window.mediaWiki );
