<?php

/* Invokes UploadWizardDependencyLoader to write combined & minified scripts */

$dir = dirname( __FILE__ );
require_once( "$dir/UploadWizardDependencyLoader.php" );
require_once( "$dir/UploadWizardMessages.php" );
require_once( "$dir/UploadWizardHooks.php" );

$installPath = null;

while ( $dir !== '/' ) { 
	if ( file_exists( "$dir/LocalSettings.php" ) ) {
		$installPath = $dir;
		break;
	}
	$dir = dirname( $dir );
}
if ( !$installPath ) {
	print "no installpath, can't write optimized files...\n";
	exit;
}

require_once( "$installPath/includes/libs/JSMin.php" ); 


$dependencyLoader = new UploadWizardDependencyLoader();
$dependencyLoader->writeOptimizedFiles( $installPath );

