<?php

/**
 * Class to encapsulate all the html generation associated with the UploadWizard tutorial. 
 * Might be a start for a subclass of UploadWizard, if we ever free it of its WMF-oriented features
 * So that non-WMF'ers can use it
 */
class UploadWizardTutorial {

	// name of the tutorial on Wikimedia Commons. The $1 is replaced with the language desired
	const NAME_TEMPLATE = 'Licensing_tutorial_$1.svg';

	// the width we want to scale the tutorial to, for our interface
	const WIDTH_PX = 720;

	// imagemap coordinates of the "helpdesk" button at the bottom, which is supposed to be clickable.
	const HELPDESK_BUTTON_COORDS = "27, 1319, 691, 1384";

	// link to help desk within commons tutorial
	const HELPDESK_URL = 'http://commons.wikimedia.org/wiki/Help_desk';

	// id of imagemap used in tutorial
	const IMAGEMAP_ID = 'tutorialMap';

	/**
	 * Fetches appropriate HTML for the tutorial portion of the wizard. 
	 * Looks up an image on the current wiki. This will work as is on Commons, and will also work 
	 * on test wikis that enable instantCommons.
	 * @param {String} $langCode language code as used by MediaWiki, similar but not identical to ISO 639-1.
	 * @return {String} html that will display the tutorial.
	 */
	function getHtml() {
		global $wgLang;

		$error = null;
		$errorHtml = '';
		$tutorialHtml = '';

		// get a valid language code, even if the global is wrong
		if ( $wgLang ) {
			$langCode = $wgLang->getCode();
		}
		if ( !isset( $langCode) or $langCode === '' ) { 	
			$langCode = 'en';
		}
	
		$tutorialFile = false;
		// getFile returns false if it can't find the right file 
		if ( ! $tutorialFile = self::getFile( $langCode ) ) { 
			$error = 'localized-file-missing';
			if ( $langCode !== 'en' ) {
				$tutorialFile = self::getFile( 'en' );
			}
		}

		// at this point, we have one of the following situations:
		// $error is empty, and tutorialFile is the right one for this language
		// $error notes we couldn't find the tutorialFile for your language, and $tutorialFile is the english one
		// $error notes we couldn't find the tutorialFile for your language, and $tutorialFile is still false (major file failure)

		if ( $tutorialFile ) {
			// XXX TODO if the client can handle SVG, we could also just send it the unscaled thumb, client-scaled into a DIV or something.
			// if ( client can handle SVG ) { 
			//   $tutorialThumbnailImage->getUnscaledThumb();	
			// }
			// put it into a div of appropriate dimensions.

			// n.b. File::transform() returns false if failed, MediaTransformOutput otherwise
 			if ( $thumbnailImage = $tutorialFile->transform( array( 'width' => self::WIDTH_PX ) ) ) {
				$tutorialHtml = self::getImageHtml( $thumbnailImage );
			} else {
				$error = 'cannot-transform';
			}
		} else {
			$error = 'file-missing';	
		}

		if ( isset( $error ) ) {
			$errorHtml = Html::element( 'p', array( 'class' => 'errorbox', 'style' => 'float: none;' ), wfMsg( 'mwe-upwiz-tutorial-error-' . $error ) );
		}

		return $errorHtml . $tutorialHtml;
	
	} 

	/**
	 * Get tutorial file for a particular language, or false if not available.
	 * @param {String} $langCode: language Code
	 * @return {File|false} 
	 */
	function getFile( $langCode ) {
 		$tutorialName = str_replace( '$1', $langCode, self::NAME_TEMPLATE );
 		$tutorialTitle = Title::newFromText( $tutorialName, NS_FILE ); 
		return wfFindFile( $tutorialTitle );
	}

	/**
	 * Constructs HTML for the tutorial (laboriously), including an imagemap for the clickable "Help desk" button.
	 * @param {ThumbnailImage} $thumb
	 * @return {String} HTML representing the image, with clickable helpdesk button
	 */
	function getImageHtml( $thumb ) {
		// here we use the not-yet-forgotten HTML imagemap to add a clickable area to the tutorial image.
		// we could do more special effects with hovers and images and such, not to mention SVG scripting, 
		// but we aren't sure what we want yet...
		$img = Html::element( 'img', array(
			'src' => $thumb->getUrl(),
			'width' => $thumb->getWidth(),
			'height' => $thumb->getHeight(),
			'usemap' => '#' . self::IMAGEMAP_ID
		) );
		$areaAltText = wfMsg( 'mwe-upwiz-help-desk' );
		$area = Html::element( 'area', array( 
			'shape' => 'rect',
			'coords' => self::HELPDESK_BUTTON_COORDS,
			'href' => self::HELPDESK_URL,
			'alt' => $areaAltText,
			'title' => $areaAltText
		) );
		$map = Html::rawElement( 'map', array( 'id' => self::IMAGEMAP_ID, 'name' => self::IMAGEMAP_ID ), $area );
		return $map . $img;
	}

}
