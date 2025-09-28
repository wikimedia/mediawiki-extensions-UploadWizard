<?php
/**
 * @file
 * @ingroup Upload
 * @ingroup API
 *
 * @license GPL-2.0-or-later
 * @author Nischay Nahata <nischayn22@gmail.com>
 */

namespace MediaWiki\Extension\UploadWizard;

use MediaWiki\Api\ApiBase;
use Wikimedia\ParamValidator\ParamValidator;

/**
 * API module to fetch blacklisting details of a flickr image
 *
 * @since 1.2
 */
class ApiFlickrBlacklist extends ApiBase {
	public function execute() {
		$params = $this->extractRequestParams();
		$this->requireOnlyOneParameter( $params, 'url', 'list' );

		$flickrBlacklist = new FlickrBlacklist( Config::getConfig(),
			$this->getContext() );

		if ( $params['list'] ) {
			$list = $flickrBlacklist->getBlacklist();
			$this->getResult()->setIndexedTagName( $list, 'item' );
			$this->getResult()->addValue( 'flickrblacklist', 'list', $list );
		}

		if ( $params['url'] !== null ) {
			if ( $flickrBlacklist->isBlacklisted( $params['url'] ) ) {
				$this->getResult()->addValue( 'flickrblacklist', 'result', 'bad' );
			} else {
				$this->getResult()->addValue( 'flickrblacklist', 'result', 'ok' );
			}
		}
	}

	/** @inheritDoc */
	public function getAllowedParams() {
		return [
			'url' => [
				ParamValidator::PARAM_TYPE => 'string',
			],
			'list' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_DEFAULT => false,
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages() {
		return [
			'action=flickrblacklist&url=http%3A//farm1.staticflickr.com/44/147426941_98baf36fd1_o.jpg'
				=> 'apihelp-flickrblacklist-example-1',
			'action=flickrblacklist&list='
				=> 'apihelp-flickrblacklist-example-2',
		];
	}
}
