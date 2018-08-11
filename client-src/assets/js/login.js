/**
 * App for SecureSwap ICO website.
 *
 * @requires	Include all of the following: Tools.js
 * @file		Login.js
 * @version:	1.0.0
 * @author:		Philippe Aubessard
 * @link        http://secureswap.com
 * @copyright:	Copyright (c) 2017, GreyMatterTechs.com. All rights reserved.
 * @namespace:	ss_ico
 */

'use strict';

/**
 * 
 */
(function(window, undefined) {

	window.ss_ico = window.ss_ico || {};	// NameSpace

	if (window.ss_ico.Tools === undefined ) { throw new Error('Please load Tools.js'); }

	// ---------- class Login

	// --- public static

	// constructeur public static
	window.ss_ico.Login = function() {
		throw new Error('Please use getInstance');
	};

	// singleton factory public static
	window.ss_ico.Login.getInstance = function() {
		if (instance) { return instance; }
		instance = new Login();
		return instance;
	};

	// --- private static

	// membres private static

	var instance = null;

	// Constructeur private static
	var Login = function() {

		// --- private members

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

			init: function(jerr) {

				$('#error').hide();
				$('#success').hide();

				setTimeout(function() {
					$('body').addClass('loaded');
				}, 200);

				$('#login').off('click').on('click', function(e) {
					e.preventDefault();
					$.post('/', $('form').serialize())
						.done(function(data) {
							if (data.err) {
								message(data.err);
							} else {
								//	$('.content-wrapper').html(data);
								$('input[name="access_token"]').val(data.accessToken);
								$('form').submit();
							}
						})
						.fail(function(err) {
							message(err.status);
						});
				});
				$(document).on('click blur keydown', '.form-control', function(e) {
					$('#error').hide();
				});

				if (jerr) {
					var err = JSON.parse(jerr);
					if (typeof err === 'string' && err !== '') {
						$('#error-txt').text(err);
						$('#error').show();
					}
				}

			} // end of init:function

		}; // end of return

	}; // end of ss_ico.Login = function() {

	// ---------- End class Login

}(window));

// window.ss_ico.Tools.getInstance().addEventHandler( document, "DOMContentLoaded", window.ss_ico.Login.getInstance().init(), false );

// EOF
