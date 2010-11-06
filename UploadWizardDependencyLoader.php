<?php

/**
 * What's that you say? ANOTHER way to load dependencies? Everyone's doing it.
 *
 * Doing resource loading the old-fashioned way for now until Resource Loader or something becomes the standard.
 * We anticipate that Resource Loader will be available sometime in late 2010 or early 2011, 
 * so we define scripts in the hooks that Resource Loader will expect, over in UploadWizardHooks.php.
 *
 * Since the resources are defined in PHP, it was convenient to write the minifier routines here too.
 * We do not expect to minify on the fly in MediaWiki; those rotutines will be called by  
 * developer scripts to write minified files before committing to the source code repository.
 *
 * (Previously the usability projects had used Makefiles, but then had to keep dependencies in sync in 
 * PHP and the Makefile). I started to write a PHP file that then would write a Makefile and realized
 * this was getting a bit insane.
 *
 * n.b. depends on $IP/includes/libs/JSMin.php
 *
 * @author Neil Kandalgaonkar <neilk@wikimedia.org>
 */

class UploadWizardDependencyLoader {

	// must be the same as those defined in Makefile	
	const STYLES_COMBINED = 'combined.css';
	const SCRIPTS_COMBINED = 'combined.js';
	const STYLES_MINIFIED = 'combined.min.css';
	const SCRIPTS_MINIFIED = 'combined.min.js';
	
	protected $scripts;
	protected $inlineScripts;
	protected $styles;

	protected $optimizedStylesFile;
	protected $optimizedScriptsFile;

	public function __construct( $langCode = null ) {
		$module = UploadWizardHooks::$modules['ext.uploadWizard'];

		$this->scripts = array_merge( $module['dependencies'], $module['scripts'] );

		$this->inlineScripts = array();
		if ( $langCode !== null ) {
			if ( $langCode !== 'en' && isset( $module['languageScripts'][$langCode] ) ) {
				$this->inlineScripts[] = $module['languageScripts'][$langCode];
			}
			$this->inlineScripts[] = UploadWizardMessages::getMessagesJs( 'UploadWizard', $langCode );
		}

		// TODO RTL
		$this->styles = $module['styles'];

		$dir = dirname( __FILE__ );
		$this->optimizedStylesFile = $dir . '/' . self::STYLES_MINIFIED;
		$this->optimizedScriptsFile = $dir . '/' . self::SCRIPTS_MINIFIED;
	}

	/**
	 * Writes HTML tags to load all dependencies separately. Useful when developing.
	 * @param {OutputPage} $out
	 * @param {String} $baseUrl: base URL, corresponds to the main directory of this extension.
	 */
	public function outputHtmlDebug( $out, $baseUrl ) {
		foreach ( $this->scripts as $script ) {
			$out->addScriptFile( $baseUrl . "/" . $script );
		}
		foreach ( $this->inlineScripts as $script ) {
			$out->addInlineScript( $script );
		}
		// XXX RTL
		foreach ( $this->styles as $style ) {
			$out->addStyle( $baseUrl . "/" . $style, '', '', 'ltr' );
		}
	}

	/**
	 * Writes HTML tags to load optimized dependencies. Useful in production.
	 * @param {OutputPage} $out
	 * @param {String} $baseUrl: base URL, corresponds to the main directory of this extension.
	 * @param {Boolean} $minified: if true, you get minified, otherwise, just combined.
	 */
	public function outputHtml( $out, $baseUrl, $minified = true ) {
		if ( $minified ) {
			$scriptsFile = self::SCRIPTS_MINIFIED;
			$stylesFile = self::STYLES_MINIFIED;
		} else {
			$scriptsFile = self::SCRIPTS_COMBINED;
			$stylesFile = self::STYLES_COMBINED;
		}
		// hardcoded but this seems reasonable
		$scriptsFile = "extensions/UploadWizard/resources/$scriptsFile";
		$stylesFile = "extensions/UploadWizard/resources/$stylesFile";

		$out->addScriptFile( $baseUrl . "/" . $scriptsFile );
		// XXX RTL!?
		$out->addStyle( $baseUrl . "/" . $stylesFile, '', '', 'ltr' );

		// the inline scripts still go inline (they are keyed off user language)
		foreach ( $this->inlineScripts as $script ) {
			$out->addInlineScript( $script );
		}
	}

	/**
	 * Write the concatenated and minified files for CSS and JS
	 * This is the function you want to call to regenerate all such files
	 * Not intended to be called in production or from the web.
	 * Intended to be invoked from the same directory as UploadWizard.
	 */
	public function writeOptimizedFiles( $installPath ) {
		chdir( $installPath );

		$extensionDir = dirname( __FILE__ );
		$resourceDir = "$extensionDir/resources";

		// have to group styles by dirname, since they sometimes refer to resources by relative path.
		$dirStyleCombinedUrls = array();
		$dirStyleMinifiedUrls = array();
		$dirStylesMap = array();
		foreach( $this->styles as $style ) {
			$dir = dirname( $style );
			if ( !isset( $dirStylesMap[$dir] ) ) {
				$dirStylesMap[$dir] = array();
			}
			$dirStylesMap[$dir][] = $style;
		}
		foreach ( $dirStylesMap as $dir => $styles ) {
			$combined = "$dir/dir." . self::STYLES_COMBINED;
			$this->concatenateFiles( $styles, $combined );
			$dirStyleCombinedUrls[] = preg_replace( '/^extensions\/UploadWizard\/resources\//', '', $combined );

			$minified = "$dir/dir." . self::STYLES_MINIFIED;
			$this->writeMinifiedCss( $combined, $minified );
			$dirStyleMinifiedUrls[] = preg_replace( '/^extensions\/UploadWizard\/resources\//', '', $minified );
		}
		$this->writeStyleImporter( $dirStyleCombinedUrls, $resourceDir . '/' . self::STYLES_COMBINED );
		$this->writeStyleImporter( $dirStyleMinifiedUrls, $resourceDir . '/' . self::STYLES_MINIFIED );

		// scripts are easy, they don't (or shouldn't) refer to other resources with relative paths
		$scriptsCombinedFile = $resourceDir . '/'. self::SCRIPTS_COMBINED;
		$this->concatenateFiles( $this->scripts, $scriptsCombinedFile );
		$this->writeMinifiedJs( $scriptsCombinedFile, $resourceDir . '/' . self::SCRIPTS_MINIFIED );
	}

	/**
	 * Since I couldn't figure out how to solve the CSS minification issue and how 
	 * it broke relative paths for images, we'll minify one file per directory. 
	 * This means we'll need a "master" file to import them all. We can use CSS @import,
	 * It's supported by browsers later than NS 4.0 or IE 4.0.
	 * @param {Array} $urls : list of urls
	 * @param {String} $outputFile : where to make this file
	 */
	function writeStyleImporter( $urls, $outputFile ) {
		$fp = fopen( $outputFile, 'w' );
		if ( ! $fp ) {
			print "couldn't open $outputFile for writing"; 
			exit;
		}
		foreach ( $urls as $url ) { 
			fwrite( $fp, "@import \"$url\";\n" );
		}
		fclose( $fp );
	}
	
	/**
	 * Concatenates several files on the filesystem into one.
	 * @param {Array} filenames 
	 * @param {String} filename to concatenate all files into. Will replace existing contents 
	 */
	private function concatenateFiles( $files, $outputFile ) {	
		$fp = fopen( $outputFile, 'w' );
		if ( ! $fp ) {
			print "couldn't open $outputFile for writing"; 
			exit;
		}
		foreach ( $files as $file ) { 
			fwrite( $fp, file_get_contents( $file ) );
		}
		fclose( $fp );
	}

	/**
	 * Writes a minified version of a particular JavaScript file to the filesystem.
	 * @param {Script} input filename
	 * @param {String} filename for minified output
	 */
	private function writeMinifiedJs( $inputFile, $outputFile ) {
		$fp = fopen( $outputFile, 'w' );
		if ( ! $fp ) {
			print "couldn't open $outputFile for writing"; 
			exit;
		}
		fwrite( $fp, JSMin::minify( file_get_contents( $inputFile ) ) );
		fclose( $fp );
	}

	/**
	 * Writes a minified version of a particular CSS file to the filesystem.
	 * N.B. multiline comment removal can fail in certain situations, which you are unlikely to encounter unless
	 * you nest comments, or put comment sequences inside values
	 * @param {Script} input filename
	 * @param {String} filename for minified output
	 */
	private function writeMinifiedCss( $inputFile, $outputFile ) {
		$contents = file_get_contents( $inputFile );

		// remove leading and trailing spaces
		$contents = preg_replace( '/^\s*|\s*$/m', '', $contents );

		// remove whitespace immediately after a separator
		$contents = preg_replace( '/([:{;,])\s*/', '$1', $contents );

		// remove whitespace immediately before an open-curly
		$contents = preg_replace( '/\s*\{/', '{', $contents );
		
		// remove /* ... */ comments, potentially on multiple lines
		// CAUTION: gets edge cases wrong, like nested or quoted comments. 
		// Not for use with nuclear reactors.
		$contents = preg_replace( '/\/\*.*?\*\//s', '', $contents );

		$fp = fopen( $outputFile, 'w' );
		if ( ! $fp ) {
			print "couldn't open $outputFile for writing"; 
			exit;
		}
		fwrite( $fp, $contents );
		fclose( $fp );
	}

}
