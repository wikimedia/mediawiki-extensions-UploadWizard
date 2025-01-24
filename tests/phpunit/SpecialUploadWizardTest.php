<?php

namespace MediaWiki\Extension\UploadWizard\Tests;

use MediaWiki\Block\DatabaseBlock;
use MediaWiki\Extension\UploadWizard\Specials\SpecialUploadWizard;
use MediaWiki\MainConfigNames;
use SpecialPageTestBase;
use UserBlockedError;

/**
 * @group Database
 */
class SpecialUploadWizardTest extends SpecialPageTestBase {

	/**
	 * @inheritDoc
	 */
	protected function newSpecialPage() {
		$userOptionsLookup = $this->getServiceContainer()->getUserOptionsLookup();
		return new SpecialUploadWizard( $userOptionsLookup );
	}

	/**
	 * @covers \MediaWiki\Extension\UploadWizard\Specials\SpecialUploadWizard::isUserUploadAllowed
	 * @dataProvider provideIsUserUploadAllowedForBlockedUser
	 * @param bool $sitewide The block is a sitewide block
	 * @param bool $expectException A UserBlockedError is expected
	 */
	public function testIsUserUploadAllowedForBlockedUser( $sitewide, $expectException ) {
		$this->overrideConfigValues( [
			MainConfigNames::BlockDisablesLogin => false,
			MainConfigNames::EnableUploads => true,
		] );

		$user = $this->getTestUser()->getUser();
		$block = new DatabaseBlock( [
			'expiry' => 'infinite',
			'sitewide' => $sitewide,
		] );
		$block->setTarget( $user );
		$block->setBlocker( $this->getTestSysop()->getUser() );

		$this->getServiceContainer()
			->getDatabaseBlockStoreFactory()
			->getDatabaseBlockStore( $block->getWikiId() )
			->insertBlock( $block );

		$caughtException = false;
		try {
			$this->executeSpecialPage( '', null, null, $user );
		} catch ( UserBlockedError $e ) {
			$caughtException = true;
		}

		$this->assertSame( $expectException, $caughtException );
	}

	public static function provideIsUserUploadAllowedForBlockedUser() {
		return [
			'User with sitewide block is blocked from uploading' => [ true, true ],
			'User with partial block is allowed to upload' => [ false, false ],
		];
	}

}
