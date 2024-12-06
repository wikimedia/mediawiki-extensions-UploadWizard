( function ( uw ) {

	uw.ValidatableElement = function UWValidatableElement() {};
	OO.initClass( uw.ValidatableElement );

	/**
	 * Convenience method to attach validatableElement methods to an on-the-fly
	 * created instance of one of the existing widgets where this class hasn't
	 * been mixed in.
	 *
	 * @param {OO.ui.Widget} widget
	 */
	uw.ValidatableElement.decorate = function ( widget ) {
		// copy ValidatableElement methods onto widget instance
		let key;
		for ( key in uw.ValidatableElement.prototype ) {
			if ( key !== 'constructor' && Object.prototype.hasOwnProperty.call( uw.ValidatableElement.prototype, key ) ) {
				widget[ key ] = uw.ValidatableElement.prototype[ key ];
			}
		}
	};

	/**
	 * This method executes the validation. It is expected to return a promise
	 * that either resolves (on success) or rejects (on failure), with up to
	 * 3 arguments, in both cases, representing errors, warnings and notices
	 * respectively.
	 *
	 * Notice that it is possible for a check to fail (rejected) without error,
	 * or for there to be an error without failure (resolved). This can be
	 * useful e.g. in case there was an error in a nested component, where it
	 * is displayed in situ: we don't want to show a duplicate error in the
	 * parent, but still want to report on the overall failure of the validation.
	 *
	 * @param {boolean} thorough
	 * @return {jQuery.Promise<uw.ValidationStatus>}
	 */
	// eslint-disable-next-line no-unused-vars
	uw.ValidatableElement.prototype.validate = function ( thorough ) {
		return ( new uw.ValidationStatus() ).resolve();
	};

}( mw.uploadWizard ) );
