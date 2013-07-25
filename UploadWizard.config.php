<?php
/**
 * Upload Wizard Configuration
 * Do not modify this file, instead use localsettings.php and set:
 * $wgUploadWizardConfig[ 'name'] =  'value';
 */
global $wgFileExtensions, $wgServer, $wgScriptPath, $wgAPIModules, $wgMaxUploadSize, $wgLang, $wgMemc, $wgUploadWizardConfig;

$userLangCode = $wgLang->getCode();
// We need to get a list of languages for the description dropdown.
$cacheKey = wfMemcKey( 'uploadwizard', 'language-templates', $userLangCode );
// Try to get a cached version of the list
$uwLanguages = $wgMemc->get( $cacheKey );
// Commons only: ISO 646 code of Tagalog is 'tl', but language template is 'tgl'
$uwDefaultLanguageFixups = array( 'tl' => 'tgl' );
if ( !$uwLanguages ) {
	$uwLanguages = array();

	// First, get a list of languages we support.
	if (  is_callable( array( 'LanguageNames', 'getNames' ) ) ) {
		$baseLangs = LanguageNames::getNames( $userLangCode );
	} else {
		$baseLangs = Language::fetchLanguageNames( null, 'all' );
	}
	// We need to take into account languageTemplateFixups
	if ( is_array( $wgUploadWizardConfig ) && array_key_exists( 'languageTemplateFixups', $wgUploadWizardConfig ) ) {
		$languageFixups = $wgUploadWizardConfig['languageTemplateFixups'];
		if ( !is_array( $languageFixups ) ) {
			$languageFixups = array();
		}
	} else {
		$languageFixups = $uwDefaultLanguageFixups;
	}
	// Use LinkBatch to make this a little bit more faster.
	// It works because $title->exists (below) will use LinkCache.
	$linkBatch = new LinkBatch();
	foreach( $baseLangs as $code => $name ) {
		$fixedCode = array_key_exists( $code, $languageFixups ) ? $languageFixups[$code] : $code;
		if ( is_string( $fixedCode ) && $fixedCode !== '' ) {
			$title = Title::makeTitle( NS_TEMPLATE, Title::capitalize( $fixedCode, NS_TEMPLATE ) );
			$linkBatch->addObj( $title );
		}
	}
	$linkBatch->execute();

	// Then, check that there's a template for each one.
	foreach ( $baseLangs as $code => $name ) {
		$fixedCode = array_key_exists( $code, $languageFixups ) ? $languageFixups[$code] : $code;
		if ( is_string( $fixedCode ) && $fixedCode !== '' ) {
			$title = Title::makeTitle( NS_TEMPLATE, Title::capitalize( $fixedCode, NS_TEMPLATE ) );
			if ( $title->exists() ) {
				// If there is, then it's in the final picks!
				$uwLanguages[$code] = $name;
			}
		}
	}
	// Sort the list by the language name
	natsort($uwLanguages);
	// Cache the list for 1 day
	$wgMemc->set( $cacheKey, $uwLanguages, 60 * 60 * 24 );
}

return array(
	// Upload wizard has an internal debug flag
	'debug' => false,

	// Enable or disable the default upload license user preference
	'enableLicensePreference' => true,

	// File extensions acceptable in this wiki
	'fileExtensions' =>  $wgFileExtensions,

	// The default api url is for the current wiki ( can override at run time )
	'apiUrl' => $wgServer . $wgScriptPath . '/api.php',

	// Flickr details
	'flickrApiUrl' => 'http://api.flickr.com/services/rest/?',
	'flickrApiKey' => '',

	// Settings about things that get automatically (and silently) added to uploads
	'autoAdd' => array(
		// Categories to automatically (and silently) add all uploaded images into.
		'categories' => array(),

		// WikiText to automatically (and silently) add to all uploaded images.
		'wikitext' => '',
	),

	// If the user didn't add categories, or removed the default categories, add this wikitext.
	// Use this to indicate that some human should categorize this file. Does not consider autoCategories, which are hidden.
	'missingCategoriesWikiText' => '',

	'display' => array(
		// wikitext to display above the UploadWizard UI.
		'headerLabel' => '',

		// wikitext to display on top of the "use" page.
		// When not provided, the message mwe-upwiz-thanks-intro will be used.
		'thanksLabel' => ''
	),

	// Settings for the tutorial to be shown.
	// Empty array if we want to skip
	'tutorial' => array(
		// Set to true to skip the tutorial
		'skip' => false,

		// Name of the tutorial on Wikimedia Commons. The $1 is replaced with the language desired.
		'template' => 'Licensing_tutorial_$1.svg',

		// The width we want to scale the tutorial to, for our interface.
		'width' => 720,

		// Imagemap coordinates of the "helpdesk" button at the bottom, which is supposed to be clickable.
		// Empty string or false to not have an imagemap linked to the helpdesk.
		'helpdeskCoords' => '27, 1319, 691, 1384',
	),

	'fields' => array(
		// Field via which an ID can be provided.
		array(
			// When non empty, this field will be shown, and $1 will be replaced by it's value.
			'wikitext' => '',

			// Label text to display with the field. Is parsed as wikitext.
			'label' => '',

			// The maximum length of the id field.
			'maxLength' => 25,

			// Initial value for the id field.
			'initialValue' => '',

			// Set to true if this field is required
			'required' => false
		)
	),

	'defaults' => array(
		// Categories to list by default in the list of cats to add.
		'categories' => array(),

		// Initial value for the description field.
		'description' => '',

		// These values are commented out by default, so they can be undefined
		// Define them here if you want defaults.
		// This is required, because the JsonSchema for these defines them to be type number
		// But we can't have them to be NULL, because that's not a number.
		// This is a technical limitation of JsonSchema, I think.

		//// Initial value for the latitude field.
		//'lat' => 0,

		//// Initial value for the longitude field.
		//'lon' => 0,

		//// Initial value for the altitude field.
		//'alt' => 0,
	),

	// 'uwLanguages' is a list of languages and codes, for use in the description step.
	// See the definition of $uwLanguages above. If empty we'll just set a default.
	'uwLanguages' => empty( $uwLanguages ) ? array( 'en' => 'English' ) : $uwLanguages,

	// 'licenses' is a list of licenses you could possibly use elsewhere, for instance in
	// licensesOwnWork or licensesThirdParty.
	// It just describes what licenses go with what wikitext, and how to display them in
	// a menu of license choices. There probably isn't any reason to delete any entry here.
	// Under normal circumstances, the license name is the name of the wikitext template to insert.
	// For those that aren't, there is a "templates" property.
	'licenses' => array(
		'cc-by-sa-3.0' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0',
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-gfdl' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-gfdl',
			'templates' => array( 'GFDL', 'cc-by-sa-3.0' ),
			'icons' => array( 'cc-by', 'cc-sa' )
		),
		'cc-by-sa-3.0-at' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-at',
			'templates' => array( 'cc-by-sa-3.0-at' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/at/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-de' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-de',
			'templates' => array( 'cc-by-sa-3.0-de' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/de/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-ee' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-ee',
			'templates' => array( 'cc-by-sa-3.0-ee' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/ee/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-es' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-es',
			'templates' => array( 'cc-by-sa-3.0-es' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/es/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-hr' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-hr',
			'templates' => array( 'cc-by-sa-3.0-hr' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/hr/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-lu' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-lu',
			'templates' => array( 'cc-by-sa-3.0-lu' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/lu/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-nl' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-nl',
			'templates' => array( 'cc-by-sa-3.0-nl' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/nl/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-no' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-no',
			'templates' => array( 'cc-by-sa-3.0-no' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/no/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-pl' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-pl',
			'templates' => array( 'cc-by-sa-3.0-pl' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/pl/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-3.0-ro' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-ro',
			'templates' => array( 'cc-by-sa-3.0-ro' ),
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/3.0/ro/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-3.0' => array(
			'msg' => 'mwe-upwiz-license-cc-by-3.0',
			'icons' => array( 'cc-by' ),
			'url' => '//creativecommons.org/licenses/by/3.0/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-zero' => array(
			'msg' => 'mwe-upwiz-license-cc-zero',
			'icons' => array( 'cc-zero' ),
			'url' => '//creativecommons.org/publicdomain/zero/1.0/',
			'languageCodePrefix' => 'deed.'
		),
		'own-pd' => array(
			'msg' => 'mwe-upwiz-license-own-pd',
			'icons' => array( 'cc-zero' ),
			'templates' => array( 'cc-zero' )
		),
		'cc-by-sa-2.5' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-2.5',
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/2.5/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-2.5' => array(
			'msg' => 'mwe-upwiz-license-cc-by-2.5',
			'icons' => array( 'cc-by' ),
			'url' => '//creativecommons.org/licenses/by/2.5/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-sa-2.0' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-2.0',
			'icons' => array( 'cc-by', 'cc-sa' ),
			'url' => '//creativecommons.org/licenses/by-sa/2.0/',
			'languageCodePrefix' => 'deed.'
		),
		'cc-by-2.0' => array(
			'msg' => 'mwe-upwiz-license-cc-by-2.0',
			'icons' => array( 'cc-by' ),
			'url' => '//creativecommons.org/licenses/by/2.0/',
			'languageCodePrefix' => 'deed.'
		),
		'fal' => array(
			'msg' => 'mwe-upwiz-license-fal',
			'templates' => array( 'FAL' )
		),
		'pd-old-100' => array(
			'msg' => 'mwe-upwiz-license-pd-old-100',
			'templates' => array( 'PD-old-100' )
		),
		'pd-old' => array(
			'msg' => 'mwe-upwiz-license-pd-old',
			'templates' => array( 'PD-old' )
		),
		'pd-art' => array(
			'msg' => 'mwe-upwiz-license-pd-art',
			'templates' => array( 'PD-Art' )
		),
		'pd-us' => array(
			'msg' => 'mwe-upwiz-license-pd-us',
			'templates' => array( 'PD-US' )
		),
		'pd-usgov' => array(
			'msg' => 'mwe-upwiz-license-pd-usgov',
			'templates' => array( 'PD-USGov' )
		),
		'pd-usgov-nasa' => array(
			'msg' => 'mwe-upwiz-license-pd-usgov-nasa',
			'templates' => array( 'PD-USGov-NASA' )
		),
		'pd-ineligible' => array(
			'msg' => 'mwe-upwiz-license-pd-ineligible'
		),
		'pd-textlogo' => array(
			'msg' => 'mwe-upwiz-license-pd-textlogo',
			'templates' => array( 'trademarked', 'PD-textlogo' )
		),
		'attribution' => array(
			'msg' => 'mwe-upwiz-license-attribution'
		),
		'gfdl' => array(
			'msg' => 'mwe-upwiz-license-gfdl',
			'templates' => array( 'GFDL' )
		),
		'none' => array(
			'msg' => 'mwe-upwiz-license-none',
			'templates' => array( 'subst:uwl' )
		),
		'custom' => array(
			'msg' => 'mwe-upwiz-license-custom',
			'templates' => array( 'subst:Custom license marker added by UW' ),
			'url' => wfMessage( 'mwe-upwiz-license-custom-url' )->parse()
		)
	),

	// Custom wikitext must have at least one template that is a descendant of this category
	'licenseCategory' => 'License tags',

	// When checking custom wikitext licenses, parse these templates as "filters";
	// their arguments look like strings but they are really templates
	'licenseTagFilters' => array( 'self' ),

	'licensing' => array(
		// Default license type.
		// Possible values: ownwork, thirdparty, choice.
		'defaultType' => 'choice',

		// Should the own work option be shown, and if not, what option should be set?
		// Possible values:  own, notown, choice.
		'ownWorkDefault' => 'choice',

		// radio button selection of some licenses
		'ownWork' => array(
			'type' => 'or',
			'template' => 'self',
			'licenses' => array(
				'cc-by-sa-3.0',
				'cc-by-3.0',
				'cc-zero'
			)
		),

		// checkbox selection of all licenses
		'thirdParty' => array(
			'type' => 'or',
			'licenseGroups' => array(
				array(
					// This should be a list of all CC licenses we can reasonably expect to find around the web
					'head' => 'mwe-upwiz-license-cc-head',
					'subhead' => 'mwe-upwiz-license-cc-subhead',
					'licenses' => array(
						'cc-by-sa-3.0',
						'cc-by-sa-2.5',
						'cc-by-3.0',
						'cc-by-2.5',
						'cc-zero'
					)
				),
				array(
					// n.b. as of April 2011, Flickr still uses CC 2.0 licenses.
					// The White House also has an account there, hence the Public Domain US Government license
					'head' => 'mwe-upwiz-license-flickr-head',
					'subhead' => 'mwe-upwiz-license-flickr-subhead',
					'prependTemplates' => array( 'flickrreview' ),
					'licenses' => array(
						'cc-by-sa-2.0',
						'cc-by-2.0',
						'pd-usgov',
					)
				),
				array(
					'head' => 'mwe-upwiz-license-public-domain-usa-head',
					'subhead' => 'mwe-upwiz-license-public-domain-usa-subhead',
					'licenses' => array(
						'pd-us',
						'pd-art',
					)
				),
				array(
					// omitted navy because it is believed only MultiChil uses it heavily. Could add it back
					'head' => 'mwe-upwiz-license-usgov-head',
					'licenses' => array(
						'pd-usgov',
						'pd-usgov-nasa'
					)
				),
				array(
					'head' => 'mwe-upwiz-license-custom-head',
					'special' => 'custom',
					'licenses' => array( 'custom' ),
				),
				array(
					'head' => 'mwe-upwiz-license-none-head',
					'licenses' => array( 'none' )
				),
			)
		)
	),

	// Default thumbnail width
	'thumbnailWidth' => 100,

	// Max thumbnail height:
	'thumbnailMaxHeight' => 100,

	// Large thumbnail width
	'largeThumbnailWidth' => 500,

	// Large thumbnail max height
	'largeThumbnailMaxHeight' => 500,

	// Max author string length
	'maxAuthorLength' => 10000,

	// Min author string length
	'minAuthorLength' => 1,

	// Max source string length
	'maxSourceLength' => 10000,

	// Min source string length
	'minSourceLength' => 5,

	// Max file title string length
	'maxTitleLength' => 500,

	// Min file title string length
	'minTitleLength' => 5,

	// Max file description length
	'maxDescriptionLength' => 10000,

	// Min file description length
	'minDescriptionLength' => 5,

	// Max length for other file information:
	'maxOtherInformationLength' => 10000,

	// Max number of simultaneous upload requests
	'maxSimultaneousConnections' => 3,

	// Max number of uploads for a given form
	'maxUploads' => 50,

	// Max file size that is allowed by PHP (may be higher/lower than MediaWiki file size limit).
	// When using chunked uploading, these limits can be ignored.
	'maxPhpUploadSize' => min(
		wfShorthandToInteger( ini_get( 'upload_max_filesize' ) ),
		wfShorthandToInteger( ini_get( 'post_max_size' ) )
	),

	// Max file size that is allowed by MediaWiki. This limit can never be ignored.
	'maxMwUploadSize' => $wgMaxUploadSize,

	// Minimum length of custom wikitext for a license, if used. It is 6 because at minimum it needs four chars for opening and closing
	// braces, then two chars for a license, e.g. {{xx}}
	'minCustomLicenseLength' => 6,

	// Maximum length of custom wikitext for a license
	'maxCustomLicenseLength' => 10000,

	// The UploadWizard allows users to provide file descriptions in multiple languages. For each description, the user
	// can choose the language. The UploadWizard wraps each description in a "language template". A language template is
	// by default assumed to be a template with a name corresponding to the ISO 646 code of the language. For instance,
    // Template:en for English, or Template:fr for French. This mechanism is used for instance at Wikimedia Commons.
	// If this is not the case for some or all or your wiki's language templates, this map can be used to define the
	// template names to be used. Keys are ISO 646 language codes, values are template names. The default defines the
	// exceptions used at Wikimedia Commons: the language template for Tagalog (ISO 646 code 'tl') is not named 'tl'
	// but 'tgl' for historical reasons.
	'languageTemplateFixups' =>  $uwDefaultLanguageFixups,

		// XXX this is horribly confusing -- some file restrictions are client side, others are server side
		// the filename prefix blacklist is at least server side -- all this should be replaced with PHP regex config
		// or actually, in an ideal world, we'd have some way to reliably detect gibberish, rather than trying to
		// figure out what is bad via individual regexes, we'd detect badness. Might not be too hard.
		//
		// we can export these to JS if we so want.
		// filenamePrefixBlacklist: wgFilenamePrefixBlacklist,
		//
		// filenameRegexBlacklist: [
		//	/^(test|image|img|bild|example?[\s_-]*)$/,  // test stuff
		//	/^(\d{10}[\s_-][0-9a-f]{10}[\s_-][a-z])$/   // flickr
		// ]

	// Check if we want to enable firefogg, will result in
	// 1) firefogg install recommendation when users try to upload media asset with an extension in the
	//		transcodeExtensionList
	// 2) Once the user installs firefogg it is used for encoding videos that are not in supported formats before handing it off to mw.ApiUploadFormDataHandler for upload
	'enableFirefogg' => true,

	// Setup list of video extensions for recomending firefogg.
	'transcodeExtensionList' => array(
		'avi', 'asf','asx','wmv','wmx','dv','rm','ra','3gp','mkv',
		'mp4','m4v','mov','qt','mpeg','mpeg2','mp2','mpg', 'mts'
	),

	// Firefogg encode settings copied from TimedMediHandler high end webm.
	'firefoggEncodeSettings' => array(
		'maxSize'           => '1920x1080',
		'videoQuality'      => 7,
		'audioQuality'      => 3,
		'noUpscaling'       => 'true',
		'videoCodec'        => 'vp8',
	),

	// Wiki page for leaving Upload Wizard feedback, for example 'Commons:Upload wizard feedback'
	'feedbackPage' => '',

	// Bugzilla page for UploadWizard bugs
	'bugList' => 'https://bugzilla.wikimedia.org/buglist.cgi?query_format=advanced&component=UploadWizard&resolution=---&product=MediaWiki+extensions',

	// TranslateWiki page for help with translations
	'translateHelp' => '//translatewiki.net/w/i.php?title=Special:Translate&group=ext-uploadwizard',

	// Title of page for alternative uploading form, e.g.:
	//   'altUploadForm' => 'Special:Upload',
	//
	// If different pages are required for different languages,
	// supply an object mapping user language code to page. For a catch-all
	// page for all languages not explicitly configured, use 'default'. For instance:
	//   array(
	//		'default'	=> 'Commons:Upload',
	//		'de'		=> 'Commons:Hochladen'
	//	 );
	'altUploadForm' => '',

	// Is titleBlacklist API even available?
	'useTitleBlacklistApi' => array_key_exists( 'titleblacklist', $wgAPIModules ),

	// Wiki page for reporting issues with the blacklist
	'blacklistIssuesPage' => '',

	// should File API uploads be available?  Required for chunked uploading and multi-file select
	'enableFormData' => true,

	// should multi-file select be available in supporting browsers?
	'enableMultiFileSelect' => true,

	// should chunked uploading be enabled? false for now since the backend isn't really ready.
	// set to "opt-in" to control via experimental user preference under 'Uploads' tab
	'enableChunked' => false,

	// Should feature to copy metadata across a batch of uploads be enabled?
	'copyMetadataFeature' => true,

	// Should downloads start immediately when added?
	'startImmediately' => true,

	// Should we allow multiple files in a form?
	'enableMultipleFiles' => true,

);
