/**
 * Landpage.js
 * App for SecureSwap ICO website.
 *
 * Includes all of the following: Tools.js, I18n.js
 *
 * @version:	1.0.0
 * @author:		Philippe Aubessard, philippe@aubessard.net
 * @url         http://secureswap.com
 * @license:	Copyright (c) 2017, GreyMatterTechs.com. All rights reserved.
 * @namespace:	ss_ico
 *
 */

(function(window, undefined) {
	'use strict';

	window.ss_ico = window.ss_ico || {};	// NameSpace

	if (window.ss_ico.Tools === undefined) { throw new Error('Please load Tools.js'); }
	if (window.ss_ico.I18n === undefined) { throw new Error('Please load I18n.js'); }

	// ---------- class Landpage

	// --- public static

	// constructeur public static
	window.ss_ico.Landpage = function() {
		throw new Error('Please use getInstance');
	};

	// singleton factory public static
	window.ss_ico.Landpage.getInstance = function() {
		if (instance) { return instance; }
		instance = new Landpage();
		return instance;
	};

	// --- private static

	// membres private static

	var instance = null;

	// Constructeur private static
	var Landpage = function() {

		// --- private members

		var i18n = null;
		var clock = null;
		var clockIntervalDefault = 60000;
		var clockInterval = clockIntervalDefault;
		var clockIntervalId = null;
		var ethIntervalDefault = 60000;
		var ethInterval = ethIntervalDefault;
		var ethIntervalId = null;
		var purchaseIntervalDefault = 500;
		var purchaseInterval = purchaseIntervalDefault;
		var purchaseIntervalId = null;
		var mailchimpLanguage = '';

		// --- private methods

		var tokenPriceUSD = 0.45;

		function updateICO() {
			$.get('/api/ICOs/GetICOData')
				.done(function(ico) {
					clockInterval = clockIntervalDefault;
					if (ico) {
						var date = new Date(ico.dateStart);
						var now = new Date();
						var dif = (date.getTime() - now.getTime()) / 1000;
						dif = Math.max(1, dif);
						if (dif <= 0) {
							dif = 0;
							$('#btn-purchase').removeClass('disabled');
						}
						if (clock) {
							clock.stop();
							clock.setTime(dif);
							clock.start();
						}
						tokenPriceUSD = ico.tokenPriceUSD;
						var total = ico.tokensTotal;
						var sold = ico.tokensSold;
						var purchaseSoldPercent = parseInt(sold * 100 / total);
						$('#token-sale-mobile-app div.progress > div').css('width', purchaseSoldPercent + '%');
						$('#token-sale-mobile-app div.progress-bottom > div:nth-child(1)').text($.i18n('tokensale-area.info.percent', purchaseSoldPercent));
					}
				})
				.fail(function(err) {
					if (clockInterval < clockIntervalDefault * 100) clockInterval *= 2;
				});
		}
		function updateICOTimer() {
			if (clockIntervalId) clearInterval(clockIntervalId);
			updateICO();
			clockIntervalId = setInterval(updateICOTimer, clockInterval);
		}

		function updateETH() {
			$.get('https://api.coinmarketcap.com/v2/ticker/1027/?convert=EUR')
				.done(function(eth) {
					ethInterval = ethIntervalDefault;
					if (eth) {
						var tokenPriceEUR = tokenPriceUSD * (eth.data.quotes.EUR.price / eth.data.quotes.USD.price);
						var tokenPriceETH = tokenPriceUSD / eth.data.quotes.USD.price;
						$('#token-sale-mobile-app div.progress-bottom > div:nth-child(2)').text($.i18n('tokensale-area.info.eth', tokenPriceUSD.toFixed(2), tokenPriceEUR.toFixed(2), tokenPriceETH.toFixed(5)));
					}
				})
				.fail(function(err) {
					if (ethInterval < ethIntervalDefault * 100) ethInterval *= 2;
				});
		}
		function updateETHTimer() {
			if (ethIntervalId) clearInterval(ethIntervalId);
			updateETH();
			ethIntervalId = setInterval(updateETHTimer, ethInterval);
		}

		function updatePurchase() {
			$.get('/api/ICOs/getPurchase')
				.done(function(purchase) {
					purchaseInterval = purchaseIntervalDefault;
					if (purchase) {
						var time = 'A minute ago';
						$.notify({
							icon: 'assets/images/unknown_users/1.png',
							title: 'Thank you',
							message: 'New purchase: <span class="blue">' + purchase + ' SSWT</span> tokens.'
						}, {
							type: 'minimalist',
							placement: {
								from: 'bottom',
								align: 'left'
							},
							animate: {
								enter: 'animated fadeInLeftBig',
								exit: 'animated fadeOutLeftBig'
							},
							icon_type: 'image',
							template: '<div data-notify="container" class="alert alert-{0}" role="alert">' +
								'<button type="button" aria-hidden="true" class="close" data-notify="dismiss">×</button>' +
								'<div id="image">' +
								'<img data-notify="icon" class="rounded-circle float-left">' +
								'</div><div id="text">' +
								'<span data-notify="title">{1}</span>' +
								'<span data-notify="message">{2}</span>' +
								'<span data-notify="time">' + time + '</span>' +
								'</div>' +
							'</div>'
						});
					}
				})
				.fail(function(err) {
					if (purchaseInterval < purchaseIntervalDefault * 100) purchaseInterval *= 2;
				});
		}
		function updatePurchaseTimer() {
			if (purchaseIntervalId) clearInterval(purchaseIntervalId);
			updatePurchase();
			purchaseIntervalId = setInterval(updatePurchaseTimer, purchaseInterval);
		}


		function CFValidate() {
			var valid = true;
			$('#contact-form input[type=text]').each(function(index) {
				if (index == 0) {
					if ($(this).val() == null || $(this).val() == '') {
						$('#contact-form').find('input:eq(' + index + ')').addClass('required-error');
						valid = false;
					} else {
						$('#contact-form').find('input:eq(' + index + ')').removeClass('required-error');
					}
				} else if (index == 1) {
					if (!(/(.+)@(.+){2,}\.(.+){2,}/.test($(this).val()))) {
						$('#contact-form').find('input:eq(' + index + ')').addClass('required-error');
						valid = false;
					} else {
						$('#contact-form').find('input:eq(' + index + ')').removeClass('required-error');
					}
				} else if (index == 2) {
					if ($(this).val() == null || $(this).val() == '') {
						$('#contact-form').find('input:eq(' + index + ')').addClass('required-error');
						valid = false;
					} else {
						$('#contact-form').find('input:eq(' + index + ')').removeClass('required-error');
					}
				}

			});
			return valid;
		}


		// --- public methods

		return {

			init: function() {

				i18n = window.ss_ico.I18n.getInstance();

				$('#btn-purchase').addClass('disabled');

				/* FlipClock Counter */
				// http://www.dwuser.com/education/content/easy-javascript-jquery-countdown-clock-builder/
				FlipClock.Lang.Custom = {
					'years': '<span data-i18n="tokensale-area.flipclock.years"></span>',
					'months': '<span data-i18n="tokensale-area.flipclock.months"></span>',
					'days': '<span data-i18n="tokensale-area.flipclock.days"></span>',
					'hours': '<span data-i18n="tokensale-area.flipclock.hours"></span>',
					'minutes': '<span data-i18n="tokensale-area.flipclock.minutes"></span>',
					'seconds': '<span data-i18n="tokensale-area.flipclock.seconds"></span>'
				};
				var countdown = 10 * 24 * 60 * 60;
				clock = $('.clock').FlipClock(countdown, {
					clockFace: 'DailyCounter',
					countdown: true,
					language: 'Custom',
					classes: {
						active: 'flip-clock-active',
						before: 'flip-clock-before',
						divider: 'flip-clock-divider',
						dot: 'flip-clock-dot',
						label: 'flip-clock-label',
						flip: 'flip',
						play: 'play',
						wrapper: 'flip-clock-small-wrapper'
					}
				});

				//--------------------------------------------------------------------------------------------------------------
				// Contact Form
				//--------------------------------------------------------------------------------------------------------------

				$('#contact-success-alert').hide();
				$('#contact-error-alert').hide();
				$('#contact-debug-alert').hide();
				$('#contact-submit').click(function() {
					var valid = CFValidate();
					if (valid) {
						var ser = $('#contact-form').serialize();
						if (mailchimpLanguage !== '') {
							ser += '&language=' + mailchimpLanguage;
						}
						$('#contact-debug-alert').hide();
						$('#contact-submit').val('Sending...');
						$.ajax({
							type: 'POST',
							url: '/api/Contacts/contact',
							data: ser,
							success: function(result) {
								var res = JSON.parse(result);
								if (res.err) {
									$('#contact-error-alert').html(res.err);
									$('#contact-error-alert').fadeIn('slow');
									$('#contact-error-alert').delay(5000).fadeOut('slow');
								} else if (res.success) {
									$('#contact-form input[type=text]').val('');
									// $('#message').val('');
									$('#contact-success-alert').html(res.success);
									$('#contact-success-alert').fadeIn('slow');
									$('#contact-success-alert').delay(5000).fadeOut('slow');
								}
								$('#contact-submit').val('Send Message');
							},
							error: function() {
								$('#contact-error-alert').html('Sorry, messaging system sounds down. Error [0x4001].<br />Please retry later.');
								$('#contact-error-alert').fadeIn('slow');
								$('#contact-error-alert').delay(5000).fadeOut('slow');
								$('#contact-submit').val('Send Message');
							}
						});
					}
				});

				//--------------------------------------------------------------------------------------------------------------
				// Starts i18n, and run all scripts that requires localisation
				//--------------------------------------------------------------------------------------------------------------

				var i18nInitCallback = function() {
					// once the locale file is loaded , we can start other inits that needs i18n ready
					$('input[placeholder]').i18n();
				};

				var i18nUpdateCallback = function() {
					// once the locale is changed, we can update each moduel that needs i18n strings
					$('input[placeholder]').i18n();
					$('tokensale-area.flipclock.years').i18n();
					$('tokensale-area.flipclock.months').i18n();
					$('tokensale-area.flipclock.days').i18n();
					$('tokensale-area.flipclock.hours').i18n();
					$('tokensale-area.flipclock.minutes').i18n();
					$('tokensale-area.flipclock.seconds').i18n();
			//		$('div.progress-bottom > div:nth-child(1)').text($.i18n('tokensale-area.info.percent', purchaseSoldPercent));
				};

				i18n.init();
				i18n.buildGUI(i18nInitCallback, i18nUpdateCallback);
				mailchimpLanguage = i18n.getMailChimpLanguage();

				setTimeout(function() {
					updateICOTimer();
					updateETHTimer();
					updatePurchaseTimer();
				}, 200);

			}, // end of init:function

			dispose: function() {
			} // end of dispose

		}; // end of return

	}; // end of ss_ico.Landpage = function() {

	// ---------- End class Landpage

}(window));

window.ss_ico.Tools.getInstance().addEventHandler(document, 'DOMContentLoaded', window.ss_ico.Landpage.getInstance().init(), false);

// EOF