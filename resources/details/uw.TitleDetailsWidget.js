( function ( uw ) {

	var NS_FILE = mw.config.get( 'wgNamespaceIds' ).file,
		byteLength = require( 'mediawiki.String' ).byteLength;

	/**
	 * A title field in UploadWizard's "Details" step form.
	 *
	 * @class
	 * @extends uw.DetailsWidget
	 * @param {Object} [config]
	 */
	uw.TitleDetailsWidget = function UWTitleDetailsWidget( config ) {
		config = config || {};
		uw.TitleDetailsWidget.super.call( this );

		this.config = config;
		this.extension = config.extension;
		// We wouldn't want or use any of mw.widgets.TitleInputWidget functionality.
		this.titleInput = new OO.ui.TextInputWidget( {
			classes: [ 'mwe-title', 'mwe-upwiz-titleDetailsWidget-title' ],
			maxLength: config.maxLength
		} );

		// Aggregate 'change' event (with delay)
		this.titleInput.on( 'change', OO.ui.debounce( this.emit.bind( this, 'change' ), 500 ) );

		this.$element.addClass( 'mwe-upwiz-titleDetailsWidget' );
		this.$element.append(
			this.titleInput.$element
		);
	};
	OO.inheritClass( uw.TitleDetailsWidget, uw.DetailsWidget );

	/**
	 * Reliably turn input into a MediaWiki title that is located in the 'File:' namespace.
	 * Also applies file-specific checks ($wgIllegalFileChars).
	 *
	 *     var title = uw.TitleDetailsWidget.static.makeTitleInFileNS( 'filename.ext' );
	 *
	 * @static
	 * @param {string} filename Desired file name; optionally with 'File:' namespace prefixed
	 * @return {mw.Title|null}
	 */
	uw.TitleDetailsWidget.static.makeTitleInFileNS = function ( filename ) {
		var
			mwTitle = mw.Title.newFromText( filename, NS_FILE ),
			illegalFileChars = new RegExp( '[' + mw.config.get( 'wgIllegalFileChars', '' ) + ']' );
		if ( mwTitle && mwTitle.getNamespaceId() !== NS_FILE ) {
			// Force file namespace
			mwTitle = mw.Title.makeTitle( NS_FILE, filename );
		}
		if ( mwTitle && ( illegalFileChars.test( mwTitle.getMainText() ) || mwTitle.fragment !== null ) ) {
			// Consider the title invalid if it contains characters disallowed in file names
			mwTitle = null;
		}
		return mwTitle;
	};

	/**
	 * @inheritdoc
	 */
	uw.TitleDetailsWidget.prototype.pushPending = function () {
		this.titleInput.pushPending();
	};

	/**
	 * @inheritdoc
	 */
	uw.TitleDetailsWidget.prototype.popPending = function () {
		this.titleInput.popPending();
	};

	/**
	 * Get a mw.Title object for current input.
	 *
	 * @return {mw.Title|null}
	 */
	uw.TitleDetailsWidget.prototype.getTitle = function () {
		return this.buildTitleFromInput( this.titleInput.getValue() );
	};

	/**
	 * Get a mw.Title object for a given value.
	 *
	 * @param {string} value
	 * @return {mw.Title}
	 */
	uw.TitleDetailsWidget.prototype.buildTitleFromInput = function ( value ) {
		var extRegex, cleaned, title;
		value = value.trim();
		if ( !value ) {
			return null;
		}
		extRegex = new RegExp( '\\.' + this.extension + '$', 'i' );
		cleaned = value.replace( extRegex, '' ).replace( /\.+$/g, '' ).trim();
		title = uw.TitleDetailsWidget.static.makeTitleInFileNS( cleaned + '.' + this.extension );
		return title;
	};

	/**
	 * @param {string} value
	 * @return {jQuery.Promise}
	 */
	uw.TitleDetailsWidget.prototype.validateTitleInput = function ( value ) {
		var
			errors = [],
			processDestinationCheck = this.processDestinationCheck,
			title = this.buildTitleFromInput( value ),
			// title length is dependent on DB column size and is bytes rather than characters
			length = byteLength( value );

		if ( value === '' ) {
			errors.push( mw.message( 'mwe-upwiz-error-title-blank' ) );
			return $.Deferred().resolve( errors ).promise();
		}

		if ( this.config.minLength && length < this.config.minLength ) {
			errors.push( mw.message( 'mwe-upwiz-error-title-too-short', this.config.minLength ) );
			return $.Deferred().resolve( errors ).promise();
		}

		if ( this.config.maxLength && length > this.config.maxLength ) {
			errors.push( mw.message( 'mwe-upwiz-error-title-too-long', this.config.maxLength ) );
			return $.Deferred().resolve( errors ).promise();
		}

		if ( !title ) {
			errors.push( mw.message( 'mwe-upwiz-error-title-invalid' ) );
			return $.Deferred().resolve( errors ).promise();
		}

		return mw.DestinationChecker.checkTitle( title.getPrefixedText() )
			.then( ( result ) => {
				var moreErrors = processDestinationCheck( result );
				if ( result.blacklist.unavailable ) {
					// We don't have a title blacklist, so just check for some likely undesirable patterns.
					moreErrors = moreErrors.concat(
						mw.QuickTitleChecker.checkTitle( title.getNameText() ).map( ( errorCode ) =>
							// Messages:
							// mwe-upwiz-error-title-invalid, mwe-upwiz-error-title-senselessimagename,
							// mwe-upwiz-error-title-thumbnail, mwe-upwiz-error-title-extension,
							mw.message( 'mwe-upwiz-error-title-' + errorCode )
						)
					);
				}
				return moreErrors;
			} )
			.then( ( moreErrors ) => [].concat( errors, moreErrors ), () => $.Deferred().resolve( errors ) );
	};

	/**
	 * @return {jQuery.Promise}
	 */
	uw.TitleDetailsWidget.prototype.getErrors = function () {
		var value = this.titleInput.getValue().trim();

		return this.validateTitleInput( value );
	};

	/**
	 * Process the result of a destination filename check, return array of mw.Messages objects
	 * representing errors.
	 *
	 * @private
	 * @param {Object} result Result to process, output from mw.DestinationChecker
	 * @return {mw.Message[]} Error messages
	 */
	uw.TitleDetailsWidget.prototype.processDestinationCheck = function ( result ) {
		var messageParams, errors, titleString;

		if ( result.unique.isUnique && result.blacklist.notBlacklisted && !result.unique.isProtected ) {
			return [];
		}

		// Something is wrong with this title.
		errors = [];

		try {
			titleString = result.unique.title || result.title;
			titleString = uw.TitleDetailsWidget.static.makeTitleInFileNS( titleString ).getPrefixedText();
		} catch ( e ) {
			// Unparseable result? This shouldn't happen, we checked for that earlier...
			errors.push( mw.message( 'mwe-upwiz-error-title-invalid' ) );
			return errors;
		}

		if ( !result.unique.isUnique ) {
			// result is NOT unique
			if ( result.unique.href ) {
				errors.push( mw.message( 'mwe-upwiz-fileexists-replace-on-page-v2' ) );
			} else {
				errors.push( mw.message( 'mwe-upwiz-fileexists-replace-no-link', titleString ) );
			}
		} else if ( result.unique.isProtected ) {
			errors.push( mw.message( 'mwe-upwiz-error-title-protected' ) );
		} else {
			mw.messages.set( result.blacklist.blacklistMessage, result.blacklist.blacklistReason );
			messageParams = [
				'mwe-upwiz-blacklisted-details',
				titleString,
				function () {
					mw.errorDialog(
						$( '<div>' ).msg( result.blacklist.blacklistMessage ),
						mw.message( 'mwe-upwiz-blacklisted-errordialog-title' ).text()
					);
				}
			];

			// feedback request for titleblacklist
			if ( mw.UploadWizard.config.blacklistIssuesPage !== undefined && mw.UploadWizard.config.blacklistIssuesPage !== '' ) {
				messageParams[ 0 ] = 'mwe-upwiz-blacklisted-details-feedback';
				messageParams.push( () => {
					var feedback = new mw.Feedback( {
						title: new mw.Title( mw.UploadWizard.config.blacklistIssuesPage ),
						dialogTitleMessageKey: 'mwe-upwiz-feedback-title'
					} );
					feedback.launch( {
						message: mw.message( 'mwe-upwiz-feedback-blacklist-line-intro', result.blacklist.blacklistLine ).text(),
						subject: mw.message( 'mwe-upwiz-feedback-blacklist-subject', titleString ).text()
					} );
				} );
			}

			errors.push( mw.message.apply( mw, messageParams ) );
		}

		return errors;
	};

	/**
	 * @inheritdoc
	 */
	uw.TitleDetailsWidget.prototype.getWikiText = function () {
		return this.titleInput.getValue().trim();
	};

	/**
	 * @inheritdoc
	 * @return {Object} See #setSerialized
	 */
	uw.TitleDetailsWidget.prototype.getSerialized = function () {
		return {
			title: this.titleInput.getValue()
		};
	};

	/**
	 * @inheritdoc
	 * @param {Object} serialized
	 * @param {string} serialized.language Title language code
	 * @param {string} serialized.title Title text
	 */
	uw.TitleDetailsWidget.prototype.setSerialized = function ( serialized ) {
		var titleInput = this.titleInput,
			title = serialized.title;

		titleInput.setValue( title );
	};

}( mw.uploadWizard ) );
