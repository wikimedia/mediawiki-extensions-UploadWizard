( function ( mw, $ ) {
/**
 * Object that represents an indvidual language description, in the details portion of Upload Wizard
 * @param languageCode -- string
 * @param required -- boolean -- the first description is required and should be validated and displayed a bit differently
 */
mw.UploadWizardDescription = function( languageCode, required, initialValue ) {
	var _this = this;
	mw.UploadWizardDescription.prototype.count++;
	_this.id = 'description' + mw.UploadWizardDescription.prototype.count;
	_this.isRequired = required;

	// XXX for some reason this display:block is not making it into HTML
	var errorLabelDiv = $(
		'<div class="mwe-upwiz-details-input-error">' +
			'<label generated="true" class="mwe-validator-error" for="' + _this.id + '" />' +
		'</div>'
	);

	var fieldnameDiv = $( '<div class="mwe-upwiz-details-fieldname" />' );
	if ( _this.isRequired ) {
		fieldnameDiv.requiredFieldLabel();
	}

	fieldnameDiv.text( mw.message( 'mwe-upwiz-desc' ).text() ).addHint( 'description' );

	// Logic copied from MediaWiki:UploadForm.js
	// Per request from Portuguese and Brazilian users, treat Brazilian Portuguese as Portuguese.
	if (languageCode == 'pt-br') {
		languageCode = 'pt';
	// this was also in UploadForm.js, but without the heartwarming justification
	} else if (languageCode == 'en-gb') {
		languageCode = 'en';
	}

	_this.languageMenu = mw.LanguageUpWiz.getMenu( 'lang', languageCode );
	$(_this.languageMenu).addClass( 'mwe-upwiz-desc-lang-select' );

	_this.input = $( '<textarea name="' + _this.id  + '" rows="2" cols="36" class="mwe-upwiz-desc-lang-text"></textarea>' )
				.growTextArea();

	if ( initialValue !== undefined ) {
		_this.input.val( initialValue );
	}

	// descriptions
	_this.div = $('<div class="mwe-upwiz-details-descriptions-container ui-helper-clearfix"></div>' )
			.append( errorLabelDiv, fieldnameDiv, _this.languageMenu, _this.input );

};

mw.UploadWizardDescription.prototype = {

	/* widget count for auto incrementing */
	count: 0,

	getText: function() {
		return $.trim( $( this.input ).val() );
	},

	setText: function( text ) {
		// strip out any HTML tags
		text = text.replace( /<[^>]+>/g, '' );
		// & and " are escaped by Flickr, so we need to unescape
		text = text.replace( /&amp;/g, '&' ).replace( /&quot;/g, '"' );
		$( this.input ).val( $.trim( text ) );
	},

	getLanguage: function() {
		return $.trim( $( this.languageMenu ).val() );
	},

	/**
	 * Obtain text of this description, suitable for including into Information template
	 * @return wikitext as a string
	 */
	getWikiText: function() {
		var _this = this;
		var description = _this.getText();
		// we assume that form validation has caught this problem if this is a required field
		// if not, assume the user is trying to blank a description in another language
		if ( description.length === 0 ) {
			return '';
		}
		var language = _this.getLanguage();
		var fix = mw.UploadWizard.config.languageTemplateFixups;
		if (fix[language]) {
			language = fix[language];
		}
		return '{{' + language + '|1=' + description + '}}';
	},

	/**
	 * defer adding rules until it's in a form
	 * @return validator
	 */
	addValidationRules: function( required ) {
		// validator must find a form, so we add rules here
		return this.input.rules( "add", {
			minlength: mw.UploadWizard.config.minDescriptionLength,
			maxlength: mw.UploadWizard.config.maxDescriptionLength,
			required: required,
			messages: {
				required: mw.message( 'mwe-upwiz-error-blank' ).escaped(),
				minlength: mw.message( 'mwe-upwiz-error-too-short', mw.UploadWizard.config.minDescriptionLength ).escaped(),
				maxlength: mw.message( 'mwe-upwiz-error-too-long', mw.UploadWizard.config.maxDescriptionLength ).escaped()
			}
		} );
	}
};
}( mediaWiki, jQuery ) );
