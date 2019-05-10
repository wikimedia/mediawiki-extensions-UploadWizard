<?php

$cfg = require __DIR__ . '/../vendor/mediawiki/mediawiki-phan-config/src/config.php';

$cfg['file_list'][] = 'UploadWizard.config.php';

$cfg['directory_list'] = array_merge(
	$cfg['directory_list'],
	[
		'../../extensions/EventLogging',
	]
);

$cfg['exclude_analysis_directory_list'] = array_merge(
	$cfg['exclude_analysis_directory_list'],
	[
		'../../extensions/EventLogging',
	]
);

// TODO Remove on new version of phan-config
$cfg['directory_list'][] = '.phan/stubs/';
$cfg['exclude_analysis_directory_list'][] = '.phan/stubs/';

// T191666
$cfg['suppress_issue_types'][] = 'PhanParamTooMany';

return $cfg;
