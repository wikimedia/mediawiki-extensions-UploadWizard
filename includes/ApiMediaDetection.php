<?php

namespace MediaWiki\Extension\UploadWizard;

use ApiBase;
use ApiMain;
use File;
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
 *
 * @experimental
 * @deprecated This is a proof of concept and may be dropped, altered, moved or replaced at any time
 */
class ApiMediaDetection extends ApiBase {
	private const MIN_IMAGE_DIMENSIONS = 224;
	private const MEDIA_DETECTION_URL =
		'http://localhost:6031/v1/models/logo-detection:predict';
	private const MEDIA_DETECTION_HOST_HEADER = 'logo-detection.logo-detection.wikimedia.org';
	// See https://commons.wikimedia.org/wiki/Special:MediaStatistics
	private const VALID_MIME_TYPES = [
		'image/jpeg', 'image/png', 'image/svg+xml',
		'image/tiff', 'image/gif', 'image/webp',
		'image/x-xcf', 'image/vnd.djvu', 'image/bmp',
	];
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

		$this->requireOnlyOneParameter( $params, 'filename', 'filekey' );

		if ( $params['filename'] ) {
			$file = $this->localRepo->newFile( $params['filename'] );
		} else {
			$file = $this->getUploadStashFile( $params['filekey'] );
		}

		if ( !$file instanceof File ) {
			$this->dieWithError( 'apierror-mediadetection-no-valid-thumbnail' );
		}

		if ( !in_array( $file->getMimeType(), self::VALID_MIME_TYPES ) ) {
			$this->dieWithError(
				'apierror-mediadetection-invalid-mime-type',
			);
		}

		$thumbRequest = $this->requestThumbnail( $file );
		$predictionsRequest = $this->requestPredictions(
			$params['filename'] ?? $params['filekey'],
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

		return $stashFile;
	}

	private function requestThumbnail( File $file ): MWHttpRequest {
		// we want a thumbnail that has a minimum size in both dimensions,
		// but thumbs are only generated based on width, so we'll calculate
		// the required width to make sure our height also matches the minimum
		$aspectRatio = $file->getWidth() / $file->getHeight();
		$width =
			$aspectRatio >= 1 ?
				self::MIN_IMAGE_DIMENSIONS :
				self::MIN_IMAGE_DIMENSIONS / $aspectRatio;

		// build url to thumbnail
		$scalerThumbName = $file->generateThumbName( $file->getName(), [ 'width' => ceil( $width ) ] );

		if ( !$file instanceof UploadStashFile ) {
			$scalerThumbUrl = $file->getThumbUrl( $scalerThumbName );
		} else {
			// for UploadStashFile files, getThumbUrl returns a relative link to Special:UploadStash
			// rather than the actual thumb, so we need to build that url manually
			$thumbProxyUrl = $file->getRepo()->getThumbProxyUrl();
			$scalerThumbUrl = $thumbProxyUrl . 'temp/' . $file->getUrlRel() . '/' . rawurlencode( $scalerThumbName );
		}

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
			'filename' => [
				ParamValidator::PARAM_TYPE => 'string',
			],
			'filekey' => [
				ParamValidator::PARAM_TYPE => 'string',
			],
		];
	}

	protected function getExamplesMessages(): array {
		return [
			'action=mediadetection&filename=My_image.jpg' => 'apihelp-mediadetection-example-filename',
			'action=mediadetection&filekey=1ax8vy7ctc3k.op1rqo.3.jpg' => 'apihelp-mediadetection-example-filekey',
		];
	}
}
