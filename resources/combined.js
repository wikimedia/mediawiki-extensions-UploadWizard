/*
 * jQuery UI 1.7.1
 *
 * Copyright (c) 2009 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI
 */
;jQuery.ui || (function($) {

var _remove = $.fn.remove,
	isFF2 = $.browser.mozilla && (parseFloat($.browser.version) < 1.9);

//Helper functions and ui object
$.ui = {
	version: "1.7.1",

	// $.ui.plugin is deprecated.  Use the proxy pattern instead.
	plugin: {
		add: function(module, option, set) {
			var proto = $.ui[module].prototype;
			for(var i in set) {
				proto.plugins[i] = proto.plugins[i] || [];
				proto.plugins[i].push([option, set[i]]);
			}
		},
		call: function(instance, name, args) {
			var set = instance.plugins[name];
			if(!set || !instance.element[0].parentNode) { return; }

			for (var i = 0; i < set.length; i++) {
				if (instance.options[set[i][0]]) {
					set[i][1].apply(instance.element, args);
				}
			}
		}
	},

	contains: function(a, b) {
		return document.compareDocumentPosition
			? a.compareDocumentPosition(b) & 16
			: a !== b && a.contains(b);
	},

	hasScroll: function(el, a) {

		//If overflow is hidden, the element might have extra content, but the user wants to hide it
		if ($(el).css('overflow') == 'hidden') { return false; }

		var scroll = (a && a == 'left') ? 'scrollLeft' : 'scrollTop',
			has = false;

		if (el[scroll] > 0) { return true; }

		// TODO: determine which cases actually cause this to happen
		// if the element doesn't have the scroll set, see if it's possible to
		// set the scroll
		el[scroll] = 1;
		has = (el[scroll] > 0);
		el[scroll] = 0;
		return has;
	},

	isOverAxis: function(x, reference, size) {
		//Determines when x coordinate is over "b" element axis
		return (x > reference) && (x < (reference + size));
	},

	isOver: function(y, x, top, left, height, width) {
		//Determines when x, y coordinates is over "b" element
		return $.ui.isOverAxis(y, top, height) && $.ui.isOverAxis(x, left, width);
	},

	keyCode: {
		BACKSPACE: 8,
		CAPS_LOCK: 20,
		COMMA: 188,
		CONTROL: 17,
		DELETE: 46,
		DOWN: 40,
		END: 35,
		ENTER: 13,
		ESCAPE: 27,
		HOME: 36,
		INSERT: 45,
		LEFT: 37,
		NUMPAD_ADD: 107,
		NUMPAD_DECIMAL: 110,
		NUMPAD_DIVIDE: 111,
		NUMPAD_ENTER: 108,
		NUMPAD_MULTIPLY: 106,
		NUMPAD_SUBTRACT: 109,
		PAGE_DOWN: 34,
		PAGE_UP: 33,
		PERIOD: 190,
		RIGHT: 39,
		SHIFT: 16,
		SPACE: 32,
		TAB: 9,
		UP: 38
	}
};

// WAI-ARIA normalization
if (isFF2) {
	var attr = $.attr,
		removeAttr = $.fn.removeAttr,
		ariaNS = "http://www.w3.org/2005/07/aaa",
		ariaState = /^aria-/,
		ariaRole = /^wairole:/;

	$.attr = function(elem, name, value) {
		var set = value !== undefined;

		return (name == 'role'
			? (set
				? attr.call(this, elem, name, "wairole:" + value)
				: (attr.apply(this, arguments) || "").replace(ariaRole, ""))
			: (ariaState.test(name)
				? (set
					? elem.setAttributeNS(ariaNS,
						name.replace(ariaState, "aaa:"), value)
					: attr.call(this, elem, name.replace(ariaState, "aaa:")))
				: attr.apply(this, arguments)));
	};

	$.fn.removeAttr = function(name) {
		return (ariaState.test(name)
			? this.each(function() {
				this.removeAttributeNS(ariaNS, name.replace(ariaState, ""));
			}) : removeAttr.call(this, name));
	};
}

//jQuery plugins
$.fn.extend({
	remove: function() {
		// Safari has a native remove event which actually removes DOM elements,
		// so we have to use triggerHandler instead of trigger (#3037).
		$("*", this).add(this).each(function() {
			$(this).triggerHandler("remove");
		});
		return _remove.apply(this, arguments );
	},

	enableSelection: function() {
		return this
			.attr('unselectable', 'off')
			.css('MozUserSelect', '')
			.unbind('selectstart.ui');
	},

	disableSelection: function() {
		return this
			.attr('unselectable', 'on')
			.css('MozUserSelect', 'none')
			.bind('selectstart.ui', function() { return false; });
	},

	scrollParent: function() {
		var scrollParent;
		if(($.browser.msie && (/(static|relative)/).test(this.css('position'))) || (/absolute/).test(this.css('position'))) {
			scrollParent = this.parents().filter(function() {
				return (/(relative|absolute|fixed)/).test($.curCSS(this,'position',1)) && (/(auto|scroll)/).test($.curCSS(this,'overflow',1)+$.curCSS(this,'overflow-y',1)+$.curCSS(this,'overflow-x',1));
			}).eq(0);
		} else {
			scrollParent = this.parents().filter(function() {
				return (/(auto|scroll)/).test($.curCSS(this,'overflow',1)+$.curCSS(this,'overflow-y',1)+$.curCSS(this,'overflow-x',1));
			}).eq(0);
		}

		return (/fixed/).test(this.css('position')) || !scrollParent.length ? $(document) : scrollParent;
	}
});


//Additional selectors
$.extend($.expr[':'], {
	data: function(elem, i, match) {
		return !!$.data(elem, match[3]);
	},

	focusable: function(element) {
		var nodeName = element.nodeName.toLowerCase(),
			tabIndex = $.attr(element, 'tabindex');
		return (/input|select|textarea|button|object/.test(nodeName)
			? !element.disabled
			: 'a' == nodeName || 'area' == nodeName
				? element.href || !isNaN(tabIndex)
				: !isNaN(tabIndex))
			// the element and all of its ancestors must be visible
			// the browser may report that the area is hidden
			&& !$(element)['area' == nodeName ? 'parents' : 'closest'](':hidden').length;
	},

	tabbable: function(element) {
		var tabIndex = $.attr(element, 'tabindex');
		return (isNaN(tabIndex) || tabIndex >= 0) && $(element).is(':focusable');
	}
});


// $.widget is a factory to create jQuery plugins
// taking some boilerplate code out of the plugin code
function getter(namespace, plugin, method, args) {
	function getMethods(type) {
		var methods = $[namespace][plugin][type] || [];
		return (typeof methods == 'string' ? methods.split(/,?\s+/) : methods);
	}

	var methods = getMethods('getter');
	if (args.length == 1 && typeof args[0] == 'string') {
		methods = methods.concat(getMethods('getterSetter'));
	}
	return ($.inArray(method, methods) != -1);
}

$.widget = function(name, prototype) {
	var namespace = name.split(".")[0];
	name = name.split(".")[1];

	// create plugin method
	$.fn[name] = function(options) {
		var isMethodCall = (typeof options == 'string'),
			args = Array.prototype.slice.call(arguments, 1);

		// prevent calls to internal methods
		if (isMethodCall && options.substring(0, 1) == '_') {
			return this;
		}

		// handle getter methods
		if (isMethodCall && getter(namespace, name, options, args)) {
			var instance = $.data(this[0], name);
			return (instance ? instance[options].apply(instance, args)
				: undefined);
		}

		// handle initialization and non-getter methods
		return this.each(function() {
			var instance = $.data(this, name);

			// constructor
			(!instance && !isMethodCall &&
				$.data(this, name, new $[namespace][name](this, options))._init());

			// method call
			(instance && isMethodCall && $.isFunction(instance[options]) &&
				instance[options].apply(instance, args));
		});
	};

	// create widget constructor
	$[namespace] = $[namespace] || {};
	$[namespace][name] = function(element, options) {
		var self = this;

		this.namespace = namespace;
		this.widgetName = name;
		this.widgetEventPrefix = $[namespace][name].eventPrefix || name;
		this.widgetBaseClass = namespace + '-' + name;

		this.options = $.extend({},
			$.widget.defaults,
			$[namespace][name].defaults,
			$.metadata && $.metadata.get(element)[name],
			options);

		this.element = $(element)
			.bind('setData.' + name, function(event, key, value) {
				if (event.target == element) {
					return self._setData(key, value);
				}
			})
			.bind('getData.' + name, function(event, key) {
				if (event.target == element) {
					return self._getData(key);
				}
			})
			.bind('remove', function() {
				return self.destroy();
			});
	};

	// add widget prototype
	$[namespace][name].prototype = $.extend({}, $.widget.prototype, prototype);

	// TODO: merge getter and getterSetter properties from widget prototype
	// and plugin prototype
	$[namespace][name].getterSetter = 'option';
};

$.widget.prototype = {
	_init: function() {},
	destroy: function() {
		this.element.removeData(this.widgetName)
			.removeClass(this.widgetBaseClass + '-disabled' + ' ' + this.namespace + '-state-disabled')
			.removeAttr('aria-disabled');
	},

	option: function(key, value) {
		var options = key,
			self = this;

		if (typeof key == "string") {
			if (value === undefined) {
				return this._getData(key);
			}
			options = {};
			options[key] = value;
		}

		$.each(options, function(key, value) {
			self._setData(key, value);
		});
	},
	_getData: function(key) {
		return this.options[key];
	},
	_setData: function(key, value) {
		this.options[key] = value;

		if (key == 'disabled') {
			this.element
				[value ? 'addClass' : 'removeClass'](
					this.widgetBaseClass + '-disabled' + ' ' +
					this.namespace + '-state-disabled')
				.attr("aria-disabled", value);
		}
	},

	enable: function() {
		this._setData('disabled', false);
	},
	disable: function() {
		this._setData('disabled', true);
	},

	_trigger: function(type, event, data) {
		var callback = this.options[type],
			eventName = (type == this.widgetEventPrefix
				? type : this.widgetEventPrefix + type);

		event = $.Event(event);
		event.type = eventName;

		// copy original event properties over to the new event
		// this would happen if we could call $.event.fix instead of $.Event
		// but we don't have a way to force an event to be fixed multiple times
		if (event.originalEvent) {
			for (var i = $.event.props.length, prop; i;) {
				prop = $.event.props[--i];
				event[prop] = event.originalEvent[prop];
			}
		}

		this.element.trigger(event, data);

		return !($.isFunction(callback) && callback.call(this.element[0], event, data) === false
			|| event.isDefaultPrevented());
	}
};

$.widget.defaults = {
	disabled: false
};


/** Mouse Interaction Plugin **/

$.ui.mouse = {
	_mouseInit: function() {
		var self = this;

		this.element
			.bind('mousedown.'+this.widgetName, function(event) {
				return self._mouseDown(event);
			})
			.bind('click.'+this.widgetName, function(event) {
				if(self._preventClickEvent) {
					self._preventClickEvent = false;
					event.stopImmediatePropagation();
					return false;
				}
			});

		// Prevent text selection in IE
		if ($.browser.msie) {
			this._mouseUnselectable = this.element.attr('unselectable');
			this.element.attr('unselectable', 'on');
		}

		this.started = false;
	},

	// TODO: make sure destroying one instance of mouse doesn't mess with
	// other instances of mouse
	_mouseDestroy: function() {
		this.element.unbind('.'+this.widgetName);

		// Restore text selection in IE
		($.browser.msie
			&& this.element.attr('unselectable', this._mouseUnselectable));
	},

	_mouseDown: function(event) {
		// don't let more than one widget handle mouseStart
		// TODO: figure out why we have to use originalEvent
		event.originalEvent = event.originalEvent || {};
		if (event.originalEvent.mouseHandled) { return; }

		// we may have missed mouseup (out of window)
		(this._mouseStarted && this._mouseUp(event));

		this._mouseDownEvent = event;

		var self = this,
			btnIsLeft = (event.which == 1),
			elIsCancel = (typeof this.options.cancel == "string" ? $(event.target).parents().add(event.target).filter(this.options.cancel).length : false);
		if (!btnIsLeft || elIsCancel || !this._mouseCapture(event)) {
			return true;
		}

		this.mouseDelayMet = !this.options.delay;
		if (!this.mouseDelayMet) {
			this._mouseDelayTimer = setTimeout(function() {
				self.mouseDelayMet = true;
			}, this.options.delay);
		}

		if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
			this._mouseStarted = (this._mouseStart(event) !== false);
			if (!this._mouseStarted) {
				event.preventDefault();
				return true;
			}
		}

		// these delegates are required to keep context
		this._mouseMoveDelegate = function(event) {
			return self._mouseMove(event);
		};
		this._mouseUpDelegate = function(event) {
			return self._mouseUp(event);
		};
		$(document)
			.bind('mousemove.'+this.widgetName, this._mouseMoveDelegate)
			.bind('mouseup.'+this.widgetName, this._mouseUpDelegate);

		// preventDefault() is used to prevent the selection of text here -
		// however, in Safari, this causes select boxes not to be selectable
		// anymore, so this fix is needed
		($.browser.safari || event.preventDefault());

		event.originalEvent.mouseHandled = true;
		return true;
	},

	_mouseMove: function(event) {
		// IE mouseup check - mouseup happened when mouse was out of window
		if ($.browser.msie && !event.button) {
			return this._mouseUp(event);
		}

		if (this._mouseStarted) {
			this._mouseDrag(event);
			return event.preventDefault();
		}

		if (this._mouseDistanceMet(event) && this._mouseDelayMet(event)) {
			this._mouseStarted =
				(this._mouseStart(this._mouseDownEvent, event) !== false);
			(this._mouseStarted ? this._mouseDrag(event) : this._mouseUp(event));
		}

		return !this._mouseStarted;
	},

	_mouseUp: function(event) {
		$(document)
			.unbind('mousemove.'+this.widgetName, this._mouseMoveDelegate)
			.unbind('mouseup.'+this.widgetName, this._mouseUpDelegate);

		if (this._mouseStarted) {
			this._mouseStarted = false;
			this._preventClickEvent = (event.target == this._mouseDownEvent.target);
			this._mouseStop(event);
		}

		return false;
	},

	_mouseDistanceMet: function(event) {
		return (Math.max(
				Math.abs(this._mouseDownEvent.pageX - event.pageX),
				Math.abs(this._mouseDownEvent.pageY - event.pageY)
			) >= this.options.distance
		);
	},

	_mouseDelayMet: function(event) {
		return this.mouseDelayMet;
	},

	// These are placeholder methods, to be overriden by extending plugin
	_mouseStart: function(event) {},
	_mouseDrag: function(event) {},
	_mouseStop: function(event) {},
	_mouseCapture: function(event) { return true; }
};

$.ui.mouse.defaults = {
	cancel: null,
	distance: 1,
	delay: 0
};

})(jQuery);/*
 * jQuery UI Datepicker 1.7.1
 *
 * Copyright (c) 2009 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Datepicker
 *
 * Depends:
 *	ui.core.js
 */

(function($) { // hide the namespace

$.extend($.ui, { datepicker: { version: "1.7.1" } });

var PROP_NAME = 'datepicker';

/* Date picker manager.
   Use the singleton instance of this class, $.datepicker, to interact with the date picker.
   Settings for (groups of) date pickers are maintained in an instance object,
   allowing multiple different settings on the same page. */

function Datepicker() {
	this.debug = false; // Change this to true to start debugging
	this._curInst = null; // The current instance in use
	this._keyEvent = false; // If the last event was a key event
	this._disabledInputs = []; // List of date picker inputs that have been disabled
	this._datepickerShowing = false; // True if the popup picker is showing , false if not
	this._inDialog = false; // True if showing within a "dialog", false if not
	this._mainDivId = 'ui-datepicker-div'; // The ID of the main datepicker division
	this._inlineClass = 'ui-datepicker-inline'; // The name of the inline marker class
	this._appendClass = 'ui-datepicker-append'; // The name of the append marker class
	this._triggerClass = 'ui-datepicker-trigger'; // The name of the trigger marker class
	this._dialogClass = 'ui-datepicker-dialog'; // The name of the dialog marker class
	this._disableClass = 'ui-datepicker-disabled'; // The name of the disabled covering marker class
	this._unselectableClass = 'ui-datepicker-unselectable'; // The name of the unselectable cell marker class
	this._currentClass = 'ui-datepicker-current-day'; // The name of the current day marker class
	this._dayOverClass = 'ui-datepicker-days-cell-over'; // The name of the day hover marker class
	this.regional = []; // Available regional settings, indexed by language code
	this.regional[''] = { // Default regional settings
		closeText: 'Done', // Display text for close link
		prevText: 'Prev', // Display text for previous month link
		nextText: 'Next', // Display text for next month link
		currentText: 'Today', // Display text for current month link
		monthNames: ['January','February','March','April','May','June',
			'July','August','September','October','November','December'], // Names of months for drop-down and formatting
		monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], // For formatting
		dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], // For formatting
		dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], // For formatting
		dayNamesMin: ['Su','Mo','Tu','We','Th','Fr','Sa'], // Column headings for days starting at Sunday
		dateFormat: 'mm/dd/yy', // See format options on parseDate
		firstDay: 0, // The first day of the week, Sun = 0, Mon = 1, ...
		isRTL: false // True if right-to-left language, false if left-to-right
	};
	this._defaults = { // Global defaults for all the date picker instances
		showOn: 'focus', // 'focus' for popup on focus,
			// 'button' for trigger button, or 'both' for either
		showAnim: 'show', // Name of jQuery animation for popup
		showOptions: {}, // Options for enhanced animations
		defaultDate: null, // Used when field is blank: actual date,
			// +/-number for offset from today, null for today
		appendText: '', // Display text following the input box, e.g. showing the format
		buttonText: '...', // Text for trigger button
		buttonImage: '', // URL for trigger button image
		buttonImageOnly: false, // True if the image appears alone, false if it appears on a button
		hideIfNoPrevNext: false, // True to hide next/previous month links
			// if not applicable, false to just disable them
		navigationAsDateFormat: false, // True if date formatting applied to prev/today/next links
		gotoCurrent: false, // True if today link goes back to current selection instead
		changeMonth: false, // True if month can be selected directly, false if only prev/next
		changeYear: false, // True if year can be selected directly, false if only prev/next
		showMonthAfterYear: false, // True if the year select precedes month, false for month then year
		yearRange: '-10:+10', // Range of years to display in drop-down,
			// either relative to current year (-nn:+nn) or absolute (nnnn:nnnn)
		showOtherMonths: false, // True to show dates in other months, false to leave blank
		calculateWeek: this.iso8601Week, // How to calculate the week of the year,
			// takes a Date and returns the number of the week for it
		shortYearCutoff: '+10', // Short year values < this are in the current century,
			// > this are in the previous century,
			// string value starting with '+' for current year + value
		minDate: null, // The earliest selectable date, or null for no limit
		maxDate: null, // The latest selectable date, or null for no limit
		duration: 'normal', // Duration of display/closure
		beforeShowDay: null, // Function that takes a date and returns an array with
			// [0] = true if selectable, false if not, [1] = custom CSS class name(s) or '',
			// [2] = cell title (optional), e.g. $.datepicker.noWeekends
		beforeShow: null, // Function that takes an input field and
			// returns a set of custom settings for the date picker
		onSelect: null, // Define a callback function when a date is selected
		onChangeMonthYear: null, // Define a callback function when the month or year is changed
		onClose: null, // Define a callback function when the datepicker is closed
		numberOfMonths: 1, // Number of months to show at a time
		showCurrentAtPos: 0, // The position in multipe months at which to show the current month (starting at 0)
		stepMonths: 1, // Number of months to step back/forward
		stepBigMonths: 12, // Number of months to step back/forward for the big links
		altField: '', // Selector for an alternate field to store selected dates into
		altFormat: '', // The date format to use for the alternate field
		constrainInput: true, // The input is constrained by the current date format
		showButtonPanel: false // True to show button panel, false to not show it
	};
	$.extend(this._defaults, this.regional['']);
	this.dpDiv = $('<div id="' + this._mainDivId + '" class="ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all ui-helper-hidden-accessible"></div>');
}

$.extend(Datepicker.prototype, {
	/* Class name added to elements to indicate already configured with a date picker. */
	markerClassName: 'hasDatepicker',

	/* Debug logging (if enabled). */
	log: function () {
		if (this.debug)
			console.log.apply('', arguments);
	},

	/* Override the default settings for all instances of the date picker.
	   @param  settings  object - the new settings to use as defaults (anonymous object)
	   @return the manager object */
	setDefaults: function(settings) {
		extendRemove(this._defaults, settings || {});
		return this;
	},

	/* Attach the date picker to a jQuery selection.
	   @param  target    element - the target input field or division or span
	   @param  settings  object - the new settings to use for this date picker instance (anonymous) */
	_attachDatepicker: function(target, settings) {
		// check for settings on the control itself - in namespace 'date:'
		var inlineSettings = null;
		for (var attrName in this._defaults) {
			var attrValue = target.getAttribute('date:' + attrName);
			if (attrValue) {
				inlineSettings = inlineSettings || {};
				try {
					inlineSettings[attrName] = eval(attrValue);
				} catch (err) {
					inlineSettings[attrName] = attrValue;
				}
			}
		}
		var nodeName = target.nodeName.toLowerCase();
		var inline = (nodeName == 'div' || nodeName == 'span');
		if (!target.id)
			target.id = 'dp' + (++this.uuid);
		var inst = this._newInst($(target), inline);
		inst.settings = $.extend({}, settings || {}, inlineSettings || {});
		if (nodeName == 'input') {
			this._connectDatepicker(target, inst);
		} else if (inline) {
			this._inlineDatepicker(target, inst);
		}
	},

	/* Create a new instance object. */
	_newInst: function(target, inline) {
		var id = target[0].id.replace(/([:\[\]\.])/g, '\\\\$1'); // escape jQuery meta chars
		return {id: id, input: target, // associated target
			selectedDay: 0, selectedMonth: 0, selectedYear: 0, // current selection
			drawMonth: 0, drawYear: 0, // month being drawn
			inline: inline, // is datepicker inline or not
			dpDiv: (!inline ? this.dpDiv : // presentation div
			$('<div class="' + this._inlineClass + ' ui-datepicker ui-widget ui-widget-content ui-helper-clearfix ui-corner-all"></div>'))};
	},

	/* Attach the date picker to an input field. */
	_connectDatepicker: function(target, inst) {
		var input = $(target);
		inst.trigger = $([]);
		if (input.hasClass(this.markerClassName))
			return;
		var appendText = this._get(inst, 'appendText');
		var isRTL = this._get(inst, 'isRTL');
		if (appendText)
			input[isRTL ? 'before' : 'after']('<span class="' + this._appendClass + '">' + appendText + '</span>');
		var showOn = this._get(inst, 'showOn');
		if (showOn == 'focus' || showOn == 'both') // pop-up date picker when in the marked field
			input.focus(this._showDatepicker);
		if (showOn == 'button' || showOn == 'both') { // pop-up date picker when button clicked
			var buttonText = this._get(inst, 'buttonText');
			var buttonImage = this._get(inst, 'buttonImage');
			inst.trigger = $(this._get(inst, 'buttonImageOnly') ?
				$('<img/>').addClass(this._triggerClass).
					attr({ src: buttonImage, alt: buttonText, title: buttonText }) :
				$('<button type="button"></button>').addClass(this._triggerClass).
					html(buttonImage == '' ? buttonText : $('<img/>').attr(
					{ src:buttonImage, alt:buttonText, title:buttonText })));
			input[isRTL ? 'before' : 'after'](inst.trigger);
			inst.trigger.click(function() {
				if ($.datepicker._datepickerShowing && $.datepicker._lastInput == target)
					$.datepicker._hideDatepicker();
				else
					$.datepicker._showDatepicker(target);
				return false;
			});
		}
		input.addClass(this.markerClassName).keydown(this._doKeyDown).keypress(this._doKeyPress).
			bind("setData.datepicker", function(event, key, value) {
				inst.settings[key] = value;
			}).bind("getData.datepicker", function(event, key) {
				return this._get(inst, key);
			});
		$.data(target, PROP_NAME, inst);
	},

	/* Attach an inline date picker to a div. */
	_inlineDatepicker: function(target, inst) {
		var divSpan = $(target);
		if (divSpan.hasClass(this.markerClassName))
			return;
		divSpan.addClass(this.markerClassName).append(inst.dpDiv).
			bind("setData.datepicker", function(event, key, value){
				inst.settings[key] = value;
			}).bind("getData.datepicker", function(event, key){
				return this._get(inst, key);
			});
		$.data(target, PROP_NAME, inst);
		this._setDate(inst, this._getDefaultDate(inst));
		this._updateDatepicker(inst);
		this._updateAlternate(inst);
	},

	/* Pop-up the date picker in a "dialog" box.
	   @param  input     element - ignored
	   @param  dateText  string - the initial date to display (in the current format)
	   @param  onSelect  function - the function(dateText) to call when a date is selected
	   @param  settings  object - update the dialog date picker instance's settings (anonymous object)
	   @param  pos       int[2] - coordinates for the dialog's position within the screen or
	                     event - with x/y coordinates or
	                     leave empty for default (screen centre)
	   @return the manager object */
	_dialogDatepicker: function(input, dateText, onSelect, settings, pos) {
		var inst = this._dialogInst; // internal instance
		if (!inst) {
			var id = 'dp' + (++this.uuid);
			this._dialogInput = $('<input type="text" id="' + id +
				'" size="1" style="position: absolute; top: -100px;"/>');
			this._dialogInput.keydown(this._doKeyDown);
			$('body').append(this._dialogInput);
			inst = this._dialogInst = this._newInst(this._dialogInput, false);
			inst.settings = {};
			$.data(this._dialogInput[0], PROP_NAME, inst);
		}
		extendRemove(inst.settings, settings || {});
		this._dialogInput.val(dateText);

		this._pos = (pos ? (pos.length ? pos : [pos.pageX, pos.pageY]) : null);
		if (!this._pos) {
			var browserWidth = window.innerWidth || document.documentElement.clientWidth ||	document.body.clientWidth;
			var browserHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
			var scrollX = document.documentElement.scrollLeft || document.body.scrollLeft;
			var scrollY = document.documentElement.scrollTop || document.body.scrollTop;
			this._pos = // should use actual width/height below
				[(browserWidth / 2) - 100 + scrollX, (browserHeight / 2) - 150 + scrollY];
		}

		// move input on screen for focus, but hidden behind dialog
		this._dialogInput.css('left', this._pos[0] + 'px').css('top', this._pos[1] + 'px');
		inst.settings.onSelect = onSelect;
		this._inDialog = true;
		this.dpDiv.addClass(this._dialogClass);
		this._showDatepicker(this._dialogInput[0]);
		if ($.blockUI)
			$.blockUI(this.dpDiv);
		$.data(this._dialogInput[0], PROP_NAME, inst);
		return this;
	},

	/* Detach a datepicker from its control.
	   @param  target    element - the target input field or division or span */
	_destroyDatepicker: function(target) {
		var $target = $(target);
		var inst = $.data(target, PROP_NAME);
		if (!$target.hasClass(this.markerClassName)) {
			return;
		}
		var nodeName = target.nodeName.toLowerCase();
		$.removeData(target, PROP_NAME);
		if (nodeName == 'input') {
			inst.trigger.remove();
			$target.siblings('.' + this._appendClass).remove().end().
				removeClass(this.markerClassName).
				unbind('focus', this._showDatepicker).
				unbind('keydown', this._doKeyDown).
				unbind('keypress', this._doKeyPress);
		} else if (nodeName == 'div' || nodeName == 'span')
			$target.removeClass(this.markerClassName).empty();
	},

	/* Enable the date picker to a jQuery selection.
	   @param  target    element - the target input field or division or span */
	_enableDatepicker: function(target) {
		var $target = $(target);
		var inst = $.data(target, PROP_NAME);
		if (!$target.hasClass(this.markerClassName)) {
			return;
		}
		var nodeName = target.nodeName.toLowerCase();
		if (nodeName == 'input') {
		target.disabled = false;
			inst.trigger.filter("button").
			each(function() { this.disabled = false; }).end().
				filter("img").
				css({opacity: '1.0', cursor: ''});
		}
		else if (nodeName == 'div' || nodeName == 'span') {
			var inline = $target.children('.' + this._inlineClass);
			inline.children().removeClass('ui-state-disabled');
		}
		this._disabledInputs = $.map(this._disabledInputs,
			function(value) { return (value == target ? null : value); }); // delete entry
	},

	/* Disable the date picker to a jQuery selection.
	   @param  target    element - the target input field or division or span */
	_disableDatepicker: function(target) {
		var $target = $(target);
		var inst = $.data(target, PROP_NAME);
		if (!$target.hasClass(this.markerClassName)) {
			return;
		}
		var nodeName = target.nodeName.toLowerCase();
		if (nodeName == 'input') {
		target.disabled = true;
			inst.trigger.filter("button").
			each(function() { this.disabled = true; }).end().
				filter("img").
				css({opacity: '0.5', cursor: 'default'});
		}
		else if (nodeName == 'div' || nodeName == 'span') {
			var inline = $target.children('.' + this._inlineClass);
			inline.children().addClass('ui-state-disabled');
		}
		this._disabledInputs = $.map(this._disabledInputs,
			function(value) { return (value == target ? null : value); }); // delete entry
		this._disabledInputs[this._disabledInputs.length] = target;
	},

	/* Is the first field in a jQuery collection disabled as a datepicker?
	   @param  target    element - the target input field or division or span
	   @return boolean - true if disabled, false if enabled */
	_isDisabledDatepicker: function(target) {
		if (!target) {
			return false;
		}
		for (var i = 0; i < this._disabledInputs.length; i++) {
			if (this._disabledInputs[i] == target)
				return true;
		}
		return false;
	},

	/* Retrieve the instance data for the target control.
	   @param  target  element - the target input field or division or span
	   @return  object - the associated instance data
	   @throws  error if a jQuery problem getting data */
	_getInst: function(target) {
		try {
			return $.data(target, PROP_NAME);
		}
		catch (err) {
			throw 'Missing instance data for this datepicker';
		}
	},

	/* Update the settings for a date picker attached to an input field or division.
	   @param  target  element - the target input field or division or span
	   @param  name    object - the new settings to update or
	                   string - the name of the setting to change or
	   @param  value   any - the new value for the setting (omit if above is an object) */
	_optionDatepicker: function(target, name, value) {
		var settings = name || {};
		if (typeof name == 'string') {
			settings = {};
			settings[name] = value;
		}
		var inst = this._getInst(target);
		if (inst) {
			if (this._curInst == inst) {
				this._hideDatepicker(null);
			}
			extendRemove(inst.settings, settings);
			var date = new Date();
			extendRemove(inst, {rangeStart: null, // start of range
				endDay: null, endMonth: null, endYear: null, // end of range
				selectedDay: date.getDate(), selectedMonth: date.getMonth(),
				selectedYear: date.getFullYear(), // starting point
				currentDay: date.getDate(), currentMonth: date.getMonth(),
				currentYear: date.getFullYear(), // current selection
				drawMonth: date.getMonth(), drawYear: date.getFullYear()}); // month being drawn
			this._updateDatepicker(inst);
		}
	},

	// change method deprecated
	_changeDatepicker: function(target, name, value) {
		this._optionDatepicker(target, name, value);
	},

	/* Redraw the date picker attached to an input field or division.
	   @param  target  element - the target input field or division or span */
	_refreshDatepicker: function(target) {
		var inst = this._getInst(target);
		if (inst) {
			this._updateDatepicker(inst);
		}
	},

	/* Set the dates for a jQuery selection.
	   @param  target   element - the target input field or division or span
	   @param  date     Date - the new date
	   @param  endDate  Date - the new end date for a range (optional) */
	_setDateDatepicker: function(target, date, endDate) {
		var inst = this._getInst(target);
		if (inst) {
			this._setDate(inst, date, endDate);
			this._updateDatepicker(inst);
			this._updateAlternate(inst);
		}
	},

	/* Get the date(s) for the first entry in a jQuery selection.
	   @param  target  element - the target input field or division or span
	   @return Date - the current date or
	           Date[2] - the current dates for a range */
	_getDateDatepicker: function(target) {
		var inst = this._getInst(target);
		if (inst && !inst.inline)
			this._setDateFromField(inst);
		return (inst ? this._getDate(inst) : null);
	},

	/* Handle keystrokes. */
	_doKeyDown: function(event) {
		var inst = $.datepicker._getInst(event.target);
		var handled = true;
		var isRTL = inst.dpDiv.is('.ui-datepicker-rtl');
		inst._keyEvent = true;
		if ($.datepicker._datepickerShowing)
			switch (event.keyCode) {
				case 9:  $.datepicker._hideDatepicker(null, '');
						break; // hide on tab out
				case 13: var sel = $('td.' + $.datepicker._dayOverClass +
							', td.' + $.datepicker._currentClass, inst.dpDiv);
						if (sel[0])
							$.datepicker._selectDay(event.target, inst.selectedMonth, inst.selectedYear, sel[0]);
						else
							$.datepicker._hideDatepicker(null, $.datepicker._get(inst, 'duration'));
						return false; // don't submit the form
						break; // select the value on enter
				case 27: $.datepicker._hideDatepicker(null, $.datepicker._get(inst, 'duration'));
						break; // hide on escape
				case 33: $.datepicker._adjustDate(event.target, (event.ctrlKey ?
							-$.datepicker._get(inst, 'stepBigMonths') :
							-$.datepicker._get(inst, 'stepMonths')), 'M');
						break; // previous month/year on page up/+ ctrl
				case 34: $.datepicker._adjustDate(event.target, (event.ctrlKey ?
							+$.datepicker._get(inst, 'stepBigMonths') :
							+$.datepicker._get(inst, 'stepMonths')), 'M');
						break; // next month/year on page down/+ ctrl
				case 35: if (event.ctrlKey || event.metaKey) $.datepicker._clearDate(event.target);
						handled = event.ctrlKey || event.metaKey;
						break; // clear on ctrl or command +end
				case 36: if (event.ctrlKey || event.metaKey) $.datepicker._gotoToday(event.target);
						handled = event.ctrlKey || event.metaKey;
						break; // current on ctrl or command +home
				case 37: if (event.ctrlKey || event.metaKey) $.datepicker._adjustDate(event.target, (isRTL ? +1 : -1), 'D');
						handled = event.ctrlKey || event.metaKey;
						// -1 day on ctrl or command +left
						if (event.originalEvent.altKey) $.datepicker._adjustDate(event.target, (event.ctrlKey ?
									-$.datepicker._get(inst, 'stepBigMonths') :
									-$.datepicker._get(inst, 'stepMonths')), 'M');
						// next month/year on alt +left on Mac
						break;
				case 38: if (event.ctrlKey || event.metaKey) $.datepicker._adjustDate(event.target, -7, 'D');
						handled = event.ctrlKey || event.metaKey;
						break; // -1 week on ctrl or command +up
				case 39: if (event.ctrlKey || event.metaKey) $.datepicker._adjustDate(event.target, (isRTL ? -1 : +1), 'D');
						handled = event.ctrlKey || event.metaKey;
						// +1 day on ctrl or command +right
						if (event.originalEvent.altKey) $.datepicker._adjustDate(event.target, (event.ctrlKey ?
									+$.datepicker._get(inst, 'stepBigMonths') :
									+$.datepicker._get(inst, 'stepMonths')), 'M');
						// next month/year on alt +right
						break;
				case 40: if (event.ctrlKey || event.metaKey) $.datepicker._adjustDate(event.target, +7, 'D');
						handled = event.ctrlKey || event.metaKey;
						break; // +1 week on ctrl or command +down
				default: handled = false;
			}
		else if (event.keyCode == 36 && event.ctrlKey) // display the date picker on ctrl+home
			$.datepicker._showDatepicker(this);
		else {
			handled = false;
		}
		if (handled) {
			event.preventDefault();
			event.stopPropagation();
		}
	},

	/* Filter entered characters - based on date format. */
	_doKeyPress: function(event) {
		var inst = $.datepicker._getInst(event.target);
		if ($.datepicker._get(inst, 'constrainInput')) {
			var chars = $.datepicker._possibleChars($.datepicker._get(inst, 'dateFormat'));
			var chr = String.fromCharCode(event.charCode == undefined ? event.keyCode : event.charCode);
			return event.ctrlKey || (chr < ' ' || !chars || chars.indexOf(chr) > -1);
		}
	},

	/* Pop-up the date picker for a given input field.
	   @param  input  element - the input field attached to the date picker or
	                  event - if triggered by focus */
	_showDatepicker: function(input) {
		input = input.target || input;
		if (input.nodeName.toLowerCase() != 'input') // find from button/image trigger
			input = $('input', input.parentNode)[0];
		if ($.datepicker._isDisabledDatepicker(input) || $.datepicker._lastInput == input) // already here
			return;
		var inst = $.datepicker._getInst(input);
		var beforeShow = $.datepicker._get(inst, 'beforeShow');
		extendRemove(inst.settings, (beforeShow ? beforeShow.apply(input, [input, inst]) : {}));
		$.datepicker._hideDatepicker(null, '');
		$.datepicker._lastInput = input;
		$.datepicker._setDateFromField(inst);
		if ($.datepicker._inDialog) // hide cursor
			input.value = '';
		if (!$.datepicker._pos) { // position below input
			$.datepicker._pos = $.datepicker._findPos(input);
			$.datepicker._pos[1] += input.offsetHeight; // add the height
		}
		var isFixed = false;
		$(input).parents().each(function() {
			isFixed |= $(this).css('position') == 'fixed';
			return !isFixed;
		});
		if (isFixed && $.browser.opera) { // correction for Opera when fixed and scrolled
			$.datepicker._pos[0] -= document.documentElement.scrollLeft;
			$.datepicker._pos[1] -= document.documentElement.scrollTop;
		}
		var offset = {left: $.datepicker._pos[0], top: $.datepicker._pos[1]};
		$.datepicker._pos = null;
		inst.rangeStart = null;
		// determine sizing offscreen
		inst.dpDiv.css({position: 'absolute', display: 'block', top: '-1000px'});
		$.datepicker._updateDatepicker(inst);
		// fix width for dynamic number of date pickers
		// and adjust position before showing
		offset = $.datepicker._checkOffset(inst, offset, isFixed);
		inst.dpDiv.css({position: ($.datepicker._inDialog && $.blockUI ?
			'static' : (isFixed ? 'fixed' : 'absolute')), display: 'none',
			left: offset.left + 'px', top: offset.top + 'px'});
		if (!inst.inline) {
			var showAnim = $.datepicker._get(inst, 'showAnim') || 'show';
			var duration = $.datepicker._get(inst, 'duration');
			var postProcess = function() {
				$.datepicker._datepickerShowing = true;
				if ($.browser.msie && parseInt($.browser.version,10) < 7) // fix IE < 7 select problems
					$('iframe.ui-datepicker-cover').css({width: inst.dpDiv.width() + 4,
						height: inst.dpDiv.height() + 4});
			};
			if ($.effects && $.effects[showAnim])
				inst.dpDiv.show(showAnim, $.datepicker._get(inst, 'showOptions'), duration, postProcess);
			else
				inst.dpDiv[showAnim](duration, postProcess);
			if (duration == '')
				postProcess();
			if (inst.input[0].type != 'hidden')
				inst.input[0].focus();
			$.datepicker._curInst = inst;
		}
	},

	/* Generate the date picker content. */
	_updateDatepicker: function(inst) {
		var dims = {width: inst.dpDiv.width() + 4,
			height: inst.dpDiv.height() + 4};
		var self = this;
		inst.dpDiv.empty().append(this._generateHTML(inst))
			.find('iframe.ui-datepicker-cover').
				css({width: dims.width, height: dims.height})
			.end()
			.find('button, .ui-datepicker-prev, .ui-datepicker-next, .ui-datepicker-calendar td a')
				.bind('mouseout', function(){
					$(this).removeClass('ui-state-hover');
					if(this.className.indexOf('ui-datepicker-prev') != -1) $(this).removeClass('ui-datepicker-prev-hover');
					if(this.className.indexOf('ui-datepicker-next') != -1) $(this).removeClass('ui-datepicker-next-hover');
				})
				.bind('mouseover', function(){
					if (!self._isDisabledDatepicker( inst.inline ? inst.dpDiv.parent()[0] : inst.input[0])) {
						$(this).parents('.ui-datepicker-calendar').find('a').removeClass('ui-state-hover');
						$(this).addClass('ui-state-hover');
						if(this.className.indexOf('ui-datepicker-prev') != -1) $(this).addClass('ui-datepicker-prev-hover');
						if(this.className.indexOf('ui-datepicker-next') != -1) $(this).addClass('ui-datepicker-next-hover');
					}
				})
			.end()
			.find('.' + this._dayOverClass + ' a')
				.trigger('mouseover')
			.end();
		var numMonths = this._getNumberOfMonths(inst);
		var cols = numMonths[1];
		var width = 17;
		if (cols > 1) {
			inst.dpDiv.addClass('ui-datepicker-multi-' + cols).css('width', (width * cols) + 'em');
		} else {
			inst.dpDiv.removeClass('ui-datepicker-multi-2 ui-datepicker-multi-3 ui-datepicker-multi-4').width('');
		}
		inst.dpDiv[(numMonths[0] != 1 || numMonths[1] != 1 ? 'add' : 'remove') +
			'Class']('ui-datepicker-multi');
		inst.dpDiv[(this._get(inst, 'isRTL') ? 'add' : 'remove') +
			'Class']('ui-datepicker-rtl');
		if (inst.input && inst.input[0].type != 'hidden' && inst == $.datepicker._curInst)
			$(inst.input[0]).focus();
	},

	/* Check positioning to remain on screen. */
	_checkOffset: function(inst, offset, isFixed) {
		var dpWidth = inst.dpDiv.outerWidth();
		var dpHeight = inst.dpDiv.outerHeight();
		var inputWidth = inst.input ? inst.input.outerWidth() : 0;
		var inputHeight = inst.input ? inst.input.outerHeight() : 0;
		var viewWidth = (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth) + $(document).scrollLeft();
		var viewHeight = (window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight) + $(document).scrollTop();

		offset.left -= (this._get(inst, 'isRTL') ? (dpWidth - inputWidth) : 0);
		offset.left -= (isFixed && offset.left == inst.input.offset().left) ? $(document).scrollLeft() : 0;
		offset.top -= (isFixed && offset.top == (inst.input.offset().top + inputHeight)) ? $(document).scrollTop() : 0;

		// now check if datepicker is showing outside window viewport - move to a better place if so.
		offset.left -= (offset.left + dpWidth > viewWidth && viewWidth > dpWidth) ? Math.abs(offset.left + dpWidth - viewWidth) : 0;
		offset.top -= (offset.top + dpHeight > viewHeight && viewHeight > dpHeight) ? Math.abs(offset.top + dpHeight + inputHeight*2 - viewHeight) : 0;

		return offset;
	},

	/* Find an object's position on the screen. */
	_findPos: function(obj) {
        while (obj && (obj.type == 'hidden' || obj.nodeType != 1)) {
            obj = obj.nextSibling;
        }
        var position = $(obj).offset();
	    return [position.left, position.top];
	},

	/* Hide the date picker from view.
	   @param  input  element - the input field attached to the date picker
	   @param  duration  string - the duration over which to close the date picker */
	_hideDatepicker: function(input, duration) {
		var inst = this._curInst;
		if (!inst || (input && inst != $.data(input, PROP_NAME)))
			return;
		if (inst.stayOpen)
			this._selectDate('#' + inst.id, this._formatDate(inst,
				inst.currentDay, inst.currentMonth, inst.currentYear));
		inst.stayOpen = false;
		if (this._datepickerShowing) {
			duration = (duration != null ? duration : this._get(inst, 'duration'));
			var showAnim = this._get(inst, 'showAnim');
			var postProcess = function() {
				$.datepicker._tidyDialog(inst);
			};
			if (duration != '' && $.effects && $.effects[showAnim])
				inst.dpDiv.hide(showAnim, $.datepicker._get(inst, 'showOptions'),
					duration, postProcess);
			else
				inst.dpDiv[(duration == '' ? 'hide' : (showAnim == 'slideDown' ? 'slideUp' :
					(showAnim == 'fadeIn' ? 'fadeOut' : 'hide')))](duration, postProcess);
			if (duration == '')
				this._tidyDialog(inst);
			var onClose = this._get(inst, 'onClose');
			if (onClose)
				onClose.apply((inst.input ? inst.input[0] : null),
					[(inst.input ? inst.input.val() : ''), inst]);  // trigger custom callback
			this._datepickerShowing = false;
			this._lastInput = null;
			if (this._inDialog) {
				this._dialogInput.css({ position: 'absolute', left: '0', top: '-100px' });
				if ($.blockUI) {
					$.unblockUI();
					$('body').append(this.dpDiv);
				}
			}
			this._inDialog = false;
		}
		this._curInst = null;
	},

	/* Tidy up after a dialog display. */
	_tidyDialog: function(inst) {
		inst.dpDiv.removeClass(this._dialogClass).unbind('.ui-datepicker-calendar');
	},

	/* Close date picker if clicked elsewhere. */
	_checkExternalClick: function(event) {
		if (!$.datepicker._curInst)
			return;
		var $target = $(event.target);
		if (($target.parents('#' + $.datepicker._mainDivId).length == 0) &&
				!$target.hasClass($.datepicker.markerClassName) &&
				!$target.hasClass($.datepicker._triggerClass) &&
				$.datepicker._datepickerShowing && !($.datepicker._inDialog && $.blockUI))
			$.datepicker._hideDatepicker(null, '');
	},

	/* Adjust one of the date sub-fields. */
	_adjustDate: function(id, offset, period) {
		var target = $(id);
		var inst = this._getInst(target[0]);
		if (this._isDisabledDatepicker(target[0])) {
			return;
		}
		this._adjustInstDate(inst, offset +
			(period == 'M' ? this._get(inst, 'showCurrentAtPos') : 0), // undo positioning
			period);
		this._updateDatepicker(inst);
	},

	/* Action for current link. */
	_gotoToday: function(id) {
		var target = $(id);
		var inst = this._getInst(target[0]);
		if (this._get(inst, 'gotoCurrent') && inst.currentDay) {
			inst.selectedDay = inst.currentDay;
			inst.drawMonth = inst.selectedMonth = inst.currentMonth;
			inst.drawYear = inst.selectedYear = inst.currentYear;
		}
		else {
		var date = new Date();
		inst.selectedDay = date.getDate();
		inst.drawMonth = inst.selectedMonth = date.getMonth();
		inst.drawYear = inst.selectedYear = date.getFullYear();
		}
		this._notifyChange(inst);
		this._adjustDate(target);
	},

	/* Action for selecting a new month/year. */
	_selectMonthYear: function(id, select, period) {
		var target = $(id);
		var inst = this._getInst(target[0]);
		inst._selectingMonthYear = false;
		inst['selected' + (period == 'M' ? 'Month' : 'Year')] =
		inst['draw' + (period == 'M' ? 'Month' : 'Year')] =
			parseInt(select.options[select.selectedIndex].value,10);
		this._notifyChange(inst);
		this._adjustDate(target);
	},

	/* Restore input focus after not changing month/year. */
	_clickMonthYear: function(id) {
		var target = $(id);
		var inst = this._getInst(target[0]);
		if (inst.input && inst._selectingMonthYear && !$.browser.msie)
			inst.input[0].focus();
		inst._selectingMonthYear = !inst._selectingMonthYear;
	},

	/* Action for selecting a day. */
	_selectDay: function(id, month, year, td) {
		var target = $(id);
		if ($(td).hasClass(this._unselectableClass) || this._isDisabledDatepicker(target[0])) {
			return;
		}
		var inst = this._getInst(target[0]);
		inst.selectedDay = inst.currentDay = $('a', td).html();
		inst.selectedMonth = inst.currentMonth = month;
		inst.selectedYear = inst.currentYear = year;
		if (inst.stayOpen) {
			inst.endDay = inst.endMonth = inst.endYear = null;
		}
		this._selectDate(id, this._formatDate(inst,
			inst.currentDay, inst.currentMonth, inst.currentYear));
		if (inst.stayOpen) {
			inst.rangeStart = this._daylightSavingAdjust(
				new Date(inst.currentYear, inst.currentMonth, inst.currentDay));
			this._updateDatepicker(inst);
		}
	},

	/* Erase the input field and hide the date picker. */
	_clearDate: function(id) {
		var target = $(id);
		var inst = this._getInst(target[0]);
		inst.stayOpen = false;
		inst.endDay = inst.endMonth = inst.endYear = inst.rangeStart = null;
		this._selectDate(target, '');
	},

	/* Update the input field with the selected date. */
	_selectDate: function(id, dateStr) {
		var target = $(id);
		var inst = this._getInst(target[0]);
		dateStr = (dateStr != null ? dateStr : this._formatDate(inst));
		if (inst.input)
			inst.input.val(dateStr);
		this._updateAlternate(inst);
		var onSelect = this._get(inst, 'onSelect');
		if (onSelect)
			onSelect.apply((inst.input ? inst.input[0] : null), [dateStr, inst]);  // trigger custom callback
		else if (inst.input)
			inst.input.trigger('change'); // fire the change event
		if (inst.inline)
			this._updateDatepicker(inst);
		else if (!inst.stayOpen) {
			this._hideDatepicker(null, this._get(inst, 'duration'));
			this._lastInput = inst.input[0];
			if (typeof(inst.input[0]) != 'object')
				inst.input[0].focus(); // restore focus
			this._lastInput = null;
		}
	},

	/* Update any alternate field to synchronise with the main field. */
	_updateAlternate: function(inst) {
		var altField = this._get(inst, 'altField');
		if (altField) { // update alternate field too
			var altFormat = this._get(inst, 'altFormat') || this._get(inst, 'dateFormat');
			var date = this._getDate(inst);
			dateStr = this.formatDate(altFormat, date, this._getFormatConfig(inst));
			$(altField).each(function() { $(this).val(dateStr); });
		}
	},

	/* Set as beforeShowDay function to prevent selection of weekends.
	   @param  date  Date - the date to customise
	   @return [boolean, string] - is this date selectable?, what is its CSS class? */
	noWeekends: function(date) {
		var day = date.getDay();
		return [(day > 0 && day < 6), ''];
	},

	/* Set as calculateWeek to determine the week of the year based on the ISO 8601 definition.
	   @param  date  Date - the date to get the week for
	   @return  number - the number of the week within the year that contains this date */
	iso8601Week: function(date) {
		var checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
		var firstMon = new Date(checkDate.getFullYear(), 1 - 1, 4); // First week always contains 4 Jan
		var firstDay = firstMon.getDay() || 7; // Day of week: Mon = 1, ..., Sun = 7
		firstMon.setDate(firstMon.getDate() + 1 - firstDay); // Preceding Monday
		if (firstDay < 4 && checkDate < firstMon) { // Adjust first three days in year if necessary
			checkDate.setDate(checkDate.getDate() - 3); // Generate for previous year
			return $.datepicker.iso8601Week(checkDate);
		} else if (checkDate > new Date(checkDate.getFullYear(), 12 - 1, 28)) { // Check last three days in year
			firstDay = new Date(checkDate.getFullYear() + 1, 1 - 1, 4).getDay() || 7;
			if (firstDay > 4 && (checkDate.getDay() || 7) < firstDay - 3) { // Adjust if necessary
				return 1;
			}
		}
		return Math.floor(((checkDate - firstMon) / 86400000) / 7) + 1; // Weeks to given date
	},

	/* Parse a string value into a date object.
	   See formatDate below for the possible formats.

	   @param  format    string - the expected format of the date
	   @param  value     string - the date in the above format
	   @param  settings  Object - attributes include:
	                     shortYearCutoff  number - the cutoff year for determining the century (optional)
	                     dayNamesShort    string[7] - abbreviated names of the days from Sunday (optional)
	                     dayNames         string[7] - names of the days from Sunday (optional)
	                     monthNamesShort  string[12] - abbreviated names of the months (optional)
	                     monthNames       string[12] - names of the months (optional)
	   @return  Date - the extracted date value or null if value is blank */
	parseDate: function (format, value, settings) {
		if (format == null || value == null)
			throw 'Invalid arguments';
		value = (typeof value == 'object' ? value.toString() : value + '');
		if (value == '')
			return null;
		var shortYearCutoff = (settings ? settings.shortYearCutoff : null) || this._defaults.shortYearCutoff;
		var dayNamesShort = (settings ? settings.dayNamesShort : null) || this._defaults.dayNamesShort;
		var dayNames = (settings ? settings.dayNames : null) || this._defaults.dayNames;
		var monthNamesShort = (settings ? settings.monthNamesShort : null) || this._defaults.monthNamesShort;
		var monthNames = (settings ? settings.monthNames : null) || this._defaults.monthNames;
		var year = -1;
		var month = -1;
		var day = -1;
		var doy = -1;
		var literal = false;
		// Check whether a format character is doubled
		var lookAhead = function(match) {
			var matches = (iFormat + 1 < format.length && format.charAt(iFormat + 1) == match);
			if (matches)
				iFormat++;
			return matches;
		};
		// Extract a number from the string value
		var getNumber = function(match) {
			lookAhead(match);
			var origSize = (match == '@' ? 14 : (match == 'y' ? 4 : (match == 'o' ? 3 : 2)));
			var size = origSize;
			var num = 0;
			while (size > 0 && iValue < value.length &&
					value.charAt(iValue) >= '0' && value.charAt(iValue) <= '9') {
				num = num * 10 + parseInt(value.charAt(iValue++),10);
				size--;
			}
			if (size == origSize)
				throw 'Missing number at position ' + iValue;
			return num;
		};
		// Extract a name from the string value and convert to an index
		var getName = function(match, shortNames, longNames) {
			var names = (lookAhead(match) ? longNames : shortNames);
			var size = 0;
			for (var j = 0; j < names.length; j++)
				size = Math.max(size, names[j].length);
			var name = '';
			var iInit = iValue;
			while (size > 0 && iValue < value.length) {
				name += value.charAt(iValue++);
				for (var i = 0; i < names.length; i++)
					if (name == names[i])
						return i + 1;
				size--;
			}
			throw 'Unknown name at position ' + iInit;
		};
		// Confirm that a literal character matches the string value
		var checkLiteral = function() {
			if (value.charAt(iValue) != format.charAt(iFormat))
				throw 'Unexpected literal at position ' + iValue;
			iValue++;
		};
		var iValue = 0;
		for (var iFormat = 0; iFormat < format.length; iFormat++) {
			if (literal)
				if (format.charAt(iFormat) == "'" && !lookAhead("'"))
					literal = false;
				else
					checkLiteral();
			else
				switch (format.charAt(iFormat)) {
					case 'd':
						day = getNumber('d');
						break;
					case 'D':
						getName('D', dayNamesShort, dayNames);
						break;
					case 'o':
						doy = getNumber('o');
						break;
					case 'm':
						month = getNumber('m');
						break;
					case 'M':
						month = getName('M', monthNamesShort, monthNames);
						break;
					case 'y':
						year = getNumber('y');
						break;
					case '@':
						var date = new Date(getNumber('@'));
						year = date.getFullYear();
						month = date.getMonth() + 1;
						day = date.getDate();
						break;
					case "'":
						if (lookAhead("'"))
							checkLiteral();
						else
							literal = true;
						break;
					default:
						checkLiteral();
				}
		}
		if (year == -1)
			year = new Date().getFullYear();
		else if (year < 100)
			year += new Date().getFullYear() - new Date().getFullYear() % 100 +
				(year <= shortYearCutoff ? 0 : -100);
		if (doy > -1) {
			month = 1;
			day = doy;
			do {
				var dim = this._getDaysInMonth(year, month - 1);
				if (day <= dim)
					break;
				month++;
				day -= dim;
			} while (true);
		}
		var date = this._daylightSavingAdjust(new Date(year, month - 1, day));
		if (date.getFullYear() != year || date.getMonth() + 1 != month || date.getDate() != day)
			throw 'Invalid date'; // E.g. 31/02/*
		return date;
	},

	/* Standard date formats. */
	ATOM: 'yy-mm-dd', // RFC 3339 (ISO 8601)
	COOKIE: 'D, dd M yy',
	ISO_8601: 'yy-mm-dd',
	RFC_822: 'D, d M y',
	RFC_850: 'DD, dd-M-y',
	RFC_1036: 'D, d M y',
	RFC_1123: 'D, d M yy',
	RFC_2822: 'D, d M yy',
	RSS: 'D, d M y', // RFC 822
	TIMESTAMP: '@',
	W3C: 'yy-mm-dd', // ISO 8601

	/* Format a date object into a string value.
	   The format can be combinations of the following:
	   d  - day of month (no leading zero)
	   dd - day of month (two digit)
	   o  - day of year (no leading zeros)
	   oo - day of year (three digit)
	   D  - day name short
	   DD - day name long
	   m  - month of year (no leading zero)
	   mm - month of year (two digit)
	   M  - month name short
	   MM - month name long
	   y  - year (two digit)
	   yy - year (four digit)
	   @ - Unix timestamp (ms since 01/01/1970)
	   '...' - literal text
	   '' - single quote

	   @param  format    string - the desired format of the date
	   @param  date      Date - the date value to format
	   @param  settings  Object - attributes include:
	                     dayNamesShort    string[7] - abbreviated names of the days from Sunday (optional)
	                     dayNames         string[7] - names of the days from Sunday (optional)
	                     monthNamesShort  string[12] - abbreviated names of the months (optional)
	                     monthNames       string[12] - names of the months (optional)
	   @return  string - the date in the above format */
	formatDate: function (format, date, settings) {
		if (!date)
			return '';
		var dayNamesShort = (settings ? settings.dayNamesShort : null) || this._defaults.dayNamesShort;
		var dayNames = (settings ? settings.dayNames : null) || this._defaults.dayNames;
		var monthNamesShort = (settings ? settings.monthNamesShort : null) || this._defaults.monthNamesShort;
		var monthNames = (settings ? settings.monthNames : null) || this._defaults.monthNames;
		// Check whether a format character is doubled
		var lookAhead = function(match) {
			var matches = (iFormat + 1 < format.length && format.charAt(iFormat + 1) == match);
			if (matches)
				iFormat++;
			return matches;
		};
		// Format a number, with leading zero if necessary
		var formatNumber = function(match, value, len) {
			var num = '' + value;
			if (lookAhead(match))
				while (num.length < len)
					num = '0' + num;
			return num;
		};
		// Format a name, short or long as requested
		var formatName = function(match, value, shortNames, longNames) {
			return (lookAhead(match) ? longNames[value] : shortNames[value]);
		};
		var output = '';
		var literal = false;
		if (date)
			for (var iFormat = 0; iFormat < format.length; iFormat++) {
				if (literal)
					if (format.charAt(iFormat) == "'" && !lookAhead("'"))
						literal = false;
					else
						output += format.charAt(iFormat);
				else
					switch (format.charAt(iFormat)) {
						case 'd':
							output += formatNumber('d', date.getDate(), 2);
							break;
						case 'D':
							output += formatName('D', date.getDay(), dayNamesShort, dayNames);
							break;
						case 'o':
							var doy = date.getDate();
							for (var m = date.getMonth() - 1; m >= 0; m--)
								doy += this._getDaysInMonth(date.getFullYear(), m);
							output += formatNumber('o', doy, 3);
							break;
						case 'm':
							output += formatNumber('m', date.getMonth() + 1, 2);
							break;
						case 'M':
							output += formatName('M', date.getMonth(), monthNamesShort, monthNames);
							break;
						case 'y':
							output += (lookAhead('y') ? date.getFullYear() :
								(date.getYear() % 100 < 10 ? '0' : '') + date.getYear() % 100);
							break;
						case '@':
							output += date.getTime();
							break;
						case "'":
							if (lookAhead("'"))
								output += "'";
							else
								literal = true;
							break;
						default:
							output += format.charAt(iFormat);
					}
			}
		return output;
	},

	/* Extract all possible characters from the date format. */
	_possibleChars: function (format) {
		var chars = '';
		var literal = false;
		for (var iFormat = 0; iFormat < format.length; iFormat++)
			if (literal)
				if (format.charAt(iFormat) == "'" && !lookAhead("'"))
					literal = false;
				else
					chars += format.charAt(iFormat);
			else
				switch (format.charAt(iFormat)) {
					case 'd': case 'm': case 'y': case '@':
						chars += '0123456789';
						break;
					case 'D': case 'M':
						return null; // Accept anything
					case "'":
						if (lookAhead("'"))
							chars += "'";
						else
							literal = true;
						break;
					default:
						chars += format.charAt(iFormat);
				}
		return chars;
	},

	/* Get a setting value, defaulting if necessary. */
	_get: function(inst, name) {
		return inst.settings[name] !== undefined ?
			inst.settings[name] : this._defaults[name];
	},

	/* Parse existing date and initialise date picker. */
	_setDateFromField: function(inst) {
		var dateFormat = this._get(inst, 'dateFormat');
		var dates = inst.input ? inst.input.val() : null;
		inst.endDay = inst.endMonth = inst.endYear = null;
		var date = defaultDate = this._getDefaultDate(inst);
		var settings = this._getFormatConfig(inst);
		try {
			date = this.parseDate(dateFormat, dates, settings) || defaultDate;
		} catch (event) {
			this.log(event);
			date = defaultDate;
		}
		inst.selectedDay = date.getDate();
		inst.drawMonth = inst.selectedMonth = date.getMonth();
		inst.drawYear = inst.selectedYear = date.getFullYear();
		inst.currentDay = (dates ? date.getDate() : 0);
		inst.currentMonth = (dates ? date.getMonth() : 0);
		inst.currentYear = (dates ? date.getFullYear() : 0);
		this._adjustInstDate(inst);
	},

	/* Retrieve the default date shown on opening. */
	_getDefaultDate: function(inst) {
		var date = this._determineDate(this._get(inst, 'defaultDate'), new Date());
		var minDate = this._getMinMaxDate(inst, 'min', true);
		var maxDate = this._getMinMaxDate(inst, 'max');
		date = (minDate && date < minDate ? minDate : date);
		date = (maxDate && date > maxDate ? maxDate : date);
		return date;
	},

	/* A date may be specified as an exact value or a relative one. */
	_determineDate: function(date, defaultDate) {
		var offsetNumeric = function(offset) {
			var date = new Date();
			date.setDate(date.getDate() + offset);
			return date;
		};
		var offsetString = function(offset, getDaysInMonth) {
			var date = new Date();
			var year = date.getFullYear();
			var month = date.getMonth();
			var day = date.getDate();
			var pattern = /([+-]?[0-9]+)\s*(d|D|w|W|m|M|y|Y)?/g;
			var matches = pattern.exec(offset);
			while (matches) {
				switch (matches[2] || 'd') {
					case 'd' : case 'D' :
						day += parseInt(matches[1],10); break;
					case 'w' : case 'W' :
						day += parseInt(matches[1],10) * 7; break;
					case 'm' : case 'M' :
						month += parseInt(matches[1],10);
						day = Math.min(day, getDaysInMonth(year, month));
						break;
					case 'y': case 'Y' :
						year += parseInt(matches[1],10);
						day = Math.min(day, getDaysInMonth(year, month));
						break;
				}
				matches = pattern.exec(offset);
			}
			return new Date(year, month, day);
		};
		date = (date == null ? defaultDate :
			(typeof date == 'string' ? offsetString(date, this._getDaysInMonth) :
			(typeof date == 'number' ? (isNaN(date) ? defaultDate : offsetNumeric(date)) : date)));
		date = (date && date.toString() == 'Invalid Date' ? defaultDate : date);
		if (date) {
			date.setHours(0);
			date.setMinutes(0);
			date.setSeconds(0);
			date.setMilliseconds(0);
		}
		return this._daylightSavingAdjust(date);
	},

	/* Handle switch to/from daylight saving.
	   Hours may be non-zero on daylight saving cut-over:
	   > 12 when midnight changeover, but then cannot generate
	   midnight datetime, so jump to 1AM, otherwise reset.
	   @param  date  (Date) the date to check
	   @return  (Date) the corrected date */
	_daylightSavingAdjust: function(date) {
		if (!date) return null;
		date.setHours(date.getHours() > 12 ? date.getHours() + 2 : 0);
		return date;
	},

	/* Set the date(s) directly. */
	_setDate: function(inst, date, endDate) {
		var clear = !(date);
		var origMonth = inst.selectedMonth;
		var origYear = inst.selectedYear;
		date = this._determineDate(date, new Date());
		inst.selectedDay = inst.currentDay = date.getDate();
		inst.drawMonth = inst.selectedMonth = inst.currentMonth = date.getMonth();
		inst.drawYear = inst.selectedYear = inst.currentYear = date.getFullYear();
		if (origMonth != inst.selectedMonth || origYear != inst.selectedYear)
			this._notifyChange(inst);
		this._adjustInstDate(inst);
		if (inst.input) {
			inst.input.val(clear ? '' : this._formatDate(inst));
		}
	},

	/* Retrieve the date(s) directly. */
	_getDate: function(inst) {
		var startDate = (!inst.currentYear || (inst.input && inst.input.val() == '') ? null :
			this._daylightSavingAdjust(new Date(
			inst.currentYear, inst.currentMonth, inst.currentDay)));
			return startDate;
	},

	/* Generate the HTML for the current state of the date picker. */
	_generateHTML: function(inst) {
		var today = new Date();
		today = this._daylightSavingAdjust(
			new Date(today.getFullYear(), today.getMonth(), today.getDate())); // clear time
		var isRTL = this._get(inst, 'isRTL');
		var showButtonPanel = this._get(inst, 'showButtonPanel');
		var hideIfNoPrevNext = this._get(inst, 'hideIfNoPrevNext');
		var navigationAsDateFormat = this._get(inst, 'navigationAsDateFormat');
		var numMonths = this._getNumberOfMonths(inst);
		var showCurrentAtPos = this._get(inst, 'showCurrentAtPos');
		var stepMonths = this._get(inst, 'stepMonths');
		var stepBigMonths = this._get(inst, 'stepBigMonths');
		var isMultiMonth = (numMonths[0] != 1 || numMonths[1] != 1);
		var currentDate = this._daylightSavingAdjust((!inst.currentDay ? new Date(9999, 9, 9) :
			new Date(inst.currentYear, inst.currentMonth, inst.currentDay)));
		var minDate = this._getMinMaxDate(inst, 'min', true);
		var maxDate = this._getMinMaxDate(inst, 'max');
		var drawMonth = inst.drawMonth - showCurrentAtPos;
		var drawYear = inst.drawYear;
		if (drawMonth < 0) {
			drawMonth += 12;
			drawYear--;
		}
		if (maxDate) {
			var maxDraw = this._daylightSavingAdjust(new Date(maxDate.getFullYear(),
				maxDate.getMonth() - numMonths[1] + 1, maxDate.getDate()));
			maxDraw = (minDate && maxDraw < minDate ? minDate : maxDraw);
			while (this._daylightSavingAdjust(new Date(drawYear, drawMonth, 1)) > maxDraw) {
				drawMonth--;
				if (drawMonth < 0) {
					drawMonth = 11;
					drawYear--;
				}
			}
		}
		inst.drawMonth = drawMonth;
		inst.drawYear = drawYear;
		var prevText = this._get(inst, 'prevText');
		prevText = (!navigationAsDateFormat ? prevText : this.formatDate(prevText,
			this._daylightSavingAdjust(new Date(drawYear, drawMonth - stepMonths, 1)),
			this._getFormatConfig(inst)));
		var prev = (this._canAdjustMonth(inst, -1, drawYear, drawMonth) ?
			'<a class="ui-datepicker-prev ui-corner-all" onclick="DP_jQuery.datepicker._adjustDate(\'#' + inst.id + '\', -' + stepMonths + ', \'M\');"' +
			' title="' + prevText + '"><span class="ui-icon ui-icon-circle-triangle-' + ( isRTL ? 'e' : 'w') + '">' + prevText + '</span></a>' :
			(hideIfNoPrevNext ? '' : '<a class="ui-datepicker-prev ui-corner-all ui-state-disabled" title="'+ prevText +'"><span class="ui-icon ui-icon-circle-triangle-' + ( isRTL ? 'e' : 'w') + '">' + prevText + '</span></a>'));
		var nextText = this._get(inst, 'nextText');
		nextText = (!navigationAsDateFormat ? nextText : this.formatDate(nextText,
			this._daylightSavingAdjust(new Date(drawYear, drawMonth + stepMonths, 1)),
			this._getFormatConfig(inst)));
		var next = (this._canAdjustMonth(inst, +1, drawYear, drawMonth) ?
			'<a class="ui-datepicker-next ui-corner-all" onclick="DP_jQuery.datepicker._adjustDate(\'#' + inst.id + '\', +' + stepMonths + ', \'M\');"' +
			' title="' + nextText + '"><span class="ui-icon ui-icon-circle-triangle-' + ( isRTL ? 'w' : 'e') + '">' + nextText + '</span></a>' :
			(hideIfNoPrevNext ? '' : '<a class="ui-datepicker-next ui-corner-all ui-state-disabled" title="'+ nextText + '"><span class="ui-icon ui-icon-circle-triangle-' + ( isRTL ? 'w' : 'e') + '">' + nextText + '</span></a>'));
		var currentText = this._get(inst, 'currentText');
		var gotoDate = (this._get(inst, 'gotoCurrent') && inst.currentDay ? currentDate : today);
		currentText = (!navigationAsDateFormat ? currentText :
			this.formatDate(currentText, gotoDate, this._getFormatConfig(inst)));
		var controls = (!inst.inline ? '<button type="button" class="ui-datepicker-close ui-state-default ui-priority-primary ui-corner-all" onclick="DP_jQuery.datepicker._hideDatepicker();">' + this._get(inst, 'closeText') + '</button>' : '');
		var buttonPanel = (showButtonPanel) ? '<div class="ui-datepicker-buttonpane ui-widget-content">' + (isRTL ? controls : '') +
			(this._isInRange(inst, gotoDate) ? '<button type="button" class="ui-datepicker-current ui-state-default ui-priority-secondary ui-corner-all" onclick="DP_jQuery.datepicker._gotoToday(\'#' + inst.id + '\');"' +
			'>' + currentText + '</button>' : '') + (isRTL ? '' : controls) + '</div>' : '';
		var firstDay = parseInt(this._get(inst, 'firstDay'),10);
		firstDay = (isNaN(firstDay) ? 0 : firstDay);
		var dayNames = this._get(inst, 'dayNames');
		var dayNamesShort = this._get(inst, 'dayNamesShort');
		var dayNamesMin = this._get(inst, 'dayNamesMin');
		var monthNames = this._get(inst, 'monthNames');
		var monthNamesShort = this._get(inst, 'monthNamesShort');
		var beforeShowDay = this._get(inst, 'beforeShowDay');
		var showOtherMonths = this._get(inst, 'showOtherMonths');
		var calculateWeek = this._get(inst, 'calculateWeek') || this.iso8601Week;
		var endDate = inst.endDay ? this._daylightSavingAdjust(
			new Date(inst.endYear, inst.endMonth, inst.endDay)) : currentDate;
		var defaultDate = this._getDefaultDate(inst);
		var html = '';
		for (var row = 0; row < numMonths[0]; row++) {
			var group = '';
			for (var col = 0; col < numMonths[1]; col++) {
				var selectedDate = this._daylightSavingAdjust(new Date(drawYear, drawMonth, inst.selectedDay));
				var cornerClass = ' ui-corner-all';
				var calender = '';
				if (isMultiMonth) {
					calender += '<div class="ui-datepicker-group ui-datepicker-group-';
					switch (col) {
						case 0: calender += 'first'; cornerClass = ' ui-corner-' + (isRTL ? 'right' : 'left'); break;
						case numMonths[1]-1: calender += 'last'; cornerClass = ' ui-corner-' + (isRTL ? 'left' : 'right'); break;
						default: calender += 'middle'; cornerClass = ''; break;
					}
					calender += '">';
				}
				calender += '<div class="ui-datepicker-header ui-widget-header ui-helper-clearfix' + cornerClass + '">' +
					(/all|left/.test(cornerClass) && row == 0 ? (isRTL ? next : prev) : '') +
					(/all|right/.test(cornerClass) && row == 0 ? (isRTL ? prev : next) : '') +
					this._generateMonthYearHeader(inst, drawMonth, drawYear, minDate, maxDate,
					selectedDate, row > 0 || col > 0, monthNames, monthNamesShort) + // draw month headers
					'</div><table class="ui-datepicker-calendar"><thead>' +
					'<tr>';
				var thead = '';
				for (var dow = 0; dow < 7; dow++) { // days of the week
					var day = (dow + firstDay) % 7;
					thead += '<th' + ((dow + firstDay + 6) % 7 >= 5 ? ' class="ui-datepicker-week-end"' : '') + '>' +
						'<span title="' + dayNames[day] + '">' + dayNamesMin[day] + '</span></th>';
				}
				calender += thead + '</tr></thead><tbody>';
				var daysInMonth = this._getDaysInMonth(drawYear, drawMonth);
				if (drawYear == inst.selectedYear && drawMonth == inst.selectedMonth)
					inst.selectedDay = Math.min(inst.selectedDay, daysInMonth);
				var leadDays = (this._getFirstDayOfMonth(drawYear, drawMonth) - firstDay + 7) % 7;
				var numRows = (isMultiMonth ? 6 : Math.ceil((leadDays + daysInMonth) / 7)); // calculate the number of rows to generate
				var printDate = this._daylightSavingAdjust(new Date(drawYear, drawMonth, 1 - leadDays));
				for (var dRow = 0; dRow < numRows; dRow++) { // create date picker rows
					calender += '<tr>';
					var tbody = '';
					for (var dow = 0; dow < 7; dow++) { // create date picker days
						var daySettings = (beforeShowDay ?
							beforeShowDay.apply((inst.input ? inst.input[0] : null), [printDate]) : [true, '']);
						var otherMonth = (printDate.getMonth() != drawMonth);
						var unselectable = otherMonth || !daySettings[0] ||
							(minDate && printDate < minDate) || (maxDate && printDate > maxDate);
						tbody += '<td class="' +
							((dow + firstDay + 6) % 7 >= 5 ? ' ui-datepicker-week-end' : '') + // highlight weekends
							(otherMonth ? ' ui-datepicker-other-month' : '') + // highlight days from other months
							((printDate.getTime() == selectedDate.getTime() && drawMonth == inst.selectedMonth && inst._keyEvent) || // user pressed key
							(defaultDate.getTime() == printDate.getTime() && defaultDate.getTime() == selectedDate.getTime()) ?
							// or defaultDate is current printedDate and defaultDate is selectedDate
							' ' + this._dayOverClass : '') + // highlight selected day
							(unselectable ? ' ' + this._unselectableClass + ' ui-state-disabled': '') +  // highlight unselectable days
							(otherMonth && !showOtherMonths ? '' : ' ' + daySettings[1] + // highlight custom dates
							(printDate.getTime() >= currentDate.getTime() && printDate.getTime() <= endDate.getTime() ? // in current range
							' ' + this._currentClass : '') + // highlight selected day
							(printDate.getTime() == today.getTime() ? ' ui-datepicker-today' : '')) + '"' + // highlight today (if different)
							((!otherMonth || showOtherMonths) && daySettings[2] ? ' title="' + daySettings[2] + '"' : '') + // cell title
							(unselectable ? '' : ' onclick="DP_jQuery.datepicker._selectDay(\'#' +
							inst.id + '\',' + drawMonth + ',' + drawYear + ', this);return false;"') + '>' + // actions
							(otherMonth ? (showOtherMonths ? printDate.getDate() : '&#xa0;') : // display for other months
							(unselectable ? '<span class="ui-state-default">' + printDate.getDate() + '</span>' : '<a class="ui-state-default' +
							(printDate.getTime() == today.getTime() ? ' ui-state-highlight' : '') +
							(printDate.getTime() >= currentDate.getTime() && printDate.getTime() <= endDate.getTime() ? // in current range
							' ui-state-active' : '') + // highlight selected day
							'" href="#">' + printDate.getDate() + '</a>')) + '</td>'; // display for this month
						printDate.setDate(printDate.getDate() + 1);
						printDate = this._daylightSavingAdjust(printDate);
					}
					calender += tbody + '</tr>';
				}
				drawMonth++;
				if (drawMonth > 11) {
					drawMonth = 0;
					drawYear++;
				}
				calender += '</tbody></table>' + (isMultiMonth ? '</div>' + 
							((numMonths[0] > 0 && col == numMonths[1]-1) ? '<div class="ui-datepicker-row-break"></div>' : '') : '');
				group += calender;
			}
			html += group;
		}
		html += buttonPanel + ($.browser.msie && parseInt($.browser.version,10) < 7 && !inst.inline ?
			'<iframe src="javascript:false;" class="ui-datepicker-cover" frameborder="0"></iframe>' : '');
		inst._keyEvent = false;
		return html;
	},

	/* Generate the month and year header. */
	_generateMonthYearHeader: function(inst, drawMonth, drawYear, minDate, maxDate,
			selectedDate, secondary, monthNames, monthNamesShort) {
		minDate = (inst.rangeStart && minDate && selectedDate < minDate ? selectedDate : minDate);
		var changeMonth = this._get(inst, 'changeMonth');
		var changeYear = this._get(inst, 'changeYear');
		var showMonthAfterYear = this._get(inst, 'showMonthAfterYear');
		var html = '<div class="ui-datepicker-title">';
		var monthHtml = '';
		// month selection
		if (secondary || !changeMonth)
			monthHtml += '<span class="ui-datepicker-month">' + monthNames[drawMonth] + '</span> ';
		else {
			var inMinYear = (minDate && minDate.getFullYear() == drawYear);
			var inMaxYear = (maxDate && maxDate.getFullYear() == drawYear);
			monthHtml += '<select class="ui-datepicker-month" ' +
				'onchange="DP_jQuery.datepicker._selectMonthYear(\'#' + inst.id + '\', this, \'M\');" ' +
				'onclick="DP_jQuery.datepicker._clickMonthYear(\'#' + inst.id + '\');"' +
			 	'>';
			for (var month = 0; month < 12; month++) {
				if ((!inMinYear || month >= minDate.getMonth()) &&
						(!inMaxYear || month <= maxDate.getMonth()))
					monthHtml += '<option value="' + month + '"' +
						(month == drawMonth ? ' selected="selected"' : '') +
						'>' + monthNamesShort[month] + '</option>';
			}
			monthHtml += '</select>';
		}
		if (!showMonthAfterYear)
			html += monthHtml + ((secondary || changeMonth || changeYear) && (!(changeMonth && changeYear)) ? '&#xa0;' : '');
		// year selection
		if (secondary || !changeYear)
			html += '<span class="ui-datepicker-year">' + drawYear + '</span>';
		else {
			// determine range of years to display
			var years = this._get(inst, 'yearRange').split(':');
			var year = 0;
			var endYear = 0;
			if (years.length != 2) {
				year = drawYear - 10;
				endYear = drawYear + 10;
			} else if (years[0].charAt(0) == '+' || years[0].charAt(0) == '-') {
				year = drawYear + parseInt(years[0], 10);
				endYear = drawYear + parseInt(years[1], 10);
			} else {
				year = parseInt(years[0], 10);
				endYear = parseInt(years[1], 10);
			}
			year = (minDate ? Math.max(year, minDate.getFullYear()) : year);
			endYear = (maxDate ? Math.min(endYear, maxDate.getFullYear()) : endYear);
			html += '<select class="ui-datepicker-year" ' +
				'onchange="DP_jQuery.datepicker._selectMonthYear(\'#' + inst.id + '\', this, \'Y\');" ' +
				'onclick="DP_jQuery.datepicker._clickMonthYear(\'#' + inst.id + '\');"' +
				'>';
			for (; year <= endYear; year++) {
				html += '<option value="' + year + '"' +
					(year == drawYear ? ' selected="selected"' : '') +
					'>' + year + '</option>';
			}
			html += '</select>';
		}
		if (showMonthAfterYear)
			html += (secondary || changeMonth || changeYear ? '&#xa0;' : '') + monthHtml;
		html += '</div>'; // Close datepicker_header
		return html;
	},

	/* Adjust one of the date sub-fields. */
	_adjustInstDate: function(inst, offset, period) {
		var year = inst.drawYear + (period == 'Y' ? offset : 0);
		var month = inst.drawMonth + (period == 'M' ? offset : 0);
		var day = Math.min(inst.selectedDay, this._getDaysInMonth(year, month)) +
			(period == 'D' ? offset : 0);
		var date = this._daylightSavingAdjust(new Date(year, month, day));
		// ensure it is within the bounds set
		var minDate = this._getMinMaxDate(inst, 'min', true);
		var maxDate = this._getMinMaxDate(inst, 'max');
		date = (minDate && date < minDate ? minDate : date);
		date = (maxDate && date > maxDate ? maxDate : date);
		inst.selectedDay = date.getDate();
		inst.drawMonth = inst.selectedMonth = date.getMonth();
		inst.drawYear = inst.selectedYear = date.getFullYear();
		if (period == 'M' || period == 'Y')
			this._notifyChange(inst);
	},

	/* Notify change of month/year. */
	_notifyChange: function(inst) {
		var onChange = this._get(inst, 'onChangeMonthYear');
		if (onChange)
			onChange.apply((inst.input ? inst.input[0] : null),
				[inst.selectedYear, inst.selectedMonth + 1, inst]);
	},

	/* Determine the number of months to show. */
	_getNumberOfMonths: function(inst) {
		var numMonths = this._get(inst, 'numberOfMonths');
		return (numMonths == null ? [1, 1] : (typeof numMonths == 'number' ? [1, numMonths] : numMonths));
	},

	/* Determine the current maximum date - ensure no time components are set - may be overridden for a range. */
	_getMinMaxDate: function(inst, minMax, checkRange) {
		var date = this._determineDate(this._get(inst, minMax + 'Date'), null);
		return (!checkRange || !inst.rangeStart ? date :
			(!date || inst.rangeStart > date ? inst.rangeStart : date));
	},

	/* Find the number of days in a given month. */
	_getDaysInMonth: function(year, month) {
		return 32 - new Date(year, month, 32).getDate();
	},

	/* Find the day of the week of the first of a month. */
	_getFirstDayOfMonth: function(year, month) {
		return new Date(year, month, 1).getDay();
	},

	/* Determines if we should allow a "next/prev" month display change. */
	_canAdjustMonth: function(inst, offset, curYear, curMonth) {
		var numMonths = this._getNumberOfMonths(inst);
		var date = this._daylightSavingAdjust(new Date(
			curYear, curMonth + (offset < 0 ? offset : numMonths[1]), 1));
		if (offset < 0)
			date.setDate(this._getDaysInMonth(date.getFullYear(), date.getMonth()));
		return this._isInRange(inst, date);
	},

	/* Is the given date in the accepted range? */
	_isInRange: function(inst, date) {
		// during range selection, use minimum of selected date and range start
		var newMinDate = (!inst.rangeStart ? null : this._daylightSavingAdjust(
			new Date(inst.selectedYear, inst.selectedMonth, inst.selectedDay)));
		newMinDate = (newMinDate && inst.rangeStart < newMinDate ? inst.rangeStart : newMinDate);
		var minDate = newMinDate || this._getMinMaxDate(inst, 'min');
		var maxDate = this._getMinMaxDate(inst, 'max');
		return ((!minDate || date >= minDate) && (!maxDate || date <= maxDate));
	},

	/* Provide the configuration settings for formatting/parsing. */
	_getFormatConfig: function(inst) {
		var shortYearCutoff = this._get(inst, 'shortYearCutoff');
		shortYearCutoff = (typeof shortYearCutoff != 'string' ? shortYearCutoff :
			new Date().getFullYear() % 100 + parseInt(shortYearCutoff, 10));
		return {shortYearCutoff: shortYearCutoff,
			dayNamesShort: this._get(inst, 'dayNamesShort'), dayNames: this._get(inst, 'dayNames'),
			monthNamesShort: this._get(inst, 'monthNamesShort'), monthNames: this._get(inst, 'monthNames')};
	},

	/* Format the given date for display. */
	_formatDate: function(inst, day, month, year) {
		if (!day) {
			inst.currentDay = inst.selectedDay;
			inst.currentMonth = inst.selectedMonth;
			inst.currentYear = inst.selectedYear;
		}
		var date = (day ? (typeof day == 'object' ? day :
			this._daylightSavingAdjust(new Date(year, month, day))) :
			this._daylightSavingAdjust(new Date(inst.currentYear, inst.currentMonth, inst.currentDay)));
		return this.formatDate(this._get(inst, 'dateFormat'), date, this._getFormatConfig(inst));
	}
});

/* jQuery extend now ignores nulls! */
function extendRemove(target, props) {
	$.extend(target, props);
	for (var name in props)
		if (props[name] == null || props[name] == undefined)
			target[name] = props[name];
	return target;
};

/* Determine whether an object is an array. */
function isArray(a) {
	return (a && (($.browser.safari && typeof a == 'object' && a.length) ||
		(a.constructor && a.constructor.toString().match(/\Array\(\)/))));
};

/* Invoke the datepicker functionality.
   @param  options  string - a command, optionally followed by additional parameters or
                    Object - settings for attaching new datepicker functionality
   @return  jQuery object */
$.fn.datepicker = function(options){

	/* Initialise the date picker. */
	if (!$.datepicker.initialized) {
		$(document).mousedown($.datepicker._checkExternalClick).
			find('body').append($.datepicker.dpDiv);
		$.datepicker.initialized = true;
	}

	var otherArgs = Array.prototype.slice.call(arguments, 1);
	if (typeof options == 'string' && (options == 'isDisabled' || options == 'getDate'))
		return $.datepicker['_' + options + 'Datepicker'].
			apply($.datepicker, [this[0]].concat(otherArgs));
	return this.each(function() {
		typeof options == 'string' ?
			$.datepicker['_' + options + 'Datepicker'].
				apply($.datepicker, [this].concat(otherArgs)) :
			$.datepicker._attachDatepicker(this, options);
	});
};

$.datepicker = new Datepicker(); // singleton instance
$.datepicker.initialized = false;
$.datepicker.uuid = new Date().getTime();
$.datepicker.version = "1.7.1";

// Workaround for #4055
// Add another global to avoid noConflict issues with inline event handlers
window.DP_jQuery = $;

})(jQuery);
/*
 * jQuery UI Progressbar 1.7.1
 *
 * Copyright (c) 2009 AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * http://docs.jquery.com/UI/Progressbar
 *
 * Depends:
 *   ui.core.js
 */
(function($) {

$.widget("ui.progressbar", {

	_init: function() {

		this.element
			.addClass("ui-progressbar"
				+ " ui-widget"
				+ " ui-widget-content"
				+ " ui-corner-all")
			.attr({
				role: "progressbar",
				"aria-valuemin": this._valueMin(),
				"aria-valuemax": this._valueMax(),
				"aria-valuenow": this._value()
			});

		this.valueDiv = $('<div class="ui-progressbar-value ui-widget-header ui-corner-left"></div>').appendTo(this.element);

		this._refreshValue();

	},

	destroy: function() {

		this.element
			.removeClass("ui-progressbar"
				+ " ui-widget"
				+ " ui-widget-content"
				+ " ui-corner-all")
			.removeAttr("role")
			.removeAttr("aria-valuemin")
			.removeAttr("aria-valuemax")
			.removeAttr("aria-valuenow")
			.removeData("progressbar")
			.unbind(".progressbar");

		this.valueDiv.remove();

		$.widget.prototype.destroy.apply(this, arguments);

	},

	value: function(newValue) {
		arguments.length && this._setData("value", newValue);
		return this._value();
	},

	_setData: function(key, value) {

		switch (key) {
			case 'value':
				this.options.value = value;
				this._refreshValue();
				this._trigger('change', null, {});
				break;
		}

		$.widget.prototype._setData.apply(this, arguments);

	},

	_value: function() {

		var val = this.options.value;
		if (val < this._valueMin()) val = this._valueMin();
		if (val > this._valueMax()) val = this._valueMax();

		return val;

	},

	_valueMin: function() {
		var valueMin = 0;
		return valueMin;
	},

	_valueMax: function() {
		var valueMax = 100;
		return valueMax;
	},

	_refreshValue: function() {
		var value = this.value();
		this.valueDiv[value == this._valueMax() ? 'addClass' : 'removeClass']("ui-corner-right");
		this.valueDiv.width(value + '%');
		this.element.attr("aria-valuenow", value);
	}

});

$.extend($.ui.progressbar, {
	version: "1.7.1",
	defaults: {
		value: 0
	}
});

})(jQuery);
// tipsy, facebook style tooltips for jquery
// version 1.0.0a
// (c) 2008-2010 jason frame [jason@onehackoranother.com]
// releated under the MIT license

(function($) {
    
    function fixTitle($ele) {
        if ($ele.attr('title') || typeof($ele.attr('original-title')) != 'string') {
            $ele.attr('original-title', $ele.attr('title') || '').removeAttr('title');
        }
    }
    
    function Tipsy(element, options) {
        this.$element = $(element);
        this.options = options;
        this.enabled = true;
        fixTitle(this.$element);
    }
    
    Tipsy.prototype = {
        show: function() {
            var title = this.getTitle();
            if (title && this.enabled) {
                var $tip = this.tip();
                $tip.find('.tipsy-inner')[this.options.html ? 'html' : 'text'](title);
                // $tip[0].className = 'tipsy'; // reset classname in case of dynamic gravity
		// the remove strips events
                //$tip.remove().css({top: 0, left: 0, visibility: 'hidden', display: 'block'}).appendTo(document.body);
                $tip.css({top: 0, left: 0, visibility: 'hidden', display: 'block'}).appendTo(document.body);
                
                var pos = $.extend({}, this.$element.offset(), {
                    width: this.$element[0].offsetWidth,
                    height: this.$element[0].offsetHeight
                });
                
                var actualWidth = $tip[0].offsetWidth, actualHeight = $tip[0].offsetHeight;
                var gravity = (typeof this.options.gravity == 'function')
                                ? this.options.gravity.call(this.$element[0])
                                : this.options.gravity;
                
                var tp;
                switch (gravity.charAt(0)) {
                    case 'n':
                        tp = {top: pos.top + pos.height + this.options.offset, left: pos.left + pos.width / 2 - actualWidth / 2};
                        break;
                    case 's':
                        tp = {top: pos.top - actualHeight - this.options.offset, left: pos.left + pos.width / 2 - actualWidth / 2};
                        break;
                    case 'e':
                        tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth - this.options.offset};
                        break;
                    case 'w':
                        tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width + this.options.offset};
                        break;
                }
                
                if (gravity.length == 2) {
                    if (gravity.charAt(1) == 'w') {
                        tp.left = pos.left + pos.width / 2 - 15;
                    } else {
                        tp.left = pos.left + pos.width / 2 - actualWidth + 15;
                    }
                }
                
                $tip.css(tp).addClass('tipsy-' + gravity);
                
                if (this.options.fade) {
                    $tip.stop().css({opacity: 0, display: 'block', visibility: 'visible'}).animate({opacity: this.options.opacity});
                } else {
                    $tip.css({visibility: 'visible', opacity: this.options.opacity});
                }
            }
        },
       
        hide: function() {
	    if (!this.sticky) {
                if (this.options.fade) {
                    this.tip().stop().fadeOut(function() { $(this).hide(); });
                } else {
                    this.tip().hide();
                }
            }
        },
        
        getTitle: function() {
            var title, $e = this.$element, o = this.options;
            fixTitle($e);
            var title, o = this.options;
            if (typeof o.title == 'string') {
                title = $e.attr(o.title == 'title' ? 'original-title' : o.title);
            	title = ('' + title).replace(/(^\s*|\s*$)/, "");
            } else if (typeof o.title == 'function') {
                title = o.title.call($e[0]);
            }
            return title || o.fallback;
        },
        
        tip: function() {
            var type = 'tipsy-' + this.options.type;
            var shadow = this.options.shadow ? 'shadow' : '';
            if (!this.$tip) {
                this.$tip = $('<div class="tipsy ' + type + '"></div>')
    		    .html('<div class="tipsy-arrow"></div><div class="tipsy-inner ' + shadow + '"/></div>');
            }
            return this.$tip;
        },
        
        validate: function() {
            if (!this.$element[0].parentNode) this.hide();
        },
        
        enable: function() { this.enabled = true; },
        disable: function() { this.enabled = false; },
        toggleEnabled: function() { this.enabled = !this.enabled; }
    };
    
    $.fn.tipsy = function(options) {
        
        if (options === true) {
            return this.data('tipsy');
        } else if (typeof options == 'string') {
            return this.data('tipsy')[options]();
        }
        
        options = $.extend({}, $.fn.tipsy.defaults, options);
        
        function get(ele) {
            var tipsy = $.data(ele, 'tipsy');
            if (!tipsy) {
                tipsy = new Tipsy(ele, $.fn.tipsy.elementOptions(ele, options));
                $.data(ele, 'tipsy', tipsy);
            }
            return tipsy;
        }
        
        function enter() {
            var tipsy = get(this);
            tipsy.hoverState = 'in';
            if (options.delayIn == 0) {
                tipsy.show();
            } else {
                setTimeout(function() { if (tipsy.hoverState == 'in') tipsy.show(); }, options.delayIn);
            }
        };
       
        function leave() {
            var tipsy = get(this);
            tipsy.hoverState = 'out';
            if (options.delayOut == 0) {
                tipsy.hide();
            } else {
                setTimeout(function() { if (tipsy.hoverState == 'out') tipsy.hide(); }, options.delayOut);
            }
        };
        
        if (!options.live) this.each(function() { get(this); });
        
        if (options.trigger != 'manual') {
            var binder   = options.live ? 'live' : 'bind',
                eventIn  = options.trigger == 'hover' ? 'mouseenter' : 'focus',
                eventOut = options.trigger == 'hover' ? 'mouseleave' : 'blur';
            this[binder](eventIn, enter)[binder](eventOut, leave);
        }
        
        return this;
        
    };
    
    $.fn.tipsy.defaults = {
        delayIn: 0,
        delayOut: 0,
        fade: false,
        fallback: '',
        gravity: 'n',
        html: false,
        live: false,
        offset: 0,
        opacity: 1.0,
        title: 'title',
        trigger: 'hover',
	type: 'help'
    };
    
    // Overwrite this method to provide options on a per-element basis.
    // For example, you could store the gravity in a 'tipsy-gravity' attribute:
    // return $.extend({}, options, {gravity: $(ele).attr('tipsy-gravity') || 'n' });
    // (remember - do not modify 'options' in place!)
    $.fn.tipsy.elementOptions = function(ele, options) {
        return $.metadata ? $.extend({}, options, $(ele).metadata()) : options;
    };
    
    $.fn.tipsy.autoNS = function() {
        return $(this).offset().top > ($(document).scrollTop() + $(window).height() / 2) ? 's' : 'n';
    };
    
    $.fn.tipsy.autoWE = function() {
        return $(this).offset().left > ($(document).scrollLeft() + $(window).width() / 2) ? 'e' : 'w';
    };
    
})(jQuery);
( function( $j ) {
	$j.fn.tipsyPlus = function( optionsArg ) {
		// use extend!
		var titleOption = 'title';
		var htmlOption = false;

		var options = $j.extend( 
			{ type: 'help', shadow: true },
			optionsArg
		);

		var el = this;

		if (options.plus) {
			htmlOption = true;
			titleOption = function() {
				return $j( '<span />' ).append(
					$j( this ).attr( 'original-title' ),
					$j( '<a class="mwe-upwiz-tooltip-link"/>' )
						.attr( 'href', '#' )
						.append( gM( 'mwe-upwiz-tooltip-more-info' ) )
						.mouseenter( function() {
							el.data('tipsy').sticky = true;
						} )
						.mouseleave( function() {
							el.data('tipsy').sticky = false;
						} )
						.click( function() {
							// show the wiki page with more
							alert( options.plus );
							// pass this in as a closure to be called on dismiss
							el.focus();
							el.data('tipsy').sticky = false;
						} )
				);
			};
		}

		return this.tipsy( { 
			gravity: 'w', 
			trigger: 'focus',
			title: titleOption,
			html: htmlOption,
			type: options.type,
			shadow: options.shadow
		} );
	};
} )( jQuery );

/**
 * jQuery Morphing Crossfade plugin
 * Copyright Neil Kandalgaonkar, 2010
 * 
 * This work is licensed under the terms of the GNU General Public License, 
 * version 2 or later. 
 * (see http://www.fsf.org/licensing/licenses/gpl.html). 
 * Derivative works and later versions of the code must be free software 
 * licensed under the same or a compatible license.
 *
 * There are a lot of cross-fading plugins out there, but most assume that all
 * elements are the same, fixed width. This will also grow or shrink the container
 * vertically while crossfading. This can be useful when (for instance) you have a
 * control panel and you want to switch from a simpler interface to a more advanced
 * version. Or, perhaps you like the way the Mac OS X Preferences panel works, where
 * you click on an icon and get a crossfade effect to another dialog, even if it's one
 * with different dimensions.
 *
 * How to use it:
 * Create some DOM structure where all the panels you want to crossfade are contained in
 * one parent, e.g.
 *
 *  <div id="container">
 *    <div id="panel1"/>
 *    <div id="panel2"/>
 *    <div id="panel3"/>
 *  </div>
 *
 * Initialize the crossfader:
 *
 *   $( '#container' ).morphCrossfader();
 * 
 * By default, this will hide all elements except the first child (in this case #panel1).
 *  
 * Then, whenever you want to crossfade, do something like this. The currently selected panel 
 * will fade away, and your selection will fade in.
 * 
 *   $( '#container' ).morphCrossfade( '#panel2' );
 * 
 */

( function( $ ) {
	/** 
	 * Initialize crossfading of the children of an element 
 	 */
	$.fn.morphCrossfader = function() {
		// the elements that are immediate children are the crossfadables
		// they must all be "on top" of each other, so position them relative
		this.css( { 
			position : 'relative', 
			overflow : 'hidden',
			scroll: 'none'
		} );
		this.children().css( { 
			position: 'absolute', 
			'top': '0px', 
		    	left : '0px',
			scroll: 'none',
			opacity: 0,
			visibility: 'hidden'
		} );

		// should achieve the same result as crossfade( this.children().first() ) but without
		// animation etc.
		this.morphCrossfade( this.children().first(), 0 );

		return this;
	};

	/** 
	 * Initialize crossfading of the children of an element 
	 * @param selector of new thing to show; should be an immediate child of the crossfader element
	 * @param speed (optional) how fast to crossfade, in milliseconds
 	 */
	$.fn.morphCrossfade = function( newPanelSelector, speed ) {
		var container = this;
		if ( typeof speed === 'undefined' ) {
			speed = 400;
		}

		container.css( { 'overflow' : 'hidden' } );

		$oldPanel = $( container.data( 'crossfadeDisplay' ) );
		if ( $oldPanel ) {
			// remove auto setting of height from container, and 
			// make doubly sure that the container height is equal to oldPanel
			container.css( { height: $oldPanel.outerHeight() } );
			// take it out of the flow
			$oldPanel.css( { position: 'absolute' } );
			// fade WITHOUT hiding when opacity = 0
			$oldPanel.animate( { opacity: 0 }, speed, 'linear', function() { 
				$oldPanel.css( { visibility: 'hidden'} ) 
			} );
		}
		container.data( 'crossfadeDisplay', newPanelSelector );

		var $newPanel = $( newPanelSelector );
		$newPanel.css( { visibility: 'visible' } );
		container.animate( { height: $newPanel.outerHeight() }, speed, 'linear', function() {
			// we place it back into the flow, in case its size changes.
			$newPanel.css( { position: 'relative' } );
			// and allow the container to grow with it.
			container.css( { height : 'auto' } );
		} );
		$newPanel.animate( { opacity: 1 }, speed );

		return container;
	};

} )( jQuery );
/*
 * jQuery validation plug-in 1.7
 *
 * http://bassistance.de/jquery-plugins/jquery-plugin-validation/
 * http://docs.jquery.com/Plugins/Validation
 *
 * Copyright (c) 2006 - 2008 Jörn Zaefferer
 *
 * $Id: jquery.validate.js 6403 2009-06-17 14:27:16Z joern.zaefferer $
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

(function($) {

$.extend($.fn, {
	// http://docs.jquery.com/Plugins/Validation/validate
	validate: function( options ) {

		// if nothing is selected, return nothing; can't chain anyway
		if (!this.length) {
			options && options.debug && window.console && console.warn( "nothing selected, can't validate, returning nothing" );
			return;
		}

		// check if a validator for this form was already created
		var validator = $.data(this[0], 'validator');
		if ( validator ) {
			return validator;
		}
		
		validator = new $.validator( options, this[0] );
		$.data(this[0], 'validator', validator); 
		
		if ( validator.settings.onsubmit ) {
		
			// allow suppresing validation by adding a cancel class to the submit button
			this.find("input, button").filter(".cancel").click(function() {
				validator.cancelSubmit = true;
			});
			
			// when a submitHandler is used, capture the submitting button
			if (validator.settings.submitHandler) {
				this.find("input, button").filter(":submit").click(function() {
					validator.submitButton = this;
				});
			}
		
			// validate the form on submit
			this.submit( function( event ) {
				if ( validator.settings.debug )
					// prevent form submit to be able to see console output
					event.preventDefault();
					
				function handle() {
					if ( validator.settings.submitHandler ) {
						if (validator.submitButton) {
							// insert a hidden input as a replacement for the missing submit button
							var hidden = $("<input type='hidden'/>").attr("name", validator.submitButton.name).val(validator.submitButton.value).appendTo(validator.currentForm);
						}
						validator.settings.submitHandler.call( validator, validator.currentForm );
						if (validator.submitButton) {
							// and clean up afterwards; thanks to no-block-scope, hidden can be referenced
							hidden.remove();
						}
						return false;
					}
					return true;
				}
					
				// prevent submit for invalid forms or custom submit handlers
				if ( validator.cancelSubmit ) {
					validator.cancelSubmit = false;
					return handle();
				}
				if ( validator.form() ) {
					if ( validator.pendingRequest ) {
						validator.formSubmitted = true;
						return false;
					}
					return handle();
				} else {
					validator.focusInvalid();
					return false;
				}
			});
		}
		
		return validator;
	},
	// http://docs.jquery.com/Plugins/Validation/valid
	valid: function() {
        if ( $(this[0]).is('form')) {
            return this.validate().form();
        } else {
            var valid = true;
            var validator = $(this[0].form).validate();
            this.each(function() {
				valid &= validator.element(this);
            });
            return valid;
        }
    },
	// attributes: space seperated list of attributes to retrieve and remove
	removeAttrs: function(attributes) {
		var result = {},
			$element = this;
		$.each(attributes.split(/\s/), function(index, value) {
			result[value] = $element.attr(value);
			$element.removeAttr(value);
		});
		return result;
	},
	// http://docs.jquery.com/Plugins/Validation/rules
	rules: function(command, argument) {
		var element = this[0];
		
		if (command) {
			var settings = $.data(element.form, 'validator').settings;
			var staticRules = settings.rules;
			var existingRules = $.validator.staticRules(element);
			switch(command) {
			case "add":
				$.extend(existingRules, $.validator.normalizeRule(argument));
				staticRules[element.name] = existingRules;
				if (argument.messages)
					settings.messages[element.name] = $.extend( settings.messages[element.name], argument.messages );
				break;
			case "remove":
				if (!argument) {
					delete staticRules[element.name];
					return existingRules;
				}
				var filtered = {};
				$.each(argument.split(/\s/), function(index, method) {
					filtered[method] = existingRules[method];
					delete existingRules[method];
				});
				return filtered;
			}
		}
		
		var data = $.validator.normalizeRules(
		$.extend(
			{},
			$.validator.metadataRules(element),
			$.validator.classRules(element),
			$.validator.attributeRules(element),
			$.validator.staticRules(element)
		), element);
		
		// make sure required is at front
		if (data.required) {
			var param = data.required;
			delete data.required;
			data = $.extend({required: param}, data);
		}
		
		return data;
	}
});

// Custom selectors
$.extend($.expr[":"], {
	// http://docs.jquery.com/Plugins/Validation/blank
	blank: function(a) {return !$.trim("" + a.value);},
	// http://docs.jquery.com/Plugins/Validation/filled
	filled: function(a) {return !!$.trim("" + a.value);},
	// http://docs.jquery.com/Plugins/Validation/unchecked
	unchecked: function(a) {return !a.checked;}
});

// constructor for validator
$.validator = function( options, form ) {
	this.settings = $.extend( true, {}, $.validator.defaults, options );
	this.currentForm = form;
	this.init();
};

$.validator.format = function(source, params) {
	if ( arguments.length == 1 ) 
		return function() {
			var args = $.makeArray(arguments);
			args.unshift(source);
			return $.validator.format.apply( this, args );
		};
	if ( arguments.length > 2 && params.constructor != Array  ) {
		params = $.makeArray(arguments).slice(1);
	}
	if ( params.constructor != Array ) {
		params = [ params ];
	}
	$.each(params, function(i, n) {
		source = source.replace(new RegExp("\\{" + i + "\\}", "g"), n);
	});
	return source;
};

$.extend($.validator, {
	
	defaults: {
		messages: {},
		groups: {},
		rules: {},
		errorClass: "error",
		validClass: "valid",
		errorElement: "label",
		focusInvalid: true,
		errorContainer: $( [] ),
		errorLabelContainer: $( [] ),
		onsubmit: true,
		ignore: [],
		ignoreTitle: false,
		onfocusin: function(element) {
			this.lastActive = element;
				
			// hide error label and remove error class on focus if enabled
			if ( this.settings.focusCleanup && !this.blockFocusCleanup ) {
				this.settings.unhighlight && this.settings.unhighlight.call( this, element, this.settings.errorClass, this.settings.validClass );
				this.errorsFor(element).hide();
			}
		},
		onfocusout: function(element) {
			if ( !this.checkable(element) && (element.name in this.submitted || !this.optional(element)) ) {
				this.element(element);
			}
		},
		onkeyup: function(element) {
			if ( element.name in this.submitted || element == this.lastElement ) {
				this.element(element);
			}
		},
		onclick: function(element) {
			// click on selects, radiobuttons and checkboxes
			if ( element.name in this.submitted )
				this.element(element);
			// or option elements, check parent select in that case
			else if (element.parentNode.name in this.submitted)
				this.element(element.parentNode);
		},
		highlight: function( element, errorClass, validClass ) {
			$(element).addClass(errorClass).removeClass(validClass);
		},
		unhighlight: function( element, errorClass, validClass ) {
			$(element).removeClass(errorClass).addClass(validClass);
		}
	},

	// http://docs.jquery.com/Plugins/Validation/Validator/setDefaults
	setDefaults: function(settings) {
		$.extend( $.validator.defaults, settings );
	},

	messages: {
		required: "This field is required.",
		remote: "Please fix this field.",
		email: "Please enter a valid email address.",
		url: "Please enter a valid URL.",
		date: "Please enter a valid date.",
		dateISO: "Please enter a valid date (ISO).",
		number: "Please enter a valid number.",
		digits: "Please enter only digits.",
		creditcard: "Please enter a valid credit card number.",
		equalTo: "Please enter the same value again.",
		accept: "Please enter a value with a valid extension.",
		maxlength: $.validator.format("Please enter no more than {0} characters."),
		minlength: $.validator.format("Please enter at least {0} characters."),
		rangelength: $.validator.format("Please enter a value between {0} and {1} characters long."),
		range: $.validator.format("Please enter a value between {0} and {1}."),
		max: $.validator.format("Please enter a value less than or equal to {0}."),
		min: $.validator.format("Please enter a value greater than or equal to {0}.")
	},
	
	autoCreateRanges: false,
	
	prototype: {
		
		init: function() {
			this.labelContainer = $(this.settings.errorLabelContainer);
			this.errorContext = this.labelContainer.length && this.labelContainer || $(this.currentForm);
			this.containers = $(this.settings.errorContainer).add( this.settings.errorLabelContainer );
			this.submitted = {};
			this.valueCache = {};
			this.pendingRequest = 0;
			this.pending = {};
			this.invalid = {};
			this.reset();
			
			var groups = (this.groups = {});
			$.each(this.settings.groups, function(key, value) {
				$.each(value.split(/\s/), function(index, name) {
					groups[name] = key;
				});
			});
			var rules = this.settings.rules;
			$.each(rules, function(key, value) {
				rules[key] = $.validator.normalizeRule(value);
			});
			
			function delegate(event) {
				var validator = $.data(this[0].form, "validator"),
					eventType = "on" + event.type.replace(/^validate/, "");
				validator.settings[eventType] && validator.settings[eventType].call(validator, this[0] );
			}
			$(this.currentForm)
				.validateDelegate(":text, :password, :file, select, textarea", "focusin focusout keyup", delegate)
				.validateDelegate(":radio, :checkbox, select, option", "click", delegate);

			if (this.settings.invalidHandler)
				$(this.currentForm).bind("invalid-form.validate", this.settings.invalidHandler);
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/form
		form: function() {
			this.checkForm();
			$.extend(this.submitted, this.errorMap);
			this.invalid = $.extend({}, this.errorMap);
			if (!this.valid())
				$(this.currentForm).triggerHandler("invalid-form", [this]);
			this.showErrors();
			return this.valid();
		},
		
		checkForm: function() {
			this.prepareForm();
			for ( var i = 0, elements = (this.currentElements = this.elements()); elements[i]; i++ ) {
				this.check( elements[i] );
			}
			return this.valid(); 
		},
		
		// http://docs.jquery.com/Plugins/Validation/Validator/element
		element: function( element ) {
			element = this.clean( element );
			this.lastElement = element;
			this.prepareElement( element );
			this.currentElements = $(element);
			var result = this.check( element );
			if ( result ) {
				delete this.invalid[element.name];
			} else {
				this.invalid[element.name] = true;
			}
			if ( !this.numberOfInvalids() ) {
				// Hide error containers on last error
				this.toHide = this.toHide.add( this.containers );
			}
			this.showErrors();
			return result;
		},

		// http://docs.jquery.com/Plugins/Validation/Validator/showErrors
		showErrors: function(errors) {
			if(errors) {
				// add items to error list and map
				$.extend( this.errorMap, errors );
				this.errorList = [];
				for ( var name in errors ) {
					this.errorList.push({
						message: errors[name],
						element: this.findByName(name)[0]
					});
				}
				// remove items from success list
				this.successList = $.grep( this.successList, function(element) {
					return !(element.name in errors);
				});
			}
			this.settings.showErrors
				? this.settings.showErrors.call( this, this.errorMap, this.errorList )
				: this.defaultShowErrors();
		},
		
		// http://docs.jquery.com/Plugins/Validation/Validator/resetForm
		resetForm: function() {
			if ( $.fn.resetForm )
				$( this.currentForm ).resetForm();
			this.submitted = {};
			this.prepareForm();
			this.hideErrors();
			this.elements().removeClass( this.settings.errorClass );
		},
		
		numberOfInvalids: function() {
			return this.objectLength(this.invalid);
		},
		
		objectLength: function( obj ) {
			var count = 0;
			for ( var i in obj )
				count++;
			return count;
		},
		
		hideErrors: function() {
			this.addWrapper( this.toHide ).hide();
		},
		
		valid: function() {
			return this.size() == 0;
		},
		
		size: function() {
			return this.errorList.length;
		},
		
		focusInvalid: function() {
			if( this.settings.focusInvalid ) {
				try {
					$(this.findLastActive() || this.errorList.length && this.errorList[0].element || [])
					.filter(":visible")
					.focus()
					// manually trigger focusin event; without it, focusin handler isn't called, findLastActive won't have anything to find
					.trigger("focusin");
				} catch(e) {
					// ignore IE throwing errors when focusing hidden elements
				}
			}
		},
		
		findLastActive: function() {
			var lastActive = this.lastActive;
			return lastActive && $.grep(this.errorList, function(n) {
				return n.element.name == lastActive.name;
			}).length == 1 && lastActive;
		},
		
		elements: function() {
			var validator = this,
				rulesCache = {};
			
			// select all valid inputs inside the form (no submit or reset buttons)
			// workaround $Query([]).add until http://dev.jquery.com/ticket/2114 is solved
			return $([]).add(this.currentForm.elements)
			.filter(":input")
			.not(":submit, :reset, :image, [disabled]")
			.not( this.settings.ignore )
			.filter(function() {
				!this.name && validator.settings.debug && window.console && console.error( "%o has no name assigned", this);
			
				// select only the first element for each name, and only those with rules specified
				if ( this.name in rulesCache || !validator.objectLength($(this).rules()) )
					return false;
				
				rulesCache[this.name] = true;
				return true;
			});
		},
		
		clean: function( selector ) {
			return $( selector )[0];
		},
		
		errors: function() {
			return $( this.settings.errorElement + "." + this.settings.errorClass, this.errorContext );
		},
		
		reset: function() {
			this.successList = [];
			this.errorList = [];
			this.errorMap = {};
			this.toShow = $([]);
			this.toHide = $([]);
			this.currentElements = $([]);
		},
		
		prepareForm: function() {
			this.reset();
			this.toHide = this.errors().add( this.containers );
		},
		
		prepareElement: function( element ) {
			this.reset();
			this.toHide = this.errorsFor(element);
		},
	
		check: function( element ) {
			element = this.clean( element );
			
			// if radio/checkbox, validate first element in group instead
			if (this.checkable(element)) {
				element = this.findByName( element.name )[0];
			}
			var rules = $(element).rules();
			var dependencyMismatch = false;
			for( method in rules ) {
				var rule = { method: method, parameters: rules[method] };
				try {
					var result = $.validator.methods[method].call( this, element.value.replace(/\r/g, ""), element, rule.parameters );
					
					// if a method indicates that the field is optional and therefore valid,
					// don't mark it as valid when there are no other rules
					if ( result == "dependency-mismatch" ) {
						dependencyMismatch = true;
						continue;
					}
					dependencyMismatch = false;
					
					if ( result == "pending" ) {
						this.toHide = this.toHide.not( this.errorsFor(element) );
						return;
					}
					
					if( !result ) {
						this.formatAndAdd( element, rule );
						return false;
					}
				} catch(e) {
					this.settings.debug && window.console && console.log("exception occured when checking element " + element.id
						 + ", check the '" + rule.method + "' method", e);
					throw e;
				}
			}
			if (dependencyMismatch)
				return;
			if ( this.objectLength(rules) )
				this.successList.push(element);
			return true;
		},
		
		// return the custom message for the given element and validation method
		// specified in the element's "messages" metadata
		customMetaMessage: function(element, method) {
			if (!$.metadata)
				return;
			
			var meta = this.settings.meta
				? $(element).metadata()[this.settings.meta]
				: $(element).metadata();
			
			return meta && meta.messages && meta.messages[method];
		},
		
		// return the custom message for the given element name and validation method
		customMessage: function( name, method ) {
			var m = this.settings.messages[name];
			return m && (m.constructor == String
				? m
				: m[method]);
		},
		
		// return the first defined argument, allowing empty strings
		findDefined: function() {
			for(var i = 0; i < arguments.length; i++) {
				if (arguments[i] !== undefined)
					return arguments[i];
			}
			return undefined;
		},
		
		defaultMessage: function( element, method) {
			return this.findDefined(
				this.customMessage( element.name, method ),
				this.customMetaMessage( element, method ),
				// title is never undefined, so handle empty string as undefined
				!this.settings.ignoreTitle && element.title || undefined,
				$.validator.messages[method],
				"<strong>Warning: No message defined for " + element.name + "</strong>"
			);
		},
		
		formatAndAdd: function( element, rule ) {
			var message = this.defaultMessage( element, rule.method ),
				theregex = /\$?\{(\d+)\}/g;
			if ( typeof message == "function" ) {
				message = message.call(this, rule.parameters, element);
			} else if (theregex.test(message)) {
				message = jQuery.format(message.replace(theregex, '{$1}'), rule.parameters);
			}			
			this.errorList.push({
				message: message,
				element: element
			});
			
			this.errorMap[element.name] = message;
			this.submitted[element.name] = message;
		},
		
		addWrapper: function(toToggle) {
			if ( this.settings.wrapper )
				toToggle = toToggle.add( toToggle.parent( this.settings.wrapper ) );
			return toToggle;
		},
		
		defaultShowErrors: function() {
			for ( var i = 0; this.errorList[i]; i++ ) {
				var error = this.errorList[i];
				this.settings.highlight && this.settings.highlight.call( this, error.element, this.settings.errorClass, this.settings.validClass );
				this.showLabel( error.element, error.message );
			}
			if( this.errorList.length ) {
				this.toShow = this.toShow.add( this.containers );
			}
			if (this.settings.success) {
				for ( var i = 0; this.successList[i]; i++ ) {
					this.showLabel( this.successList[i] );
				}
			}
			if (this.settings.unhighlight) {
				for ( var i = 0, elements = this.validElements(); elements[i]; i++ ) {
					this.settings.unhighlight.call( this, elements[i], this.settings.errorClass, this.settings.validClass );
				}
			}
			this.toHide = this.toHide.not( this.toShow );
			this.hideErrors();
			this.addWrapper( this.toShow ).show();
		},
		
		validElements: function() {
			return this.currentElements.not(this.invalidElements());
		},
		
		invalidElements: function() {
			return $(this.errorList).map(function() {
				return this.element;
			});
		},
		
		showLabel: function(element, message) {
			var label = this.errorsFor( element );
			if ( label.length ) {
				// refresh error/success class
				label.removeClass().addClass( this.settings.errorClass );
			
				// check if we have a generated label, replace the message then
				label.attr("generated") && label.html(message);
			} else {
				// create label
				label = $("<" + this.settings.errorElement + "/>")
					.attr({"for":  this.idOrName(element), generated: true})
					.addClass(this.settings.errorClass)
					.html(message || "");
				if ( this.settings.wrapper ) {
					// make sure the element is visible, even in IE
					// actually showing the wrapped element is handled elsewhere
					label = label.hide().show().wrap("<" + this.settings.wrapper + "/>").parent();
				}
				if ( !this.labelContainer.append(label).length )
					this.settings.errorPlacement
						? this.settings.errorPlacement(label, $(element) )
						: label.insertAfter(element);
			}
			if ( !message && this.settings.success ) {
				label.text("");
				typeof this.settings.success == "string"
					? label.addClass( this.settings.success )
					: this.settings.success( label );
			}
			this.toShow = this.toShow.add(label);
		},
		
		errorsFor: function(element) {
			var name = this.idOrName(element);
    		return this.errors().filter(function() {
				return $(this).attr('for') == name;
			});
		},
		
		idOrName: function(element) {
			return this.groups[element.name] || (this.checkable(element) ? element.name : element.id || element.name);
		},

		checkable: function( element ) {
			return /radio|checkbox/i.test(element.type);
		},
		
		findByName: function( name ) {
			// select by name and filter by form for performance over form.find("[name=...]")
			var form = this.currentForm;
			return $(document.getElementsByName(name)).map(function(index, element) {
				return element.form == form && element.name == name && element  || null;
			});
		},
		
		getLength: function(value, element) {
			switch( element.nodeName.toLowerCase() ) {
			case 'select':
				return $("option:selected", element).length;
			case 'input':
				if( this.checkable( element) )
					return this.findByName(element.name).filter(':checked').length;
			}
			return value.length;
		},
	
		depend: function(param, element) {
			return this.dependTypes[typeof param]
				? this.dependTypes[typeof param](param, element)
				: true;
		},
	
		dependTypes: {
			"boolean": function(param, element) {
				return param;
			},
			"string": function(param, element) {
				return !!$(param, element.form).length;
			},
			"function": function(param, element) {
				return param(element);
			}
		},
		
		optional: function(element) {
			return !$.validator.methods.required.call(this, $.trim(element.value), element) && "dependency-mismatch";
		},
		
		startRequest: function(element) {
			if (!this.pending[element.name]) {
				this.pendingRequest++;
				this.pending[element.name] = true;
			}
		},
		
		stopRequest: function(element, valid) {
			this.pendingRequest--;
			// sometimes synchronization fails, make sure pendingRequest is never < 0
			if (this.pendingRequest < 0)
				this.pendingRequest = 0;
			delete this.pending[element.name];
			if ( valid && this.pendingRequest == 0 && this.formSubmitted && this.form() ) {
				$(this.currentForm).submit();
				this.formSubmitted = false;
			} else if (!valid && this.pendingRequest == 0 && this.formSubmitted) {
				$(this.currentForm).triggerHandler("invalid-form", [this]);
				this.formSubmitted = false;
			}
		},
		
		previousValue: function(element) {
			return $.data(element, "previousValue") || $.data(element, "previousValue", {
				old: null,
				valid: true,
				message: this.defaultMessage( element, "remote" )
			});
		}
		
	},
	
	classRuleSettings: {
		required: {required: true},
		email: {email: true},
		url: {url: true},
		date: {date: true},
		dateISO: {dateISO: true},
		dateDE: {dateDE: true},
		number: {number: true},
		numberDE: {numberDE: true},
		digits: {digits: true},
		creditcard: {creditcard: true}
	},
	
	addClassRules: function(className, rules) {
		className.constructor == String ?
			this.classRuleSettings[className] = rules :
			$.extend(this.classRuleSettings, className);
	},
	
	classRules: function(element) {
		var rules = {};
		var classes = $(element).attr('class');
		classes && $.each(classes.split(' '), function() {
			if (this in $.validator.classRuleSettings) {
				$.extend(rules, $.validator.classRuleSettings[this]);
			}
		});
		return rules;
	},
	
	attributeRules: function(element) {
		var rules = {};
		var $element = $(element);
		
		for (method in $.validator.methods) {
			var value = $element.attr(method);
			if (value) {
				rules[method] = value;
			}
		}
		
		// maxlength may be returned as -1, 2147483647 (IE) and 524288 (safari) for text inputs
		if (rules.maxlength && /-1|2147483647|524288/.test(rules.maxlength)) {
			delete rules.maxlength;
		}
		
		return rules;
	},
	
	metadataRules: function(element) {
		if (!$.metadata) return {};
		
		var meta = $.data(element.form, 'validator').settings.meta;
		return meta ?
			$(element).metadata()[meta] :
			$(element).metadata();
	},
	
	staticRules: function(element) {
		var rules = {};
		var validator = $.data(element.form, 'validator');
		if (validator.settings.rules) {
			rules = $.validator.normalizeRule(validator.settings.rules[element.name]) || {};
		}
		return rules;
	},
	
	normalizeRules: function(rules, element) {
		// handle dependency check
		$.each(rules, function(prop, val) {
			// ignore rule when param is explicitly false, eg. required:false
			if (val === false) {
				delete rules[prop];
				return;
			}
			if (val.param || val.depends) {
				var keepRule = true;
				switch (typeof val.depends) {
					case "string":
						keepRule = !!$(val.depends, element.form).length;
						break;
					case "function":
						keepRule = val.depends.call(element, element);
						break;
				}
				if (keepRule) {
					rules[prop] = val.param !== undefined ? val.param : true;
				} else {
					delete rules[prop];
				}
			}
		});
		
		// evaluate parameters
		$.each(rules, function(rule, parameter) {
			rules[rule] = $.isFunction(parameter) ? parameter(element) : parameter;
		});
		
		// clean number parameters
		$.each(['minlength', 'maxlength', 'min', 'max'], function() {
			if (rules[this]) {
				rules[this] = Number(rules[this]);
			}
		});
		$.each(['rangelength', 'range'], function() {
			if (rules[this]) {
				rules[this] = [Number(rules[this][0]), Number(rules[this][1])];
			}
		});
		
		if ($.validator.autoCreateRanges) {
			// auto-create ranges
			if (rules.min && rules.max) {
				rules.range = [rules.min, rules.max];
				delete rules.min;
				delete rules.max;
			}
			if (rules.minlength && rules.maxlength) {
				rules.rangelength = [rules.minlength, rules.maxlength];
				delete rules.minlength;
				delete rules.maxlength;
			}
		}
		
		// To support custom messages in metadata ignore rule methods titled "messages"
		if (rules.messages) {
			delete rules.messages;
		}
		
		return rules;
	},
	
	// Converts a simple string to a {string: true} rule, e.g., "required" to {required:true}
	normalizeRule: function(data) {
		if( typeof data == "string" ) {
			var transformed = {};
			$.each(data.split(/\s/), function() {
				transformed[this] = true;
			});
			data = transformed;
		}
		return data;
	},
	
	// http://docs.jquery.com/Plugins/Validation/Validator/addMethod
	addMethod: function(name, method, message) {
		$.validator.methods[name] = method;
		$.validator.messages[name] = message != undefined ? message : $.validator.messages[name];
		if (method.length < 3) {
			$.validator.addClassRules(name, $.validator.normalizeRule(name));
		}
	},

	methods: {

		// http://docs.jquery.com/Plugins/Validation/Methods/required
		required: function(value, element, param) {
			// check if dependency is met
			if ( !this.depend(param, element) )
				return "dependency-mismatch";
			switch( element.nodeName.toLowerCase() ) {
			case 'select':
				// could be an array for select-multiple or a string, both are fine this way
				var val = $(element).val();
				return val && val.length > 0;
			case 'input':
				if ( this.checkable(element) )
					return this.getLength(value, element) > 0;
			default:
				return $.trim(value).length > 0;
			}
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/remote
		remote: function(value, element, param) {
			if ( this.optional(element) )
				return "dependency-mismatch";
			
			var previous = this.previousValue(element);
			if (!this.settings.messages[element.name] )
				this.settings.messages[element.name] = {};
			previous.originalMessage = this.settings.messages[element.name].remote;
			this.settings.messages[element.name].remote = previous.message;
			
			param = typeof param == "string" && {url:param} || param; 
			
			if ( previous.old !== value ) {
				previous.old = value;
				var validator = this;
				this.startRequest(element);
				var data = {};
				data[element.name] = value;
				$.ajax($.extend(true, {
					url: param,
					mode: "abort",
					port: "validate" + element.name,
					dataType: "json",
					data: data,
					success: function(response) {
						validator.settings.messages[element.name].remote = previous.originalMessage;
						var valid = response === true;
						if ( valid ) {
							var submitted = validator.formSubmitted;
							validator.prepareElement(element);
							validator.formSubmitted = submitted;
							validator.successList.push(element);
							validator.showErrors();
						} else {
							var errors = {};
							var message = (previous.message = response || validator.defaultMessage( element, "remote" ));
							errors[element.name] = $.isFunction(message) ? message(value) : message;
							validator.showErrors(errors);
						}
						previous.valid = valid;
						validator.stopRequest(element, valid);
					}
				}, param));
				return "pending";
			} else if( this.pending[element.name] ) {
				return "pending";
			}
			return previous.valid;
		},

		// http://docs.jquery.com/Plugins/Validation/Methods/minlength
		minlength: function(value, element, param) {
			return this.optional(element) || this.getLength($.trim(value), element) >= param;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/maxlength
		maxlength: function(value, element, param) {
			return this.optional(element) || this.getLength($.trim(value), element) <= param;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/rangelength
		rangelength: function(value, element, param) {
			var length = this.getLength($.trim(value), element);
			return this.optional(element) || ( length >= param[0] && length <= param[1] );
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/min
		min: function( value, element, param ) {
			return this.optional(element) || value >= param;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/max
		max: function( value, element, param ) {
			return this.optional(element) || value <= param;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/range
		range: function( value, element, param ) {
			return this.optional(element) || ( value >= param[0] && value <= param[1] );
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/email
		email: function(value, element) {
			// contributed by Scott Gonzalez: http://projects.scottsplayground.com/email_address_validation/
			return this.optional(element) || /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i.test(value);
		},
	
		// http://docs.jquery.com/Plugins/Validation/Methods/url
		url: function(value, element) {
			// contributed by Scott Gonzalez: http://projects.scottsplayground.com/iri/
			return this.optional(element) || /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test(value);
		},
        
		// http://docs.jquery.com/Plugins/Validation/Methods/date
		date: function(value, element) {
			return this.optional(element) || !/Invalid|NaN/.test(new Date(value));
		},
	
		// http://docs.jquery.com/Plugins/Validation/Methods/dateISO
		dateISO: function(value, element) {
			return this.optional(element) || /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}$/.test(value);
		},
	
		// http://docs.jquery.com/Plugins/Validation/Methods/number
		number: function(value, element) {
			return this.optional(element) || /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value);
		},
	
		// http://docs.jquery.com/Plugins/Validation/Methods/digits
		digits: function(value, element) {
			return this.optional(element) || /^\d+$/.test(value);
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/creditcard
		// based on http://en.wikipedia.org/wiki/Luhn
		creditcard: function(value, element) {
			if ( this.optional(element) )
				return "dependency-mismatch";
			// accept only digits and dashes
			if (/[^0-9-]+/.test(value))
				return false;
			var nCheck = 0,
				nDigit = 0,
				bEven = false;

			value = value.replace(/\D/g, "");

			for (var n = value.length - 1; n >= 0; n--) {
				var cDigit = value.charAt(n);
				var nDigit = parseInt(cDigit, 10);
				if (bEven) {
					if ((nDigit *= 2) > 9)
						nDigit -= 9;
				}
				nCheck += nDigit;
				bEven = !bEven;
			}

			return (nCheck % 10) == 0;
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/accept
		accept: function(value, element, param) {
			param = typeof param == "string" ? param.replace(/,/g, '|') : "png|jpe?g|gif";
			return this.optional(element) || value.match(new RegExp(".(" + param + ")$", "i")); 
		},
		
		// http://docs.jquery.com/Plugins/Validation/Methods/equalTo
		equalTo: function(value, element, param) {
			// bind to the blur event of the target in order to revalidate whenever the target field is updated
			// TODO find a way to bind the event just once, avoiding the unbind-rebind overhead
			var target = $(param).unbind(".validate-equalTo").bind("blur.validate-equalTo", function() {
				$(element).valid();
			});
			return value == target.val();
		}
		
	}
	
});

// deprecated, use $.validator.format instead
$.format = $.validator.format;

})(jQuery);

// ajax mode: abort
// usage: $.ajax({ mode: "abort"[, port: "uniqueport"]});
// if mode:"abort" is used, the previous request on that port (port can be undefined) is aborted via XMLHttpRequest.abort() 
;(function($) {
	var ajax = $.ajax;
	var pendingRequests = {};
	$.ajax = function(settings) {
		// create settings for compatibility with ajaxSetup
		settings = $.extend(settings, $.extend({}, $.ajaxSettings, settings));
		var port = settings.port;
		if (settings.mode == "abort") {
			if ( pendingRequests[port] ) {
				pendingRequests[port].abort();
			}
			return (pendingRequests[port] = ajax.apply(this, arguments));
		}
		return ajax.apply(this, arguments);
	};
})(jQuery);

// provides cross-browser focusin and focusout events
// IE has native support, in other browsers, use event caputuring (neither bubbles)

// provides delegate(type: String, delegate: Selector, handler: Callback) plugin for easier event delegation
// handler is only called when $(event.target).is(delegate), in the scope of the jquery-object for event.target 
;(function($) {
	// only implement if not provided by jQuery core (since 1.4)
	// TODO verify if jQuery 1.4's implementation is compatible with older jQuery special-event APIs
	if (!jQuery.event.special.focusin && !jQuery.event.special.focusout && document.addEventListener) {
		$.each({
			focus: 'focusin',
			blur: 'focusout'	
		}, function( original, fix ){
			$.event.special[fix] = {
				setup:function() {
					this.addEventListener( original, handler, true );
				},
				teardown:function() {
					this.removeEventListener( original, handler, true );
				},
				handler: function(e) {
					arguments[0] = $.event.fix(e);
					arguments[0].type = fix;
					return $.event.handle.apply(this, arguments);
				}
			};
			function handler(e) {
				e = $.event.fix(e);
				e.type = fix;
				return $.event.handle.call(this, e);
			}
		});
	};
	$.extend($.fn, {
		validateDelegate: function(delegate, type, handler) {
			return this.bind(type, function(event) {
				var target = $(event.target);
				if (target.is(delegate)) {
					return handler.apply(target, arguments);
				}
			});
		}
	});
})(jQuery);
/**
 * jQuery arrowSteps plugin
 * Copyright Neil Kandalgaonkar, 2010
 * 
 * This work is licensed under the terms of the GNU General Public License, 
 * version 2 or later. 
 * (see http://www.fsf.org/licensing/licenses/gpl.html). 
 * Derivative works and later versions of the code must be free software 
 * licensed under the same or a compatible license.
 *
 *
 * DESCRIPTION
 *
 * Show users their progress through a series of steps, via a row of items that fit 
 * together like arrows. One item can be highlighted at a time.
 *
 *
 * SYNOPSIS 
 *
 * <ul id="robin-hood-daffy">
 *   <li id="guard"><div>Guard!</div></li>
 *   <li id="turn"><div>Turn!</div></li>
 *   <li id="parry"><div>Parry!</div></li>
 *   <li id="dodge"><div>Dodge!</div></li>
 *   <li id="spin"><div>Spin!</div></li>
 *   <li id="ha"><div>Ha!</div></li>
 *   <li id="thrust"><div>Thrust!</div></li>
 * </ul>
 *
 * <script language="javascript"><!-- 
 *   $( '#robin-hood-daffy' ).arrowSteps();
 *
 *   $( '#robin-hood-daffy' ).arrowStepsHighlight( '#guard' );
 *   // 'Guard!' is highlighted.
 *
 *   // ... user completes the 'guard' step ...
 * 
 *   $( '#robin-hood-daffy' ).arrowStepsHighlight( '#turn' );
 *   // 'Turn!' is highlighted.
 *
 *   //-->
 * </script>
 *
 */

( function( $j ) { 
	$j.fn.arrowSteps = function() {
		this.addClass( 'arrowSteps' );
		var $steps = this.find( 'li' );

		var width = parseInt( 100 / $steps.length, 10 );
		$steps.css( 'width', width + '%' );

		// every step except the last one has an arrow at the right hand side. Also add in the padding 
		// for the calculated arrow width.
		var arrowWidth = parseInt( this.outerHeight(), 10 );
		$steps.filter( ':not(:last-child)' ).addClass( 'arrow' )
		      .find( 'div' ).css( 'padding-right', arrowWidth.toString() + 'px' );

		this.data( 'arrowSteps', $steps );
		return this;
	};
	
	$j.fn.arrowStepsHighlight = function( selector ) {
		var $steps = this.data( 'arrowSteps' );
		var $previous;
		$j.each( $steps, function( i, step ) {
			var $step = $j( step );
			if ( $step.is( selector ) ) {
				if ($previous) {
					$previous.addClass( 'tail' );
				}
				$step.addClass( 'head' );
			} else {
				$step.removeClass( 'head tail lasthead' );
			}
			$previous = $step;
		} ); 
	};

} )( jQuery );
(function($){

jQuery.autocomplete = function(input, options) {
	// Create a link to self
	var me = this;

	// Create jQuery object for input element
	var $input = $(input).attr("autocomplete", "off");

	// Apply inputClass if necessary
	if (options.inputClass) $input.addClass(options.inputClass);

	// Create results
	if(!options.resultElem){
		var results = document.createElement("div");
		// Create jQuery object for results
		var $results = $(results);
		// Add to body element
		$("body").append(results);
		$results.hide().addClass(options.resultsClass).css("position", "absolute");
		if( options.width > 0 ) $results.css("width", options.width);
	}else{
		var results = $j(options.resultElem).get(0);
		var $results = $j(options.resultElem);
		$results.hide();
	}


	input.autocompleter = me;

	var timeout = null;
	var prev = "";
	var active = -1;
	var cache = {};
	var keyb = false;
	var hasFocus = false;
	var lastKeyPressCode = null;

	// flush cache
	function flushCache(){
		cache = {};
		cache.data = {};
		cache.length = 0;
	};

	// flush cache
	flushCache();

	// if there is a data array supplied
	if( options.data != null ){
		var sFirstChar = "", stMatchSets = {}, row = [];

		// no url was specified, we need to adjust the cache length to make sure it fits the local data store
		if( typeof options.url != "string" ) options.cacheLength = 1;

		// loop through the array and create a lookup structure
		for( var i=0; i < options.data.length; i++ ){
			// if row is a string, make an array otherwise just reference the array
			row = ((typeof options.data[i] == "string") ? [options.data[i]] : options.data[i]);

			// if the length is zero, don't add to list
			if( row[0].length > 0 ){
				// get the first character
				sFirstChar = row[0].substring(0, 1).toLowerCase();
				// if no lookup array for this character exists, look it up now
				if( !stMatchSets[sFirstChar] ) stMatchSets[sFirstChar] = [];
				// if the match is a string
				stMatchSets[sFirstChar].push(row);
			}
		}

		// add the data items to the cache
		for( var k in stMatchSets ){
			// increase the cache size
			options.cacheLength++;
			// add to the cache
			addToCache(k, stMatchSets[k]);
		}
	}

	$input
	.keydown(function(e) {
		// track last key pressed
		lastKeyPressCode = e.keyCode;
		switch(e.keyCode) {
			case 38: // up
				e.preventDefault();
				moveSelect(-1);
				break;
			case 40: // down
				e.preventDefault();
				moveSelect(1);
				break;
			case 9:  // tab
			case 13: // return
				if( selectCurrent() ){
					// make sure to blur off the current field
					$input.get(0).blur();
					e.preventDefault();
				}
				break;
			default:
				active = -1;
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(function(){onChange();}, options.delay);
				break;
		}
	})
	.focus(function(){
		// track whether the field has focus, we shouldn't process any results if the field no longer has focus
		hasFocus = true;
	})
	.blur(function() {
		// track whether the field has focus
		hasFocus = false;
		hideResults();
	});

	hideResultsNow();

	function onChange() {
		// ignore if the following keys are pressed: [del] [shift] [capslock]
		if( lastKeyPressCode == 46 || (lastKeyPressCode > 8 && lastKeyPressCode < 32) ) return $results.hide();
		var v = $input.val();
		if (v == prev) return;
		prev = v;
		if (v.length >= options.minChars) {
			$input.addClass(options.loadingClass);
			requestData(v);
		} else {
			$input.removeClass(options.loadingClass);
			$results.hide();
		}
	};

 	function moveSelect(step) {
		var lis = $("li", results);
		if (!lis) return;

		active += step;

		if (active < 0) {
			active = 0;
		} else if (active >= lis.size()) {
			active = lis.size() - 1;
		}

		lis.removeClass("ac_over");

		$(lis[active]).addClass("ac_over");

		// Weird behaviour in IE
		// if (lis[active] && lis[active].scrollIntoView) {
		// 	lis[active].scrollIntoView(false);
		// }

	};
	function selectCurrent() {
		var li = $("li.ac_over", results)[0];
		if (!li) {
			var $li = $("li", results);
			if (options.selectOnly) {
				if ($li.length == 1) li = $li[0];
			} else if (options.selectFirst) {
				li = $li[0];
			}
		}
		if (li) {
			selectItem(li);
			return true;
		} else {
			return false;
		}
	};

	function selectItem(li) {
		if (!li) {
			li = document.createElement("li");
			li.extra = [];
			li.selectValue = "";
		}
		var v = $.trim(li.selectValue ? li.selectValue : li.innerHTML);
		input.lastSelected = v;
		prev = v;
		$results.html("");
		$input.val(v);
		hideResultsNow();
		if (options.onItemSelect) setTimeout(function() { options.onItemSelect(li) }, 1);
	};

	// selects a portion of the input string
	function createSelection(start, end){
		// get a reference to the input element
		var field = $input.get(0);
		if( field.createTextRange ){
			var selRange = field.createTextRange();
			selRange.collapse(true);
			selRange.moveStart("character", start);
			selRange.moveEnd("character", end);
			selRange.select();
		} else if( field.setSelectionRange ){
			field.setSelectionRange(start, end);
		} else {
			if( field.selectionStart ){
				field.selectionStart = start;
				field.selectionEnd = end;
			}
		}
		field.focus();
	};

	// fills in the input box w/the first match (assumed to be the best match)
	function autoFill(sValue){
		// if the last user key pressed was backspace, don't autofill
		if( lastKeyPressCode != 8 ){
			// fill in the value (keep the case the user has typed)
			$input.val($input.val() + sValue.substring(prev.length));
			// select the portion of the value not typed by the user (so the next character will erase)
			createSelection(prev.length, sValue.length);
		}
	};

	function showResults() {
		// get the position of the input field right now (in case the DOM is shifted)
		var pos = findPos(input);
		// either use the specified width, or autocalculate based on form element
		var iWidth = (options.width > 0) ? options.width : $input.width();
		// reposition
		if(!options.resultElem){
			$results.css({
				width: parseInt(iWidth) + "px",
				top: (pos.y + input.offsetHeight) + "px",
				left: pos.x + "px"
			}).show();
		}else{
			$results.show();
		}
		if(options.resultContainer){
			$(options.resultContainer).css({top: (pos.y + input.offsetHeight) + "px",
				left: (pos.x- parseInt(iWidth)) + "px"}).show();
		}
	};

	function hideResults() {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(hideResultsNow, 200);
	};

	function hideResultsNow() {
		if (timeout) clearTimeout(timeout);
		$input.removeClass(options.loadingClass);
		if ($results.is(":visible")) {
			$results.hide();
		}
		if(options.resultContainer){
			$(options.resultContainer).hide();
		}
		if (options.mustMatch) {
			var v = $input.val();
			if (v != input.lastSelected) {
				selectItem(null);
			}
		}
	};

	function receiveData(q, data) {
		if (data) {
			$input.removeClass(options.loadingClass);
			results.innerHTML = "";

			// if the field no longer has focus or if there are no matches, do not display the drop down
			if( !hasFocus || data.length == 0 ) return hideResultsNow();

			//messes with layout & ie7 does not have this problem
			/*if ($.browser.msie) {
				// we put a styled iframe behind the calendar so HTML SELECT elements don't show through
				$results.append(document.createElement('iframe'));
			}*/
			results.appendChild(dataToDom(data));
			// autofill in the complete box w/the first match as long as the user hasn't entered in more data
			if( options.autoFill && ($input.val().toLowerCase() == q.toLowerCase()) ) autoFill(data[0][0]);
			showResults();
		} else {
			hideResultsNow();
		}
	};

	function parseData(data) {
		if (!data) return null;
		var parsed = [];
		var rows = data.split(options.lineSeparator);
		for (var i=0; i < rows.length; i++) {
			var row = $.trim(rows[i]);
			if (row) {
				parsed[parsed.length] = row.split(options.cellSeparator);
			}
		}
		return parsed;
	};

	function dataToDom(data) {
		var ul = document.createElement("ul");
		if(options.ul_class)$(ul).addClass(options.ul_class);

		var num = data.length;

		// limited results to a max number
		if( (options.maxItemsToShow > 0) && (options.maxItemsToShow < num) ) num = options.maxItemsToShow;

		for (var i=0; i < num; i++) {
			var row = data[i];
			if (!row) continue;
			var li = document.createElement("li");
			if (options.formatItem) {
				li.innerHTML = options.formatItem(row, i, num);
				li.selectValue = row[0];
			} else {
				li.innerHTML = row[0];
				li.selectValue = row[0];
			}
			var extra = null;
			if (row.length > 1) {
				extra = [];
				for (var j=1; j < row.length; j++) {
					extra[extra.length] = row[j];
				}
			}
			li.extra = extra;
			ul.appendChild(li);
			$(li).hover(
				function() { $("li", ul).removeClass("ac_over"); $(this).addClass("ac_over"); active = $("li", ul).indexOf($(this).get(0)); },
				function() { $(this).removeClass("ac_over"); }
			).click(function(e) { e.preventDefault(); e.stopPropagation(); selectItem(this) });
		}
		return ul;
	};

	function requestData(q) {
		if (!options.matchCase) q = q.toLowerCase();
		var data = options.cacheLength ? loadFromCache(q) : null;
		// recieve the cached data
		if (data) {
			receiveData(q, data);
		// if an AJAX url has been supplied, try loading the data now
		} else if( (typeof options.url == "string") && (options.url.length > 0) ){
			$.get(makeUrl(q), function(data) {
				data = parseData(data);
				addToCache(q, data);
				receiveData(q, data);
			});
		// if there's been no data found, remove the loading class
		} else {
			$input.removeClass(options.loadingClass);
		}
	};

	function makeUrl(q) {
		var url = options.url + "?"+options.paramName+'='+ encodeURI(q);
		for (var i in options.extraParams) {
			url += "&" + i + "=" + encodeURI(options.extraParams[i]);
		}
		return url;
	};

	function loadFromCache(q) {
		if (!q) return null;
		if (typeof cache.data[q]!='undefined'){
		 	return cache.data[q];
		}
		if (options.matchSubset) {
			for (var i = q.length - 1; i >= options.minChars; i--) {
				var qs = q.substr(0, i);
				var c = cache.data[qs];
				if (c) {
					var csub = [];
					for (var j = 0; j < c.length; j++) {
						var x = c[j];
						var x0 = x[0];
						if (matchSubset(x0, q)) {
							csub[csub.length] = x;
						}
					}
					return csub;
				}
			}
		}
		return null;
	};

	function matchSubset(s, sub) {
		if (!options.matchCase) s = s.toLowerCase();
		var i = s.indexOf(sub);
		if (i == -1) return false;
		return i == 0 || options.matchContains;
	};

	this.flushCache = function() {
		flushCache();
	};

	this.setExtraParams = function(p) {
		options.extraParams = p;
	};

	this.findValue = function(){
		var q = $input.val();

		if (!options.matchCase) q = q.toLowerCase();
		var data = options.cacheLength ? loadFromCache(q) : null;
		if (data) {
			findValueCallback(q, data);
		} else if( (typeof options.url == "string") && (options.url.length > 0) ){
			$.get(makeUrl(q), function(data) {
				data = parseData(data)
				addToCache(q, data);
				findValueCallback(q, data);
			});
		} else {
			// no matches
			findValueCallback(q, null);
		}
	}

	function findValueCallback(q, data){
		if (data) $input.removeClass(options.loadingClass);

		var num = (data) ? data.length : 0;
		var li = null;

		for (var i=0; i < num; i++) {
			var row = data[i];

			if( row[0].toLowerCase() == q.toLowerCase() ){
				li = document.createElement("li");
				if (options.formatItem) {
					li.innerHTML = options.formatItem(row, i, num);
					li.selectValue = row[0];
				} else {
					li.innerHTML = row[0];
					li.selectValue = row[0];
				}
				var extra = null;
				if( row.length > 1 ){
					extra = [];
					for (var j=1; j < row.length; j++) {
						extra[extra.length] = row[j];
					}
				}
				li.extra = extra;
			}
		}

		if( options.onFindValue ) setTimeout(function() { options.onFindValue(li) }, 1);
	}

	function addToCache(q, data) {
		if (!data || !q || !options.cacheLength) return;
		if (!cache.length || cache.length > options.cacheLength) {
			flushCache();
			cache.length++;
		} else if (!cache[q]) {
			cache.length++;
		}
		cache.data[q] = data;
	};

	function findPos(obj) {
		var curleft = obj.offsetLeft || 0;
		var curtop = obj.offsetTop || 0;
		while (obj = obj.offsetParent) {
			curleft += obj.offsetLeft
			curtop += obj.offsetTop
		}
		return {x:curleft,y:curtop};
	}
}
})(jQuery);

jQuery.fn.autocomplete = function(url, options, data) {
	// Make sure options exists
	options = options || {};
	// Set url as option
	options.url = url;
	// set some bulk local data
	options.data = ((typeof data == "object") && (data.constructor == Array)) ? data : null;

	// Set default values for required options
	options.resultElem = options.resultElem || null;
	options.paramName = options.paramName || 'q';

	options.inputClass = options.inputClass || "ac_input";
	options.resultsClass = options.resultsClass || "ac_results";
	options.lineSeparator = options.lineSeparator || "\n";
	options.cellSeparator = options.cellSeparator || "|";
	options.minChars = options.minChars || 1;
	options.delay = options.delay || 400;
	options.matchCase = options.matchCase || 0;
	options.matchSubset = options.matchSubset || 1;
	options.matchContains = options.matchContains || 0;
	options.cacheLength = options.cacheLength || 1;
	options.mustMatch = options.mustMatch || 0;
	options.extraParams = options.extraParams || {};
	options.loadingClass = options.loadingClass || "ac_loading";
	options.selectFirst = options.selectFirst || false;
	options.selectOnly = options.selectOnly || false;
	options.maxItemsToShow = options.maxItemsToShow || -1;
	options.autoFill = options.autoFill || false;
	options.width = parseInt(options.width, 10) || 0;

	this.each(function() {
		var input = this;
		new jQuery.autocomplete(input, options);
	});

	// Don't break the chain
	return this;
}

jQuery.fn.autocompleteArray = function(data, options) {
	return this.autocomplete(null, options, data);
}

jQuery.fn.indexOf = function(e){
	for( var i=0; i<this.length; i++ ){
		if( this[i] == e ) return i;
	}
	return -1;
};
( function( $ ) {
	/**
	 * Set a given selector html to the loading spinner:
	 */
	$.fn.loadingSpinner = function( ) {
		if ( this ) {
			$j( this ).html(
				$j( '<div />' )
					.addClass( "loadingSpinner" )
			);
		}
		return this;
	}
	/**
	 * Add an absolute overlay spinner useful for cases where the
	 * element does not display child elements, ( images, video )
	 */
	$.fn.getAbsoluteOverlaySpinner = function(){
		var pos = $j( this ).offset();				
		var posLeft = (  $j( this ).width() ) ? 
			parseInt( pos.left + ( .4 * $j( this ).width() ) ) : 
			pos.left + 30;
			
		var posTop = (  $j( this ).height() ) ? 
			parseInt( pos.top + ( .4 * $j( this ).height() ) ) : 
			pos.top + 30;
		
		var $spinner = $j('<div />')
			.loadingSpinner()				
			.css({
				'width' : 32,
				'height' : 32,
				'position': 'absolute',
				'top' : posTop + 'px',
				'left' : posLeft + 'px'
			});
		$j('body').append( $spinner	);
		return $spinner;
	}
} )( jQuery );
/**
 * This plugin provides a generic way to add suggestions to a text box.
 *
 * Usage:
 *
 * Set options:
 *		$('#textbox').suggestions( { option1: value1, option2: value2 } );
 *		$('#textbox').suggestions( option, value );
 * Get option:
 *		value = $('#textbox').suggestions( option );
 * Initialize:
 *		$('#textbox').suggestions();
 *
 * Options:
 *
 * fetch(query): Callback that should fetch suggestions and set the suggestions property. Executed in the context of the
 * 		textbox
 * 		Type: Function
 * cancel: Callback function to call when any pending asynchronous suggestions fetches should be canceled.
 * 		Executed in the context of the textbox
 *		Type: Function
 * special: Set of callbacks for rendering and selecting
 *		Type: Object of Functions 'render' and 'select'
 * result: Set of callbacks for rendering and selecting
 *		Type: Object of Functions 'render' and 'select'
 * $region: jQuery selection of element to place the suggestions below and match width of
 * 		Type: jQuery Object, Default: $(this)
 * suggestions: Suggestions to display
 * 		Type: Array of strings
 * maxRows: Maximum number of suggestions to display at one time
 * 		Type: Number, Range: 1 - 100, Default: 7
 * delay: Number of ms to wait for the user to stop typing
 * 		Type: Number, Range: 0 - 1200, Default: 120
 * submitOnClick: Whether to submit the form containing the textbox when a suggestion is clicked
 *		Type: Boolean, Default: false
 * maxExpandFactor: Maximum suggestions box width relative to the textbox width.  If set to e.g. 2, the suggestions box
 *		will never be grown beyond 2 times the width of the textbox.
 *		Type: Number, Range: 1 - infinity, Default: 3
 * positionFromLeft: Whether to position the suggestion box with the left attribute or the right
 *		Type: Boolean, Default: true
 * highlightInput: Whether to hightlight matched portions of the input or not
 *		Type: Boolean, Default: false
 */
( function( $ ) {

$.suggestions = {
	/**
	 * Cancel any delayed updateSuggestions() call and inform the user so
	 * they can cancel their result fetching if they use AJAX or something
	 */
	cancel: function( context ) {
		if ( context.data.timerID != null ) {
			clearTimeout( context.data.timerID );
		}
		if ( typeof context.config.cancel == 'function' ) {
			context.config.cancel.call( context.data.$textbox );
		}
	},
	/**
	 * Restore the text the user originally typed in the textbox, before it was overwritten by highlight(). This
	 * restores the value the currently displayed suggestions are based on, rather than the value just before
	 * highlight() overwrote it; the former is arguably slightly more sensible.
	 */
	restore: function( context ) {
		context.data.$textbox.val( context.data.prevText );
	},
	/**
	 * Ask the user-specified callback for new suggestions. Any previous delayed call to this function still pending
	 * will be canceled.  If the value in the textbox hasn't changed since the last time suggestions were fetched, this
	 * function does nothing.
	 * @param {Boolean} delayed Whether or not to delay this by the currently configured amount of time
	 */
	update: function( context, delayed ) {
		// Only fetch if the value in the textbox changed
		function maybeFetch() {
			if ( context.data.$textbox.val() !== context.data.prevText ) {
				context.data.prevText = context.data.$textbox.val();
				if ( typeof context.config.fetch == 'function' ) {
					context.config.fetch.call( context.data.$textbox, context.data.$textbox.val() );
				}
			}
		}
		// Cancel previous call
		if ( context.data.timerID != null ) {
			clearTimeout( context.data.timerID );
		}
		if ( delayed ) {
			// Start a new asynchronous call
			context.data.timerID = setTimeout( maybeFetch, context.config.delay );
		} else {
			maybeFetch();
		}
		$.suggestions.special( context );
	},
	special: function( context ) {
		// Allow custom rendering - but otherwise don't do any rendering
		if ( typeof context.config.special.render == 'function' ) {
			// Wait for the browser to update the value
			setTimeout( function() {
				// Render special
				$special = context.data.$container.find( '.suggestions-special' );
				context.config.special.render.call( $special, context.data.$textbox.val() );
			}, 1 );
		}
	},
	/**
	 * Sets the value of a property, and updates the widget accordingly
	 * @param {String} property Name of property
	 * @param {Mixed} value Value to set property with
	 */
	configure: function( context, property, value ) {
		// Validate creation using fallback values
		switch( property ) {
			case 'fetch':
			case 'cancel':
			case 'special':
			case 'result':
			case '$region':
				context.config[property] = value;
				break;
			case 'suggestions':
				context.config[property] = value;
				// Update suggestions
				if ( typeof context.data !== 'undefined'  ) {
					if ( context.data.$textbox.val().length == 0 ) {
						// Hide the div when no suggestion exist
						context.data.$container.hide();
					} else {
						// Rebuild the suggestions list
						context.data.$container.show();
						// Update the size and position of the list
						var newCSS = {
							'top': context.config.$region.offset().top + context.config.$region.outerHeight(),
							'bottom': 'auto',
							'width': context.config.$region.outerWidth(),
							'height': 'auto'
						}
						if ( context.config.positionFromLeft ) {
							newCSS['left'] = context.config.$region.offset().left;
							newCSS['right'] = 'auto';
						} else {
							newCSS['left'] = 'auto';
							newCSS['right'] = $( 'body' ).width() - ( context.config.$region.offset().left + context.config.$region.outerWidth() );
						}
						context.data.$container.css( newCSS );
						var $results = context.data.$container.children( '.suggestions-results' );
						$results.empty();
						var expWidth = -1;
						var $autoEllipseMe = $( [] );
						var matchedText = null;
						for ( var i = 0; i < context.config.suggestions.length; i++ ) {
							var text = context.config.suggestions[i];
							var $result = $( '<div />' )
								.addClass( 'suggestions-result' )
								.attr( 'rel', i )
								.data( 'text', context.config.suggestions[i] )
								.mousemove( function( e ) {
									context.data.selectedWithMouse = true;
									$.suggestions.highlight(
										context, $(this).closest( '.suggestions-results div' ), false
									);
								} )
								.appendTo( $results );
							// Allow custom rendering
							if ( typeof context.config.result.render == 'function' ) {
								context.config.result.render.call( $result, context.config.suggestions[i] );
							} else {
								// Add <span> with text
								if( context.config.highlightInput ) {
									matchedText = context.data.prevText;
								}
								$result.append( $( '<span />' )
										.css( 'whiteSpace', 'nowrap' )
										.text( text )
									);
								
								// Widen results box if needed
								// New width is only calculated here, applied later
								var $span = $result.children( 'span' );
								if ( $span.outerWidth() > $result.width() && $span.outerWidth() > expWidth ) {
									// factor in any padding, margin, or border space on the parent
									expWidth = $span.outerWidth() + ( context.data.$container.width() - $span.parent().width());
								}
								$autoEllipseMe = $autoEllipseMe.add( $result );
							}
						}
						// Apply new width for results box, if any
						if ( expWidth > context.data.$container.width() ) {
							var maxWidth = context.config.maxExpandFactor*context.data.$textbox.width();
							context.data.$container.width( Math.min( expWidth, maxWidth ) );
						}
						// autoEllipse the results. Has to be done after changing the width
						$autoEllipseMe.autoEllipsis( { hasSpan: true, tooltip: true, matchText: matchedText } );
					}
				}
				break;
			case 'maxRows':
				context.config[property] = Math.max( 1, Math.min( 100, value ) );
				break;
			case 'delay':
				context.config[property] = Math.max( 0, Math.min( 1200, value ) );
				break;
			case 'maxExpandFactor':
				context.config[property] = Math.max( 1, value );
				break;
			case 'submitOnClick':
			case 'positionFromLeft':
			case 'highlightInput':
				context.config[property] = value ? true : false;
				break;
		}
	},
	/**
	 * Highlight a result in the results table
	 * @param result <tr> to highlight: jQuery object, or 'prev' or 'next'
	 * @param updateTextbox If true, put the suggestion in the textbox
	 */
	highlight: function( context, result, updateTextbox ) {
		var selected = context.data.$container.find( '.suggestions-result-current' );
		if ( !result.get || selected.get( 0 ) != result.get( 0 ) ) {
			if ( result == 'prev' ) {
				if( selected.is( '.suggestions-special' ) ) {
					result = context.data.$container.find( '.suggestions-result:last' )
				} else {
					result = selected.prev();
					if ( selected.length == 0 ) {
						// we are at the begginning, so lets jump to the last item
						if ( context.data.$container.find( '.suggestions-special' ).html() != "" ) {
							result = context.data.$container.find( '.suggestions-special' );
						} else {
							result = context.data.$container.find( '.suggestions-results div:last' );
						}
					}
				}
			} else if ( result == 'next' ) {
				if ( selected.length == 0 ) {
					// No item selected, go to the first one
					result = context.data.$container.find( '.suggestions-results div:first' );
					if ( result.length == 0 && context.data.$container.find( '.suggestions-special' ).html() != "" ) {
						// No suggestion exists, go to the special one directly
						result = context.data.$container.find( '.suggestions-special' );
					}
				} else {
					result = selected.next();
					if ( selected.is( '.suggestions-special' ) ) {
						result = $( [] );
					} else if (
						result.length == 0 &&
						context.data.$container.find( '.suggestions-special' ).html() != ""
					) {
						// We were at the last item, jump to the specials!
						result = context.data.$container.find( '.suggestions-special' );
					}
				}
			}
			selected.removeClass( 'suggestions-result-current' );
			result.addClass( 'suggestions-result-current' );
		}
		if ( updateTextbox ) {
			if ( result.length == 0 || result.is( '.suggestions-special' ) ) {
				$.suggestions.restore( context );
			} else {
				context.data.$textbox.val( result.data( 'text' ) );
				// .val() doesn't call any event handlers, so
				// let the world know what happened
				context.data.$textbox.change();
			}
			context.data.$textbox.trigger( 'change' );
		}
	},
	/**
	 * Respond to keypress event
	 * @param {Integer} key Code of key pressed
	 */
	keypress: function( e, context, key ) {
		var wasVisible = context.data.$container.is( ':visible' );
		var preventDefault = false;
		switch ( key ) {
			// Arrow down
			case 40:
				if ( wasVisible ) {
					$.suggestions.highlight( context, 'next', true );
					context.data.selectedWithMouse = false;
				} else {
					$.suggestions.update( context, false );
				}
				preventDefault = true;
				break;
			// Arrow up
			case 38:
				if ( wasVisible ) {
					$.suggestions.highlight( context, 'prev', true );
					context.data.selectedWithMouse = false;
				}
				preventDefault = wasVisible;
				break;
			// Escape
			case 27:
				context.data.$container.hide();
				$.suggestions.restore( context );
				$.suggestions.cancel( context );
				context.data.$textbox.trigger( 'change' );
				preventDefault = wasVisible;
				break;
			// Enter
			case 13:
				context.data.$container.hide();
				preventDefault = wasVisible;
				selected = context.data.$container.find( '.suggestions-result-current' );
				if ( selected.size() == 0 || context.data.selectedWithMouse ) {
					// if nothing is selected OR if something was selected with the mouse, 
					// cancel any current requests and submit the form
					$.suggestions.cancel( context );
					context.config.$region.closest( 'form' ).submit();
				} else if ( selected.is( '.suggestions-special' ) ) {
					if ( typeof context.config.special.select == 'function' ) {
						context.config.special.select.call( selected, context.data.$textbox );
					}
				} else {
					if ( typeof context.config.result.select == 'function' ) {
						$.suggestions.highlight( context, selected, true );
						context.config.result.select.call( selected, context.data.$textbox );
					} else {
						$.suggestions.highlight( context, selected, true );
					}
				}
				break;
			default:
				$.suggestions.update( context, true );
				break;
		}
		if ( preventDefault ) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	}
};
$.fn.suggestions = function() {
	
	// Multi-context fields
	var returnValue = null;
	var args = arguments;
	
	$(this).each( function() {

		/* Construction / Loading */
		
		var context = $(this).data( 'suggestions-context' );
		if ( typeof context == 'undefined' || context == null ) {
			context = {
				config: {
					'fetch' : function() {},
					'cancel': function() {},
					'special': {},
					'result': {},
					'$region': $(this),
					'suggestions': [],
					'maxRows': 7,
					'delay': 120,
					'submitOnClick': false,
					'maxExpandFactor': 3,
					'positionFromLeft': true,
					'highlightInput': false
				}
			};
		}
		
		/* API */
		
		// Handle various calling styles
		if ( args.length > 0 ) {
			if ( typeof args[0] == 'object' ) {
				// Apply set of properties
				for ( var key in args[0] ) {
					$.suggestions.configure( context, key, args[0][key] );
				}
			} else if ( typeof args[0] == 'string' ) {
				if ( args.length > 1 ) {
					// Set property values
					$.suggestions.configure( context, args[0], args[1] );
				} else if ( returnValue == null ) {
					// Get property values, but don't give access to internal data - returns only the first
					returnValue = ( args[0] in context.config ? undefined : context.config[args[0]] );
				}
			}
		}
		
		/* Initialization */
		
		if ( typeof context.data == 'undefined' ) {
			context.data = {
				// ID of running timer
				'timerID': null,
				// Text in textbox when suggestions were last fetched
				'prevText': null,
				// Number of results visible without scrolling
				'visibleResults': 0,
				// Suggestion the last mousedown event occured on
				'mouseDownOn': $( [] ),
				'$textbox': $(this),
				'selectedWithMouse': false
			};
			// Setup the css for positioning the results box
			var newCSS = {
				'top': Math.round( context.data.$textbox.offset().top + context.data.$textbox.outerHeight() ),
				'width': context.data.$textbox.outerWidth(),
				'display': 'none'
			}
			if ( context.config.positionFromLeft ) {
				newCSS['left'] = context.config.$region.offset().left;
				newCSS['right'] = 'auto';
			} else {
				newCSS['left'] = 'auto';
				newCSS['right'] = $( 'body' ).width() - ( context.config.$region.offset().left + context.config.$region.outerWidth() );
			}
			
			context.data.$container = $( '<div />' )
				.css( newCSS )
				.addClass( 'suggestions' )
				.append(
					$( '<div />' ).addClass( 'suggestions-results' )
						// Can't use click() because the container div is hidden when the textbox loses focus. Instead,
						// listen for a mousedown followed by a mouseup on the same div
						.mousedown( function( e ) {
							context.data.mouseDownOn = $( e.target ).closest( '.suggestions-results div' );
						} )
						.mouseup( function( e ) {
							var $result = $( e.target ).closest( '.suggestions-results div' );
							var $other = context.data.mouseDownOn;
							context.data.mouseDownOn = $( [] );
							if ( $result.get( 0 ) != $other.get( 0 ) ) {
								return;
							}
							$.suggestions.highlight( context, $result, true );
							context.data.$container.hide();
							if ( typeof context.config.result.select == 'function' ) {
								context.config.result.select.call( $result, context.data.$textbox );
							}
							context.data.$textbox.focus();
						} )
				)
				.append(
					$( '<div />' ).addClass( 'suggestions-special' )
						// Can't use click() because the container div is hidden when the textbox loses focus. Instead,
						// listen for a mousedown followed by a mouseup on the same div
						.mousedown( function( e ) {
							context.data.mouseDownOn = $( e.target ).closest( '.suggestions-special' );
						} )
						.mouseup( function( e ) {
							var $special = $( e.target ).closest( '.suggestions-special' );
							var $other = context.data.mouseDownOn;
							context.data.mouseDownOn = $( [] );
							if ( $special.get( 0 ) != $other.get( 0 ) ) {
								return;
							}
							context.data.$container.hide();
							if ( typeof context.config.special.select == 'function' ) {
								context.config.special.select.call( $special, context.data.$textbox );
							}
							context.data.$textbox.focus();
						} )
						.mousemove( function( e ) {
							context.data.selectedWithMouse = true;
							$.suggestions.highlight(
								context, $( e.target ).closest( '.suggestions-special' ), false
							);
						} )
				)
				.appendTo( $( 'body' ) );
			$(this)
				// Stop browser autocomplete from interfering
				.attr( 'autocomplete', 'off')
				.keydown( function( e ) {
					// Store key pressed to handle later
					context.data.keypressed = ( e.keyCode == undefined ) ? e.which : e.keyCode;
					context.data.keypressedCount = 0;
					
					switch ( context.data.keypressed ) {
						// This preventDefault logic is duplicated from
						// $.suggestions.keypress(), which sucks
						case 40:
							e.preventDefault();
							e.stopImmediatePropagation();
							break;
						case 38:
						case 27:
						case 13:
							if ( context.data.$container.is( ':visible' ) ) {
								e.preventDefault();
								e.stopImmediatePropagation();
							}
					}
				} )
				.keypress( function( e ) {
					context.data.keypressedCount++;
					$.suggestions.keypress( e, context, context.data.keypressed );
				} )
				.keyup( function( e ) {
					// Some browsers won't throw keypress() for arrow keys. If we got a keydown and a keyup without a
					// keypress in between, solve it
					if ( context.data.keypressedCount == 0 ) {
						$.suggestions.keypress( e, context, context.data.keypressed );
					}
				} )
				.blur( function() {
					// When losing focus because of a mousedown
					// on a suggestion, don't hide the suggestions
					if ( context.data.mouseDownOn.length > 0 ) {
						return;
					}
					context.data.$container.hide();
					$.suggestions.cancel( context );
				} );
		}
		// Store the context for next time
		$(this).data( 'suggestions-context', context );
	} );
	return returnValue !== null ? returnValue : $(this);
};

} )( jQuery );
/** 
 * Simple predictive typing category adder for Mediawiki.
 * Relies on globals: wgScriptPath, wgNamespaceIds, wgFormattedNamespaces
 * Add to the page and then use getWikiText() to get wiki text representing the categories.
 */
( function ( $j ) { $j.fn.mwCoolCats = function( options ) {

	var defaults = {
		buttontext: 'Add'
	};

	var settings = $j.extend( {}, defaults, options);

	// usually Category:Foo
	var categoryNamespace = wgFormattedNamespaces[wgNamespaceIds['category']];

	var $container;
	return this.each( function() {
		var _this = $j( this );
		_this.addClass( 'categoryInput' );

		_this.suggestions( {
			'fetch': _fetchSuggestions,
			'cancel': function() {
				var req = $j( this ).data( 'request' );
				if ( req.abort ) {
					req.abort();
					}
			}
		} );
		_this.suggestions();

		_this.wrap('<div class="cat-widget"></div>');
		$container = _this.parent(); // set to the cat-widget class we just wrapped
		$container.append( $j( '<button type="button">'+settings.buttontext+'</button>' ) 
				.click( function(e) {
				e.stopPropagation(); 
				e.preventDefault(); 
				_processInput();
				return false;
				}) );
		$container.prepend('<ul class="cat-list pkg"></ul>');

		//XXX ensure this isn't blocking other stuff needed.
		_this.parents('form').submit( function() {
			_processInput();
		});
		
		_this.keyup(function(e) { 
			if(e.keyCode == 13) { 
				e.stopPropagation(); 
				e.preventDefault(); 
				_processInput();
			} 
		});

		this.getWikiText = function() {
			return _getCats().map( function() { return '[[' + categoryNamespace + ':' + this + ']]'; } )
				 .toArray()
				 .join( "\n" );
		};

		_processInput();
	});
	
	function _processInput() {
		var $input = $container.find( 'input' );
		_insertCat( $input.val().trim() );
		$input.val("");
	}

	function _insertCat( cat ) {
		if ( mw.isEmpty( cat ) || _containsCat( cat ) ) { 
			return; 
		}
		var href = _catLink( cat );
		var $li = $j( '<li class="cat"></li>' );
		$container.find( 'ul' ).append( $li );
		$li.append( '<a class="cat" target="_new" href="' + href + '">' + cat +' </a>' );
		$li.append( $j.fn.removeCtrl( 'mwe-upwiz-category-remove', function() { $li.remove(); } ) );
	}

	function _catLink( cat ) {
		var catLink = 
			encodeURIComponent( categoryNamespace ) 
			+ ':'
			+ encodeURIComponent( mw.ucfirst( cat.replace(/ /g, '_' ) ) );

		// wgServer typically like 'http://commons.prototype.wikimedia.org'	
		// wgArticlePath typically like '/wiki/$1'
		if ( ! ( mw.isEmpty( wgServer ) && mw.isEmpty( wgArticlePath ) ) ) {
			catLink = wgServer + wgArticlePath.replace( /\$1/, catLink );
		}

		return catLink;
	}

	function _getCats() {
		return $container.find('ul li a.cat').map( function() { return $j.trim( this.text ); } );
	}

	function _containsCat( cat ) {
		return _getCats().filter( function() { return this == cat; } ).length !== 0;
	}

	function _fetchSuggestions( query ) {
		var _this = this;
		var request = $j.ajax( {
			url: wgScriptPath + '/api.php',
			data: {
				'action': 'query',
				'list': 'allpages',
				'apnamespace': wgNamespaceIds['category'],
				'apprefix': $j( this ).val(),
				'format': 'json'
			},
			dataType: 'json',
			success: function( data ) {
				// Process data.query.allpages into an array of titles
				var pages = data.query.allpages;
				var titleArr = [];

				$j.each( pages, function( i, page ) {
					var title = page.title.split( ':', 2 )[1];
					titleArr.push( title );
				} );

				$j( _this ).suggestions( 'suggestions', titleArr );
			}
		} );

		$j( _this ).data( 'request', request );
	}

}})(jQuery);
// dependencies: []

if ( typeof window.mw === 'undefined' ) {
	window.mw = {};
}
// dependencies: [ mw ] 

( function( mw, $j ) {

	/**
	* Log a string msg to the console
	* 
	* all mw.log statements will be removed on minification so
	* lots of mw.log calls will not impact performance in non debug mode
	*
	* @param {String} string String to output to console
	*/
	mw.log = function( s, level ) {
	
		if ( typeof level === 'undefined' ) {
			level = 30;
		}

		if ( level > mw.log.level ) {
			return;
		}	
	
		// Add any prepend debug ss if necessary           
		if ( mw.log.preAppendLog ) {
			s = mw.log.preAppendLog + s;
		}

		if ( window.console ) {
			window.console.log( s );
		} else {

			/**
			 * Old IE and non-Firebug debug
			 */
			var log_elm = document.getElementById('mv_js_log');

			if ( ! log_elm ) {
				var body = document.getElementsByTagName("body")[0];
				if (body) {
					body.innerHTML = document.getElementsByTagName("body")[0].innerHTML +
						'<div style="position:absolute;z-index:500;bottom:0px;left:0px;right:0px;height:100px;">'+
						'<textarea id="mv_js_log" cols="120" rows="4"></textarea>'+
						'</div>';
					log_elm = document.getElementById('mv_js_log');
				} else {
					mw.logBuffered += s + "\n";
				}
			}

			if ( log_elm ) {
				if (mw.logBuffered.length) {
					log_elm.value += mw.logBuffered;
					mw.logBuffered = "";
				}
				log_elm.value += s + "\n";
			}

		}
	};

	mw.log.level = mw.log.NONE = 0;
	mw.log.FATAL = 10;
	mw.log.WARN = 20;
	mw.log.INFO = 30;	
	mw.log.ALL = 100;

	mw.log.fatal = function( s ) {
		mw.log( s, mw.log.FATAL );
	};

	mw.log.warn = function( s ) {
		mw.log( s, mw.log.WARN );
	};

	mw.log.info = function( s ) {
		mw.log( s, mw.log.INFO );
	};

	mw.log.level = mw.log.ALL;

	mw.logBuffered = "";

} )( window.mw );

// dependencies: mw 

( function( mw ) {

	/**
	* Check if an object is empty or if its an empty string. 
	*
	* @param {Object} object Object to be checked
	* @return {Boolean}
	*/
	mw.isEmpty = function( obj ) {
		if( typeof obj == 'string' ) {
			if( obj == '' ) return true;
			// Non empty string: 
			return false;
		}

		// If an array check length:
		if( Object.prototype.toString.call( obj ) === "[object Array]"
			&& obj.length == 0 ) {
			return true;
		}

		// Else check as an obj: 
		for( var i in obj ) { return false; }

		// Else obj is empty:
		return true;
	};

	/**
	* Opposite of mw.isEmpty
	*
	* @param {Object} object Object to be checked
	* @return {Boolean}
	*/
	mw.isFull = function( obj ) {
		return ! mw.isEmpty( obj );
	};

	/**
	 * Check if something is defined
	 * (inlineable?)
	 * @param {Object}
	 * @return boolean
	 */
	mw.isDefined = function( obj ) {
		return typeof obj !== 'undefined'; 
	};


	/**
	 * Upper-case the first letter of a string.
	 * @param string
	 * @return string with first letter uppercased.
	 */
	mw.ucfirst = function( s ) {
		return s.substring(0,1).toUpperCase() + s.substr(1);
	};


} )( window.mw );
/**
 * dependencies: [ mw ]
 */
( function( mw ) {

	/**
	 * Given a float number of seconds, returns npt format response. ( ignore
	 * days for now )
	 * 
	 * @param {Float}
	 *            sec Seconds
	 * @param {Boolean}
	 *            show_ms If milliseconds should be displayed.
	 * @return {Float} String npt format
	 */
	mw.seconds2npt = function( sec, show_ms ) {
		if ( isNaN( sec ) ) {
			mw.log("Warning: trying to get npt time on NaN:" + sec);			
			return '0:00:00';
		}
		
		var tm = mw.seconds2Measurements( sec )
				
		// Round the number of seconds to the required number of significant
		// digits
		if ( show_ms ) {
			tm.seconds = Math.round( tm.seconds * 1000 ) / 1000;
		} else {
			tm.seconds = Math.round( tm.seconds );
		}
		if ( tm.seconds < 10 ){
			tm.seconds = '0' +	tm.seconds;
		}
		if( tm.hours == 0 ){
			hoursStr = ''
		} else {
			if ( tm.minutes < 10 )
				tm.minutes = '0' + tm.minutes;
			
			hoursStr = tm.hours + ":"; 
		}
		return hoursStr + tm.minutes + ":" + tm.seconds;
	}

	/**
	 * Given seconds return array with 'days', 'hours', 'min', 'seconds'
	 * 
	 * @param {float}
	 *            sec Seconds to be converted into time measurements
	 */
	mw.seconds2Measurements = function ( sec ){
		var tm = {};
		tm.days = Math.floor( sec / ( 3600 * 24 ) )
		tm.hours = Math.floor( sec / 3600 );
		tm.minutes = Math.floor( ( sec / 60 ) % 60 );
		tm.seconds = sec % 60;
		return tm;
	}

	/**
	 * Take hh:mm:ss,ms or hh:mm:ss.ms input, return the number of seconds
	 * 
	 * @param {String}
	 *            npt_str NPT time string
	 * @return {Float} Number of seconds
	 */
	mw.npt2seconds = function ( npt_str ) {
		if ( !npt_str ) {
			// mw.log('npt2seconds:not valid ntp:'+ntp);
			return false;
		}
		// Strip {npt:}01:02:20 or 32{s} from time if present
		npt_str = npt_str.replace( /npt:|s/g, '' );

		var hour = 0;
		var min = 0;
		var sec = 0;

		times = npt_str.split( ':' );
		if ( times.length == 3 ) {
			sec = times[2];
			min = times[1];
			hour = times[0];
		} else if ( times.length == 2 ) {
			sec = times[1];
			min = times[0];
		} else {
			sec = times[0];
		}
		// Sometimes a comma is used instead of period for ms
		sec = sec.replace( /,\s?/, '.' );
		// Return seconds float
		return parseInt( hour * 3600 ) + parseInt( min * 60 ) + parseFloat( sec );
	}	

} )( window.mw );
/**
 * Library for simple URI parsing and manipulation.  Requires jQuery.
 *
 * Do not expect full RFC 3986 compliance. Intended to be minimal, but featureful.
 * The use cases we have in mind are constructing 'next page' or 'previous page' URLs, 
 * detecting whether we need to use cross-domain proxies for an API, constructing simple 
 * URL-based API calls, etc.
 *
 * Intended to compress very well if you use a JS-parsing minifier.
 *
 * Dependencies: mw, mw.Utilities, jQuery
 *
 * Example:
 *
 *     var uri = new mw.Uri( 'http://foo.com/mysite/mypage.php?quux=2' );
 *
 *     if ( uri.host == 'foo.com' ) {
 *	   uri.host = 'www.foo.com';
 *         uri.extend( { bar: 1 } );
 *
 *         $( 'a#id1' ).setAttr( 'href', uri );
 *         // anchor with id 'id1' now links to http://www.foo.com/mysite/mypage.php?bar=1&quux=2
 *
 *         $( 'a#id2' ).setAttr( 'href', uri.clone().extend( { bar: 3, pif: 'paf' } ) );
 *         // anchor with id 'id2' now links to http://www.foo.com/mysite/mypage.php?bar=3&quux=2&pif=paf
 *     }
 * 
 * Parsing here is regex based, so may not work on all URIs, but is good enough for most.
 *
 * Given a URI like
 * 'http://usr:pwd@www.test.com:81/dir/dir.2/index.htm?q1=0&&test1&test2=value+%28escaped%29#top':
 * The returned object will have the following properties:
 *    
 *    protocol          'http'
 *    user        	'usr'
 *    password          'pwd'
 *    host        	'www.test.com'
 *    port        	'81'
 *    path        	'/dir/dir.2/index.htm'
 *    query        	{ q1: 0, test1: '', test2: 'value (escaped)' }
 *    fragment          'top'
 *    
 * n.b. 'password' is not technically allowed for HTTP URIs, but it is possible with other sorts of URIs.
 *
 * You can modify the properties directly. Then use the toString() method to extract the full URI string again.
 *
 * parsing based on parseUri 1.2.2 (c) Steven Levithan <stevenlevithan.com> MIT License
 * http://stevenlevithan.com/demo/parseuri/js/
 *
 */

( function( mw, $ ) {
	/** 
 	 * Constructs URI object. Throws error if arguments are illegal/impossible, or otherwise don't parse.
	 * @constructor
	 * @param {!Object|Location|String} URI string, or a Location object (obtained from window.location in some browsers) or an Object with appropriate properties (especially another URI object to clone). Object must have non-blank 'protocol', 'host', and 'path' properties.
	 * @param {Boolean} strict mode (when parsing a string)
	 */ 
	mw.Uri = function( uri, strictMode ) {
		strictMode = !!strictMode;
		if ( mw.isFull( uri ) ) { 
			if ( typeof uri === 'string' ) { 
				this._parse( uri, strictMode );
			} else if ( uri instanceof Location ) {
				this._parse( uri.href, strictMode ); 
			} else if ( typeof uri === 'object' ) {
				var _this = this;
				$.each( this._properties, function( i, property ) {
					_this[property] = uri[property];
				} );
				if ( ! mw.isDefined( this.query ) ) {
					this.query = {};
				}
			}
		}
		if ( !( this.protocol && this.host && this.path ) ) {
			throw new Error( "bad constructor arguments" );
		}
	};

	mw.Uri.prototype = {

		/** 
		 * Standard encodeURIComponent, with extra stuff to make all browsers work similarly and more compliant with RFC 3986
		 * @param {String} string
		 * @return {String} encoded for URI
		 */
		encode: function( component ) {
			return encodeURIComponent( component )
				.replace( /!/g, '%21')
				.replace( /'/g, '%27')
				.replace( /\(/g, '%28')
				.replace( /\)/g, '%29')
				.replace( /\*/g, '%2A')
				.replace( /%20/g, '+' );
		},

		/** 
		 * Standard decodeURIComponent, with '+' to space
		 * @param {String} string encoded for URI
		 * @return {String} decoded string
		 */ 
		decode: function( component ) { 
			return decodeURIComponent( component ).replace( /\+/g, ' ' );
		},

		// regular expressions to parse many common URIs.
		// @private
		_parser: {
			strict: /^(?:([^:\/?#]+):)?(?:\/\/(?:(?:([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)?((?:[^?#\/]*\/)*[^?#]*)(?:\?([^#]*))?(?:#(.*))?/,
			loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?(?:(?:([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?((?:\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?[^?#\/]*)(?:\?([^#]*))?(?:#(.*))?/
		},

		/* the order here matches the order of captured matches in the above parser regexes */
		// @private
		_properties: [
			"protocol",  // http  
			"user",      // usr 
			"password",  // pwd 
			"host",      // www.test.com 
			"port",      // 81 
			"path",      // /dir/dir.2/index.htm 
			"query",     // q1=0&&test1&test2=value (will become { q1: 0, test1: '', test2: 'value' } )
			"fragment"   // top
		],

		/**
		 * Parse a string and set our properties accordingly. 
		 * @param {String} URI
		 * @param {Boolean} strictness
		 * @return {Boolean} success
		 */
		_parse: function( str, strictMode ) {
			var matches = this._parser[ strictMode ? "strict" : "loose" ].exec( str );
			var uri = this;
			$.each( uri._properties, function( i, property ) {
				uri[ property ] = matches[ i+1 ];
			} );

			// uri.query starts out as the query string; we will parse it into key-val pairs then make
			// that object the "query" property.
			// we overwrite query in uri way to make cloning easier, it can use the same list of properties.	
			var query = {};
			// using replace to iterate over a string
			// JS 1.3 - function as parameter to replace 
			// Note: uri does not work with repeated parameter names (e.g. foo=1&foo=2 )
			if ( uri.query ) { 
				uri.query.replace( /(?:^|&)([^&=]*)=?([^&]*)/g, function ($0, $1, $2) {
					if ( $1 ) { 
						query[ uri.decode( $1 ) ] = uri.decode( $2 );
					}
				} );
			}
			this.query = query;
		},

		/**
		 * Returns user and password portion of a URI. 
		 * @return {String} 
		 */
		getUserInfo: function() {
			var userInfo = '';
			if ( mw.isFull( this.user ) ) { 
				userInfo += this.encode( this.user );
				if ( mw.isFull( this.password ) ) {
					userInfo += ':' + this.encode( this.password ); 
				}
			}
			return userInfo;
		},

		/**
		 * Gets host and port portion of a URI. 
		 * @return {String}
		 */
		getHostPort: function() {
			return   this.host
			       + ( mw.isFull( this.port ) ? ':' + this.port 
							  : '' 
				 );
		},

		/**
		 * Returns the userInfo and host and port portion of the URI. 
		 * In most real-world URLs, this is simply the hostname, but it is more general. 
		 * @return {String}
		 */
		getAuthority: function() {
			var userInfo = this.getUserInfo();
			return   ( mw.isFull( userInfo ) ? userInfo + '@' 
						       : '' 			
				 )
			       + this.getHostPort();
		},

		/**
		 * Returns the query arguments of the URL, encoded into a string
		 * Does not preserve the order of arguments passed into the URI. Does handle escaping.
		 * @return {String}
		 */
		getQueryString: function() {
			var pairs = [];
			var _this = this;
			$.each( this.query, function( key, value ) {
				pairs.push( _this.encode( key ) + '=' + _this.encode( value )  );
			} );
			return pairs.join( '&' );
		},

		/**
		 * Returns everything after the authority section of the URI
		 * @return {String}
		 */
		getRelativePath: function() {
			var queryString = this.getQueryString();
			return this.path
			       + ( mw.isFull( queryString ) ? '?' + queryString 
							    : '' 			
				 ) 
			       + ( mw.isFull( this.fragment ) ? '#' + this.encode( this.fragment )
							      : '' 			
				 );
		},

		/** 
		 * Gets the entire URI string. May not be precisely the same as input due to order of query arguments.
		 * @return {String} the URI string
		 */
		toString: function() {
			return this.protocol + '://' + this.getAuthority() + this.getRelativePath();
		},

		/**
		 * Clone this URI
		 * @return {Object} new URI object with same properties
		 */
		clone: function() {
			return new mw.Uri( this );
		},

		/**
		 * Extend the query -- supply query parameters to override or add to ours
		 * @param {Object} query parameters in key-val form to override or add
		 * @return {Object} this URI object
		 */
		extend: function( parameters ) {
 			$.extend( this.query, parameters );
			return this;
		}
	};

} )( window.mw, jQuery );
/* mw.Api objects represent the API of a particular MediaWiki server. */	

// dependencies: [ mw ]

( function( mw, $j ) {
	
	/**
	 * Represents the API of a particular MediaWiki server.
	 *
	 * Required options: 
	 *   url - complete URL to API endpoint. Usually equivalent to wgServer + wgScriptPath + '/api.php'
	 *
	 * Other options:
	 *   can override the parameter defaults and ajax default options.
	 *	XXX document!
	 *  
	 * ajax options can also be overriden on every get() or post()
	 * 
	 * @param options {Mixed} can take many options, but must include at minimum the API url.
	 */
	mw.Api = function( options ) {

		// make sure we at least have a URL endpoint for the API
		if ( ! mw.isDefined( options.url ) ) {
			throw new Error( 'Configuration error - needs url property' );
		};

		this.url = options.url;

		var _this = this;
	
		/* We allow people to omit these default parameters from API requests */
		// there is very customizable error handling here, on a per-call basis
		// wondering, would it be simpler to make it easy to clone the api object, change error handling, and use that instead?
		this.defaults = {
			parameters: {
				action: 'query',
				format: 'json'
			},

			ajax: {
				// force toString if we got a mw.Uri object
				url: new String( this.url ),  

				/* default function for success and no API error */
				ok: function() {},

				// caller can supply handlers for http transport error or api errors
				err: function( code, result ) {
					var errorMsg = "mw.Api error: " + code;
					mw.log( errorMsg );
				},

				timeout: 30000, /* 30 seconds */

				dataType: 'json'

			}
		};


		if ( options.parameters ) {
			$j.extend( this.defaults.parameters, options.parameters );
		}

		if ( options.ajax ) { 
			$j.extend( this.defaults.ajax, options.ajax );
		}
	};

	mw.Api.prototype = {

		/**
		 * For api queries, in simple cases the caller just passes a success callback.
		 * In complex cases they pass an object with a success property as callback and probably other options.
		 * Normalize the argument so that it's always the latter case.
		 * 
		 * @param {Object|Function} ajax properties, or just a success function
		 * @return Function
		 */
		normalizeAjaxOptions: function( arg ) {
			if ( typeof arg === 'function' ) {
				var ok = arg;
				arg = { 'ok': ok };
			}
			if (! arg.ok ) {
				throw Error( "ajax options must include ok callback" );
			}
			return arg;
		},

		/**
		 * Perform API get request
		 *
		 * @param {Object} request parameters 
		 * @param {Object|Function} ajax properties, or just a success function
		 */	
		get: function( parameters, ajaxOptions ) {
			ajaxOptions = this.normalizeAjaxOptions( ajaxOptions );
			ajaxOptions.type = 'GET';
			this.ajax( parameters, ajaxOptions );
		},

		/**
		 * Perform API post request
		 * TODO post actions for nonlocal will need proxy 
		 * 
		 * @param {Object} request parameters 
		 * @param {Object|Function} ajax properties, or just a success function
		 */
		post: function( parameters, ajaxOptions ) {
			ajaxOptions = this.normalizeAjaxOptions( ajaxOptions );
			ajaxOptions.type = 'POST';
			this.ajax( parameters, ajaxOptions );
		},

		/**
		 * Perform the API call. 
		 * 
		 * @param {Object} request parameters 
		 * @param {Object} ajax properties
		 */
		ajax: function( parameters, ajaxOptions ) {
			parameters = $j.extend( {}, this.defaults.parameters, parameters );
			ajaxOptions = $j.extend( {}, this.defaults.ajax, ajaxOptions );
			ajaxOptions.data = parameters;
		
			ajaxOptions.error = function( xhr, textStatus, exception ) {
				ajaxOptions.err( 'http-' + textStatus, { xhr: xhr, exception: exception } );
			};

			/* success just means 200 OK; also check for output and API errors */
			ajaxOptions.success = function( result ) {
				if ( mw.isEmpty( result ) ) {
					ajaxOptions.err( "empty", "OK response but empty result (check HTTP headers?)" );
				} else if ( result.error ) {
					var code = mw.isDefined( result.error.code ) ? result.error.code : "unknown";
					ajaxOptions.err( code, result );
				} else { 
					ajaxOptions.ok( result );
				}
			};

			$j.ajax( ajaxOptions );

		},

	}

}) ( window.mw, jQuery );
// library to assist with edits

// dependencies: [ mw.Api, jQuery ]
	
( function( mw, $ ) {

	// cached token so we don't have to keep fetching new ones for every single post
	var cachedToken = null;

	$.extend( mw.Api.prototype, { 

		/* Post to API with edit token. If we have no token, get one and try to post.
	 	 * If we have a cached token try using that, and if it fails, blank out the
	 	 * cached token and start over.
		 * 
	 	 * @param params API parameters
		 * @param ok callback for success
		 * @param err (optional) error callback
		 */
		postWithEditToken: function( params, ok, err ) {
			var api = this;
			mw.log( 'post with edit token' );
			if ( cachedToken === null ) {
				mw.log( 'no cached token' );
				// We don't have a valid cached token, so get a fresh one and try posting.
				// We do not trap any 'badtoken' or 'notoken' errors, because we don't want
				// an infinite loop. If this fresh token is bad, something else is very wrong.
				var useTokenToPost = function( token ) {
					mw.log( 'posting with token = ' + token );
					params.token = token; 
					this.post( params, ok, err );
				};
				mw.log( 'getting edit token' );
				api.getEditToken( useTokenToPost, err );
			} else {
				// We do have a token, but it might be expired. So if it is 'bad' then
				// start over with a new token.
				params.token = cachedToken;
				mw.log( 'we do have a token = ' + params.token );
				var getTokenIfBad = function( code, result ) {
					mw.log( "error with posting with token!" );
					if ( code === 'badtoken' )  {
						mw.log( "bad token; try again" );
						cachedToken = null; // force a new token
						api.postWidthEditToken( params, ok, err );
					} else {
						err( code, result );
					}
				};
				mw.log ( "posting with the token that was cached " );
				api.post( params, ok, getTokenIfBad );
			}
		},
	
		/**
		 * Api helper to grab an edit token
	 	 *
		 * token callback has signature ( String token )
		 * error callback has signature ( String code, Object results, XmlHttpRequest xhr, Exception exception )
	 	 * Note that xhr and exception are only available for 'http_*' errors
		 *  code may be any http_* error code (see mw.Api), or 'token_missing'
		 *
		 * @param {Function} received token callback
		 * @param {Function} error callback
		 */
		getEditToken: function( tokenCallback, err ) {
			
			var parameters = {			
				'prop': 'info',
				'intoken': 'edit',
				/* we need some kind of dummy page to get a token from. This will return a response 
				   complaining that the page is missing, but we should also get an edit token */
				'titles': 'DummyPageForEditToken'
			};

			var ok = function( data ) {
				var token;
				$.each( data.query.pages, function( i, page ) {
					if ( page['edittoken'] ) {
						token = page['edittoken'];
						return false;
					}
				} );
				if ( mw.isDefined( token ) ) {
					cachedToken = token;
					tokenCallback( token );
				} else {
					err( 'token-missing', data );
				}
			};

			var ajaxOptions = { 'ok': ok, 'err': err };

			this.get( parameters, ajaxOptions );
		}

		
		
	} );

}) ( window.mw, jQuery );
/**
 * Represents a "title", or some piece of content, tracked by MediaWiki.
 * There are numerous ways of representing the title, so this bundles them all together so you
 * don't have to write conversion functions between human-readable version, api version, local filename...
 *
 * Let's learn how MediaWiki thinks of all this (see Title.php).
 *
 * MEDIAWIKI'S TERMINOLOGY
 * 'text' form means that underscores are changed to spaces. human-readable.
 *
 * Title = PrefixedDb "User_talk:Foo_bar.jpg"   
 *         PrefixedText = "User talk:Foo bar.jpg"
 *   - Prefix = "User_talk"  (also called namespace, this is a controlled list of namespaces (see wg* globals))
 *   - Main = "Foo_bar.jpg"  
 *   - MainText = "Foo bar.jpg"
 *      - Name = "Foo_bar"
 *      - NameText = "Foo bar"
 *      - Extension "jpg"
 *
 * n.b. this class does not handle URI-escaping
 *
 * n.b. this class relies on the existence of two globals:
 *   wgFormattedNamespaces - array of id numbers (as strings) to localized namespace names
 *   wgNamespaceIds - abstract namespace names to integer ids
 */

/** 
 * Constructor
 */
( function( $j ) { mw.Title = function( title, namespace ) {
	// integer namespace id
	var ns = 0;

	// should be '' if ns == 0, or namespace name plus ':' 
	var prefix = '';

	// name in canonical 'database' form
	var name = null;

	// extension
	var ext = null;

	/** 
	 * strip every illegal char we can think of
	 * yes, I know this leaves other insanity intact, like unicode bidi chars, but let's start someplace
	 * @return {String}
	 */
	function clean( s ) {
		if ( mw.isDefined( s ) ) {
			return s.replace( /[\x00-\x1f\s]+/g, '_' );
		}
	}

	/**
	 * Convenience method: return string like ".jpg", or "" if no extension
	 * @return {String}
	 */
	function getDotExtension() {
		return ext ? '.' + ext : '';
	}

	function text( s ) {
		return s.replace( /_/g, ' ' );
	}

	/** 
	 * Get in prefixed DB form = File:Foo_bar.jpg
	 * most useful for API calls, anything that must id the "title"
	 */
	this.toString = this.getPrefixedDb = function() {
		return prefix + this.getMain();
	};

	/**
	 * Get in a form similar to how it's displayed in heading on MediaWiki: "File:Foo bar.jpg"
	 * @return {String}
	 */
	this.toText = this.getPrefixedText = function() {
		return text( this.toString() );
	};

	/**
	 * The file without namespace, "Foo_bar.jpg" 
	 * @return {String}
	 */
	this.getMain = function() {
		return name + getDotExtension();
	};

	/**
	 * The "text" form "Foo bar.jpg" 
	 * @return {String}
	 */
	this.getMainText = function() {
		return text( this.getMain() );
	};

	/**
	 * the name, as "Foo bar"
	 * @return {String}
	 */
	this.getNameText = function() {
		return text( name );
	};
	
	/**
	 * Set the "name" portion, removing illegal characters and canonicalizing with first character uppercased.
	 * @param {String} s: name
	 * @return {mw.Title} this
	 */
	this.setName = function( s ) {
		name = mw.ucfirst( $j.trim( clean ( s ) ) );
		return this;
	};

	/**
	 * Set the name portion from human readable text, e.g. "foo bar" -> "Foo_bar"
	 * @param {String} s: name
	 * @return {mw.Title} this
	 */
	this.setNameText = function( s ) { 
		name = mw.ucfirst( $j.trim( clean ( s ) ) ).replace( / /g, '_' );
		return this;
	}

	/**
	 * Set namespace by canonical namespace id (integer)
	 * This global is an object of string key-vals, so we make sure to look up "-2" not -2
	 * @param id 
	 * @return {mw.Title} this
	 */	
	this.setNamespaceById = function( id ) {
		ns = id;
		prefix = wgFormattedNamespaces[ "" + id ].replace( / /g, '_' ) + ':';
		return this;
	};

	/**
	 * Set namespace by canonical name like 'file';
	 * @param namespace name
	 * @return {mw.Title} this
	 */	
	this.setNamespace = function( s ) { 
		if ( !mw.isDefined( wgNamespaceIds[ s ] ) ) { 
			throw new Error( 'unrecognized namespace: ' + s );
		}
		return this.setNamespaceById( wgNamespaceIds[ s ] );
	};

	/**
	 * Given a localized prefix like "File" set the namespace id
	 * Note that for most wikis, "" is a valid prefix, will set namespace to 0
	 * @param localized namespace name
	 * @return {mw.Title} this
	 */
	this.setPrefix = function( s ) {
		var found = false;
		var _this = this;
		$j.each( wgFormattedNamespaces, function( k, v ) {
			if ( s === v ) {
				found = true;
				_this.setNamespaceById( parseInt( k, 10 ) );
				return false;
			} 	
		} );
		if ( !found ) { 
			throw new Error( "unrecognized prefix" );
		}
		return this;
	};

	/**
	 * Set the "extension" portion, removing illegal characters
	 * @param {String} s: name
	 * @return {mw.Title} this
	 */
	this.setExtension = function(s) {
		ext = clean( s.toLowerCase() );
		return this;
	};


	/**
	 * Get the extension (returns null if there was none)
	 * @return {String|null} extension
	 */
	this.getExtension = function() {
		return ext;
	}


	// initialization
	var matches = title.match( /^(?:([^:]+):)?(.*?)(?:\.(\w{1,5}))?$/ );
	if ( matches.length ) {
		matches[1] && this.setPrefix( matches[1] );
		matches[2] && this.setName( matches[2] );
		matches[3] && this.setExtension( matches[3] );
	} else {
		throw new Error( "couldn't parse title '" + title + "'" );
	}

	if ( mw.isDefined( namespace ) ) {
		this.setNamespace( namespace );
	}

}; } )( jQuery );

/**
* Core Language mw.Language object
*
* Localized Language support attempts to mirror some of the functionality of Language.php in MediaWiki
* It contains methods for loading and transforming msg text
* borrowed from mwEmbed, although not quite the same going forward.
*/


// Setup swap string constants
// this is borrowed from mw.Parser.js
var JQUERY_SWAP_STRING = 'ZjQuerySwapZ';	
	

( function( mw ) {

	// Setup the global mw.Language var: 
	mw.Language = { };
	
	/**
	* Setup the lang object
	*/
	var messageCache = { };
	var gRuleSet = { };

	/**
	* mw.addMessages function
	* Loads a set of json messages into the messageCache object.
	*
	* @param {JSON} msgSet The set of msgs to be loaded
	*/
	mw.addMessages = function( msgSet ) {
		for ( var i in msgSet ) {
			messageCache[ i ] = msgSet[i];
		}
	}
	
	/**
	 * Returns a transformed msg string
	 *
	 * it take a msg key and array of replacement values of form
	 * $1, $2 and does relevant messageKey transformation returning
	 * the user msg.
	 *
	 * @param {String} messageKey The msg key as set by mw.addMessages
	 * @param {Mixed} args  A string|jQuery Object or array of string|jQuery Objects
	 *
	 * extra parameters are appended to the args array as numbered replacements
	 *
	 * @return string
	 */
	mw.getMsg = function( messageKey , args ) {		

		// Check for missing message key
		if ( ! messageCache[ messageKey ] ) {
			// Try the ResourceLoader's message store
			// FIXME: The two message stores should be unified in the future
			var rlMsg = mediaWiki.msg( messageKey );
			if ( rlMsg == ( '<' + messageKey + '>' ) ) {
				return '[' + messageKey + ']';
			}
			messageCache[ messageKey ] = rlMsg;
		}				
		// Check if we need to do args replacements: 
		if( typeof args != 'undefined' ) {
			
			// Make arg into an array if its not already an array
			if ( typeof args == 'string'
				|| typeof args == 'number'
				|| args instanceof jQuery ) 
			{
				args = [ args ];
			}
			
			// Put any extra arguments into the args array
			var extraArgs = $j.makeArray( arguments );
			for(var i=2; i < extraArgs.length; i ++ ) {		
				args.push(  extraArgs[ i ] );
			}
		}
		// Fast check message text return  ( no arguments and no parsing needed )
		if( ( !args || args.length == 0 ) 
			&& messageCache[ messageKey ].indexOf( '{{' ) === -1 
			&& messageCache[ messageKey ].indexOf( '[' ) === -1 
		) {
			return messageCache[ messageKey ];
		}
		
		// Else Setup the messageSwap object: 
		var messageSwap = new mw.Language.messageSwapObject( messageCache[ messageKey ], args );
		
		// Return the jQuery object or message string		
		return messageSwap.getMsg();					
	}
	
	/**
	* A message Swap Object 
	* Swap object manages message type swapping and returns jQuery or text output   
	*
	* @param {String} message The text of the message
	* @param {array} arguments A set of swap arguments
	*/ 
	
	mw.Language.messageSwapObject = function( message, arguments ){
		this.init( message, arguments );
	}	
	
	mw.Language.messageSwapObject.prototype= {		
		/* constructor */
		init: function( message, arguments ){
			this.message = message;
			this.arguments = arguments; 
			
			// Set the includesjQueryArgs flag to false
			includesjQueryArgs: false;
		},
		
		// Return the transformed message text or jQuery object
		getMsg: function(){					
			// Get message with string swap
			this.replaceStringArgs();
			
			// Check if we need to parse the string
			if( this.message.indexOf( '{{' ) === -1 			
				&& this.message.indexOf( '[' ) === -1
				&& ! this.includesjQueryArgs  )
			{
				// replaceStringArgs is all we need, return the msg 
				return this.message	
			}
						
			// Else Send the messageText through the parser
			var pObj = new mw.Parser( this.message );
			
			// Get template and link transformed text:
			this.message = pObj.getHTML();
			
			// if jQuery arguments is false return message string
			if(! this.includesjQueryArgs ){													
				//Do string link substitution				
				return this.message;
			}
			
			// jQuery arguments exist swap and return jQuery object
			return this.getJQueryArgsReplace();
						
		},
		
		/**
		* Swap in an array of values for $1, $2, $n for a given msg key 
		*
		* @param string messageKey The msg key to lookup
		* @param {Array} args  An array of string or jQuery objects to be swapped in
		* @return string
		*/
		replaceStringArgs : function() {
			if( ! this.arguments ) { 
				return ;			
			}	
			// Replace Values
			for ( var v = 0; v < this.arguments.length; v++ ) {				
				if( typeof this.arguments[v] == 'undefined' ) {
					continue;
				}				
				var replaceValue =  this.arguments[ v ];
				
				// Convert number if applicable
				if( parseInt( replaceValue ) == replaceValue ) {
					replaceValue = mw.Language.convertNumber( replaceValue );
				}
				
				// Message test replace arguments start at 1 instead of zero:
				var argumentRegExp = new RegExp( '\\$' + ( parseInt( v ) + 1 ), 'g' );
												
				// Check if we got passed in a jQuery object:			
				if( replaceValue instanceof jQuery) {
					// Set the jQuery msg flag
					this.includesjQueryArgs = true;
					// Swap in a jQuery span place holder: 		
					this.message = this.message.replace( argumentRegExp, 
						'<span id="' + JQUERY_SWAP_STRING + v +'"></span>' );											
				} else {
					// Assume replaceValue is a string
					this.message = this.message.replace( argumentRegExp, replaceValue );
				}
			}
		},
			
		/**
		* Return a jquery element with resolved swapped arguments. 
		* return {Element} 
		*/
		getJQueryArgsReplace: function() {
			var $jQueryMessage = false;
			mw.log( 'msgReplaceJQueryArgs' );
			for ( var v = 0; v < this.arguments.length; v++ ) {				
				if( typeof this.arguments[v] == 'undefined' ) {
					continue;
				}				
				var $replaceValue =  this.arguments[ v ];
				// Only look for jQuery replacements
				if( $replaceValue instanceof jQuery) {
					// Setup the jqueryMessage if not set
					if( !$jQueryMessage ){
						// Setup the message as html to search for jquery swap points
						$jQueryMessage = $j( '<span />' ).html( this.message );
					}
					mw.log(" current jQueryMessage::: " + $jQueryMessage.html() );
					// Find swap target
					var $swapTarget = $jQueryMessage.find( '#' + JQUERY_SWAP_STRING + v );
					// Now we try and find the jQuerySwap points and replace with jQuery object preserving bindings.  
					if( ! $swapTarget.length ){
						mw.log( "Error could not find jQuery Swap target: " + v + ' by id: '+ JQUERY_SWAP_STRING + v 
						 + ' In string: ' + this.message  ) ;
						continue;
					} 
					
					if( $swapTarget.html() != '' ) {
						$replaceValue.html( $swapTarget.html() );
					}
										
					// Swap for $swapTarget for $replaceValue swap target * preserveing the jQuery binding ) 
					$swapTarget.replaceWith( $replaceValue );					
				}
			}
			// Return the jQuery object ( if no jQuery substitution occurred we return false )
			return $jQueryMessage;
		}
	}
	
	/**
	* Get msg content without transformation
	*
	* @returns string The msg key without transforming it
	*/
	mw.Language.msgNoTrans = function( key ) {
		if ( messageCache[ key ] )
			return messageCache[ key ]

		// Missing key placeholder
		return '&lt;' + key + '&gt;';
	}
	
	/**
	* Add Supported Magic Words to parser
	*/
	// Set the setupflag to false:
	mw.Language.doneSetup = false;
	mw.Language.magicSetup = function() {
		if ( !mw.Language.doneSetup ) {
			mw.addTemplateTransform ( {
				'PLURAL' : mw.Language.procPLURAL,
				'GENDER' : mw.Language.procGENDER
			} )

			mw.Language.doneSetup = true;
		}

	}
	
	/**
	 * List of all languages mediaWiki supports ( Avoid an api call to get this same info )
	 * http://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&siprop=languages&format=jsonfm
	 */
	mw.Language.names = {
		"aa" : "Qaf\u00e1r af",
		"ab" : "\u0410\u04a7\u0441\u0443\u0430",
		"ace" : "Ac\u00e8h",
		"af" : "Afrikaans",
		"ak" : "Akan",
		"aln" : "Geg\u00eb",
		"als" : "Alemannisch",
		"am" : "\u12a0\u121b\u122d\u129b",
		"an" : "Aragon\u00e9s",
		"ang" : "Anglo-Saxon",
		"ar" : "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
		"arc" : "\u0710\u072a\u0721\u071d\u0710",
		"arn" : "Mapudungun",
		"arz" : "\u0645\u0635\u0631\u0649",
		"as" : "\u0985\u09b8\u09ae\u09c0\u09af\u09bc\u09be",
		"ast" : "Asturianu",
		"av" : "\u0410\u0432\u0430\u0440",
		"avk" : "Kotava",
		"ay" : "Aymar aru",
		"az" : "Az\u0259rbaycan",
		"ba" : "\u0411\u0430\u0448\u04a1\u043e\u0440\u0442",
		"bar" : "Boarisch",
		"bat-smg" : "\u017demait\u0117\u0161ka",
		"bcc" : "\u0628\u0644\u0648\u0686\u06cc \u0645\u06a9\u0631\u0627\u0646\u06cc",
		"bcl" : "Bikol Central",
		"be" : "\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f",
		"be-tarask" : "\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f (\u0442\u0430\u0440\u0430\u0448\u043a\u0435\u0432\u0456\u0446\u0430)",
		"be-x-old" : "\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f (\u0442\u0430\u0440\u0430\u0448\u043a\u0435\u0432\u0456\u0446\u0430)",
		"bg" : "\u0411\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438",
		"bh" : "\u092d\u094b\u091c\u092a\u0941\u0930\u0940",
		"bi" : "Bislama",
		"bm" : "Bamanankan",
		"bn" : "\u09ac\u09be\u0982\u09b2\u09be",
		"bo" : "\u0f56\u0f7c\u0f51\u0f0b\u0f61\u0f72\u0f42",
		"bpy" : "\u0987\u09ae\u09be\u09b0 \u09a0\u09be\u09b0\/\u09ac\u09bf\u09b7\u09cd\u09a3\u09c1\u09aa\u09cd\u09b0\u09bf\u09af\u09bc\u09be \u09ae\u09a3\u09bf\u09aa\u09c1\u09b0\u09c0",
		"bqi" : "\u0628\u062e\u062a\u064a\u0627\u0631\u064a",
		"br" : "Brezhoneg",
		"bs" : "Bosanski",
		"bug" : "\u1a05\u1a14 \u1a15\u1a18\u1a01\u1a17",
		"bxr" : "\u0411\u0443\u0440\u044f\u0430\u0434",
		"ca" : "Catal\u00e0",
		"cbk-zam" : "Chavacano de Zamboanga",
		"cdo" : "M\u00ecng-d\u0115\u0324ng-ng\u1e73\u0304",
		"ce" : "\u041d\u043e\u0445\u0447\u0438\u0439\u043d",
		"ceb" : "Cebuano",
		"ch" : "Chamoru",
		"cho" : "Choctaw",
		"chr" : "\u13e3\u13b3\u13a9",
		"chy" : "Tsets\u00eahest\u00e2hese",
		"ckb" : "Soran\u00ee \/ \u06a9\u0648\u0631\u062f\u06cc",
		"ckb-latn" : "\u202aSoran\u00ee (lat\u00een\u00ee)\u202c",
		"ckb-arab" : "\u202b\u06a9\u0648\u0631\u062f\u06cc (\u0639\u06d5\u0631\u06d5\u0628\u06cc)\u202c",
		"co" : "Corsu",
		"cr" : "N\u0113hiyaw\u0113win \/ \u14c0\u1426\u1403\u152d\u140d\u140f\u1423",
		"crh" : "Q\u0131r\u0131mtatarca",
		"crh-latn" : "\u202aQ\u0131r\u0131mtatarca (Latin)\u202c",
		"crh-cyrl" : "\u202a\u041a\u044a\u044b\u0440\u044b\u043c\u0442\u0430\u0442\u0430\u0440\u0434\u0436\u0430 (\u041a\u0438\u0440\u0438\u043b\u043b)\u202c",
		"cs" : "\u010cesky",
		"csb" : "Kasz\u00ebbsczi",
		"cu" : "\u0421\u043b\u043e\u0432\u0463\u0301\u043d\u044c\u0441\u043a\u044a \/ \u2c14\u2c0e\u2c11\u2c02\u2c21\u2c10\u2c20\u2c14\u2c0d\u2c1f",
		"cv" : "\u0427\u04d1\u0432\u0430\u0448\u043b\u0430",
		"cy" : "Cymraeg",
		"da" : "Dansk",
		"de" : "Deutsch",
		"de-at" : "\u00d6sterreichisches Deutsch",
		"de-ch" : "Schweizer Hochdeutsch",
		"de-formal" : "Deutsch (Sie-Form)",
		"diq" : "Zazaki",
		"dk" : "Dansk (deprecated:da)",
		"dsb" : "Dolnoserbski",
		"dv" : "\u078b\u07a8\u0788\u07ac\u0780\u07a8\u0784\u07a6\u0790\u07b0",
		"dz" : "\u0f47\u0f7c\u0f44\u0f0b\u0f41",
		"ee" : "E\u028begbe",
		"el" : "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac",
		"eml" : "Emili\u00e0n e rumagn\u00f2l",
		"en" : "English",
		"en-gb" : "British English",
		"eo" : "Esperanto",
		"es" : "Espa\u00f1ol",
		"et" : "Eesti",
		"eu" : "Euskara",
		"ext" : "Estreme\u00f1u",
		"fa" : "\u0641\u0627\u0631\u0633\u06cc",
		"ff" : "Fulfulde",
		"fi" : "Suomi",
		"fiu-vro" : "V\u00f5ro",
		"fj" : "Na Vosa Vakaviti",
		"fo" : "F\u00f8royskt",
		"fr" : "Fran\u00e7ais",
		"frc" : "Fran\u00e7ais cadien",
		"frp" : "Arpetan",
		"fur" : "Furlan",
		"fy" : "Frysk",
		"ga" : "Gaeilge",
		"gag" : "Gagauz",
		"gan" : "\u8d1b\u8a9e",
		"gan-hans" : "\u8d63\u8bed(\u7b80\u4f53)",
		"gan-hant" : "\u8d1b\u8a9e(\u7e41\u9ad4)",
		"gd" : "G\u00e0idhlig",
		"gl" : "Galego",
		"glk" : "\u06af\u06cc\u0644\u06a9\u06cc",
		"gn" : "Ava\u00f1e'\u1ebd",
		"got" : "\ud800\udf32\ud800\udf3f\ud800\udf44\ud800\udf39\ud800\udf43\ud800\udf3a",
		"grc" : "\u1f08\u03c1\u03c7\u03b1\u03af\u03b1 \u1f11\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u1f74",
		"gsw" : "Alemannisch",
		"gu" : "\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0",
		"gv" : "Gaelg",
		"ha" : "\u0647\u064e\u0648\u064f\u0633\u064e",
		"hak" : "Hak-k\u00e2-fa",
		"haw" : "Hawai`i",
		"he" : "\u05e2\u05d1\u05e8\u05d9\u05ea",
		"hi" : "\u0939\u093f\u0928\u094d\u0926\u0940",
		"hif" : "Fiji Hindi",
		"hif-deva" : "\u092b\u093c\u0940\u091c\u0940 \u0939\u093f\u0928\u094d\u0926\u0940",
		"hif-latn" : "Fiji Hindi",
		"hil" : "Ilonggo",
		"ho" : "Hiri Motu",
		"hr" : "Hrvatski",
		"hsb" : "Hornjoserbsce",
		"ht" : "Krey\u00f2l ayisyen",
		"hu" : "Magyar",
		"hy" : "\u0540\u0561\u0575\u0565\u0580\u0565\u0576",
		"hz" : "Otsiherero",
		"ia" : "Interlingua",
		"id" : "Bahasa Indonesia",
		"ie" : "Interlingue",
		"ig" : "Igbo",
		"ii" : "\ua187\ua259",
		"ik" : "I\u00f1upiak",
		"ike-cans" : "\u1403\u14c4\u1483\u144e\u1450\u1466",
		"ike-latn" : "inuktitut",
		"ilo" : "Ilokano",
		"inh" : "\u0413\u0406\u0430\u043b\u0433\u0406\u0430\u0439 \u011eal\u011faj",
		"io" : "Ido",
		"is" : "\u00cdslenska",
		"it" : "Italiano",
		"iu" : "\u1403\u14c4\u1483\u144e\u1450\u1466\/inuktitut",
		"ja" : "\u65e5\u672c\u8a9e",
		"jbo" : "Lojban",
		"jut" : "Jysk",
		"jv" : "Basa Jawa",
		"ka" : "\u10e5\u10d0\u10e0\u10d7\u10e3\u10da\u10d8",
		"kaa" : "Qaraqalpaqsha",
		"kab" : "Taqbaylit",
		"kg" : "Kongo",
		"ki" : "G\u0129k\u0169y\u0169",
		"kiu" : "Kurmanc\u00ee",
		"kj" : "Kwanyama",
		"kk" : "\u049a\u0430\u0437\u0430\u049b\u0448\u0430",
		"kk-arab" : "\u202b\u0642\u0627\u0632\u0627\u0642\u0634\u0627 (\u062a\u0674\u0648\u062a\u06d5)\u202c",
		"kk-cyrl" : "\u202a\u049a\u0430\u0437\u0430\u049b\u0448\u0430 (\u043a\u0438\u0440\u0438\u043b)\u202c",
		"kk-latn" : "\u202aQazaq\u015fa (lat\u0131n)\u202c",
		"kk-cn" : "\u202b\u0642\u0627\u0632\u0627\u0642\u0634\u0627 (\u062c\u06c7\u0646\u06af\u0648)\u202c",
		"kk-kz" : "\u202a\u049a\u0430\u0437\u0430\u049b\u0448\u0430 (\u049a\u0430\u0437\u0430\u049b\u0441\u0442\u0430\u043d)\u202c",
		"kk-tr" : "\u202aQazaq\u015fa (T\u00fcrk\u00efya)\u202c",
		"kl" : "Kalaallisut",
		"km" : "\u1797\u17b6\u179f\u17b6\u1781\u17d2\u1798\u17c2\u179a",
		"kn" : "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1",
		"ko" : "\ud55c\uad6d\uc5b4",
		"ko-kp" : "\ud55c\uad6d\uc5b4 (\uc870\uc120)",
		"kr" : "Kanuri",
		"kri" : "Krio",
		"krj" : "Kinaray-a",
		"ks" : "\u0915\u0936\u094d\u092e\u0940\u0930\u0940 - (\u0643\u0634\u0645\u064a\u0631\u064a)",
		"ksh" : "Ripoarisch",
		"ku" : "Kurd\u00ee \/ \u0643\u0648\u0631\u062f\u06cc",
		"ku-latn" : "\u202aKurd\u00ee (lat\u00een\u00ee)\u202c",
		"ku-arab" : "\u202b\u0643\u0648\u0631\u062f\u064a (\u0639\u06d5\u0631\u06d5\u0628\u06cc)\u202c",
		"kv" : "\u041a\u043e\u043c\u0438",
		"kw" : "Kernowek",
		"ky" : "\u041a\u044b\u0440\u0433\u044b\u0437\u0447\u0430",
		"la" : "Latina",
		"lad" : "Ladino",
		"lb" : "L\u00ebtzebuergesch",
		"lbe" : "\u041b\u0430\u043a\u043a\u0443",
		"lez" : "\u041b\u0435\u0437\u0433\u0438",
		"lfn" : "Lingua Franca Nova",
		"lg" : "Luganda",
		"li" : "Limburgs",
		"lij" : "L\u00edguru",
		"lmo" : "Lumbaart",
		"ln" : "Ling\u00e1la",
		"lo" : "\u0ea5\u0eb2\u0ea7",
		"loz" : "Silozi",
		"lt" : "Lietuvi\u0173",
		"lv" : "Latvie\u0161u",
		"lzh" : "\u6587\u8a00",
		"mai" : "\u092e\u0948\u0925\u093f\u0932\u0940",
		"map-bms" : "Basa Banyumasan",
		"mdf" : "\u041c\u043e\u043a\u0448\u0435\u043d\u044c",
		"mg" : "Malagasy",
		"mh" : "Ebon",
		"mhr" : "\u041e\u043b\u044b\u043a \u041c\u0430\u0440\u0438\u0439",
		"mi" : "M\u0101ori",
		"mk" : "\u041c\u0430\u043a\u0435\u0434\u043e\u043d\u0441\u043a\u0438",
		"ml" : "\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02",
		"mn" : "\u041c\u043e\u043d\u0433\u043e\u043b",
		"mo" : "\u041c\u043e\u043b\u0434\u043e\u0432\u0435\u043d\u044f\u0441\u043a\u044d",
		"mr" : "\u092e\u0930\u093e\u0920\u0940",
		"ms" : "Bahasa Melayu",
		"mt" : "Malti",
		"mus" : "Mvskoke",
		"mwl" : "Mirand\u00e9s",
		"my" : "\u1019\u103c\u1014\u103a\u1019\u102c\u1018\u102c\u101e\u102c",
		"myv" : "\u042d\u0440\u0437\u044f\u043d\u044c",
		"mzn" : "\u0645\u064e\u0632\u0650\u0631\u0648\u0646\u064a",
		"na" : "Dorerin Naoero",
		"nah" : "N\u0101huatl",
		"nan" : "B\u00e2n-l\u00e2m-g\u00fa",
		"nap" : "Nnapulitano",
		"nb" : "\u202aNorsk (bokm\u00e5l)\u202c",
		"nds" : "Plattd\u00fc\u00fctsch",
		"nds-nl" : "Nedersaksisch",
		"ne" : "\u0928\u0947\u092a\u093e\u0932\u0940",
		"new" : "\u0928\u0947\u092a\u093e\u0932 \u092d\u093e\u0937\u093e",
		"ng" : "Oshiwambo",
		"niu" : "Niu\u0113",
		"nl" : "Nederlands",
		"nn" : "\u202aNorsk (nynorsk)\u202c",
		"no" : "\u202aNorsk (bokm\u00e5l)\u202c",
		"nov" : "Novial",
		"nrm" : "Nouormand",
		"nso" : "Sesotho sa Leboa",
		"nv" : "Din\u00e9 bizaad",
		"ny" : "Chi-Chewa",
		"oc" : "Occitan",
		"om" : "Oromoo",
		"or" : "\u0b13\u0b21\u0b3c\u0b3f\u0b06",
		"os" : "\u0418\u0440\u043e\u043d\u0430\u0443",
		"pa" : "\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40",
		"pag" : "Pangasinan",
		"pam" : "Kapampangan",
		"pap" : "Papiamentu",
		"pcd" : "Picard",
		"pdc" : "Deitsch",
		"pdt" : "Plautdietsch",
		"pfl" : "Pf\u00e4lzisch",
		"pi" : "\u092a\u093e\u093f\u0934",
		"pih" : "Norfuk \/ Pitkern",
		"pl" : "Polski",
		"pms" : "Piemont\u00e8is",
		"pnb" : "\u067e\u0646\u062c\u0627\u0628\u06cc",
		"pnt" : "\u03a0\u03bf\u03bd\u03c4\u03b9\u03b1\u03ba\u03ac",
		"ps" : "\u067e\u069a\u062a\u0648",
		"pt" : "Portugu\u00eas",
		"pt-br" : "Portugu\u00eas do Brasil",
		"qu" : "Runa Simi",
		"rif" : "Tarifit",
		"rm" : "Rumantsch",
		"rmy" : "Romani",
		"rn" : "Kirundi",
		"ro" : "Rom\u00e2n\u0103",
		"roa-rup" : "Arm\u00e3neashce",
		"roa-tara" : "Tarand\u00edne",
		"ru" : "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
		"ruq" : "Vl\u0103he\u015fte",
		"ruq-cyrl" : "\u0412\u043b\u0430\u0445\u0435\u0441\u0442\u0435",
		"ruq-latn" : "Vl\u0103he\u015fte",
		"rw" : "Kinyarwanda",
		"sa" : "\u0938\u0902\u0938\u094d\u0915\u0943\u0924",
		"sah" : "\u0421\u0430\u0445\u0430 \u0442\u044b\u043b\u0430",
		"sc" : "Sardu",
		"scn" : "Sicilianu",
		"sco" : "Scots",
		"sd" : "\u0633\u0646\u068c\u064a",
		"sdc" : "Sassaresu",
		"se" : "S\u00e1megiella",
		"sei" : "Cmique Itom",
		"sg" : "S\u00e4ng\u00f6",
		"sh" : "Srpskohrvatski \/ \u0421\u0440\u043f\u0441\u043a\u043e\u0445\u0440\u0432\u0430\u0442\u0441\u043a\u0438",
		"shi" : "Ta\u0161l\u1e25iyt",
		"si" : "\u0dc3\u0dd2\u0d82\u0dc4\u0dbd",
		"simple" : "Simple English",
		"sk" : "Sloven\u010dina",
		"sl" : "Sloven\u0161\u010dina",
		"sli" : "Schl\u00e4sch",
		"sm" : "Gagana Samoa",
		"sma" : "\u00c5arjelsaemien",
		"sn" : "chiShona",
		"so" : "Soomaaliga",
		"sq" : "Shqip",
		"sr" : "\u0421\u0440\u043f\u0441\u043a\u0438 \/ Srpski",
		"sr-ec" : "\u0421\u0440\u043f\u0441\u043a\u0438 (\u045b\u0438\u0440\u0438\u043b\u0438\u0446\u0430)",
		"sr-el" : "Srpski (latinica)",
		"srn" : "Sranantongo",
		"ss" : "SiSwati",
		"st" : "Sesotho",
		"stq" : "Seeltersk",
		"su" : "Basa Sunda",
		"sv" : "Svenska",
		"sw" : "Kiswahili",
		"szl" : "\u015al\u016fnski",
		"ta" : "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd",
		"tcy" : "\u0ca4\u0cc1\u0cb3\u0cc1",
		"te" : "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41",
		"tet" : "Tetun",
		"tg" : "\u0422\u043e\u04b7\u0438\u043a\u04e3",
		"tg-cyrl" : "\u0422\u043e\u04b7\u0438\u043a\u04e3",
		"tg-latn" : "tojik\u012b",
		"th" : "\u0e44\u0e17\u0e22",
		"ti" : "\u1275\u130d\u122d\u129b",
		"tk" : "T\u00fcrkmen\u00e7e",
		"tl" : "Tagalog",
		"tn" : "Setswana",
		"to" : "lea faka-Tonga",
		"tokipona" : "Toki Pona",
		"tp" : "Toki Pona (deprecated:tokipona)",
		"tpi" : "Tok Pisin",
		"tr" : "T\u00fcrk\u00e7e",
		"ts" : "Xitsonga",
		"tt" : "\u0422\u0430\u0442\u0430\u0440\u0447\u0430\/Tatar\u00e7a",
		"tt-cyrl" : "\u0422\u0430\u0442\u0430\u0440\u0447\u0430",
		"tt-latn" : "Tatar\u00e7a",
		"tum" : "chiTumbuka",
		"tw" : "Twi",
		"ty" : "Reo M\u0101`ohi",
		"tyv" : "\u0422\u044b\u0432\u0430 \u0434\u044b\u043b",
		"udm" : "\u0423\u0434\u043c\u0443\u0440\u0442",
		"ug" : "Uyghurche\u200e \/ \u0626\u06c7\u064a\u063a\u06c7\u0631\u0686\u06d5",
		"ug-arab" : "\u0626\u06c7\u064a\u063a\u06c7\u0631\u0686\u06d5",
		"ug-latn" : "Uyghurche\u200e",
		"uk" : "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430",
		"ur" : "\u0627\u0631\u062f\u0648",
		"uz" : "O'zbek",
		"ve" : "Tshivenda",
		"vec" : "V\u00e8neto",
		"vep" : "Vepsan kel'",
		"vi" : "Ti\u1ebfng Vi\u1ec7t",
		"vls" : "West-Vlams",
		"vo" : "Volap\u00fck",
		"vro" : "V\u00f5ro",
		"wa" : "Walon",
		"war" : "Winaray",
		"wo" : "Wolof",
		"wuu" : "\u5434\u8bed",
		"xal" : "\u0425\u0430\u043b\u044c\u043c\u0433",
		"xh" : "isiXhosa",
		"xmf" : "\u10db\u10d0\u10e0\u10d2\u10d0\u10da\u10e3\u10e0\u10d8",
		"yi" : "\u05d9\u05d9\u05b4\u05d3\u05d9\u05e9",
		"yo" : "Yor\u00f9b\u00e1",
		"yue" : "\u7cb5\u8a9e",
		"za" : "Vahcuengh",
		"zea" : "Ze\u00eauws",
		"zh" : "\u4e2d\u6587",
		"zh-classical" : "\u6587\u8a00",
		"zh-cn" : "\u202a\u4e2d\u6587(\u4e2d\u56fd\u5927\u9646)\u202c",
		"zh-hans" : "\u202a\u4e2d\u6587(\u7b80\u4f53)\u202c",
		"zh-hant" : "\u202a\u4e2d\u6587(\u7e41\u9ad4)\u202c",
		"zh-hk" : "\u202a\u4e2d\u6587(\u9999\u6e2f)\u202c",
		"zh-min-nan" : "B\u00e2n-l\u00e2m-g\u00fa",
		"zh-mo" : "\u202a\u4e2d\u6587(\u6fb3\u9580)\u202c",
		"zh-my" : "\u202a\u4e2d\u6587(\u9a6c\u6765\u897f\u4e9a)\u202c",
		"zh-sg" : "\u202a\u4e2d\u6587(\u65b0\u52a0\u5761)\u202c",
		"zh-tw" : "\u202a\u4e2d\u6587(\u53f0\u7063)\u202c",
		"zh-yue" : "\u7cb5\u8a9e",
		"zu" : "isiZulu"
	};	
	

	/**
	 * Plural form transformations, needed for some languages.
	 * For example, there are 3 form of plural in Russian and Polish,
	 * depending on "count mod 10". See [[w:Plural]]
	 * For English it is pretty simple.
	 *
	 * Invoked by putting {{plural:count|wordform1|wordform2}}
	 * or {{plural:count|wordform1|wordform2|wordform3}}
	 *
	 * Example: {{plural:{{NUMBEROFARTICLES}}|article|articles}}
	 *
	 * @param count Integer: non-localized number
	 * @param forms Array: different plural forms
	 * @return string Correct form of plural for count in this language
	 */	 
	
	/**
	* Base gender transform function
	*/
	mw.Language.gender = function( gender, forms ) {
		if ( ! forms.length ) { 
			return ''; 
		}
		forms = mw.Language.preConvertPlural( forms, 2 );
		if ( gender === 'male' ) return forms[0];
		if ( gender === 'female' ) return forms[1];
		return ( forms[2] ) ? forms[2] : forms[0];
	};
	
	/**
	* Process the PLURAL template substitution 
	* @param {Object} template Template object 
	* 
	* 	{{Template:argument|params}}
	* 
	* 	Template object should include:
	* 	[arg] The argument sent to the template  
	* 	[params] The template parameters  
	*/
	mw.Language.procPLURAL = function( templateObject ) {		
		// Setup shortcuts
		// ( gRuleSet is loaded from script-loader to contains local ruleset )
		var rs = gRuleSet[ 'PLURAL' ];
		
		if( templateObject.arg && templateObject.param && mw.Language.convertPlural) {
			// Check if we have forms to replace
			if ( templateObject.param.length == 0 ) { 
				return '';
			}
			// Restore the count into a Number ( if it got converted earlier )
			var count = mw.Language.convertNumber( templateObject.arg, true );
			
			// Do convertPlural call 					
			return mw.Language.convertPlural( parseInt( count ), templateObject.param );
			
		}
		// Could not process plural return first form or nothing
		if( templateObject.param[0] ) {
			return templateObject.param[0];
		}
		return '';
	};
	
	// NOTE:: add gender support here 
	mw.Language.procGENDER = function( templateObject ){
		return 'gender-not-supported-in-js-yet';
	}
	/*
	* Base convertPlural function:
	*/
	mw.Language.convertPlural = function( count, forms ){	
		if ( !forms || forms.length == 0 ) { 
			return ''; 
		}	
		return ( parseInt( count ) == 1 ) ? forms[0] : forms[1];
	};
	/**
	 * Checks that convertPlural was given an array and pads it to requested
	 * amount of forms by copying the last one.
	 *
	 * @param {Array} forms Forms given to convertPlural
	 * @param {Integer} count How many forms should there be at least
	 * @return {Array} Padded array of forms or an exception if not an array
	 */
	mw.Language.preConvertPlural = function( forms, count ) {		
		while ( forms.length < count ) {
			forms.push( forms[ forms.length-1 ] );
		}		
		return forms;
	};
	
	/**
	 * Init the digitTransformTable ( populated by language classes where applicable ) 
	 */
	mw.Language.digitTransformTable = null;
	
	/** 
	 * Convert a number using the digitTransformTable 
	 * @param Number number to be converted
	 * @param Bollean typeInt if we should return a number of type int 
	 */
	mw.Language.convertNumber = function( number, typeInt ) {
		if( !mw.Language.digitTransformTable )
			return number;
		
		// Set the target Transform table: 
		var transformTable = mw.Language.digitTransformTable;
		
		// Check if the "restore" to latin number flag is set: 
		if( typeInt ) {			
			if( parseInt( number ) == number )	
				return number;
			var tmp = [];
			for( var i in transformTable ) {
				tmp[ transformTable[ i ] ] = i;
			}
			transformTable = tmp;
		}
		
		var numberString =  '' + number;
		var convertedNumber = '';
		for( var i =0; i < numberString.length; i++) {
			if( transformTable[ numberString[i] ] ) {
				convertedNumber += transformTable[ numberString[i] ];
			}else{
				convertedNumber += numberString[i];
			}
		}
		return ( typeInt )? parseInt( convertedNumber) : convertedNumber;
	}
	
	/**
	 * Checks if a language key is valid ( is part of languageCodeList )
	 * @param {String} langKey Language key to be checked
	 * @return true if valid language, false if not
	 */
	mw.isValidLang = function( langKey ) {
		return ( mw.Language.names[ langKey ] )? true : false;
	}

	/**
	 * Format a number
	 * @param {Number} num Number to be formated
	 * NOTE: add il8n support to languages/l10n/Language{langCode}.js
	 */
	mw.Language.addDecimalSeparators = function( num ) {
		/*
		*	addSeparatorsNF
		* @param Str: The number to be formatted, as a string or number.		
		* @param outD: The decimal character for the output, such as ',' for the number 100,2
		* @param sep: The separator character for the output, such as ',' for the number 1,000.2
		*/
		function addSeparatorsNF( nStr, outD, sep ) {
			nStr += '';
			var dpos = nStr.indexOf( '.' );
			var nStrEnd = '';
			if ( dpos != -1 ) {
				nStrEnd = outD + nStr.substring( dpos + 1, nStr.length );
				nStr = nStr.substring( 0, dpos );
			}
			var rgx = /(\d+)(\d{3})/;
			while ( rgx.test( nStr ) ) {
				nStr = nStr.replace( rgx, '$1' + sep + '$2' );
			}
			return nStr + nStrEnd;
		}
		// @@todo read language code and give periods or comas: 
		return addSeparatorsNF( num, '.', ',' );
	}
	
}) ( window.mw );

// Set global gM shortcut:
window[ 'gM' ] = mw.getMsg;

/**
* Mediawiki language text parser
*/

// Setup swap string constants
var JQUERY_SWAP_STRING = 'ZjQuerySwapZ';	
var LINK_SWAP_STRING = 'ZreplaceZ';
	
( function( mw ) {
	
	// The parser magic global 
	var pMagicSet = { };
	
	/**
	 * addTemplateTransform to the parser 
	 *
	 * Lets you add a set template key to be transformed by a callback function
	 *
	 * @param {Object} magicSet key:callback
	 */
	mw.addTemplateTransform = function( magicSet ) {
		for ( var name in magicSet ) {
			pMagicSet[name] = magicSet[name];
		}
	};

	/**
	* MediaWiki wikitext "Parser" constructor 
	*
	* @param {String} wikiText the wikitext to be parsed
	* @return {Object} parserObj returns a parser object that has methods for getting at
	* things you would want
	*/	
	mw.Parser = function( wikiText, options) {
		// return the parserObj
		this.init( wikiText, options ) ;	
	};
	
	mw.Parser.prototype = {
		
		// the parser output string container
		pOut: false,
		
		init: function( wikiText, parserOptions ) {
			this.wikiText = wikiText;					
		},		
		 		
		// Update the text value
		updateText : function( wikiText ) {
			this.wikiText = wikiText;
			
			// invalidate the output ( will force a re-parse )
			this.pOut = false;
		},
		
		/**
		 * Quickly recursive / parse out templates:		 
		 */
		parse: function() {
			function recurseTokenizeNodes ( text ) {
				var node = { };
				// Inspect each char
				for ( var a = 0; a < text.length; a++ ) {
					if ( text[a] == '{' && text[a + 1] == '{' ) {
						a = a + 2;
						node['parent'] = node;
						if ( !node['child'] ) {
							node['child'] = new Array();
						}

						node['child'].push( recurseTokenizeNodes( text.substr( a ) ) );
					} else if ( text[a] == '}' && text[a + 1] == '}' ) {
						a++;
						if ( !node['parent'] ) {
							return node;
						}
						node = node['parent'];
					}
					if ( !node['text'] ) {
						node['text'] = '';
					}
					// Don't put }} closures into output:
					if ( text[a] &&  text[a] != '}' ) {
							node['text'] += text[a];
					}
				}
				return node;
			}
			
			/**
			 * Parse template text as template name and named params
			 * @param {String} templateString Template String to be parsed 
			 */
			function parseTmplTxt( templateString ) {
				var templateObject = { };
								
				// Get template name:
				templateName = templateString.split( '\|' ).shift() ;
				templateName = templateName.split( '\{' ).shift() ;
				templateName = templateName.replace( /^\s+|\s+$/g, "" ); //trim

				// Check for arguments:
				if ( templateName.split( ':' ).length == 1 ) {
					templateObject["name"] = templateName;
				} else {
					templateObject["name"] = templateName.split( ':' ).shift();
					templateObject["arg"] = templateName.split( ':' ).pop();
				}
									
				var paramSet = templateString.split( '\|' );
				paramSet.splice( 0, 1 );
				if ( paramSet.length ) {
					templateObject.param = new Array();
					for ( var pInx = 0; pInx < paramSet.length; pInx++ ) {
						var paramString = paramSet[ pInx ];
						// check for empty param
						if ( paramString == '' ) {
							templateObject.param[ pInx ] = '';
							continue;
						}
						for ( var b = 0 ; b < paramString.length ; b++ ) {
							if ( paramString[b] == '=' && b > 0 && b < paramString.length && paramString[b - 1] != '\\' ) {
								// named param
								templateObject.param[ paramString.split( '=' ).shift() ] =	paramString.split( '=' ).pop();
							} else {
								// indexed param
								templateObject.param[ pInx ] = paramString;
							}
						}
					}
				}		
				return templateObject;
			}
			
			/**
			 * Get the Magic text from a template node
			 */
			function getMagicTxtFromTempNode( node ) {
				node.templateObject = parseTmplTxt ( node.text );
				// Do magic swap if template key found in pMagicSet
				if ( node.templateObject.name in pMagicSet ) {
					var nodeText = pMagicSet[ node.templateObject.name ]( node.templateObject );
					return nodeText;
				} else {
					// don't swap just return text
					return node.text;
				}
			}
			
			/**
			* swap links of form [ ] for html a links or jquery helper spans
			* NOTE: this could be integrated into the tokenizer but for now
			* is a staged process.
			*
			* @param text to swapped 
			*/
			function linkSwapText( text ) {
				//mw.log( "linkSwapText::" + text );
				var re = new RegExp( /\[([^\s]+[\s]+[^\]]*)\]/g );
				var matchSet = text.match( re );
				
				if( !matchSet ){
					return text;
				} 							

				text = text.replace( re , LINK_SWAP_STRING );				
				
				for( var i=0; i < matchSet.length; i++ ) {
				    // Strip the leading [ and trailing ]
				    var matchParts = matchSet[i].substr(1, matchSet[i].length-2);
																   				   
				    // Check for special jQuery type swap and replace inner JQUERY_SWAP_STRING not value 
					if( matchParts.indexOf( JQUERY_SWAP_STRING ) !== -1 ) {				
						// parse the link as html						
						var  $matchParts = $j('<span>' +  matchParts + '</span>' );						
						
						$jQuerySpan = $matchParts.find('#' +JQUERY_SWAP_STRING + i );
						
						var linkText = $matchParts.text();
						//mw.log(" going to swap in linktext: " + linkText );
						$jQuerySpan.text( linkText );
																	
						text = text.replace( LINK_SWAP_STRING, $j('<span />' ).append( $jQuerySpan ).html() );
					} else { 				  
				    	// do text string replace
				    	matchParts = matchParts.split(/ /);				    
				    	var link = matchParts[0];				    				      				      
				    	matchParts.shift();
				    	var linkText = matchParts.join(' ');
				    	
				    	text = text.replace( LINK_SWAP_STRING, '<a href="' + link + '">' + linkText + '</a>' );
				    }
				}
				return text;
			}
			
			/**
			 * recurse_magic_swap
			 *
			 * Go last child first swap upward: 
			 */
			var pNode = null;
			function recurse_magic_swap( node ) {
				if ( !pNode )
					pNode = node;

				if ( node['child'] ) {
					// swap all the kids:
					for ( var i = 0; i < node['child'].length; i++ ) {
						var nodeText = recurse_magic_swap( node['child'][i] );
						// swap it into current
						if ( node.text ) {
							node.text = node.text.replace( node['child'][i].text, nodeText );
						}
						// swap into parent
						pNode.text  = pNode.text.replace( node['child'][i].text, nodeText );
					}
					// Get the updated node text
					var nodeText = getMagicTxtFromTempNode( node );
					pNode.text = pNode.text.replace( node.text , nodeText );
					// return the node text
					return node.text;
				} else {					
					return getMagicTxtFromTempNode( node );
				}
			}
			
			// Parse out the template node structure:
			this.pNode = recurseTokenizeNodes ( this.wikiText );
			
			// Strip out the parent from the root	
			this.pNode['parent'] = null;
			
			// Do the recursive magic swap text:
			this.pOut = recurse_magic_swap( this.pNode );
			
			// Do link swap 
			this.pOut = linkSwapText( this.pOut );						
		},
		
		/**
		 * templates
		 * 
		 * Get a requested template from the wikitext (if available)
		 * @param templateName
		 */
		templates: function( templateName ) {
			this.parse();
			var tmplSet = new Array();
			function getMatchingTmpl( node ) {
				if ( node['child'] ) {
					for ( var i = 0; i < node['child'].length; i++ ) {
						getMatchingTmpl( node['child'] );
					}
				}
				if ( templateName && node.templateObject ) {
					if ( node.templateObject['name'] == templateName )
						tmplSet.push( node.templateObject );
				} else if ( node.templateObject ) {
					tmplSet.push( node.templateObject );
				}
			}
			getMatchingTmpl( this.pNode );
			return tmplSet;
		},
		
		/**
		* getTemplateVars
		* returns a set of template values in a given wikitext page
		* 
		* NOTE: should be integrated with the usability wikitext parser
		*/
		getTemplateVars: function() {
			//mw.log('matching against: ' + wikiText);
			templateVars = new Array();
			var tempVars = wikiText.match(/\{\{\{([^\}]*)\}\}\}/gi);
															
			// Clean up results:
			for(var i=0; i < tempVars.length; i++) {
				//match 
				var tvar = tempVars[i].replace('{{{','').replace('}}}','');
				
				// Strip anything after a |
				if(tvar.indexOf('|') != -1) {
					tvar = tvar.substr(0, tvar.indexOf('|'));
				}
				
				// Check for duplicates:
				var do_add=true;
				for(var j=0; j < templateVars.length; j++) {
					if( templateVars[j] == tvar)
						do_add=false;
				}
				
				// Add the template vars to the output obj
				if(do_add)
					templateVars.push( tvar );
			}
			return templateVars;
		},
		
		/**
		 * Returns the transformed wikitext
		 * 
		 * Build output from swappable index 
		 * 		(all transforms must be expanded in parse stage and linearly rebuilt)  
		 * Alternatively we could build output using a place-holder & replace system 
		 * 		(this lets us be slightly more sloppy with ordering and indexes, but probably slower)
		 * 
		 * Ideal: we build a 'wiki DOM' 
		 * 		When editing you update the data structure directly
		 * 		Then in output time you just go DOM->html-ish output without re-parsing anything			   
		 */
		getHTML: function() {
			// wikiText updates should invalidate pOut
			if ( ! this.pOut ) {
				this.parse();
			}
			return this.pOut;
		}
	};
	
}) ( window.mw );
mw.addMessages({
	"mwe-upwiz-code-unknown": "Unknown language"
});

/**
 * Utility class which knows about languages, and how to construct HTML to select them
 * TODO: make this a more common library, used by this and TimedText
 */
mw.LanguageUpWiz = {

	defaultCode: 'en',  // when we absolutely have no idea what language to preselect

	initialized: false,

	UNKNOWN: 'unknown',

	/**
	 * List of all languages mediaWiki supports ( Avoid an api call to get this same info )
	 * http://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&siprop=languages&format=jsonfm
	 * 
     * Languages sorted by name, using tools in $SVNROOT/mediawiki/trunk/tools/langcodes 
	 * This is somewhat better than sorting by code (which produces totally bizarre results) but is not
	 * a true lexicographic sort
	 */
	languages: [
		{ code: "ace",           text: "Ac\u00e8h" },
		{ code: "af",            text: "Afrikaans" },
		{ code: "ak",            text: "Akan" },
		{ code: "als",           text: "Alemannisch" },   //  XXX someone fix this please
		{ code: "gsw",           text: "Alemannisch" },   //  
		{ code: "ang",           text: "Anglo-Saxon" },
		{ code: "an",            text: "Aragon\u00e9s" },
		{ code: "roa-rup",       text: "Arm\u00e3neashce" },
		{ code: "frp",           text: "Arpetan" },
		{ code: "ast",           text: "Asturianu" },
		{ code: "gn",            text: "Ava\u00f1e'\u1ebd" },
		{ code: "ay",            text: "Aymar aru" },
		{ code: "az",            text: "Az\u0259rbaycan" },
		{ code: "id",            text: "Bahasa Indonesia" },
		{ code: "ms",            text: "Bahasa Melayu" },
		{ code: "bm",            text: "Bamanankan" },
		{ code: "map-bms",       text: "Basa Banyumasan" },
		{ code: "jv",            text: "Basa Jawa" },
		{ code: "su",            text: "Basa Sunda" },
		{ code: "bcl",           text: "Bikol Central" },
		{ code: "bi",            text: "Bislama" },
		{ code: "bar",           text: "Boarisch" },
		{ code: "bs",            text: "Bosanski" },
		{ code: "br",            text: "Brezhoneg" },
		{ code: "en-gb",         text: "British English" },
		{ code: "nan",           text: "B\u00e2n-l\u00e2m-g\u00fa" },
		{ code: "zh-min-nan",    text: "B\u00e2n-l\u00e2m-g\u00fa" },
		{ code: "ca",            text: "Catal\u00e0" },
		{ code: "ceb",           text: "Cebuano" },
		{ code: "ch",            text: "Chamoru" },
		{ code: "cbk-zam",       text: "Chavacano de Zamboanga" },
		{ code: "ny",            text: "Chi-Chewa" },
		{ code: "cho",           text: "Choctaw" },
		{ code: "sei",           text: "Cmique Itom" },
		{ code: "co",            text: "Corsu" },
		{ code: "cy",            text: "Cymraeg" },
		{ code: "da",            text: "Dansk" },
		{ code: "dk",            text: "Dansk (deprecated:da)" },  // XXX deprecated?
		{ code: "pdc",           text: "Deitsch" },
		{ code: "de",            text: "Deutsch" },
		{ code: "de-formal",     text: "Deutsch (Sie-Form)" },
		{ code: "nv",            text: "Din\u00e9 bizaad" },
		{ code: "dsb",           text: "Dolnoserbski" },
		{ code: "na",            text: "Dorerin Naoero" },
		{ code: "mh",            text: "Ebon" },
		{ code: "et",            text: "Eesti" },
		{ code: "eml",           text: "Emili\u00e0n e rumagn\u00f2l" },
		{ code: "en",            text: "English" },
		{ code: "es",            text: "Espa\u00f1ol" },
		{ code: "eo",            text: "Esperanto" },
		{ code: "ext",           text: "Estreme\u00f1u" },
		{ code: "eu",            text: "Euskara" },
		{ code: "ee",            text: "E\u028begbe" },
		{ code: "hif",           text: "Fiji Hindi" },   //  XXX fix this
		{ code: "hif-latn",      text: "Fiji Hindi" },   // 
		{ code: "fr",            text: "Fran\u00e7ais" },
		{ code: "frc",           text: "Fran\u00e7ais canadien" },
		{ code: "fy",            text: "Frysk" },
		{ code: "ff",            text: "Fulfulde" },
		{ code: "fur",           text: "Furlan" },
		{ code: "fo",            text: "F\u00f8royskt" },
		{ code: "ga",            text: "Gaeilge" },
		{ code: "gv",            text: "Gaelg" },
		{ code: "sm",            text: "Gagana Samoa" },
		{ code: "gag",           text: "Gagauz" },
		{ code: "gl",            text: "Galego" },
		{ code: "aln",           text: "Geg\u00eb" },
		{ code: "gd",            text: "G\u00e0idhlig" },
		{ code: "ki",            text: "G\u0129k\u0169y\u0169" },
		{ code: "hak",           text: "Hak-k\u00e2-fa" },
		{ code: "haw",           text: "Hawai`i" },
		{ code: "ho",            text: "Hiri Motu" },
		{ code: "hsb",           text: "Hornjoserbsce" },
		{ code: "hr",            text: "Hrvatski" },
		{ code: "io",            text: "Ido" },
		{ code: "ig",            text: "Igbo" },
		{ code: "ilo",           text: "Ilokano" },
		{ code: "hil",           text: "Ilonggo" },
		{ code: "ia",            text: "Interlingua" },  
		{ code: "ie",            text: "Interlingue" },
		{ code: "it",            text: "Italiano" },
		{ code: "ik",            text: "I\u00f1upiak" },
		{ code: "jut",           text: "Jysk" },
		{ code: "kl",            text: "Kalaallisut" },
		{ code: "kr",            text: "Kanuri" },
		{ code: "pam",           text: "Kapampangan" },
		{ code: "csb",           text: "Kasz\u00ebbsczi" },
		{ code: "kw",            text: "Kernowek" },
		{ code: "krj",           text: "Kinaray-a" },
		{ code: "rw",            text: "Kinyarwanda" },
		{ code: "rn",            text: "Kirundi" },
		{ code: "sw",            text: "Kiswahili" },
		{ code: "kg",            text: "Kongo" },
		{ code: "avk",           text: "Kotava" },
		{ code: "ht",            text: "Krey\u00f2l ayisyen" },
		{ code: "kri",           text: "Krio" },
		{ code: "ku",            text: "Kurd\u00ee \/ \u0643\u0648\u0631\u062f\u06cc" },
		{ code: "kiu",           text: "Kurmanc\u00ee" },
		{ code: "kj",            text: "Kwanyama" },
		{ code: "lad",           text: "Ladino" },
		{ code: "la",            text: "Latina" },
		{ code: "lv",            text: "Latvie\u0161u" },
		{ code: "lt",            text: "Lietuvi\u0173" },
		{ code: "li",            text: "Limburgs" },
		{ code: "lfn",           text: "Lingua Franca Nova" },
		{ code: "ln",            text: "Ling\u00e1la" },
		{ code: "jbo",           text: "Lojban" },
		{ code: "lg",            text: "Luganda" },
		{ code: "lmo",           text: "Lumbaart" },
		{ code: "lb",            text: "L\u00ebtzebuergesch" },
		{ code: "lij",           text: "L\u00edguru" },
		{ code: "hu",            text: "Magyar" },
		{ code: "mg",            text: "Malagasy" },
		{ code: "mt",            text: "Malti" },
		{ code: "arn",           text: "Mapudungun" },
		{ code: "mwl",           text: "Mirand\u00e9s" },
		{ code: "mus",           text: "Mvskoke" },
		{ code: "cdo",           text: "M\u00ecng-d\u0115\u0324ng-ng\u1e73\u0304" },
		{ code: "mi",            text: "M\u0101ori" },
		{ code: "fj",            text: "Na Vosa Vakaviti" },
		{ code: "nl",            text: "Nederlands" },
		{ code: "nds-nl",        text: "Nedersaksisch" },
		{ code: "niu",           text: "Niu\u0113" },
		{ code: "nap",           text: "Nnapulitano" },
		{ code: "pih",           text: "Norfuk \/ Pitkern" },
		{ code: "nb",            text: "Norsk (bokm\u00e5l)" },
		{ code: "no",            text: "Norsk (bokm\u00e5l)" },
		{ code: "nn",            text: "Norsk (nynorsk)" },
		{ code: "nrm",           text: "Nouormand" },
		{ code: "nov",           text: "Novial" },
		{ code: "nah",           text: "N\u0101huatl" },
		{ code: "cr",            text: "N\u0113hiyaw\u0113win \/ \u14c0\u1426\u1403\u152d\u140d\u140f\u1423" },
		{ code: "uz",            text: "O'zbek" },
		{ code: "oc",            text: "Occitan" },
		{ code: "om",            text: "Oromoo" },
		{ code: "ng",            text: "Oshiwambo" },
		{ code: "hz",            text: "Otsiherero" },
		{ code: "pag",           text: "Pangasinan" },
		{ code: "pap",           text: "Papiamentu" },
		{ code: "pfl",           text: "Pf\u00e4lzisch" },
		{ code: "pcd",           text: "Picard" },
		{ code: "pms",           text: "Piemont\u00e8is" },
		{ code: "nds",           text: "Plattd\u00fc\u00fctsch" },
		{ code: "pdt",           text: "Plautdietsch" },
		{ code: "pl",            text: "Polski" },
		{ code: "pt",            text: "Portugu\u00eas" },
		{ code: "pt-br",         text: "Portugu\u00eas do Brasil" },
		{ code: "aa",            text: "Qaf\u00e1r af" },
		{ code: "kaa",           text: "Qaraqalpaqsha" },
		{ code: "crh",           text: "Q\u0131r\u0131mtatarca" },
		{ code: "ty",            text: "Reo M\u0101`ohi" },
		{ code: "ksh",           text: "Ripoarisch" },
		{ code: "rmy",           text: "Romani" },
		{ code: "ro",            text: "Rom\u00e2n\u0103" },
		{ code: "rm",            text: "Rumantsch" },
		{ code: "qu",            text: "Runa Simi" },
		{ code: "sc",            text: "Sardu" },
		{ code: "sdc",           text: "Sassaresu" },
		{ code: "sli",           text: "Schl\u00e4sch" },
		{ code: "de-ch",         text: "Schweizer Hochdeutsch" },
		{ code: "sco",           text: "Scots" },
		{ code: "stq",           text: "Seeltersk" },
		{ code: "st",            text: "Sesotho" },
		{ code: "nso",           text: "Sesotho sa Leboa" },
		{ code: "tn",            text: "Setswana" },
		{ code: "sq",            text: "Shqip" },
		{ code: "ss",            text: "SiSwati" },
		{ code: "scn",           text: "Sicilianu" },
		{ code: "loz",           text: "Silozi" },
		{ code: "simple",        text: "Simple English" },
		{ code: "sk",            text: "Sloven\u010dina" },
		{ code: "sl",            text: "Sloven\u0161\u010dina" },
		{ code: "so",            text: "Soomaaliga" },
		{ code: "ckb",           text: "Soran\u00ee \/ \u06a9\u0648\u0631\u062f\u06cc" },
		{ code: "srn",           text: "Sranantongo" },
		{ code: "sr-el",         text: "Srpski (latinica)" },
		{ code: "sh",            text: "Srpskohrvatski \/ \u0421\u0440\u043f\u0441\u043a\u043e\u0445\u0440\u0432\u0430\u0442\u0441\u043a\u0438" },
		{ code: "fi",            text: "Suomi" },
		{ code: "sv",            text: "Svenska" },
		{ code: "se",            text: "S\u00e1megiella" },
		{ code: "sg",            text: "S\u00e4ng\u00f6" },
		{ code: "tl",            text: "Tagalog" },
		{ code: "kab",           text: "Taqbaylit" },
		{ code: "roa-tara",      text: "Tarand\u00edne" },
		{ code: "rif",           text: "Tarifit" },
		{ code: "tt-latn",       text: "Tatar\u00e7a" },
		{ code: "shi",           text: "Ta\u0161l\u1e25iyt" },
		{ code: "tet",           text: "Tetun" },
		{ code: "vi",            text: "Ti\u1ebfng Vi\u1ec7t" },
		{ code: "tpi",           text: "Tok Pisin" },
		{ code: "tokipona",      text: "Toki Pona" },
		{ code: "tp",            text: "Toki Pona (deprecated:tokipona)" }, // XXX deprecated?
		{ code: "chy",           text: "Tsets\u00eahest\u00e2hese" },
		{ code: "ve",            text: "Tshivenda" },
		{ code: "tw",            text: "Twi" },
		{ code: "tk",            text: "T\u00fcrkmen\u00e7e" },
		{ code: "tr",            text: "T\u00fcrk\u00e7e" },
		{ code: "ug-latn",       text: "Uyghurche\u200e" },
		{ code: "ug",            text: "Uyghurche\u200e \/ \u0626\u06c7\u064a\u063a\u06c7\u0631\u0686\u06d5" },
		{ code: "za",            text: "Vahcuengh" },
		{ code: "vep",           text: "Vepsan kel'" },
		{ code: "ruq",           text: "Vl\u0103he\u015fte" },
		{ code: "ruq-latn",      text: "Vl\u0103he\u015fte" },
		{ code: "vo",            text: "Volap\u00fck" },
		{ code: "vec",           text: "V\u00e8neto" },
		{ code: "fiu-vro",       text: "V\u00f5ro" },
		{ code: "vro",           text: "V\u00f5ro" },
		{ code: "wa",            text: "Walon" },
		{ code: "vls",           text: "West-Vlams" },
		{ code: "war",           text: "Winaray" },
		{ code: "wo",            text: "Wolof" },
		{ code: "ts",            text: "Xitsonga" },
		{ code: "yo",            text: "Yor\u00f9b\u00e1" },
		{ code: "diq",           text: "Zazaki" },
		{ code: "zea",           text: "Ze\u00eauws" },
		{ code: "sn",            text: "chiShona" },
		{ code: "tum",           text: "chiTumbuka" },
		{ code: "ike-latn",      text: "inuktitut" },
		{ code: "xh",            text: "isiXhosa" },
		{ code: "zu",            text: "isiZulu" },
		{ code: "to",            text: "lea faka-Tonga" },
		{ code: "tg-latn",       text: "tojik\u012b" },
		{ code: "is",            text: "\u00cdslenska" },
		{ code: "de-at",         text: "\u00d6sterreichisches Deutsch" },
		{ code: "szl",           text: "\u015al\u016fnski" },
		{ code: "el",            text: "\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac" },
		{ code: "pnt",           text: "\u03a0\u03bf\u03bd\u03c4\u03b9\u03b1\u03ba\u03ac" },
		{ code: "av",            text: "\u0410\u0432\u0430\u0440" },
		{ code: "ab",            text: "\u0410\u04a7\u0441\u0443\u0430" },
		{ code: "ba",            text: "\u0411\u0430\u0448\u04a1\u043e\u0440\u0442" },
		{ code: "be",            text: "\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f" },
		{ code: "be-tarask",     text: "\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f (\u0442\u0430\u0440\u0430\u0448\u043a\u0435\u0432\u0456\u0446\u0430)" },
		{ code: "be-x-old",      text: "\u0411\u0435\u043b\u0430\u0440\u0443\u0441\u043a\u0430\u044f (\u0442\u0430\u0440\u0430\u0448\u043a\u0435\u0432\u0456\u0446\u0430)" },
		{ code: "bxr",           text: "\u0411\u0443\u0440\u044f\u0430\u0434" },
		{ code: "bg",            text: "\u0411\u044a\u043b\u0433\u0430\u0440\u0441\u043a\u0438" },
		{ code: "ruq-cyrl",      text: "\u0412\u043b\u0430\u0445\u0435\u0441\u0442\u0435" },
		{ code: "inh",           text: "\u0413\u0406\u0430\u043b\u0433\u0406\u0430\u0439 \u011eal\u011faj" },
		{ code: "os",            text: "\u0418\u0440\u043e\u043d\u0430\u0443" },
		{ code: "kv",            text: "\u041a\u043e\u043c\u0438" },
		{ code: "ky",            text: "\u041a\u044b\u0440\u0433\u044b\u0437\u0447\u0430" },
		{ code: "lbe",           text: "\u041b\u0430\u043a\u043a\u0443" },
		{ code: "lez",           text: "\u041b\u0435\u0437\u0433\u0438" },
		{ code: "mk",            text: "\u041c\u0430\u043a\u0435\u0434\u043e\u043d\u0441\u043a\u0438" },
		{ code: "mdf",           text: "\u041c\u043e\u043a\u0448\u0435\u043d\u044c" },
		{ code: "mo",            text: "\u041c\u043e\u043b\u0434\u043e\u0432\u0435\u043d\u044f\u0441\u043a\u044d" },
		{ code: "mn",            text: "\u041c\u043e\u043d\u0433\u043e\u043b" },
		{ code: "ce",            text: "\u041d\u043e\u0445\u0447\u0438\u0439\u043d" },
		{ code: "mhr",           text: "\u041e\u043b\u044b\u043a \u041c\u0430\u0440\u0438\u0439" },
		{ code: "ru",            text: "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
		{ code: "sah",           text: "\u0421\u0430\u0445\u0430 \u0442\u044b\u043b\u0430" },
		{ code: "cu",            text: "\u0421\u043b\u043e\u0432\u0463\u0301\u043d\u044c\u0441\u043a\u044a \/ \u2c14\u2c0e\u2c11\u2c02\u2c21\u2c10\u2c20\u2c14\u2c0d\u2c1f" },
		{ code: "sr-ec",         text: "\u0421\u0440\u043f\u0441\u043a\u0438 (\u045b\u0438\u0440\u0438\u043b\u0438\u0446\u0430)" },
		{ code: "sr",            text: "\u0421\u0440\u043f\u0441\u043a\u0438 \/ Srpski" },
		{ code: "tt-cyrl",       text: "\u0422\u0430\u0442\u0430\u0440\u0447\u0430" },
		{ code: "tt",            text: "\u0422\u0430\u0442\u0430\u0440\u0447\u0430\/Tatar\u00e7a" },
		{ code: "tg",            text: "\u0422\u043e\u04b7\u0438\u043a\u04e3" },
		{ code: "tg-cyrl",       text: "\u0422\u043e\u04b7\u0438\u043a\u04e3" },
		{ code: "tyv",           text: "\u0422\u044b\u0432\u0430 \u0434\u044b\u043b" },
		{ code: "udm",           text: "\u0423\u0434\u043c\u0443\u0440\u0442" },
		{ code: "uk",            text: "\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430" },
		{ code: "xal",           text: "\u0425\u0430\u043b\u044c\u043c\u0433" },
		{ code: "cv",            text: "\u0427\u04d1\u0432\u0430\u0448\u043b\u0430" },
		{ code: "myv",           text: "\u042d\u0440\u0437\u044f\u043d\u044c" },
		{ code: "kk",            text: "\u049a\u0430\u0437\u0430\u049b\u0448\u0430" },
		{ code: "hy",            text: "\u0540\u0561\u0575\u0565\u0580\u0565\u0576" },
		{ code: "yi",            text: "\u05d9\u05d9\u05b4\u05d3\u05d9\u05e9" },
		{ code: "he",            text: "\u05e2\u05d1\u05e8\u05d9\u05ea" },
		{ code: "ug-arab",       text: "\u0626\u06c7\u064a\u063a\u06c7\u0631\u0686\u06d5" },
		{ code: "ur",            text: "\u0627\u0631\u062f\u0648" },
		{ code: "ar",            text: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" },
		{ code: "bqi",           text: "\u0628\u062e\u062a\u064a\u0627\u0631\u064a" },
		{ code: "bcc",           text: "\u0628\u0644\u0648\u0686\u06cc \u0645\u06a9\u0631\u0627\u0646\u06cc" },
		{ code: "sd",            text: "\u0633\u0646\u068c\u064a" },
		{ code: "fa",            text: "\u0641\u0627\u0631\u0633\u06cc" },
		{ code: "arz",           text: "\u0645\u0635\u0631\u0649" },
		{ code: "mzn",           text: "\u0645\u064e\u0632\u0650\u0631\u0648\u0646\u064a" },
		{ code: "ha",            text: "\u0647\u064e\u0648\u064f\u0633\u064e" },
		{ code: "pnb",           text: "\u067e\u0646\u062c\u0627\u0628\u06cc" },
		{ code: "ps",            text: "\u067e\u069a\u062a\u0648" },
		{ code: "glk",           text: "\u06af\u06cc\u0644\u06a9\u06cc" },
		{ code: "arc",           text: "\u0710\u072a\u0721\u071d\u0710" },
		{ code: "dv",            text: "\u078b\u07a8\u0788\u07ac\u0780\u07a8\u0784\u07a6\u0790\u07b0" },
		{ code: "ks",            text: "\u0915\u0936\u094d\u092e\u0940\u0930\u0940 - (\u0643\u0634\u0645\u064a\u0631\u064a)" },
		{ code: "new",           text: "\u0928\u0947\u092a\u093e\u0932 \u092d\u093e\u0937\u093e" },
		{ code: "ne",            text: "\u0928\u0947\u092a\u093e\u0932\u0940" },
		{ code: "pi",            text: "\u092a\u093e\u093f\u0934" },
		{ code: "hif-deva",      text: "\u092b\u093c\u0940\u091c\u0940 \u0939\u093f\u0928\u094d\u0926\u0940" },
		{ code: "bh",            text: "\u092d\u094b\u091c\u092a\u0941\u0930\u0940" },
		{ code: "mr",            text: "\u092e\u0930\u093e\u0920\u0940" },
		{ code: "mai",           text: "\u092e\u0948\u0925\u093f\u0932\u0940" },
		{ code: "sa",            text: "\u0938\u0902\u0938\u094d\u0915\u0943\u0924" },
		{ code: "hi",            text: "\u0939\u093f\u0928\u094d\u0926\u0940" },
		{ code: "as",            text: "\u0985\u09b8\u09ae\u09c0\u09af\u09bc\u09be" },
		{ code: "bpy",           text: "\u0987\u09ae\u09be\u09b0 \u09a0\u09be\u09b0\/\u09ac\u09bf\u09b7\u09cd\u09a3\u09c1\u09aa\u09cd\u09b0\u09bf\u09af\u09bc\u09be \u09ae\u09a3\u09bf\u09aa\u09c1\u09b0\u09c0" },
		{ code: "bn",            text: "\u09ac\u09be\u0982\u09b2\u09be" },
		{ code: "pa",            text: "\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40" },
		{ code: "gu",            text: "\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0" },
		{ code: "or",            text: "\u0b13\u0b21\u0b3c\u0b3f\u0b06" },
		{ code: "ta",            text: "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd" },
		{ code: "te",            text: "\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41" },
		{ code: "sma",           text: "\u00c5arjelsaemien" },
		{ code: "kn",            text: "\u0c95\u0ca8\u0ccd\u0ca8\u0ca1" },
		{ code: "tcy",           text: "\u0ca4\u0cc1\u0cb3\u0cc1" },
		{ code: "ml",            text: "\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02" },
		{ code: "si",            text: "\u0dc3\u0dd2\u0d82\u0dc4\u0dbd" },
		{ code: "th",            text: "\u0e44\u0e17\u0e22" },
		{ code: "lo",            text: "\u0ea5\u0eb2\u0ea7" },
		{ code: "dz",            text: "\u0f47\u0f7c\u0f44\u0f0b\u0f41" },
		{ code: "bo",            text: "\u0f56\u0f7c\u0f51\u0f0b\u0f61\u0f72\u0f42" },
		{ code: "my",            text: "\u1019\u103c\u1014\u103a\u1019\u102c\u1018\u102c\u101e\u102c" },
		{ code: "cs",            text: "\u010cesky" },
		{ code: "xmf",           text: "\u10db\u10d0\u10e0\u10d2\u10d0\u10da\u10e3\u10e0\u10d8" },
		{ code: "ka",            text: "\u10e5\u10d0\u10e0\u10d7\u10e3\u10da\u10d8" },
		{ code: "ti",            text: "\u1275\u130d\u122d\u129b" },
		{ code: "am",            text: "\u12a0\u121b\u122d\u129b" },
		{ code: "chr",           text: "\u13e3\u13b3\u13a9" },
		{ code: "ike-cans",      text: "\u1403\u14c4\u1483\u144e\u1450\u1466" },
		{ code: "iu",            text: "\u1403\u14c4\u1483\u144e\u1450\u1466\/inuktitut" },
		{ code: "km",            text: "\u1797\u17b6\u179f\u17b6\u1781\u17d2\u1798\u17c2\u179a" },
		{ code: "bat-smg",       text: "\u017demait\u0117\u0161ka" },
		{ code: "bug",           text: "\u1a05\u1a14 \u1a15\u1a18\u1a01\u1a17" },
		{ code: "grc",           text: "\u1f08\u03c1\u03c7\u03b1\u03af\u03b1 \u1f11\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u1f74" },
		{ code: "ku-latn",       text: "\u202aKurd\u00ee (lat\u00een\u00ee)\u202c" },
		{ code: "kk-tr",         text: "\u202aQazaq\u015fa (T\u00fcrk\u00efya)\u202c" },
		{ code: "kk-latn",       text: "\u202aQazaq\u015fa (lat\u0131n)\u202c" },
		{ code: "crh-latn",      text: "\u202aQ\u0131r\u0131mtatarca (Latin)\u202c" },
		{ code: "crh-cyrl",      text: "\u202a\u041a\u044a\u044b\u0440\u044b\u043c\u0442\u0430\u0442\u0430\u0440\u0434\u0436\u0430 (\u041a\u0438\u0440\u0438\u043b\u043b)\u202c" },
		{ code: "kk-cyrl",       text: "\u202a\u049a\u0430\u0437\u0430\u049b\u0448\u0430 (\u043a\u0438\u0440\u0438\u043b)\u202c" },
		{ code: "kk-kz",         text: "\u202a\u049a\u0430\u0437\u0430\u049b\u0448\u0430 (\u049a\u0430\u0437\u0430\u049b\u0441\u0442\u0430\u043d)\u202c" },
		{ code: "kk-arab",       text: "\u202b\u0642\u0627\u0632\u0627\u0642\u0634\u0627 (\u062a\u0674\u0648\u062a\u06d5)\u202c" },
		{ code: "kk-cn",         text: "\u202b\u0642\u0627\u0632\u0627\u0642\u0634\u0627 (\u062c\u06c7\u0646\u06af\u0648)\u202c" },
		{ code: "ku-arab",       text: "\u202b\u0643\u0648\u0631\u062f\u064a (\u0639\u06d5\u0631\u06d5\u0628\u06cc)\u202c" },
		{ code: "zh",            text: "\u4e2d\u6587" },
		{ code: "zh-cn",         text: "\u4e2d\u6587(\u4e2d\u56fd\u5927\u9646)" },
		{ code: "zh-tw",         text: "\u4e2d\u6587(\u53f0\u7063)" },
		{ code: "zh-sg",         text: "\u4e2d\u6587(\u65b0\u52a0\u5761)" },
		{ code: "zh-mo",         text: "\u4e2d\u6587(\u6fb3\u9580)" },
		{ code: "zh-hans",       text: "\u4e2d\u6587(\u7b80\u4f53)" },
		{ code: "zh-hant",       text: "\u4e2d\u6587(\u7e41\u9ad4)" },
		{ code: "zh-hk",         text: "\u4e2d\u6587(\u9999\u6e2f)" },
		{ code: "zh-my",         text: "\u4e2d\u6587(\u9a6c\u6765\u897f\u4e9a)" },
		{ code: "wuu",           text: "\u5434\u8bed" },
		{ code: "lzh",           text: "\u6587\u8a00" },
		{ code: "zh-classical",  text: "\u6587\u8a00" },
		{ code: "ja",            text: "\u65e5\u672c\u8a9e" },
		{ code: "yue",           text: "\u7cb5\u8a9e" },
		{ code: "zh-yue",        text: "\u7cb5\u8a9e" },
		{ code: "gan",           text: "\u8d1b\u8a9e" },
		{ code: "gan-hant",      text: "\u8d1b\u8a9e(\u7e41\u9ad4)" },
		{ code: "gan-hans",      text: "\u8d63\u8bed(\u7b80\u4f53)" },
		{ code: "ii",            text: "\ua187\ua259" },
		{ code: "ko",            text: "\ud55c\uad6d\uc5b4" },
		{ code: "ko-kp",         text: "\ud55c\uad6d\uc5b4 (\uc870\uc120)" },
		{ code: "got",           text: "\ud800\udf32\ud800\udf3f\ud800\udf44\ud800\udf39\ud800\udf43\ud800\udf3a" }
	],

	/**
	 * cache some useful objects
	 * 1) mostly ready-to-go language HTML menu. When/if we upgrade, make it a jQuery combobox
	 * 2) dict of language code to name -- useful for testing for existence, maybe other things.
	 */
	initialize: function() {
		if ( mw.LanguageUpWiz.initialized ) {
			return;	
		}
		mw.LanguageUpWiz._codes = {};
		var select = $j( '<select/>' );
		$j.each( mw.LanguageUpWiz.languages, function( i, language ) {
			select.append(
				$j( '<option>' )
					.attr( 'value', language.code )
					.append( language.text )
			);
			mw.LanguageUpWiz._codes[language.code] = language.text;
		} );
		mw.LanguageUpWiz.$_select = select;
		mw.LanguageUpWiz.initialized = true;
	},

	/**
	 * Get an HTML select menu of all our languages. 
	 * @param name	desired name of select element
	 * @param code	desired default language code
	 * @return HTML	select element configured as desired
	 */
	getMenu: function( name, code ) {
		mw.LanguageUpWiz.initialize();
		var $select = mw.LanguageUpWiz.$_select.clone();
		$select.attr( 'name', name );
		if ( code === mw.LanguageUpWiz.UNKNOWN ) {
			// n.b. MediaWiki LanguageHandler has ability to add custom label for 'Unknown'; possibly as pseudo-label
			$select.prepend( $j( '<option>' ).attr( 'value', mw.LanguageUpWiz.UNKNOWN ).append( gM( 'mwe-upwiz-code-unknown' )) );
			$select.val( mw.LanguageUpWiz.UNKNOWN );
		} else if ( code !== undefined ) {
			$select.val( mw.LanguageUpWiz.getClosest( code ));
		}
		return $select.get( 0 );
	},

	/** 
 	 * Figure out the closest language we have to a supplied language code.
	 * It seems that people on Mediawiki set their language code as freetext, and it could be anything, even
	 * variants we don't have a record for, or ones that are not in any ISO standard.
	 *
	 * Logic copied from MediaWiki:LanguageHandler.js 
	 * handle null cases, special cases for some Chinese variants
	 * Otherwise, if handed "foo-bar-baz" language, try to match most specific language,
	 *    "foo-bar-baz", then "foo-bar", then "foo"
	 *
	 * @param code 	A string representing a language code, which we may or may not have. 
	 *		Expected to be separated with dashes as codes from ISO 639, e.g. "zh-tw" for Chinese ( Traditional )
	 * @return a language code which is close to the supplied parameter, or fall back to mw.LanguageUpWiz.defaultCode
	 */
	getClosest: function( code ) {
		mw.LanguageUpWiz.initialize();
		if ( typeof ( code ) != 'string' || code === null || code.length === 0 ) {
			return mw.LanguageUpWiz.defaultCode;
		}
    		if ( code == 'nan' || code == 'minnan' ) {
			return 'zh-min-nan';
		} else if ( mw.LanguageUpWiz._codes[code] !== undefined ) {
			return code;					
		} 
		return mw.LanguageUpWiz.getClosest( code.substring( 0, code.indexOf( '-' )) );
	}


	// enhance a simple text input to be an autocompleting language menu
	// this will work when/if we move to jQuery 1.4. As of now the autocomplete is too underpowered for our needs without
	// serious hackery
	/* 
	$j.fn.languageMenu = function( options ) {
		var _this = this;
		_this.autocomplete( null, {
			minChars: 0,
			width: 310,
			selectFirst: true, 
			autoFill: true,
			mustMatch: true,
			matchContains: false,
			highlightItem: true,
			scroll: true,
			scrollHeight: 220,
			formatItem: function( row, i, max, term ) {
				return row.code + " " + row.code;
			},
			formatMatch: function( row, i, max, term ) {
				return row.code + " " + row.code;
			},
			formatResult: function( row ) {
				return row.code;
			}
		}, mw.Languages );

		// and add a dropdown so we can see the thingy, too 
		return _this;
	};
	*/

	// XXX the concept of "internal language" exists in UploadForm.js -- seems to be how they handled i18n, with 
	// language codes that has underscores rather than dashes, ( "en_gb" rather than the correct "en-gb" ).
	// although other info such as Information boxes was recorded correctly.	
	// This is presumed not to apply to the shiny new world of JS2, where i18n is handled in other ways.

};
/**
 * Represents a "transport" for files to upload; in this case an iframe.
 * XXX dubious whether this is really separated from "ApiUploadHandler", which does a lot of form config.
 *
 * The iframe is made to be the target of a form so that the existing page does not reload, even though it's a POST.
 * @param form	jQuery selector for HTML form
 * @param progressCb	callback to execute when we've started. (does not do float here because iframes can't 
 *			  monitor fractional progress).
 * @param transportedCb	callback to execute when we've finished the upload
 */
mw.IframeTransport = function( $form, progressCb, transportedCb ) {
	this.$form = $form;
	this.progressCb = progressCb;
	this.transportedCb = transportedCb;

	this.iframeId = 'f_' + ( $j( 'iframe' ).length + 1 );
	
	//IE only works if you "create element with the name" ( not jquery style )
	var iframe;
	try {
		iframe = document.createElement( '<iframe name="' + this.iframeId + '">' );
	} catch ( ex ) {
		iframe = document.createElement( 'iframe' );
	}
	this.$iframe = $j( iframe );		

	// we configure form on load, because the first time it loads, it's blank
	// then we configure it to deal with an API submission	
	var _this = this;
	this.$iframe.attr( { 'src'   : 'javascript:false;', 
		             'id'    : this.iframeId,
		             'name'  : this.iframeId } )
		    .load( function() { _this.configureForm(); } )
		    .css( 'display', 'none' );

	$j( "body" ).append( iframe ); 
};

mw.IframeTransport.prototype = {
	/**
	 * Configure a form with a File Input so that it submits to the iframe
	 * Ensure callback on completion of upload
	 */
	configureForm: function() {
		mw.log( "configuring form for iframe transport" );
		// Set the form target to the iframe
		this.$form.attr( 'target', this.iframeId );

		// attach an additional handler to the form, so, when submitted, it starts showing the progress
		// XXX this is lame .. there should be a generic way to indicate busy status...
		this.$form.submit( function() { 
			mw.log( "submitting to iframe..." );
			return true;
		} );

		// Set up the completion callback
		var _this = this;
		$j( '#' + this.iframeId ).load( function() {
			mw.log( "received result in iframe" );
			_this.progressCb( 1.0 );
			_this.processIframeResult( $j( this ).get( 0 ) );
		} );			
	},

	/**
	 * Process the result of the form submission, returned to an iframe.
	 * This is the iframe's onload event.
	 *
	 * @param {Element} iframe iframe to extract result from 
	 */
	processIframeResult: function( iframe ) {
		var _this = this;
		var doc = iframe.contentDocument ? iframe.contentDocument : frames[iframe.id].document;
		// Fix for Opera 9.26
		if ( doc.readyState && doc.readyState != 'complete' ) {
			mw.log( "not complete" );
			return;
		}
			
		// Fix for Opera 9.64
		if ( doc.body && doc.body.innerHTML == "false" ) {
			mw.log( "no innerhtml" );
			return;
		}
		var response;
		if ( doc.XMLDocument ) {
			// The response is a document property in IE
			response = doc.XMLDocument;
		} else if ( doc.body ) {
			// Get the json string
			// We're actually searching through an HTML doc here -- 
			// according to mdale we need to do this
			// because IE does not load JSON properly in an iframe
			json = $j( doc.body ).find( 'pre' ).text();
			mw.log( 'iframe:json::' + json );
			if ( json ) {
				response = window["eval"]( "( " + json + " )" );
			} else {
				response = {};
			}
		} else {
			// Response is a xml document
			response = doc;
		}
		// Process the API result
		_this.transportedCb( response );
	}
};


/**
 * An attempt to refactor out the stuff that does API-via-iframe transport
 * In the hopes that this will eventually work for AddMediaWizard too
 */

// n.b. if there are message strings, or any assumption about HTML structure of the form.
// then we probably did it wrong

/**
 * Represents an object which configures a form to upload its files via an iframe talking to the MediaWiki API.
 * @param an UploadInterface object, which contains a .form property which points to a real HTML form in the DOM
 */
mw.ApiUploadHandler = function( upload, api ) {
	this.upload = upload;
	this.api = api;
	this.$form = $j( this.upload.ui.form );
	this.configureForm();

	// the Iframe transport is hardcoded for now because it works everywhere
	// can also use Xhr Binary depending on browser
	var _this = this;
	this.transport = new mw.IframeTransport(
		this.$form,
		function( fraction ){ _this.upload.setTransportProgress( fraction ); },
		function( result ) { _this.upload.setTransported( result ); }
	);

};

mw.ApiUploadHandler.prototype = {
	/**
	 * Configure an HTML form so that it will submit its files to our transport (an iframe)
	 * with proper params for the API
	 * @param callback
	 */
	configureForm: function() {
		var _this = this;
		mw.log( "configuring form for Upload API" );

		// Set the form action
		try {
			this.$form.attr( { 
				action: _this.api.url,
				method: 'POST',
				enctype: 'multipart/form-data' 
			} );
		} catch ( e ) {
			alert( "oops, form modification didn't work in ApiUploadHandler" );
			mw.log( "IE for some reason error's out when you change the action" );
			// well, if IE fucks this up perhaps we should do something to make sure it writes correctly
			// from the outset?
		}

		_this.addFormInputIfMissing( 'action', 'upload' );

		// force stash
		_this.addFormInputIfMissing( 'stash', 1 );

		// XXX TODO - remove; if we are uploading to stash only, a comment should not be required - yet.
		_this.addFormInputIfMissing( 'comment', 'DUMMY TEXT' );
		
		// we use JSON in HTML because according to mdale, some browsers cannot handle just JSON
		_this.addFormInputIfMissing( 'format', 'jsonfm' );
		
		// XXX only for testing, so it stops complaining about dupes
		/*
		if ( mw.UploadWizard.DEBUG ) {
			_this.addFormInputIfMissing( 'ignorewarnings', '1' );
		}
		*/
	},

	/** 
	 * Modify our form to have a fresh edit token.
	 * If successful, return true to a callback.
	 * @param callback to return true on success
	 */
	configureEditToken: function( callerOk, err ) {
		var _this = this;

		var ok = function( token ) { 
			_this.addFormInputIfMissing( 'token', token );
			callerOk();
		};

		_this.api.getEditToken( ok, err );
	},

	/**
	 * Add a hidden input to a form  if it was not already there.
	 * @param name  the name of the input
	 * @param value the value of the input
	 */
	addFormInputIfMissing: function( name, value ) {
		if ( this.$form.find( "[name='" + name + "']" ).length === 0 ) {
			this.$form.append( $j( '<input />' ) .attr( { 'type': "hidden", 'name': name, 'value': value } ));
		}		
	},

	/**
	 * Kick off the upload!
	 */
	start: function() {
		var _this = this;
		var ok = function() {
			mw.log( "api: upload start!" );
			_this.beginTime = ( new Date() ).getTime();
			_this.upload.ui.busy();
			_this.$form.submit();
		};
		var err = function( code, info ) {
			_this.upload.setFailed( code, info );
		}; 
		this.configureEditToken( ok, err );
	}
};



/**
 * Object to attach to a file name input, to be run on its change() event
 * Largely derived from wgUploadWarningObj in old upload.js
 * Perhaps this could be a jQuery ext
 * @param options   dictionary of options 
 *		selector  required, the selector for the input to check
 * 		processResult   required, function to execute on results. accepts two args:
 *			1) filename that invoked this request -- should check if this is still current filename
 *			2) an object with the following fields
 *				isUnique: boolean
 *				img: thumbnail image src (if not unique)
 *				href: the url of the full image (if not unique)
 *				title: normalized title of file (if not unique)
 * 		spinner   required, closure to execute to show progress: accepts true to start, false to stop
 * 		apiUrl    optional url to call for api. falls back to local api url
 * 		delay     optional how long to delay after a change in ms. falls back to configured default
 *		preprocess optional: function to apply to the contents of selector before testing
 *		events 	  what events on the input trigger a check.
 */ 
mw.DestinationChecker = function( options ) {

	var _this = this;
	_this.selector = options.selector;		
	_this.spinner = options.spinner;
	_this.processResult = options.processResult;
	_this.api = options.api;

	$j.each( ['preprocess', 'delay', 'events'], function( i, option ) {
		if ( options[option] ) {
			_this[option] = options[option];
		}
	} );


	// initialize!

	var check = _this.getDelayedChecker();
	
	$j.each( _this.events, function(i, eventName) {
		$j( _this.selector )[eventName]( check );
	} );

};

mw.DestinationChecker.prototype = {

	// events that the input undergoes which fire off a check
	events: [ 'change', 'keyup' ],

	// how long the input muse be "idle" before doing call (don't want to check on each key press)
	delay: 500, // ms;

	// what tracks the wait
	timeoutId: null,

	// cached results from api calls
	cachedResult: {},

	/**
	 * There is an option to preprocess the name (in order to perhaps convert it from
	 * title to path, e.g. spaces to underscores, or to add the "File:" part.) Depends on 
	 * exactly what your input field represents.
	 * In the event that the invoker doesn't supply a name preprocessor, use this identity function
	 * as default
	 *
	 * @param something
	 * @return that same thing
	 */
	preprocess: function(x) { return x; },

	/**
	 * fire when the input changes value or keypress
	 * will trigger a check of the name if the field has been idle for delay ms.
	 */	
	getDelayedChecker: function() {
		var checker = this;
		return function() {
			var el = this; // but we don't use it, since we already have it in _this.selector

			// if we changed before the old timeout ran, clear that timeout.
			if ( checker.timeoutId ) {
				window.clearTimeout( checker.timeoutId );
			}

			// and start another, hoping this time we'll be idle for delay ms.	
			checker.timeoutId = window.setTimeout( 
				function() { checker.checkUnique(); },
				checker.delay 
			);
		};
	},

	/**
  	 * Get the current value of the input, with optional preprocessing
	 * @return the current input value, with optional processing
	 */
	getTitle: function() {
		return this.preprocess( $j( this.selector ).val() );
	},

	/**
	 * Async check if a filename is unique. Can be attached to a field's change() event
	 * This is a more abstract version of AddMedia/UploadHandler.js::doDestCheck
	 */
	checkUnique: function() {
		var _this = this;

		var found = false;
		// XXX if input is empty don't bother? but preprocess gives us File:.png...
		var title = _this.getTitle();
		
		if ( _this.cachedResult[name] !== undefined ) {
			_this.processResult( _this.cachedResult[name] );
			return;
		} 

		// set the spinner to spin
		_this.spinner( true );
		
		// Setup the request -- will return thumbnail data if it finds one
		// XXX do not use iiurlwidth as it will create a thumbnail
		var params = {
			'titles': title,
			'prop':  'imageinfo',
			'iiprop': 'url|mime|size',
			'iiurlwidth': 150
		};

		// Do the destination check  
		_this.api.get( params, function( data ) {			
			// Remove spinner
			_this.spinner( false );
	
			// if the name's changed in the meantime, our result is useless
			if ( title != _this.getTitle() ) {
				return;
			}
			
			if ( !data || !data.query || !data.query.pages ) {
				// Ignore a null result
				mw.log(" No data in checkUnique result");
				return;
			}

			var result = undefined;

			if ( data.query.pages[-1] ) {
				// No conflict found; this file name is unique
				mw.log(" No pages in checkUnique result");
				result = { isUnique: true };

			} else {

				for ( var page_id in data.query.pages ) {
					if ( !data.query.pages[ page_id ].imageinfo ) {
						continue;
					}

					// Conflict found, this filename is NOT unique
					mw.log( " conflict! " );

					var ntitle;
					if ( data.query.normalized ) {
						ntitle = data.query.normalized[0].to;
					} else {
						ntitle = data.query.pages[ page_id ].title;
					}

					var img = data.query.pages[ page_id ].imageinfo[0];

					result = {
						isUnique: false,	
						img: img,
						title: ntitle,
						href : img.descriptionurl
					};

					break;
				}
			}

			if ( result !== undefined ) {
				_this.cachedResult[title] = result;
				_this.processResult( result );
			}

		} );
	}

};


/** 
 * jQuery extension to make a field upload-checkable
 */
( function ( $ ) {
	$.fn.destinationChecked = function( options ) {
		var _this = this;
		options.selector = _this;
		var checker = new mw.DestinationChecker( options );
		// this should really be done with triggers
		_this.checkUnique = function() { checker.checkUnique(); }; 
		return _this;
	}; 
} )( jQuery );
/**
 * Miscellaneous utilities
 */
mw.UploadWizardUtil = {

	/**
	 * Simple 'more options' toggle that opens more of a form.
	 *
	 * @param toggleDiv the div which has the control to open and shut custom options
	 * @param moreDiv the div containing the custom options
	 */
	makeToggler: function ( toggleDiv, moreDiv ) {
		var $toggleLink = $j( '<a>' )
		   	.addClass( 'mwe-upwiz-toggler mwe-upwiz-more-options' )
			.append( gM( 'mwe-upwiz-more-options' ) );
		$j( toggleDiv ).append( $toggleLink );


		var toggle = function( open ) {
			if ( typeof open === 'undefined' ) {
				open = ! ( $j( this ).data( 'open' ) ) ;
			}
			$j( this ).data( 'open', open );
			if ( open ) {
				moreDiv.maskSafeShow();
				/* when open, show control to close */
				$toggleLink.html( gM( 'mwe-upwiz-fewer-options' ) );
				$toggleLink.addClass( "mwe-upwiz-toggler-open" );
			} else {
				moreDiv.maskSafeHide();
				/* when closed, show control to open */
				$toggleLink.html( gM( 'mwe-upwiz-more-options' ) );
				$toggleLink.removeClass( "mwe-upwiz-toggler-open" );
			}
		};

		toggle(false);

		$toggleLink.click( function( e ) { e.stopPropagation(); toggle(); } );
		
		$j( moreDiv ).addClass( 'mwe-upwiz-toggled' );
	},

	/**
	 * remove an item from an array. Tests for === identity to remove the item
	 *  XXX the entire rationale for this function may be wrong. 
	 *  XXX The jQuery way would be to query the DOM for objects, not to keep a separate array hanging around
	 * @param items  the array where we want to remove an item
	 * @param item	 the item to remove
	 */
	removeItem: function( items, item ) {
		for ( var i = 0; i < items.length; i++ ) {
			if ( items[i] === item ) {
				items.splice( i, 1 );
				break;
			}
		}
	},

/*
	/** 
	 * Capitalise first letter and replace spaces by underscores
	 * @param filename (basename, without directories)
	 * @return typical title as would appear on MediaWiki
	 /
	pathToTitle: function ( filename ) {
		return mw.ucfirst( $j.trim( filename ).replace(/ /g, '_' ) );
	},

	/** 
	 * Capitalise first letter and replace underscores by spaces
	 * @param title typical title as would appear on MediaWiki
	 * @return plausible local filename
	 /
	titleToPath: function ( title ) {
		return mw.ucfirst( $j.trim( title ).replace(/_/g, ' ' ) );
	},


	/**
	 * Transform "File:title_with_spaces.jpg" into "title with spaces"
	 * @param   typical title that would appear on mediawiki, with File: and extension, may include underscores
	 * @return  human readable title
	 /
	fileTitleToHumanTitle: function( title ) {
		var extension = mw.UploadWizardUtil.getExtension( title );
		if ( typeof extension !== 'undefined' ) {
			// the -1 is to get the '.'
			title = title.substr( 0, title.length - extension.length - 1 );
		}
		// usually File:
		var namespace = wgFormattedNamespaces[wgNamespaceIds['file']];
		if ( title.indexOf( namespace + ':' ) === 0 ) {
			title = title.substr( namespace.length + 1 );
		}
		return mw.UploadWizardUtil.titleToPath( title );
	},

*/
	/**
	 * Get the basename of a path.
	 * For error conditions, returns the empty string.
	 *
	 * @param {String} path
	 * @return {String} basename
	 */
	getBasename: function( path ) {
		if ( !mw.isDefined( path ) || path === null ) {
			return '';
		}
		
	 	// find index of last path separator in the path, add 1. (If no separator found, yields 0)
		// then take the entire string after that.
		return path.substr( Math.max( path.lastIndexOf( '/' ), path.lastIndexOf( '\\' ) ) + 1 );
 	},



	/**
	 * Last resort to guess a proper extension
	 */
	mimetypeToExtension: {
		'image/jpeg': 'jpg',
		'image/gif': 'gif'
		// fill as needed
	}


};


/**
 * this is a progress bar for monitoring multiple objects, giving summary view
 */
mw.GroupProgressBar = function( selector, text, uploads, endState, progressProperty, weightProperty ) {
	var _this = this;

	// XXX need to figure out a way to put text inside bar
	_this.$selector = $j( selector );
	_this.$selector.html( 
		'<div class="mwe-upwiz-progress">'
		+   '<div class="mwe-upwiz-progress-bar-etr-container">'
		+     '<div class="mwe-upwiz-progress-bar-etr" style="display: none">'
		+       '<div class="mwe-upwiz-progress-bar"></div>'
		+       '<div class="mwe-upwiz-etr"></div>'
		+     '</div>'
		+   '</div>'
		+   '<div class="mwe-upwiz-count"></div>'
		+ '</div>'
	);

	_this.$selector.find( '.mwe-upwiz-progress-bar' ).progressbar( { value : 0 } );

	_this.uploads = uploads;
	_this.endState = endState;
	_this.progressProperty = progressProperty;
	_this.weightProperty = weightProperty;
	_this.beginTime = undefined;

};

mw.GroupProgressBar.prototype = {

	/**
	 * Show the progress bar with a slideout motion
         */
	showBar: function() {
		this.$selector.find( '.mwe-upwiz-progress-bar-etr' ).fadeIn( 200 );
	},

	/** 
	 * loop around the uploads, summing certain properties for a weighted total fraction
	 */
	start: function() {
		var _this = this;

		var totalWeight = 0.0;
		$j.each( _this.uploads, function( i, upload ) {
			totalWeight += upload[_this.weightProperty];
		} );

		_this.setBeginTime();
		var shown = false;

		var displayer = function() {	
			var fraction = 0.0;
			var endStateCount = 0;
			var hasData = false;
			$j.each( _this.uploads, function( i, upload ) {
				if ( upload.state == _this.endState ) {
					endStateCount++;
				}
				if (upload[_this.progressProperty] !== undefined) {
					fraction += upload[_this.progressProperty] * ( upload[_this.weightProperty] / totalWeight );
					if (upload[_this.progressProperty] > 0 ) {
						hasData = true;
					}
				}
			} );
			//mw.log( 'hasdata:' + hasData + ' endstatecount:' + endStateCount );
			// sometimes, the first data we have just tells us that it's over. So only show the bar
			// if we have good data AND the fraction is less than 1.
			if ( hasData && fraction < 1.0 ) {
				if ( ! shown ) {
					_this.showBar();
					shown = true;
				}
				_this.showProgress( fraction );
			}
			_this.showCount( endStateCount );

			if ( endStateCount < _this.uploads.length ) {
				setTimeout( displayer, 200 );
			} else {
				_this.showProgress( 1.0 );
				// not necessary to hide bar since we're going to the next step.
				/* setTimeout( function() { _this.hideBar(); }, 500 ); */
			}
		};
		displayer();
	},


	/**
	 * Hide the progress bar with a slideup motion
	 */
	hideBar: function() {
		this.$selector.find( '.mwe-upwiz-progress-bar-etr' ).fadeOut( 200 );
	},
	
	/**
	 * sets the beginning time (useful for figuring out estimated time remaining)
	 * if time parameter omitted, will set beginning time to now
	 *
	 * @param time  optional; the time this bar is presumed to have started (epoch milliseconds)
	 */ 
	setBeginTime: function( time ) {
		this.beginTime = time ? time : ( new Date() ).getTime();
	},


	/**
	 * Show overall progress for the entire UploadWizard
	 * The current design doesn't have individual progress bars, just one giant one.
	 * We did some tricky calculations in startUploads to try to weight each individual file's progress against 
	 * the overall progress.
	 * @param fraction the amount of whatever it is that's done whatever it's done
	 */
	showProgress: function( fraction ) {
		var _this = this;

		_this.$selector.find( '.mwe-upwiz-progress-bar' ).progressbar( 'value', parseInt( fraction * 100, 10 ) );

		var remainingTime = _this.getRemainingTime( fraction );
		
		if ( remainingTime !== null ) {
			var t = mw.seconds2Measurements( parseInt( remainingTime / 1000, 10 ) );
			var timeString;
			if (t.hours === 0) {
				if (t.minutes === 0) {
					if (t.seconds === 0) { 
						timeString = gM( 'mwe-upwiz-finished' );
					} else {
						timeString = gM( 'mwe-upwiz-secs-remaining', t.seconds );
					}
				} else {
					timeString = gM( 'mwe-upwiz-mins-secs-remaining', t.minutes, t.seconds );
				}
			} else {
				timeString = gM( 'mwe-upwiz-hrs-mins-secs-remaining', t.hours, t.minutes, t.seconds );
			}
			_this.$selector.find( '.mwe-upwiz-etr' ).html( timeString );
		}
	},

	/**
	 * Calculate remaining time for all uploads to complete.
	 * 
	 * @param fraction	fraction of progress to show
	 * @return 		estimated time remaining (in milliseconds)
	 */
	getRemainingTime: function ( fraction ) {
		var _this = this;
		if ( _this.beginTime ) {
			var elapsedTime = ( new Date() ).getTime() - _this.beginTime;
			if ( fraction > 0.0 && elapsedTime > 0 ) { // or some other minimums for good data
				var rate = fraction / elapsedTime;
				return parseInt( ( 1.0 - fraction ) / rate, 10 ); 
			}
		}
		return null;
	},


	/**
	 * Show the overall count as we upload
	 * @param count  -- the number of items that have done whatever has been done e.g. in "uploaded 2 of 5", this is the 2
	 */
	showCount: function( count ) {
		var _this = this;
		_this.$selector
			.find( '.mwe-upwiz-count' )
			.html( gM( 'mwe-upwiz-upload-count', [ count, _this.uploads.length ] ) );
	}


};


/**
 * Sort of an abstract class for deeds
 */
( function( $j ) {
	
mw.UploadWizardDeed = function() {
	var _this = this;
	// prevent from instantiating directly?
	return false;
};

mw.UploadWizardDeed.prototype = {
	valid: function() {
		return false;
	},

	setFormFields: function() { },
	
	getSourceWikiText: function() {
		return $j( this.sourceInput ).val();
	},

	getAuthorWikiText: function() {
		return $j( this.authorInput ).val(); 
	},

	/**
	 * Get wikitext representing the licenses selected in the license object
	 * @return wikitext of all applicable license templates.
	 */
	getLicenseWikiText: function() {
		var _this = this;
		var wikiText = ''; 
		$j.each ( _this.licenseInput.getTemplates(), function( i, template ) {
			wikiText += "{{" + template + "}}\n";
		} );
	
		return wikiText;
	}

};


mw.UploadWizardNullDeed = $j.extend( new mw.UploadWizardDeed(), {
	valid: function() {
		return false;
	} 
} );

	
/**
 * Set up the form and deed object for the deed option that says these uploads are all the user's own work.
 * XXX these deeds are starting to turn into jquery fns
 */
mw.UploadWizardDeedOwnWork = function( uploadCount ) {
	uploadCount = uploadCount ? uploadCount : 1;

	var _this = new mw.UploadWizardDeed();

	_this.authorInput = $j( '<input />')
		.attr( { name: "author", type: "text" } )
		.addClass( 'mwe-upwiz-sign' );

	var licenseInputDiv = $j( '<div class="mwe-upwiz-deed-license"></div>' );
	_this.licenseInput = new mw.UploadWizardLicenseInput( licenseInputDiv );
	_this.licenseInput.setDefaultValues();

	return $j.extend( _this, { 

		name: 'ownwork',

		/**
		 * Is this correctly set, with side effects of causing errors to show in interface. 
		 * @return boolean true if valid, false if not
		 */
		valid: function() {
			// n.b. valid() has side effects and both should be called every time the function is called.
			// do not short-circuit.
			var formValid = _this.$form.valid();
			var licenseInputValid = _this.licenseInput.valid();
			return formValid && licenseInputValid; 
		},

		getSourceWikiText: function() {
			return '{{own}}';
		},

		// XXX do we need to escape authorInput, or is wikitext a feature here?
		// what about scripts?
		getAuthorWikiText: function() {
			return "[[User:" + mw.UploadWizard.config[ 'userName' ] + '|' + $j( _this.authorInput ).val() + ']]';
		},


		getLicenseWikiText: function() {
			var wikiText = '{{self';
			$j.each( _this.licenseInput.getTemplates(), function( i, template ) {
				wikiText += '|' + template;
			} );
			wikiText += '}}';
			return wikiText;
		},

		setFormFields: function( $selector ) {
			_this.$selector = $selector;

			_this.$form = $j( '<form/>' );

			var $standardDiv = $j( '<div />' ).append(
				$j( '<label for="author2" generated="true" class="mwe-validator-error" style="display:block;"/>' ),
				$j( '<p>' )
					.html( gM( 'mwe-upwiz-source-ownwork-assert',
						   uploadCount,
						   '<span class="mwe-standard-author-input"></span>' )
					),
				$j( '<p class="mwe-small-print" />' ).append( gM( 'mwe-upwiz-source-ownwork-assert-note' ) )
			); 
			$standardDiv.find( '.mwe-standard-author-input' ).append( $j( '<input name="author2" type="text" class="mwe-upwiz-sign" />' ) );
			
			var $customDiv = $j('<div/>').append( 
				$j( '<label for="author" generated="true" class="mwe-validator-error" style="display:block;"/>' ),
				$j( '<p>' )
					.html( gM( 'mwe-upwiz-source-ownwork-assert-custom', 
						uploadCount,
						'<span class="mwe-custom-author-input"></span>' ) ),
				licenseInputDiv
			);
			// have to add the author input this way -- gM() will flatten it to a string and we'll lose it as a dom object
			$customDiv.find( '.mwe-custom-author-input' ).append( _this.authorInput );


			var $crossfader = $j( '<div>' ).append( $standardDiv, $customDiv );
			var $toggler = $j( '<p class="mwe-more-options" style="text-align: right" />' )
				.append( $j( '<a />' )
					.append( gM( 'mwe-upwiz-license-show-all' ) )
					.click( function() {
						_this.formValidator.resetForm();
						if ( $crossfader.data( 'crossfadeDisplay' ) === $customDiv ) {
							_this.licenseInput.setDefaultValues();
							$crossfader.morphCrossfade( $standardDiv );
							$j( this ).html( gM( 'mwe-upwiz-license-show-all' ) );
						} else {
							$crossfader.morphCrossfade( $customDiv );
							$j( this ).html( gM( 'mwe-upwiz-license-show-recommended' ) );
						}
					} ) );

			var $formFields = $j( '<div class="mwe-upwiz-deed-form-internal" />' )
				.append( $crossfader, $toggler );
			

			// synchronize both username signatures
			// set initial value to configured username
			// if one changes all the others change (keyup event)
			//
			// also set tooltips ( the title, tipsy() )
			$formFields.find( '.mwe-upwiz-sign' )
				.attr( {
					title: gM( 'mwe-upwiz-tooltip-sign' ), 
					value: mw.UploadWizard.config[  'userName'  ] 
				} )
				.tipsyPlus()
				.keyup( function() { 
					var thisInput = this;
					var thisVal = $j( thisInput ).val();
					$j.each( $formFields.find( '.mwe-upwiz-sign' ), function( i, input ) {
						if (thisInput !== input) {
							$j( input ).val( thisVal );
						}
					} );
				} );

			_this.$form.append( $formFields );
			$selector.append( _this.$form );
			
			// done after added to the DOM, so there are true heights
			$crossfader.morphCrossfader();


			// and finally, make it validatable
			_this.formValidator = _this.$form.validate( {
				rules: {
					author2: {
						required: function( element ) {
							return $crossfader.data( 'crossfadeDisplay' ).get(0) === $standardDiv.get(0);
						},
						minlength: mw.UploadWizard.config[  'minAuthorLength'  ],
						maxlength: mw.UploadWizard.config[  'maxAuthorLength'  ]
					},
					author: {
						required: function( element ) {
							return $crossfader.data( 'crossfadeDisplay' ).get(0) === $customDiv.get(0);
						},
						minlength: mw.UploadWizard.config[  'minAuthorLength'  ],
						maxlength: mw.UploadWizard.config[  'maxAuthorLength'  ]
					}
				},
				messages: {
					author2: {
						required: gM( 'mwe-upwiz-error-signature-blank' ),
						minlength: gM( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config[  'minAuthorLength'  ] ),
						maxlength: gM( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config[  'maxAuthorLength'  ] )
					},
					author: {
						required: gM( 'mwe-upwiz-error-signature-blank' ),
						minlength: gM( 'mwe-upwiz-error-signature-too-short', mw.UploadWizard.config[  'minAuthorLength'  ] ),
						maxlength: gM( 'mwe-upwiz-error-signature-too-long', mw.UploadWizard.config[  'maxAuthorLength'  ] )
					}
				}
			} );
		}


	} );

};

// XXX these deeds are starting to turn into jquery fns
mw.UploadWizardDeedThirdParty = function( uploadCount ) {
	var _this = new mw.UploadWizardDeed();

	_this.uploadCount = uploadCount ? uploadCount : 1;
	_this.sourceInput = $j('<textarea class="mwe-source mwe-long-textarea" name="source" rows="1" cols="40"></textarea>' )
				.growTextArea()
				.attr( 'title', gM( 'mwe-upwiz-tooltip-source' ) )
				.tipsyPlus();
	_this.authorInput = $j('<textarea class="mwe-author mwe-long-textarea" name="author" rows="1" cols="40"></textarea>' )
				.growTextArea()
				.attr( 'title', gM( 'mwe-upwiz-tooltip-author' ) )
				.tipsyPlus();
	licenseInputDiv = $j( '<div class="mwe-upwiz-deed-license"></div>' );
	_this.licenseInput = new mw.UploadWizardLicenseInput( licenseInputDiv );


	return $j.extend( _this, mw.UploadWizardDeed.prototype, {
		name: 'thirdparty',

		setFormFields: function( $selector ) {
			var _this = this;
			_this.$form = $j( '<form/>' );

			var $formFields = $j( '<div class="mwe-upwiz-deed-form-internal"/>' );

			if ( uploadCount > 1 ) { 
				$formFields.append( $j( '<div />' ).append( gM( 'mwe-upwiz-source-thirdparty-custom-multiple-intro' ) ) );
			}

			$formFields.append (
				$j( '<div class="mwe-upwiz-source-thirdparty-custom-multiple-intro" />' ),
				$j( '<label for="source" generated="true" class="mwe-validator-error" style="display:block;"/>' ),
				$j( '<div class="mwe-upwiz-thirdparty-fields" />' )
					.append( $j( '<label for="source"/>' ).text( gM( 'mwe-upwiz-source' ) ), 
						 _this.sourceInput ),
				$j( '<label for="author" generated="true" class="mwe-validator-error" style="display:block;"/>' ),
				$j( '<div class="mwe-upwiz-thirdparty-fields" />' )
					.append( $j( '<label for="author"/>' ).text( gM( 'mwe-upwiz-author' ) ),
						 _this.authorInput ),
				$j( '<div class="mwe-upwiz-thirdparty-license" />' )
					.append( gM( 'mwe-upwiz-source-thirdparty-license', uploadCount ) ),
				licenseInputDiv
			);

			_this.$form.validate( {
				rules: {
					source: { required: true, 
						  minlength: mw.UploadWizard.config[  'minSourceLength'  ],
						  maxlength: mw.UploadWizard.config[  'maxSourceLength'  ] },
					author: { required: true,
						  minlength: mw.UploadWizard.config[  'minAuthorLength'  ],
						  maxlength: mw.UploadWizard.config[  'maxAuthorLength'  ] }
				},
				messages: {
					source: {
						required: gM( 'mwe-upwiz-error-blank' ),
						minlength: gM( 'mwe-upwiz-error-too-short', mw.UploadWizard.config[  'minSourceLength'  ] ),
						maxlength: gM( 'mwe-upwiz-error-too-long', mw.UploadWizard.config[  'maxSourceLength'  ] )
					},
					author: {
						required: gM( 'mwe-upwiz-error-blank' ),
						minlength: gM( 'mwe-upwiz-error-too-short', mw.UploadWizard.config[  'minAuthorLength'  ] ),
						maxlength: gM( 'mwe-upwiz-error-too-long', mw.UploadWizard.config[  'maxAuthorLength'  ] )
					}
				}
			} );

			_this.$form.append( $formFields );			

			$selector.append( _this.$form );
		},

		/**
		 * Is this correctly set, with side effects of causing errors to show in interface. 
		 * this is exactly the same as the ownwork valid() function... hopefully we can reduce these to nothing if we make 
		 * all validators work the same.
		 * @return boolean true if valid, false if not
		 */
		valid: function() {
			// n.b. valid() has side effects and both should be called every time the function is called.
			// do not short-circuit.
			var formValid = _this.$form.valid();
			var licenseInputValid = _this.licenseInput.valid();
			return formValid && licenseInputValid; 
		}
	} );
};




/**
 * @param selector where to put this deed chooser
 * @param isPlural whether this chooser applies to multiple files (changes messaging mostly)
 */ 
mw.UploadWizardDeedChooser = function( selector, deeds, uploadCount ) {
	var _this = this;
	_this.$selector = $j( selector );
	_this.uploadCount = uploadCount ? uploadCount : 1;
	

	_this.$errorEl = $j( '<div class="mwe-error"></div>' );
	_this.$selector.append( _this.$errorEl );

	// name for radio button set
	mw.UploadWizardDeedChooser.prototype.widgetCount++;
	_this.name = 'deedChooser' + mw.UploadWizardDeedChooser.prototype.widgetCount.toString();

	$j.each( deeds, function (i, deed) {
		var id = _this.name + '-' + deed.name;
 
		var $deedInterface = $j( 
			'<div class="mwe-upwiz-deed mwe-upwiz-deed-' + deed.name + '">'
		       +   '<div class="mwe-upwiz-deed-option-title">'
		       +     '<span class="mwe-upwiz-deed-header">'
		       +        '<input id="' + id +'" name="' + _this.name + '" type="radio" value="' + deed.name + '">'
		       +	  '<label for="' + id + '" class="mwe-upwiz-deed-name">'
		       +            gM( 'mwe-upwiz-source-' + deed.name, _this.uploadCount )
		       +          '</label>'
		       +        '</input>'
		       +     '</span>'
		       +   '</div>'
		       +   '<div class="mwe-upwiz-deed-form">'
		       + '</div>'
		);

		var $deedSelector = _this.$selector.append( $deedInterface );

		deed.setFormFields( $deedInterface.find( '.mwe-upwiz-deed-form' ) );

		$deedInterface.find( 'span.mwe-upwiz-deed-header input' ).click( function() {
			if ( $j( this ).is(':checked' )  ) {
				_this.choose( deed );
				_this.showDeed( $deedInterface );
			}
		} );

	} );

	_this.choose( mw.UploadWizardNullDeed );
	_this.showDeedChoice();		
	

};


mw.UploadWizardDeedChooser.prototype = {

	/** 
	 * How many deed choosers there are (important for creating unique ids, element names)
	 */
	widgetCount: 0,

	/** 
	 * Check if this form is filled out correctly, with side effects of showing error messages if invalid
	 * @return boolean; true if valid, false if not
	 */
	valid: function() {
		var _this = this;
		// we assume there is always a deed available, even if it's just the null deed.
		var valid = _this.deed.valid();
		// the only time we need to set an error message is if the null deed is selected.
		// otherwise, we can assume that the widgets have already added error messages.
		if (valid) {
			_this.hideError();
		} else {
			if ( _this.deed === mw.UploadWizardNullDeed ) {			
				_this.showError( gM( 'mwe-upwiz-deeds-need-deed', _this.uploadCount ) );
				$j( _this ).bind( 'chooseDeed', function() {
					_this.hideError();
				} );
			}
		}
		return valid;
	},

	showError: function( error ) {
		this.$errorEl.html( error );
		this.$errorEl.fadeIn();
	},

	hideError: function() {
		this.$errorEl.fadeOut();	
		this.$errorEl.empty();
	},

	/** 
 	 * How many uploads this deed controls
	 */
	uploadCount: 0,

	
	// XXX it's impossible to choose the null deed if we stick with radio buttons, so that may be useless later
	choose: function( deed ) {
		var _this = this;
		_this.deed = deed;
		if ( deed === mw.UploadWizardNullDeed ) {
			$j( _this ).trigger( 'chooseNullDeed' );
			//_this.trigger( 'isNotReady' );
			_this.$selector
				.find( 'input.mwe-accept-deed' )
				.attr( 'checked', false );
		} else {
			$j( _this ).trigger( 'chooseDeed' );
		}
	},

	/**
	 * Go back to original source choice. 
	 */
	showDeedChoice: function() {
		var $allDeeds = this.$selector.find( '.mwe-upwiz-deed' );
		this.deselectDeed( $allDeeds );
		// $allDeeds.fadeTo( 'fast', 1.0 );   //maskSafeShow();
	},

	/** 
	 * From the deed choices, make a choice fade to the background a bit, hide the extended form
	 */
	deselectDeed: function( $deedSelector ) {
		$deedSelector.removeClass( 'selected' );
		// $deedSelector.find( 'a.mwe-upwiz-macro-deeds-return' ).hide();
		$deedSelector.find( '.mwe-upwiz-deed-form' ).slideUp( 500 );   //.maskSafeHide();
	},

	/**
	 * From the deed choice page, show a particular deed
	 */
	showDeed: function( $deedSelector ) {
		var $otherDeeds = $deedSelector.siblings().filter( '.mwe-upwiz-deed' );
		this.deselectDeed( $otherDeeds );
		// $siblings.fadeTo( 'fast', 0.5 ) // maskSafeHide();

		$deedSelector
			.addClass('selected')
			.fadeTo( 'fast', 1.0 )
			.find( '.mwe-upwiz-deed-form' ).slideDown( 500 ); // maskSafeShow(); 
		// $deedSelector.find( 'a.mwe-upwiz-macro-deeds-return' ).show();
	}

};

} )( jQuery );
/**
 * Create a group of checkboxes for licenses. N.b. the licenses are named after the templates they invoke.
 * @param div 
 * @param values  (optional) array of license key names to activate by default
 */

( function( $j ) {
mw.UploadWizardLicenseInput = function( selector, values ) {
	var _this = this;

	var widgetCount = mw.UploadWizardLicenseInput.prototype.count++;
	
	_this.inputs = [];

	// TODO incompatibility check of this license versus others

	_this.$selector = $j( selector );
	_this.$selector.append( $j( '<div class="mwe-error"></div>' ) );

	$j.each( mw.UploadWizard.config[  'licenses'  ], function( i, licenseConfig ) {
		var template = licenseConfig.template;
		var messageKey = licenseConfig.messageKey;
		
		var name = 'license_' + template;
		var id = 'licenseInput' + widgetCount + '_' + name;
		var $input = $j( '<input />' ) 
			.attr( { id: id, name: name, type: 'checkbox', value: template  } )
			// we use the selector because events can't be unbound unless they're in the DOM.
			.click( function() { _this.$selector.trigger( 'changeLicenses' ); } );
		_this.inputs.push( $input );
		_this.$selector.append( 
			$input,
			$j( '<label />' ).attr( { 'for': id } ).html( gM( messageKey ) ),
			$j( '<br/>' )
		);
	} );

	if ( values ) {
		_this.setValues( values );
	}

	return _this;
};

mw.UploadWizardLicenseInput.prototype = {
	count: 0,

	/**
	 * Sets the value(s) of a license input.
	 * @param object of license-key to boolean values, e.g. { cc_by_sa_30: true, gfdl: true }
	 */
	setValues: function( licenseValues ) {
		var _this = this;
		$j.each( _this.inputs, function( i, $input ) {
			var template = $input.val();
			$input.attr( 'checked', ~~!!licenseValues[template] );
		} );
		// we use the selector because events can't be unbound unless they're in the DOM.
		_this.$selector.trigger( 'changeLicenses' );
	},

	/**
	 * Set the default configured licenses
	 */
	setDefaultValues: function() {
		var _this = this;
		var values = {};
		$j.each( mw.UploadWizard.config[  'licenses'  ], function( i, licenseConfig ) {
			values[ licenseConfig.template ] = licenseConfig['default'];
		} );
		_this.setValues( values );
	},

	/**
	 * Gets the templates associated with checked inputs 
	 * @return array of template names
  	 */
	getTemplates: function() {
		return $j( this.inputs )
			.filter( function() { return this.is( ':checked' ); } )
			.map( function() { return this.val(); } );
	},

	/**
	 * Check if a valid value is set, also look for incompatible choices. 
	 * Side effect: if no valid value, add notes to the interface. Add listeners to interface, to revalidate and remove notes.
	 * @return boolean; true if a value set, false otherwise
	 */
	valid: function() {
		var _this = this;
		var isValid = true;

		if ( ! _this.isSet() ) {
			isValid = false;
			errorHtml = gM( 'mwe-upwiz-deeds-need-license' );
		}

		// XXX something goes here for licenses incompatible with each other

		var $errorEl = this.$selector.find( '.mwe-error' );
		if (isValid) {
			$errorEl.fadeOut();
		} else {
			// we bind to $selector because unbind() doesn't work on non-DOM objects
			_this.$selector.bind( 'changeLicenses.valid', function() {
				_this.$selector.unbind( 'changeLicenses.valid' );
				_this.valid();
			} );	
			$errorEl.html( errorHtml ).show();
		}

		return isValid;
	},


	/**
  	 * Returns true if any license is set
	 * @return boolean
	 */
	isSet: function() {
		return this.getTemplates().length > 0;
	}

};

} )( jQuery );
// XXX
// this is sure starting to look like we should compose of UI, handler.
		

/**
 * Represents the upload -- in its local and remote state. (Possibly those could be separate objects too...)
 * This is our 'model' object if we are thinking MVC. Needs to be better factored, lots of feature envy with the UploadWizard
 * states:
 *   'new' 'transporting' 'transported' 'details' 'submitting-details' 'complete' 'failed' 
 * should fork this into two -- local and remote, e.g. filename
 */
( function( $j ) {

mw.UploadWizardUpload = function( api, filesDiv ) {
	this.api = api;
	this.state = 'new';
	this.thumbnails = {};
	this.imageinfo = {};
	this.title = undefined;
	this.mimetype = undefined;
	this.extension = undefined;

	this.sessionKey = undefined;
	
	// this should be moved to the interface, if we even keep this	
	this.transportWeight = 1;  // default
	this.detailsWeight = 1; // default

	// details 		
	this.ui = new mw.UploadWizardUploadInterface( this, filesDiv );

	// handler -- usually ApiUploadHandler
	// this.handler = new ( mw.UploadWizard.config[  'uploadHandlerClass'  ] )( this );
	// this.handler = new mw.MockUploadHandler( this );
	this.handler = new mw.ApiUploadHandler( this, api );
};

mw.UploadWizardUpload.prototype = {

	acceptDeed: function( deed ) {
		var _this = this;
		_this.deed.applyDeed( _this );
	},

	/**
 	 * start
	 */
	start: function() {
		var _this = this;
		_this.setTransportProgress(0.0);
		//_this.ui.start();
		_this.handler.start();	
	},

	/**
	 *  remove this upload. n.b. we trigger a removeUpload this is usually triggered from 
	 */
	remove: function() {
		if ( this.details && this.details.div ) {
			this.details.div.remove(); 
		}
		if ( this.thanksDiv ) {
			this.thanksDiv.remove();
		}
		// we signal to the wizard to update itself, which has to delete the final vestige of 
		// this upload (the ui.div). We have to do this silly dance because we 
		// trigger through the div. Triggering through objects doesn't always work.
		// TODO fix -- this now works in jquery 1.4.2
		$j( this.ui.div ).trigger( 'removeUploadEvent' );
	},


	/**
	 * Wear our current progress, for observing processes to see
	 * XXX this is kind of a misnomer; this event is not firing except for the very first time.
 	 * @param fraction
	 */
	setTransportProgress: function ( fraction ) {
		var _this = this;
		_this.state = 'transporting';
		_this.transportProgress = fraction;
		$j( _this.ui.div ).trigger( 'transportProgressEvent' );
	},

	/**
	 * Stop the upload -- we have failed for some reason 
	 */
	setFailed: function( code ) { 
		/* stop the upload progress */
		this.state = 'failed';
		this.transportProgress = 0;
		this.ui.showFailed( code );
	},

	/**
	 * To be executed when an individual upload finishes. Processes the result and updates step 2's details 
	 * @param result	the API result in parsed JSON form
	 * XXX needs refactor --- new api needs error handler instead
	 */
	setTransported: function( result ) {
		var _this = this;
		_this.state = 'transported';
		_this.transportProgress = 1;
		$j( _this.ui.div ).trigger( 'transportedEvent' );

		if ( result.upload && result.upload.imageinfo ) {
			// success
			_this.extractUploadInfo( result );	
			_this.deedPreview.setup();
			_this.details.populate();
		
		} else if ( result.upload && result.upload.sessionkey ) {
			// there was a warning - type error which prevented it from adding the result to the db 
			if ( result.upload.warnings.duplicate ) {
				var duplicates = result.upload.warnings.duplicate;
				_this.details.errorDuplicate( result.upload.sessionkey, duplicates );
			}

			// and other errors that result in a stash
		} else {
			// XXX handle errors better
			if ( result.error ) {
				alert( "error : " + result.error.code + " : " + result.error.info );
			} 
			this.ui.showFailed();
			alert("huh?");
			// TODO now we should tag the upload as failed
			// if can recover, should maybe allow re-uploading.
		}
	
	},


	/**
	 * Called when the file is entered into the file input
	 * Get as much data as possible -- maybe exif, even thumbnail maybe
	 */
	extractLocalFileInfo: function( localFilename ) {
		if ( false ) {  // FileAPI, one day
			this.transportWeight = getFileSize();
		}
		this.title = new mw.Title( mw.UploadWizardUtil.getBasename( localFilename ), 'file' );
	},

	/** 
 	 * Accept the result from a successful API upload transport, and fill our own info 
	 *
	 * @param result The JSON object from a successful API upload result.
	 */
	extractUploadInfo: function( result ) {
		this.sessionKey = result.upload.sessionkey;
		this.extractImageInfo( result.upload.imageinfo );
	},

	/**
	 * Extract image info into our upload object 	
	 * Image info is obtained from various different API methods
	 * @param imageinfo JSON object obtained from API result.
	 */
	extractImageInfo: function( imageinfo ) {
		var _this = this;
		for ( var key in imageinfo ) {
			// we get metadata as list of key-val pairs; convert to object for easier lookup. Assuming that EXIF fields are unique.
			if ( key == 'metadata' ) {
				_this.imageinfo.metadata = {};
				if ( imageinfo.metadata && imageinfo.metadata.length ) {
					$j.each( imageinfo.metadata, function( i, pair ) {
						if ( pair !== undefined ) {
							_this.imageinfo.metadata[pair['name'].toLowerCase()] = pair['value'];
						}
					} );
				}
			} else {
				_this.imageinfo[key] = imageinfo[key];
			}
		}
	
		// TODO this needs to be rethought.	
		// we should already have an extension, but if we don't...  ??
		if ( _this.title.getExtension() === null ) {
			/* 
			var extension = mw.UploadWizardUtil.getExtension( _this.imageinfo.url );
			if ( !extension ) {
				if ( _this.imageinfo.mimetype ) {
					if ( mw.UploadWizardUtil.mimetypeToExtension[ _this.imageinfo.mimetype ] ) {
						extension = mw.UploadWizardUtil.mimetypeToExtension[ _this.imageinfo.mimetype ];			
					} 
				}
			}
			*/
		}
	},

	/**
	 * Fetch a thumbnail for this upload of the desired width. 
	 * It is assumed you don't call this until it's been transported.
 	 *
	 * @param width - desired width of thumbnail (height will scale to match)
	 * @param callback - callback to execute once thumbnail has been obtained -- must accept Image object
	 */
	getThumbnail: function( width, callback ) {
		var _this = this;
		var key = "width" + width;
		if ( mw.isDefined( _this.thumbnails[key] ) ) {
			callback( _this.thumbnails[key] );
		} else {
			var params = {
				'prop':	'stashimageinfo',
				'siisessionkey': _this.sessionKey,
				'siiurlwidth': width, 
				'siiprop': 'url'
			};

			this.api.get( params, function( data ) {
				if ( !data || !data.query || !data.query.stashimageinfo ) {
					mw.log(" No data? ");
					// XXX do something about the thumbnail spinner, maybe call the callback with a broken image.
					return;
				}
				var thumbnails = data.query.stashimageinfo;
				for ( var i = 0; i < thumbnails.length; i++ ) {
					_this.thumbnails[key] = {
						src: thumbnails[i].thumburl,
						width: thumbnails[i].thumbwidth,
						height: thumbnails[i].thumbheight
					};
					callback( _this.thumbnails[key] );
				}
			} );
		}
	},

	/**
	 * Look up thumbnail info and set it in HTML, with loading spinner
	 * it might be interesting to make this more of a publish/subscribe thing, since we have to do this 3x
	 * the callbacks may pile up, getting unnecessary info
	 *
	 * @param selector
	 * @param width
	 */
	setThumbnail: function( selector, width ) {
		var _this = this;
		if ( typeof width === 'undefined' || width === null || width <= 0 )  {	
			width = mw.UploadWizard.config[  'thumbnailWidth'  ];
		}
		width = parseInt( width, 10 );
				
		var callback = function( thumbnail ) {
			// side effect: will replace thumbnail's loadingSpinner
			$j( selector ).html(
				$j('<a/>')
					.attr( { 'href': _this.imageinfo.url,
						 'target' : '_new' } )
					.append(
						$j( '<img/>' )
							.attr( 'width',  thumbnail.width )
							.attr( 'height', thumbnail.height )
							.attr( 'src',    thumbnail.src ) ) );
		};

		$j( selector ).loadingSpinner();
		_this.getThumbnail( width, callback );
	}
	
};

/**
 * Create an interface fragment corresponding to a file input, suitable for Upload Wizard.
 * @param upload
 * @param div to insert file interface
 * @param addInterface interface to add a new one (assumed that we start out there)
 */
mw.UploadWizardUploadInterface = function( upload, filesDiv ) {
	var _this = this;

	_this.upload = upload;

	// may need to collaborate with the particular upload type sometimes
	// for the interface, as well as the uploadwizard. OY.
	_this.div = $j('<div class="mwe-upwiz-file"></div>').get(0);
	_this.isFilled = false;

	_this.fileInputCtrl = $j('<input size="1" class="mwe-upwiz-file-input" name="file" type="file"/>')
				.change( function() { _this.fileChanged(); } ) 
				.get(0);


	visibleFilenameDiv = $j('<div class="mwe-upwiz-visible-file"></div>')
		.append( 
			 $j.fn.removeCtrl( 'mwe-upwiz-remove-upload', function() { _this.upload.remove(); } ),
	
			 $j( '<div class="mwe-upwiz-file-indicator"></div>' ),

			 $j( '<div class="mwe-upwiz-visible-file-filename">' )
				.append( 
					 $j( '<span class="ui-icon ui-icon-document" style="display: inline-block;" />' ),
					 $j( '<span class="mwe-upwiz-visible-file-filename-text"/>' )
				)

		);

	//_this.errorDiv = $j('<div class="mwe-upwiz-upload-error mwe-upwiz-file-indicator" style="display: none;"></div>').get(0);

	_this.filenameCtrl = $j('<input type="hidden" name="filename" value=""/>').get(0); 
	
	// this file Ctrl container is placed over other interface elements, intercepts clicks and gives them to the file input control.
	// however, we want to pass hover events to interface elements that we are over, hence the bindings.
	// n.b. not using toggleClass because it often gets this event wrong -- relies on previous state to know what to do
	_this.fileCtrlContainer = $j('<div class="mwe-upwiz-file-ctrl-container">');
/*
					.bind( 'mouseenter', function(e) { _this.addFileCtrlHover(e); } )
					.bind( 'mouseleave', function(e) { _this.removeFileCtrlHover(e); } );
*/


	// the css trickery (along with css) 
	// here creates a giant size file input control which is contained within a div and then
	// clipped for overflow. The effect is that we have a div (ctrl-container) we can position anywhere
	// which works as a file input. It will be set to opacity:0 and then we can do whatever we want with
	// interface "below".
	// XXX caution -- if the add file input changes size we won't match, unless we add some sort of event to catch this.
	_this.form = $j('<form class="mwe-upwiz-form"></form>')
			.append( visibleFilenameDiv )
			.append( _this.fileCtrlContainer
				.append( _this.fileInputCtrl ) 
			)
			.append( _this.filenameCtrl )
			.append( _this.thumbnailParam )
			.get( 0 );


	$j( _this.div ).append( _this.form );

	// XXX evil hardcoded
	// we don't really need filesdiv if we do it this way?
	$j( _this.div ).insertBefore( '#mwe-upwiz-upload-ctrls' ); // append( _this.div );

	// _this.progressBar = ( no progress bar for individual uploads yet )
	// we bind to the ui div since unbind doesn't work for non-DOM objects
	$j( _this.div ).bind( 'transportProgressEvent', function(e) { _this.showTransportProgress(); } );
	$j( _this.div ).bind( 'transportedEvent', function(e) { _this.showTransported(); } );

};


mw.UploadWizardUploadInterface.prototype = {
	/**
	 * Things to do to this interface once we start uploading
	 */
	start: function() {
		var _this = this;
		// remove hovering
		$j( _this.div )
			.unbind( 'mouseenter mouseover mouseleave mouseout' );

		// remove delete control 
		$j( _this.div )
			.find( '.mwe-upwiz-remove-ctrl' )
			.unbind( 'mouseenter mouseover mouseleave mouseout' )
			.remove();
	},

	busy: function() {
		var _this = this;
		// for now we implement this as looking like "100% progress"
		// e.g. an animated bar that takes up all the space
		// _this.showTransportProgress();
	},

	/**
 	 *
	 */ 
	showIndicatorMessage: function( statusClass, msgKey ) {
		var _this = this;
		var $indicator = $j( _this.div ).find( '.mwe-upwiz-file-indicator' );
		$j.each( $indicator.attr( 'class' ).split( /\s+/ ), function( i, className ) {
			if ( className.match( /^mwe-upwiz-status/ ) ) {
				$indicator.removeClass( className );
			}
		} );
		$indicator.addClass( 'mwe-upwiz-status-' + statusClass )
			  .html( gM( msgKey ) );
		$j( _this.div ).find( '.mwe-upwiz-visible-file-filename' )
				.css( 'margin-right', ( $indicator.outerWidth() + 24 ).toString() + 'px' );
		$indicator.css( 'visibility', 'visible' ); 
	},

	/**
	 * Put the visual state of an individual upload ito "progress"
	 * @param fraction	The fraction of progress. Float between 0 and 1
	 */
	showTransportProgress: function() {
		this.showIndicatorMessage( 'progress', 'mwe-upwiz-uploading' );
		// update individual progress bar with fraction?
	},

	/**
	 * Show that upload is transported
	 */
	showTransported: function() {
		this.showIndicatorMessage( 'completed', 'mwe-upwiz-transported' );
	},

	/** 
	 * Show that transport has failed
	 */
	showFailed: function( code ) {
		this.showIndicatorMessage( 'failed', 'mwe-upwiz-failed' );
		//add a "retry" button, too?
	},

	/**
	 * Run this when the value of the file input has changed. Check the file for various forms of goodness.
	 * If okay, then update the visible filename (due to CSS trickery the real file input is invisible)
	 */
	fileChanged: function() {
		var _this = this;
		_this.clearErrors();
		_this.upload.extractLocalFileInfo( $j( _this.fileInputCtrl ).val() );
		if ( _this.isGoodExtension( _this.upload.title.getExtension() ) ) {
			_this.updateFilename();
		} else {       
			//_this.error( 'bad-filename-extension', ext );
			alert("bad extension");
		}
	},

	/**
	 * Move the file input to cover a certain element on the page. 
	 * We use invisible file inputs because this is the only way to style a file input
	 * or otherwise get it to do what you want.
	 * It is helpful to sometimes move them to cover certain elements on the page, and 
	 * even to pass events like hover
	 * @param selector jquery-compatible selector, for a single element
	 */
	moveFileInputToCover: function( selector ) {
		var $covered = $j( selector ); 

		this.fileCtrlContainer
			.css( $covered.position() )
			.width( $covered.outerWidth() )
			.height( $covered.outerHeight() ); 

		// shift the file input over with negative margins, 
		// internal to the overflow-containing div, so the div shows all button
		// and none of the textfield-like input
		$j( this.fileInputCtrl ).css( {
			'margin-left': '-' + ~~( $j( this.fileInputCtrl ).width() - $covered.outerWidth() - 10 ) + 'px',
			'margin-top' : '-' + ~~( $j( this.fileInputCtrl ).height() - $covered.outerHeight() - 10 ) + 'px'
		} );


	},

	/**
	 * this does two things: 
	 *   1 ) since the file input has been hidden with some clever CSS ( to avoid x-browser styling issues ), 
	 *      update the visible filename
	 *
	 *   2 ) update the underlying "title" which we are targeting to add to mediawiki. 
	 *      TODO silently fix to have unique filename? unnecessary at this point...
	 */
	updateFilename: function() {
		var _this = this;
		var path = _this.fileInputCtrl.value;
		
		// visible filenam.
		$j( _this.form ).find( '.mwe-upwiz-visible-file-filename-text' ).html( path );

		_this.upload.title = new mw.Title( mw.UploadWizardUtil.getBasename( path ), 'file' );
		$j( _this.filenameCtrl ).val( _this.upload.title.getMain() );

		if ( ! _this.isFilled ) {
			var $div = $j( _this.div );
			_this.isFilled = true;
			$div.addClass( 'filled' );
				
 			// cover the div with the file input.
			// we use the visible-file div because it has the same offsetParent as the file input
			// the second argument offsets the fileinput to the right so there's room for the close icon to get mouse events
			_this.moveFileInputToCover( 	
				$div.find( '.mwe-upwiz-visible-file-filename' )
			);

			// Highlight the file on mouseover (and also show controls like the remove control).
			//
			// On Firefox there are bugs related to capturing mouse events on inputs, so we seem to miss the
			// mouseenter or mouseleave events randomly. It's only really bad if we miss mouseleave, 
			// and have two highlights visible. so we add another call to REALLY make sure that other highlights
			// are deactivated.
			// http://code.google.com/p/fbug/issues/detail?id=2075
			// 
			// ALSO: When file inputs are adjacent, Firefox misses the "mouseenter" and "mouseleave" events. 
			// Consequently we have to bind to "mouseover" and "mouseout" as well even though that's not as efficient.
			$div.bind( 'mouseenter mouseover', function() { 
				$div.addClass( 'hover' ); 
				$j( '#mwe-upwiz-files' )
					.children()
					.filter( function() { return this !== _this.div; } )
					.removeClass('hover');
			}, false );
			$div.bind( 'mouseleave mouseout', function() { 
				$div.removeClass( 'hover' ); 	
			}, false );
			$j( _this.div ).trigger( 'filled' );
		} else {	
			$j( _this.div ).trigger( 'filenameAccepted' );
		}
	},

	/**
	 * Remove any complaints we had about errors and such
	 * XXX this should be changed to something Theme compatible
	 */
	clearErrors: function() {
		var _this = this;
		$j( _this.div ).removeClass( 'mwe-upwiz-upload-error ');
		$j( _this.errorDiv ).hide().empty();
	},

	/**
	 * Show an error with the upload
	 */
	error: function() {
		var _this = this;
		var args = Array.prototype.slice.call( arguments ); // copies arguments into a real array
		var msg = 'mwe-upwiz-upload-error-' + args[0];
		$j( _this.errorDiv ).append( $j( '<p class="mwe-upwiz-upload-error">' + gM( msg, args.slice( 1 ) ) + '</p>') );
		// apply a error style to entire did
		$j( _this.div ).addClass( 'mwe-upwiz-upload-error' );
		$j( _this.errorDiv ).show();
	},

	/**
	 * This is used when checking for "bad" extensions in a filename. 
	 * @param ext
	 * @return boolean if extension was acceptable
	 */
	isGoodExtension: function( ext ) {
		return $j.inArray( ext.toLowerCase(), mw.UploadWizard.config[ 'fileExtensions' ] ) !== -1;
	}

};	
	
/**
 * Object that represents an indvidual language description, in the details portion of Upload Wizard
 * @param languageCode -- string 
 * @param firstRequired -- boolean -- the first description is required and should be validated and displayed a bit differently
 */
mw.UploadWizardDescription = function( languageCode, required ) {
	var _this = this;
	mw.UploadWizardDescription.prototype.count++;
	_this.id = 'description' + mw.UploadWizardDescription.prototype.count;

	// XXX for some reason this display:block is not making it into HTML
	var errorLabelDiv = $j(   '<div class="mwe-upwiz-details-input-error">'
				+   '<label generated="true" class="mwe-validator-error" for="' + _this.id + '" />'
				+ '</div>' );

	var fieldnameDiv = $j( '<div class="mwe-upwiz-details-fieldname" />' );
	if ( required ) {
		fieldnameDiv.append( gM( 'mwe-upwiz-desc' ) ).requiredFieldLabel();
	}
	

	// Logic copied from MediaWiki:UploadForm.js
	// Per request from Portuguese and Brazilian users, treat Brazilian Portuguese as Portuguese.
	if (languageCode == 'pt-br') {
		languageCode = 'pt';
	// this was also in UploadForm.js, but without the heartwarming justification
	} else if (languageCode == 'en-gb') {
		languageCode = 'en';
	}

	_this.languageMenu = mw.LanguageUpWiz.getMenu( 'lang', languageCode );
	$j(_this.languageMenu).addClass( 'mwe-upwiz-desc-lang-select' );

	_this.input = $j( '<textarea name="' + _this.id  + '" rows="2" cols="36" class="mwe-upwiz-desc-lang-text"></textarea>' )
				.attr( 'title', gM( 'mwe-upwiz-tooltip-description' ) )
				.growTextArea()
				.tipsyPlus( { plus: 'even more stuff' } );

	// descriptions
	_this.div = $j('<div class="mwe-upwiz-details-descriptions-container ui-helper-clearfix"></div>' )
			.append( errorLabelDiv, fieldnameDiv, _this.languageMenu, _this.input );

};

mw.UploadWizardDescription.prototype = {

	/* widget count for auto incrementing */
	count: 0,

	/**
	 * Obtain text of this description, suitable for including into Information template
	 * @return wikitext as a string
	 */
	getWikiText: function() {
		var _this = this;
		var description = $j( _this.input ).val().trim();
		// we assume that form validation has caught this problem if this is a required field
		// if not, assume the user is trying to blank a description in another language
		if ( description.length === 0 ) {	
			return '';
		}
		var language = $j( _this.languageMenu ).val().trim();
		var fix = mw.UploadWizard.config[ "languageTemplateFixups" ];
		if (fix[language]) {
			language = fix[language];
		}
		return '{{' + language + '|1=' + description + '}}';
	},

	/**
	 * defer adding rules until it's in a form 
	 * @return validator
 	 */
	addValidationRules: function( required ) {
		// validator must find a form, so we add rules here
		return this.input.rules( "add", {
			minlength: mw.UploadWizard.config[  'minDescriptionLength'  ],
			maxlength: mw.UploadWizard.config[  'maxDescriptionLength'  ],
			required: required,
			messages: { 
				required: gM( 'mwe-upwiz-error-blank' ),
				minlength: gM( 'mwe-upwiz-error-too-short', mw.UploadWizard.config[  'minDescriptionLength'  ] ),
				maxlength: gM( 'mwe-upwiz-error-too-long', mw.UploadWizard.config[  'maxDescriptionLength'  ] )
			}		
		} );
	}	
};

/**
 * Object that represents the Details (step 2) portion of the UploadWizard
 * n.b. each upload gets its own details.
 * 
 * XXX a lot of this construction is not really the jQuery way. 
 * The correct thing would be to have some hidden static HTML
 * on the page which we clone and slice up with selectors. Inputs can still be members of the object
 * but they'll be found by selectors, not by creating them as members and then adding them to a DOM structure.
 *
 * XXX this should have styles for what mode we're in 
 *
 * @param UploadWizardUpload
 * @param containerDiv	The div to put the interface into
 */
mw.UploadWizardDetails = function( upload, containerDiv ) {

	var _this = this;
	_this.upload = upload;

	_this.descriptions = [];

	_this.div = $j( '<div class="mwe-upwiz-info-file ui-helper-clearfix"></div>' );

	_this.thumbnailDiv = $j( '<div class="mwe-upwiz-thumbnail mwe-upwiz-thumbnail-side"></div>' );
	
	_this.dataDiv = $j( '<div class="mwe-upwiz-data"></div>' );

	// descriptions
	_this.descriptionsDiv = $j( '<div class="mwe-upwiz-details-descriptions"></div>' );

	_this.descriptionAdder = $j( '<a class="mwe-upwiz-more-options"/>' )
					.html( gM( 'mwe-upwiz-desc-add-0' ) )
					.click( function( ) { _this.addDescription(); } );

	var descriptionAdderDiv = 
		$j( '<div />' ).append(
			$j( '<div class="mwe-upwiz-details-fieldname" />' ),
			$j( '<div class="mwe-upwiz-details-descriptions-add" />' )
					.append( _this.descriptionAdder ) 
		);

	// Commons specific help for titles 
	//    http://commons.wikimedia.org/wiki/Commons:File_naming
	//    http://commons.wikimedia.org/wiki/MediaWiki:Filename-prefix-blacklist
	//    XXX make sure they can't use ctrl characters or returns or any other bad stuff.
	_this.titleId = "title" + _this.upload.index;
	_this.titleInput = $j( '<textarea type="text" id="' + _this.titleId + '" name="' + _this.titleId + '" rows="1" class="mwe-title mwe-long-textarea"></textarea>' )
		.attr( 'title', gM( 'mwe-upwiz-tooltip-title' ) )
		.tipsyPlus()
		.keyup( function() { 
			_this.upload.title.setNameText( _this.titleInput.value );
			// TODO update a display of filename 
		} )
		.growTextArea()
		.destinationChecked( {
			api: _this.upload.api,
			spinner: function(bool) { _this.toggleDestinationBusy(bool); },
			preprocess: function( name ) { 
				// turn the contents of the input into a MediaWiki title ("File:foo_bar.jpg") to look up
				return _this.upload.title.setNameText( name ).toString();
			}, 
			processResult: function( result ) { _this.processDestinationCheck( result ); } 
		} );

	_this.titleErrorDiv = $j('<div class="mwe-upwiz-details-input-error"><label class="mwe-error" for="' + _this.titleId + '" generated="true"/></div>');

	var titleContainerDiv = $j('<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>')
		.append(
			_this.titleErrorDiv, 
			$j( '<div class="mwe-upwiz-details-fieldname"></div>' )
				.requiredFieldLabel()
				.append( gM( 'mwe-upwiz-title' ) ),
			$j( '<div class="mwe-upwiz-details-input"></div>' ).append( _this.titleInput ) 
		); 

	_this.deedDiv = $j( '<div class="mwe-upwiz-custom-deed" />' );

	_this.copyrightInfoFieldset = $j('<fieldset class="mwe-fieldset mwe-upwiz-copyright-info"></fieldset>')
		.hide()
		.append( 
			$j( '<legend class="mwe-legend">' ).append( gM( 'mwe-upwiz-copyright-info' ) ), 
			_this.deedDiv
		);

	var $categoriesDiv = $j('<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix">' 
				+ '<div class="mwe-upwiz-details-fieldname"></div>' 
				+ '<div class="mwe-upwiz-details-input"></div>'
				+ '</div>' );
	$categoriesDiv.find( '.mwe-upwiz-details-fieldname' ).append( gM( 'mwe-upwiz-categories' ) );
	var categoriesId = 'categories' + _this.upload.index;
	$categoriesDiv.find( '.mwe-upwiz-details-input' )
		.append( $j( '<input/>' ).attr( { id: categoriesId,
						  name: categoriesId,
						  type: 'text' } )
		);
	
	var moreDetailsDiv = $j('<div class="mwe-more-details"></div>');

	var moreDetailsCtrlDiv = $j( '<div class="mwe-upwiz-details-more-options"></div>' );

	var dateInputId = "dateInput" + ( _this.upload.index ).toString();
	var dateDisplayInputId = "dateDisplayInput" + ( _this.upload.index ).toString();
	
	var dateErrorDiv = $j('<div class="mwe-upwiz-details-input-error"><label class="mwe-validator-error" for="' + dateInputId + '" generated="true"/></div>');

	/* XXX must localize this by loading jquery.ui.datepicker-XX.js where XX is a language code */
	/* jQuery.ui.datepicker also modifies first-day-of-week according to language, which is somewhat wrong. */
	/* $.datepicker.setDefaults() for other settings */	
	_this.dateInput = 
		$j( '<input type="text" id="' + dateInputId + '" name="' + dateInputId + '" type="text" class="mwe-date" size="20"/>' );
	_this.dateDisplayInput = 
		$j( '<input type="text" id="' + dateDisplayInputId + '" name="' + dateDisplayInputId + '" type="text" class="mwe-date-display" size="20"/>' );
	

	var dateInputDiv = $j( '<div class="mwe-upwiz-details-fieldname-input ui-helper-clearfix"></div>' )
		.append(
			dateErrorDiv, 
			$j( '<div class="mwe-upwiz-details-fieldname"></div>' ).append( gM( 'mwe-upwiz-date-created' ) ), 
			$j( '<div class="mwe-upwiz-details-input"></div>' ).append( _this.dateInput, _this.dateDisplayInput ) );

	var otherInformationId = "otherInformation" + _this.upload.index;
	_this.otherInformationInput = $j( '<textarea id="' + otherInformationId + '" name="' + otherInformationId + '" class="mwe-upwiz-other-textarea"></textarea>' )
		.growTextArea()
		.attr( 'title', gM( 'mwe-upwiz-tooltip-other' ) )
		.tipsyPlus();

	var otherInformationDiv = $j('<div></div>')	
		.append( $j( '<div class="mwe-upwiz-details-more-label">' ).append( gM( 'mwe-upwiz-other' ) ) ) 
		.append( _this.otherInformationInput );
	

	$j( moreDetailsDiv ).append( 
		dateInputDiv, 
		// location goes here
		otherInformationDiv
	);

	_this.$form = $j( '<form></form>' );
	_this.$form.append( 
		_this.descriptionsDiv, 
		descriptionAdderDiv,
		titleContainerDiv,
		_this.copyrightInfoFieldset,
		$categoriesDiv,
		moreDetailsCtrlDiv,
		moreDetailsDiv
	);

	$j( _this.dataDiv ).append( 
		_this.$form 
	);

	$j( _this.div ).append( 
		_this.thumbnailDiv, 
		_this.dataDiv
	);

	_this.$form.validate();
	_this.$form.find( '.mwe-date' ).rules( "add", {
		dateISO: true,
		messages: {
			dateISO: gM( 'mwe-upwiz-error-date' )
		}
	} );

	// we hide the "real" ISO date, and create another "display" date
	_this.$form.find( '.mwe-date-display' )
		.datepicker( { 	
			dateFormat: 'DD, MM d, yy', 
			//buttonImage: mw.getMwEmbedPath() + 'skins/common/images/calendar.gif',
			showOn: 'focus',
			/* buttonImage: '???', 
			buttonImageOnly: true,  */
			changeMonth: true, 
			changeYear: true, 
			showAnim: 'slideDown',
			altField: '#' + dateInputId,
			altFormat: 'yy-mm-dd' } )
		.click( function() { $j( this ).datepicker( 'show' ); } )
		.readonly();

	_this.$form.find( '.mwe-date' )	
		.bind( 'change', function() { $j( this ).valid(); } )
		.hide();
	
	/* if the date is not valid, we need to pop open the "more options". How? 
	   guess we'll revalidate it with element */

	mw.UploadWizardUtil.makeToggler( moreDetailsCtrlDiv, moreDetailsDiv );	

	_this.addDescription( true, mw.UploadWizard.config[ 'userLanguage' ] );
	$j( containerDiv ).append( _this.div );

	// make this a category picker
	$categoriesDiv.find( '.mwe-upwiz-details-input' )
			.find( 'input' )
			.mwCoolCats( { buttontext: gM( 'mwe-upwiz-categories-add' ) } );

};

mw.UploadWizardDetails.prototype = {

	/**
	 * check entire form for validity
	 */ 
	// return boolean if we are ready to go.
        // side effect: add error text to the page for fields in an incorrect state.
	// we must call EVERY valid() function due to side effects; do not short-circuit.
        valid: function() {
		var _this = this;
                // at least one description -- never mind, we are disallowing removal of first description
                // all the descriptions -- check min & max length

                // the title
		var titleInputValid = $j( _this.titleInput ).data( 'valid' );
		if ( typeof titleInputValid == 'undefined' ) {
			alert( "please wait, still checking the title for uniqueness..." );
			return false;
		}
	
		// all other fields validated with validator js	
		var formValid = _this.$form.valid();
		return titleInputValid && formValid;

		// categories are assumed valid
	
                // the license, if any

                // pop open the 'more-options' if the date is bad
                // the date

		// location?
        },



	/**
	 * toggles whether we use the 'macro' deed or our own
	 */
	useCustomDeedChooser: function() {
		var _this = this;
		_this.copyrightInfoFieldset.show();
		_this.upload.wizardDeedChooser = _this.upload.deedChooser;
		_this.upload.deedChooser = new mw.UploadWizardDeedChooser( 
			_this.deedDiv,
			[ new mw.UploadWizardDeedOwnWork(), 
			  new mw.UploadWizardDeedThirdParty() ]
		);
	},

	/**
	 * show file destination field as "busy" while checking 
	 * @param busy boolean true = show busy-ness, false = remove
	 */
	toggleDestinationBusy: function ( busy ) {
		var _this = this;
		if (busy) {
			_this.titleInput.addClass( "busy" );
			$j( _this.titleInput ).data( 'valid', undefined );
		} else {
			_this.titleInput.removeClass( "busy" );
		}
	},
	
	/**
	 * Process the result of a destination filename check.
	 * See mw.DestinationChecker.js for documentation of result format 
	 * XXX would be simpler if we created all these divs in the DOM and had a more jquery-friendly way of selecting
 	 * attrs. Instead we create & destroy whole interface each time. Won't someone think of the DOM elements?
	 * @param result
	 */
	processDestinationCheck: function( result ) {
		var _this = this;

		if ( result.isUnique ) {
			$j( _this.titleInput ).data( 'valid', true );
			_this.$form.find( 'label[for=' + _this.titleId + ']' ).hide().empty();
			_this.ignoreWarningsInput = undefined;
			return;
		}

		$j( _this.titleInput ).data( 'valid', false );

		// result is NOT unique
		var title = new mw.Title( result.title ).setNamespace( 'file' ).getNameText();
		/* var img = result.img;
		var href = result.href; */
	
		_this.$form.find( 'label[for=' + _this.titleId + ']' )
			.html( gM( 'mwe-upwiz-fileexists-replace', title ) )
			.show();

		/* temporarily commenting out the full thumbnail etc. thing. For now, we just want the user to change
                   to a different name 	
		_this.ignoreWarningsInput = $j("<input />").attr( { type: 'checkbox', name: 'ignorewarnings' } ); 
		var $fileAlreadyExists = $j('<div />')
			.append(				
				gM( 'mwe-upwiz-fileexists', 
					$j('<a />')
					.attr( { target: '_new', href: href } )
					.text( title )
				),
				$j('<br />'),
				_this.ignoreWarningsInput,
				gM('mwe-upwiz-overwrite')
			);
		
		var $imageLink = $j('<a />')
			.addClass( 'image' )
			.attr( { target: '_new', href: href } )
			.append( 
				$j( '<img />')
				.addClass( 'thumbimage' )
				.attr( {
					'width' : img.thumbwidth,
					'height' : img.thumbheight,
					'border' : 0,
					'src' : img.thumburl,
					'alt' : title
				} )
			);
			
		var $imageCaption = $j( '<div />' )
			.addClass( 'thumbcaption' )
			.append( 
				$j('<div />')
				.addClass( "magnify" )
				.append(
					$j('<a />' )
					.addClass( 'internal' )
					.attr( {
						'title' : gM('mwe-upwiz-thumbnail-more'),
						'href' : href
					} ),
					
					$j( '<img />' )
					.attr( {
						'border' : 0,
						'width' : 15,
						'height' : 11,
						'src' : mw.UploadWizard.config[  'images_path'  ] + 'magnify-clip.png'
					} ), 
					
					$j('<span />')
					.html( gM( 'mwe-fileexists-thumb' ) )
				)													
			);

		$j( _this.titleErrorDiv ).html(
			$j('<span />')  // dummy argument since .html() only takes one arg
				.append(
					$fileAlreadyExists,
					$j( '<div />' )
						.addClass( 'thumb tright' )
						.append(
							$j( '<div />' )
							.addClass( 'thumbinner' )
							.css({
								'width' : ( parseInt( img.thumbwidth ) + 2 ) + 'px;'
							})
							.append( 
								$imageLink, 
								$imageCaption
							)					
						)
				)
		).show();
		*/


	}, 

	/**
	 * Do anything related to a change in the number of descriptions
	 */
	recountDescriptions: function() {
		var _this = this;
		// if there is some maximum number of descriptions, deal with that here
		$j( _this.descriptionAdder ).html( gM( 'mwe-upwiz-desc-add-' + ( _this.descriptions.length === 0 ? '0' : 'n' )  )  );
	},


	/**
	 * Add a new description
	 */
	addDescription: function( required, languageCode ) {
		var _this = this;
		if ( typeof required === 'undefined' ) {
			required = false;
		}		
	
		if ( typeof languageCode === 'undefined' ) { 
			languageCode = mw.LanguageUpWiz.UNKNOWN;
		}

		var description = new mw.UploadWizardDescription( languageCode, required  );

		if ( ! required ) {
			$j( description.div  ).append( 
				 $j.fn.removeCtrl( 'mwe-upwiz-remove-description', function() { _this.removeDescription( description ); } )
			);
		} 

		$j( _this.descriptionsDiv ).append( description.div  );

		// must defer adding rules until it's in a form
		// sigh, this would be simpler if we refactored to be more jquery style, passing DOM element downward
		description.addValidationRules( required );

		_this.descriptions.push( description  );
		_this.recountDescriptions();
	},

	/**
	 * Remove a description 
	 * @param description
	 */
	removeDescription: function( description  ) {
		var _this = this;
		$j( description.div ).remove();
		mw.UploadWizardUtil.removeItem( _this.descriptions, description  );
		_this.recountDescriptions();
	},

	/**
	 * Display an error with details
	 * XXX this is a lot like upload ui's error -- should merge
	 */
	error: function() {
		var _this = this;
		var args = Array.prototype.slice.call( arguments  ); // copies arguments into a real array
		var msg = 'mwe-upwiz-upload-error-' + args[0];
		$j( _this.errorDiv ).append( $j( '<p class="mwe-upwiz-upload-error">' + gM( msg, args.slice( 1 ) ) + '</p>' ) );
		// apply a error style to entire did
		$j( _this.div ).addClass( 'mwe-upwiz-upload-error' );
		$j( _this.dataDiv ).hide();
		$j( _this.errorDiv ).show();
	},

	/**
	 * Given the API result pull some info into the form ( for instance, extracted from EXIF, desired filename )
	 * @param result	Upload API result object
	 */
	populate: function() {
		var _this = this;
		mw.log( "populating details from upload" );
		_this.upload.setThumbnail( _this.thumbnailDiv );
		_this.prefillDate();
		_this.prefillSource();
		_this.prefillAuthor(); 
		_this.prefillTitle();
		_this.prefillLocation(); 
	},

	/**
	 * Check if we got an EXIF date back; otherwise use today's date; and enter it into the details 
	 * XXX We ought to be using date + time here...
	 * EXIF examples tend to be in ISO 8601, but the separators are sometimes things like colons, and they have lots of trailing info
	 * (which we should actually be using, such as time and timezone)
	 */
	prefillDate: function() {
		// XXX surely we have this function somewhere already
		function pad( n ) { 
			return n < 10 ? "0" + n : n;
		}

		var _this = this;
		var yyyyMmDdRegex = /^(\d\d\d\d)[:\/-](\d\d)[:\/-](\d\d)\D.*/;
		var dateObj;
		var metadata = _this.upload.imageinfo.metadata;
		$j.each([metadata.datetimeoriginal, metadata.datetimedigitized, metadata.datetime, metadata['date']], 
			function( i, imageinfoDate ) {
				if ( ! mw.isEmpty( imageinfoDate ) ) {
					var matches = imageinfoDate.trim().match( yyyyMmDdRegex );   
					if ( ! mw.isEmpty( matches ) ) {
						dateObj = new Date( parseInt( matches[1], 10 ), 
								    parseInt( matches[2], 10 ) - 1, 
								    parseInt( matches[3], 10 ) );
						return false; // break from $j.each
					}
				}
			}
		);

		// if we don't have EXIF or other metadata, let's use "now"
		// XXX if we have FileAPI, it might be clever to look at file attrs, saved 
		// in the upload object for use here later, perhaps
		if (typeof dateObj === 'undefined') {
			dateObj = new Date();
		}
		dateStr = dateObj.getUTCFullYear() + '-' + pad( dateObj.getUTCMonth() ) + '-' + pad( dateObj.getUTCDate() );

		// ok by now we should definitely have a dateObj and a date string
		$j( _this.dateInput ).val( dateStr );
		$j( _this.dateDisplayInput ).datepicker( "setDate", dateObj );
	},

	/**
	 * Set the title of the thing we just uploaded, visibly
	 * Note: the interface's notion of "filename" versus "title" is the opposite of MediaWiki
	 */
	prefillTitle: function() {
		$j( this.titleInput ).val( this.upload.title.getNameText() );
	},

	/**
 	 * Prefill location inputs (and/or scroll to position on map) from image info and metadata
	 *
	 * At least for my test images, the EXIF parser on MediaWiki is not giving back any data for
	 *  GPSLatitude, GPSLongitude, or GPSAltitudeRef. It is giving the lat/long Refs, the Altitude, and the MapDatum 
	 * So, this is broken until we fix MediaWiki's parser, OR, parse it ourselves somehow 
	 *
	 *    in Image namespace
	 *		GPSTag		Long ??
	 *
	 *    in GPSInfo namespace
	 *    GPSVersionID	byte*	2000 = 2.0.0.0
	 *    GPSLatitude	rational 
	 *    GPSLatitudeRef	ascii (N | S)  or North | South 
	 *    GPSLongitude	rational
	 *    GPSLongitudeRef   ascii (E | W)    or East | West 
	 *    GPSAltitude	rational
	 *    GPSAltitudeRef	byte (0 | 1)    above or below sea level
	 *    GPSImgDirection	rational
	 *    GPSImgDirectionRef  ascii (M | T)  magnetic or true north
	 *    GPSMapDatum 	ascii		"WGS-84" is the standard
	 *
	 *  A 'rational' is a string like this:
	 *	"53/1 0/1 201867/4096"	--> 53 deg  0 min   49.284 seconds 
	 *	"2/1 11/1 64639/4096"    --> 2 deg  11 min  15.781 seconds
	 *	"122/1"             -- 122 m  (altitude)
	 */
	prefillLocation: function() {
		var _this = this;
		var metadata = _this.upload.imageinfo.metadata;
		if (metadata === undefined) {
			return;
		}
		

	},

	/**
	 * Given a decimal latitude and longitude, return filled out {{Location}} template
	 * @param latitude decimal latitude ( -90.0 >= n >= 90.0 ; south = negative )
	 * @param longitude decimal longitude ( -180.0 >= n >= 180.0 ; west = negative )
	 * @param scale (optional) how rough the geocoding is. 
	 * @param heading (optional) what direction the camera is pointing in. (decimal 0.0-360.0, 0 = north, 90 = E)
	 * @return string with WikiText which will geotag this record
	 */
	coordsToWikiText: function(latitude, longitude, scale, heading) {
		//Wikipedia
		//http://en.wikipedia.org/wiki/Wikipedia:WikiProject_Geographical_coordinates#Parameters
		// http://en.wikipedia.org/wiki/Template:Coord
		//{{coord|61.1631|-149.9721|type:landmark_globe:earth_region:US-AK_scale:150000_source:gnis|name=Kulis Air National Guard Base}}
		
		//Wikimedia Commons
		//{{Coor dms|41|19|20.4|N|19|38|36.7|E}}
		//{{Location}}

	},

	/**
	 * If there is a way to figure out source from image info, do so here
	 * XXX user pref?
	 */
	prefillSource: function() {
		// we have no way to do this AFAICT
	},

	/**
	 * Prefill author (such as can be determined) from image info and metadata
	 * XXX user pref?
	 */
	prefillAuthor: function() {
		var _this = this;
		if (_this.upload.imageinfo.metadata.author !== undefined) {
			$j( _this.authorInput ).val( _this.upload.imageinfo.metadata.author );
		}
	
	},
	
	/**
	 * Prefill license (such as can be determined) from image info and metadata
	 * XXX user pref?
	 */
	prefillLicense: function() {
		var _this = this;
		var copyright = _this.upload.imageinfo.metadata.copyright;
		if (copyright !== undefined) {
			if (copyright.match(/\bcc-by-sa\b/i)) {
				alert("unimplemented cc-by-sa in prefillLicense"); 
				// XXX set license to be that CC-BY-SA
			} else if (copyright.match(/\bcc-by\b/i)) {
				alert("unimplemented cc-by in prefillLicense"); 
				// XXX set license to be that
			} else if (copyright.match(/\bcc-zero\b/i)) {
				alert("unimplemented cc-zero in prefillLicense"); 
				// XXX set license to be that
				// XXX any other licenses we could guess from copyright statement
			} else {
				$j( _this.licenseInput ).val( copyright );
			}
		}
		// if we still haven't set a copyright use the user's preferences?
	},

	
	/**
	 * Convert entire details for this file into wikiText, which will then be posted to the file 
	 * XXX there is a WikiText sanitizer in use on UploadForm -- use that here, or port it 
	 * @return wikitext representing all details
	 */
	getWikiText: function() {
		var _this = this;
		
		// if invalid, should produce side effects in the form
		// instructing user to fix.
		if ( ! _this.valid() ) {
			return null;
		}

		wikiText = '';
	

		// http://commons.wikimedia.org / wiki / Template:Information
	
		// can we be more slick and do this with maps, applys, joins?
		var information = { 
			'description' : '',	 // {{lang|description in lang}}*   required
			'date' : '',		 // YYYY, YYYY-MM, or YYYY-MM-DD     required  - use jquery but allow editing, then double check for sane date.
			'source' : '',    	 // {{own}} or wikitext    optional 
			'author' : '',		 // any wikitext, but particularly {{Creator:Name Surname}}   required
			'permission' : '',       // leave blank unless OTRS pending; by default will be "see below"   optional 
			'other_versions' : '',   // pipe separated list, other versions     optional
			'other_fields' : ''      // ???     additional table fields 
		};
		
		// sanity check the descriptions -- do not have two in the same lang
		// all should be a known lang
		if ( _this.descriptions.length === 0 ) {
			alert("something has gone horribly wrong, unimplemented error check for zero descriptions");
			// XXX ruh roh
			// we should not even allow them to press the button ( ? ) but then what about the queue...
		}
		$j.each( _this.descriptions, function( i, desc ) {
			information['description'] += desc.getWikiText();
		} );	

		// XXX add a sanity check here for good date
		information['date'] = $j( _this.dateInput ).val().trim();

		var deed = _this.upload.deedChooser.deed;

		information['source'] = deed.getSourceWikiText();

		information['author'] = deed.getAuthorWikiText();
		
		var info = '';
		for ( var key in information ) {
			info += '|' + key + '=' + information[key] + "\n";	
		}	

		wikiText += "=={{int:filedesc}}==\n";

		wikiText += '{{Information\n' + info + '}}\n';

		// add a location template if possible

		// add an "anything else" template if needed
		var otherInfoWikiText = $j( _this.otherInformationInput ).val().trim();
		if ( ! mw.isEmpty( otherInfoWikiText ) ) {
			wikiText += "=={{int:otherinfo}}==\n";
			wikiText += otherInfoWikiText;
		}
		
		wikiText += "=={{int:license-header}}==\n";
		
		// in the other implementations, category text follows immediately after license text. This helps 
		// group categories together, maybe?
		wikiText += deed.getLicenseWikiText() + _this.div.find( '.categoryInput' ).get(0).getWikiText();
		

		return wikiText;	
	},

	/**
	 * Post wikitext as edited here, to the file
	 * XXX This should be split up -- one part should get wikitext from the interface here, and the ajax call
	 * should be be part of upload
	 */
	submit: function( endCallback ) {
		var _this = this;

		// XXX check state of details for okayness ( license selected, at least one desc, sane filename )
		var wikiText = _this.getWikiText();
		mw.log( wikiText );

		var params = {
			action: 'upload',
			sessionkey: _this.upload.sessionKey,
			filename: _this.upload.title.getMain(),
			text: wikiText,
			summary: "User created page with " + mw.UploadWizard.userAgent
		};

		var finalCallback = function() { 
			endCallback();
			_this.completeDetailsSubmission(); 
		};	

		mw.log( "uploading!" );
		mw.log( params );
		var callback = function( result ) {
			mw.log( result );
			mw.log( "successful upload" );
			finalCallback();
		};

		_this.upload.state = 'submitting-details';
		// XXX this can still fail with bad filename, or other 'warnings' -- capture these
		_this.upload.api.postWithEditToken( params, callback );
	},


	/** 
	 * Get new image info, for instance, after we renamed... or? published? an image
	 * XXX deprecated?
	 * XXX move to mw.API
	 *
	 * @param upload an UploadWizardUpload object
	 * @param title  title to look up remotely
	 * @param endCallback  execute upon completion
	 */
	getImageInfo: function( upload, callback ) {
		var params = {
                        'titles': upload.title.toString(),
                        'prop':  'imageinfo',
                        'iiprop': 'timestamp|url|user|size|sha1|mime|metadata'
                };
		// XXX timeout callback?
		this.api.get( params, function( data ) {
			if ( data && data.query && data.query.pages ) {
				if ( ! data.query.pages[-1] ) {
					for ( var page_id in data.query.pages ) {
						var page = data.query.pages[ page_id ];
						if ( ! page.imageinfo ) {
							alert("unimplemented error check, missing imageinfo");
							// XXX not found? error
						} else {
							upload.extractImageInfo( page.imageinfo[0] );
						}
					}
				}	
			}
			callback();
		} );
	},

	completeDetailsSubmission: function() {
		var _this = this;
		_this.upload.state = 'complete';
		// de-spinnerize
		_this.upload.detailsProgress = 1.0;
	},

	dateInputCount: 0

		
};


/**
 * Object that reperesents the entire multi-step Upload Wizard
 */
mw.UploadWizard = function( config ) {

	this.uploads = [];
	this.api = new mw.Api( { url: config.apiUrl } );

	// making a sort of global for now, should be done by passing in config or fragments of config when needed
	// elsewhere
	mw.UploadWizard.config = config;

	// XXX need a robust way of defining default config 
	this.maxUploads = mw.UploadWizard.config[  'maxUploads'  ] || 10;
	this.maxSimultaneousConnections = mw.UploadWizard.config[  'maxSimultaneousConnections'  ] || 2;

};

mw.UploadWizard.DEBUG = true;

mw.UploadWizard.userAgent = "UploadWizard (alpha)";


mw.UploadWizard.prototype = {
	stepNames: [ 'tutorial', 'file', 'deeds', 'details', 'thanks' ],
	currentStepName: undefined,

	/*
	// list possible upload handlers in order of preference
	// these should all be in the mw.* namespace
	// hardcoded for now. maybe some registry system might work later, like, all
	// things which subclass off of UploadHandler
	uploadHandlers: [
		'FirefoggUploadHandler',
		'XhrUploadHandler',
		'ApiIframeUploadHandler',
		'SimpleUploadHandler',
		'NullUploadHandler'
	],

	 * We can use various UploadHandlers based on the browser's capabilities. Let's pick one.
	 * For example, the ApiUploadHandler should work just about everywhere, but XhrUploadHandler
	 *   allows for more fine-grained upload progress
	 * @return valid JS upload handler class constructor function
	getUploadHandlerClass: function() {
		// return mw.MockUploadHandler;
		return mw.ApiUploadHandler;
		var _this = this;
		for ( var i = 0; i < uploadHandlers.length; i++ ) {
			var klass = mw[uploadHandlers[i]];
			if ( klass != undefined && klass.canRun( this.config )) {
				return klass;
			}
		}
		// this should never happen; NullUploadHandler should always work
		return null;
	},
	*/

	/**
	 * Reset the entire interface so we can upload more stuff
	 * Depending on whether we split uploading / detailing, it may actually always be as simple as loading a URL
	 */
	reset: function() {
		window.location.reload();
	},

	
	/**
	 * create the basic interface to make an upload in this div
	 * @param div	The div in the DOM to put all of this into.
	 */
	createInterface: function( selector ) {
		var _this = this;

		$j( '#mwe-upwiz-steps' )
			.addClass( 'ui-helper-clearfix ui-state-default ui-widget ui-helper-reset ui-helper-clearfix' )
			.arrowSteps();
 
		$j( '.mwe-upwiz-button-home' )
			.append( gM( 'mwe-upwiz-home' ) )
			.click( function() { window.location.href = '/'; } );
		
		$j( '.mwe-upwiz-button-begin' )
			.append( gM( 'mwe-upwiz-upload-another' ) )
			.click( function() { _this.reset(); } );
		
		// handler for next button
		$j( '#mwe-upwiz-stepdiv-tutorial .mwe-upwiz-button-next') 
			.append( gM( 'mwe-upwiz-next' ) )
			.click( function() {
				_this.moveToStep( 'file', function() { 
					// we explicitly move the file input at this point 
					// because it was probably jumping around due to other "steps" on this page during file construction.
					// XXX using a timeout is lame, are there other options?
					// XXX Trevor suggests that using addClass() may queue stuff unnecessarily; use 'concrete' HTML
					setTimeout( function() {	
						upload.ui.moveFileInputToCover( '#mwe-upwiz-add-file' );
					}, 300 );
				} );
			} );

		$j( '#mwe-upwiz-stepdiv-file .mwe-upwiz-button-next')
			.append( gM( 'mwe-upwiz-next-file' ) )
			.click( function() {
			// check if there is an upload at all
			if ( _this.uploads.length === 0 ) {
				// XXX use standard error message
				alert( gM( 'mwe-upwiz-file-need-file' ) );
				return;
			}

			_this.removeEmptyUploads();
			_this.startUploads( function() {  
			
				// okay all uploads are done, we're ready to go to the next step

				// do some last minute prep before advancing to the DEEDS page

				// these deeds are standard
				var deeds = [
					new mw.UploadWizardDeedOwnWork( _this.uploads.length ),
					new mw.UploadWizardDeedThirdParty( _this.uploads.length )
				];
				
				// if we have multiple uploads, also give them the option to set
				// licenses individually
				if ( _this.uploads.length > 1 ) {
					var customDeed = $j.extend( new mw.UploadWizardDeed(), {
						valid: function() { return true; },
						name: 'custom'
					} );
					deeds.push( customDeed );
				}

				_this.deedChooser = new mw.UploadWizardDeedChooser( 
					'#mwe-upwiz-deeds', 
					deeds,
					_this.uploads.length );
			
				$j( '<div>' ).html( gM( 'mwe-upwiz-deeds-macro-prompt', _this.uploads.length ) )
					.insertBefore ( _this.deedChooser.$selector.find( '.mwe-upwiz-deed-ownwork' ) );

				if ( _this.uploads.length > 1 ) {
					$j( '<div style="margin-top: 1em">' ).html( gM( 'mwe-upwiz-deeds-custom-prompt' ) ) 
						.insertBefore( _this.deedChooser.$selector.find( '.mwe-upwiz-deed-custom' ) );
				}

				
				_this.moveToStep( 'deeds' ); 

			} );		
		} );


		// DEEDS div

		$j( '#mwe-upwiz-deeds-intro' ).html( gM( 'mwe-upwiz-deeds-intro' ) );

		$j( '#mwe-upwiz-stepdiv-deeds .mwe-upwiz-button-next')
			.append( gM( 'mwe-upwiz-next-deeds' ) )
			.click( function() {
				// validate has the side effect of notifying the user of problems, or removing existing notifications.
				// if returns false, you can assume there are notifications in the interface.
				if ( _this.deedChooser.valid() ) {

					var lastUploadIndex = _this.uploads.length - 1; 

					$j.each( _this.uploads, function( i, upload ) {

						if ( _this.deedChooser.deed.name == 'custom' ) {
							upload.details.useCustomDeedChooser();
						} else {
							upload.deedChooser = _this.deedChooser;
						}

						/* put a border below every details div except the last */
						if ( i < lastUploadIndex ) {
							upload.details.div.css( 'border-bottom', '1px solid #e0e0e0' );
						}

						// only necessary if (somehow) they have beaten the check-as-you-type
						upload.details.titleInput.checkUnique();
					} );

					_this.moveToStep( 'details' );
				}
			} );


		// DETAILS div

		$j( '#mwe-upwiz-stepdiv-details .mwe-upwiz-button-next' )
			.append( gM( 'mwe-upwiz-next-details' ) )
			.click( function() {
				if ( _this.detailsValid() ) { 
					_this.detailsSubmit( function() { 
						_this.prefillThanksPage();
						_this.moveToStep( 'thanks' );
					} );
				}
			} );


	
		// WIZARD 
	
		// add one upload field to start (this is the big one that asks you to upload something)
		var upload = _this.newUpload();

		// "select" the first step - highlight, make it visible, hide all others
		_this.moveToStep( 'tutorial' );
	
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

		// scroll to the top of the page (the current step might have been very long, vertically)
		$j( 'html, body' ).animate( { scrollTop: 0 }, 'slow' );

		$j.each( _this.stepNames, function(i, stepName) {
			
			// the step indicator	
			var step = $j( '#mwe-upwiz-step-' + stepName );
			
			// the step's contents
			var stepDiv = $j( '#mwe-upwiz-stepdiv-' + stepName );

			if ( _this.currentStepName === stepName ) {
				stepDiv.hide();
				// we hide the old stepDivs because we are afraid of some z-index elements that may interfere with later tabs
				// this will break if we ever allow people to page back and forth.
			} else {
				if ( selectedStepName === stepName ) {
					stepDiv.maskSafeShow();
				} else {
					stepDiv.maskSafeHide( 1000 );
				}
			}
			
		} );
			
		$j( '#mwe-upwiz-steps' ).arrowStepsHighlight( '#mwe-upwiz-step-' + selectedStepName );

		_this.currentStepName = selectedStepName;

		$j.each( _this.uploads, function(i, upload) {
			upload.state = selectedStepName;
		} );

		if ( callback ) {
			callback();
		}
	},

	/**
	 * add an Upload
	 *   we create the upload interface, a handler to transport it to the server,
	 *   and UI for the upload itself and the "details" at the second step of the wizard.
	 *   we don't yet add it to the list of uploads; that only happens when it gets a real file.
	 * @return the new upload 
	 */
	newUpload: function() {
		var _this = this;
		if ( _this.uploads.length == _this.maxUploads ) {
			return false;
		}

		var upload = new mw.UploadWizardUpload( _this.api, '#mwe-upwiz-files' );
		_this.uploadToAdd = upload;

		upload.ui.moveFileInputToCover( '#mwe-upwiz-add-file' );
		// we bind to the ui div since unbind doesn't work for non-DOM objects

		$j( upload.ui.div ).bind( 'filenameAccepted', function(e) { _this.updateFileCounts();  e.stopPropagation(); } );
		$j( upload.ui.div ).bind( 'removeUploadEvent', function(e) { _this.removeUpload( upload ); e.stopPropagation(); } );
		$j( upload.ui.div ).bind( 'filled', function(e) { 
			mw.log( "filled! received!" );
			_this.newUpload(); 
			mw.log( "filled! new upload!" );
			_this.setUploadFilled(upload);
			mw.log( "filled! set upload filled!" );
			e.stopPropagation(); 
			mw.log( "filled! stop propagation!" ); 
		} );
		// XXX bind to some error state

	
		return upload;
	},

	/**
	 * When an upload is filled with a real file, accept it in the wizard's list of uploads
	 * and set up some other interfaces
	 * @param UploadWizardUpload
	 */
	setUploadFilled: function( upload ) {
		var _this = this;
		
		// XXX check if it has a file? 
		_this.uploads.push( upload );
		
		/* useful for making ids unique and so on */
		_this.uploadsSeen++;
		upload.index = _this.uploadsSeen;

		_this.updateFileCounts();
		
		upload.deedPreview = new mw.UploadWizardDeedPreview( upload );	

		// XXX do we really need to do this now? some things will even change after step 2.
		// legacy.
		// set up details
		upload.details = new mw.UploadWizardDetails( upload, $j( '#mwe-upwiz-macro-files' ) );
	},

	/* increments with every upload */
	uploadsSeen: 0,

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
		var $div = $j( upload.ui.div );
		$div.unbind(); // everything
		// sexily fade away
		$div.fadeOut('fast', function() { 
			$div.remove(); 
			// and do what we in the wizard need to do after an upload is removed
			mw.UploadWizardUtil.removeItem( _this.uploads, upload );
			_this.updateFileCounts();
		});
	},

	/**
	 * This is useful to clean out unused upload file inputs if the user hits GO.
	 * We are using a second array to iterate, because we will be splicing the main one, _this.uploads
	 */
	removeEmptyUploads: function() {
		var _this = this;
		var toRemove = [];

		for ( var i = 0; i < _this.uploads.length; i++ ) {
			if ( mw.isEmpty( _this.uploads[i].ui.fileInputCtrl.value ) ) {
				toRemove.push( _this.uploads[i] );
			}
		}

		for ( var j = 0; j < toRemove.length; j++ ) {
			toRemove[j].remove();
		}
	},

	/**
	 * Manage transitioning all of our uploads from one state to another -- like from "new" to "uploaded".
	 *
	 * @param beginState   what state the upload should be in before starting.
	 * @param progressState  the state to set the upload to while it's doing whatever 
	 * @param endState   the state to set the upload to after it's done whatever 
	 * @param starter	 function, taking single argument (upload) which starts the process we're interested in 
	 * @param endCallback    function to call when all uploads are in the end state.
	 */
	makeTransitioner: function( beginState, progressState, endState, starter, endCallback ) {
		
		var _this = this;

		var transitioner = function() {
			var uploadsToStart = _this.maxSimultaneousConnections;
			var endStateCount = 0;
			$j.each( _this.uploads, function(i, upload) {
				if ( upload.state == endState ) {
					endStateCount++;
				} else if ( upload.state == progressState ) {
					uploadsToStart--;
				} else if ( ( upload.state == beginState ) && ( uploadsToStart > 0 ) ) {
					starter( upload );
					uploadsToStart--;
				}
			} );

			// build in a little delay even for the end state, so user can see progress bar in a complete state.
			var nextAction = ( endStateCount == _this.uploads.length ) ? endCallback : transitioner;
	
			setTimeout( nextAction, _this.transitionerDelay );
		};

		transitioner();
	},

	transitionerDelay: 200,  // milliseconds


	/**
	 * Kick off the upload processes.
	 * Does some precalculations, changes the interface to be less mutable, moves the uploads to a queue, 
	 * and kicks off a thread which will take from the queue.
	 * @param endCallback   - to execute when uploads are completed
	 */
	startUploads: function( endCallback ) {
		var _this = this;
		// remove the upload button, and the add file button
		$j( '#mwe-upwiz-upload-ctrls' ).hide();
		$j( '#mwe-upwiz-add-file' ).hide();

		var allowCloseWindow = $j().preventCloseWindow( { 
			message: gM( 'mwe-prevent-close')
		} );


		var progressBar = new mw.GroupProgressBar( '#mwe-upwiz-progress', 
						           gM( 'mwe-upwiz-uploading' ), 
						           _this.uploads, 
						           'transported',  
							   'transportProgress', 
							   'transportWeight' );
		progressBar.start();
		

		// remove ability to change files
		// ideally also hide the "button"... but then we require styleable file input CSS trickery
		// although, we COULD do this just for files already in progress...

		// it might be interesting to just make this creational -- attach it to the dom element representing 
		// the progress bar and elapsed time	
		_this.makeTransitioner( 
			'new', 
			'transporting', 
			'transported', 
			function( upload ) {
				upload.start();
			},
		        function() {
				allowCloseWindow();
				$j().notify( gM( 'mwe-upwiz-files-complete' ) );
				endCallback();
		  	} 
		);
	},

	
	
	/**
	 * Occurs whenever we need to update the interface based on how many files there are 
	 * Thhere is an uncounted upload, waiting to be used, which has a fileInput which covers the
	 * "add an upload" button. This is absolutely positioned, so it needs to be moved if another upload was removed.
	 * The uncounted upload is also styled differently between the zero and n files cases
	 */
	updateFileCounts: function() {
		var _this = this;

		if ( _this.uploads.length ) {
			$j( '#mwe-upwiz-upload-ctrl' ).removeAttr( 'disabled' ); 
			$j( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons' ).show();
			$j( '#mwe-upwiz-add-file' ).html( gM( 'mwe-upwiz-add-file-n' ) );
			$j( '#mwe-upwiz-add-file-container' ).removeClass('mwe-upwiz-add-files-0');
			$j( '#mwe-upwiz-add-file-container' ).addClass('mwe-upwiz-add-files-n');
			$j( '#mwe-upwiz-files .mwe-upwiz-file.filled:odd' ).addClass( 'odd' );
			$j( '#mwe-upwiz-files .mwe-upwiz-file:filled:even' ).removeClass( 'odd' );
		} else {
			$j( '#mwe-upwiz-upload-ctrl' ).attr( 'disabled', 'disabled' ); 
			$j( '#mwe-upwiz-stepdiv-file .mwe-upwiz-buttons' ).hide();
			$j( '#mwe-upwiz-add-file' ).html( gM( 'mwe-upwiz-add-file-0' ) );
			$j( '#mwe-upwiz-add-file-container' ).addClass('mwe-upwiz-add-files-0');
			$j( '#mwe-upwiz-add-file-container' ).removeClass('mwe-upwiz-add-files-n');
		}

		if ( _this.uploads.length < _this.maxUploads ) {
			$j( '#mwe-upwiz-add-file' ).removeAttr( 'disabled' );
			$j( _this.uploadToAdd.ui.div ).show();
			_this.uploadToAdd.ui.moveFileInputToCover( '#mwe-upwiz-add-file' );
		} else {
			$j( '#mwe-upwiz-add-file' ).attr( 'disabled', true );
			$j( _this.uploadToAdd.ui.div ).hide();
		}


	},


	/**
	 * are all the details valid?
	 * @return boolean
	 */ 
	detailsValid: function() {
		var _this = this;
		var valid = true;
		$j.each( _this.uploads, function(i, upload) { 
			valid &= upload.details.valid();
		} );
		return valid;
	},

	/**
	 * Submit all edited details and other metadata
	 * Works just like startUploads -- parallel simultaneous submits with progress bar.
	 */
	detailsSubmit: function( endCallback ) {
		var _this = this;
		// some details blocks cannot be submitted (for instance, identical file hash)
		_this.removeBlockedDetails();

		// XXX validate all 

		// remove ability to edit details
		$j.each( _this.uploads, function( i, upload ) {
			upload.details.div.mask();
			upload.details.div.data( 'mask' ).loadingSpinner();
		} );

		// add the upload progress bar, with ETA
		// add in the upload count 
		_this.makeTransitioner(
			'details', 
			'submitting-details', 
			'complete', 
			function( upload ) {
				upload.details.submit( function() { 
					upload.details.div.data( 'mask' ).html();
				} );
			},
			endCallback
		);
	},

	/**
	 * Removes(?) details that we can't edit for whatever reason -- might just advance them to a different state?
	 */
	removeBlockedDetails: function() {
		// TODO	
	},


	prefillThanksPage: function() {
		var _this = this;
		
		$j( '#mwe-upwiz-thanks' )
			.append( $j( '<h3 style="text-align: center;">' ).append( gM( 'mwe-upwiz-thanks-intro' ) ),
				 $j( '<p style="margin-bottom: 2em; text-align: center;">' )
					.append( gM( 'mwe-upwiz-thanks-explain', _this.uploads.length ) ) );
		
		$j.each( _this.uploads, function(i, upload) {
			var thanksDiv = $j( '<div class="mwe-upwiz-thanks ui-helper-clearfix" />' );
			_this.thanksDiv = thanksDiv;
			
			var thumbnailDiv = $j( '<div class="mwe-upwiz-thumbnail mwe-upwiz-thumbnail-side"></div>' );
			upload.setThumbnail( thumbnailDiv );
			thumbnailDiv.append( $j('<p/>').append( 
						$j( '<a />' )
							.attr( { target: '_new', 
								 href: upload.imageinfo.descriptionurl } )
							.text( upload.title ) 
					) );

			thanksDiv.append( thumbnailDiv );

			var thumbWikiText = "[[" + upload.title + "|thumb|Add caption here]]";

			thanksDiv.append(
				$j( '<div class="mwe-upwiz-data"></div>' )
					.append( 
						$j('<p/>').append( 
							gM( 'mwe-upwiz-thanks-wikitext' ),
							$j( '<br />' ),
						 	$j( '<textarea class="mwe-long-textarea" rows="2"/>' )
								.growTextArea()
								.readonly()
								.append( thumbWikiText ) 
								.trigger('resizeEvent')
						),
						$j('<p/>').append( 
							gM( 'mwe-upwiz-thanks-url' ),
							$j( '<br />' ),
						 	$j( '<textarea class="mwe-long-textarea" rows="2"/>' )
								.growTextArea()
								.readonly()
								.append( upload.imageinfo.descriptionurl ) 
								.trigger('resizeEvent')
						)
					)
			);

			$j( '#mwe-upwiz-thanks' ).append( thanksDiv );
		} ); 
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


mw.UploadWizardDeedPreview = function(upload) {
	this.upload = upload;
};

mw.UploadWizardDeedPreview.prototype = {
	setup: function() {
		var _this = this;
		// add a preview on the deeds page
		var thumbnailDiv = $j( '<div class="mwe-upwiz-thumbnail-small"></div>' );
		$j( '#mwe-upwiz-deeds-thumbnails' ).append( thumbnailDiv );
		_this.upload.setThumbnail( thumbnailDiv, mw.UploadWizard.config[  'smallThumbnailWidth'  ] );
	}
};
	/**
	 * Create 'remove' control, an X which highlights in some standardized way.
	 */
	$j.fn.removeCtrl = function( tooltipMsgKey, callback ) {
		return $j( '<div class="mwe-upwiz-remove-ctrl ui-corner-all" />' )
			.attr( 'title', gM( tooltipMsgKey ) )
			.click( callback )
			.hover( function() { $j( this ).addClass( 'hover' ); },
				function() { $j( this ).removeClass( 'hover' ); } )
			.append( $j( '<span class="ui-icon ui-icon-close" />' ) );
	};

	/**
	 * Prevent the closing of a window with a confirm message (the onbeforeunload event seems to 
	 * work in most browsers 
	 * e.g.
	 *       var allowCloseWindow = jQuery().preventCloseWindow( { message: "Don't go away!" } );
	 *       // ... do stuff that can't be interrupted ...
	 *       allowCloseWindow();
	 *
	 * @param options 	object which should have a message string, already internationalized
	 * @return closure	execute this when you want to allow the user to close the window
	 */
	$j.fn.preventCloseWindow = function( options ) {
		if ( typeof options === 'undefined' ) {
			options = {};
		}

		if ( typeof options.message === 'undefined' ) {
			options.message = 'Are you sure you want to close this window?';
		}
		
		$j( window ).unload( function() { 
			return options.message;
		} );
		
		return function() { 
			$j( window ).removeAttr( 'unload' );
		};
				
	};


	$j.fn.notify = function ( message ) {
		// could do something here with Chrome's in-browser growl-like notifications.
		// play a sound?
		// if the current tab does not have focus, use an alert?
		// alert( message );
	};

	$j.fn.enableNextButton = function() {
		return this.find( '.mwe-upwiz-button-next' )
			.removeAttr( 'disabled' );
		//	.effect( 'pulsate', { times: 3 }, 1000 );
	};

	$j.fn.disableNextButton = function() {
		return this.find( '.mwe-upwiz-button-next' )
			.attr( 'disabled', true );
	};

	$j.fn.readonly = function() {
		return this.attr( 'readonly', 'readonly' ).addClass( 'mwe-readonly' );
	};

	/* will change in RTL, but I can't think of an easy way to do this with only CSS */
	$j.fn.requiredFieldLabel = function() {
		this.addClass( 'mwe-upwiz-required-field' );
		return this.prepend( $j( '<span/>' ).append( '*' ).addClass( 'mwe-upwiz-required-marker' ) );
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

		if ($j.msie) {
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
			return this;
		};

		this.addClass( 'mwe-grow-textarea' );

		this.bind( 'resizeEvent', resizeIfNeeded );
		
		this.keyup( resizeIfNeeded );
		this.change( resizeIfNeeded );


		return this;
	};

	jQuery.fn.mask = function( options ) {

		// intercept clicks... 
		// Note: the size of the div must be obtainable. Hence, this cannot be a div without layout (e.g. display:none).
		// some of this is borrowed from http://code.google.com/p/jquery-loadmask/ , but simplified
		$j.each( this, function( i, el ) {
			
			if ( ! $j( el ).data( 'mask' ) ) {
				

				//fix for z-index bug with selects in IE6
				if ( $j.browser.msie && $j.browser.version.substring(0,1) === '6' ){
					el.find( "select" ).addClass( "masked-hidden" );
				}

				var mask = $j( '<div />' )
						.css( { 'position' : 'absolute',
							'top'      : '0px', 
							'left'     : '0px',
							'width'	   : el.offsetWidth + 'px',
							'height'   : el.offsetHeight + 'px',
							'z-index'  : 100 } )
						.click( function( e ) { e.stopPropagation(); } );

				$j( el ).css( { 'position' : 'relative' } )	
					.fadeTo( 'fast', 0.5 )
					.append( mask )
					.data( 'mask', mask );

				//auto height fix for IE -- not sure about this, i think offsetWidth + Height is a better solution. Test!
				/*
				if( $j.browser.msie ) {
					mask.height(el.height() + parseInt(el.css("padding-top")) + parseInt(el.css("padding-bottom")));
					mask.width(el.width() + parseInt(el.css("padding-left")) + parseInt(el.css("padding-right")));
				}
				*/

			} 
			// XXX bind to a custom event in case the div size changes 
		} );

		return this;

	};

	jQuery.fn.unmask = function( options ) {

		$j.each( this, function( i, el ) {
			if ( $j( el ).data( 'mask' ) ) {
				var mask = $j( el ).data( 'mask' );
				$j( el ).removeData( 'mask' ); // from the data
				mask.remove(); // from the DOM
				$j( el ).fadeTo( 'fast', 1.0 );
			}
		} );

		
		return this;
	};


	/** 
	 * Safe hide and show
	 * Rather than use display: none, this collapses the divs to zero height
	 * This is good because then the elements in the divs still have layout and we can do things like mask and unmask (above)
	 * XXX may be obsolete as we are not really doing this any more
	 * disable form fields so we do not tab through them when hidden
	 * XXX for some reason the disabling doesn't work with the date field.
	 */ 

	jQuery.fn.maskSafeHide = function( options ) {
		$j.each( this.find( ':enabled' ), function(i, input) {
			$j( input ).data( 'wasEnabled', true )
				   .attr( 'disabled', 'disabled' );
		} );
		return this.css( { 'height' : '0px', 'overflow' : 'hidden' } );
	};

	// may be causing scrollbar to appear when div changes size
	// re-enable form fields (disabled so we did not tab through them when hidden)
	jQuery.fn.maskSafeShow = function( options ) {
		$j.each( this.find( ':disabled' ), function (i, input) {
			if ($j( input ).data( 'wasEnabled' )) {
				$j( input ).removeAttr( 'disabled' )
					   .removeData( 'wasEnabled' ); 
			}
		} );
		return this.css( { 'height' : 'auto', 'overflow' : 'visible' } );
	};

	$j.validator.setDefaults( {
		debug: true,
		errorClass: 'mwe-validator-error'
	} );

} )( jQuery );
/*
 * This script is run on [[Special:UploadWizard]].
 * Creates an interface for uploading files in multiple steps, hence "wizard"
 */

// create UploadWizard
mw.UploadWizardPage = function() {
	
	var apiUrl = false; 
	if ( typeof wgServer != 'undefined' && typeof wgScriptPath  != 'undefined' ) {
		 apiUrl = wgServer + wgScriptPath + '/api.php';
	}

	var config = { 
		debug:  wgUploadWizardDebug,  
		userName:  wgUserName,  
		userLanguage:  wgUserLanguage, 
		fileExtensions:  wgFileExtensions, 
		apiUrl: apiUrl,
	
		thumbnailWidth:  120,  
		smallThumbnailWidth:  60,  
		maxAuthorLength: 50,
		minAuthorLength: 2,
		maxSourceLength: 200,
		minSourceLength: 5,
		maxTitleLength: 200,
		minTitleLength: 5,
		maxDescriptionLength: 4096,
		minDescriptionLength: 5,
		maxOtherInformationLength: 4096,
		maxSimultaneousConnections: 2,
		maxUploads: 10,

		// not for use with all wikis. 
		// The ISO 639 code for the language tagalog is "tl".
		// Normally we name templates for languages by the ISO 639 code.
		// Commons already had a template called 'tl:  though.
		// so, this workaround will cause tagalog descriptions to be saved with this template instead.
		languageTemplateFixups:  { tl: 'tgl' }, 

		// names of all license templates, in order. Case sensitive!
		// n.b. in the future, the licenses for a wiki will probably be defined in PHP or even LocalSettings.
		licenses: [
			{ template: 'Cc-by-sa-3.0',	messageKey: 'mwe-upwiz-license-cc-by-sa-3.0', 	'default': true },
			{ template: 'Cc-by-3.0', 	messageKey: 'mwe-upwiz-license-cc-by-3.0', 	'default': false },
			{ template: 'Cc-zero', 		messageKey: 'mwe-upwiz-license-cc-zero', 	'default': false },
			// n.b. the PD-US is only for testing purposes, obviously we need some geographical discrimination here... 
			{ template: 'PD-US', 		messageKey: 'mwe-upwiz-license-pd-us', 		'default': false },
			{ template: 'GFDL', 		messageKey: 'mwe-upwiz-license-gfdl', 		'default': false }
		 ]

		// XXX this is horribly confusing -- some file restrictions are client side, others are server side
		// the filename prefix blacklist is at least server side -- all this should be replaced with PHP regex config
		// or actually, in an ideal world, we'd have some way to reliably detect gibberish, rather than trying to 
		// figure out what is bad via individual regexes, we'd detect badness. Might not be too hard.
		//
		// we can export these to JS if we so want.
		// filenamePrefixBlacklist: wgFilenamePrefixBlacklist,
		// 
		// filenameRegexBlacklist: [
		//	/^(test|image|img|bild|example?[\s_-]*)$/,  // test stuff
		//	/^(\d{10}[\s_-][0-9a-f]{10}[\s_-][a-z])$/   // flickr
		// ]
	};

	if ( !config.debug ) {
		mw.log.level = mw.log.NONE;
	}

	var uploadWizard = new mw.UploadWizard( config );
	uploadWizard.createInterface( '#upload-wizard' );

}

jQuery( document ).ready( function() {
	// sets up plural and so on. Seems like a bad design to have to do this, though.
	mw.Language.magicSetup();
	
	// show page. 
	mw.UploadWizardPage();
} );
