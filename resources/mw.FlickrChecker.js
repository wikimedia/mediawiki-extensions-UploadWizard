( function( mw, $ ) {


mw.FlickrChecker = function( wizard, upload ) {
	this.wizard = wizard;
	this.upload = upload;
	this.imageUploads = [];
	this.apiUrl = mw.UploadWizard.config['flickrApiUrl'];
	this.apiKey = mw.UploadWizard.config['flickrApiKey'];
};

mw.FlickrChecker.prototype = {
	licenseList: [],
	// Map each Flickr license name to the equivalent templates.
	// These are the current Flickr license names as of April 26, 2011.
	// Live list at http://api.flickr.com/services/rest/?&method=flickr.photos.licenses.getInfo&api_key=...
	licenseMaps: {
		'All Rights Reserved': 'invalid',
		'Attribution License': '{{FlickrVerifiedByUploadWizard|cc-by-2.0}}{{cc-by-2.0}}',
		'Attribution-NoDerivs License': 'invalid',
		'Attribution-NonCommercial-NoDerivs License': 'invalid',
		'Attribution-NonCommercial License': 'invalid',
		'Attribution-NonCommercial-ShareAlike License': 'invalid',
		'Attribution-ShareAlike License': '{{FlickrVerifiedByUploadWizard|cc-by-sa-2.0}}{{cc-by-sa-2.0}}',
		'No known copyright restrictions': '{{FlickrVerifiedByUploadWizard|Flickr-no known copyright restrictions}}{{Flickr-no known copyright restrictions}}',
		'United States Government Work': '{{FlickrVerifiedByUploadWizard|PD-USGov}}{{PD-USGov}}'
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
	checkFlickr: function( flickr_input_url ) {
		var _this = this;
		_this.url = flickr_input_url;
		var photoIdMatches = _this.url.match(/flickr\.com\/(?:x\/t\/[^\/]+\/)?photos\/[^\/]+\/([0-9]+)/);
		if ( photoIdMatches === null ) {
			// try static urls
			photoIdMatches = _this.url.match(/static\.?flickr\.com\/[^\/]+\/([0-9]+)_/);
		}
		var albumIdMatches = _this.url.match(/flickr\.com\/photos\/[^\/]+\/sets\/([0-9]+)/);
		if ( albumIdMatches || photoIdMatches ) {
			$j( '#mwe-upwiz-upload-add-flickr-container' ).hide();
			_this.imageUploads = [];
			if ( albumIdMatches && albumIdMatches[1] > 0 ) {
				_this.getPhotoset( albumIdMatches );
			}
			if ( photoIdMatches && photoIdMatches[1] > 0 ) {
				_this.getPhoto( photoIdMatches );
			}
		} else {
			// XXX show user the message that the URL entered was not valid
			$j( '<div></div>' )
				.html( gM( 'mwe-upwiz-url-invalid', 'Flickr' ) )
				.dialog( {
					width: 500,
					zIndex: 200000,
					autoOpen: true,
					modal: true
				} );
			_this.wizard.flickrInterfaceReset();
		}
	},

	getPhotoset: function( albumIdMatches ) {
		var _this = this;
		var x = 0;
		var fileName, imageContainer, sourceURL;

		$j( '#mwe-upwiz-select-flickr' ).button( {
			label: gM( 'mwe-upwiz-select-flickr' ),
			disabled: true
		} );
		$.getJSON( _this.apiUrl, {
			nojsoncallback: 1,
			method: 'flickr.photosets.getPhotos',
			api_key: _this.apiKey,
			photoset_id: albumIdMatches[1],
			format: 'json',
			extras: 'license, url_sq, owner_name, original_format, date_taken, geo' },
			function( data ) {
				if ( typeof data.photoset !== 'undefined' ) {
					$.each( data.photoset.photo, function( i, item ){
						// Limit to maximum of 50 images
						if ( x < 50 ) {
							var license = _this.checkLicense( item.license, i );
							var licenseValue = license.licenseValue;
							if ( licenseValue !== 'invalid' ) {
								// if the photo is untitled, generate a title
								if ( item.title === '' ) {
									fileName = item.ownername + '-' + item.id + '.jpg';
								} else {
									fileName = item.title + '.jpg';
								}
								sourceURL = 'http://www.flickr.com/photos/'
									+ data.photoset.owner + '/' + item.id + '/';
								var flickrUpload = {
									name: fileName,
									url: '',
									type: 'JPEG',
									fromURL: true,
									licenseValue: licenseValue,
									licenseMessage: license.licenseMessage,
									license: true,
									photoId: item.id,
									location: {
										'latitude': item.latitude,
										'longitude': item.longitude
									},
									author: item.ownername,
									date: item.datetaken,
									originalFormat: item.originalformat,
									sourceURL: sourceURL,
									index: i
								};
								// Adding all the Photoset files which have a valid license with the required info to an array so that they can be referenced later
								_this.imageUploads[i] = flickrUpload;

								// setting up the thumbnail previews in the Selection list
								if ( item.url_sq ) {
									imageContainer = '<li id="upload-' + i +'" class="ui-state-default"><img src="' + item.url_sq + '"></li>';
									$( '#mwe-upwiz-flickr-select-list' ).append( imageContainer );
								}
								x++;
							}
						}
					} );
					// Calling jquery ui selectable
					$j( '#mwe-upwiz-flickr-select-list' ).selectable( {
						stop: function( e ) {
							// If at least one item is selected, activate the upload button
							if ( $j( '.ui-selected' ).length > 0 ) {
								$j( '#mwe-upwiz-select-flickr' ).button( 'enable' );
							} else {
								$j( '#mwe-upwiz-select-flickr' ).button( 'disable' );
							}
						}
					} );
					// Set up action for 'Upload selected images' button
					$j( '#mwe-upwiz-select-flickr' ).click( function() {
						$j( '#mwe-upwiz-flickr-select-list-container' ).hide();
						$j( '#mwe-upwiz-upload-ctrls' ).show();
						$j( 'li.ui-selected' ).each( function( index, image ) {
							image = $( this ).attr( 'id' );
							image = image.split( '-' )[1];
							_this.setImageDescription( image );
							_this.setImageURL( image );
						} );
					} );

					if ( _this.imageUploads.length === 0) {
						$j( '<div></div>' )
							.html( gM( 'mwe-upwiz-license-photoset-invalid' ) )
							.dialog( {
								width: 500,
								zIndex: 200000,
								autoOpen: true,
								modal: true
							} );
						_this.wizard.flickrInterfaceReset();
					} else {
						$j( '#mwe-upwiz-flickr-select-list-container' ).show();
					}
				} else {
					$j( '<div></div>' )
						.html( mw.msg( 'mwe-upwiz-url-invalid', 'Flickr' ) )
						.dialog( {
							width: 500,
							zIndex: 200000,
							autoOpen: true,
							modal: true
						} );
					_this.wizard.flickrInterfaceReset();
				}
			}
		);
	},

	getPhoto: function( photoIdMatches ) {
		var _this = this;
		var photoId = photoIdMatches[1];
		var fileName, photoAuthor, sourceURL;
		$.getJSON( this.apiUrl, {
			nojsoncallback: 1,
			method: 'flickr.photos.getInfo',
			api_key: this.apiKey,
			photo_id: photoId,
			format: 'json' },
			function( data ) {
				if ( typeof data.photo !== 'undefined' ) {
					var license = _this.checkLicense( data.photo.license );
					var licenseValue = license.licenseValue;
					if ( licenseValue != 'invalid' ) {
						// if the photo is untitled, generate a title
						if ( data.photo.title._content === '' ) {
							fileName = data.photo.owner.username + '-' + data.photo.id + '.jpg';
						} else {
							fileName = data.photo.title._content + '.jpg';
						}
						// if owner doesn't have a real name, use username
						if ( data.photo.owner.realname !== '' ) {
							photoAuthor = data.photo.owner.realname;
						} else {
							photoAuthor = data.photo.owner.username;
						}
						// get the URL of the photo page
						$.each( data.photo.urls.url, function( index, url ) {
							if ( url.type === 'photopage' ) {
								sourceURL = url._content;
								// break each loop
								return false;
							}
						} );
						var flickrUpload = {
							name: fileName,
							url: '',
							type: 'JPEG',
							fromURL: true,
							licenseValue: licenseValue,
							licenseMessage: licenseMessage,
							license: true,
							author: photoAuthor,
							description: data.photo.description._content,
							originalFormat: data.photo.originalformat,
							date: data.photo.dates.taken,
							location: data.photo.location,
							photoId: data.photo.id,
							sourceURL: sourceURL
						};
						_this.imageUploads.push( flickrUpload );
						_this.setImageURL( 0, _this );
					} else {
						$j( '<div></div>' )
							.html( licenseMessage )
							.dialog({
								width: 500,
								zIndex: 200000,
								autoOpen: true,
								modal: true
							});
						_this.wizard.flickrInterfaceReset();
					}
				} else {
					$j( '<div></div>' )
						.html( gM( 'mwe-upwiz-url-invalid', 'Flickr' ) )
						.dialog( {
							width: 500,
							zIndex: 200000,
							autoOpen: true,
							modal: true
						} );
					_this.wizard.flickrInterfaceReset();
				}

			}
		);
	},

	/**
	 * Retrieve the list of all current Flickr licenses and store it in an array (mw.FlickrChecker.licenseList)
	 */
	getLicenses: function() {
		var _this = this;
		// Workaround for http://bugs.jquery.com/ticket/8283
		jQuery.support.cors = true;
		$.getJSON( _this.apiUrl, {
			nojsoncallback: 1,
			method: 'flickr.photos.licenses.getInfo',
			api_key: _this.apiKey,
			format: 'json' },
			function( data ) {
				if ( typeof data.licenses !== 'undefined' ) {
					$.each( data.licenses.license, function( index, value ) {
						mw.FlickrChecker.prototype.licenseList[value.id] = value.name;
					} );
				}
				$j( '#mwe-upwiz-flickr-select-list-container' ).trigger( 'licenselistfilled' );
			}
		);
	},

	setImageDescription: function( index ) {
		var upload = this.imageUploads[index];
		var photoId = upload.photoId;

		$.getJSON(
			this.apiUrl,
			{
				nojsoncallback: 1,
				method: 'flickr.photos.getInfo',
				api_key: this.apiKey,
				photo_id: photoId,
				format: 'json'
			},
			function( data ) {
				upload.description = data.photo.description._content;
			} );
	},

	/**
	 * Retrieve the URL of the largest version available on Flickr and set that
	 * as the upload URL.
	 * @param index Index of the image we need to set the URL for
	 */
	setImageURL: function( index ) {
		var _this = this;
		var imageURL = '';
		var upload = this.imageUploads[index];
		var photoId = upload.photoId;
		var largestSize;

		$.getJSON( _this.apiUrl, {
			nojsoncallback: 1,
			method: 'flickr.photos.getSizes',
			api_key: _this.apiKey,
			format: 'json',
			photo_id: photoId },
			function( data ) {
				if ( typeof data.sizes !== 'undefined'
					&& typeof data.sizes.size !== 'undefined'
					&& data.sizes.size.length > 0 )
				{
					// Flickr always returns the largest version as the final size.
					// TODO: Make this less fragile by actually comparing sizes.
					largestSize = data.sizes.size.pop();
					// Flickr provides the original format for images coming from pro users, hence we need to change the default JPEG to this format
					if ( largestSize.label == 'Original' ) {
						upload.type = upload.originalFormat;
						upload.name = upload.name.split('.')[0] + '.' + upload.originalFormat;
					}
					upload.url = largestSize.source;
					// Need to call the newUpload here, otherwise some code would have to be written to detect the completion of the API call.
					_this.wizard.newUpload( upload );
				} else {
					$j( '<div></div>' )
						.html( gM( 'mwe-upwiz-error-no-image-retrieved', 'Flickr' ) )
						.dialog( {
							width: 500,
							zIndex: 200000,
							autoOpen: true,
							modal: true
						} );
					_this.wizard.flickrInterfaceReset();
				}
			} );
	},

	checkLicense: function( licenseId ){
		// The returned data.photo.license is just an ID that we use to look up the license name
		var licenseName = mw.FlickrChecker.prototype.licenseList[licenseId];

		// Use the license name to retrieve the template values
		var licenseValue = mw.FlickrChecker.prototype.licenseMaps[licenseName];

		// Set the license message to show the user.
		if ( licenseValue == 'invalid' ) {
			licenseMessage = gM( 'mwe-upwiz-license-external-invalid', 'Flickr', licenseName );
		} else {
			licenseMessage = gM( 'mwe-upwiz-license-external', 'Flickr', licenseName );
		}
		var license = {
			licenseName: licenseName,
			licenseMessage: licenseMessage,
			licenseValue: licenseValue
		};
		return license;
	}

};

} )( window.mediaWiki, jQuery );
