/**
* Object that reperesents the entire multi-step Upload Wizard
*/

( function( mw, $, undefined ) {

mw.UploadWizard = function( config ) {

	this.uploads = [];
	this.api = new mw.Api( { url: config.apiUrl, ajax: { timeout: 0 } } );

	// making a sort of global for now, should be done by passing in config or fragments of config when needed
	// elsewhere
	mw.UploadWizard.config = config;

	// XXX need a robust way of defining default config
	this.maxUploads = mw.UploadWizard.config.maxUploads || 10;

	var maxSimPref = mw.user.options.get( 'upwiz_maxsimultaneous' );
	if ( maxSimPref === 'default' ) {
		this.maxSimultaneousConnections = mw.UploadWizard.config[ 'maxSimultaneousConnections' ];
	} else if ( maxSimPref > 0 ) {
		this.maxSimultaneousConnections = maxSimPref;
	} else {
		this.maxSimultaneousConnections = 1;
	}

	this.makePreviewsFlag = true;
	this.showDeed = false;

};

mw.UploadWizard.DEBUG = true;

mw.UploadWizard.userAgent = "UploadWizard";


mw.UploadWizard.prototype = {
	stepNames: [ 'tutorial', 'file', 'deeds', 'details', 'thanks' ],
	currentStepName: undefined,

	/**
	 * Reset the entire interface so we can upload more stuff
	 * (depends on updateFileCounts to reset the interface when uploads go down to 0)
	 * Depending on whether we split uploading / detailing, it may actually always be as simple as loading a URL
	 */
	reset: function() {
		mw.UploadWizardUpload.prototype.count = -1; // this is counterintuitive, but the count needs to start at -1 to allow for the empty upload created on the first step.
		this.showDeed = false;
		$.purgeReadyEvents();
		$.purgeSubscriptions();
		this.removeMatchingUploads( function() { return true; } );
	},


	/**
	 * create the basic interface to make an upload in this div
	 * @param div	The div in the DOM to put all of this into.
	 */
	createInterface: function( selector ) {
		var _this = this;

		// remove first spinner
		$( '#mwe-first-spinner' ).remove();

		// construct the message for the subheader
		$( '#contentSub' ).append( $( '<span id="contentSubUpwiz"></span>' ).msg( 'mwe-upwiz-subhead-message' ) );
		// feedback request
		if ( typeof mw.UploadWizard.config.feedbackPage === 'string' && mw.UploadWizard.config.feedbackPage.length > 0 ) {
			var feedback = new mw.Feedback( {
				'title': new mw.Title( mw.UploadWizard.config.feedbackPage ),
				'dialogTitleMessageKey': 'mwe-upwiz-feedback-title',
				'bugsLink': new mw.Uri( 'https://bugzilla.wikimedia.org/enter_bug.cgi?product=MediaWiki%20extensions&component=UploadWizard' ),
				'bugsListLink': new mw.Uri( mw.UploadWizard.config.bugList )
			} );
			var feedbackLink = $( '<span class="contentSubLink"></span>' ).msg( 'mwe-upwiz-feedback-prompt',
				function() {
					feedback.launch();
					return false;
				}
			);
			$( '#contentSub' ).append( feedbackLink );
		}

		if ( typeof mw.UploadWizard.config.translateHelp === 'string' && mw.UploadWizard.config.translateHelp.length > 0 ) {
			$( '#contentSub' ).append( $( '<span class="contentSubLink"></span>' ).msg( 'mwe-upwiz-subhead-translate', $( '<a></a>' ).attr( { href: mw.UploadWizard.config.translateHelp, target: '_blank' } ) ) );
		}
		var configAltUploadForm = mw.UploadWizard.config.altUploadForm;
		if ( configAltUploadForm ) {
			var altUploadForm;
			if ( typeof configAltUploadForm === 'object' ) {
				var userLanguage = mw.config.get( 'wgUserLanguage' );
				if ( configAltUploadForm[userLanguage] ) {
					altUploadForm = configAltUploadForm[userLanguage];
				} else if ( configAltUploadForm['default'] ) {
					altUploadForm = configAltUploadForm['default'];
				} else {
					altUploadForm = undefined;
				}
			} else {
				altUploadForm = configAltUploadForm;
			}

			// altUploadForm is expected to be a page title like 'Commons:Upload', so convert to URL
			if ( typeof altUploadForm === 'string' && altUploadForm.length > 0 ) {
				var title;
				try {
					title = new mw.Title( altUploadForm );
					$( '#contentSub' ).append( $( '<span class="contentSubLink"></span>' ).msg( 'mwe-upwiz-subhead-alt-upload', $( '<a></a>' ).attr( { href: title.getUrl() } ) ) );
				} catch ( e ) {
					// page was empty, or impossible on this wiki (missing namespace or some other issue). Give up.
				}
			}
		}
		$( '#contentSub .contentSubLink:not(:last)' ).after( '&nbsp;&middot;&nbsp;' );

		// construct the arrow steps from the UL in the HTML
		$( '#mwe-upwiz-steps' )
			.addClass( 'ui-helper-clearfix ui-state-default ui-widget ui-helper-reset ui-helper-clearfix' )
			.arrowSteps()
			.show();

		// make all stepdiv proceed buttons into jquery buttons
		$( '.mwe-upwiz-stepdiv .mwe-upwiz-buttons button' )
			.button()
			.css( { 'margin-left': '1em' } );


		$( '.mwe-upwiz-button-begin' )
			.click( function() { _this.reset(); } );

		$( '.mwe-upwiz-button-home' )
			.click( function() { window.location.href = mw.config.get('wgArticlePath').replace("$1", ""); } );

		// handler for next button
		$( '#mwe-upwiz-stepdiv-tutorial .mwe-upwiz-button-next')
			.click( function() {
				// if the skip checkbox is checked, set the skip user preference
				if ( $( '#mwe-upwiz-skip' ).is( ':checked' ) ) {
					$( '#mwe-upwiz-skip' ).tipsy( 'hide' );
					_this.setSkipTutorialPreference();
				}

				_this.moveToStep( 'file' );
			} );

		$( '#mwe-upwiz-add-file' ).button();
		$( '#mwe-upwiz-upload-ctrl-flickr' ).button();

		if ( mw.UploadWizard.config.startImmediately !== true ) {
			$( '#mwe-upwiz-upload-ctrl' )
				.button()
				.click( function() {
					// check if there is an upload at all (should never happen)
					if ( _this.uploads.length === 0 ) {
						$( '<div></div>' )
							.html( mw.msg( 'mwe-upwiz-file-need-file' ) )
							.dialog({
								width: 500,
								zIndex: 200000,
								autoOpen: true,
								modal: true
							});
						return;
					}

					_this.removeEmptyUploads();
					_this.startUploads();
			} );
		} else {
			$( '#mwe-upwiz-upload-ctrl' ).remove();
		}

		// Call Flickr Initiator function on click event
		$( '#mwe-upwiz-upload-ctrl-flickr' ).click( function() {
				_this.flickrInterfaceInit();
			} );

		$( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons .mwe-upwiz-button-next' ).click( function() {
			_this.removeErrorUploads( function() {
				if ( _this.showDeed ) {
					_this.prepareAndMoveToDeeds();
				} else {
					$.each( _this.uploads, function( i, upload ) {
						upload.details.titleInput.checkTitle();
						if ( upload.fromURL ) {
							upload.details.useCustomDeedChooser();
						}
					} );
					_this.moveToStep( 'details' );
				}
			} );
		} );

		$( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons .mwe-upwiz-button-retry' ).click( function() {
			_this.hideFileEndButtons();
			_this.startUploads();
		} );


		// DEEDS div

		$( '#mwe-upwiz-stepdiv-deeds .mwe-upwiz-button-next')
			.click( function() {
				$( '.mwe-upwiz-hint' ).each( function(i) { $( this ).tipsy( 'hide' ); } ); // close tipsy help balloons
				// validate has the side effect of notifying the user of problems, or removing existing notifications.
				// if returns false, you can assume there are notifications in the interface.
				if ( _this.deedChooser.valid() ) {

					$.each( _this.uploads, function ( i, upload ) {
						if ( upload === undefined ) {
							return;
						}
						// uploads coming from Flickr do not have a deedChooser object till yet
						if ( _this.deedChooser.deed.name == 'custom' || upload.fromURL ) {
							upload.details.useCustomDeedChooser();
						} else {
							upload.deedChooser = _this.deedChooser;
						}

						// the first check, happens even if the field isn't touched
						// (ie. user accepts default title)
						upload.details.titleInput.checkTitle();
					} );

					_this.moveToStep( 'details' );
				}
			} );


		// DETAILS div
		var finalizeDetails = function() {
			if ( _this.allowCloseWindow !== undefined ) {
				_this.allowCloseWindow();
			}
			_this.prefillThanksPage();
			_this.moveToStep( 'thanks' );
		};

		var startDetails = function() {
			var isPopupOpen = false;
			$( '.categoryInput' ).each( function() {
				if ( $( this ).data( 'popupOpen' ) === true ) {
					isPopupOpen = true;
					$( this ).bind( 'popupClose', startDetails );
				}
			});
			if ( isPopupOpen ) {
				return;
			}
			$( '.mwe-upwiz-hint' ).each( function(i) { $( this ).tipsy( 'hide' ); } ); // close tipsy help balloons
			_this.detailsValid(function () {
				_this.hideDetailsEndButtons();
				_this.detailsSubmit( function() {
					_this.detailsErrorCount();
					_this.showNext( 'details', 'complete', finalizeDetails );
				} );
			}, function () {
				_this.detailsErrorCount();
			});
		};

		$( '#mwe-upwiz-stepdiv-details .mwe-upwiz-file-next-some-failed' ).hide();
		$( '#mwe-upwiz-stepdiv-details .mwe-upwiz-file-next-all-failed' ).hide();

		$( '#mwe-upwiz-stepdiv-details .mwe-upwiz-start-next .mwe-upwiz-button-next' )
			.click( startDetails );

		$( '#mwe-upwiz-stepdiv-details .mwe-upwiz-buttons .mwe-upwiz-button-next-despite-failures' )
			.click( function() {
				_this.removeErrorUploads( finalizeDetails );
			} );

		$( '#mwe-upwiz-stepdiv-details .mwe-upwiz-buttons .mwe-upwiz-button-retry' )
			.click( startDetails );


		// WIZARD

		// check to see if the the skip tutorial preference or global setting is set
		if (
			mw.user.options.get( 'upwiz_skiptutorial' ) ||
			( mw.config.get( 'UploadWizardConfig' ).tutorial && mw.config.get( 'UploadWizardConfig' ).tutorial.skip )
		) {
			// "select" the second step - highlight, make it visible, hide all others
			_this.moveToStep( 'file' );
		} else {
			// "select" the first step - highlight, make it visible, hide all others
			_this.moveToStep( 'tutorial' );

			// Add a friendly "Here's how to get it back" tooltip for users who check the "Skip next time" checkbox
			$( '#mwe-upwiz-skip ').tipsy( {
				title: function() {
					return mw.msg(
						'mwe-upwiz-tooltip-skiptutorial',
						mw.util.wikiGetlink( 'Special:Preferences' ) + '#mw-prefsection-uploads',
						mw.msg( 'prefs-uploads' ),
						mw.msg( 'prefs-upwiz-interface' )
					);
				},
				delayIn: 0,
				html: true,
				trigger: 'manual'
			} );

			$( '#mwe-upwiz-skip' ).click(
				function () {
					if ( $ ( this ).is( ':checked' ) ) {
						$( this ).tipsy( 'show' );
					} else {
						$( this ).tipsy( 'hide' );
					}
				}
			);
		}

	},

	/**
	 * Initiates the Interface to upload media from Flickr.
	 * Called when the user clicks on the 'Add images from Flickr' button.
	 */
	flickrInterfaceInit: function() {
		var _this = this;
		var checker = new mw.FlickrChecker( this, this.upload );
		var $flickr_input = $( '<input id="mwe-upwiz-flickr-input" class="ui-helper-center-fix" type="text" />' );
		var flickr_add = '<div id="mwe-upwiz-upload-add-flickr-container"><form id="mwe-upwiz-flickr-url-form">' +
			'<button id="mwe-upwiz-upload-add-flickr" class="ui-helper-center-fix" type="submit"></button></form></div>';
		$( '#mwe-upwiz-add-file-container, #mwe-upwiz-upload-ctrl-flickr-container' ).hide();
		// Add placeholder text to the Flickr URL input field
		$flickr_input.attr( 'placeholder', mw.msg( 'mwe-upwiz-flickr-input-placeholder' ) ).placeholder();
		// Insert form into the page
		$( '#mwe-upwiz-files' ).prepend( flickr_add );
		// Add disclaimer
		var $disclaimer = mw.message( 'mwe-upwiz-flickr-disclaimer1' ).parse() +
			'<br/>' + mw.message( 'mwe-upwiz-flickr-disclaimer2' ).parse();
		$disclaimer = $( '<div id="mwe-upwiz-flickr-disclaimer"></div>' ).html( $disclaimer );
		$( '#mwe-upwiz-upload-add-flickr-container' ).append( $disclaimer );
		// Insert input field into the form and set up submit action
		$( '#mwe-upwiz-flickr-url-form' ).prepend( $flickr_input ).submit( function() {
			$( '#mwe-upwiz-upload-add-flickr' ).attr( 'disabled', 'disabled' );
			_this.flickrChecker( checker );
			return false;
		} );
		// Set up the submit button
		$( '#mwe-upwiz-upload-add-flickr' ).button( { label: mw.msg( 'mwe-upwiz-add-flickr' ) } );
	},

	/**
	 * Responsible for fetching license of the provided media.
	 */
	flickrChecker: function( Checker ) {
		var flickr_input_url = $( '#mwe-upwiz-flickr-input' ).val();
		Checker.getLicenses();
		$( '#mwe-upwiz-flickr-select-list-container' ).bind( 'licenselistfilled' , function() {
			Checker.checkFlickr( flickr_input_url );
		} );
	},

	/**
	 * Reset the interface if there is a problem while fetching the images from the URL entered by the user.
	 */
	flickrInterfaceReset: function() {
		// first destroy it completely, then reshow the add button
		this.flickrInterfaceDestroy();
		$( '#mwe-upwiz-upload-add-flickr-container' ).show();
		$( '#mwe-upwiz-upload-add-flickr' ).removeAttr( 'disabled' );
	},

	/**
	 * Removes the flickr interface.
	 */
	flickrInterfaceDestroy: function() {
		$( '#mwe-upwiz-flickr-input' ).val( '' );
		$( '#mwe-upwiz-flickr-select-list' ).empty();
		$( '#mwe-upwiz-flickr-select-list-container' ).unbind();
		$( '#mwe-upwiz-select-flickr' ).unbind();
		$( '#mwe-upwiz-flickr-select-list-container' ).hide();
		$( '#mwe-upwiz-upload-add-flickr-container' ).hide();
		$( '#mwe-upwiz-upload-add-flickr' ).attr( 'disabled', 'disabled' );
	},

	/**
	 * Get the own work and third party licensing deeds if they are needed.
	 *
	 * @since 1.2
	 * @param {int|false} uploadsLength
	 * @return {Array}
	 */
	getLicensingDeeds: function( uploadsLength ) {
		var deeds = [],
			doOwnWork = false,
			doThirdParty = false;

		if ( mw.UploadWizard.config.licensing.ownWorkDefault === 'choice' ) {
			doOwnWork = doThirdParty = true;
		} else if ( mw.UploadWizard.config.licensing.ownWorkDefault === 'own' ) {
			doOwnWork = true;
		} else {
			doThirdParty = true;
		}

		if ( doOwnWork ) {
			deeds.push( new mw.UploadWizardDeedOwnWork( uploadsLength, this.api ) );
		}
		if ( doThirdParty ) {
			deeds.push( new mw.UploadWizardDeedThirdParty( uploadsLength, this.api ) );
		}

		return deeds;
	},

	// do some last minute prep before advancing to the DEEDS page
	prepareAndMoveToDeeds: function() {
		var _this = this;
		var deeds = _this.getLicensingDeeds( _this.uploads.length );

		this.shouldShowIndividualDeed = function() {
			if ( mw.UploadWizard.config.licensing.ownWorkDefault == 'choice' ) {
				return true;
			}
			else if ( mw.UploadWizard.config.licensing.ownWorkDefault == 'own' ) {
				var ownWork = mw.UploadWizard.config.licensing.ownWork;
				return ownWork.licenses.length > 1;
			}
			else {
				return true; // TODO: might want to have similar behaviour here
			}
		};

		// if we have multiple uploads, also give them the option to set
		// licenses individually
		if ( _this.uploads.length > 1 && this.shouldShowIndividualDeed() ) {
			var customDeed = $.extend( new mw.UploadWizardDeed(), {
				valid: function() { return true; },
				name: 'custom'
			} );
			deeds.push( customDeed );
		}

		var uploadsClone = $.map( _this.uploads, function( x ) { return x; } );
		_this.deedChooser = new mw.UploadWizardDeedChooser(
			'#mwe-upwiz-deeds',
			deeds,
			uploadsClone
		);

		$( '<div></div>' )
			.insertBefore( _this.deedChooser.$selector.find( '.mwe-upwiz-deed-ownwork' ) )
			.msg( 'mwe-upwiz-deeds-macro-prompt', _this.uploads.length, mw.user );

		_this.moveToStep( 'deeds', function() { _this.deedChooser.onLayoutReady(); } );

	},

	/**
	 * Advance one "step" in the wizard interface.
	 * It is assumed that the previous step to the current one was selected.
	 * We do not hide the tabs because this messes up certain calculations we'd like to make about dimensions, while elements are not
	 * on screen. So instead we make the tabs zero height and, in CSS, they are already overflow hidden
	 * @param selectedStepName
	 * @param callback to do after layout is ready?
	 */
	moveToStep: function( selectedStepName, callback ) {
		var _this = this;

		if( _this.currentStepName === selectedStepName ) {
			// already there!
			return;
		}

		// scroll to the top of the page (the current step might have been very long, vertically)
		var headScroll = $( 'h1:first' ).offset();
		$( 'html, body' ).animate( { scrollTop: headScroll.top, scrollLeft: headScroll.left }, 'slow' );
		$.each( _this.stepNames, function(i, stepName) {

			// the step's contents
			var stepDiv = $( '#mwe-upwiz-stepdiv-' + stepName );

			if ( selectedStepName === stepName ) {
				stepDiv.show();
			} else {
				stepDiv.hide();
			}

		} );

		$( '#mwe-upwiz-steps' ).arrowStepsHighlight( '#mwe-upwiz-step-' + selectedStepName );

		_this.currentStepName = selectedStepName;

		if ( selectedStepName === 'file' ) {
			_this.resetFileStepUploads();
		}

		$.each( _this.uploads, function(i, upload) {
			if ( upload === undefined ) {
				return;
			}
			upload.state = selectedStepName;
		} );

		if ( callback ) {
			callback();
		}
	},

	/**
	 * If there are no uploads, make a new one
	 */
	resetFileStepUploads: function() {
		if ( this.uploads.length === 0 ) {
			// add one upload field to start (this is the big one that asks you to upload something)
			var upload = this.newUpload();
			// hide flickr uploading button if user doesn't have permissions
			if ( !mw.UploadWizard.config.UploadFromUrl || mw.UploadWizard.config.flickrApiKey === '' ) {
				$( '#mwe-upwiz-upload-ctrl-flickr-container, #mwe-upwiz-flickr-select-list-container' ).hide();
			}
		}
	},

	/**
	 * Add an Upload
	 *   we create the upload interface, a handler to transport it to the server,
	 *   and UI for the upload itself and the "details" at the second step of the wizard.
	 *   we don't yet add it to the list of uploads; that only happens when it gets a real file.
	 *
	 * @param providedFile  Existing File object, typically from a multi-select operation
	 * @param reservedIndex Hold this index for the upload, also typically multi-select related
	 *
	 * @return the new upload
	 */
	newUpload: function( providedFile, reservedIndex ) {
		var _this = this;

		if ( _this.uploads.length >= _this.maxUploads ) {
			return false;
		}

		var upload = new mw.UploadWizardUpload( _this, '#mwe-upwiz-filelist', providedFile, reservedIndex );
		_this.uploadToAdd = upload;

		// we explicitly move the file input to cover the upload button
		upload.ui.moveFileInputToCover( '#mwe-upwiz-add-file', 'resize' );

		// we bind to the ui div since unbind doesn't work for non-DOM objects
		$( upload.ui.div ).bind( 'filenameAccepted', function(e) { _this.updateFileCounts();  e.stopPropagation(); } );
		$( upload.ui.div ).bind( 'removeUploadEvent', function(e) { _this.removeUpload( upload ); e.stopPropagation(); } );
		return upload;
	},

	/**
	 * When an upload is filled with a real file, accept it in the wizard's list of uploads
	 * and set up some other interfaces
	 * @param UploadWizardUpload
	 */
	setUploadFilled: function( upload ) {

		var _this = this;

		// When we add uploads from a multi-select operation, the file objects
		// may be filled in random order, because filling them depends on
		// completion of metadata extraction. We use the reservedIndex to ensure
		// they're added in the correct order when they're filled.
		// TODO v1.1 consider if we really have to set up details now
		if ( upload.reservedIndex !== undefined ) {
			_this.uploads[upload.reservedIndex] = upload;
		} else {
			_this.uploads.push( upload );
		}

		//If upload is through a local file, then we need to show the Deeds step of the wizard
		if( !upload.fromURL ) {
			_this.showDeed = true;
		}

		_this.updateFileCounts();
		// Don't add files coming from Flickr ( or any other service ) in the Deeds preview section
		if( !upload.fromURL ) {
			upload.deedPreview = new mw.UploadWizardDeedPreview( upload );
		}
		upload.details = new mw.UploadWizardDetails( upload, _this.api, $( '#mwe-upwiz-macro-files' ) );

		if ( mw.UploadWizard.config.startImmediately === true ) {
			// Start uploads now, no reason to wait--leave the remove button alone
			_this.makeTransitioner(
				'new',
				[ 'transporting', 'transported', 'metadata' ],
				[ 'error', 'stashed' ],
				function( upload ) {
					upload.start();
				},
				function() {
					$().notify( mw.msg( 'mwe-upwiz-files-complete' ) );
					_this.showNext( 'file', 'stashed' );
				}
			);
		}

	},

	/**
	 * Remove an upload from our array of uploads, and the HTML UI
	 * We can remove the HTML UI directly, as jquery will just get the parent.
         * We need to grep through the array of uploads, since we don't know the current index.
	 * We need to update file counts for obvious reasons.
	 *
	 * @param upload
	 */
	removeUpload: function( upload ) {
		var _this = this;
		// remove the div that passed along the trigger
		var $div = $( upload.ui.div );
		$div.unbind(); // everything
		// sexily fade away (TODO if we are looking at it)
		//$div.fadeOut('fast', function() {
			$div.remove();
			// and do what we in the wizard need to do after an upload is removed
			mw.UploadWizardUtil.removeItem( _this.uploads, upload );
			_this.updateFileCounts();
		//} );
	},


	/**
	 * Hide the button choices at the end of the file step.
	 */
	hideFileEndButtons: function() {
		$( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons .mwe-upwiz-file-endchoice' ).hide();
	},

	hideDetailsEndButtons: function() {
		$( '#mwe-upwiz-stepdiv-details .mwe-upwiz-buttons .mwe-upwiz-file-endchoice' ).hide();
	},

	/**
	 * This is useful to clean out unused upload file inputs if the user hits GO.
	 * We are using a second array to iterate, because we will be splicing the main one, _this.uploads
	 */
	removeEmptyUploads: function() {

		// First remove array keys that don't have an assigned upload object
		this.uploads = $.grep( this.uploads,
			function( v, i ) { return v !== undefined; }
		);

		// Now remove upload objects that exist but are empty
		this.removeMatchingUploads( function( upload ) {
			return mw.isEmpty( upload.filename );
		} );
	},

	/**
	 * Clear out uploads that are in error mode, perhaps before proceeding to the next step
	 * @param {Function} to be called when done
	 */
	removeErrorUploads: function( endCallback ) {
		this.removeMatchingUploads( function( upload ) {
			return upload.state === 'error';
		} );
		endCallback();
	},


	/**
	 * This is useful to clean out file inputs that we don't want for some reason (error, empty...)
	 * We are using a second array to iterate, because we will be splicing the main one, _this.uploads
	 * @param Function criterion: function to test the upload, returns boolean; true if should be removed
	 */
	removeMatchingUploads: function( criterion ) {
		var toRemove = [];

		$.each( this.uploads, function( i, upload ) {
			if ( upload === undefined ) {
				return;
			}
			if ( criterion( upload ) ) {
				toRemove.push( upload );
			}
		} );

		$.each( toRemove, function( i, upload ) {
			if ( upload === undefined ) {
				return;
			}
			upload.remove();
		} );
	},



	/**
	 * Manage transitioning all of our uploads from one state to another -- like from "new" to "uploaded".
	 *
	 * @param beginState	what state the upload should be in before starting.
	 * @param progressState	the state to set the upload to while it's doing whatever
	 * @param endState		the state (or array of states) that signify we're done with this process
	 * @param starter		function, taking single argument (upload) which starts the process we're interested in
	 * @param endCallback	function to call when all uploads are in the end state.
	 */
	makeTransitioner: function( beginState, progressStates, endStates, starter, endCallback ) {

		var _this = this;

		var transitioner = function() {
			var uploadsToStart = _this.maxSimultaneousConnections;
			var endStateCount = 0;

			$.each( _this.uploads, function(i, upload) {
				if ( upload === undefined ) {
					return;
				}
				if ( $.inArray( upload.state, endStates ) !== -1 ) {
					endStateCount++;
				} else if ( $.inArray( upload.state, progressStates ) !== -1 ) {
					uploadsToStart--;
				} else if ( ( upload.state == beginState ) && ( uploadsToStart > 0 ) ) {
					starter( upload );
					uploadsToStart--;
				}
			} );

			// build in a little delay even for the end state, so user can see progress bar in a complete state.
			var nextAction = ( endStateCount == _this.uploads.length - _this.countEmpties() ) ? endCallback : transitioner;
			setTimeout( nextAction, _this.transitionerDelay );
		};

		transitioner();
	},

	transitionerDelay: 200,  // milliseconds

	startProgressBar: function () {
		$( '#mwe-upwiz-progress' ).show();
		this.progressBar = new mw.GroupProgressBar( '#mwe-upwiz-progress',
			mw.msg( 'mwe-upwiz-uploading' ),
			this.uploads,
			[ 'stashed' ],
			[ 'error' ],
			'transportProgress',
			'transportWeight' );
		this.progressBar.start();
	},

	/**
	 * Helper function to check whether the upload process is totally
	 * complete and we can safely leave the window.
	 */
	isComplete: function () {
		var complete = true;
		$.each( this.uploads, function ( i, upload ) {
			if ( upload !== undefined && upload.state !== 'complete' && upload.state !== 'thanks' ) {
				complete = false;
				return false;
			}
		} );
		return complete;
	},

	/**
	 * Kick off the upload processes.
	 * Does some precalculations, changes the interface to be less mutable, moves the uploads to a queue,
	 * and kicks off a thread which will take from the queue.
	 * @param endCallback   - to execute when uploads are completed
	 */
	startUploads: function() {
		var _this = this;
		// remove the upload button, and the add file button
		$( '#mwe-upwiz-upload-ctrls' ).hide();
		_this.hideFileEndButtons();
		$( '#mwe-upwiz-add-file' ).hide();

		// reset any uploads in error state back to be shiny & new
		$.each( _this.uploads, function( i, upload ) {
			if ( upload === undefined ) {
				return;
			}
			if ( upload.state === 'error' ) {
				upload.state = 'new';
				upload.ui.clearIndicator();
				upload.ui.clearStatus();
			}
		} );

		this.allowCloseWindow = mw.confirmCloseWindow( {
			message: function() { return mw.msg( 'mwe-upwiz-prevent-close', _this.uploads.length ); },
			test: function() { return !_this.isComplete() && _this.uploads.length > 0; }
		} );

		$( '#mwe-upwiz-progress' ).show();
		this.progressBar = new mw.GroupProgressBar( '#mwe-upwiz-progress',
			mw.msg( 'mwe-upwiz-uploading' ),
			_this.uploads,
			[ 'stashed' ],
			[ 'error' ],
			'transportProgress',
			'transportWeight' );
		this.progressBar.start();

		// remove ability to change files
		// ideally also hide the "button"... but then we require styleable file input CSS trickery
		// although, we COULD do this just for files already in progress...

		// it might be interesting to just make this creational -- attach it to the dom element representing
		// the progress bar and elapsed time

		_this.makeTransitioner(
			'new',
			[ 'transporting', 'transported', 'metadata' ],
			[ 'error', 'stashed' ],
			function( upload ) {
				upload.start();
			},
			function() {
				$().notify( mw.msg( 'mwe-upwiz-files-complete' ) );
				_this.showNext( 'file', 'stashed' );
			}
		);
	},

	/**
	 * Figure out what to do and what options to show after the uploads have stopped.
	 * Uploading has stopped for one of the following reasons:
	 * 1) The user removed all uploads before they completed, in which case we are at upload.length === 0. We should start over and allow them to add new ones
	 * 2) All succeeded - show link to next step
	 * 3) Some failed, some succeeded - offer them the chance to retry the failed ones or go on to the next step
	 * 4) All failed -- have to retry, no other option
	 * In principle there could be other configurations, like having the uploads not all in error or stashed state, but
	 * we trust that this hasn't happened.
	 *
	 * For uploads that have succeeded, now is the best time to add the relevant previews and details to the DOM
	 * in the right order.
	 *
	 * @param {String} step that we are on
	 * @param {String} desired state to proceed (other state is assumed to be 'error')
	 */
	showNext: function( step, desiredState, allOkCallback ) {
		var errorCount = 0;
		var okCount = 0;
		var stillGoing = 0;

		// abort if all uploads have been removed
		if( this.uploads.length === 0 ) {
			return;
		}

		$.each( this.uploads, function( i, upload ) {
			if ( upload === undefined ) {
				return;
			}
			if ( upload.state === 'error' ) {
				errorCount++;
			} else if ( upload.state === desiredState ) {
				// Add previews and details to the DOM
				if( !upload.fromURL ){
					upload.deedPreview.attach();
				}
				upload.details.attach();
				okCount++;
			} else if ( upload.state === 'transporting' ) {
				stillGoing += 1;
			} else {
				//mw.log( "mw.UploadWizardUpload::showFileNext> upload " + i + " not in appropriate state for filenext: " + upload.state );
			}
		} );

		// Show toggler to copy selected metadata if there's more than one successful upload
		if ( this.uploads[0].state === desiredState && okCount > 1 ) {
			this.uploads[0].details.buildAndShowCopyMetadata();
		}

		var selector = null;
		var allOk = false;
		if ( this.progressBar ) {
			this.progressBar.showCount( okCount );
		}
		if ( okCount === ( this.uploads.length - this.countEmpties() ) ) {
			allOk = true;
			selector = '.mwe-upwiz-file-next-all-ok';
		} else if ( errorCount === ( this.uploads.length - this.countEmpties() ) ) {
			selector = '.mwe-upwiz-file-next-all-failed';
		} else if ( stillGoing !== 0 ) {
			return;
		} else {
			selector = '.mwe-upwiz-file-next-some-failed';
		}

		if ( allOk && ( allOkCallback !== undefined ) ) {
			allOkCallback();
		} else {
			$( '#mwe-upwiz-stepdiv-' + step + ' .mwe-upwiz-buttons' ).show().find( selector ).show();
		}
	},

	/**
	 * Count the number of empty (undefined) uploads in our list.
	 */
	countEmpties: function () {
		var count = 0;
		$.each( this.uploads, function ( i, upload ) {
			if ( mw.isEmpty( upload ) ) {
				count += 1;
			}
		} );
		return count;
	},

	/**
	 * Occurs whenever we need to update the interface based on how many files there are
	 * There is an uncounted upload, waiting to be used, which has a fileInput which covers the
	 * "add an upload" button. This is absolutely positioned, so it needs to be moved if another upload was removed.
	 * The uncounted upload is also styled differently between the zero and n files cases
	 *
	 * TODO in the case of aborting the only upload, we get kicked back here, but the file input over the add file
	 * button has been removed. How to get it back into "virginal" state?
	 */
	updateFileCounts: function() {
		var _this = this;

		// First reset the wizard buttons.
		_this.hideFileEndButtons();

		if ( _this.uploads.length - this.countEmpties() ) {
			// we have uploads ready to go, so allow us to proceed
			$( '#mwe-upwiz-upload-ctrl-container' ).show();
			$( '#mwe-upwiz-upload-ctr-divide' ).hide();

			if ( mw.UploadWizard.config.enableMultipleFiles === true ) {
				// changes the initial centered invitation button to something like "add another file"
				_this.$addFile = this.$addFile || $( '#mwe-upwiz-add-file' );
				_this.$addFile.button( 'option', 'label', mw.msg( 'mwe-upwiz-add-file-n' ) );
				$( '#mwe-upwiz-add-file, #mwe-upwiz-upload-ctrl-flickr' ).addClass( 'mwe-upwiz-add-files-n' );
				_this.$addFileContainer = this.$addFileContainer || $( '#mwe-upwiz-add-file-container' );
				_this.$addFileContainer.removeClass( 'mwe-upwiz-add-files-0' );
				_this.$addFileContainer.show();
				// changes the flickr add button to "add more files from flickr"
				$( '#mwe-upwiz-upload-ctrl-flickr' ).button( 'option', 'label', mw.msg( 'mwe-upwiz-add-file-flickr-n' ) );
				// show the add file interface
				$( '#mwe-upwiz-add-file-container' ).show();
				// if Flickr uploading is available to this user, show the "add more files from flickr" button
				if ( mw.UploadWizard.config.UploadFromUrl && mw.UploadWizard.config.flickrApiKey !== '' ) {
					$( '#mwe-upwiz-upload-ctrl-flickr-container' ).show();
				}
				// empty the flickr lists
				$( '#mwe-upwiz-flickr-select-list' ).empty();
				$( '#mwe-upwiz-flickr-select-list-container' ).unbind();
				$( '#mwe-upwiz-select-flickr' ).unbind();
			} else {
				_this.$addFile = this.$addFile || $( '#mwe-upwiz-add-file' );
				_this.$addFile.hide();
				_this.$fileInput = this.$fileInput || $( '.mwe-upwiz-file-input' );
				_this.$fileInput.hide();
				$( '#mwe-upwiz-upload-ctrl-flickr-container, #mwe-upwiz-flickr-select-list-container' ).hide();
			}

			// add the styling to the filelist, so it has rounded corners and is visible and all.
			$( '#mwe-upwiz-filelist' ).addClass( 'mwe-upwiz-filled-filelist' );

			// fix the rounded corners on file elements.
			// we want them to be rounded only when their edge touched the top or bottom of the filelist.
			$( '#mwe-upwiz-filelist .filled .mwe-upwiz-visible-file' ).removeClass( 'ui-corner-top' ).removeClass( 'ui-corner-bottom' );
			$( '#mwe-upwiz-filelist .filled .mwe-upwiz-visible-file:first' ).addClass( 'ui-corner-top' );
			$( '#mwe-upwiz-filelist .filled .mwe-upwiz-visible-file:last' ).addClass( 'ui-corner-bottom' );
			$( '#mwe-upwiz-filelist .filled:odd' ).addClass( 'odd' );
			$( '#mwe-upwiz-filelist .filled:even' ).removeClass( 'odd' );
		} else {
			// no uploads, so don't allow us to proceed
			$( '#mwe-upwiz-upload-ctrl-container' ).hide();

			// remove the border from the filelist. We can't hide it or make it invisible since it contains the displaced
			// file input element that becomes the "click here to add"
			$( '#mwe-upwiz-filelist' ).removeClass( 'mwe-upwiz-filled-filelist' );

			// we can't continue
			$( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons' ).hide();

			// destroy the flickr interface if it exists
			this.flickrInterfaceDestroy();

			// changes the button back from "add another file" to the initial centered invitation button
			$( '#mwe-upwiz-add-file' ).button( 'option', 'label', mw.msg( 'mwe-upwiz-add-file-0-free' ) );
			$( '#mwe-upwiz-upload-ctr-divide' ).show();
			// changes the button back from "add more files from flickr" to the initial text
			$( '#mwe-upwiz-upload-ctrl-flickr' ).button( 'option', 'label', mw.msg( 'mwe-upwiz-add-file-flickr' ) );
			$( '#mwe-upwiz-add-file, #mwe-upwiz-upload-ctrl-flickr' ).removeClass( 'mwe-upwiz-add-files-n' );
			$( '#mwe-upwiz-add-file-container' ).addClass( 'mwe-upwiz-add-files-0' );
			$( '#mwe-upwiz-add-file-container, #mwe-upwiz-upload-ctrl-flickr-container' ).show();

			// recovering from an earlier attempt to upload
			$( '#mwe-upwiz-upload-ctrls' ).show();
			$( '#mwe-upwiz-progress' ).hide();
			$( '#mwe-upwiz-add-file' ).show();

			// reset buttons on the details page
			$( '#mwe-upwiz-stepdiv-details .mwe-upwiz-file-next-some-failed' ).hide();
			$( '#mwe-upwiz-stepdiv-details .mwe-upwiz-file-next-all-failed' ).hide();
			$( '#mwe-upwiz-stepdiv-details .mwe-upwiz-start-next' ).show();

			// fix various other pages that may have state
			$( '#mwe-upwiz-thanks' ).html( '' );
			$( '#mwe-upwiz-flickr-select-list' ).empty();
			$( '#mwe-upwiz-flickr-select-list-container' ).unbind();
			$( '#mwe-upwiz-select-flickr' ).unbind();

			if ( _this.deedChooser !== undefined ) {
				_this.deedChooser.remove();
			}

			// remove any blocks on closing the window
			if ( _this.allowCloseWindow !== undefined ) {
				_this.allowCloseWindow();
			}

			_this.resetFileStepUploads();
			_this.moveToStep( 'file' );
		}

		// allow an "add another upload" button only if we aren't at max
		if ( _this.uploads.length < _this.maxUploads ) {
			$( '#mwe-upwiz-add-file' ).button( 'option', 'disabled', false );
			$( '#mwe-upwiz-upload-ctrl-flickr' ).button( 'option', 'disabled', false );
			$( _this.uploadToAdd.ui.div ).show();
			_this.uploadToAdd.ui.moveFileInputToCover( '#mwe-upwiz-add-file', 'resize' );
		} else {
			$( '#mwe-upwiz-add-file' ).button( 'option', 'disabled', true );
			$( '#mwe-upwiz-upload-ctrl-flickr' ).button( 'option', 'disabled', true );
			$( _this.uploadToAdd.ui.div ).hide();
			_this.uploadToAdd.ui.hideFileInput();
		}


	},


	/**
	 * are all the details valid?
	 * @return boolean
	 */
	detailsValid: function(cb, cberr) {
		var _this = this,
			valid = 0,
			necessary = 0,
			total = 0;
		$.each( _this.uploads, function(i, upload) {
			if ( upload === undefined ) {
				return;
			}
			total += 1;
			upload.details.valid( function () {
				valid += 1;
			});
			upload.details.necessaryFilled( function () {
				necessary += 1;
			});
		});

		// Set up buttons for dialog box. We have to do it the hard way since the json keys are localized
		var buttons = {};
		buttons[ mw.msg( 'mwe-upwiz-dialog-yes' ) ] = function() {
			$( this ).dialog( "close" );
			cb();
		};
		buttons[ mw.msg( 'mwe-upwiz-dialog-no' ) ] = function() {
			$( this ).dialog( "close" );
		};
		var confirmationDialog = $( '<div></div>' )
			.html( mw.msg( 'mwe-upwiz-necessary-confirm' ) )
			.dialog( {
				width: 500,
				zIndex: 200000,
				autoOpen: false,
				modal: true,
				buttons: buttons,
				title: mw.msg( 'mwe-upwiz-dialog-title' ),
				open: function () {
					$( this ).siblings( '.ui-dialog-buttonpane' ).find( 'button:eq(1)' ).focus();
				}
			} );
		if ( valid === total ) {
			if ( necessary === total ) {
				cb();
			} else {
				confirmationDialog.dialog( 'open' );
			}
		} else {
			cberr();
		}
	},

	/**
	 * Submit all edited details and other metadata
	 * Works just like startUploads -- parallel simultaneous submits with progress bar.
	 * @param {Function} endCallback - called when all uploads complete. In our case is probably a move to the next step
	 */
	detailsSubmit: function( endCallback ) {
		var _this = this;

		$.each( _this.uploads, function( i, upload ) {
			if ( upload === undefined ) {
				return;
			}
			// clear out error states, so we don't end up in an infinite loop
			if ( upload.state === 'error' ) {
				upload.state = 'details';
			}

			// set the "minimized" view of the details to have the right title
			$( upload.details.submittingDiv )
				.find( '.mwe-upwiz-visible-file-filename-text' )
				.html( upload.title.getMain() );
		} );

		// remove ability to edit details
		$( '#mwe-upwiz-stepdiv-details' )
			.find( '.mwe-upwiz-data' )
			.morphCrossfade( '.mwe-upwiz-submitting' );

		// hide errors ( assuming maybe this submission will fix it, if it hadn't blocked )
		$( '#mwe-upwiz-stepdiv-details' )
			.find( 'label.mwe-error' )
			.hide().empty();

		$( '#mwe-upwiz-stepdiv-details' )
			.find( 'input.mwe-error' )
			.removeClass( 'mwe-error' );

		// add the upload progress bar, with ETA
		// add in the upload count
		_this.makeTransitioner(
			'details',
			[ 'submitting-details' ],
			[ 'error', 'complete' ],
			function( upload ) {
				upload.details.submit();
			},
			endCallback /* called when all uploads are in a valid end state */
		);
	},

	/**
	 * The details page can be vertically long so sometimes it is not obvious there are errors above. This counts them and puts the count
	 * right next to the submit button, so it should be obvious to the user they need to fix things.
	 * This is a bit of a hack. The validator library actually already has a way to count errors but some errors are generated
	 * outside of that library. So we are going to just look for any visible inputs in an error state.
	 * This method also opens up "more info" if the form has errors.
	 */
	detailsErrorCount: function() {
		var $errorElements = $( '#mwe-upwiz-stepdiv-details' )
			.find( '.mwe-error:not(:empty):not(#mwe-upwiz-details-error-count), input.mwe-validator-error, textarea.mwe-validator-error' );

		// Open "more info" if that part of the form has errors
		$errorElements.each( function () {
			if ( $( this ).parents( '.mwe-more-details' ).length === 1 ) {
				var moreInfo = $( this ).parents( '.detailsForm' ).find( '.mwe-upwiz-details-more-options a' );
				if( !moreInfo.hasClass( "mwe-upwiz-toggler-open" ) ) {
					moreInfo.click();
				}
			}
		} );

		var errorCount = $errorElements.length;
		if ( errorCount > 0 ) {
			$( '#mwe-upwiz-details-error-count' ).msg( 'mwe-upwiz-details-error-count', errorCount, this.uploads.length );
			// Scroll to the first error
			$( 'html, body' ).animate( { scrollTop: $( $errorElements[0] ).offset().top - 50 }, 'slow' );
		} else {
			$( '#mwe-upwiz-details-error-count' ).empty();
		}
	},

	prefillThanksPage: function() {
		var _this = this;

		var thnxHeader = $( '<h3 style="text-align: center;"></h3>' );

		if ( mw.UploadWizard.config.thanksLabel === false ) {
			thnxHeader.msg( 'mwe-upwiz-thanks-intro' );
		}
		else {
			thnxHeader.html( mw.UploadWizard.config.display.thanksLabel );
		}

		$( '#mwe-upwiz-thanks' )
			.append(
				thnxHeader,
				$( '<p style="margin-bottom: 2em; text-align: center;">' )
					.msg( 'mwe-upwiz-thanks-explain', _this.uploads.length )
			);

		$.each( _this.uploads, function(i, upload) {
			if ( upload === undefined ) {
				return;
			}
			var id = 'thanksDiv' + i;
			var $thanksDiv = $( '<div></div>' ).attr( 'id', id ).addClass( "mwe-upwiz-thanks ui-helper-clearfix" );
			_this.thanksDiv = $thanksDiv;


			var $thumbnailDiv = $( '<div></div>' ).addClass( 'mwe-upwiz-thumbnail' );
			var $thumbnailCaption = $( '<div></div>' )
				.css( { 'text-align': 'center', 'font-size': 'small' } )
				.html( $( '<a/>' ).html( upload.title.getMainText() ) );
			var $thumbnailWrapDiv = $( '<div></div>' ).addClass( 'mwe-upwiz-thumbnail-side' );
			$thumbnailWrapDiv.append( $thumbnailDiv, $thumbnailCaption );
			upload.setThumbnail(
				$thumbnailDiv,
				mw.UploadWizard.config.thumbnailWidth,
				mw.UploadWizard.config.thumbnailMaxHeight,
				false
			);

			// Set the thumbnail links so that they point to the image description page
			$thumbnailWrapDiv.find( 'a' ).attr( {
				'href': upload.imageinfo.descriptionurl,
				'target' : '_blank'
			} );
			$thanksDiv.append( $thumbnailWrapDiv );

			var thumbWikiText = "[[" + upload.title.toText() + "|thumb|" + upload.details.descriptions[0].getText() + "]]";

			$thanksDiv.append(
				$( '<div class="mwe-upwiz-data"></div>' )
					.append(
						$('<p/>').append(
							mw.msg( 'mwe-upwiz-thanks-wikitext' ),
							$( '<br />' ),
							_this.makeReadOnlyInput( thumbWikiText )
						),
						$('<p/>').append(
							mw.msg( 'mwe-upwiz-thanks-url' ),
							$( '<br />' ),
							_this.makeReadOnlyInput( upload.imageinfo.descriptionurl )
						)
					)
			);

			$( '#mwe-upwiz-thanks' ).append( $thanksDiv );
		} );
	},

	/**
	 * make a read only text input, which self-selects on gaining focus
	 * @param {String} text it will contain
	 */
	makeReadOnlyInput: function ( s ) {
		return $( '<input/>' ).addClass( 'mwe-title ui-corner-all' )
			.readonly()
			.val( s )
			.click( function() {
				this.focus();
				this.select();
			} );
	},

	/**
	 * Set the skip tutorial user preference via the options API
	 */
	setSkipTutorialPreference: function() {

		var _this = this;
		var tokenRequest = {
			'action': 'tokens',
			'type' : 'options'
		};
		var prefRequest = {
			'action': 'options',
			'change': 'upwiz_skiptutorial=1'
		};

		_this.api.post( tokenRequest,
			function( data ) {
				var token;
				try {
					token = data.tokens.optionstoken;
				} catch ( e ) {
					throw new Error( 'Could not get token to set user preferences (requires MediaWiki 1.20).' );
				}
				prefRequest.token = token;
				_this.api.post( prefRequest, function() { return true; } );
			}
		);

	},

	/**
	 *
	 */
	pause: function() {

	},

	/**
	 *
	 */
	stop: function() {

	}

};

/**
 * Makes a modal dialog to confirm deletion of one or more uploads. Will have "Remove" and "Cancel" buttons
 * @param {Array} array of UploadWizardUpload objects
 * @param {String} message for dialog title
 * @param {String} message for dialog text, which will precede an unordered list of upload titles.
 */
mw.UploadWizardDeleteDialog = function( uploads, dialogTitle, dialogText ) {
	var $filenameList = $( '<ul></ul>' );
	$.each( uploads, function( i, upload ) {
		if ( upload === undefined ) {
			return;
		}
		$filenameList.append( $( '<li></li>' ).append( upload.title.getMain() ) );
	} );
	var buttons = {};
	buttons[ mw.msg( 'mwe-upwiz-remove', uploads.length ) ] = function() {
		$.each( uploads, function( i, upload ) {
			if ( upload === undefined ) {
				return;
			}
			upload.remove();
		} );
		$( this ).dialog( 'close' );
	};
	buttons[ mw.msg( 'mwe-upwiz-cancel', uploads.length ) ] = function() {
		$( this ).dialog( 'close' );
	};

	return $( '<div></div>' )
		.append( $( '<p></p>' ).append( dialogText ), $filenameList )
		.dialog( {
			width: 500,
			zIndex: 200000,
			autoOpen: false,
			title: dialogTitle,
			modal: true,
			buttons: buttons
		} );
};


mw.UploadWizardDeedPreview = function(upload) {
	this.upload = upload;
};

mw.UploadWizardDeedPreview.prototype = {

	setup: function() {
		// prepare a preview on the deeds page
		this.$thumbnailDiv = $( '<div></div>' ).addClass( 'mwe-upwiz-thumbnail' );
		this.upload.setThumbnail(
			this.$thumbnailDiv,
			mw.UploadWizard.config.thumbnailWidth,
			mw.UploadWizard.config.thumbnailMaxHeight,
			true
		);
	},

	remove: function() {
		if ( this.$thumbnailDiv ) {
			this.$thumbnailDiv.remove();
		}
	},

	// Has this preview been attached to the DOM already?
	isAttached: false,

	/*
	 * Append the div for this preview object to the DOM.
	 * We need to ensure that we add thumbs in the right order
	 * (the order in which the user selected files).
	 *
	 * Will only append once.
	 */
	attach: function() {
		if ( !this.isAttached ) {
			$( '#mwe-upwiz-deeds-thumbnails' ).append( this.$thumbnailDiv );
			this.isAttached = true;
		}
	}
};

/**
 * Check if a value is null, undefined, or the empty string.
 *
 * @param {mixed} v Variable to be checked
 * @return {boolean}
 */
mw.isEmpty = function( v ) {
	return v === undefined || v === null || v === '';
};

} )( window.mediaWiki, jQuery );

( function ( $ ) {

	$.fn.notify = function ( message ) {
		// could do something here with Chrome's in-browser growl-like notifications.
		// play a sound?
		// if the current tab does not have focus, use an alert?
		// alert( message );
	};

	$.fn.enableNextButton = function() {
		return this.find( '.mwe-upwiz-button-next' )
			.removeAttr( 'disabled' );
		//	.effect( 'pulsate', { times: 3 }, 1000 );
	};

	$.fn.disableNextButton = function() {
		return this.find( '.mwe-upwiz-button-next' )
			.attr( 'disabled', true );
	};

	$.fn.readonly = function() {
		return this.attr( 'readonly', 'readonly' ).addClass( 'mwe-readonly' );
	};

	/* will change in RTL, but I can't think of an easy way to do this with only CSS */
	$.fn.requiredFieldLabel = function() {
		this.addClass( 'mwe-upwiz-required-field' );
		return this.prepend( $( '<span/>' ).append( '*' ).addClass( 'mwe-upwiz-required-marker' ) );
	};

	/**
	 * Adds a tipsy pop-up help button to the field. Can be called in two ways -- with simple string id, which identifies
	 * the string as 'mwe-upwiz-tooltip-' plus that id, and creates the hint with a similar id
	 * or with function and id -- function will be called to generate the hint every time
	 * TODO v1.1 split into two plugins?
	 * @param key {string}  -- will base the tooltip on a message found with this key
	 * @param fn {function} optional -- call this function every time tip is created to generate message. If present HTML element gets an id of the exact key specified
	 */
	$.fn.addHint = function( key, fn ) {
		var attrs, contentSource, html = false;
		if ( typeof fn === 'function' ) {
			attrs = { id: key };
			contentSource = fn;
			html = true;
		} else {
			attrs = { 'title': mw.msg( 'mwe-upwiz-tooltip-' + key ) };
			contentSource = 'title';
		}
		return this.append(
			$( '<span/>' )
				.addClass( 'mwe-upwiz-hint' )
				.attr( attrs )
				.click( function() {
					if ( !this.displayed ) {
						$ ( this ).tipsy( 'show' );
						this.displayed = true;
					} else {
						$ ( this ).tipsy( 'hide' );
						this.displayed = false;
					}
					return false;
				} )
				.tipsy( { title: contentSource, html: html, opacity: 1.0, gravity: 'sw', trigger: 'manual'} )
		);
	};

	/**
	 * jQuery extension. Makes a textarea automatically grow if you enter overflow
	 * (This feature was in the old Commons interface with a confusing arrow icon; it's nicer to make it automatic.)
	 */
	jQuery.fn.growTextArea = function( options ) {

		// this is a jquery-style object

		// in MSIE, this makes it possible to know what scrollheight is
		// Technically this means text could now dangle over the edge,
		// but it shouldn't because it will always grow to accomodate very quickly.

		if ($.msie) {
			this.each( function(i, textArea) {
				textArea.style.overflow = 'visible';
			} );
		}

		var resizeIfNeeded = function() {
			// this is the dom element
			// is there a better way to do this?
			if (this.scrollHeight >= this.offsetHeight) {
				this.rows++;
				while (this.scrollHeight > this.offsetHeight) {
					this.rows++;
				}
			}
		};

		this.addClass( 'mwe-grow-textarea' );

		this.bind( 'resizeEvent', resizeIfNeeded );

		this.keyup( resizeIfNeeded );
		this.change( resizeIfNeeded );


		return this;
	};

	// XXX this is highly specific to the "details" page now, not really jQuery function
	jQuery.fn.mask = function( options ) {

		// intercept clicks...
		// Note: the size of the div must be obtainable. Hence, this cannot be a div without layout (e.g. display:none).
		// some of this is borrowed from http://code.google.com/p/jquery-loadmask/ , but simplified
		$.each( this, function( i, el ) {

			if ( ! $( el ).data( 'mask' ) ) {


				//fix for z-index bug with selects in IE6
				if ( $.browser.msie && $.browser.version.substring(0,1) === '6' ){
					$( el ).find( "select" ).addClass( "masked-hidden" );
				}

				var mask = $( '<div class="mwe-upwiz-mask"></div>' )
						.css( {
							'backgroundColor' : 'white',
							'width'    : el.offsetWidth + 'px',
							'height'   : el.offsetHeight + 'px',
							'z-index'  : 90
						} );

				var $statusDiv = $( '<div></div>' ).css( {
					'width'      : el.offsetWidth + 'px',
					'height'     : el.offsetHeight + 'px',
					'z-index'    : 91,
					'text-align' : 'center',
					'position'   : 'absolute',
					'top'        : '0px',
					'left'       : '0px'
				} );

				var $indicatorDiv = $( '<div class="mwe-upwiz-status"></div>' )
					.css( {
						'width'    : 32,
						'height'   : 32,
						'z-index'  : 91,
						'margin'   : '0 auto 0 auto'
					} );
				var $statusLineDiv = $( '<div></div>' )
					.css( {
						'z-index'  : 91
					} );
				var $statusIndicatorLineDiv = $( '<div></div>' )
					.css( { 'margin-top': '6em' } )
					.append( $indicatorDiv, $statusLineDiv );
				$statusDiv.append( $statusIndicatorLineDiv );

				$( el ).css( { 'position' : 'relative' } )
					.append( mask.fadeTo( 'fast', 0.6 ) )
					.append( $statusDiv )
					.data( 'indicator', $indicatorDiv )
					.data( 'statusLine', $statusLineDiv );

			}
		} );

		return this;

	};

	// n.b. this is not called currently -- all uses of mask() are permanent
	jQuery.fn.unmask = function( options ) {

		$.each( this, function( i, el ) {
			if ( $( el ).data( 'mask' ) ) {
				var mask = $( el ).data( 'mask' );
				$( el ).removeData( 'mask' ); // from the data
				mask.remove(); // from the DOM
				$( el ).fadeTo( 'fast', 1.0 );
			}
		} );


		return this;
	};

	/**
	 * jQuery plugin - collapse toggle
	 * Given an element, makes contained elements of class mw-collapsible-toggle clickable to show/reveal
	 * contained element(s) of class mw-collapsible-content.
	 *
	 * Somewhat recapitulates mw.UploadWizardUtil.makeToggler,
	 * toggle() in vector.collapsibleNav.js, not to mention jquery.collapsible
	 * but none of those do what we want, or are inaccessible to us
	 *
	 * TODO: needs to iterate through elements, if we want to apply toggling behavior to many elements at once
	 * TODO: add a method to open and close besides clicking
	 */
	jQuery.fn.collapseToggle = function() {
		var $el = this;
		var $contents = $el.find( '.mwe-upwiz-toggler-content' ).hide();
		var $toggle = $el.find( '.mwe-upwiz-toggler' ).addClass( 'mwe-upwiz-more-options' );
		$el.data( 'open', function() {
			$contents.slideDown( 250 );
			$toggle.addClass( 'mwe-upwiz-toggler-open' );
		} );
		$el.data( 'close', function() {
			$contents.slideUp( 250 );
			$toggle.removeClass( 'mwe-upwiz-toggler-open' );
		} );
		$toggle.click( function( e ) {
			e.stopPropagation();
			if ( $toggle.hasClass( 'mwe-upwiz-toggler-open' ) ) {
				$el.data( 'close' )();
			} else {
				$el.data( 'open' )();
			}
		} );
		return this;
	};

	$.validator.setDefaults( {
		debug: true,
		errorClass: 'mwe-validator-error'
	} );

} )( jQuery );
