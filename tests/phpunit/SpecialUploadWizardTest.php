<?php

namespace MediaWiki\Extension\UploadWizard\Tests;

use MediaWiki\Exception\UserBlockedError;
use MediaWiki\Extension\UploadWizard\Specials\SpecialUploadWizard;
use MediaWiki\MainConfigNames;
use SpecialPageTestBase;

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
		$this->getServiceContainer()
			->getDatabaseBlockStore()
			->insertBlockWithParams( [
				'targetUser' => $user,
				'by' => $this->getTestSysop()->getUser(),
				'expiry' => 'infinite',
				'sitewide' => $sitewide,
			] );

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
