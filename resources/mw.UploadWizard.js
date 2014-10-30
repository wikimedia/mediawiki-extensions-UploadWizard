/**
* Object that reperesents the entire multi-step Upload Wizard
*/

( function ( mw, uw, $ ) {

	mw.UploadWizard = function ( config ) {
		this.uploads = [];
		this.api = new mw.Api( { ajax: { timeout: 0 } } );

		// making a sort of global for now, should be done by passing in config or fragments of config when needed
		// elsewhere
		mw.UploadWizard.config = config;

		// XXX need a robust way of defining default config
		this.maxUploads = mw.UploadWizard.config.maxUploads || 10;

		var maxSimPref = mw.user.options.get( 'upwiz_maxsimultaneous' ),
			wizard = this;

		if ( maxSimPref === 'default' ) {
			this.maxSimultaneousConnections = mw.UploadWizard.config.maxSimultaneousConnections;
		} else if ( maxSimPref > 0 ) {
			this.maxSimultaneousConnections = maxSimPref;
		} else {
			this.maxSimultaneousConnections = 1;
		}

		this.makePreviewsFlag = true;
		this.showDeed = false;

		this.steps = {
			tutorial: new uw.controller.Tutorial( this.api )
				.on( 'next-step', function () {
					wizard.moveToStep( 'file' );
				} ),
			file: new uw.controller.Upload(),
			deeds: new uw.controller.Deed(),
			details: new uw.controller.Details(),
			thanks: new uw.controller.Thanks()
		};
	};

	mw.UploadWizard.DEBUG = true;

	mw.UploadWizard.userAgent = 'UploadWizard';

	mw.UploadWizard.prototype = {
		stepNames: [ 'tutorial', 'file', 'deeds', 'details', 'thanks' ],
		currentStepName: undefined,

		/**
		 * Reset the entire interface so we can upload more stuff
		 * (depends on updateFileCounts to reset the interface when uploads go down to 0)
		 * Depending on whether we split uploading / detailing, it may actually always be as simple as loading a URL
		 */
		reset: function () {
			mw.UploadWizardUpload.prototype.count = -1; // this is counterintuitive, but the count needs to start at -1 to allow for the empty upload created on the first step.
			this.showDeed = false;
			$.purgeReadyEvents();
			$.purgeSubscriptions();
			this.removeMatchingUploads( function () { return true; } );
			this.moveToStep( 'file' );
		},

		/**
		 * create the basic interface to make an upload in this div
		 */
		createInterface: function () {
			var wizard = this;

			function finalizeDetails() {
				if ( wizard.allowCloseWindow !== undefined ) {
					wizard.allowCloseWindow();
				}
				wizard.moveToStep( 'thanks' );
			}

			this.ui = new uw.ui.Wizard( this )
				.on( 'reset-wizard', function () {
					wizard.reset();
				} )

				.on( 'upload-start', function () {
					// check if there is an upload at all (should never happen)
					if ( wizard.uploads.length === 0 ) {
						$( '<div>' )
							.text( mw.message( 'mwe-upwiz-file-need-file' ).text() )
							.dialog( {
								width: 500,
								zIndex: 200000,
								autoOpen: true,
								modal: true
							} );
						return;
					}

					wizard.removeEmptyUploads();
					wizard.startUploads();
				} )

				.on( 'flickr-ui-init', function () {
					wizard.flickrInterfaceInit();
					uw.eventFlowLogger.logEvent( 'flickr-upload-button-clicked' );
				} )

				.on( 'retry-uploads', function () {
					uw.eventFlowLogger.logEvent( 'retry-uploads-button-clicked' );
					wizard.ui.hideFileEndButtons();
					wizard.startUploads();
				} )

				.on( 'next-from-upload', function () {
					wizard.removeErrorUploads( function () {
						if ( wizard.showDeed ) {
							wizard.prepareAndMoveToDeeds();
						} else {
							wizard.moveToStep( 'details' );
						}
					} );
				} )

				.on( 'next-from-deeds', function () {
					// validate has the side effect of notifying the user of problems, or removing existing notifications.
					// if returns false, you can assume there are notifications in the interface.
					if ( wizard.deedChooser.valid() ) {
						wizard.moveToStep( 'details' );
					}
				} )

				.on( 'start-details', function () {
					wizard.detailsValid( function () {
						wizard.ui.hideDetailsEndButtons();
						wizard.detailsSubmit( function () {
							wizard.detailsErrorCount();
							wizard.showNext( 'details', 'complete', finalizeDetails );
						} );
					}, function () {
						wizard.detailsErrorCount();
					} );
				} )

				.on( 'finalize-details-after-removal', function () {
					wizard.removeErrorUploads( finalizeDetails );
				} );

			// check to see if the the skip tutorial preference or global setting is set
			if (
				mw.user.options.get( 'upwiz_skiptutorial' ) ||
				( mw.config.get( 'UploadWizardConfig' ).tutorial && mw.config.get( 'UploadWizardConfig' ).tutorial.skip )
			) {
				// "select" the second step - highlight, make it visible, hide all others
				this.moveToStep( 'file' );
			} else {
				// "select" the first step - highlight, make it visible, hide all others
				this.moveToStep( 'tutorial' );
				( new mw.UploadWizardTutorialEvent( 'load' ) ).dispatch();
			}
		},

		/**
		 * Initiates the Interface to upload media from Flickr.
		 * Called when the user clicks on the 'Add images from Flickr' button.
		 */
		flickrInterfaceInit: function () {
			var $disclaimer,
				wizard = this,
				checker = new mw.FlickrChecker( this, this.upload ),
				// The input that will hold a flickr URL entered by the user; will be appended to a form
				$flickrInput = $( '<input id="mwe-upwiz-flickr-input" class="ui-helper-center-fix" type="text" />' ),
				// A container holding a form
				$flickrContainer = $( '<div id="mwe-upwiz-upload-add-flickr-container"></div>' ),
				// Form whose submit event will be listened to and prevented
				$flickrForm = $( '<form id="mwe-upwiz-flickr-url-form"></form>' )
					.appendTo( $flickrContainer ),
				// Submit button to be clicked after entering the URL
				$flickrButton = $( '<button id="mwe-upwiz-upload-add-flickr" class="ui-helper-center-fix" type="submit"></button>' )
					.appendTo( $flickrForm );

			// Hide containers for selecting files
			$( '#mwe-upwiz-add-file-container, #mwe-upwiz-upload-ctrl-flickr-container' ).hide();
			$( wizard.uploadToAdd.ui.div ).hide();
			wizard.uploadToAdd.ui.hideFileInput();

			// Add placeholder text to the Flickr URL input field
			$flickrInput.placeholder( mw.message( 'mwe-upwiz-flickr-input-placeholder' ).escaped() );

			// Insert form into the page
			$( '#mwe-upwiz-files' ).prepend( $flickrContainer );

			// Add disclaimer
			$disclaimer = mw.message( 'mwe-upwiz-flickr-disclaimer1' ).parse() +
				'<br/>' + mw.message( 'mwe-upwiz-flickr-disclaimer2' ).parse();
			$disclaimer = $( '<div id="mwe-upwiz-flickr-disclaimer"></div>' ).html( $disclaimer );
			$( '#mwe-upwiz-upload-add-flickr-container' ).append( $disclaimer );

			// Insert input field into the form and set up submit action
			$flickrForm.prepend( $flickrInput ).submit( function () {
				$flickrButton.prop( 'disabled', true );
				wizard.flickrChecker( checker );
				// TODO Any particular reason to stopPropagation ?
				return false;
			} );

			// Set up the submit button
			$flickrButton.button( { label: mw.message( 'mwe-upwiz-add-flickr' ).escaped() } );

			$flickrInput.focus();
		},

		/**
		 * Responsible for fetching license of the provided media.
		 */
		flickrChecker: function ( checker ) {
			var flickrInputUrl = $( '#mwe-upwiz-flickr-input' ).val();
			checker.getLicenses();
			$( '#mwe-upwiz-flickr-select-list-container' ).bind( 'licenselistfilled', function () {
				checker.checkFlickr( flickrInputUrl );
			} );
		},

		/**
		 * Reset the interface if there is a problem while fetching the images from the URL entered by the user.
		 */
		flickrInterfaceReset: function () {
			// first destroy it completely, then reshow the add button
			this.flickrInterfaceDestroy();
			$( '#mwe-upwiz-upload-add-flickr-container' ).show();
			$( '#mwe-upwiz-upload-add-flickr' ).prop( 'disabled', false );
		},

		/**
		 * Removes the flickr interface.
		 */
		flickrInterfaceDestroy: function () {
			$( '#mwe-upwiz-flickr-input' ).val( '' );
			$( '#mwe-upwiz-flickr-select-list' ).empty();
			$( '#mwe-upwiz-flickr-select-list-container' ).unbind();
			$( '#mwe-upwiz-select-flickr' ).unbind();
			$( '#mwe-upwiz-flickr-select-list-container' ).hide();
			$( '#mwe-upwiz-upload-add-flickr-container' ).hide();
			$( '#mwe-upwiz-upload-add-flickr' ).prop( 'disabled', true );
		},

		/**
		 * Get the own work and third party licensing deeds if they are needed.
		 *
		 * @since 1.2
		 * @param {int|false} uploadsLength
		 * @return {Array}
		 */
		getLicensingDeeds: function ( uploadsLength ) {
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
		prepareAndMoveToDeeds: function () {
			var customDeed,
				wizard = this,
				deeds = this.getLicensingDeeds( this.uploads.length );

			this.shouldShowIndividualDeed = function () {
				if ( mw.UploadWizard.config.licensing.ownWorkDefault === 'choice' ) {
					return true;
				} else if ( mw.UploadWizard.config.licensing.ownWorkDefault === 'own' ) {
					var ownWork = mw.UploadWizard.config.licensing.ownWork;
					return ownWork.licenses.length > 1;
				} else {
					return true; // TODO: might want to have similar behaviour here
				}
			};

			// if we have multiple uploads, also give them the option to set
			// licenses individually
			if ( this.uploads.length > 1 && this.shouldShowIndividualDeed() ) {
				customDeed = $.extend( new mw.UploadWizardDeed(), {
					valid: function () { return true; },
					name: 'custom'
				} );
				deeds.push( customDeed );
			}

			this.deedChooser = new mw.UploadWizardDeedChooser(
				'#mwe-upwiz-deeds',
				deeds,
				this.uploads
			);

			$( '<div></div>' )
				.insertBefore( this.deedChooser.$selector.find( '.mwe-upwiz-deed-ownwork' ) )
				.msg( 'mwe-upwiz-deeds-macro-prompt', this.uploads.length, mw.user );

			this.moveToStep( 'deeds', function () { wizard.deedChooser.onLayoutReady(); } );
		},

		/**
		 * Advance one "step" in the wizard interface.
		 * It is assumed that the previous step to the current one was selected.
		 * We do not hide the tabs because this messes up certain calculations we'd like to make about dimensions, while elements are not
		 * on screen. So instead we make the tabs zero height and, in CSS, they are already overflow hidden
		 * @param selectedStepName
		 * @param callback to do after layout is ready?
		 */
		moveToStep: function ( selectedStepName, callback ) {
			if ( this.currentStepName === selectedStepName ) {
				// already there!
				return;
			}

			// scroll to the top of the page (the current step might have been very long, vertically)
			var headScroll = $( 'h1:first' ).offset(),
				fromStep = this.steps[this.currentStepName],
				targetStep = this.steps[selectedStepName];

			if ( fromStep ) {
				fromStep.moveFrom( this.uploads );
			}

			targetStep.moveTo( this.uploads );

			$( 'html, body' ).animate( { scrollTop: headScroll.top, scrollLeft: headScroll.left }, 'slow' );

			if (
				selectedStepName === 'file' &&
				( !this.currentStepName || this.currentStepName === 'thanks' )
			) { // tutorial was skipped
				uw.eventFlowLogger.logSkippedStep( 'tutorial' );
			}

			uw.eventFlowLogger.logStep( selectedStepName );

			this.currentStepName = selectedStepName;

			if ( selectedStepName === 'file' ) {
				this.resetFileStepUploads();
			}

			$.each( this.uploads, function (i, upload) {
				if ( upload === undefined ) {
					return;
				}
				upload.state = selectedStepName;
			} );

			this.currentStepObject = targetStep;

			if ( callback ) {
				callback();
			}
		},

		/**
		 * If there are no uploads, make a new one
		 */
		resetFileStepUploads: function () {
			if ( this.uploads.length === 0 ) {
				// add one upload field to start (this is the big one that asks you to upload something)
				this.newUpload();
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
		 *
		 * @return the new upload
		 */
		newUpload: function ( providedFile ) {
			var upload,
				wizard = this;

			if ( this.uploads.length >= this.maxUploads ) {
				return false;
			}

			upload = new mw.UploadWizardUpload( this, '#mwe-upwiz-filelist', providedFile )
				.on( 'file-changed', function ( files ) {
					uw.eventFlowLogger.logUploadEvent( 'uploads-added', { quantity: files.length } );
				} )

				.on( 'filled', function () {
					wizard.setUploadFilled( upload );
				} )

				.on( 'error', function ( code, message ) {
					uw.eventFlowLogger.logError( 'file', { code: code, message: message } );
				} );

			this.uploadToAdd = upload;

			// we explicitly move the file input to cover the upload button
			upload.ui.moveFileInputToCover( '#mwe-upwiz-add-file', 'poll' );

			upload.connect( this, {
				'filename-accepted': 'updateFileCounts',
				'remove-upload': [ 'removeUpload', upload ]
			} );

			return upload;
		},

		/**
		 * When an upload is filled with a real file, accept it in the wizard's list of uploads
		 * and set up some other interfaces
		 * @param UploadWizardUpload
		 */
		setUploadFilled: function ( upload ) {
			var wizard = this;

			// Create new upload slot for additional upload(s)
			this.newUpload();

			this.uploads.push( upload );

			//If upload is through a local file, then we need to show the Deeds step of the wizard
			if ( !upload.fromURL ) {
				this.showDeed = true;
			}

			this.updateFileCounts();

			if ( mw.UploadWizard.config.startImmediately === true ) {
				// Start uploads now, no reason to wait--leave the remove button alone
				this.makeTransitioner(
					'new',
					[ 'transporting', 'transported', 'metadata' ],
					[ 'error', 'stashed' ],
					function ( upload ) {
						upload.start();
					},
					function () {
						wizard.showNext( 'file', 'stashed' );
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
		removeUpload: function ( upload ) {
			// remove the div that passed along the trigger
			var $div = $( upload.ui.div );

			$div.unbind(); // everything
			$div.remove();
			// and do what we in the wizard need to do after an upload is removed
			this.uploads = $.grep(
				this.uploads,
				function ( u ) {
					return u !== upload;
				}
			);

			this.updateFileCounts();
		},

		/**
		 * This is useful to clean out unused upload file inputs if the user hits GO.
		 * We are using a second array to iterate, because we will be splicing the main one, _this.uploads
		 */
		removeEmptyUploads: function () {

			// First remove array keys that don't have an assigned upload object
			this.uploads = $.grep( this.uploads,
				function ( v ) { return v !== undefined; }
			);

			// Now remove upload objects that exist but are empty
			this.removeMatchingUploads( function ( upload ) {
				return mw.isEmpty( upload.filename );
			} );
		},

		/**
		 * Clear out uploads that are in error mode, perhaps before proceeding to the next step
		 * @param {Function} to be called when done
		 */
		removeErrorUploads: function ( endCallback ) {
			this.removeMatchingUploads( function ( upload ) {
				return upload.state === 'error';
			} );
			endCallback();
		},

		/**
		 * This is useful to clean out file inputs that we don't want for some reason (error, empty...)
		 * We are using a second array to iterate, because we will be splicing the main one, _this.uploads
		 * @param Function criterion: function to test the upload, returns boolean; true if should be removed
		 */
		removeMatchingUploads: function ( criterion ) {
			var toRemove = [];

			$.each( this.uploads, function ( i, upload ) {
				if ( upload === undefined ) {
					return;
				}
				if ( criterion( upload ) ) {
					toRemove.push( upload );
				}
			} );

			$.each( toRemove, function ( i, upload ) {
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
		makeTransitioner: function ( beginState, progressStates, endStates, starter, endCallback ) {
			var nextAction,
				uploadsToStart = this.maxSimultaneousConnections,
				wizard = this,
				endStateCount = 0;

			$.each( this.uploads, function (i, upload) {
				if ( upload === undefined ) {
					return;
				}
				if ( $.inArray( upload.state, endStates ) !== -1 ) {
					endStateCount++;
				} else if ( $.inArray( upload.state, progressStates ) !== -1 ) {
					uploadsToStart--;
				} else if ( ( upload.state === beginState ) && ( uploadsToStart > 0 ) ) {
					starter( upload );
					uploadsToStart--;
				}
			} );

			// build in a little delay even for the end state, so user can see progress bar in a complete state.
			if ( endStateCount === this.uploads.length - this.countEmpties() ) {
				nextAction = endCallback;
			} else {
				// Function.prototype.bind is not used because it is not supported by IE 8
				nextAction = function () {
					wizard.makeTransitioner( beginState, progressStates, endStates, starter, endCallback );
				};
			}

			setTimeout( nextAction, this.transitionerDelay );
		},

		transitionerDelay: 200,  // milliseconds

		startProgressBar: function () {
			$( '#mwe-upwiz-progress' ).show();
			this.progressBar = new mw.GroupProgressBar( '#mwe-upwiz-progress',
				mw.message( 'mwe-upwiz-uploading' ).escaped(),
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
		startUploads: function () {
			var wizard = this;
			// remove the upload button, and the add file button
			$( '#mwe-upwiz-upload-ctrls' ).hide();
			this.ui.hideFileEndButtons();
			$( '#mwe-upwiz-add-file' ).hide();

			// reset any uploads in error state back to be shiny & new
			$.each( this.uploads, function ( i, upload ) {
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
				message: function () { return mw.message( 'mwe-upwiz-prevent-close', wizard.uploads.length ).escaped(); },
				test: function () { return !wizard.isComplete() && wizard.uploads.length > 0; }
			} );

			$( '#mwe-upwiz-progress' ).show();
			this.progressBar = new mw.GroupProgressBar( '#mwe-upwiz-progress',
				mw.message( 'mwe-upwiz-uploading' ).escaped(),
				this.uploads,
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

			this.makeTransitioner(
				'new',
				[ 'transporting', 'transported', 'metadata' ],
				[ 'error', 'stashed' ],
				function ( upload ) {
					upload.start();
				},
				function () {
					wizard.showNext( 'file', 'stashed' );
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
		showNext: function ( step, desiredState, allOkCallback ) {
			var errorCount = 0,
				okCount = 0,
				stillGoing = 0,
				selector = null,
				allOk = false;

			// abort if all uploads have been removed
			if ( this.uploads.length === 0 ) {
				return;
			}

			$.each( this.uploads, function ( i, upload ) {
				if ( upload === undefined ) {
					return;
				}
				if ( upload.state === 'error' ) {
					errorCount++;
				} else if ( upload.state === desiredState ) {
					okCount++;
				} else if ( upload.state === 'transporting' ) {
					stillGoing += 1;
				}
			} );

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
		 * Occurs whenever we need to update the interface based on how many files there are.
		 * There is an uncounted upload, waiting to be used, which has a fileInput which covers the
		 * "add an upload" button. This is absolutely positioned, so it needs to be moved if another upload was removed.
		 * The uncounted upload is also styled differently between the zero and n files cases
		 *
		 * TODO in the case of aborting the only upload, we get kicked back here, but the file input over the add file
		 * button has been removed. How to get it back into "virginal" state?
		 */
		updateFileCounts: function () {
			// First reset the wizard buttons.
			this.ui.hideFileEndButtons();

			this.currentStepObject.updateFileCounts( ( this.uploads.length - this.countEmpties() ) > 0, this.maxUploads, this.uploadToAdd );

			if ( this.uploads.length - this.countEmpties() <= 0 ) {
				// destroy the flickr interface if it exists
				this.flickrInterfaceDestroy();

				// fix various other pages that may have state
				$.each( this.steps, function ( i, step ) {
					step.empty();
				} );

				if ( this.deedChooser !== undefined ) {
					this.deedChooser.remove();
				}

				// remove any blocks on closing the window
				if ( this.allowCloseWindow !== undefined ) {
					this.allowCloseWindow();
				}

				this.resetFileStepUploads();
				this.moveToStep( 'file' );
			}
		},

		/**
		 * are all the details valid?
		 * @return boolean
		 */
		detailsValid: function (cb, cberr) {
			var confirmationDialog, title,
				valid = 0,
				necessary = 0,
				total = 0,
				buttons = {},
				titles = {};

			$.each( this.uploads, function (i, upload) {
				if ( upload === undefined ) {
					return;
				}
				total += 1;

				upload.details.clearDuplicateTitleError().valid( function () {
					title = upload.title.getName();

					// Seen this title before?
					if ( titles[title] ) {

						// Don't submit. Instead, set an error in details step.
						upload.details.setDuplicateTitleError();
						return;
					} else {
						titles[title] = true;
					}
					valid += 1;
				} );
				upload.details.necessaryFilled( function () {
					necessary += 1;
				} );
			} );

			// Set up buttons for dialog box. We have to do it the hard way since the json keys are localized
			buttons[ mw.message( 'mwe-upwiz-dialog-yes' ).escaped() ] = function () {
				$( this ).dialog( 'close' );
				cb();
			};
			buttons[ mw.message( 'mwe-upwiz-dialog-no' ).escaped() ] = function () {
				$( this ).dialog( 'close' );
			};
			confirmationDialog = $( '<div></div>' )
				.text( mw.message( 'mwe-upwiz-necessary-confirm' ).text() )
				.dialog( {
					width: 500,
					zIndex: 200000,
					autoOpen: false,
					modal: true,
					buttons: buttons,
					title: mw.message( 'mwe-upwiz-dialog-title' ).escaped(),
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
		detailsSubmit: function ( endCallback ) {
			$.each( this.uploads, function ( i, upload ) {
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
			this.makeTransitioner(
				'details',
				[ 'submitting-details' ],
				[ 'error', 'complete' ],
				function ( upload ) {
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
		detailsErrorCount: function () {
			var errorCount,
				$errorElements = $( '#mwe-upwiz-stepdiv-details' )
					.find( '.mwe-error:not(:empty):not(#mwe-upwiz-details-error-count), input.mwe-validator-error, textarea.mwe-validator-error' );

			// Open "more info" if that part of the form has errors
			$errorElements.each( function () {
				if ( $( this ).parents( '.mwe-more-details' ).length === 1 ) {
					var moreInfo = $( this ).parents( '.detailsForm' ).find( '.mwe-upwiz-details-more-options a' );
					if ( !moreInfo.hasClass( 'mwe-upwiz-toggler-open' ) ) {
						moreInfo.click();
					}
				}
			} );

			errorCount = $errorElements.length;
			if ( errorCount > 0 ) {
				$( '#mwe-upwiz-details-error-count' ).msg( 'mwe-upwiz-details-error-count', errorCount, this.uploads.length );
				// Scroll to the first error
				$( 'html, body' ).animate( { scrollTop: $( $errorElements[0] ).offset().top - 50 }, 'slow' );
			} else {
				$( '#mwe-upwiz-details-error-count' ).empty();
			}
		}
	};

	/**
	 * Makes a modal dialog to confirm deletion of one or more uploads. Will have "Remove" and "Cancel" buttons
	 * @param {Array} array of UploadWizardUpload objects
	 * @param {String} message for dialog title
	 * @param {String} message for dialog text, which will precede an unordered list of upload titles.
	 */
	mw.UploadWizardDeleteDialog = function ( uploads, dialogTitle, dialogText ) {
		var $filenameList = $( '<ul></ul>' ),
			buttons = {};

		$.each( uploads, function ( i, upload ) {
			if ( upload === undefined ) {
				return;
			}
			$filenameList.append( $( '<li></li>' ).append( upload.title.getMain() ) );
		} );

		buttons[ mw.message( 'mwe-upwiz-remove', uploads.length ).escaped() ] = function () {
			$.each( uploads, function ( i, upload ) {
				if ( upload === undefined ) {
					return;
				}
				upload.remove();
			} );
			$( this ).dialog( 'close' );
		};
		buttons[ mw.message( 'mwe-upwiz-cancel', uploads.length ).escaped() ] = function () {
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

	mw.UploadWizardDeedPreview = function (upload) {
		this.upload = upload;
	};

	mw.UploadWizardDeedPreview.prototype = {

		setup: function () {
			// prepare a preview on the deeds page
			this.$thumbnailDiv = $( '<div></div>' ).addClass( 'mwe-upwiz-thumbnail' );
			this.upload.setThumbnail(
				this.$thumbnailDiv,
				mw.UploadWizard.config.thumbnailWidth,
				mw.UploadWizard.config.thumbnailMaxHeight,
				true
			);
		},

		remove: function () {
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
		attach: function () {
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
	mw.isEmpty = function ( v ) {
		return v === undefined || v === null || v === '';
	};

	$.fn.readonly = function () {
		return this.attr( 'readonly', 'readonly' ).addClass( 'mwe-readonly' );
	};

	/* will change in RTL, but I can't think of an easy way to do this with only CSS */
	$.fn.requiredFieldLabel = function () {
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
	$.fn.addHint = function ( key, fn ) {
		var attrs, contentSource, html = false;
		if ( typeof fn === 'function' ) {
			attrs = { id: key };
			contentSource = fn;
			html = true;
		} else {
			attrs = { title:mw.message( 'mwe-upwiz-tooltip-' + key ).escaped() };
			contentSource = 'title';
		}
		return this.append(
			$( '<span/>' )
				.addClass( 'mwe-upwiz-hint' )
				.attr( attrs )
				.click( function () {
					if ( !this.displayed ) {
						$ ( this ).tipsy( 'show' );
						this.displayed = true;
					} else {
						$ ( this ).tipsy( 'hide' );
						this.displayed = false;
					}
					return false;
				} )
				.tipsy( { title: contentSource, html: html, opacity: 1.0, gravity: 'sw', trigger: 'manual' } )
		);
	};

	/**
	 * jQuery extension. Makes a textarea automatically grow if you enter overflow
	 * (This feature was in the old Commons interface with a confusing arrow icon; it's nicer to make it automatic.)
	 */
	jQuery.fn.growTextArea = function () {

		// this is a jquery-style object

		// in MSIE, this makes it possible to know what scrollheight is
		// Technically this means text could now dangle over the edge,
		// but it shouldn't because it will always grow to accomodate very quickly.

		if ( $.msie ) {
			this.each( function (i, textArea) {
				textArea.style.overflow = 'visible';
			} );
		}

		var resizeIfNeeded = function () {
			// this is the dom element
			// is there a better way to do this?
			if ( this.scrollHeight >= this.offsetHeight && !this.style.height ) {
				this.rows++;
				while ( this.scrollHeight > this.offsetHeight ) {
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
	jQuery.fn.collapseToggle = function () {
		var $el = this,
			$contents = $el.find( '.mwe-upwiz-toggler-content' ).hide(),
			$toggle = $el.find( '.mwe-upwiz-toggler' ).addClass( 'mwe-upwiz-more-options' );
		$el.data( 'open', function () {
			$contents.slideDown( 250 );
			$toggle.addClass( 'mwe-upwiz-toggler-open' );
		} );
		$el.data( 'close', function () {
			$contents.slideUp( 250 );
			$toggle.removeClass( 'mwe-upwiz-toggler-open' );
		} );
		$toggle.click( function ( e ) {
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

} )( mediaWiki, mediaWiki.uploadWizard, jQuery );
