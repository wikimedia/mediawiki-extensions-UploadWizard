<?php
$path = getenv( 'MW_INSTALL_PATH' );
if ( strval( $path ) === '' ) {
	$path = dirname( __FILE__ ) . '/../..';
}
require_once( "$path/maintenance/Maintenance.php" );

/**
 * Maintenance script to generate combined and minified JS and CSS for UploadWizard
 */
class UploadWizardGenerateMinifiedResources extends Maintenance {
	public function __construct() {
		parent::__construct();
		$this->mDescription = 'Generate combined and minified JS and CSS for UploadWizard';
	}
	
	public function execute() {
		$dependencyLoader = new UploadWizardDependencyLoader();
		$dependencyLoader->writeOptimizedFiles();
	}
}
$maintClass = 'UploadWizardGenerateMinifiedResources';
require_once( DO_MAINTENANCE );
