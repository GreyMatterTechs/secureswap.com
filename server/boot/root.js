/**
 * Module for HTTP requests routing.
 *
 * @module root
 * @file   This file defines the root module.
 *
 * @author Philippe Aubessard
 * Copyright Grey Matter Technologies, 2018. All Rights Reserved.
 */

'use strict';

// ------------------------------------------------------------------------------------------------------
// includes
// ------------------------------------------------------------------------------------------------------

const path		= require('path');
const requestIp	= require('request-ip');
const geoip		= require('geoip-lite');
const request	= require('superagent');
const g			= reqlocal(path.join('node_modules', 'loopback', 'lib', 'globalize'));
const config	= reqlocal(path.join('server', 'config' + (process.env.NODE_ENV === undefined ? '' : ('.' + process.env.NODE_ENV)) + '.js'));
const logger	= reqlocal(path.join('server', 'boot', 'winston.js')).logger;

// ------------------------------------------------------------------------------------------------------
// Local Vars
// ------------------------------------------------------------------------------------------------------

const ONE_HOUR		= 60 * 60;
const ONE_MINUTE	= 60;
var mAdmin;
var mContact;
var mAccessToken;


// ------------------------------------------------------------------------------------------------------
// Private Methods
// ------------------------------------------------------------------------------------------------------

/**
 * Check if val is a String
 *
 * @method isString
 * @private
 * @param   {*}       val The string to check
 *
 * @returns {Boolean} True if val is a String
 */
function isString(val) {
	return Object.prototype.toString.call(val) === '[object String]';
	// return typeof val === 'string' || ((!!val && typeof val === 'object') && Object.prototype.toString.call(val) === '[object String]');
}

/**
 * Shorten a String and add '...'
 *
 * @method shorten
 * @private
 * @param   {String} str     The String to shorten
 * @param   {Number} [len=5] Optional. Max length
 *
 * @returns {String} The shortened string
 */
function shorten(str, len) {
	if (isString(str)) {
		len = (typeof len === 'number') ? len : 5;
		if (str.length > len) {
			var deb = str.substring(0, len);
			return deb + '\u2026';
		}
		return str;
	} else {
		return str;
	}
}


/**
 * @description determine if an array contains one or more items from another array.
 * @param {array} haystack the array to search.
 * @param {array} arr the array providing items to check for in the haystack.
 * @return {boolean} true|false if haystack contains at least one item from arr.
 */
var findOne = function(haystack, arr) {
	return arr.some(v => haystack.indexOf(v) >= 0);
};


/**
 * Log a user
 *
 * @method login
 * @private
 * @param    {String[]} grantedRoles   Received HTTP request
 * @param    {Object}   req            Received HTTP request
 * @callback {Function} cb             Callback function
 * @param    {Error}    err            Error information
 * @param    {String}   id             Token ID of logged in user
 * @param    {String[]} roles          Roles of the logged in user
 */
function login(grantedRoles, req, cb) {
	if (!req.body) {
		return cb(403, null);
	}
	if (!req.body.username && !req.body.password) {
		return cb(403, null);
	}
	mAdmin.login({
		username: req.body.username,
		password: req.body.password,
		ttl: config.loginTTL === 'hour' ? ONE_HOUR : (config.loginTTL === 'minute' ? ONE_MINUTE : (ONE_MINUTE))
	}, 'user', function(err, token) {
		if (err) {
			return cb(err.statusCode, null);
		}
		if (token.user) {
			token.user(function(err, user) {
				if (err) {
					return cb(err.statusCode, token.id);
				}
				if (!user.active) {
					mAdmin.logout(token.id);
					return cb(401, token.id);
				} else {
					if (grantedRoles) {
						var granted = findOne(grantedRoles, user.roles);
						if (granted) {
							return cb(null, token.id, user.roles);
						} else {
							mAdmin.logout(token.id);
							return cb(401, token.id);
						}
					} else {
						return cb(null, token.id, user.roles);
					}
				}
			});
		} else {
			return cb(403, token.id);
		}
	});
}


/**
 * Check access token validity
 *
 * @method checkToken
 * @private
 * @param    {String}   tokenId The token ID got from call to /login
 * @callback {Function} cb      Callback function
 * @param    {Error}    err     Error information
 * @param    {Object}   user    Granted user
 */
function checkToken(tokenId, roles, cb) {
	const DEFAULT_TOKEN_LEN = 64; // taken from E:\DevGreyMatter\websites\secure-swap.com\node_modules\loopback\common\models\access-token.js
	var e = new Error(g.f('Invalid Access Token'));
	e.status = e.statusCode = 401;
	e.code = 'INVALID_TOKEN';

	if (typeof roles === 'function') {
		cb = roles;
		roles = null;
	}
	if (!isString(tokenId) || tokenId.length !== DEFAULT_TOKEN_LEN)
		return cb(e, null);

	mAccessToken.findById(tokenId, function(err, accessToken) {
		if (err) return cb(err, null);
		if (accessToken) {
			accessToken.validate(function(err, isValid) {	// check user ACL and token TTL
				if (err) {
					return cb(err, null);
				} else if (isValid) {
					mAdmin.findById(accessToken.userId, function(err, user) {	// check if user is active
						if (err) return cb(err, null);
						if (!user || !user.active) {
							return cb(e, null);
						}
						if (roles) {
							var granted = findOne(roles, user.roles);
							if (!granted) {
								return cb(e, null);
							}
						}
						return cb(null, user);
					});
				} else {
					return cb(e, null);
				}
			});
		} else {
			return cb(e, null);
		}
	});
}

/**
 * Log a user
 *
 * @method getUser
 * @private
 * @param    {Object}   req      Received HTTP request
 * @callback {Function} cb       Callback function
 * @param    {Error}    err      Error information
 * @param    {Object}   user     the logged in user
 */
function getUser(req, roles, cb) {
	if (typeof roles === 'function') {
		cb = roles;
		roles = null;
	}
	if (!req.query.access_token && !req.accessToken) {
		return cb(403, null);
	}
	var token = req.query.access_token || req.accessToken;
	checkToken(token.id, roles, function(err, user) {
		if (err) return cb(err, null);
		return cb(null, user);
	});
}


function hrtime2human(diff) {
	const num = diff[0] * 1e9 + diff[1];
	if (num < 1e3) {
		return num + ' ns';
	} else if (num >= 1e3 && num < 1e6) {
		return num / 1e3 + ' µs';
	} else if (num >= 1e6 && num < 1e9) {
		return num / 1e6 + ' ms';
	} else if (num >= 1e9) {
		return num / 1e9 + ' s';
	}
};


function geo2str(geo) {
	if (geo) return ' (' + geo.city + ',' + geo.region + ',' + geo.country + ')';
	return ' (localhost)';
}


// ------------------------------------------------------------------------------------------------------
// Exports
// ------------------------------------------------------------------------------------------------------

/**
 * Module export
 *
 * @public
 * @param {Object} server Express App
 * @api public
 */
module.exports = function(server) {
	server.locals.env			= config.currentEnv;
	server.locals.db			= server.dataSources.db.settings.host ? server.dataSources.db.settings.host : 'local';
	server.locals.dntSupport	= config.dntSupport;
	server.locals.dntTrack		= config.dntTrack;
	server.locals.GA_KEY		= config.GA_KEY;
	server.locals.grecKeyPub	= config.grecKeyPub;

	mAdmin						= server.models.Admin;
	mContact					= server.models.Contact;
	mAccessToken				= server.models.AccessToken;
	var router					= server.loopback.Router();

	// ------------------------------------------------
	// Add Expires header to /images and /stylesheets directories
	// ------------------------------------------------

	router.get('/*', function(req, res, next) {
		if (config.trackIP) {
			// const time = process.hrtime();
			req.clientIP = requestIp.getClientIp(req);
			req.geo = geoip.lookup(req.clientIP);
			// const diff = process.hrtime(time);
			if (config.dntSupport && req.header('dnt') == 1) {
				req.clientIP = '[IP hidden]';
			}
			// logger.info('Received ' + req.method + ' request: ' + shorten(req.url, 64) + ' from: ' + req.clientIP + geo2str(req.geo) + ' [geoip: ' + hrtime2human(diff) + ']');
		}
		if (req.url.indexOf('assets/images') >= 0 || req.url.indexOf('assets/css/') >= 0) {
			res.setHeader('Cache-Control', 'public, max-age=2592000');
			res.setHeader('Expires', new Date(Date.now() + 2592000000).toUTCString());
		}

		res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
		res.setHeader('Expires', '0');
		res.setHeader('Pragma', 'no-cache');

		next();
	});
	router.post('/*', function(req, res, next) {
		if (config.trackIP) {
			// const time = process.hrtime();
			req.clientIP = requestIp.getClientIp(req);
			req.geo = geoip.lookup(req.clientIP);
			// const diff = process.hrtime(time);
			if (config.dntSupport && req.header('dnt') == 1) {
				req.clientIP = '[IP hidden]';
			}
			// logger.info('Received ' + req.method + ' request: ' + shorten(req.url, 64) + ' from: ' + req.clientIP + geo2str(req.geo) + ' [geoip: ' + hrtime2human(diff) + ']');
		}
		next();
	});

	// index page
	router.get('/', function(req, res) {
		logger.info('route GET \"/\" from: ' + req.clientIP + geo2str(req.geo));
		if (config.private === true) {
			if (!req.query.access_token && !req.accessToken) {		// not logged user, no login form data
				return res.render('login', {						// render the login page, empty form
					appName: config.appName,
					tokenName: config.tokenName,
					action: '/',
					err: null
				});
			} else {
				getUser(req, function(err, user) {					// also check if accessToken is legit.
					if (err) {
						return res.render('login', {				// accessToken invalid, render the login page, empty form
							appName: config.appName,
							tokenName: config.tokenName,
							action: '/',
							err: null
						});
					} else {										// logged user, accessToken granted
						logger.info('route GET \"/\" from: ' + req.clientIP + geo2str(req.geo) + ' [' + user.username + ']');
						var token = req.query.access_token || req.accessToken;
						mAdmin.setOnlineStatus(token, 'online');
						return res.render('index', {				// render the index
							appName: config.appName,
							tokenName: config.tokenName,
							roles: user.roles.split(','),
							ajaxDelay: config.ajaxDelay,
							cmcURI: config.cmcURI,
							err: null
						});
					}
				});
			}
		} else {
			res.render('index', {									// not logged user, no login form data, but ok, website is public
				appName: config.appName,
				tokenName: config.tokenName,
				ajaxDelay: config.ajaxDelay,
				cmcURI: config.cmcURI,
				err: null
			});
		}
	});
	router.post('/', function(req, res) {
		logger.info('route POST \"/\" from: ' + req.clientIP + geo2str(req.geo));
		if (!req.body)
			return res.sendStatus(403);
		if (req.body.access_token) {								// logged user, accessToken granted
			checkToken(req.body.access_token, function(err, user) {
				if (err) {
					mAdmin.setOnlineStatus(req.body.access_token, 'offline');
					return res.render('login', {					// accessToken invalid, render the login page, empty form
						appName: config.appName,
						tokenName: config.tokenName,
						action: '/',
						err: null
					});
				} else {
					mAdmin.setOnlineStatus(req.body.access_token, 'online');
					logger.info('route POST \"/\" from: ' + req.clientIP + geo2str(req.geo) + ' [' + user.username + ']');
					return res.render('index', {							// render index
						appName: config.appName,
						tokenName: config.tokenName,
						roles: req.body.roles.split(','),
						ajaxDelay: config.ajaxDelay,
						cmcURI: config.cmcURI,
						err: null
					});
				}
			});
		} else {													// not logged user, login form credentials filled
			login(null, req, (err, tokenId, roles) => {
				if (err) {
					return res.sendStatus(err);
				} else {
					mAdmin.setOnlineStatusByTokenId(tokenId, 'online');
					return res.send({								// login granted. Send accessToken back to Login Form, that will post "/" again
						appName: config.appName,
						tokenName: config.tokenName,
						accessToken: tokenId,
						roles: roles,
						ajaxDelay: config.ajaxDelay,
						action: '/',
						err: null
					});
				}
			});
		}
	});

	// extranet page
	router.get('/extranet', function(req, res) {
		logger.info('route GET \"/extranet\" from: ' + req.clientIP + geo2str(req.geo));
		if (!req.query.access_token && !req.accessToken) {		// not logged user, no login form data
			return res.render('login', {						// render the login page, empty form
				appName: config.appName,
				action: '/extranet',
				err: null
			});
		} else {
			getUser(req, function(err, user) {					// also check if accessToken is legit.
				if (err) {
					return res.render('login', {				// accessToken invalid, render the login page, empty form
						appName: config.appName,
						action: '/extranet',
						err: null
					});
				} else {										// logged user, accessToken granted
					logger.info('route GET \"/extranet\" from: ' + req.clientIP + geo2str(req.geo) + ' [' + user.username + ']');
					var token = req.query.access_token || req.accessToken;
					mAdmin.setOnlineStatus(token, 'online');
					return res.render('extranet', {				// render the extranet page
						appName: config.appName,
						ajaxDelay: config.ajaxDelay,
						avatar: user.username.toLowerCase(),
						user: user,
						accessToken: req.body.access_token,
						err: null
					});
				}
			});
		}
	});
	router.post('/extranet', function(req, res) {
		logger.info('route POST \"/extranet\" from: ' + req.clientIP + geo2str(req.geo));
		if (!req.body)
			return res.sendStatus(403);
		if (req.body.access_token) {								// logged user, accessToken granted
			checkToken(req.body.access_token, ['teammember'], function(err, user) {
				if (err) {
					mAdmin.setOnlineStatusById(user.id, 'offline');
					mAdmin.logout(req.accessToken.id);
					return res.render('login', {					// accessToken invalid, render the login page, empty form
						appName: config.appName,
						action: '/extranet',
						err: null
					});
				} else {
					mAdmin.setOnlineStatusById(user.id, 'online');
					logger.info('route POST \"/extranet\" from: ' + req.clientIP + geo2str(req.geo) + ' [' + user.username + ']');
					return res.render('extranet', {							// render extranet page
						appName: config.appName,
						ajaxDelay: config.ajaxDelay,
						avatar: user.username.toLowerCase(),
						user: user,
						accessToken: req.body.access_token,
						err: null
					});
				}
			});
		} else {													// not logged user, login form credentials filled
			login(['teammember'], req, (err, tokenId, roles) => {
				if (err) {
					return res.sendStatus(err);
				} else {
					return res.send({								// login granted. Send accessToken back to Login Form, that will post "/extranet" again
						appName: config.appName,
						accessToken: tokenId,
						roles: roles,
						ajaxDelay: config.ajaxDelay,
						action: '/extranet',
						err: null
					});
				}
			});
		}
	});

	router.post('/kb', function(req, res) {
		logger.info('route POST \"/kb\" from: ' + req.clientIP + geo2str(req.geo));
		if (!req.body)
			return res.sendStatus(403);
		if (req.body.access_token) {								// logged user, accessToken granted
			checkToken(req.body.access_token, ['teammember'], function(err, user) {
				if (err) {
					if (user) mAdmin.setOnlineStatusById(user.id, 'offline');
					if (req.accessToken) mAdmin.logout(req.accessToken.id);
					return res.render('login', {					// accessToken invalid, render the login page, empty form
						appName: config.appName,
						action: '/kb',
						err: null
					});
				} else {
					mAdmin.setOnlineStatusById(user.id, 'online');
					logger.info('route POST \"/kb\" from: ' + req.clientIP + geo2str(req.geo) + ' [' + user.username + ']');
					return res.render('kb', {							// render extranet page
						appName: config.appName,
						ajaxDelay: config.ajaxDelay,
						avatar: user.username.toLowerCase(),
						user: user,
						accessToken: req.body.access_token,
						action: '/kb',	// pour résoudre un bug: lorsque token est timeout, si F5 sur Chrome, il essaie de r'afficher la page Login à partir de sa cache, et il lui manque cette variable
						err: null
					});
				}
			});
		} else {													// not logged user, login form credentials filled
			login(['teammember'], req, (err, tokenId, roles) => {
				if (err) {
					return res.sendStatus(err);
				} else {
					return res.send({								// login granted. Send accessToken back to Login Form, that will post "/extranet" again
						appName: config.appName,
						accessToken: tokenId,
						roles: roles,
						ajaxDelay: config.ajaxDelay,
						action: '/kb',
						err: null
					});
				}
			});
		}
	});

	router.post('/login', function(req, res) {
		logger.info('route POST \"/login\" from: ' + req.clientIP + geo2str(req.geo));
		login(null, req, (err, tokenId) => {
			if (err) {
				res.sendStatus(err);
			} else {
				res.send({accessToken: tokenId});
			}
		});
	});

	router.get('/privacy', function(req, res) {
		logger.info('route POST \"/privacy\" from: ' + req.clientIP + geo2str(req.geo));
		return res.render('privacy', {
			appName: config.appName,
			tokenName: config.tokenName,
			err: null
		});
	});

	router.get('/do-not-track', function(req, res) {
		logger.info('route POST \"/do-not-track\" from: ' + req.clientIP + geo2str(req.geo));
		return res.render('do-not-track', {
			appName: config.appName,
			tokenName: config.tokenName,
			err: null
		});
	});

	router.get('/terms', function(req, res) {
		logger.info('route POST \"/terms\" from: ' + req.clientIP + geo2str(req.geo));
		return res.render('terms', {
			appName: config.appName,
			tokenName: config.tokenName,
			err: null
		});
	});


	router.get('/dashboard', function(req, res) {
		logger.info('route GET \"/dashboard\" from: ' + req.clientIP + geo2str(req.geo));
		if (!req.query.access_token && !req.accessToken) {
			return res.render('dashboard', {	// render the login form
				appName: config.appName,
				err: null,
				login: true
			});
		} else {
			// $$$ TODO: check if accessToken is legit.
			return res.render('dashboard', {	// render the login form
				appName: config.appName,
				err: null,
				accessToken: req.accessToken.token.id,
				login: false
			});
		}
	});

	router.post('/dashboard', function(req, res) {
		logger.info('route POST \"/dashboard\" from: ' + req.clientIP + geo2str(req.geo));
		if (!req.body)
			return res.sendStatus(403);
		if (req.body.access_token) {
			// $$$ TODO: check if accessToken is legit.
			mAdmin.setOnlineStatus(req.body.access_token, 'online');
			return res.render('dashboard', {
				appName: config.appName,
				err: null,
				accessToken: req.body.access_token,
				login: false
			});
		}
		login(null, req, (err, tokenId) => {
			if (err) {
				mAdmin.setOnlineStatusByTokenId(tokenId, 'offline');
				return res.sendStatus(err);
			} else {
				mAdmin.setOnlineStatusByTokenId(tokenId, 'online');
				return res.send({
					appName: config.appName,
					err: null,
					accessToken: tokenId,
					login: false
				});
			}
		});
	});

	// log a user out
	router.post('/logout', function(req, res, next) {
		logger.info('route POST \"/logout\" from: ' + req.clientIP + geo2str(req.geo));
		if (!req.body)
			return res.sendStatus(403);
		if (!req.accessToken)
			return res.sendStatus(403);
		mAdmin.setOnlineStatusByTokenId(req.accessToken.id, 'offline');
		mAdmin.logout(req.accessToken.id, function(err) {
			if (err) return res.sendStatus(403);
			return res.redirect('/'); // on successful logout, redirect to home
		});
	});

	router.post('/contact', function(req, res, next) {
		logger.info('route POST \"/contact\" from: ' + req.clientIP + geo2str(req.geo));
		// if (!req.cookies.sent) {
		mContact.contact(req, function(err, result) {
			if (err) {
				return res.send(err);
			}
			// /* On créé un cookie de courte durée (120 secondes) pour éviter de renvoyer un e-mail en rafraichissant la page */
			// res.cookie('sent', '', {maxAge: 120, expires: new Date(Date.now() + 120), httpOnly: false});
			return res.send(result);
		});
		// } else {
		// 	return res.send({err: 'contact-area.error.message1'});
		//	// don't clear cookie --- res.clearCookie('sent');
		// }
	});


	router.post('/captcha', function(req, res, next) {
		// https://developers.google.com/recaptcha/docs/v3
		logger.info('route POST \"/captcha\" from: ' + req.clientIP + geo2str(req.geo));
		if (!req.body) {
			return res.sendStatus(403);
		}
		if (!req.body.token) {
			return res.sendStatus(403);
		}
		var url = 'https://www.google.com/recaptcha/api/siteverify?secret=' + config.grecKeyPriv + '&response=' + req.body.token;
		if (!config.dntSupport || req.header('dnt') == 0) {
			url = url + '&remoteip=' + req.clientIP;
		}
		request
			.get(url)
			.end((err, resp) => {
				if (err) return res.send(err);
				if (!resp.body.success) {
					var errors = resp.body['error-codes'];
					if (errors) return res.sendStatus(403);
				}
				var validReferers = ['secure-swap.com', 'www.secure-swap.com', 'staging.secure-swap.com', 'localhost'];
				var referer = resp.body['hostname'];
				if (!validReferers.includes(referer)) {
					logger.warn('route POST \"/captcha\" received a call from referer:' + referer);
					return res.sendStatus(403);
				}
				switch (resp.body['action']) {
				case 'homepage':
					return res.send({valid: true});
				case 'contact':
					if ((+resp.body['score']) >= 0.8) {
						return res.send({valid: true});
					} else {
						return res.send({valid: false, err: 'contact-area.error.message3'});
					}
				default:
					return res.send({valid: false, err: 'contact-area.error.message3'});
				}
			});
	});

	server.use(router);
};
