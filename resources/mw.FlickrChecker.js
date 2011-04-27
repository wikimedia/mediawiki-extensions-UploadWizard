( function( mw ) {

mw.FlickrChecker = {

	apiUrl: 'http://api.flickr.com/services/rest/?',
	apiKey: 'e9d8174a79c782745289969a45d350e8',
	licenseList: new Array(),
	
	// Map each Flickr license name to the equivalent templates.
	// These are the current Flickr license names as of April 26, 2011.
	// Live list at http://api.flickr.com/services/rest/?&method=flickr.photos.licenses.getInfo&api_key=e9d8174a79c782745289969a45d350e8
	licenseMaps: {
		'All Rights Reserved': 'invalid',
		'Attribution License': 'invalid',
		'Attribution-NoDerivs License': 'invalid',
		'Attribution-NonCommercial-NoDerivs License': 'invalid',
		'Attribution-NonCommercial License': 'invalid',
		'Attribution-NonCommercial-ShareAlike License': 'invalid',
		'Attribution-ShareAlike License': '{{flickrreview}}{{cc-by-sa-2.0}}',
		'No known copyright restrictions': '{{flickrreview}}{{Flickr-no known copyright restrictions}}',
		'United States Government Work': '{{flickrreview}}{{PD-USGov}}'
	},
	
	/**
	 * If a photo is from flickr, retrieve its license. If the license is valid, display the license 
	 * to the user, hide the normal license selection interface, and set it as the deed for the upload. 
	 * If the license is not valid, alert the user with an error message. If no recognized license is 
	 * retrieved, do nothing. Note that the license look-up system is fragile on purpose. If Flickr 
	 * changes the name associated with a license ID, it's better for the lookup to fail than to use 
	 * an incorrect license.
 	 * @param url - the source URL to check
 	 * @param $selector - the element to insert the license name into
 	 * @param upload - the upload object to set the deed for
	 */
	checkFlickr: function( url, $selector, upload ) {
		photoIdMatches = url.match(/flickr.com\/photos\/[^\/]+\/([0-9]+)/);
		if ( photoIdMatches && photoIdMatches[1] > 0 ) {
			photoId = photoIdMatches[1];
			$.getJSON(this.apiUrl+'&method=flickr.photos.getInfo&api_key='+this.apiKey+'&photo_id='+photoId+'&format=json&jsoncallback=?',
				function( data ) {
					if ( typeof data.photo != 'undefined' ) {
						// The returned data.photo.license is just an ID that we use to look up the license name
						var licenseName = mw.FlickrChecker.licenseList[data.photo.license];
						// Use the license name to retrieve the template values
						var licenseValue = mw.FlickrChecker.licenseMaps[licenseName];
						// Set the license message to show the user.
						if ( licenseValue == 'invalid' ) {
							var licenseMessage = gM( 'mwe-upwiz-license-external-invalid', 'Flickr', licenseName );
						} else {
							var licenseMessage = gM( 'mwe-upwiz-license-external', 'Flickr', licenseName );
						}
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
				}
			}
		);
	},
	
};
	
} )( window.mediaWiki );
