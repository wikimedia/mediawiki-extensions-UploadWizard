/**
 * An attempt to refactor out the stuff that does API-via-iframe transport
 * In the hopes that this will eventually work for AddMediaWizard too
 */

/**
 * Represents an object which configures a form to upload its files via an iframe talking to the MediaWiki API.
 * @param an UploadInterface object, which contains a .form property which points to a real HTML form in the DOM
 */
mw.FirefoggHandler = function( upload ) {
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
		
		// Setup local pointer to firefogg instance
		this.fogg = new Firefogg();
		
		// the Iframe transport is hardcoded for now because it works everywhere
		// can also use Xhr Binary depending on browser
		var _this = this;	
		
	},
	getTransport: function(){
		var _this = this;
		if( this.transport ){
			return this.transport;
		}
		this.transport = new mw.FirefoggTransport(			
				this.getForm(),
				this.fogg,
				function( fraction ) { 
					_this.upload.setTransportProgress( fraction ); 
					// also update preview video: 
				},
				function( result ) { 	
					_this.upload.setTransported( result ); 
				}
			);
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
				if( _this.fogg.selectVideo() ) {					
					// Update the value of the input file: 
					$j( _this.upload.ui.div ).find(".mwe-upwiz-file-input").val( _this.fogg.sourceFilename );
					// trigger the change event 
					_this.upload.ui.fileChanged();
				}
			} );
	},

	/**
	 * If chunks are disabled transcode then upload else
	 * upload and transcode at the same time
	 */
	start: function() {
		var _this = this;
		_this.api.getEditToken( function( token ) {
			mw.log( "mw.FirefoggHandler::start> upload start!" );
			
			_this.beginTime = ( new Date() ).getTime();
			_this.upload.ui.setStatus( 'mwe-upwiz-transport-started' );
			_this.upload.ui.showTransportProgress();
			_this.transport.doUpload( _this.fogg );
			
		}, function( code, info ) {
			_this.upload.setError( code, info );
		} );
	}
};
