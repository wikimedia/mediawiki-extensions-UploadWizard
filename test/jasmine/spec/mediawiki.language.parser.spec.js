/* spec for language & message behaviour in MediaWiki */

// boilerplate crap, can we eliminate this?

/*
jQuery( document ).ready( function() {
	// add "magic" to Language template parser for keywords
	// mediaWiki.language.parser.templateProcessors.SITENAME = function() { return wgSitename; };
	
	// sets up plural "magic" and so on. Seems like a bad design to have to do this, though.
	// mediaWiki.language.magicSetup();
	
} );
*/

/**
 * Tests
 */
describe( "mediaWiki.language.parser", function() {
	

	describe( "basic message functionality", function() {
		mediaWiki.messages.set( {
			'simple-message': 'simple message'
		} );

		it( "should return identity for simple string", function() {
			expect( mediaWiki.msg( 'simple-message' ) ).toEqual( 'simple message' );
		} );

	} );

	describe( "test for matching functionality with PHP", function() {

		/**
		* Get a language transform key
		* returns default "en" fallback if none found
	 	* @FIXME the resource loader should do this anyway, should not be necessary to know this client side
		* @param String langKey The language key to be checked	
		*/
		mediaWiki.language.getLangTransformKey = function( langKey ) {		
			if( mediaWiki.language.fallbackTransformMap[ langKey ] ) {
				langKey = mediaWiki.language.fallbackTransformMap[ langKey ];
			}
			// Make sure the langKey has a transformClass: 
			for( var i = 0; i < mediaWiki.language.transformClass.length ; i++ ) {
				if( langKey == mediaWiki.language.transformClass[i] ){
					return langKey;
				}
			}
			// By default return the base 'en' class
			return 'en';
		};

		/**
		 * @@FIXME this should be handled dynamically handled in the resource loader 
		 * 	so it keeps up-to-date with php maping. 
		 * 	( not explicitly listed here ) 
		 */
		mediaWiki.language.fallbackTransformMap = {
				'mwl' : 'pt', 
				'ace' : 'id', 
				'hsb' : 'de', 
				'frr' : 'de', 
				'pms' : 'it', 
				'dsb' : 'de', 
				'gan' : 'gan-hant', 
				'lzz' : 'tr', 
				'ksh' : 'de', 
				'kl' : 'da', 
				'fur' : 'it', 
				'zh-hk' : 'zh-hant', 
				'kk' : 'kk-cyrl', 
				'zh-my' : 'zh-sg', 
				'nah' : 'es', 
				'sr' : 'sr-ec', 
				'ckb-latn' : 'ckb-arab', 
				'mo' : 'ro', 
				'ay' : 'es', 
				'gl' : 'pt', 
				'gag' : 'tr', 
				'mzn' : 'fa', 
				'ruq-cyrl' : 'mk', 
				'kk-arab' : 'kk-cyrl', 
				'pfl' : 'de', 
				'zh-yue' : 'yue', 
				'ug' : 'ug-latn', 
				'ltg' : 'lv', 
				'nds' : 'de', 
				'sli' : 'de', 
				'mhr' : 'ru', 
				'sah' : 'ru', 
				'ff' : 'fr', 
				'ab' : 'ru', 
				'ko-kp' : 'ko', 
				'sg' : 'fr', 
				'zh-tw' : 'zh-hant', 
				'map-bms' : 'jv', 
				'av' : 'ru', 
				'nds-nl' : 'nl', 
				'pt-br' : 'pt', 
				'ce' : 'ru', 
				'vep' : 'et', 
				'wuu' : 'zh-hans', 
				'pdt' : 'de', 
				'krc' : 'ru', 
				'gan-hant' : 'zh-hant', 
				'bqi' : 'fa', 
				'as' : 'bn', 
				'bm' : 'fr', 
				'gn' : 'es', 
				'tt' : 'ru', 
				'zh-hant' : 'zh-hans', 
				'hif' : 'hif-latn', 
				'zh' : 'zh-hans', 
				'kaa' : 'kk-latn', 
				'lij' : 'it', 
				'vot' : 'fi', 
				'ii' : 'zh-cn', 
				'ku-arab' : 'ckb-arab', 
				'xmf' : 'ka', 
				'vmf' : 'de', 
				'zh-min-nan' : 'nan', 
				'bcc' : 'fa', 
				'an' : 'es', 
				'rgn' : 'it', 
				'qu' : 'es', 
				'nb' : 'no', 
				'bar' : 'de', 
				'lbe' : 'ru', 
				'su' : 'id', 
				'pcd' : 'fr', 
				'glk' : 'fa', 
				'lb' : 'de', 
				'kk-kz' : 'kk-cyrl', 
				'kk-tr' : 'kk-latn', 
				'inh' : 'ru', 
				'mai' : 'hi', 
				'tp' : 'tokipona', 
				'kk-latn' : 'kk-cyrl', 
				'ba' : 'ru', 
				'nap' : 'it', 
				'ruq' : 'ruq-latn', 
				'tt-cyrl' : 'ru', 
				'lad' : 'es', 
				'dk' : 'da', 
				'de-ch' : 'de', 
				'be-x-old' : 'be-tarask', 
				'za' : 'zh-hans', 
				'kk-cn' : 'kk-arab', 
				'shi' : 'ar', 
				'crh' : 'crh-latn', 
				'yi' : 'he', 
				'pdc' : 'de', 
				'eml' : 'it', 
				'uk' : 'ru', 
				'kv' : 'ru', 
				'koi' : 'ru', 
				'cv' : 'ru', 
				'zh-cn' : 'zh-hans', 
				'de-at' : 'de', 
				'jut' : 'da', 
				'vec' : 'it', 
				'zh-mo' : 'zh-hk', 
				'fiu-vro' : 'vro', 
				'frp' : 'fr', 
				'mg' : 'fr', 
				'ruq-latn' : 'ro', 
				'sa' : 'hi', 
				'lmo' : 'it', 
				'kiu' : 'tr', 
				'tcy' : 'kn', 
				'srn' : 'nl', 
				'jv' : 'id', 
				'vls' : 'nl', 
				'zea' : 'nl', 
				'ty' : 'fr', 
				'szl' : 'pl', 
				'rmy' : 'ro', 
				'wo' : 'fr', 
				'vro' : 'et', 
				'udm' : 'ru', 
				'bpy' : 'bn', 
				'mrj' : 'ru', 
				'ckb' : 'ckb-arab', 
				'xal' : 'ru', 
				'de-formal' : 'de', 
				'myv' : 'ru', 
				'ku' : 'ku-latn', 
				'crh-cyrl' : 'ru', 
				'gsw' : 'de', 
				'rue' : 'uk', 
				'iu' : 'ike-cans', 
				'stq' : 'de', 
				'gan-hans' : 'zh-hans', 
				'scn' : 'it', 
				'arn' : 'es', 
				'ht' : 'fr', 
				'zh-sg' : 'zh-hans', 
				'bat-smg' : 'lt', 
				'aln' : 'sq', 
				'tg' : 'tg-cyrl', 
				'li' : 'nl', 
				'simple' : 'en', 
				'os' : 'ru', 
				'ln' : 'fr', 
				'als' : 'gsw', 
				'zh-classical' : 'lzh', 
				'arz' : 'ar', 
				'wa' : 'fr'
			};	

		/**
		 * Language classes ( which have a file in /languages/classes/Language{code}.js )
		 * ( for languages that override default transforms ) 
		 * 
		 * @@FIXME again not needed if the resource loader manages this mapping and gives 
		 * 	us the "right" transform class regardless of what language key we request. 
		 */
		mediaWiki.language.transformClass = ['am', 'ar', 'bat_smg', 'be_tarak', 'be', 'bh',
				'bs', 'cs', 'cu', 'cy', 'dsb', 'fr', 'ga', 'gd', 'gv', 'he', 'hi',
				'hr', 'hsb', 'hy', 'ksh', 'ln', 'lt', 'lv', 'mg', 'mk', 'mo', 'mt',
				'nso', 'pl', 'pt_br', 'ro', 'ru', 'se', 'sh', 'sk', 'sl', 'sma',
				'sr_ec', 'sr_el', 'sr', 'ti', 'tl', 'uk', 'wa' ];

		// wgLang??
		var wgLanguageCode = 'en';
		// Set-up base convert plural and gender (to restore for non-transform languages ) 
		var cachedConvertPlural = { 'en' : mediaWiki.language.convertPlural };
		 
		// XXX THIS ONLY WORKS FOR NEIL
		var wgScriptPath = 'http://wiki.ivy.local/w';	
		/**
		 * Clear out digit transform table, load new pluralization rules, for a new language.
		 * Typically we don't need to do this in MediaWiki, it's one interface language per page.
		 * @param {String} languageCode
		 * @param {Function} to be executed when related scripts have loaded
		 */
		mediaWiki.language.resetForLang = function( lang, fn ) {
			mediaWiki.language.digitTransformTable = null;
			// Load the current language js file if it has a langKey
			var lang = mediaWiki.language.getLangTransformKey( lang );
			if( cachedConvertPlural[lang] ) {
				mediaWiki.language.convertPlural = cachedConvertPlural[lang];
				fn();
			} else {
				mw.log( lang + " load msg transform" );
				$j.getScript( wgScriptPath + '/resources/mediaWiki.language/languages/' + lang.toLowerCase() + '.js' , function(){
					cachedConvertPlural[lang] = mediaWiki.language.convertPlural;
					fn();
				});
			}
		};


		$j.each( jasmineMsgSpec, function( i, test ) { 
			it( "should parse " + test.name, function() { 
				mediaWiki.language.resetForLang( test.lang, function() {
					var argArray = [ test.key ].concat( test.args );
					var parsedText = mediaWiki.language.parser.apply( this, argArray );
					result = parsedText.getHTML();
					expect( result ).toEqual( test.result );
				} );
			} );
		} );
	} );

} );
