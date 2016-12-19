/*!
 * Grunt file
 */

/* eslint-env node */

module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-eslint' );
	grunt.loadNpmTasks( 'grunt-jsonlint' );
	grunt.loadNpmTasks( 'grunt-stylelint' );

	grunt.initConfig( {
		eslint: {
			options: {
				fix: true
			},
			all: [
				'*.js',
				'{resources,docs,tests}/**/*.js',
				// TODO: Move to a /lib folder
				'!resources/jquery/jquery.lazyload.js'
			]
		},
		stylelint: {
			options: {
				syntax: 'less'
			},
			all: 'resources/{**/,}*.{css,less}'
		},
		banana: {
			all: 'i18n/'
		},
		watch: {
			files: [
				'.{stylelintrc,eslintrc.json}',
				'<%= eslint.all %>',
				'<%= stylelint.all %>'
			],
			tasks: 'test'
		},
		jsonlint: {
			all: [
				'**/*.json',
				'!node_modules/**'
			]
		}
	} );

	grunt.registerTask( 'test', [ 'eslint', 'stylelint', 'jsonlint', 'banana' ] );
	grunt.registerTask( 'default', 'test' );
};
