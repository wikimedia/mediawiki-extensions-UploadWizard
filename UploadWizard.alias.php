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

/** German (Deutsch) */
$specialPageAliases['de'] = array(
	'UploadWizard' => array( 'Hochlade-Assistent' ),
);

/** Interlingua (Interlingua) */
$specialPageAliases['ia'] = array(
	'UploadWizard' => array( 'Assistente_de_incargamento' ),
);

/** Italian (Italiano) */
$specialPageAliases['it'] = array(
	'UploadWizard' => array( 'CaricamentoGuidato' ),
);

/** Japanese (日本語) */
$specialPageAliases['ja'] = array(
	'UploadWizard' => array( 'アップロードウィザード' ),
);

/** Malayalam (മലയാളം) */
$specialPageAliases['ml'] = array(
	'UploadWizard' => array( 'അപ്‌ലോഡ്_സഹായി' ),
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