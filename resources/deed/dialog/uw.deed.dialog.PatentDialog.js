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
	 * @param {Object} config Dialog config
	 * @param {Object} uwConfig UploadWizard config
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @class
	 */
	uw.PatentDialog = function PatentDialog( config, uwConfig, uploads ) {
		uw.PatentDialog.super.call( this, config );
		this.config = uwConfig;
		this.panels = config.panels || [];
		this.uploads = uploads;
	};

	OO.inheritClass( uw.PatentDialog, OO.ui.ProcessDialog );
	OO.mixinClass( uw.PatentDialog, OO.EventEmitter );

	uw.PatentDialog.static.name = 'uwPatentDialog';
	uw.PatentDialog.static.title = mw.msg( 'mwe-upwiz-patent-dialog-title' );
	uw.PatentDialog.static.actions = [
		{
			flags: [ 'primary', 'progressive' ],
			indicator: 'next',
			action: 'confirm',
			label: OO.ui.deferMsg( 'mwe-upwiz-patent-dialog-button-next' ),
			disabled: true
		},
		{
			flags: [ 'safe', 'back' ],
			icon: 'previous',
			title: OO.ui.deferMsg( 'mwe-upwiz-patent-dialog-button-back' ),
			framed: false
		}
	];

	uw.PatentDialog.prototype.initialize = function () {
		const filenames = [],
			label = new OO.ui.LabelWidget(),
			panels = new OO.ui.PanelLayout( { padded: true, expanded: false } );

		uw.PatentDialog.super.prototype.initialize.apply( this, arguments );

		this.uploads.forEach( ( upload ) => {
			filenames.push(
				// use given title (if available already) or fall back to filename
				upload.details ? upload.details.getTitle().getMainText() : upload.title.getMainText()
			);
		} );

		this.content = new OO.ui.PanelLayout( { padded: false, expanded: false } );
		this.content.$element.addClass( 'mwe-upwiz-patent-rights' );

		if ( this.panels.includes( 'filelist' ) ) {
			label.setLabel( mw.msg( 'mwe-upwiz-patent-dialog-title-filename', mw.language.listToText( filenames ) ) );
			label.$element.addClass( 'oo-ui-processDialog-title mwe-upwiz-patent-rights-filelist' );
			this.content.$element.append( label.$element );
		}

		if ( this.panels.includes( 'warranty' ) ) {
			panels.$element.append( this.getWarrantyLayout().$element );
		}

		if (
			this.panels.includes( 'license-ownership' ) ||
			this.panels.includes( 'license-grant' )
		) {
			panels.$element.append( this.getLicenseLayout(
				this.panels.includes( 'license-ownership' ),
				this.panels.includes( 'license-grant' )
			).$element );
		}

		this.checkbox = new OO.ui.CheckboxInputWidget();
		this.checkbox.connect( this, { change: 'onCheckboxChange' } );
		panels.$element.append( this.getCheckboxLayout().$element );

		this.content.$element.append( panels.$element );
		this.$body.append( this.content.$element );
	};

	/**
	 * @return {OO.ui.PanelLayout}
	 */
	uw.PatentDialog.prototype.getWarrantyLayout = function () {
		const layout = new OO.ui.PanelLayout( { padded: true, expanded: false } );

		layout.$element.append(
			$( '<strong>' ).text( mw.msg( 'mwe-upwiz-patent-dialog-title-warranty' ) ),
			$( '<p>' ).text( mw.msg( 'mwe-upwiz-patent-dialog-text-warranty', this.uploads.length ) ),
			$( '<a>' )
				.text( mw.msg( 'mwe-upwiz-patent-dialog-link-warranty' ) )
				.attr( { target: '_blank', href: this.config.patents.url.warranty } )
		);

		return layout;
	};

	/**
	 * @param {boolean} ownership
	 * @param {boolean} grant
	 * @return {OO.ui.PanelLayout}
	 */
	uw.PatentDialog.prototype.getLicenseLayout = function ( ownership, grant ) {
		const layout = new OO.ui.PanelLayout( { padded: true, expanded: false } );

		if ( ownership ) {
			layout.$element.append(
				$( '<strong>' ).text( mw.msg( 'mwe-upwiz-patent-dialog-title-license' ) ),
				$( '<p>' ).text( mw.msg( 'mwe-upwiz-patent-dialog-text-license', this.uploads.length ) ),
				$( '<a>' )
					.text( mw.msg( 'mwe-upwiz-patent-dialog-link-license' ) )
					.attr( { target: '_blank', href: this.config.patents.url.license } )
			);
		}

		if ( grant ) {
			layout.$element.append(
				$( '<p>' ).text( mw.msg( 'mwe-upwiz-patent-dialog-text-license-grant', this.uploads.length ) ),
				$( '<a>' )
					.text( mw.msg( 'mwe-upwiz-patent-dialog-link-license-grant' ) )
					.attr( { target: '_blank', href: this.config.patents.url.legalcode } )
			);
		}

		return layout;
	};

	/**
	 * @return {OO.ui.PanelLayout}
	 */
	uw.PatentDialog.prototype.getCheckboxLayout = function () {
		const checkbox = new OO.ui.FieldLayout( this.checkbox, {
			label: mw.msg( 'mwe-upwiz-patent-dialog-checkbox-label' ),
			align: 'inline'
		} );

		return new OO.ui.PanelLayout( {
			padded: true,
			expanded: false,
			$content: checkbox.$element
		} );
	};

	/**
	 * @param {boolean} checked
	 */
	uw.PatentDialog.prototype.onCheckboxChange = function ( checked ) {
		const button = this.actions.get( { flags: 'primary' } )[ 0 ];
		button.setDisabled( !checked );
	};

	/**
	 * @param {string} action
	 * @return {OO.ui.Process} Action process
	 */
	uw.PatentDialog.prototype.getActionProcess = function ( action ) {
		if ( action === '' ) {
			this.emit( 'disagree' );
		} else if ( action === 'confirm' ) {
			return new OO.ui.Process( () => {
				this.emit( 'agree' );
				this.close( { action: action } );
			} );
		}

		return uw.PatentDialog.super.prototype.getActionProcess.call( this, action );
	};

	uw.PatentDialog.prototype.getBodyHeight = function () {
		return this.content.$element.outerHeight( true );
	};
}( mw.uploadWizard ) );
