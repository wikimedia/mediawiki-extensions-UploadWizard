<?php

namespace MediaWiki\Extension\UploadWizard\Tests;

use MediaWiki\Exception\UserBlockedError;
use MediaWiki\Extension\UploadWizard\Config;
use MediaWiki\Extension\UploadWizard\Specials\SpecialUploadWizard;
use MediaWiki\Html\Html;
use MediaWiki\MainConfigNames;
use MediaWiki\Tests\Specials\SpecialPageTestBase;
use MediaWiki\Title\Title;
use Wikimedia\TestingAccessWrapper;

/**
 * @group Database
 */
class SpecialUploadWizardTest extends SpecialPageTestBase {

	/**
	 * @inheritDoc
	 */
	protected function newSpecialPage() {
		$userOptionsLookup = $this->getServiceContainer()->getUserOptionsLookup();
		return new SpecialUploadWizard( $userOptionsLookup, null );
	}

	protected function tearDown(): void {
		parent::tearDown();

		// T378299: Make the next test merge the defaults again.
		TestingAccessWrapper::newFromClass( Config::class )->mergedConfig = false;
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

	/**
	 * @covers \MediaWiki\Extension\UploadWizard\Specials\SpecialUploadWizard::execute
	 * @dataProvider provideAltUploadForm
	 * @param string|array $altUploadForm Value of the 'altUploadForm' setting
	 * @param string $language User language code
	 * @param string|null $expectedTitle Title of the linked page, or null for no link
	 */
	public function testAltUploadForm( $altUploadForm, string $language, ?string $expectedTitle ) {
		$this->setUploadWizardConfig( [ 'altUploadForm' => $altUploadForm ] );

		$user = $this->getTestUser()->getUser();
		[ $html ] = $this->executeSpecialPage( '', null, $language, $user );

		$this->assertAltUploadFormLink( $expectedTitle, $html );
	}

	public static function provideAltUploadForm() {
		$map = [ 'default' => 'Project:Upload', 'de' => 'Project:Hochladen' ];
		return [
			'A page title gives a link to that page' => [ 'Special:Upload', 'qqx', 'Special:Upload' ],
			// T436851: a map came to Title::newFromText() unresolved.
			'A map gives a link to the page for the user language' => [ $map, 'de', 'Project:Hochladen' ],
			'A map without the user language gives a link to the default page' => [ $map, 'fr', 'Project:Upload' ],
			'An empty entry gives a link to the default page' => [
				[ 'default' => 'Project:Upload', 'de' => '' ], 'de', 'Project:Upload',
			],
			'An empty map gives no link' => [ [], 'qqx', null ],
			'An invalid page title gives no link' => [ '<invalid>', 'qqx', null ],
		];
	}

	/**
	 * The 'fallbackToAltUploadForm' setting replaces the wizard with a link. This
	 * link also comes from a map.
	 *
	 * @covers \MediaWiki\Extension\UploadWizard\Specials\SpecialUploadWizard::getWizardHtml
	 */
	public function testFallbackToAltUploadForm() {
		$this->setUploadWizardConfig( [
			'fallbackToAltUploadForm' => true,
			'altUploadForm' => [ 'default' => 'Project:Upload', 'de' => 'Project:Hochladen' ],
		] );

		$user = $this->getTestUser()->getUser();
		[ $html ] = $this->executeSpecialPage( '', null, 'de', $user );

		// The link text is a normalized title, not the raw setting.
		$title = Title::newFromText( 'Project:Hochladen' );
		$this->assertStringContainsString(
			Html::element( 'a', [ 'href' => $title->getLocalURL() ], $title->getPrefixedText() ),
			$html
		);
	}

	/**
	 * Assert that the page links to the alternative upload form, or does not.
	 *
	 * @param string|null $expectedTitle Title of the linked page, or null for no link
	 * @param string $html
	 */
	private function assertAltUploadFormLink( ?string $expectedTitle, string $html ) {
		if ( $expectedTitle === null ) {
			// In the 'qqx' language a message shows its own key.
			$this->assertStringNotContainsString( 'mwe-upwiz-subhead-alt-upload', $html );
			return;
		}

		$this->assertStringContainsString( Title::newFromText( $expectedTitle )->getLocalURL(), $html );
	}

	/**
	 * Set the UploadWizard configuration.
	 *
	 * @param array $config
	 */
	private function setUploadWizardConfig( array $config ) {
		$this->overrideConfigValues( [
			MainConfigNames::EnableUploads => true,
			'UploadWizardConfig' => $config,
		] );
		// T378299: Config remembers the merge of the UploadWizard.config.php
		// defaults into the global. Make it forget, or the override does not apply.
		TestingAccessWrapper::newFromClass( Config::class )->mergedConfig = false;
	}

}
