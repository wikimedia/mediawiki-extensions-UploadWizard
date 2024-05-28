<?php

namespace MediaWiki\Extension\UploadWizard;

use ApiBase;
use ApiMain;
use LocalRepo;
use MediaWiki\Http\HttpRequestFactory;
use MWHttpRequest;
use RepoGroup;
use UploadStashFile;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IReadableDatabase;

/**
 * @file
 * @ingroup Upload
 * @ingroup API
 *
 * @license GPL-2.0-or-later
 */
class ApiMediaDetection extends ApiBase {
	private const MIN_IMAGE_DIMENSIONS = 224;
	private const MEDIA_DETECTION_URL =
		'https://inference-staging.svc.codfw.wmnet:30443/v1/models/logo-detection:predict';
	private const MEDIA_DETECTION_HOST_HEADER = 'logo-detection.experimental.wikimedia.org';
	private IReadableDatabase $dbr;
	private LocalRepo $localRepo;
	private HttpRequestFactory $httpRequestFactory;

	public function __construct(
		ApiMain $main,
		string $action,
		IConnectionProvider $dbProvider,
		RepoGroup $repoGroup,
		HttpRequestFactory $httpRequestFactory
	) {
		parent::__construct( $main, $action );

		$this->dbr = $dbProvider->getReplicaDatabase();
		$this->localRepo = $repoGroup->getLocalRepo();
		$this->httpRequestFactory = $httpRequestFactory;
	}

	/**
	 * @return void
	 * @throws \ApiUsageException
	 */
	public function execute() {
		$params = $this->extractRequestParams();

		$stashFile = $this->getUploadStashFile( $params['filekey'] );
		$thumbRequest = $this->requestThumbnail(
			$stashFile
		);
		$predictionsRequest = $this->requestPredictions(
			$params['filekey'],
			base64_encode( $thumbRequest->getContent() )
		);
		$predictions = json_decode( $predictionsRequest->getContent(), true );

		if ( isset( $predictions['predictions'] ) ) {
			$this->getResult()->addValue( null, 'predictions', $predictions['predictions'] );
		}
	}

	/**
	 * @param string $fileKey
	 * @return UploadStashFile
	 * @throws \ApiUsageException
	 */
	private function getUploadStashFile( string $fileKey ): UploadStashFile {
		$filePath = $this->dbr->selectField(
			'uploadstash',
			'us_path',
			[ 'us_key' => $fileKey ],
			__METHOD__,
		);
		if ( $filePath === false ) {
			$this->dieWithError( 'apierror-mediadetection-no-valid-thumbnail' );
		}

		$stashFile = new UploadStashFile( $this->localRepo, $filePath, $fileKey );
		if (
			!$stashFile->exists() ||
			$stashFile->getWidth() === 0 ||
			$stashFile->getHeight() === 0 ||
			!$stashFile->getRepo()->getThumbProxyUrl()
		) {
			$this->dieWithError( 'apierror-mediadetection-no-valid-thumbnail' );
		}
		// @todo are there other mime types we should allow?
		if (
			!in_array(
				$stashFile->getMimeType(), [ 'image/gif', 'image/jpeg', 'image/png', 'image/bmp' ]
			)
		) {
			$this->dieWithError(
				'apierror-mediadetection-invalid-mime-type',
			);
		}

		return $stashFile;
	}

	private function requestThumbnail( UploadStashFile $file ): MWHttpRequest {
		// we want a thumbnail that has a minimum size in both dimensions,
		// but thumbs are only generated based on width, so we'll calculate
		// the required width to make sure our height also matches the minimum
		$aspectRatio = $file->getWidth() / $file->getHeight();
		$width =
			$aspectRatio >= 1 ?
				self::MIN_IMAGE_DIMENSIONS :
				self::MIN_IMAGE_DIMENSIONS / $aspectRatio;

		// build url to thumbnail
		$thumbProxyUrl = $file->getRepo()->getThumbProxyUrl();
		$scalerThumbName = $file->generateThumbName( $file->getName(), [ 'width' => $width ] );
		$scalerThumbUrl = $thumbProxyUrl . 'temp/' . $file->getUrlRel() . '/' . rawurlencode( $scalerThumbName );

		// request thumbnail from scaler
		$request = $this->httpRequestFactory->create(
			$scalerThumbUrl,
			[ 'method' => 'GET', 'timeout' => 5 ],
			__METHOD__
		);
		$request->setHeader( 'X-Swift-Secret', $file->getRepo()->getThumbProxySecret() );
		$status = $request->execute();
		if ( !$status->isOK() ) {
			$this->dieStatus( $status );
		}

		return $request;
	}

	private function requestPredictions( string $fileName, string $base64Thumb ): MWHttpRequest {
		$body = json_encode( [
			'instances' => [
				[
					'filename' => $fileName,
					'image' => $base64Thumb,
					'target' => 'logo'
				]
			]
		] );
		$request = $this->httpRequestFactory->create(
			self::MEDIA_DETECTION_URL,
			[ 'method' => 'POST', 'postData' => $body, 'timeout' => 15 ], // @todo timeout?
			__METHOD__
		);
		$request->setHeader( 'Host', self::MEDIA_DETECTION_HOST_HEADER );
		$request->setHeader( 'User-Agent', 'Wikimedia Commons Upload Wizard' ); // @todo add '(contact e-mail)'
		$request->setHeader( 'Content-Type', 'application/json; charset=utf-8' );
		$request->setHeader( 'Content-Length', strval( strlen( $body ) ) );
		$status = $request->execute();
		if ( !$status->isOK() ) {
			$this->dieStatus( $status );
		}

		return $request;
	}

	public function getAllowedParams(): array {
		return [
			'filekey' => [
				ParamValidator::PARAM_TYPE => 'string',
			],
		];
	}

	protected function getExamplesMessages(): array {
		return [
			'action=mediadetection&filekey=1ax8vy7ctc3k.op1rqo.3.jpg' => 'apihelp-mediadetection-example',
		];
	}
}
