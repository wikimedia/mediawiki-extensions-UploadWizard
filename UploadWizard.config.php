<?php
/**
 * Upload Wizard Configuration 
 * Do not modify this file, instead use localsettings.php and set: 
 * $wgUploadWizardConfig[ 'name'] =  'value';
 */
global $wgFileExtensions, $wgServer, $wgScriptPath, $wgAPIModules;
return array(
	// Upload wizard has an internal debug flag	
	'debug' => false,

	// File extensions acceptable in this wiki
	'fileExtensions' =>  $wgFileExtensions, 

	// The default api url is for the current wiki ( can override at run time )
	'apiUrl' => $wgServer . $wgScriptPath . '/api.php',
	
	// If the uploaded file should be auto categorized
	'autoCategory' => false,

	// This is the set of licenses available
	// under normal circumstances, the license name is the name of the wikitext template to insert
	// for those that aren't, there is a wikitext property
	'licenses' => array(
		'cc-by-sa-3.0' => array( 
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0',
			'icons' => array( 'cc-by', 'cc-sa' )
		),
		'cc-by-sa-3.0-gfdl' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-3.0-gfdl',
			'templates' => array( 'gfdl', 'cc-by-sa-3.0' ),
			'icons' => array( 'cc-by', 'cc-sa' )
		),
		'cc-by-3.0-gfdl' => array(
			'msg' => 'mwe-upwiz-license-cc-by-3.0-gfdl',
			'templates' => array( 'gfdl', 'cc-by-3.0' ),
			'icons' => array( 'cc-by' )
		),
		'cc-by-3.0' => array( 
			'msg' => 'mwe-upwiz-license-cc-by-3.0',
			'icons' => array( 'cc-by' )
		),
		'cc-zero' => array( 
			'msg' => 'mwe-upwiz-license-cc-zero',
			'icons' => array( 'cc-zero' )
		),
		'own-pd' => array( 
			'msg' => 'mwe-upwiz-license-own-pd',
			'icons' => array( 'cc-zero' ),
			'templates' => array( 'cc-zero' )
		),
		'cc-by-sa-2.5' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-2.5',
			'icons' => array( 'cc-by', 'cc-sa' )
		),
		'cc-by-2.5' => array( 
			'msg' => 'mwe-upwiz-license-cc-by-2.5', 
			'icons' => array( 'cc-by' )
		),
		'cc-by-sa-2.0' => array(
			'msg' => 'mwe-upwiz-license-cc-by-sa-2.0',
			'icons' => array( 'cc-by', 'cc-sa' )
		),
		'cc-by-2.0' => array( 
			'msg' => 'mwe-upwiz-license-cc-by-2.0',
			'icons' => array( 'cc-by' )
		),
		'fal' => array(
			'msg' => 'mwe-upwiz-license-fal'
		),
		'pd-old-100' => array(
			'msg' => 'mwe-upwiz-license-pd-old-100'
		),
		'pd-old' => array( 
			'msg' => 'mwe-upwiz-license-pd-old'
		),
        	'pd-art' => array( 
        		'msg' => 'mwe-upwiz-license-pd-art'
		),
        	'pd-us' => array( 
			'msg' => 'mwe-upwiz-license-pd-us'
		),
		'pd-usgov' => array(
			'msg' => 'mwe-upwiz-license-pd-usgov'
		),
		'pd-usgov-nasa' => array(
			'msg' => 'mwe-upwiz-license-pd-usgov-nasa'
		),
		'pd-usgov-military-navy' => array( 
			'msg' => 'mwe-upwiz-license-pd-usgov-military-navy'
		),
		'pd-ineligible' => array(
			'msg' => 'mwe-upwiz-license-pd-ineligible'
		),
		'pd-textlogo' => array( 
			'msg' => 'mwe-upwiz-license-pd-textlogo',
			'templates' => array( 'trademarked', 'pd-textlogo' )
		),
		'copyrighted-free-use' => array( 
			'msg' => 'mwe-upwiz-license-copyrighted-free-use'
		),
		'attribution' => array(
			'msg' => 'mwe-upwiz-license-attribution'
		),
		'gfdl' => array( 
			'msg' => 'mwe-upwiz-license-gfdl'
		)
	),

	// radio button selection of some licenses
	'licensesOwnWork' => array( 
		'type' => 'or',
		'filterTemplate' => 'self',
		'licenses' => array(
			'cc-by-sa-3.0',
			'cc-by-3.0',
			'own-pd'
		),
		'defaults' => array( 'cc-by-sa-3.0' )
	),

	// checkbox selection of all licenses
	'licensesThirdParty' => array( 
		'type' => 'and',
		'licenseGroups' => array(
			array( 
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
				'head' => 'mwe-upwiz-license-public-domain-head',
				'licenses' => array( 
					'pd-old-100',
					'pd-old', 
					'pd-art',
					'pd-us', 
				)
			),
			array( 
				'head' => 'mwe-upwiz-license-usgov-head',
				'licenses' => array( 	
					'pd-usgov',
					'pd-usgov-nasa'
				)
			),
			array( 
				'head' => 'mwe-upwiz-license-misc', 
				'licenses' => array( 
					'fal'
				)
			)
		),
		'defaults' => array(),
	),


	// Default thumbnail width
	'thumbnailWidth' => 120, 
 
	// Max thumbnail height:
	'thumbnailMaxHeight' => 200,

	// Min thumbnail width
	'smallThumbnailWidth' => 60,  

	// Small thumbnail max height
	'smallThumbnailMaxHeight' => 100,

	// Icon thumbnail width: 
	'iconThumbnailWidth' =>  32,

	// Icon thumbnail height: 
	'iconThumbnailMaxHeight' => 32,

	// Max author string length
	'maxAuthorLength' => 50,

	// Min author string length
	'minAuthorLength' => 2,

	// Max source string length 
	'maxSourceLength' => 200,

	// Min source string length
	'minSourceLength' => 5,

	// Max file title string length
	'maxTitleLength' => 200,

	// Min file title string length 
	'minTitleLength' => 5,

	// Max file description length
	'maxDescriptionLength' => 4096,

	// Min file description length
	'minDescriptionLength' => 5,

	// Max length for other file information: 
	'maxOtherInformationLength' => 4096,

	// Max number of simultaneous upload requests 
	'maxSimultaneousConnections' => 1,

	// Max number of uploads for a given form
	'maxUploads' => 10,

	// not for use with all wikis. 
	// The ISO 639 code for the language tagalog is "tl".
	// Normally we name templates for languages by the ISO 639 code.
	// Commons already had a template called 'tl:  though.
	// so, this workaround will cause tagalog descriptions to be saved with this template instead.
	'languageTemplateFixups' =>  array( 'tl' => 'tgl' ), 

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

	// Check if we want to enable firefogg ( for transcoding ) 
	'enableFirefogg' => false, 

	// Check if we have the firefogg upload api module enabled: 
	'enableFirefoggChunkUpload' => isset( $wgAPIModules['firefoggupload'] )? true : false,
	
	// Set skipTutorial to true to always skip tutorial step
	'skipTutorial' => false,
	
	'feedbackPage' => 'Commons:Prototype upload wizard feedback',
	
	'feedbackPageUrl' => 'http://commons.wikimedia.org/wiki/Commons:Prototype_upload_wizard_feedback',

);
