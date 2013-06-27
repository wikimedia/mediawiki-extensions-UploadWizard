<?php
/**
 * Hooks for managing JSON Schema namespace and content model.
 *
 * @file
 * @ingroup Extensions
 * @ingroup UploadWizard
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */

class CampaignHooks {

	/**
	 * Registers hook and content handlers if the JSON Schema
	 * namespace is enabled for this site.
	 * @return bool: Whether hooks and handler were registered.
	 */
	static function registerHandlers() {
		global $wgAPIModules, $wgHooks, $wgContentHandlers;

		$wgContentHandlers[ 'Campaign' ] = 'CampaignContentHandler';

		$wgHooks[ 'BeforePageDisplay' ][] = 'CampaignHooks::onBeforePageDisplay';
		$wgHooks[ 'CanonicalNamespaces' ][] = 'CampaignHooks::onCanonicalNamespaces';
		$wgHooks[ 'EditFilterMerged' ][] = 'CampaignHooks::onEditFilterMerged';
		$wgHooks[ 'CodeEditorGetPageLanguage' ][] = 'CampaignHooks::onCodeEditorGetPageLanguage';
		$wgHooks[ 'PageContentSaveComplete' ][] = 'CampaignHooks::onPageContentSaveComplete';
		$wgHooks[ 'ArticleDeleteComplete' ][] = 'CampaignHooks::onArticleDeleteComplete';

		$wgAPIModules[ 'camapaign' ] = 'ApiCampaign';
		
		return true;
	}

	/**
	 * Sets up appropriate entries in the uc_campaigns table for each Campaign
	 * Acts everytime a page in the NS_CAMPAIGN namespace is saved
	 */
	public static function onPageContentSaveComplete( $article, $user, $content, $summary, $isMinor, $isWatch, $section, $flags, $revision, $status, $baseRevId ) {
		if( !$article->getTitle()->inNamespace( NS_CAMPAIGN ) ) {
			return true;
		}

		$dbw = wfGetDB( DB_MASTER );
		$dbw->begin();

		$campaignData = $content->getJsonData();
		$insertData = array(
			'campaign_enabled' => $campaignData['enabled']
		);
		$success = $dbw->upsert(
			'uw_campaigns',
			array_merge( array(
				'campaign_name' => $article->getTitle()->getDBkey()
			), $insertData ),
			array( 'campaign_name' ),
			$insertData
		);

		$dbw->commit();

		return $success;
	}

	/**
	 * Deletes entries from uc_campaigns table when a Campaign is deleted
	 */
	public static function onArticleDeleteComplete( $article, $user, $reason, $id, $content, $logEntry ) {
		if( !$article->getTitle()->inNamespace( NS_CAMPAIGN ) ) {
			return true;
		}

		$dbw = wfGetDB( DB_MASTER );
		$dbw->begin();
		$success = $dbw->delete(
			'uw_campaigns',
			array( 'campaign_name' => $article->getTitle()->getDBKey() )
		);
		$dbw->commit();

		return $success;
	}

	/**
	 * Declares JSON as the code editor language for Campaign: pages.
	 * This hook only runs if the CodeEditor extension is enabled.
	 * @param Title $title
	 * @param string &$lang Page language.
	 * @return bool
	 */
	static function onCodeEditorGetPageLanguage( $title, &$lang ) {
		if ( $title->inNamespace( NS_CAMPAIGN ) ) {
			$lang = 'json';
		}
		return true;
	}

	/**
	 * Registers Campaign namespaces and assign edit rights.
	 * @param array &$namespaces Mapping of numbers to namespace names.
	 * @return bool
	 */
	static function onCanonicalNamespaces( array &$namespaces ) {
		global $wgNamespaceContentModels, $wgNamespaceProtection;

		$namespaces[ NS_CAMPAIGN ] = 'Campaign';
		$namespaces[ NS_CAMPAIGN_TALK ] = 'Campaign_talk';

		// FIXME: Provide required protection settings here
		$wgNamespaceProtection[ NS_CAMPAIGN ] = array( 'autoconfirmed' );
		$wgNamespaceContentModels[ NS_CAMPAIGN ] = 'Campaign';

		return true;
	}

	/**
	 * Validates that the revised contents are valid JSON.
	 * If not valid, rejects edit with error message.
	 * @param EditPage $editor
	 * @param string $text Content of the revised article.
	 * @param string &$error Error message to return.
	 * @param string $summary Edit summary provided for edit.
	 * @return True
	 */
	static function onEditFilterMerged( $editor, $text, &$error, $summary ) {
		if ( $editor->getTitle()->getNamespace() !== NS_CAMPAIGN ) {
			return true;
		}

		$content = new CampaignContent( $text );

		try {
			$content->validate();
		} catch ( JsonSchemaException $e ) {
			$error = $e->getMessage();
		}

		return true;
	}

	/**
	 * Adds CSS for pretty-printing schema on NS_CAMPAIGN pages.
	 * @param OutputPage &$out
	 * @param Skin &$skin
	 * @return bool
	 */
	static function onBeforePageDisplay( &$out, &$skin ) {
		$title = $out->getTitle();
		$revId = $out->getRevisionId();

		if ( $title->inNamespace( NS_CAMPAIGN ) ) {
			$out->addModules( 'ext.eventLogging.jsonSchema' );

			if ( $revId !== null ) {
				$out->addSubtitle( $out->msg( 'eventlogging-revision-id' )
					// We use 'rawParams' rather than 'numParams' to make it
					// easy to copy/paste the value into code.
					->rawParams( $revId )
					->escaped() );
			}
		}
		return true;
	}
}
