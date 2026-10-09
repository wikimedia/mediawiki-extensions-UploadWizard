( function ( uw ) {

	/**
	 * An alternative RadioSelectWidget that, unlike RadioSelectWidget itself, does not
	 * steal all mouse and keyboard events from content inside the options. (T359920, T294389).
	 *
	 * SelectWidget's document keydown listener is bound in the capture phase
	 * (see #bindDocumentKeyDownListener), so it fires before the event reaches a nested widget's
	 * own handlers.
	 *
	 * This class works around that limitation. This is a bit of an accessibility smell.
	 * The alternative is making the content siblings of the RadioSelectWidget instead
	 * of children of the options, but that significantly changes the design.
	 *
	 * @extends OO.ui.RadioSelectWidget
	 * @class
	 * @constructor
	 * @param {Object} [config]
	 */
	uw.RadioSelectWidget = function UWRadioSelectWidget( config ) {
		uw.RadioSelectWidget.super.call( this, config );
	};
	OO.inheritClass( uw.RadioSelectWidget, OO.ui.RadioSelectWidget );

	// Native elements that carry their own keyboard/click behaviour, plus anything made
	// focusable (tabindex covers OOUI widgets too, via TabIndexedElement).
	const INTERACTIVE_SELECTOR = 'input, textarea, select, button, a[href], [tabindex]';

	/**
	 * Determine if the target is interactive content nested in one of our options, rather than
	 * that option's own radio bubble. Walks up from the target to find the nearest interactive
	 * ancestor within the owning option; it's foreign unless that ancestor is the option's own
	 * radio input.
	 *
	 * @param {OO.ui.SelectWidget} widget
	 * @param {Element} target
	 * @return {boolean}
	 */
	function isForeignInteractiveContent( widget, target ) {
		const owner = widget.getItems().find( ( item ) => item.$element[ 0 ].contains( target ) );
		if ( !owner ) {
			return false;
		}
		const ownControl = owner.radio || owner.checkbox;
		for ( let el = target; el && el !== owner.$element[ 0 ]; el = el.parentElement ) {
			if ( el.isContentEditable || el.matches( INTERACTIVE_SELECTOR ) ) {
				return !( ownControl && ownControl.$element[ 0 ].contains( el ) );
			}
		}
		return false;
	}

	/**
	 * @inheritdoc
	 */
	uw.RadioSelectWidget.prototype.onMouseDown = function ( e ) {
		if ( isForeignInteractiveContent( this, e.target ) ) {
			return;
		}
		return uw.RadioSelectWidget.super.prototype.onMouseDown.call( this, e );
	};

	/**
	 * @inheritdoc
	 */
	uw.RadioSelectWidget.prototype.onDocumentKeyDown = function ( e ) {
		if ( isForeignInteractiveContent( this, e.target ) ) {
			return;
		}
		return uw.RadioSelectWidget.super.prototype.onDocumentKeyDown.call( this, e );
	};

	/**
	 * @inheritdoc
	 */
	uw.RadioSelectWidget.prototype.onFocus = function ( e ) {
		if ( isForeignInteractiveContent( this, e.target ) ) {
			return;
		}
		return uw.RadioSelectWidget.super.prototype.onFocus.call( this, e );
	};
}( mw.uploadWizard ) );
