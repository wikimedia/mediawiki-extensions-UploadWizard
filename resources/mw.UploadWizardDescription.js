( function ( mw, $, uw ) {
	/**
	 * Object that represents an indvidual language description, in the details portion of Upload Wizard
	 * @param languageCode -- string
	 * @param required -- boolean -- the first description is required and should be validated and displayed a bit differently
	 */
	mw.UploadWizardDescription = function ( languageCode, required, initialValue ) {
		mw.UploadWizardDescription.prototype.count++;
		this.id = 'description' + mw.UploadWizardDescription.prototype.count;
		this.isRequired = required;

		// XXX for some reason this display:block is not making it into HTML
		var errorLabelDiv = $(
				'<div class="mwe-upwiz-details-input-error">' +
					'<label generated="true" class="mwe-validator-error" for="' + this.id + '" />' +
				'</div>'
			),
			fieldnameDiv = $( '<div class="mwe-upwiz-details-fieldname" />' );

		if ( this.isRequired ) {
			fieldnameDiv.requiredFieldLabel();
		}

		fieldnameDiv.text( mw.message( 'mwe-upwiz-desc' ).text() ).addHint( 'description' );

		// Logic copied from MediaWiki:UploadForm.js
		// Per request from Portuguese and Brazilian users, treat Brazilian Portuguese as Portuguese.
		if (languageCode === 'pt-br') {
			languageCode = 'pt';
		// this was also in UploadForm.js, but without the heartwarming justification
		} else if (languageCode === 'en-gb') {
			languageCode = 'en';
		}

		this.languageMenu = mw.LanguageUpWiz.getMenu( 'lang', languageCode );
		$( this.languageMenu ).addClass( 'mwe-upwiz-desc-lang-select' );

		this.input = $( '<textarea name="' + this.id  + '" rows="2" cols="36" class="mwe-upwiz-desc-lang-text"></textarea>' )
					.growTextArea();

		if ( initialValue !== undefined ) {
			this.input.val( initialValue );
		}

		// descriptions
		this.div = $('<div class="mwe-upwiz-details-descriptions-container ui-helper-clearfix"></div>' )
				.append( errorLabelDiv, fieldnameDiv, this.languageMenu, this.input );

		this.description = new uw.model.Description( languageCode, initialValue, mw.UploadWizard.config.languageTemplateFixups );
	};

	mw.UploadWizardDescription.prototype = {

		/* widget count for auto incrementing */
		count: 0,

		setText: function ( text ) {
			// strip out any HTML tags
			text = text.replace( /<[^>]+>/g, '' );
			// & and " are escaped by Flickr, so we need to unescape
			text = text.replace( /&amp;/g, '&' ).replace( /&quot;/g, '"' );
			$( this.input ).val( $.trim( text ) );
		},

		getWikiText: function () {
			this.updateDescriptionLanguage();
			this.updateDescriptionText();

			return this.description.getValue();
		},

		getDescriptionText: function () {
			this.updateDescriptionText();
			return this.description.text;
		},

		updateDescriptionText: function () {
			this.description.setText( $.trim( $( this.input ).val() ) );
		},

		updateDescriptionLanguage: function () {
			this.description.setLanguage( $.trim( $( this.languageMenu ).val() ) );
		},

		getLanguage: function () {
			return $.trim( $( this.languageMenu ).val() );
		},

		/**
		 * Sets the language of a description
		 * @param {string} ietfLanguageTag the selector should be set to
		 */
		setLanguage: function ( ietfLanguageTag ) {
			$( this.languageMenu ).val( ietfLanguageTag.replace(/_/g, '-').toLowerCase() );
		},

		/**
		 * Locks the language specifier
		 */
		lockLanguageMenu: function () {
			$( this.languageMenu ).prop( 'disabled', true );
		},

		/**
		 * Unlocks the language specifier
		 */
		unlockLanguageMenu: function () {
			$( this.languageMenu ).prop( 'disabled', false );
		},

		/**
		 * defer adding rules until it's in a form
		 * @return validator
		 */
		addValidationRules: function ( required ) {
			// Make sure the keyup event doesn't bubble...we don't care
			// about validity until blur.
			// Note that this event is caught higher up by the jQuery
			// validation plugin, and they don't have any options for
			// setting which events should trigger a check.
			this.input.on( 'keyup', function ( e ) {
				e.stopPropagation();
				return false;
			} );

			// validator must find a form, so we add rules here
			return this.input.rules( 'add', {
				minlength: mw.UploadWizard.config.minDescriptionLength,
				maxlength: mw.UploadWizard.config.maxDescriptionLength,
				required: required,
				messages: {
					required: mw.message( 'mwe-upwiz-error-blank' ).escaped(),
					minlength: mw.message( 'mwe-upwiz-error-too-short', mw.UploadWizard.config.minDescriptionLength - 1 ).escaped(),
					maxlength: mw.message( 'mwe-upwiz-error-too-long', mw.UploadWizard.config.maxDescriptionLength + 1 ).escaped()
				}
			} );
		}
	};
}( mediaWiki, jQuery, mediaWiki.uploadWizard ) );
