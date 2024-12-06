( function ( uw ) {

	uw.ValidationStatus = function UWValidationStatus() {
		this.errors = [];
		this.warnings = [];
		this.notices = [];
	};

	/**
	 * @param {Array} errors
	 * @return {uw.ValidationStatus}
	 */
	uw.ValidationStatus.prototype.setErrors = function ( errors ) {
		this.errors = errors;
		return this;
	};

	/**
	 * @param {Array} warnings
	 * @return {uw.ValidationStatus}
	 */
	uw.ValidationStatus.prototype.setWarnings = function ( warnings ) {
		this.warnings = warnings;
		return this;
	};

	/**
	 * @param {Array} notices
	 * @return {uw.ValidationStatus}
	 */
	uw.ValidationStatus.prototype.setNotices = function ( notices ) {
		this.notices = notices;
		return this;
	};

	/**
	 * @param {mw.message} error
	 * @return {uw.ValidationStatus}
	 */
	uw.ValidationStatus.prototype.addError = function ( error ) {
		this.errors.push( error );
		return this;
	};

	/**
	 * @param {mw.message} warning
	 * @return {uw.ValidationStatus}
	 */
	uw.ValidationStatus.prototype.addWarning = function ( warning ) {
		this.warnings.push( warning );
		return this;
	};

	/**
	 * @param {mw.message} notice
	 * @return {uw.ValidationStatus}
	 */
	uw.ValidationStatus.prototype.addNotice = function ( notice ) {
		this.notices.push( notice );
		return this;
	};

	/**
	 * @return {Array} errors
	 */
	uw.ValidationStatus.prototype.getErrors = function () {
		return this.errors;
	};

	/**
	 * @return {Array} warnings
	 */
	uw.ValidationStatus.prototype.getWarnings = function () {
		return this.warnings;
	};

	/**
	 * @return {Array} notices
	 */
	uw.ValidationStatus.prototype.getNotices = function () {
		return this.notices;
	};

	/**
	 * @return {jQuery.Promise<uw.ValidationStatus>}
	 */
	uw.ValidationStatus.prototype.resolve = function () {
		return $.Deferred().resolve( this ).promise();
	};

	/**
	 * @return {jQuery.Promise<uw.ValidationStatus>}
	 */
	uw.ValidationStatus.prototype.reject = function () {
		return $.Deferred().reject( this ).promise();
	};

	/**
	 * @param {Array<uw.ValidationStatus>} statuses
	 * @return {uw.ValidationStatus}
	 */
	uw.ValidationStatus.mergeStatus = function ( ...statuses ) {
		const newStatus = new uw.ValidationStatus();

		statuses.forEach( ( status ) => {
			status.getErrors().forEach( ( error ) => newStatus.addError( error ) );
			status.getWarnings().forEach( ( warning ) => newStatus.addWarning( warning ) );
			status.getNotices().forEach( ( notice ) => newStatus.addNotice( notice ) );
		} );

		return newStatus;
	};

	/**
	 * @param {Array<jQuery.Promise<uw.ValidationStatus>>} promises
	 * @return {jQuery.Promise<uw.ValidationStatus>}
	 */
	uw.ValidationStatus.mergePromises = function ( ...promises ) {
		return this.whenWithoutEarlyReject( ...promises ).then(
			( ...statuses ) => uw.ValidationStatus.mergeStatus( ...statuses ).resolve(),
			( ...statuses ) => uw.ValidationStatus.mergeStatus( ...statuses ).reject()
		);
	};

	uw.ValidationStatus.whenWithoutEarlyReject = function ( ...promises ) {
		// $.when will be applied on all promises, but we need to ensure
		// that they will all actually resolve. If any of them rejects,
		// it will immediately cause the master promise to reject, leaving
		// us with incomplete results.
		// To avoid this, we'll just .then them into promises that always
		// resolve and keep their success status in an argument - later on,
		// we'll then combine the results and resolve/reject based on the
		// success status of all of them
		const resolveablePromises = promises.map(
			( promise ) => promise.then(
				( ...data ) => $.Deferred().resolve( true, ...data ).promise(),
				( ...data ) => $.Deferred().resolve( false, ...data ).promise()
			)
		);

		while ( resolveablePromises.length < 2 ) {
			// adding bogus promises to ensure $.when always resolves
			// with an array of multiple results (if there's just 1,
			// it would otherwise have just that one's arguments,
			// instead of a multi-dimensional array)
			resolveablePromises.push( $.Deferred().resolve( true, null ).promise() );
		}

		// resolveablePromises is an array of promises that each resolve with [<{bool} status>, ...<{Array} params>]
		// now iterate them all to figure out if we can proceed
		return $.when.apply( $, resolveablePromises )
			.then( ( ...args ) => {
				let success = true;
				const data = [];

				// remove data from bogus promises that may have been added
				// for the purpose of making $.when behave consistently
				args.slice( 0, promises.length ).forEach( ( arg ) => {
					success = success && arg[ 0 ];
					data.push( arg[ 1 ] );
				} );

				if ( success ) {
					return $.Deferred().resolve( ...data ).promise();
				}
				return $.Deferred().reject( ...data ).promise();
			} );
	};

}( mw.uploadWizard ) );
