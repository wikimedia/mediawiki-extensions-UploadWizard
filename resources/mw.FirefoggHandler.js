/**
 * Represents an object which configures a form to upload its files via an firefogg talking to the MediaWiki API.
 * @param an UploadInterface object, which contains a .form property which points to a real HTML form in the DOM
 */

mw.FirefoggHandler = function( upload, api ) {
	return this.init( upload );
};

mw.FirefoggHandler.prototype = {
	// The transport object
	transport : null, // lazy init
	/**
	 * Constructor 
	 */
	init: function( upload ){
		this.upload = upload;
		this.api = upload.api;
		// update the mwe-upwiz-file-input target
		this.upload.ui.$fileInputCtrl = this.getInputControl();
		this.upload.ui.fileCtrlContainer.empty().append(
			this.upload.ui.$fileInputCtrl
		);
		// update the "valid" extension to include firefogg transcode extensions: 
		mw.UploadWizard.config[ 'fileExtensions' ] = $.merge(
				mw.UploadWizard.config[ 'fileExtensions' ], 
				mw.UploadWizard.config[ 'transcodeExtensionList' ]
		);
		
	},
	// Setup local pointer to firefogg instance
	getFogg: function(){
		if( ! this.fogg ){
			this.fogg = new Firefogg();
		}
		return this.fogg;
	},
	getTransport: function(){
		var _this = this;
		if( !this.transport ){
			this.transport = new mw.FirefoggTransport(
                    this.upload,
                    this.api,
					this.getFogg(),
					function( fraction ) { 
						_this.upload.setTransportProgress( fraction ); 
						// also update preview video: 
					},
					function( result ) {
						mw.log("FirefoggTransport::getTransport> Transport done " + JSON.stringify( result ) );
						_this.upload.setTransported( result ); 
					}
				);
		}
		return this.transport;
	},
	isGoodExtension: function( ext ){
		// First check if its an oky extension for the wiki: 
		if( $j.inArray( ext.toLowerCase(), mw.UploadWizard.config[ 'fileExtensions' ] ) !== -1 ){
			return true;
		} 
		// Check if its a file that can be transcoded:
		if( this.getTransport().isSourceAudio() || this.getTransport().isSourceVideo() ){
			return true;
		}
		// file can't be transcoded
		return false;
	},
	
	getForm: function(){
		return  $j( this.upload.ui.form );
	},
	
	/**
	 * Get a pointer to the "file" input control 
	 */
	getInputControl: function(){
		var _this = this;		
		return $j('<input />').attr({
				'size': "1",
				 'name': "file",
				 'type': "text"
			})
			.addClass( "mwe-upwiz-file-input" )
			.click( function() {
				if( _this.getFogg().selectVideo() ) {	
					// Update the value of the input file: 
					$j( this )
					.val( _this.getFogg().sourceFilename );
					//.trigger('change');
					// note the change trigger does not work because we replace the target: 
					var title = _this.getTransport().getFileName().replace( /:/g, '_' );
					_this.upload.title = new mw.Title( title , 'file' );
					_this.upload.ui.fileChangedOk();
					_this.upload.filename = title;
				}
			} );
	},

	/**
	 * If chunks are disabled transcode then upload else
	 * upload and transcode at the same time
	 */
	start: function() {
		var _this = this;		
		mw.log( "mw.FirefoggHandler::start> upload start!" );		
		_this.beginTime = ( new Date() ).getTime();
		_this.upload.ui.setStatus( 'mwe-upwiz-transport-started' );
		_this.upload.ui.showTransportProgress();
		_this.getTransport().doUpload();			
	}
};
