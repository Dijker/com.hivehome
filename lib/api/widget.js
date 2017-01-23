'use strict';

const EventEmitter = require('events').EventEmitter;

class Widget extends EventEmitter {

	constructor(context, name, connection) {
		super();

		this.connection = connection;
		this.hubId = Object.keys(context['users'][this.connection.username]['hubs'])[0];
		this.deviceId = Object.keys(context['users'][this.connection.username]['hubs'][this.hubId]['devices'][name])[0];
		this.deviceName = name;
	}

	call(requestObject, callback) {
		try {
			let task = {};

			if (requestObject) {
				task = JSON.parse("{\"users\":{\"" + this.connection.username + "\":{}}}");
				task['users'][this.connection.username] = {
					'widgets': JSON.parse("{\"" + this.deviceName + "\":{\"" + this.deviceId + "\":{}}}")
				};
				task['users'][this.connection.username]['widgets'][this.deviceName][this.deviceId] = requestObject;
			}
			else {
				this.emit('error');
				if (typeof callback === 'function') callback('error -> missing requestObject');
				return;
			}

			this.connection.command.push(task, (error, response, body) => {
				if (!error && response.statusCode == 200) {
					this.emit('complete', JSON.parse(body));
					if (typeof callback === 'function') return callback(null, JSON.parse(body));
				}
				else if (!error && response.statusCode == 204) {
					this.emit('accepted');
					if (typeof callback === 'function') return callback(null, 'accepted');
				}
				else {
					const errorReason = JSON.parse(response.body);
					if (response.statusCode == 401 && errorReason.error.reason == 'NOT_AUTHORIZED') this.emit('not_authorised', errorReason);
					else if (response.statusCode == 401 && errorReason.error.reason == 'NO_SUCH_TOKEN') this.emit('no_token', errorReason);
					else if (response.statusCode == 401 && errorReason.error.reason == 'NO_SUCH_SESSION') this.emit('session_timeout', errorReason);
					else if (response.statusCode == 403) this.emit('not_available', errorReason);
					else if (response.statusCode == 404) this.emit('invalid', errorReason);
					else if (response.statusCode == 503) this.emit('rate_limit', errorReason);
					else if (error) this.emit('error', error);

					if (typeof callback === 'function') return callback(errorReason);
				}
			});
		}
		catch (err) {
			this.emit('error', err);
			if (typeof callback === 'function') return callback(err);
		}
	}
}

module.exports = Widget;


