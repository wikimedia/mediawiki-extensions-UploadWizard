// Firefogg utilities not related to the upload handler or transport
( function ( mw, $ ) {
	mw.Firefogg = {

		firefoggInstallLinks: {
			macosx: 'https://firefogg.org/macosx/Firefogg.xpi',
			win32: 'https://firefogg.org/win32/Firefogg.xpi',
			linux: 'https://firefogg.org/linux/Firefogg.xpi'
		},

		/**
		 * Get the URL for installing firefogg on the client OS
		 *
		 * @return {string}
		 */
		getFirefoggInstallUrl: function () {
			var osLink = 'https://firefogg.org/';
			if ( navigator.oscpu && $.client.profile().name === 'firefox' ) {
				if ( navigator.oscpu.search( 'Linux' ) >= 0 ) {
					osLink = this.firefoggInstallLinks.linux;
				} else if ( navigator.oscpu.search( 'Mac' ) >= 0 ) {
					osLink = this.firefoggInstallLinks.macosx;
				} else if ( navigator.oscpu.search( 'Win' ) >= 0 ) {
					osLink = this.firefoggInstallLinks.win32;
				}
			}
			return osLink;
		},

		isInstalled: function () {
			return typeof window.Firefogg !== 'undefined' && new window.Firefogg().version >= '2.8.05';
		}
	};
}( mediaWiki, jQuery ) );
