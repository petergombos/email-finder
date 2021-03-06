var dns = require('dns'),
	net = require('net');
var Promise = require('bluebird');


/**
 * This module will validate email addresses using SMTP's RCPT TO: command.
 * @param  {Array}		accounts	An array of accounts to be checked on a given domain
 * @param  {String}		domain		The domain address we use for the emails
 * @param  {Object}		options 	timeout, from_email, fqdn, debug
 * @param  {Function}	reject	Gets calld with a first param being an error object, and a second param being an array of valid email addresses.
 * This module is based on: https://github.com/nmanousos/email-existence
 */
module.exports = function(accounts, domain, options) {
	return new Promise(function(resolve, reject) {

		// check if options is given
		options = options || {};


		// check if only one email is given
		if (typeof accounts === "string") {
			accounts = [accounts];
		}

		// Clean domain input
		domain = domain.trim().toLowerCase();

		// Create and validate email addresses from accouns
		var emails = [];
		for (var i = 0; i < accounts.length; i++) {
			var email = accounts[i] + "@" + domain;
			if (/^\S+@\S+$/.test(email)) {
				emails.push(email);
			}
		}

		// If not even one email address is given retun an error
		if (emails.length === 0) {
			return reject({
				code: 700,
				message: "Could not create valid email addresses from accounts"
			});
		}

		// Set defaults
		options.timeout = options.timeout || 10000;
		options.from_email = options.from_email || emails[0];
		options.debug = options.debug || false;


		// Getting the MX records for the domain
		dns.resolveMx(domain, function(err, addresses) {

			// If there is anything wrong with the domain or no MX record found
			if (err || addresses.length === 0) {
				return reject({
					code: 701,
					message: "Could not found valid MX records for this domain: " + domain
				});
			}

			// This is wehere we keep the validated addresses
			var validAddesses = [];


			// Creating socket
			var conn = net.createConnection(25, addresses[0].exchange);


			// This is an invalid email address we use to detect catch all domains
			var invalidEmail = Math.random().toString(36).substring(7) + emails[0];

			// A set of commands for the initial connection
			var commands = ["EHLO " + (options.fqdn || addresses[0].exchange), "MAIL FROM:<" + options.from_email + ">", "RCPT TO:<" + invalidEmail + ">"];


			// Adding email addresses to the commands
			for (var i = 0; i < emails.length; i++) {
				commands.push("RCPT TO:<" + emails[i] + ">");
			}

			// At last we set the last QUIT command to cleanly close connections
			commands.push("QUIT");

			// We store the our current command index in this variable
			var i = 0;

			// Setting encoding for the connection
			conn.setEncoding('ascii');

			// Setting timeout
			conn.setTimeout(options.timeout);

			// If anything goes bad this gets called
			conn.on('false', function(err) {
				reject(err);
				conn.removeAllListeners();
				conn.destroy();
			});
			
			// On error, we close the connection
			conn.on('error', function() {
				conn.emit('false', {
					code: 702,
					message: "Connection error"
				});
			});

			// Gets called on connection timeout
			conn.on('timeout', function() {
				conn.emit('false', {
					code: 703,
					message: "Connection timeout"
				});
			});

			// Server hang-up on us 
			conn.on('end', function() {
				conn.emit('false', {
					code: 706,
					message: "Connection has been terminated by the server"
				});
			});

			// On Connection
			conn.on('connect', function() {
				// Ready for the next command to be sent
				conn.on('prompt', function() {
					if (i < commands.length) {
						if (options.debug) {
							console.log(commands[i]);
						}
						conn.write(commands[i]);
						conn.write('\r\n');
						i++;
					} else {

						// If there is no more command to be run, lets call resolve with the validated addresses
						resolve(validAddesses);
						conn.removeAllListeners();
						conn.destroy(); //destroy socket manually
					}
				});

				// Whe data is received on the socket
				conn.on('data', function(data) {

					// Removing line breaks
					var response = data.toString().replace(/(?:\\[rn]|[\r\n]+)+/g, "");

					// Grepping the response code
					var responseCode = parseInt(response.substring(0, 3), 10);

					// Grepping subcode
					var responseSubCode = response.substring(4, 9);

					// Console log response if debug is set true
					if (options.debug) {
						console.log(response);
					}

					// If response has positive codes
					if (responseCode === 220 || responseCode === 250 || responseCode === 221 || responseCode === 450) {

						// If this response is after the catchall check we retun an error
						if (i === 3) {
							conn.emit('false', {
								code: 705,
								message: "Domain has catchall address"
							});
						} else {

							// Woohoo new validated address found  
							// (450) is for google apps https://support.google.com/mail/answer/6592
							if (i > 3 && (responseCode === 250 || responseCode === 450)) {
								validAddesses.push(emails[i - 4]);
							}

							// Lets run the next command
							conn.emit('prompt');

						}
						// If response contains 550, 553, 554 (email not found) lets go to the next command
					} else if (responseCode === 550 || responseCode === 553 || responseCode === 554) {
						conn.emit('prompt');
						// If anythimg else goes on retun it as an error
					} else {
						conn.emit('false', {
							code: 704,
							message: data.toString(),
							smtpStatusCode: responseCode
						});
					}
				});
			});
		});
	});
};