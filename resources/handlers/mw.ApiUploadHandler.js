( function ( mw, uw ) {
	var NS_FILE = mw.config.get( 'wgNamespaceIds' ).file;

	/**
	 * @param {mw.UploadWizardUpload} upload
	 * @param {mw.Api} api
	 */
	mw.ApiUploadHandler = function ( upload, api ) {
		this.upload = upload;
		this.api = api;

		this.ignoreWarnings = [
			// we ignore these warnings, because the title is not our final title.
			'page-exists',
			'exists',
			'exists-normalized',
			'was-deleted',
			'badfilename',
			'bad-prefix'
		];

		this.upload.on( 'remove-upload', this.abort.bind( this ) );
	};

	mw.ApiUploadHandler.prototype.abort = function () {
		throw new Error( 'Not implemented.' );
	};

	/* eslint-disable valid-jsdoc */
	/**
	 * @return {jQuery.Promise}
	 */
	/* eslint-enablevalid-jsdoc */
	mw.ApiUploadHandler.prototype.submit = function () {
		throw new Error( 'Not implemented.' );
	};

	/**
	 * @return {jQuery.Promise}
	 */
	mw.ApiUploadHandler.prototype.start = function () {
		return this.submit().then(
			this.setTransported.bind( this ),
			this.setTransportError.bind( this )
		);
	};

	/**
	 * Process a successful upload.
	 *
	 * @param {object} result
	 */
	mw.ApiUploadHandler.prototype.setTransported = function ( result ) {
		var code;
		if ( result.upload && result.upload.warnings ) {
			for ( code in result.upload.warnings ) {
				if ( !this.isIgnoredWarning( code ) ) {
					this.setTransportWarning( code, result );
					return;
				}
			}
		}

		if ( !result.upload || result.upload.result !== 'Success' ) {
			this.setError( 'unknown', mw.message( 'unknown-error' ).parse() );
			return;
		}

		if ( !result.upload.imageinfo ) {
			this.setError( 'noimageinfo', mw.message( 'api-error-noimageinfo' ).parse() );
			return;
		}

		this.upload.setSuccess( result );
	};

	/**
	 * Process an upload with a warning.
	 *
	 * @param {string} code The API warning code
	 * @param {Object} result The API result in parsed JSON form
	 */
	mw.ApiUploadHandler.prototype.setTransportWarning = function ( code, result ) {
		var param;

		uw.eventFlowLogger.logApiError( 'file', result );

		switch ( code ) {
			case 'duplicate':
				this.setDuplicateError( code, result, result.upload.warnings.duplicate );
				return;
			case 'nochange':
				// This is like 'duplicate', but also the filename is the same, which doesn't matter
				if ( result.upload.warnings.exists ) {
					this.setDuplicateError( code, result, [ result.upload.warnings.exists ] );
				}
				return;
			case 'duplicate-archive':
				this.setDuplicateArchiveError( code, result, result.upload.warnings[ 'duplicate-archive' ] );
				return;
			default:
				param = code;
				if ( typeof result.upload.warnings[ code ] === 'string' ) {
					// tack the original error code onto the warning message
					param += mw.message( 'colon-separator' ).text() + result.upload.warnings[ code ];
				}

				// we have an unknown warning, so let's say what we know
				this.setError( code, mw.message( 'api-error-unknown-warning', param ).parse() );
				return;
		}
	};

	/**
	 * Process an erroneous upload.
	 *
	 * @param {string} code The API error code
	 * @param {Object} result The API result in parsed JSON form
	 */
	mw.ApiUploadHandler.prototype.setTransportError = function ( code, result ) {
		var $extra;

		uw.eventFlowLogger.logApiError( 'file', result );

		if ( code === 'badtoken' ) {
			this.api.badToken( 'csrf' );

			// Try again once
			if ( this.ignoreWarning( code ) ) {
				this.start();
				return;
			}
		}

		if ( code === 'abusefilter-warning' ) {
			$extra = new OO.ui.ButtonWidget( {
				label: mw.message( 'mwe-upwiz-override' ).text(),
				title: mw.message( 'mwe-upwiz-override-upload' ).text(),
				flags: 'progressive',
				framed: false
			} ).on( 'click', function () {
				// No need to ignore the error, AbuseFilter will only return it once
				this.start();
			}.bind( this ) ).$element;
		}

		this.setError( code, result.errors[ 0 ].html, $extra );
	};

	/**
	 * Helper function to generate duplicate errors in a possibly collapsible list.
	 * Works with existing duplicates and deleted dupes.
	 *
	 * @param {string} code Warning code, should have matching strings in .i18n.php
	 * @param {Object} result The API result in parsed JSON form
	 * @param {array} duplicates List of duplicate filenames
	 */
	mw.ApiUploadHandler.prototype.setDuplicateError = function ( code, result, duplicates ) {
		var $ul = $( '<ul>' );

		$.each( duplicates, function ( i, filename ) {
			var href, $a;

			try {
				$a = $( '<a>' ).text( filename );
				href = mw.Title.makeTitle( NS_FILE, filename ).getUrl( {} );
				$a.attr( { href: href, target: '_blank' } );
			} catch ( e ) {
				// For example, if the file was revdeleted
				$a = $( '<em>' )
					.text( mw.msg( 'mwe-upwiz-deleted-duplicate-unknown-filename' ) );
			}
			$ul.append( $( '<li>' ).append( $a ) );
		} );

		if ( duplicates.length > 1 ) {
			$ul.makeCollapsible( { collapsed: true } );
		}

		this.setError( code, mw.message( 'file-exists-duplicate', duplicates.length ).parse(), $ul );
	};

	/**
	 * Helper function to generate duplicate errors in a possibly collapsible list.
	 * Works with existing duplicates and deleted dupes.
	 *
	 * @param {string} code Warning code, should have matching strings in .i18n.php
	 * @param {Object} result The API result in parsed JSON form
	 * @param {string} duplicate Duplicate filename
	 */
	mw.ApiUploadHandler.prototype.setDuplicateArchiveError = function ( code, result, duplicate ) {
		var filename = mw.Title.makeTitle( NS_FILE, duplicate ).getPrefixedText(),
			uploadDuplicate = new OO.ui.ButtonWidget( {
				label: mw.message( 'mwe-upwiz-override' ).text(),
				title: mw.message( 'mwe-upwiz-override-upload' ).text(),
				flags: 'progressive',
				framed: false
			} ).on( 'click', function () {
				// mark this warning as ignored & process the API result again
				this.ignoreWarning( 'duplicate-archive' );
				this.setTransported( result );
			}.bind( this ) );

		this.setError( code, mw.message( 'file-deleted-duplicate', filename ).parse(), uploadDuplicate.$element );
	};

	/**
	 * @param {string} code Error code from API
	 * @param {string} html Error message
	 * @param {jQuery} [$extra]
	 */
	mw.ApiUploadHandler.prototype.setError = function ( code, html, $extra ) {
		this.upload.setError( code, html, $extra );
	};

	/**
	 * Marks a warning to be ignored.
	 *
	 * @param {string} code
	 * @return {boolean}
	 */
	mw.ApiUploadHandler.prototype.ignoreWarning = function ( code ) {
		if ( this.isIgnoredWarning( code ) ) {
			return false;
		}

		// mark the warning as being ignored, then restart the request
		this.ignoreWarnings.push( code );
		return true;
	};

	/**
	 * Returns whether or not the warning is being ignored.
	 *
	 * @param {string} code
	 * @return {boolean}
	 */
	mw.ApiUploadHandler.prototype.isIgnoredWarning = function ( code ) {
		return this.ignoreWarnings.indexOf( code ) > -1;
	};
}( mediaWiki, mediaWiki.uploadWizard ) );
