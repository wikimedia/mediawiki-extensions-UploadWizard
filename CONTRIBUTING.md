# Contributing to UploadWizard

> **Note:** This document is incomplete. Contributions to extend it are welcome.

## Structured data in local development

UploadWizard can store captions and statements as structured data
(MediaInfo entities, as on Wikimedia Commons). This needs a local Wikibase
setup with WikibaseMediaInfo.

### Extensions

WikibaseMediaInfo has a hard dependency chain on the search extensions, so all
of the following must be installed and loaded (in this order):

```php
wfLoadExtension( 'UniversalLanguageSelector' );
wfLoadExtension( 'WikibaseRepository', "$IP/extensions/Wikibase/extension-repo.json" );
wfLoadExtension( 'WikibaseClient', "$IP/extensions/Wikibase/extension-client.json" );
wfLoadExtension( 'Elastica' );
wfLoadExtension( 'CirrusSearch' );
wfLoadExtension( 'WikibaseCirrusSearch' );
wfLoadExtension( 'WikibaseMediaInfo' );
```

Run `composer install --no-dev` in `extensions/Elastica` (and in other
extensions which ship a `composer.json`, if they complain about missing
libraries). Then run `php maintenance/run.php update`.

An Elasticsearch/OpenSearch server is **not** required: as long as
`$wgSearchType` is not set to `CirrusSearch`, MediaWiki keeps using the default
database search, and CirrusSearch is only loaded to satisfy the dependency.

### Configuration

On Wikimedia Commons, properties and items come from Wikidata. To reuse the
same IDs locally (so that the defaults in `UploadWizard.config.php` work
without changes), they are imported from Wikidata (see below). Add to
`LocalSettings.php`:

```php
// Enable structured data in UploadWizard
$wgUploadWizardConfig['wikibase']['enabled'] = true;
$wgMediaInfoProperties = [
	'depicts' => 'P180',
];
// Search values of "depicts" and other item statements on Wikidata
$wgMediaInfoExternalEntitySearchBaseUri = 'https://www.wikidata.org/w/api.php';

// Use Wikidata's concept URIs for local entities (as on Commons): units of
// quantities must use the local concept base URI, globes the Wikidata one
$wgWBRepoSettings['entitySources'] = [
	'local' => [
		'entityNamespaces' => [ 'item' => 120, 'property' => 122, 'mediainfo' => '6/mediainfo' ],
		'repoDatabase' => false,
		'baseUri' => 'http://www.wikidata.org/entity/',
		'rdfNodeNamespacePrefix' => 'wd',
		'rdfPredicateNamespacePrefix' => '',
		'interwikiPrefix' => '',
	],
];
```

### Importing properties and items from Wikidata

Import the properties and items referenced by UploadWizard (the IDs in
`wikibase`, `licenses` and `sourceStringToWikidataIdMapping` of
`UploadWizard.config.php`) and by `$wgMediaInfoProperties` from Wikidata,
keeping their IDs, using the maintenance script of WikibaseMediaInfo:

```sh
php maintenance/run.php ./extensions/WikibaseMediaInfo/maintenance/importWikidataEntities.php --ids P31,P137,P170,P275,P459,P571,P973,P1104,P1163,P1259,P1344,P2047,P2048,P2049,P2093,P2151,P2699,P3575,P4092,P4174,P6216,P6757,P6789,P6790,P7482,P7787,P9149,Q2,Q8799,Q11574,Q28390,Q125191,Q174789,Q355198,Q13414952,Q50423863,Q66458942,Q74228490,Q88088423,Q6938433,Q14946043,Q14947546,Q18195572,Q18199165,Q18810333,Q19068220,Q19113751,Q19125117,Q20007257,Q42716613,Q63340742,Q80837139,Q80837607,Q86239559,Q86239991,Q86240624,Q86241082,Q99459365,Q355,Q95,Q209330,Q255381,Q866,Q1520122,Q1136,Q3482689,Q263465,Q225613,Q48938223,Q3884,Q17459
```

Only the labels, descriptions and aliases (in `mul`, `en` and the content
language, see `--languages`) and the data types of properties are imported.
Add further items to use as statement values to `--ids`, e.g. `Q1735` for
"depicts: Innsbruck". Running the script again updates the entities.

Note that the import does not bump the local entity ID counters, so entities
created later via `Special:NewProperty` or `Special:NewItem` may collide with
imported IDs.

After uploading a file, its file page shows a "Structured data" tab with the
captions and statements stored by UploadWizard.

### Troubleshooting

* `Class "CirrusSearch\Query\SimpleKeywordFeature" not found`: WikibaseCirrusSearch
  is loaded without CirrusSearch. Install and load CirrusSearch.
* `ExtensionDependencyError: CirrusSearch requires Elastica to be installed`:
  install and load Elastica, and run `composer install --no-dev` in its
  directory.
* `[[Item:Q1735|Q1735]] not found` when adding a statement: the item does not
  exist locally. Searching Wikidata via
  `$wgMediaInfoExternalEntitySearchBaseUri` does not import items, so import
  each item to be used as a value (see above).
* UploadWizard reports "something went wrong submitting some of the
  supplementary data": the structured data could not be saved. Find the
  `wbeditentity` request in the network tab of the browser's developer tools
  to see the actual error.
* `wbeditentity` fails with `wikibase-validator-not-allowed` for a unit
  (e.g. `http://www.wikidata.org/entity/Q8799`), or with
  `wikibase-validator-bad-prefix` for a globe (e.g.
  `http://localhost:8000/entity/Q2`): units have to begin with the concept base
  URI of the local repository, globes with `http://www.wikidata.org/entity/`.
  Configure the `baseUri` of the local entity source to be
  `http://www.wikidata.org/entity/` (see above), and do not override
  `$wgUploadWizardConfig['wikibase']['entityUri']`.
* Configuration changes have no effect: UploadWizard's configuration is
  embedded in the page, so reload `Special:UploadWizard` and start a new
  upload.

### Further documentation

* [Extension:WikibaseMediaInfo](https://www.mediawiki.org/wiki/Extension:WikibaseMediaInfo)
* [WikibaseMediaInfo README.md](https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/extensions/WikibaseMediaInfo/+/refs/heads/master/README.md)
* [Wikibase/Installation](https://www.mediawiki.org/wiki/Wikibase/Installation)
* [Extension:Elastica](https://www.mediawiki.org/wiki/Extension:Elastica)
* [Extension:CirrusSearch](https://www.mediawiki.org/wiki/Extension:CirrusSearch)
* [Extension:WikibaseCirrusSearch](https://www.mediawiki.org/wiki/Extension:WikibaseCirrusSearch)
* [Extension:UniversalLanguageSelector](https://www.mediawiki.org/wiki/Extension:UniversalLanguageSelector)
