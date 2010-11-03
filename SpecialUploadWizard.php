<?php
/**
 * Special:UploadWizard
 *
 * Easy to use multi-file upload page.
 *
 * @file
 * @ingroup SpecialPage
 * @ingroup Upload
 */

class SpecialUploadWizard extends SpecialPage {

	private $simpleForm;

	// $request is the request (usually wgRequest)
	// $par is everything in the URL after Special:UploadWizard. Not sure what we can use it for
	public function __construct( $request=null, $par=null ) {
		global $wgRequest;
		// here we would configure ourselves based on stuff in $request and $wgRequest, but so far, we
		// don't have such things

		parent::__construct( 'UploadWizard', 'upload' );

		// create a simple form for non-JS fallback, which targets the old Special:Upload page.
		// at some point, if we completely subsume its functionality, change that to point here again,
	 	// but then we'll need to process non-JS uploads in the same way Special:Upload does.
		$this->simpleForm = new UploadWizardSimpleForm();
		$this->simpleForm->setTitle( 
			SpecialPage::getPage( 'Upload' )->getTitle() 
		);
	}

	/**
	 * Replaces default execute method
	 * Checks whether uploading enabled, user permissions okay, 
	 * @param subpage, e.g. the "foo" in Special:UploadWizard/foo. 
	 */
	public function execute( $subPage ) {
		global $wgScriptPath, $wgLang, $wgUser, $wgOut;

		// side effects: if we can't upload, will print error page to wgOut 
		// and return false
		if (! ( $this->isUploadAllowed() && $this->isUserUploadAllowed( $wgUser ) ) ) {
			return;
		}

		$this->setHeaders();
		$this->outputHeader();
			

		// fallback for non-JS
		$wgOut->addHTML('<noscript>');
		$wgOut->addHTML( '<p class="errorbox">' . wfMsg( 'mwe-upwiz-js-off' ) . '</p>' );
		$this->simpleForm->show();
		$wgOut->addHTML('</noscript>');
	
			
		$this->addJsVars( $subPage );
		if ( $wgResourceLoader ) {
			$wgOut->addModules( 'ext.uploadWizard' );
		} else {
			/* Doing resource loading the old-fashioned way for now until Resource Loader or something becomes the standard.
			   We anticipate that Resource Loader will be available sometime in late 2010 or early 2011, 
			   so we define scripts in the hooks that Resource Loader will expect, over in UploadWizardHooks.php.
			*/
			$module = UploadWizardHooks::$modules['ext.uploadWizard'];

			// in ResourceLoader, these will probably have names rather than explicit script paths, or be automatically loaded
			$dependencies = array(
				"extensions/UploadWizard/resources/jquery.ui/ui/ui.core.js",	
				'extensions/UploadWizard/resources/jquery.ui/ui/ui.datepicker.js',
				'extensions/UploadWizard/resources/jquery.ui/ui/ui.progressbar.js'
			);

			$scripts = array_merge( $dependencies, $module['scripts'] );
			if ( $wgLanguageCode !== 'en' && isset( $module['languageScripts'][$wgLanguageCode] ) ) {
				$scripts[] = $module['languageScripts'][$wgLanguageCode];
			}
			wfDebug( print_r( $scripts, 1 ) );
			foreach ( $scripts as $script ) {
				$wgOut->addScriptFile( $wgScriptPath . "/" . $script );
			}

			// after scripts, get the i18n.php stuff
			$wgOut->addInlineScript( UploadWizardMessages::getMessagesJs( 'UploadWizard', $wgLang ) );
	
			// TODO RTL
			foreach ( $module['styles'] as $style ) {
				$wgOut->addStyle( $wgScriptPath . "/" . $style, '', '', 'ltr' );
			}
	
		}
		
		// where the uploadwizard will go
		// TODO import more from UploadWizard's createInterface call.
		$wgOut->addHTML(
			'<div id="upload-wizard" class="upload-section"><div class="loadingSpinner"></div></div>'
		);

	}

	/**
	 * Adds some global variables for our use, as well as initializes the UploadWizard
	 * @param subpage, e.g. the "foo" in Special:UploadWizard/foo
	 */
	public function addJsVars( $subPage ) {
		global $wgUser, $wgOut;
		global $wgUseAjax, $wgAjaxLicensePreview, $wgEnableAPI;
		global $wgEnableFirefogg, $wgFileExtensions;
		global $wgUploadWizardDebug;

		$wgOut->addScript( Skin::makeVariablesScript( array(
			'wgUploadWizardDebug' => (bool)$wgUploadWizardDebug,

			// uncertain if this is relevant. Can we do license preview with API?
			'wgAjaxLicensePreview' => $wgUseAjax && $wgAjaxLicensePreview,

			'wgEnableFirefogg' => (bool)$wgEnableFirefogg,

			// what is acceptable in this wiki
			'wgFileExtensions' => $wgFileExtensions,

			'wgSubPage' => $subPage

			// XXX need to have a better function for testing viability of a filename
			// 'wgFilenamePrefixBlacklist' => UploadBase::getFilenamePrefixBlacklist()

		) ) );

	}

	/**
	 * Check if anyone can upload (or if other sitewide config prevents this)
	 * Side effect: will print error page to wgOut if cannot upload.
	 * @return boolean -- true if can upload
	 */
	private function isUploadAllowed() {
		global $wgOut, $wgEnableAPI;

		// Check uploading enabled
		if( !UploadBase::isEnabled() ) {
			$wgOut->showErrorPage( 'uploaddisabled', 'uploaddisabledtext' );
			return false;
		}

		// XXX does wgEnableAPI affect all uploads too?

		// Check whether we actually want to allow changing stuff
		if( wfReadOnly() ) {
			$wgOut->readOnlyPage();
			return false;
		}	

		// we got all the way here, so it must be okay to upload
		return true;
	}

	/**
	 * Check if the user can upload 
	 * Side effect: will print error page to wgOut if cannot upload.
	 * @param User
	 * @return boolean -- true if can upload
	 */
	private function isUserUploadAllowed( $user ) {
		global $wgOut, $wgGroupPermissions;

		if( !$user->isAllowed( 'upload' ) ) {
			if( !$user->isLoggedIn() && ( $wgGroupPermissions['user']['upload']
				|| $wgGroupPermissions['autoconfirmed']['upload'] ) ) {
				// Custom message if logged-in users without any special rights can upload
				$wgOut->showErrorPage( 'uploadnologin', 'uploadnologintext' );
			} else {
				$wgOut->permissionRequired( 'upload' );
			}
			return false;
		}

		// Check blocks
		if( $user->isBlocked() ) {
			$wgOut->blockedPage();
			return false;
		}

		// we got all the way here, so it must be okay to upload
		return true;
	}

}


/**
 * This is a hack on UploadForm, to make one that works from UploadWizard when JS is not available.
 */
class UploadWizardSimpleForm extends UploadForm {

	/*
 	 * Normally, UploadForm adds its own Javascript.
 	 * We wish to prevent this, because we want to control the case where we have Javascript.
 	 * So, we make the addUploadJS a no-op.
	 */
	protected function addUploadJS( ) { }

}


