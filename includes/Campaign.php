<?php

namespace MediaWiki\Extension\UploadWizard;

use InvalidArgumentException;
use MediaWiki\Category\Category;
use MediaWiki\Context\RequestContext;
use MediaWiki\Language\Language;
use MediaWiki\MediaWikiServices;
use MediaWiki\Parser\Parser;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Title\Title;
use Wikimedia\ObjectCache\WANObjectCache;
use Wikimedia\Rdbms\Database;
use Wikimedia\Rdbms\SelectQueryBuilder;

/**
 * Class that represents a single upload campaign.
 * An upload campaign is stored as a row in the uw_campaigns table,
 * and its configuration is stored in the Campaign: namespace
 *
 * This class is 'readonly' - to modify the campaigns, please
 * edit the appropriate Campaign: namespace page
 *
 * @file
 * @ingroup Upload
 *
 * @since 1.2
 *
 * @license GPL-2.0-or-later
 * @author Yuvi Panda <yuvipanda@gmail.com>
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class Campaign {

	/**
	 * The campaign configuration.
	 *
	 * @since 1.2
	 * @var array
	 */
	protected $config = [];

	/**
	 * The campaign configuration, after wikitext properties have been parsed.
	 *
	 * @since 1.2
	 * @var array|null
	 */
	protected $parsedConfig = null;

	/**
	 * Array of templates used in this campaign.
	 * Each item is an array with ( namespace, template_title )
	 * Stored without deduplication
	 *
	 * @since 1.2
	 * @var array
	 */
	protected $templates = [];

	/**
	 * The Title representing the current campaign
	 *
	 * @since 1.4
	 * @var Title|null
	 */
	protected $title = null;

	/**
	 * The RequestContext to use for operations performed from this object
	 *
	 * @since 1.4
	 * @var RequestContext|null
	 */
	protected $context = null;

	/** @var WANObjectCache */
	private $wanObjectCache;

	/** @var \Wikimedia\Rdbms\IReadableDatabase */
	private $dbr;

	/** @var Parser */
	private $parser;

	/** @var \MediaWiki\Interwiki\InterwikiLookup */
	private $interwikiLookup;

	/**
	 * @param string $name
	 * @return Campaign|false
	 */
	public static function newFromName( $name ) {
		$campaignTitle = Title::makeTitleSafe( NS_CAMPAIGN, $name );
		if ( $campaignTitle === null || !$campaignTitle->exists() ) {
			return false;
		}

		return new Campaign( $campaignTitle );
	}

	/**
	 * @param Title $title
	 * @param array|null $config
	 * @param RequestContext|null $context
	 */
	public function __construct( $title, $config = null, $context = null ) {
		$services = MediaWikiServices::getInstance();
		$this->wanObjectCache = $services->getMainWANObjectCache();
		$this->dbr = $services->getDBLoadBalancerFactory()->getReplicaDatabase();
		$this->parser = $services->getParser();
		$this->interwikiLookup = $services->getInterwikiLookup();
		$wikiPageFactory = $services->getWikiPageFactory();

		$this->title = $title;
		if ( $config === null ) {
			$content = $wikiPageFactory->newFromTitle( $title )->getContent();
			if ( !$content instanceof CampaignContent ) {
				throw new InvalidArgumentException( 'Wrong content model' );
			}
			$this->config = $content->getJsonData();
		} else {
			$this->config = $config;
		}
		if ( $context === null ) {
			$this->context = RequestContext::getMain();
		} else {
			$this->context = $context;
		}
	}

	/**
	 * Returns true if current campaign is enabled
	 *
	 * @since 1.4
	 *
	 * @return bool
	 */
	public function getIsEnabled() {
		return $this->config !== null && $this->config['enabled'];
	}

	/**
	 * Returns name of current campaign
	 *
	 * @since 1.4
	 *
	 * @return string
	 */
	public function getName() {
		return $this->title->getDBkey();
	}

	/**
	 * @return Title
	 */
	public function getTitle() {
		return $this->title;
	}

	/**
	 * @return Title|null
	 */
	public function getTrackingCategory() {
		$trackingCats = Config::getSetting( 'trackingCategory' );
		return Title::makeTitleSafe(
			NS_CATEGORY, str_replace( '$1', $this->getName(), $trackingCats['campaign'] )
		);
	}

	/**
	 * @return int
	 */
	public function getUploadedMediaCount() {
		return Category::newFromTitle( $this->getTrackingCategory() )->getFileCount();
	}

	/**
	 * @return int
	 */
	public function getTotalContributorsCount() {
		$dbr = $this->dbr;
		$fname = __METHOD__;

		return $this->wanObjectCache->getWithSetCallback(
			$this->wanObjectCache->makeKey( 'uploadwizard-campaign-contributors-count', $this->getName() ),
			Config::getSetting( 'campaignStatsMaxAge' ),
			function ( $oldValue, &$ttl, array &$setOpts ) use ( $fname, $dbr ) {
				$setOpts += Database::getCacheSetOptions( $dbr );

				return $dbr->newSelectQueryBuilder()
					->select( [ 'count' => 'COUNT(DISTINCT img_actor)' ] )
					->from( 'categorylinks' )
					->join( 'page', null, 'cl_from=page_id' )
					->join( 'image', null, 'page_title=img_name' )
					->where( [ 'cl_to' => $this->getTrackingCategory()->getDBkey(), 'cl_type' => 'file' ] )
					->caller( $fname )
					->useIndex( [ 'categorylinks' => 'cl_timestamp' ] )
					->fetchField();
			}
		);
	}

	/**
	 * @param int $limit
	 *
	 * @return Title[]
	 */
	public function getUploadedMedia( $limit = 24 ) {
		$result = $this->dbr->newSelectQueryBuilder()
			->select( [ 'cl_from', 'page_namespace', 'page_title' ] )
			->from( 'categorylinks' )
			->join( 'page', null, 'cl_from=page_id' )
			->where( [ 'cl_to' => $this->getTrackingCategory()->getDBkey(), 'cl_type' => 'file' ] )
			->orderBy( 'cl_timestamp', SelectQueryBuilder::SORT_DESC )
			->limit( $limit )
			->useIndex( [ 'categorylinks' => 'cl_timestamp' ] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$images = [];
		foreach ( $result as $row ) {
			$images[] = Title::makeTitle( $row->page_namespace, $row->page_title );
		}

		return $images;
	}

	/**
	 * Returns all set config properties.
	 * Property name => property value
	 *
	 * @since 1.2
	 *
	 * @return array
	 */
	public function getRawConfig() {
		return $this->config;
	}

	/**
	 * Update internal list of templates used in parsing this campaign
	 *
	 * @param ParserOutput $parserOutput
	 */
	private function updateTemplates( ParserOutput $parserOutput ) {
		$templateIds = $parserOutput->getTemplateIds();
		foreach ( $parserOutput->getTemplates() as $ns => $templates ) {
			foreach ( $templates as $dbk => $id ) {
				$this->templates[$ns][$dbk] = [ $id, $templateIds[$ns][$dbk] ];
			}
		}
	}

	/**
	 * Wrapper around OutputPage::parseInline
	 *
	 * @param string $value Wikitext to parse
	 * @param Language $lang
	 *
	 * @since 1.3
	 *
	 * @return string HTML
	 */
	private function parseValue( $value, Language $lang ) {
		$parserOptions = ParserOptions::newFromContext( $this->context );
		$parserOptions->setInterfaceMessage( true );
		$parserOptions->setUserLang( $lang );
		$parserOptions->setTargetLanguage( $lang );

		$output = $this->parser->parse(
			$value, $this->getTitle(), $parserOptions
		);
		$processedOutput = $output->runOutputPipeline( $parserOptions, [
			'enableSectionEditLinks' => false,
		] );

		$this->updateTemplates( $processedOutput );

		return Parser::stripOuterParagraph( $processedOutput->getContentHolderText() );
	}

	/**
	 * Parses the values in an assoc array as wikitext
	 *
	 * @param array $array
	 * @param Language $lang
	 * @param array|null $forKeys Array of keys whose values should be parsed
	 *
	 * @since 1.3
	 *
	 * @return array
	 */
	private function parseArrayValues( $array, Language $lang, $forKeys = null ) {
		$parsed = [];
		foreach ( $array as $key => $value ) {
			if ( $forKeys !== null ) {
				if ( in_array( $key, $forKeys ) ) {
					if ( is_array( $value ) ) {
						$parsed[$key] = $this->parseArrayValues( $value, $lang );
					} else {
						$parsed[$key] = $this->parseValue( $value, $lang );
					}
				} else {
					$parsed[$key] = $value;
				}
			} elseif ( is_array( $value ) ) {
				$parsed[$key] = $this->parseArrayValues( $value, $lang );
			} else {
				$parsed[$key] = $this->parseValue( $value, $lang );
			}
		}
		return $parsed;
	}

	/**
	 * Returns all config parameters, after parsing the wikitext based ones
	 *
	 * @since 1.3
	 *
	 * @param Language|null $lang
	 * @return array
	 */
	public function getParsedConfig( ?Language $lang = null ) {
		if ( $lang === null ) {
			$lang = $this->context->getLanguage();
		}

		// We check if the parsed config for this campaign is cached. If it is available in cache,
		// we then check to make sure that it is the latest version - by verifying that its
		// timestamp is greater than or equal to the timestamp of the last time an invalidate was
		// issued.
		$memKey = $this->wanObjectCache->makeKey(
			'uploadwizard-campaign',
			$this->getName(),
			'parsed-config',
			$lang->getCode()
		);
		$depKeys = [ $this->makeInvalidateTimestampKey( $this->wanObjectCache ) ];

		$curTTL = null;
		$memValue = $this->wanObjectCache->get( $memKey, $curTTL, $depKeys );
		if ( is_array( $memValue ) && $curTTL > 0 ) {
			$this->parsedConfig = $memValue['config'];
		}

		if ( $this->parsedConfig === null ) {
			$parsedConfig = [];
			foreach ( $this->config as $key => $value ) {
				switch ( $key ) {
					case "title":
					case "description":
						$parsedConfig[$key] = $this->parseValue( $value, $lang );
						break;
					case "display":
						foreach ( $value as $option => $optionValue ) {
							if ( is_array( $optionValue ) ) {
								$parsedConfig['display'][$option] = $this->parseArrayValues(
									$optionValue,
									$lang,
									[ 'label' ]
								);
							} else {
								$parsedConfig['display'][$option] = $this->parseValue( $optionValue, $lang );
							}
						}
						break;
					case "fields":
						$parsedConfig['fields'] = [];
						foreach ( $value as $field ) {
							$parsedConfig['fields'][] = $this->parseArrayValues(
								$field,
								$lang,
								[ 'label', 'options' ]
							);
						}
						break;
					case "whileActive":
					case "afterActive":
					case "beforeActive":
						if ( array_key_exists( 'display', $value ) ) {
							$value['display'] = $this->parseArrayValues( $value['display'], $lang );
						}
						$parsedConfig[$key] = $value;
						break;
					default:
						$parsedConfig[$key] = $value;
						break;
				}
			}

			$this->parsedConfig = $parsedConfig;

			$this->wanObjectCache->set( $memKey, [ 'timestamp' => time(), 'config' => $parsedConfig ] );
		}

		$uwDefaults = Config::getSetting( 'defaults' );
		if ( array_key_exists( 'objref', $uwDefaults ) ) {
			$this->applyObjectReferenceToButtons( $uwDefaults['objref'] );
		}
		$this->modifyIfNecessary();

		return $this->parsedConfig;
	}

	/**
	 * Modifies the parsed config if there are time-based modifiers that are active.
	 */
	protected function modifyIfNecessary() {
		foreach ( $this->parsedConfig as $cnf => $modifiers ) {
			if ( $cnf === 'whileActive' && $this->isActive() ) {
				$activeModifiers = $modifiers;
			} elseif ( $cnf === 'afterActive' && $this->wasActive() ) {
				$activeModifiers = $modifiers;
			} elseif ( $cnf === 'beforeActive' ) {
				$activeModifiers = $modifiers;
			}
		}

		if ( isset( $activeModifiers ) ) {
			foreach ( $activeModifiers as $cnf => $modifier ) {
				switch ( $cnf ) {
					case "autoAdd":
					case "display":
						if ( !array_key_exists( $cnf, $this->parsedConfig ) ) {
							$this->parsedConfig[$cnf] = [];
						}

						$this->parsedConfig[$cnf] = array_merge( $this->parsedConfig[$cnf], $modifier );
						break;
				}
			}
		}
	}

	/**
	 * Returns the templates used in this Campaign's config
	 *
	 * @return array [ns => [ dbk => [page_id, rev_id ] ] ]
	 */
	public function getTemplates() {
		if ( $this->parsedConfig === null ) {
			$this->getParsedConfig();
		}
		return $this->templates;
	}

	/**
	 * Invalidate the cache for this campaign, in all languages
	 *
	 * Does so by simply writing a new invalidate timestamp to memcached.
	 * Since this invalidate timestamp is checked on every read, the cached entries
	 * for the campaign will be regenerated the next time there is a read.
	 */
	public function invalidateCache() {
		$this->wanObjectCache->touchCheckKey( $this->makeInvalidateTimestampKey( $this->wanObjectCache ) );
	}

	/**
	 * Returns key used to store the last time the cache for a particular campaign was invalidated
	 *
	 * @param WANObjectCache $cache
	 * @return string
	 */
	private function makeInvalidateTimestampKey( WANObjectCache $cache ) {
		return $cache->makeKey(
			'uploadwizard-campaign',
			$this->getName(),
			'parsed-config',
			'invalidate-timestamp'
		);
	}

	/**
	 * Checks the current date against the configured start and end dates to determine
	 * whether the campaign is currently active.
	 *
	 * @return bool
	 */
	private function isActive() {
		$now = time();
		$start = array_key_exists(
			'start', $this->parsedConfig
		) ? strtotime( $this->parsedConfig['start'] ) : null;
		$end = array_key_exists(
			'end', $this->parsedConfig
		) ? strtotime( $this->parsedConfig['end'] ) : null;

		return ( $start === null || $start <= $now ) && ( $end === null || $end > $now );
	}

	/**
	 * Checks the current date against the configured start and end dates to determine
	 * whether the campaign was active in the past (and is not anymore)
	 *
	 * @return bool
	 */
	private function wasActive() {
		$now = time();
		$start = array_key_exists(
			'start', $this->parsedConfig
		) ? strtotime( $this->parsedConfig['start'] ) : null;

		return ( $start === null || $start <= $now ) && !$this->isActive();
	}

	/**
	 * Generate the URL out of the object reference
	 *
	 * @param string $objRef
	 * @return bool|string
	 */
	private function getButtonHrefByObjectReference( $objRef ) {
		$arrObjRef = explode( '|', $objRef );
		if ( count( $arrObjRef ) > 1 ) {
			[ $wiki, $title ] = $arrObjRef;
			if ( $this->interwikiLookup->isValidInterwiki( $wiki ) ) {
				return str_replace( '$1', $title, $this->interwikiLookup->fetch( $wiki )->getURL() );
			}
		}
		return false;
	}

	/**
	 * Apply given object reference to buttons configured to use it as href
	 *
	 * @param string $objRef
	 */
	private function applyObjectReferenceToButtons( $objRef ) {
		$customizableButtons = [ 'homeButton', 'beginButton' ];

		foreach ( $customizableButtons as $button ) {
			if ( isset( $this->parsedConfig['display'][$button]['target'] ) &&
				$this->parsedConfig['display'][$button]['target'] === 'useObjref'
			) {
				$validUrl = $this->getButtonHrefByObjectReference( $objRef );
				if ( $validUrl ) {
					$this->parsedConfig['display'][$button]['target'] = $validUrl;
				} else {
					unset( $this->parsedConfig['display'][$button] );
				}
			}
		}
	}
}
