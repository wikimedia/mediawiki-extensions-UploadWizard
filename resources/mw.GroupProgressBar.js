/* global moment */
( function () {
	/**
	 * This is a progress bar for monitoring multiple objects, giving summary view
	 *
	 * @class
	 * @param {string} selector
	 * @param {mw.UploadWizardUpload[]} uploads
	 * @param {string[]} successStates
	 * @param {string[]} errorStates
	 * @param {string} progressProperty
	 * @param {string} weightProperty
	 */
	mw.GroupProgressBar = function ( selector, uploads, successStates, errorStates, progressProperty, weightProperty ) {
		this.$selector = $( selector );
		this.$selector.empty().append(
			$( '<div>' ).addClass( 'mwe-upwiz-progress-inner' ).append(
				$( '<div>' ).addClass( 'mwe-upwiz-progress-bar-etr-container' ).append(
					$( '<div>' ).addClass( 'mwe-upwiz-progress-bar-etr' ).hide().append(
						$( '<div>' ).addClass( 'mwe-upwiz-etr' )
					)
				),
				$( '<div>' ).addClass( 'mwe-upwiz-count' )
			)
		);

		this.progressBarWidget = new OO.ui.ProgressBarWidget( {
			classes: [ 'mwe-upwiz-progress-bar' ],
			progress: 0
		} );

		this.$selector.find( '.mwe-upwiz-progress-bar-etr' )
			.prepend( this.progressBarWidget.$element );

		this.uploads = uploads;
		this.successStates = successStates;
		this.errorStates = errorStates;
		this.progressProperty = progressProperty;
		this.weightProperty = weightProperty;
		this.beginTime = undefined;
	};

	mw.GroupProgressBar.prototype = {

		/**
		 * Show the progress bar
		 */
		showBar: function () {
			// FIXME: Use CSS transition
			// eslint-disable-next-line no-jquery/no-fade
			this.$selector.find( '.mwe-upwiz-progress-bar-etr' ).fadeIn( 200 );
		},

		/**
		 * loop around the uploads, summing certain properties for a weighted total fraction
		 */
		start: function () {
			let shown = false;

			this.setBeginTime();

			const displayer = () => {
				let totalWeight = 0.0,
					fraction = 0.0,
					successStateCount = 0,
					errorStateCount = 0,
					hasData = false;

				this.uploads.forEach( ( upload ) => {
					totalWeight += upload[ this.weightProperty ];
				} );

				this.uploads.forEach( ( upload ) => {
					if ( upload.state === 'aborted' ) {
						return;
					}
					if ( this.successStates.includes( upload.state ) ) {
						successStateCount++;
					}
					if ( this.errorStates.includes( upload.state ) ) {
						errorStateCount++;
					}
					if ( upload[ this.progressProperty ] !== undefined ) {
						fraction += upload[ this.progressProperty ] * ( upload[ this.weightProperty ] / totalWeight );
						if ( upload[ this.progressProperty ] > 0 ) {
							hasData = true;
						}
					}
				} );

				// sometimes, the first data we have just tells us that it's over. So only show the bar
				// if we have good data AND the fraction is less than 1.
				if ( hasData && fraction < 1.0 ) {
					if ( !shown ) {
						this.showBar();
						shown = true;
					}
					this.showProgress( fraction );
				}
				this.showCount( successStateCount );

				if ( successStateCount + errorStateCount < this.uploads.length - this.countRemoved() ) {
					setTimeout( displayer, 200 );
				} else {
					this.showProgress( 1.0 );
					this.finished = true;
					setTimeout( () => {
						this.hideBar();
					}, 500 );
				}
			};
			displayer();
		},

		/**
		 * Hide the progress bar with a slideup motion
		 */
		hideBar: function () {
			// FIXME: Use CSS transition
			// eslint-disable-next-line no-jquery/no-fade
			this.$selector.find( '.mwe-upwiz-progress-bar-etr' ).fadeOut( 200 );
		},

		/**
		 * sets the beginning time (useful for figuring out estimated time remaining)
		 * if time parameter omitted, will set beginning time to now
		 *
		 * @param {number} [time] The time this bar is presumed to have started (epoch milliseconds)
		 */
		setBeginTime: function ( time ) {
			this.beginTime = time || Date.now();
		},

		/**
		 * Show overall progress for the entire UploadWizard
		 * The current design doesn't have individual progress bars, just one giant one.
		 * We did some tricky calculations in startUploads to try to weight each individual file's progress against
		 * the overall progress.
		 *
		 * @param {number} fraction The amount of whatever it is that's done whatever it's done
		 */
		showProgress: function ( fraction ) {
			const remainingTime = this.getRemainingTime( fraction );

			this.progressBarWidget.setProgress( parseInt( fraction * 100, 10 ) );

			if ( remainingTime !== null ) {
				let timeString;
				if ( remainingTime === 0 ) {
					timeString = mw.message( 'mwe-upwiz-finished' ).text();
				} else if ( remainingTime < 1000 ) {
					timeString = mw.message( 'mwe-upwiz-almost-finished' ).text();
				} else {
					const t = moment.duration( remainingTime );
					timeString = t.humanize();
				}

				this.$selector.find( '.mwe-upwiz-etr' ).text( timeString );
			}
		},

		/**
		 * Calculate remaining time for all uploads to complete.
		 *
		 * @param {number} fraction Fraction of progress to show
		 * @return {number} Estimated time remaining (in milliseconds)
		 */
		getRemainingTime: function ( fraction ) {
			if ( this.beginTime ) {
				const elapsedTime = Date.now() - this.beginTime;
				if ( fraction > 0.0 && elapsedTime > 0 ) { // or some other minimums for good data
					const rate = fraction / elapsedTime;
					return ( ( 1.0 - fraction ) / rate );
				}
			}
			return null;
		},

		/**
		 * Show the overall count as we upload
		 *
		 * @param {number} completed The number of items that have done whatever has been done e.g. in "uploaded 2 of 5", this is the 2
		 */
		showCount: function ( completed ) {
			const formattedCompleted = mw.language.convertNumber( completed );
			const total = this.uploads.length - this.countRemoved();
			const formattedTotal = mw.language.convertNumber( total );
			this.$selector
				.find( '.mwe-upwiz-count' )
				// Hide if there are no uploads, show otherwise
				.toggle( total !== 0 )
				.text( mw.msg( 'mwe-upwiz-upload-count', formattedCompleted, formattedTotal ) );
		},

		countRemoved: function () {
			let count = 0;
			this.uploads.forEach( ( upload ) => {
				if ( !upload || upload.state === 'aborted' ) {
					count += 1;
				}
			} );
			return count;
		}
	};
}() );
