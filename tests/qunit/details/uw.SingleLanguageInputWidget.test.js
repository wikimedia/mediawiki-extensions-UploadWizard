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
