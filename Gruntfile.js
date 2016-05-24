/*!
 * Grunt file
 */

/*jshint node:true */
module.exports = function ( grunt ) {
	grunt.loadNpmTasks( 'grunt-contrib-jshint' );
	grunt.loadNpmTasks( 'grunt-contrib-watch' );
	grunt.loadNpmTasks( 'grunt-jsonlint' );
	grunt.loadNpmTasks( 'grunt-banana-checker' );
	grunt.loadNpmTasks( 'grunt-jscs' );
	grunt.loadNpmTasks( 'grunt-stylelint' );

	grunt.initConfig( {
		jshint: {
			options: {
				jshintrc: true
			},
			all: [
				'*.js',
				'{resources,docs,tests}/**/*.js'
			]
		},
		jscs: {
			src: '<%= jshint.all %>'
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
				'.{stylelintrc,jscsrc,jshintignore,jshintrc}',
				'<%= jshint.all %>',
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

	grunt.registerTask( 'test', [ 'jshint', 'jscs', 'stylelint', 'jsonlint', 'banana' ] );
	grunt.registerTask( 'default', 'test' );
};
