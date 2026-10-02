<?php

namespace MediaWiki\Extension\UploadWizard\Tests;

use MediaWiki\Extension\UploadWizard\CampaignContent;
use MediaWiki\Json\FormatJson;
use MediaWikiIntegrationTestCase;

/**
 * @group Upload
 * @group Database
 * @covers \MediaWiki\Extension\UploadWizard\CampaignContent
 */
class CampaignContentTest extends MediaWikiIntegrationTestCase {

	/**
	 * @dataProvider provideValidate
	 */
	public function testValidate( string $text, array $expectedErrors ) {
		$status = ( new CampaignContent( $text ) )->validate();

		$this->assertSame(
			$expectedErrors,
			array_map( static fn ( $error ) => $error['message'], $status->getErrors() )
		);
		$this->assertSame( !$expectedErrors, ( new CampaignContent( $text ) )->isValid() );
	}

	public static function provideValidate() {
		yield 'Minimal campaign' => [
			FormatJson::encode( [ 'enabled' => true ] ),
			[],
		];
		yield 'Campaign with nested config' => [
			FormatJson::encode( [
				'enabled' => true,
				'autoAdd' => [ 'categories' => [ 'Foo' ] ],
				'fields' => [ [ 'wikitext' => '{{Foo|$1}}', 'maxLength' => 25, 'options' => [] ] ],
				'licensing' => [ 'ownWork' => [ 'licenses' => [ 'cc-by-sa-4.0', 'cc-zero' ] ] ],
			] ),
			[],
		];
		yield 'Campaign with a list of field options' => [
			FormatJson::encode( [
				'enabled' => true,
				'fields' => [ [ 'wikitext' => '{{Foo|$1}}', 'options' => [ 'Yes', 'No' ] ] ],
			] ),
			[],
		];
		yield 'Campaign with license group type' => [
			FormatJson::encode( [
				'enabled' => true,
				'licensing' => [ 'thirdParty' => [ 'licenseGroups' => [
					[ 'head' => 'foo', 'type' => 'and', 'licenses' => [ 'pd-us' ] ],
				] ] ],
			] ),
			[],
		];
		yield 'Not a JSON object' => [
			'"foo"',
			[ 'mwe-upwiz-campaign-invalid-json' ],
		];
		yield 'Missing required field' => [
			FormatJson::encode( [ 'title' => 'Foo' ] ),
			[ 'mwe-upwiz-campaign-invalid-property' ],
		];
		yield 'Wrong type' => [
			FormatJson::encode( [ 'enabled' => 'yes' ] ),
			[ 'mwe-upwiz-campaign-invalid-property' ],
		];
		yield 'Unknown field' => [
			FormatJson::encode( [ 'enabled' => true, 'enabeld' => true ] ),
			[ 'mwe-upwiz-campaign-invalid' ],
		];
		yield 'Unknown license group type' => [
			FormatJson::encode( [
				'enabled' => true,
				'licensing' => [ 'thirdParty' => [ 'licenseGroups' => [
					[ 'head' => 'foo', 'type' => 'xor', 'licenses' => [ 'pd-us' ] ],
				] ] ],
			] ),
			[ 'mwe-upwiz-campaign-invalid-property' ],
		];
		yield 'Unknown license' => [
			FormatJson::encode( [ 'enabled' => true, 'licensing' => [ 'ownWork' => [ 'licenses' => [ 'foo' ] ] ] ] ),
			[ 'mwe-upwiz-campaign-invalid-property' ],
		];
	}
}
