<?php

namespace MediaWiki\Extension\UploadWizard;

use Content;
use IContextSource;
use JsonSchemaException;
use ManualLogEntry;
use MediaWiki\Content\Hook\ContentModelCanBeUsedOnHook;
use MediaWiki\Deferred\LinksUpdate\LinksUpdate;
use MediaWiki\EditPage\EditPage;
use MediaWiki\Hook\EditFilterMergedContentHook;
use MediaWiki\Hook\LinksUpdateCompleteHook;
use MediaWiki\Hook\PageMoveCompleteHook;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\Page\Hook\ArticleDeleteCompleteHook;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Status\Status;
use MediaWiki\Storage\EditResult;
use MediaWiki\Storage\Hook\PageSaveCompleteHook;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWiki\User\UserIdentity;
use Wikimedia\Rdbms\IConnectionProvider;
use WikiPage;

/**
 * Hooks for managing JSON Schema namespace and content model.
 *
 * @file
 * @ingroup Extensions
 * @ingroup UploadWizard
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */

class CampaignHooks implements
	ContentModelCanBeUsedOnHook,
	EditFilterMergedContentHook,
	PageSaveCompleteHook,
	ArticleDeleteCompleteHook,
	PageMoveCompleteHook,
	LinksUpdateCompleteHook
{

	/** @var IConnectionProvider */
	private $dbLoadBalancerFactory;

	/**
	 * @param IConnectionProvider $dbLoadBalancerFactory
	 */
	public function __construct( IConnectionProvider $dbLoadBalancerFactory ) {
		$this->dbLoadBalancerFactory = $dbLoadBalancerFactory;
	}

	/**
	 * 'Campaign' content model must be used in, and only in, the 'Campaign' namespace.
	 *
	 * @param string $contentModel
	 * @param Title $title
	 * @param bool &$ok
	 * @return bool
	 */
	public function onContentModelCanBeUsedOn( $contentModel, $title, &$ok ) {
		$isCampaignModel = $contentModel === 'Campaign';
		$isCampaignNamespace = $title->inNamespace( NS_CAMPAIGN );
		if ( $isCampaignModel !== $isCampaignNamespace ) {
			$ok = false;
			return false;
		}
		return true;
	}

	/**
	 * FIXME: This should be done as a DataUpdate
	 *
	 * Sets up appropriate entries in the uc_campaigns table for each Campaign
	 * Acts everytime a page in the NS_CAMPAIGN namespace is saved
	 *
	 * @param WikiPage $wikiPage
	 * @param UserIdentity $userIdentity
	 * @param string $summary
	 * @param int $flags
	 * @param RevisionRecord $revisionRecord
	 * @param EditResult $editResult
	 */
	public function onPageSaveComplete(
		$wikiPage,
		$userIdentity,
		$summary,
		$flags,
		$revisionRecord,
		$editResult
	) {
		$content = $wikiPage->getContent();
		if ( !$content instanceof CampaignContent ) {
			return;
		}

		$dbw = $this->dbLoadBalancerFactory->getPrimaryDatabase();

		$campaignData = $content->getJsonData();
		$insertData = [
			'campaign_enabled' => $campaignData !== null && $campaignData['enabled'] ? 1 : 0
		];
		$dbw->newInsertQueryBuilder()
			->insertInto( 'uw_campaigns' )
			->row( array_merge(
				[ 'campaign_name' => $wikiPage->getTitle()->getDBkey() ],
				$insertData
			) )
			->onDuplicateKeyUpdate()
			->uniqueIndexFields( 'campaign_name' )
			->set( $insertData )
			->caller( __METHOD__ )
			->execute();

		$campaign = new Campaign( $wikiPage->getTitle(), $content->getJsonData() );
		$dbw->onTransactionPreCommitOrIdle( static function () use ( $campaign ) {
			$campaign->invalidateCache();
		}, __METHOD__ );
	}

	/**
	 * Invalidates the cache for a campaign when any of its dependents are edited. The 'dependents'
	 * are tracked by entries in the templatelinks table, which are inserted by using the
	 * PageContentSaveComplete hook.
	 *
	 * This is usually run via the Job Queue mechanism.
	 * @param LinksUpdate $linksupdate
	 * @param mixed $ticket
	 */
	public function onLinksUpdateComplete( $linksupdate, $ticket ) {
		if ( !$linksupdate->getTitle()->inNamespace( NS_CAMPAIGN ) ) {
			return;
		}

		$campaign = new Campaign( $linksupdate->getTitle() );
		$campaign->invalidateCache();
	}

	/**
	 * Deletes entries from uc_campaigns table when a Campaign is deleted
	 * @param WikiPage $article
	 * @param User $user
	 * @param string $reason
	 * @param int $id
	 * @param Content $content
	 * @param ManualLogEntry $logEntry
	 * @param int $archivedRevisionCount
	 */
	public function onArticleDeleteComplete(
		$article, $user, $reason, $id, $content, $logEntry, $archivedRevisionCount
	) {
		if ( !$article->getTitle()->inNamespace( NS_CAMPAIGN ) ) {
			return;
		}

		$fname = __METHOD__;
		$dbw = $this->dbLoadBalancerFactory->getPrimaryDatabase();
		$dbw->onTransactionPreCommitOrIdle( static function () use ( $dbw, $article, $fname ) {
			$dbw->newDeleteQueryBuilder()
				->deleteFrom( 'uw_campaigns' )
				->where( [ 'campaign_name' => $article->getTitle()->getDBkey() ] )
				->caller( $fname )
				->execute();
		}, $fname );
	}

	/**
	 * Update campaign names when the Campaign page moves
	 * @param LinkTarget $oldTitle
	 * @param LinkTarget $newTitle
	 * @param UserIdentity $user
	 * @param int $pageid
	 * @param int $redirid
	 * @param string $reason
	 * @param RevisionRecord $revisionRecord
	 */
	public function onPageMoveComplete(
		$oldTitle,
		$newTitle,
		$user,
		$pageid,
		$redirid,
		$reason,
		$revisionRecord
	): void {
		if ( !$oldTitle->inNamespace( NS_CAMPAIGN ) ) {
			return;
		}

		$dbw = $this->dbLoadBalancerFactory->getPrimaryDatabase();
		$dbw->newUpdateQueryBuilder()
			->update( 'uw_campaigns' )
			->set( [ 'campaign_name' => $newTitle->getDBkey() ] )
			->where( [ 'campaign_name' => $oldTitle->getDBkey() ] )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * Validates that the revised contents are valid JSON.
	 * If not valid, rejects edit with error message.
	 * @param IContextSource $context
	 * @param Content $content
	 * @param Status $status
	 * @param string $summary
	 * @param User $user
	 * @param bool $minoredit
	 * @return bool
	 */
	public function onEditFilterMergedContent( IContextSource $context, Content $content, Status $status, $summary,
		User $user, $minoredit
	) {
		if ( !$context->getTitle()->inNamespace( NS_CAMPAIGN )
			|| !$content instanceof CampaignContent
		) {
			return true;
		}

		try {
			$content->validate();
		} catch ( JsonSchemaException $e ) {
			$status->fatal( $context->msg( $e->getCode(), $e->args ) );
			// @todo Remove this line after this extension do not support mediawiki version 1.36 and before
			$status->value = EditPage::AS_HOOK_ERROR_EXPECTED;
			return false;
		}

		return true;
	}
}
