<?php

require( 'UploadWizard.i18n.php' );

$langsToTest = array_slice( $argv, 1 );


foreach ( $messages as $lang => $langDict ) {
	if ( count($langsToTest) and (! in_array( $lang, $langsToTest ) ) ) {
		continue;
	}	
	$percentComplete[$lang] = 0;
	$total = 0;
	$translated = 0;
	foreach( $messages['en'] as $key => $val ) {
		$total++;
		if ( array_key_exists( $key, $langDict ) ) {
			$translated++;
		}
	}
	$percentage = (int)( 100 * $translated / $total );
	echo "Language: $lang    Translated: $translated   Percentage: $percentage\n";

}

