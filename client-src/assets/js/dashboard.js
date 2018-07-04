/**
 * dashboard.js
 * App for SecureSwap ICO website.
 * 
 * Includes all of the following: Tools.js
 *
 * @version:	1.0.0
 * @author:		Philippe Aubessard, philippe@aubessard.net
 * @url         http://secureswap.com
 * @license:	Copyright (c) 2017, GreyMatterTechs.com. All rights reserved.
 * @namespace:	ss_ico
 *
 */

( function( window, undefined ) {
	'use strict';
	
	window.ss_ico = window.ss_ico || {};	// NameSpace

	if ( window.ss_ico.Tools === undefined ) { throw new Error( 'Please load Tools.js' ); }


	// ---------- class Dashboard

	// --- public static

	// constructeur public static
	window.ss_ico.Dashboard = function() {
		throw new Error( 'Please use getInstance' );
	};

	// singleton factory public static
	window.ss_ico.Dashboard.getInstance = function() {
		if ( instance ) { return instance; }
		instance = new Dashboard();
		return instance;
	};

	// --- private static

	// membres private static
	
	var instance = null;

	// Constructeur private static
	var Dashboard = function() {

		// --- private members

		var i18n			= null;

		// --- private methods

		
		var message = function(errCode) {
			var message = 'Unknown error';
			switch (errCode) {
				case 400:
				case 401: 
				case 403:
				case 404: message = 'Login failed.'; // intentional unclear message to final user
			}
			$('#error-txt').text(message);
			$('#error').show();
		};


		// --- public methods

		return {

			init : function(jerr) {

				$('#error').hide();
				$('#success').hide();

				setTimeout(function() {
					$('body').addClass('loaded');
				}, 200);

				
				





				if (jerr) {
					var err = JSON.parse(jerr);
					if (typeof err === 'string' && err !=='' ) {
						$('#error-txt').text(err);
						$('#error').show();
					}
				}	

			}, // end of init:function

			dispose: function() {
			} // end of dispose

		}; // end of return

	}; // end of ss_ico.Dashboard = function() {

	// ---------- End class Dashboard

}(window));

window.ss_ico.Tools.getInstance().addEventHandler( document, "DOMContentLoaded", window.ss_ico.Dashboard.getInstance().init(), false );

// EOF