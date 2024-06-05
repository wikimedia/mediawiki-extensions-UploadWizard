/*
 * This file is part of the MediaWiki extension UploadWizard.
 *
 * UploadWizard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * UploadWizard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with UploadWizard.  If not, see <http://www.gnu.org/licenses/>.
 */

( function ( uw ) {
	/**
	 * Represents the UI for the wizard's Thanks step.
	 *
	 * @class
	 * @extends uw.ui.Step
	 * @param {Object} config
	 */
	uw.ui.Thanks = function UWUIThanks( config ) {
		var homeButtonTarget,
			homeButtonHref,
			homeButtonUrl,
			thanksMessage,
			beginButtonTarget,
			thanks = this;

		this.config = config;

		uw.ui.Step.call(
			this,
			'thanks'
		);

		this.$div.prepend(
			$( '<div>' ).attr( 'id', 'mwe-upwiz-thanks' )
		);

		if ( this.isObjectReferenceGiven() ) {
			this.getDelayNotice().prependTo( this.$div );
		}

		thanksMessage = new OO.ui.MessageWidget( {
			type: 'success',
			label: ( this.config.display && this.config.display.thanksLabel ) ?
				new OO.ui.HtmlSnippet( this.config.display.thanksLabel ) :
				mw.msg( 'mwe-upwiz-thanks-message' ),
			classes: [ 'mwe-upwiz-thanks-message' ]
		} );
		thanksMessage.$element.prependTo( this.$div );

		homeButtonTarget = this.getButtonConfig( 'homeButton', 'target' );
		if ( !homeButtonTarget ) {
			homeButtonHref = mw.config.get( 'wgArticlePath' ).replace( '$1', '' );
		} else if ( homeButtonTarget === 'useObjref' ) {
			homeButtonHref = homeButtonTarget;
		} else {
			try {
				homeButtonUrl = new URL( homeButtonTarget );
				// URL parsing went fine: check the protocol.
				// If `homeButtonTarget` is a wiki page in a non-main namespace,
				// it will still be parsed into a URL with protocol == namespace.
				if ( homeButtonUrl.protocol.startsWith( 'http' ) ) {
					// HTTP URL: as is
					homeButtonHref = homeButtonUrl.href;
				} else {
					// Page title in a non-main namespace
					homeButtonHref = mw.config
						.get( 'wgArticlePath' )
						.replace( '$1', homeButtonTarget );
				}
			} catch ( error ) {
				// Not a URL: assume a page title
				homeButtonHref = mw.config
					.get( 'wgArticlePath' )
					.replace( '$1', homeButtonTarget );
			}
		}
		this.homeButton = new OO.ui.ButtonWidget( {
			label: this.getButtonConfig( 'homeButton', 'label' ) || mw.message( 'mwe-upwiz-home' ).text(),
			href: homeButtonHref
		} );

		this.beginButton = new OO.ui.ButtonWidget( {
			label: this.getButtonConfig( 'beginButton', 'label' ) || mw.message( 'mwe-upwiz-upload-another' ).text(),
			flags: [ 'progressive', 'primary' ]
		} );

		// TODO: make the step order configurable by campaign definitions instead of using these hacks
		beginButtonTarget = this.getButtonConfig( 'beginButton', 'target' );
		if ( !beginButtonTarget || ( beginButtonTarget === 'dropObjref' && !this.isObjectReferenceGiven() ) ) {
			this.beginButton.on( 'click', () => {
				thanks.emit( 'next-step' );
			} );
		} else {
			if ( beginButtonTarget === 'dropObjref' ) {
				beginButtonTarget = this.dropParameterFromURL( location.href, 'updateList' );
			}
			this.beginButton.setHref( beginButtonTarget );
		}
		this.beginButton.on( 'click', () => {
			mw.DestinationChecker.clearCache();
		} );

		this.buttonGroup = new OO.ui.HorizontalLayout( {
			items: [ this.homeButton, this.beginButton ]
		} );

		this.$buttons.append( this.buttonGroup.$element );
	};

	OO.inheritClass( uw.ui.Thanks, uw.ui.Step );

	/**
	 * Adds an upload to the Thanks interface.
	 *
	 * @param {mw.UploadWizardUpload} upload
	 */
	uw.ui.Thanks.prototype.addUpload = function ( upload ) {
		var thumbWikiText, $thanksDiv, $thumbnailWrapDiv, $thumbnailDiv, $thumbnailCaption, $thumbnailLink;

		thumbWikiText = '[[' + [
			upload.details.getTitle().getPrefixedText(),
			'thumb',
			upload.details.getThumbnailCaption()
		].join( '|' ) + ']]';

		$thanksDiv = $( '<div>' )
			.addClass( 'mwe-upwiz-thanks ui-helper-clearfix' );
		$thumbnailWrapDiv = $( '<div>' )
			.addClass( 'mwe-upwiz-thumbnail-side' )
			.appendTo( $thanksDiv );
		$thumbnailDiv = $( '<div>' )
			.addClass( 'mwe-upwiz-thumbnail' )
			.appendTo( $thumbnailWrapDiv );
		$thumbnailCaption = $( '<div>' )
			.css( { 'text-align': 'left', 'font-size': 'small' } )
			.appendTo( $thumbnailWrapDiv );
		$thumbnailLink = $( '<a>' )
			.text( upload.details.getTitle().getMainText() )
			.appendTo( $thumbnailCaption );

		$( '<div>' )
			.addClass( 'mwe-upwiz-data' )
			.appendTo( $thanksDiv )
			.append(
				this.makeReadOnlyInput( thumbWikiText, mw.message( 'mwe-upwiz-thanks-wikitext' ).text(), true ),
				this.makeReadOnlyInput( upload.imageinfo.descriptionurl, mw.message( 'mwe-upwiz-thanks-url' ).text() )
			);

		// This must match the CSS dimensions of .mwe-upwiz-thumbnail
		upload.getThumbnail( 200, 200 ).done( ( thumb ) => {
			mw.UploadWizard.placeThumbnail( $thumbnailDiv, thumb );
		} );

		// Set the thumbnail links so that they point to the image description page
		$thumbnailLink.add( $thumbnailDiv.find( '.mwe-upwiz-thumbnail-link' ) ).attr( {
			href: upload.imageinfo.descriptionurl,
			target: '_blank'
		} );

		this.$div.find( '.mwe-upwiz-buttons' ).before( $thanksDiv );
	};

	/**
	 * Make an mw.widgets.CopyTextLayout, which features a button
	 * to copy the text provided.
	 *
	 * @param {string} value Text it will contain
	 * @param {string} label Label
	 * @param {string} [useEditFont] Use edit font (for wikitext values)
	 * @return {jQuery}
	 */
	uw.ui.Thanks.prototype.makeReadOnlyInput = function ( value, label, useEditFont ) {
		var copyText = new mw.widgets.CopyTextLayout( {
			align: 'top',
			label: label,
			copyText: value
		} );

		if ( useEditFont ) {
			copyText.textInput.$element.addClass( 'mw-editfont-' + mw.user.options.get( 'editfont' ) );
		}

		return copyText.$element;
	};

	/**
	 * Get button configuration options from a campaign definition
	 *
	 * @param {string} buttonName name of the button as defined in campaign configuration
	 * @param {string} configField name of the button's attributes
	 * @return {Object|undefined}
	 */
	uw.ui.Thanks.prototype.getButtonConfig = function ( buttonName, configField ) {
		if ( !this.config.display || !this.config.display[ buttonName ] ) {
			return;
		}

		return this.config.display[ buttonName ][ configField ];
	};

	/**
	 * Drops a parameter from the given url
	 *
	 * @param {string} url URL from which to drop a parameter
	 * @param {string} paramName parameter to be dropped
	 * @return {string}
	 * @private
	 */
	uw.ui.Thanks.prototype.dropParameterFromURL = function ( url, paramName ) {
		var newUrl = new mw.Uri( url );
		if ( newUrl.query ) {
			delete newUrl.query[ paramName ];
			delete newUrl.query[ paramName + '[]' ];
		}
		return newUrl.toString();
	};

	uw.ui.Thanks.prototype.getDelayNotice = function () {
		var $delayNotice = $( '<p>' )
			.addClass( 'mwe-upwiz-thanks-update-delay' )
			.msg( 'mwe-upwiz-objref-notice-update-delay' );

		if ( this.config.display && this.config.display.noticeUpdateDelay ) {
			$delayNotice.html( this.config.display.noticeUpdateDelay );
		}
		return $delayNotice;
	};

	uw.ui.Thanks.prototype.isObjectReferenceGiven = function () {
		return this.config.defaults && this.config.defaults.objref !== '';
	};

}( mw.uploadWizard ) );
