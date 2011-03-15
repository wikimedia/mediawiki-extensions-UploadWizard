/**
 * Represents a "transport" for files to upload; in this case an firefogg.
 * XXX dubious whether this is really separated from "ApiUploadHandler", which does a lot of form config.
 *
 * The iframe is made to be the target of a form so that the existing page does not reload, even though it's a POST.
 * @param form	jQuery selector for HTML form
 * @param progressCb	callback to execute when we've started. (does not do float here because iframes can't 
 *			  monitor fractional progress).
 * @param transportedCb	callback to execute when we've finished the upload
 */
mw.FirefoggTransport = function( $form, fogg, progressCb, transportedCb ) {
	this.$form = $form;
	this.fogg = fogg;
	this.progressCb = progressCb;
	this.transportedCb = transportedCb;
};

mw.FirefoggTransport.prototype = {

	passthrough: false,
	/**
	 * Do an upload on a given fogg object: 
	 */
	doUpload: function( fogg ){
		// check if the server supports chunks:
		if( this.isChunkUpload() ){
			mw.log("FirefoggTransport::doUpload> Chunks");
			// encode and upload at the same time: 
			this.doChunkUpload();
		} else {
			mw.log("FirefoggTransport::doUpload> Encode then upload");
			this.doEncodeThenUpload();
		}
	},
	isChunkUpload: function(){
		return false;
		return ( mw.UploadWizard.config[ 'enableFirefoggChunkUpload' ] );
	},			
	/**
	 * Check if the asset should be uploaded in passthrough mode ( or if it should be encoded )
	 */
	isPassThrough: function(){
		// Check if the server supports raw webm uploads: 
		var wembExt = ( $j.inArray( mw.UploadWizard.config[ 'fileExtensions'], 'webm') !== -1 )
		// Determine passthrough mode
		if ( this.isOggFormat() || ( wembExt && isWebMFormat() ) ) {
			// Already Ogg, no need to encode
			return true;
		} else if ( this.isSourceAudio() || this.isSourceVideo() ) {
			// OK to encode
			return false;
		} else {
			// Not audio or video, can't encode
			return true;
		}
	},

	isSourceAudio: function() {
		return ( this.getSourceFileInfo().contentType.indexOf("audio/") != -1 );
	},

	isSourceVideo: function() {
		return ( this.getSourceFileInfo().contentType.indexOf("video/") != -1 );
	},

	isOggFormat: function() {
		var contentType = this.getSourceFileInfo().contentType;
		return ( contentType.indexOf("video/ogg") != -1
			|| contentType.indexOf("application/ogg") != -1 
			|| contentType.indexOf("audio/ogg") );
	},
	isWebMFormat: function() {
		return (  this.getSourceFileInfo().contentType.indexOf('webm') != -1 );
	},
	
	/**
	 * Get the source file info for the current file selected into this.fogg
	 */
	getSourceFileInfo: function() {
		if ( !this.fogg.sourceInfo ) {
			mw.log( 'Error:: No firefogg source info is available' );
			return false;
		}
		try {
			this.sourceFileInfo = JSON.parse( this.fogg.sourceInfo );
		} catch ( e ) {
			mw.log( 'Error :: could not parse fogg sourceInfo' );
			return false;
		}
		return this.sourceFileInfo;
	},
	
	/**
	 * Get the encode settings from configuration and the current selected video type 
	 */
	getEncodeSettings: function(){
		var encodeSettings = $j.extend( {}, mw.UploadWizard.config[ 'firefoggEncodeSettings'] , {
			'passthrough' : this.isPassThrough()
		})
		mw.log("FirefoggTransport::getEncodeSettings> " +  JSON.stringify(  encodeSettings ) );
		return encodeSettings;
	},
	
	
	
	/**
	 * Encode then upload
	 */
	doEncodeThenUpload: function(){
		this.fogg.encode( JSON.stringify( this.getEncodeSettings() ) );
		this.monitorProgress();
	},
	/**
	 * Encode and upload in chunks
	 */
	doChunkUpload: function(){
		this.fogg.upload( 
				JSON.stringify( this.getEncodeSettings() ), 
				this.getUploadUrl(),
				JSON.stringify( this.getUploadRequest() )
		);
		this.monitorProgress();
	},
	// Get the upload url 
	getUploadUrl: function(){
		return mw.UploadWizard.apiUrl;
	},	
	/**
	 * get the upload settings
	 */
	getUploadRequest: function(){		
		return {
			'action' : ( this.isChunkUpload() )? 'firefoggupload' : 'upload',
			'stash' :1,
			'comment' : 'DUMMY TEXT',
			'format' : 'json'
		}
	},
	/**
	 * Monitor progress on an upload:
	 */
	monitorProgress: function(){
		var fogg = this.fogg;
		var progress = fogg.progress();
		
		mw.log("FirefoggTransport::monitorProgress> " + progress + ' state: ' + fogg.state );
		this.progressCb( progress );
		
		if( fogg.state == 'encoding' || fogg.state == 'uploading'){
			setTimeout( this.monitorProgress, 500 );
		}
		// return the api result: 
		if( fogg.state == 'done' ){
			this.transportedCb( this.fogg.responseText );
		}
		
	},
	
	/**
	 * Process the result of the form submission, returned to an iframe.
	 * This is the iframe's onload event.
	 *
	 * @param {Element} iframe iframe to extract result from 
	 */
	updateProgress: function( iframe ) {
		var _this = this;
	}
};


