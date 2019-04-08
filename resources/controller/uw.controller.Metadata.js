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
	 * Represents the metadata step in the wizard.
	 *
	 * @class
	 * @extends uw.controller.Step
	 * @param {mw.Api} api
	 * @param {Object} config UploadWizard config object.
	 */
	uw.controller.Metadata = function UWControllerDetails( api, config ) {
		uw.controller.Step.call(
			this,
			new uw.ui.Metadata(),
			api,
			config
		);

		this.stepName = 'metadata';

		this.ui.connect( this, { submit: 'onSubmit' } );
	};

	OO.inheritClass( uw.controller.Metadata, uw.controller.Step );

	/**
	 * Move to this step.
	 *
	 * @param {mw.UploadWizardUpload[]} uploads List of uploads being carried forward.
	 */
	uw.controller.Metadata.prototype.load = function ( uploads ) {
		var self = this,
			booklet = new OO.ui.BookletLayout( {
				expanded: false,
				outlined: true,
				classes: [ 'mwe-upwiz-metadata-booklet' ]
			} );

		uw.controller.Step.prototype.load.call( this, uploads );

		this.statements = {};
		uploads.forEach( function ( upload ) {
			upload.details.getMediaInfoEntityId().then( function ( entityId ) {
				var statements = [],
					content, page;

				Object.keys( mw.config.get( 'wbmiProperties' ) ).forEach( function ( propertyId ) {
					var statement = new mw.mediaInfo.statements.StatementWidget( {
						entityId: entityId,
						propertyId: propertyId
					} );
					statements.push( statement );
				} );

				content = new uw.MetadataContent( upload, statements );
				page = new uw.MetadataPage( upload, { expanded: false, content: [ content ] } );

				self.statements[ entityId ] = statements;
				booklet.addPages( [ page ] );
			} );
		} );

		this.ui.renderContent( booklet.$element );
	};

	uw.controller.Metadata.prototype.onSubmit = function () {
		var self = this;

		$.when.apply( $, Object.keys( this.statements ).map( function ( entityId ) {
			// we can start submitting statements for multiple files at the time
			// time, but multiple statements per entity need to be submitted sequentially
			// (to avoid them being considered edit conflicts)
			var promise = $.Deferred().resolve().promise(),
				statements = self.statements[ entityId ];

			statements.forEach( function ( statement ) {
				promise = promise.then( statement.submit.bind( statement ) );
			} );

			return promise;
		} ) ).then( this.moveNext.bind( this ) );
	};

}( mw.uploadWizard ) );
