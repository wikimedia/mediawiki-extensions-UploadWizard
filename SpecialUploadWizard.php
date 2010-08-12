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

	// $request is the request (usually wgRequest)
	// $par is everything in the URL after Special:UploadWizard. Not sure what we can use it for
	public function __construct( $request=null, $par=null ) {
		global $wgEnableAPI, $wgRequest;

		if (! $wgEnableAPI) {
			// XXX complain
		}

		// here we would configure ourselves based on stuff in $request and $wgRequest, but so far, we
		// don't have such things

		parent::__construct( 'UploadWizard', 'upload' );

		$this->simpleForm = new UploadWizardSimpleForm();
		$this->simpleForm->setTitle( $this->getTitle() );
	}

	/**
	 * Replaces default execute method
	 * Checks whether uploading enabled, user permissions okay, 
	 * @param subpage, e.g. the "foo" in Special:UploadWizard/foo. 
	 */
	public function execute( $subPage ) {
		global $wgMessageCache, $wgScriptPath, $wgLang, $wgUser, $wgOut;

		// canUpload and canUserUpload have side effects; 
		// if we can't upload, will print error page to wgOut 
		// and return false
		if (! ( $this->isUploadAllowed() && $this->isUserUploadAllowed( $wgUser ) ) ) {
			return;
		}

		$langCode = $wgLang->getCode();
		
		// XXX what does this really do??
		$wgMessageCache->loadAllMessages();

		$this->setHeaders();
		$this->outputHeader();

		/* Doing resource loading the old-fashioned way for now until there's some kind of script-loading
		   strategy that everyone agrees on, or is available generally */
		$scripts = array( 
			// jquery is already loaded by vector.
			// "resources/jquery-1.4.2.js",

			// jquery standard stuff
			"resources/jquery.ui/ui/ui.core.js",	
	 		"resources/jquery.ui/ui/ui.progressbar.js",
			"resources/jquery.ui/ui/ui.datepicker.js",
			"resources/jquery.autocomplete.js",
			
			// miscellaneous utilities	
			"resources/mw.Utilities.js",
			"resources/mw.UtilitiesTime.js",
			"resources/mw.Log.js",
			// "resources/mw.MockUploadHandler.js",
			
			// message parsing and such
			"resources/language/mw.Language.js",
			"resources/language/mw.Parser.js",
			"resources/mw.LanguageUpWiz.js",

			// workhorse libraries
			// "resources/mw.UploadApiProcessor.js",
			"resources/mw.IframeTransport.js",
			"resources/mw.ApiUploadHandler.js",
			"resources/mw.DestinationChecker.js",

			// interface helping stuff
			"resources/jquery.tipsy.js",
			"resources/jquery.morphCrossfade.js",
			"resources/jquery.validate.js",
			"resources/jquery.arrowSteps.js",
			"resources/jquery.mwCoolCats.js",

			// the thing that does most of it
			"resources/mw.UploadWizard.js",

			// finally the thing that launches it all
			"UploadWizardPage.js"
		);

		if ($langCode !== 'en' ) {
			$scripts[] = "js/language/classes/Language" . ucfirst( $langCode ) . ".js"; 
		}
	
		$extensionPath = $wgScriptPath . "/extensions/UploadWizard";
	
		foreach ( $scripts as $script ) {
			$wgOut->addScriptFile( $extensionPath . "/" . $script );
		}
		// after scripts, get the i18n.php stuff
		$wgOut->addInlineScript( UploadWizardMessages::getMessagesJs( 'UploadWizard', $wgLang ) );

		$styles = array(
			"resources/jquery.tipsy.css",
			"resources/uploadWizard.css",
			"resources/jquery.arrowSteps.css",
			"resources/jquery.mwCoolCats.css"
		);

		// TODO RTL
		foreach ( $styles as $style ) {
			$wgOut->addStyle( $extensionPath . "/" . $style, '', '', 'ltr' );
		}
		
		$this->addJsVars( $subPage );
		
	
		// where the uploadwizard will go
		// TODO import more from UploadWizard itself.
		$wgOut->addHTML(
			'<div id="upload-licensing" class="upload-section" style="display: none;">Licensing tutorial</div>'
			. '<div id="upload-wizard" class="upload-section"><div class="loadingSpinner"></div></div>'
		);
		

		// fallback for non-JS
		$wgOut->addHTML('<noscript>');
		$this->simpleForm->show();
		$wgOut->addHTML('</noscript>');
	
	}

	/**
	 * Adds some global variables for our use, as well as initializes the UploadWizard
	 * @param subpage, e.g. the "foo" in Special:UploadWizard/foo
	 */
	public function addJsVars( $subPage ) {
		global $wgUser, $wgOut;
		global $wgUseAjax, $wgAjaxLicensePreview, $wgEnableAPI;
		global $wgEnableFirefogg, $wgFileExtensions;

		$wgOut->addScript( Skin::makeVariablesScript( array(
			// uncertain if this is relevant. Can we do license preview with API?
			'wgAjaxLicensePreview' => $wgUseAjax && $wgAjaxLicensePreview,

			'wgEnableFirefogg' => (bool)$wgEnableFirefogg,

			// what is acceptable in this wiki
			'wgFileExtensions' => $wgFileExtensions,

			// XXX page should fetch its own edit token
			// our edit token
			'wgEditToken' => $wgUser->editToken(),
		
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
		global $wgOut;

		// Check uploading enabled
		if( !UploadBase::isEnabled() ) {
			$wgOut->showErrorPage( 'uploaddisabled', 'uploaddisabledtext' );
			return false;
		}

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
 * This is a hack on UploadForm.
 * Normally, UploadForm adds its own Javascript.
 * We wish to prevent this, because we want to control the case where we have Javascript.
 * So, we subclass UploadForm, and make the addUploadJS a no-op.
 */
class UploadWizardSimpleForm extends UploadForm {
	protected function addUploadJS( ) { }

}

/*
// XXX UploadWizard extension, do this in the normal SpecialPage way once JS2 issue resolved
function wfSpecialUploadWizard( $par ) {
	global $wgRequest;
	// can we obtain $request from here?
	// $this->loadRequest( is_null( $request ) ? $wgRequest : $request );
	$o = new SpecialUploadWizard( $wgRequest, $par );
	$o->execute();
}
*/
