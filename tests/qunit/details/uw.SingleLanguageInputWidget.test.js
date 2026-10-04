QUnit.module( 'mw.uploadWizard.SingleLanguageInputWidget', QUnit.newMwEnvironment( {
	beforeEach() {
		this.originalUploadWizardConfig = mw.UploadWizard.config;
		mw.UploadWizard.config = {
			uwLanguages: { de: 'Deutsch', en: 'English', tl: 'Tagalog' },
			languageTemplateFixups: { tl: 'tgl' }
		};
	},
	afterEach() {
		mw.UploadWizard.config = this.originalUploadWizardConfig;
	}
} ) );

QUnit.test.each( 'getWikiText', {
	'language with a template': [ 'de', 'Ein Test', '{{de|1=Ein Test}}' ],
	'language with a fixed up template': [ 'tl', 'Test', '{{tgl|1=Test}}' ],
	// T440003: e.g. captions in Wali, which has no language template
	'language without a template': [ 'wlx', 'A test', '{{Description|text_lang=wlx|text=A test}}' ],
	'escaped text': [ 'wlx', 'a | b', '{{Description|text_lang=wlx|text=a {{!}} b}}' ],
	'no text': [ 'de', '', '' ]
}, ( assert, [ language, text, expected ] ) => {
	const widget = {
		getLanguage: () => language,
		getText: () => text
	};
	assert.strictEqual(
		mw.uploadWizard.SingleLanguageInputWidget.prototype.getWikiText.call( widget ),
		expected
	);
} );

QUnit.test.each( 'getDefaultLanguage', {
	'user language': [ { en: 'English', yue: '粵語' }, null, 'en' ],
	'frequent language of the ULS (T430150)': [ { ab: 'Аҧсшәа', de: 'Deutsch', yue: '粵語' }, [ 'en', 'yue', 'de' ], 'yue' ],
	'English without frequent languages': [ { ab: 'Аҧсшәа', en: 'English' }, [ 'fr' ], 'en' ],
	'first language without the ULS': [ { ab: 'Аҧсшәа', de: 'Deutsch', yue: '粵語' }, null, 'ab' ]
}, function ( assert, [ languages, frequentLanguages, expected ] ) {
	mw.config.set( { wgUserLanguage: 'en', wgContentLanguage: 'en' } );
	this.sandbox.stub( mw.loader, 'getState' ).withArgs( 'ext.uls.mediawiki' ).returns( frequentLanguages ? 'ready' : null );
	const originalUls = mw.uls;
	mw.uls = { getFrequentLanguageList: () => frequentLanguages };
	const widget = {
		config: { languages },
		getClosestAllowedLanguage: mw.uploadWizard.SingleLanguageInputWidget.prototype.getClosestAllowedLanguage
	};
	try {
		assert.strictEqual(
			mw.uploadWizard.SingleLanguageInputWidget.prototype.getDefaultLanguage.call( widget ),
			expected
		);
	} finally {
		mw.uls = originalUls;
	}
} );
