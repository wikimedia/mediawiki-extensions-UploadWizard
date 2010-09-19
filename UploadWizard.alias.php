<?php
/*
 * Allows the special page title to be translated to another language.
 * The page title can be customized into another language
*/

$specialPageAliases = array();

/** English (English) */
$specialPageAliases['en'] = array(
	'UploadWizard' => array( 'UploadWizard' ),
);

/** Italian (Italiano) */
$specialPageAliases['it'] = array(
	'UploadWizard' => array( 'CaricamentoGuidato' ),
);

/** Dutch (Nederlands) */
$specialPageAliases['nl'] = array(
	'UploadWizard' => array( 'WizardUploaden' ),
);

/** Sinhala (සිංහල) */
$specialPageAliases['si'] = array(
	'UploadWizard' => array( 'උඩුගත_කිරීමේ_මාය_අඳුන' ),
);

/**
 * For backwards compatibility with MediaWiki 1.15 and earlier.
 */
$aliases =& $specialPageAliases;