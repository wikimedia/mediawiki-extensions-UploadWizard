/*
 * This file is part of the MediaWiki extension UploadWizard.
 *
 * UploadWizard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * UploadWizard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with UploadWizard.  If not, see <http://www.gnu.org/licenses/>.
 */

( function ( mw, uw ) {
	var EFLP;

	/**
	 * @class uw.EventFlowLogger
	 * Event logging helper for funnel analysis. Should be instantiated at the very beginning; uses internal state
	 * to link events together.
	 * @constructor
	 * @param eventLog mw.eventLog object, for dependency injection
	 */
	function EventFlowLogger( eventLog ) {
		this.eventLog = eventLog;

		/**
		 * A random number identifying this upload session for analytics purposes.
		 * @property {string}
		 */
		this.flowId = parseInt( new Date().getTime() + '' + Math.floor( Math.random() * 1000 ), 10 );
	}
	EFLP = EventFlowLogger.prototype;

	/**
	 * Does the work of logging a step.
	 * @private
	 * @param {'tutorial'|'file'|'deeds'|'details'|'thanks'} step
	 * @param {boolean} [skipped=false]
	 */
	EFLP.performStepLog = function ( step, skipped ) {
		if ( !this.eventLog ) {
			return;
		}

		var data = { flowId: this.flowId, step: step };

		if ( skipped === true ) {
			data.skipped = true;
		}

		this.eventLog.logEvent( 'UploadWizardStep', data );
	};

	/**
	 * Logs entering into a given step of the upload process.
	 * @param {'tutorial'|'file'|'deeds'|'details'|'thanks'} step
	 */
	EFLP.logStep = function ( step ) {
		this.performStepLog( step, false );
	};

	/**
	 * Logs skipping a given step of the upload process.
	 * @param {'tutorial'|'file'|'deeds'|'details'|'thanks'} step
	 */
	EFLP.logSkippedStep = function ( step ) {
		this.performStepLog( step, true );
	};

	uw.EventFlowLogger = EventFlowLogger;
}( mediaWiki, mediaWiki.uploadWizard ) );
