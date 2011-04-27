( function( mw ) {

mw.FlickrChecker = {

	apiUrl: 'http://api.flickr.com/services/rest/?',
	apiKey: 'e9d8174a79c782745289969a45d350e8',
	licenseList: new Array(),
	
	// Map each Flickr license name to the equivalent templates.
	// These are the current Flickr license names as of April 26, 2011.
	licenseMaps: {
		'All Rights Reserved': 'invalid',
		'Attribution-NonCommercial-ShareAlike License': 'invalid',
		'Attribution-NonCommercial License': 'invalid',
		'Attribution-NonCommercial-NoDerivs License': 'invalid',
		'Attribution License': '{{flickrreview}}{{cc-by-2.0}}',
		'Attribution-ShareAlike License': '{{flickrreview}}{{cc-by-sa-2.0}}',
		'Attribution-NoDerivs License': 'invalid',
		'No known copyright restrictions': '{{flickrreview}}{{PD-Old}}',
		'United States Government Work': '{{flickrreview}}{{PD-USGov}}'
	},
	
	/**
	 * If a photo is from flickr, retrieve its license. If the license is valid, display the license 
	 * to the user, hide the normal license selection interface, and set it as the deed for the upload. 
	 * If the license is not valid, alert the user with an error message. If no recognized license is 
	 * retrieved, do nothing.
 	 * @param url - the source URL to check
 	 * @param $selector - the element to insert the license name into
 	 * @param upload - the upload object to set the deed for
	 */
	checkFlickr: function( url, $selector, upload ) {
		if ( url.search(/http:\/\/(www.)?flickr.com\/photos\//) !== -1 ) {
			photoIdMatches = url.match(/photos\/[^\/]+\/([0-9]+)/);
			photoId = photoIdMatches[1];
			$.getJSON(this.apiUrl+'&method=flickr.photos.getInfo&api_key='+this.apiKey+'&photo_id='+photoId+'&format=json&jsoncallback=?',
				function( data ) {
					if ( typeof data.photo != 'undefined' ) {
						// XXX do all the work here
						// The returned data.photo.license is just an ID that we use to look up the license name
						console.debug( mw.FlickrChecker.licenseList[data.photo.license] );
					}
				}
			);
		}
	},

	/**
	 * Retrieve the list of all current Flickr licenses and store it in an array (mw.FlickrChecker.licenses)
	 */
	getLicenses: function() {
		$.getJSON(this.apiUrl+'&method=flickr.photos.licenses.getInfo&api_key='+this.apiKey+'&format=json&jsoncallback=?',
			function( data ) {
				if ( typeof data.licenses != 'undefined' ) {
					$.each( data.licenses.license, function(index, value) {
						mw.FlickrChecker.licenseList[value.id] = value.name;
					} );
					console.debug(mw.FlickrChecker.licenseList);
					console.debug(mw.FlickrChecker.licenseMaps);
				}
			}
		);
	},
	
};
	
} )( window.mediaWiki );
