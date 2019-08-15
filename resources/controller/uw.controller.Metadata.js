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

		// show a spinner while the statement widgets are being created
		// (this could take a little time as it might involve API calls
		// to figure out the new pages' relevant entityIDs)
		this.ui.renderContent( $.createSpinner( { size: 'large', type: 'block' } ) );

		this.statementPromises = uploads.map( this.getStatementWidgetsForUpload.bind( this ) );

		// disable submit button until changes have been made
		this.enableSubmitIfHasChanges();
		this.statementPromises.forEach( function ( statementPromise ) {
			statementPromise.then( function ( statements ) {
				statements.forEach( function ( statement ) {
					statement.on( 'change', self.enableSubmitIfHasChanges.bind( self ) );
				} );
			} );
		} );

		// don't render the booklet until the first page is ready
		this.statementPromises[ 0 ].then( function () {
			self.statementPromises.forEach( function ( statementPromise, i ) {
				statementPromise.then( function ( statementWidgets ) {
					var upload = uploads[ i ],
						content = new uw.MetadataContent( upload, statementWidgets ),
						page = new uw.MetadataPage( upload, {
							expanded: false,
							content: [ content ]
						} );
					content.on( 'statementSectionAdded', function ( statement ) {
						statement.on( 'change', self.enableSubmitIfHasChanges.bind( self ) );
					} );
					booklet.addPages( [ page ], i );
				} );
			} );

			booklet.selectFirstSelectablePage();
			self.ui.renderContent( booklet.$element );
		} );
	};

	/**
	 * @return {Object}
	 */
	uw.controller.Metadata.prototype.getWikibaseProperties = function () {
		var properties = mw.config.get( 'wbmiProperties' ) || {};
		if ( mw.UploadWizard.config.defaults.statements ) {
			properties = {};
			mw.UploadWizard.config.defaults.statements.forEach( function ( defaultStatement ) {
				// Only entity ids are supported atm
				if (
					defaultStatement.dataType === 'wikibase-entityid' &&
					defaultStatement.propertyId
				) {
					properties[ defaultStatement.propertyId ] = defaultStatement.dataType;
				}
			} );
		}
		return properties;
	};

	/**
	 * @param {string} entityId The id of the MediaInfo item
	 * @param {string} propertyId
	 * @return {wb.datamodel.Statement[]}
	 */
	uw.controller.Metadata.prototype.getDefaultDataForProperty = function ( entityId, propertyId ) {
		var statements = [];

		if ( mw.UploadWizard.config.defaults.statements ) {

			mw.loader.using( 'wikibase' ).then( function ( require ) {
				var wb = require( 'wikibase' ),
					guidGenerator = new wb.utilities.ClaimGuidGenerator( entityId );

				mw.UploadWizard.config.defaults.statements.forEach( function ( defaultStatement ) {
					if ( defaultStatement.propertyId === propertyId && defaultStatement.values ) {
						// Only entity ids are supported atm
						if ( defaultStatement.dataType === 'wikibase-entityid' ) {
							defaultStatement.values.forEach( function ( itemId ) {
								statements.push(
									new wb.datamodel.Statement(
										new wb.datamodel.Claim(
											new wb.datamodel.PropertyValueSnak( propertyId, new wb.datamodel.EntityId( itemId ) ),
											null,
											guidGenerator.newGuid()
										)
									)
								);
							} );
						}
					}
				} );

			} );
		}

		return statements;
	};

	/**
	 * @param {mw.UploadWizardUpload} upload
	 * @return {jQuery.Promise}
	 */
	uw.controller.Metadata.prototype.getStatementWidgetsForUpload = function ( upload ) {
		var self = this,
			properties = this.getWikibaseProperties();
		return $.when(
			mw.loader.using( 'wikibase.mediainfo.statements' ),
			upload.details.getMediaInfoEntityId()
		).then( function ( require, entityId ) {
			var StatementWidget = require( 'wikibase.mediainfo.statements' ).StatementWidget,
				statementWidgets = [];

			Object.keys( properties ).forEach( function ( propertyId ) {
				var statementWidget = new StatementWidget( {
					editing: true,
					entityId: entityId,
					propertyId: propertyId,
					isDefaultProperty: true,
					helpUrls: mw.config.get( 'wbmiHelpUrls' ) || {},
					properties: properties
				} );
				self.getDefaultDataForProperty( entityId, statementWidget.propertyId ).forEach(
					function ( statement ) {
						var mainSnak = statement.getClaim().getMainSnak(),
							itemWidget;
						if ( mainSnak.getPropertyId() === propertyId ) {
							itemWidget = statementWidget.createItem(
								mainSnak.getValue()
							);
							itemWidget.setData( statement );
							statementWidget.insertItem( itemWidget );
						}
					}
				);
				statementWidgets.push( statementWidget );
			} );

			return statementWidgets;
		} );
	};

	uw.controller.Metadata.prototype.enableSubmitIfHasChanges = function () {
		var promise = $.Deferred().resolve().promise();

		// chain all statement promise and resolve them if they have no changes,
		// reject them if they do
		// as soon as one is rejected (= has a change), the others will be cut
		// & we'll skip right enabling the button
		this.statementPromises.forEach( function ( statementPromise ) {
			promise = promise.then( function () {
				return statementPromise.then(
					function ( statements ) {
						var hasChanges = statements.some( function ( statement ) {
							var changes = statement.getChanges(),
								removals = statement.getRemovals();

							return changes.length > 0 || removals.length > 0;
						} );

						if ( hasChanges ) {
							return $.Deferred().reject().promise();
						}
					} );
			} );
		} );

		promise.then(
			// promises resolved = no change anywhere = disable button
			this.ui.disableNextButton.bind( this.ui, true ),
			// promises rejected = changes = enable button
			this.ui.disableNextButton.bind( this.ui, false )
		);
	};

	uw.controller.Metadata.prototype.onSubmit = function () {
		var defaultPropertyIds = Object.keys( this.getWikibaseProperties() );
		this.setPending();

		return $.when.apply( $, this.statementPromises ).then( function () {
			return $.when.apply( $, [].slice.call( arguments ).map( function ( statements ) {
				var promise = $.Deferred().resolve().promise();

				// we can start submitting statements for multiple files at the same
				// time, but multiple statements per entity need to be submitted sequentially
				// (to avoid them being considered edit conflicts)
				statements.forEach( function ( statement ) {
					promise = promise.then( statement.submit.bind( statement ) );
					// submit statements, then make sure they remain in a mode
					// where they can't be edited
					promise.then( statement.setDisabled.bind( statement, true ) );
					// remove statements with non-default properties from the DOM
					promise.then( function () {
						if ( defaultPropertyIds.indexOf( statement.propertyId ) < 0 ) {
							statement.$element.remove();
						}
					} );
				} );

				return promise;
			} ) );
		} )
			.then( this.moveNext.bind( this ) )
			.always( this.removePending.bind( this ) );
	};

	/**
	 * Display an indicator element (spinner + overlay) after the user has
	 * submitted data.
	 */
	uw.controller.Metadata.prototype.setPending = function () {
		var $div = this.ui.$div;
		this.$overlay = $( '<div>', { class: 'mwe-upwiz-metadata-pendingOverlay' } );
		this.$spinner = $.createSpinner( {
			size: 'large',
			type: 'block',
			id: 'mwe-upwiz-metadata-pendingSpinner',
			class: 'mwe-upwiz-metadata-pendingSpinner'
		} );

		this.$spinner.appendTo( this.$overlay );
		this.$overlay.appendTo( $div );
	};

	/**
	 * Remove the pending indicator (overlay + spinner) from the page.
	 */
	uw.controller.Metadata.prototype.removePending = function () {
		this.$overlay.remove();
	};

}( mw.uploadWizard ) );
