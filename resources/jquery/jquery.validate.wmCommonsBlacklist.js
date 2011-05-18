/** 
 * One day this will look up an API method to determine if a filename is blacklisted by your local MediaWiki
 * For now we check with some regexes locally, with a Commons-specific blacklist
 * This is an incomplete rendering of the meta.wikimedia.org and commons.wikimedia.org blacklist as they existed on 2011-05-05, and
 * ignores cases that are irrelevant to uploading new media images.
 *   - all regexes are case INsensitive by default
 *   - casesensitive is considered
 *   - errmsg is considered
 *   - namespaces and File: prefix are removed since everything we upload is under File: anyway
 *   - noedit, moveonly, repuload is irrelevant
 *   - we can't check autoconfirmed-ness of users here, so we ignore it
 *   - Javascript doesn't have a standard way to access unicode character properties in regexes, so \p{PROPERTY}, \P{PROPERTY}, and [[:PROPERTY:]] have been changed when possible
 *     or the associated regex removed
*/
( function( $ ) { 

	var regexSets = {
		
		'titleBlacklist': [
			/(?:suck|his|your|my) penis/i,
			/\bnimp\.org./i,
			/Lawl,/i,
			/HAGG[EA]R[^A-Z]*/i,
			/[–ùHŒó][E–ïŒï]R[M–úŒú][YŒ•]/,
			/[–ùHŒó][AŒëŒë]GG[E–ïŒï]R/,
			/[–ùH]\W*[AŒëŒë]\W*G\W*G\W*[E–ïŒï]\W*R(?!ston)/i,
			/\bHERMY/,
			/ on wheels/i,
			/(?:.*?\/)?index\.php(?:\/.*)?/i,
			/(?:http|https|ftp|mailto|torrent|ed2k)\:\/\/[\w\d:@\-]+\.[\w\d\-]+/i,
			/http:\/\//i,
			/\/wiki\//i,
			/\bis\s+(?:a|an)\s+(?:dick|cunt|fag|bitch|shit|fuck|fucker|loser|ass|gay|ghey|moron|retard|stupid|slut|pa?edo)/i,
			/\sprefix:/i, //  search from inputboxes (f.e. in the village pumps)
			/.*[!?]{3,}.* /i,
			/(?:[^\/i]+[\/:])?(index\.php|w\/wiki)(?:\/.+)?/,
			/[–ùHŒóÔº®‚±ß][E–ïŒï√ãÔº•ƒñ][RÔº≤–Ø][M–úŒúÔº≠][YŒ•Ôºπ]/i,
			/JEWS DID/i,
			/ON WHE/,
			/(?:Moulton|Barsoom Tork|Pocoyo Albatross|Anything Muppets|Moosey Mouse|Inbloomed Muppets).*/,
			/Jorge Queirolo Bravo/i,
			/Vasilisa(\d)+/i,
			/google.*\.html/i
		],

		'titleBadchars': [
			/[\u00A0\u1680\u180E\u2000-\u200B\u2028\u2029\u202F\u205F\u3000]/, // NBSP and other unusual spaces 
			/[\u202A-\u202E]/, // BiDi overrides 
			/[\x00-\x1f]/, // Control characters
			/\uFEFF/, // Byte order mark
			/\u00AD/, // Soft-hyphen
			/[\uD800-\uDFFF\uE000-\uF8FF\uFFF0-\uFFFF]/, // Surrogates, Private Use Area and Specials, including the Replacement Character U+FFFD
			/[^\0-\uFFFF]/, //  Very few characters outside the Basic Multilingual Plane are useful in titles
			/''/
		],

		// note lack of extension, since we test title without extension.
		'titleSenselessimagename': [	
			/^DCP[\d\s]+$/i, //  Kodak
			/^DSC.[\d\s]+$/i, //  [[w:Design rule for Camera File system]] (Nikon, Fuji, Polaroid)
			/^MVC-?[\d\s]+$/i, //  Sony Mavica
			/^P[\dA-F][\d\s]+$/, //  Olympus, Kodak
			/^I?MG[P_]?[\d\s]+$/, //  Canon, Pentax
			/^1\d+-\d+(_IMG)?$/, //  Canon
			/^(IM|EX)[\d\s]+$/, //  HP Photosmart
			/^DC[\d\s]+[SML]$/, //  Kodak
			/^PIC[T_]?[\d\s]+$/, //  Minolta
			/^PANA[\d\s]+$/, //  Panasonic
			/^DUW[\d\s]+$/, //  some mobile phones
			/^CIMG[\d\s]+$/, //  Casio
			/^JD[\d\s]+$/, //  Jenoptik
			/^SDC[\d\s]+$/, //  Samsung
			/^DVC[\d\s]+$/, //  DoCoMo
			/^SANY[\d\s]+$/ //  Sanyo
		],

		// filename from elsewhere
		'titleHosting': [
			/^\d{9}[A-Z]{6}_[A-Z]{2}[^A-Za-z]*$/, //  some image hosting site?
			/^\d{8,}_[\dA-F]{10}(_[A-Z])?[^A-Za-z]*$/i, // http://www.flickr.com/services/api/misc.urls.html/i,
			/^([\dA-F]{8}-)?[\dA-F]{4}-[\dA-F]{4}-[\dA-F]{4}-?[\dA-F]{12}.*$/, //  [[w:UUID]] (with some variations included)
			/^([SML]|\d+)_[\dA-F]{10,}(-\d+-|_?(\w\w?|full))?$/, //  L_9173c67eae58edc35ba7f2df08a7d5c6.jpg, 2421601587_abaf4e3e81.jpg, 1_bf38bcd9c5512a5ab99ca2219a4b1e2f_full.gif, etc.
			/^AT[AEIMQUYcgkosw048]AAA[A-D][-_A-Za-z0-9]+$/, //  see Commons:Village pump#File ATgAAA... (Jan 20, 2009, full link in edit comment)
			/^(\d+_){2,}[qtsn]$/, //  Facebook: \d+_\d+_(\d+)_(\d+)_\d+_[qtsn]\.jpg -> photo.php?id=$1&pid=$2
			/^[qtsn]\d+(_\d+)+$/, //  Facebook (older?): [qtsn](\d+)_(\d+)_\d+\.jpg -> photo.php?id=$1&pid=$2
			/^Tumblr_[a-z\d]{19}_\d$/, //  Tumblr
			/^File$/,
			/^[^A-Za-z]*(small|medium|large)\)?$/,
			/^(Untitled|No[-_]?name|Picture|Pict?|Image[mn]?|Img|Immagine|Photo|Foto|Bild|Scan|Panorama|Sin_t√≠tulo)[^A-Za-z]*$/,
			/^(January|Jan|February|Febr?|March|Mar|April|Apr|May|June?|July?|August|Aug|September|Sept?|October|Oct|November|Nov|December|Dec)[^A-Za-z]*$/,
			/^[0-9 ]*([A-Z][0-9 ]*){30,}$/
		],

		'titleThumbnail': [
			/^\d+px-.*/
		],

		'titleExtension': [ 
			/\.(jpe?g|png|gif|svg|ogg|ogv|oga)$/
		]

	};

	$j.each( regexSets, function( name, regexes ) {
		var tester = ( function( regexes ) { 
			return function( value, element, params ) {
				var ok = true;
				$.each( regexes, function( i, regex ) {
					// if we make a mistake with commas in the above list, IE sometimes gives us an undefined regex, causes nastiness
					if ( typeof regex !== undefined && value.match( regex ) ) {
						ok = false;
						console.log( regex );
						return false;
					}
				} );
				return ok;
			};
		} )( regexes );
		$.validator.addMethod( name, tester, "This title is not allowed" );
	} );	


} )( jQuery );
