'use strict';

const { defineConfig, globalIgnores } = require( 'eslint/config' );
const wikimedia = require( 'eslint-config-wikimedia/flat' );

// Code which runs in MediaWiki, also used by tests (was resources/.eslintrc.json)
const resourcesConfig = [
	...wikimedia( 'client', 'jquery', 'mediawiki' ),
	{
		languageOptions: {
			globals: {
				wikibase: 'readonly'
			}
		},
		rules: {
			'max-len': 'off',
			'jsdoc/no-undefined-types': [
				'warn',
				{
					definedTypes: [
						'datamodel.Statement',
						'datamodel.StatementList',
						'dataValues.DataValue',
						'uw',
						'uw.CategorySuggestionProvider',
						'uw.ConcurrentQueue',
						'uw.controller.Step',
						'uw.DetailsWidget',
						'uw.FieldLayout',
						'uw.PatentDialog',
						'uw.UlsWidget',
						'uw.ui.Step',
						'uw.ValidatableElement',
						'uw.ValidationStatus'
					]
				}
			],
			'no-shadow': 'warn',
			'no-jquery/no-done-fail': 'warn'
		},
		settings: {
			jsdoc: {
				preferredTypes: {
					StatementWidget: 'StatementWidget',
					wikibaseDatamodel: 'wikibaseDatamodel'
				}
			}
		}
	}
];

// Directories with their own config, which other configs don't apply to.
// These were directories with `"root": true` in .eslintrc.json.
const rootDirs = {
	resources: [ 'resources/**' ],
	tests: [ 'tests/qunit/**' ]
};

module.exports = defineConfig( [
	globalIgnores( [
		// Build
		'vendor/',
		'docs/',

		// Language files written automatically by TranslateWiki
		'**/i18n/**/*.json',
		'!**/i18n/**/en.json',
		'!**/i18n/**/qqq.json'
	] ),

	// Gruntfile.js, etc.
	{
		ignores: Object.values( rootDirs ).flat(),
		extends: [ wikimedia( 'server' ) ]
	},

	// Code which runs in MediaWiki
	{
		files: rootDirs.resources,
		extends: resourcesConfig
	},

	// QUnit tests
	{
		files: rootDirs.tests,
		extends: [ resourcesConfig, wikimedia( 'mediawiki/qunit' ) ],
		rules: {
			'qunit/no-loose-assertions': 'warn',
			'no-jquery/no-done-fail': 'warn'
		}
	}
] );
