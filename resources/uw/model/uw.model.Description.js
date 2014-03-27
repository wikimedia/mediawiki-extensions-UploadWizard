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

( function ( mw, uw ) {
	var DP;

	/**
	 * @class mw.uw.model.Description
	 * @extends mw.uw.model.Model
	 * @constructor
	 * @param {string} [language]
	 * @param {string} [text='']
	 * @param {Object} [languageTemplateFixups]
	 */
	function Description(
		language,
		text,
		languageTemplateFixups
	) {
		if ( text === undefined ) {
			text = '';
		}

		/**
		 * @property {string} language The language this description is in.
		 */
		this.language = language;

		/**
		 * @property {string} text
		 */
		this.text = text;

		/**
		 * @property {Object} languageTemplateFixups
		 */
		this.languageTemplateFixups = languageTemplateFixups;
	}

	DP = Description.prototype;

	/**
	 * Gets the wikitext value of the description.
	 * @returns {string}
	 */
	DP.getValue = function () {
		// Assume that form validation has already told the user to
		// enter a description if this field is required. Else this
		// means "remove this description".
		if ( this.text.length === 0 ) {
			return '';
		}

		return '{{' + this.language + '|1=' + this.text + '}}';
	};

	/**
	 * Sets the language.
	 * @param {string} language
	 */
	DP.setLanguage = function ( language ) {
		var fix;

		if ( this.languageTemplateFixups ) {
			fix = this.languageTemplateFixups;
		}

		if ( fix && fix[language] ) {
			language = fix[language];
		}

		this.language = language;
	};

	/**
	 * Sets the text.
	 * @param {string} text
	 */
	DP.setText = function ( text ) {
		this.text = text;
	};

	uw.model.Description = Description;
}( mediaWiki, mediaWiki.uploadWizard ) );
