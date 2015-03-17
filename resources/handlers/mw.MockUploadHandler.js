( function ( mw ) {
	// TODO copy interface from ApiUploadHandler -- it changed

	// Currently this doesn't at all follow the interface that Mdale made in UploadHandler
	// will have to figure this out.

	// this should be loaded with test suites when appropriate. separate file.
	mw.MockUploadHandler = function (upload) {
		this.upload = upload;
		this.nextState = null;
		this.progress = 0.0;

	};

	mw.MockUploadHandler.prototype = {

		start: function () {
			this.beginTime = (new Date()).getTime();
			this.nextState = this.cont;
			this.nextState();
		},

		cont: function () {
			var handler = this,
				delta = 0.0001; // static?
			this.progress += ( Math.random() * 0.1 );
			this.upload.setTransportProgress( this.progress );
			if (1.0 - this.progress < delta) {
				this.upload.setTransported();
			} else {
				setTimeout( function () { handler.nextState(); }, 200 );
			}
		}

	};
}( mediaWiki ) );
