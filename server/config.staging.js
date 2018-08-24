'use strict';

module.exports = {
	restApiRoot: '/api',
	remoting: {
		context: false,
		rest: {
			handleErrors: false,
			normalizeHttpPath: false,
			xml: false
		},
		json: {
			strict: false,
			limit: '100kb'
		},
		urlencoded: {
			extended: true,
			limit: '100kb'
		},
		cors: false
	},
	legacyExplorer: false,
	currentEnv: process.env.NODE_ENV || 'development',
	host: process.env.LB_HOST,
	port: process.env.LB_PORT,
	nginxhost: process.env.NGINX_HOST,
	nginxport: process.env.NGINX_PORT,
	appName: 'Secure Swap',
	tokenName: 'SSW',
	loginTTL: 'hour',
	private: true,
	icoURI: process.env.ICO_URI,
	trackIP: true,
	logger2console: true,
	ajaxDelay: 5000,
	mailRecipient: {
		to: process.env.CONTACT_TO,
		cc: process.env.CONTACT_CC,
		cci: process.env.CONTACT_CCI
	}
};
