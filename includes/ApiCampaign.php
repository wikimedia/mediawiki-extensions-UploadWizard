<?php
/**
 * API module for retrieving Upload Campaigns
 *
 * @file
 * @ingroup EventLogging
 * @ingroup Extensions
 *
 * @author Ori Livneh <ori@wikimedia.org>
 */

/**
 * API module for retrieving Upload Campaign
 * This avoids API result paths and returns HTTP error codes in order to
 * act like a request for the raw page content.
 * @ingroup API
 */
class ApiCampaign extends ApiBase {

	/**
	 * Restrict the set of valid formatters to just 'json' and 'jsonfm'.  Other
	 * requested formatters are instead treated as 'json'.
	 * @return ApiFormatJson
	 */
	public function getCustomPrinter() {
		if ( $this->getMain()->getVal( 'format' ) === 'jsonfm' ) {
			$format = 'jsonfm';
		} else {
			$format = 'json';
		}
		return $this->getMain()->createPrinterByName( $format );
	}

	public function getAllowedParams() {
		return array(
			'revid' => array(
				ApiBase::PARAM_TYPE => 'integer',
				ApiBase::PARAM_REQUIRED => true,
			),
			'title' => array(
				ApiBase::PARAM_TYPE => 'string',
			),
		);
	}

	public function getParamDescription() {
		return array(
			'revid' => 'Campaign revision ID',
			'title' => 'Campaign name',
		);
	}

	public function getDescription() {
		return 'Retrieve a Upload Campaign page';
	}

	public function getExamples() {
		return array( 'api.php?action=uploadcampaigns&revid=1234'  => 'Retrieve schema for revision 1234' );
	}

	/**
	 * Set future expires and public cache-control headers on the
	 * pending HTTP response.
	 */
	public function markCacheable() {
		$main = $this->getMain();
		$main->setCacheMode( 'public' );
		$main->setCacheMaxAge( 300 );
	}

	/**
	 * Emit an error response. Like ApiBase::dieUsageMsg, but sets
	 * HTTP 400 ('Bad Request') status code.
	 * @param array|string: user error array
	 */
	public function dieUsageMsg(  $error ) {
		$parsed = $this->parseMsg( (array)$error );
		$this->dieUsage( $parsed['info'], $parsed['code'], 400 );
	}

	public function execute() {
		$params = $this->extractRequestParams();
		$rev = Revision::newFromID( $params['revid'] );

		if ( !$rev ) {
			$this->dieUsageMsg( array( 'nosuchrevid', $params['revid'] ) );
		}

		$title = $rev->getTitle();
		if ( !$title || !$title->inNamespace( NS_CAMPAIGN ) ) {
			$this->dieUsageMsg( array( 'invalidtitle', $title ) );
		}

		$content = $rev->getContent();
		if ( !$content ) {
			$this->dieUsageMsg( array( 'nosuchrevid', $params['revid'] ) );
		}

		// We use the revision ID for lookup; the 'title' parameter is
		// optional. If present, it is used to assert that the specified
		// revision ID is indeed a revision of a page with the specified
		// title. (Bug 46174)
		if ( $params['title']  && !$title->equals( Title::newFromText( $params['title'], NS_CAMPAIGN ) ) ) {
			$this->dieUsageMsg( array( 'revwrongpage', $params['revid'], $params['title'] ) );
		}

		$this->markCacheable();
		$schema = $content->getJsonData( true );

		$result = $this->getResult();
		$result->addValue( null, 'title', $title->getText() );
		foreach( $schema as $k => &$v ) {
			$result->addValue( null, $k, $v );
		}
	}
}
