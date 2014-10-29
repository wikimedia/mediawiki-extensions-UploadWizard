<?php

/**
 * API module to fetch blacklisting details of a flickr image
 *
 * @since 1.2
 *
 * @file ApiFlickrBlacklist.php
 * @ingroup Upload
 * @ingroup API
 *
 * @licence GNU GPL v2+
 * @author Nischay Nahata <nischayn22@gmail.com>
 */
class ApiFlickrBlacklist extends ApiBase {
	public function execute() {
		$params = $this->extractRequestParams();
		$this->requireOnlyOneParameter( $params, 'url', 'list' );

		$flickrBlacklist = new UploadWizardFlickrBlacklist( UploadWizardConfig::getConfig(),
			$this->getContext() );

		if ( $params['list'] ) {
			$list = $flickrBlacklist->getBlacklist();
			$this->getResult()->setIndexedTagName( $list, 'item' );
			$this->getResult()->addValue( 'flickrblacklist', 'list', $list );
		}

		if ( !is_null( $params['url'] ) ) {
			if ( $flickrBlacklist->isBlacklisted( $params['url'] ) ) {
				$this->getResult()->addValue( 'flickrblacklist', 'result', 'bad' );
			} else {
				$this->getResult()->addValue( 'flickrblacklist', 'result', 'ok' );
			}
		}
	}

	public function getAllowedParams() {
		return array(
			'url' => array(
				ApiBase::PARAM_TYPE => 'string',
			),
			'list' => array(
				ApiBase::PARAM_TYPE => 'boolean',
				ApiBase::PARAM_DFLT => false,
			),
		);
	}

	/**
	 * @deprecated since MediaWiki core 1.25
	 */
	public function getParamDescription() {
		return array(
			'url' => 'The flickr url to be tested',
			'list' => 'When set, the complete blacklist is returned. '
				. '(Cannot be used together with the url parameter.)',
		);
	}

	/**
	 * @deprecated since MediaWiki core 1.25
	 */
	public function getDescription() {
		return 'Validate a flickr URL by using its NSID for blacklisting. When used '
			. 'with the list option, return all blacklisted NSIDs.';
	}

	/**
	 * @deprecated since MediaWiki core 1.25
	 */
	public function getExamples() {
		return array(
			'api.php?action=flickrblacklist&url=http%3A//farm1.staticflickr.com/44/147426941_98baf36fd1_o.jpg',
			'api.php?action=flickrblacklist&list',
		);
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 */
	protected function getExamplesMessages() {
		return array(
			'action=flickrblacklist&url=http%3A//farm1.staticflickr.com/44/147426941_98baf36fd1_o.jpg'
				=> 'apihelp-flickrblacklist-example-1',
			'action=flickrblacklist&list='
				=> 'apihelp-flickrblacklist-example-2',
		);
	}
}
