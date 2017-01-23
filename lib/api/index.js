'use strict';

const request = require('request');
const EventEmitter = require('events').EventEmitter;
const Hub = require('./hubs');
const Connection = require('./connection.js');

//TODO multiple hubs

class Hive extends EventEmitter {

	constructor(username, password, api) {
		super();

		this.config = {
			credentials: {
				username: username,
				password: password
			},
			api: {
				Hive: 'https://api-prod.bgchprod.info/api',
				AlertMe: 'https://api.alertme.com/v5'
			}
		};

		this.connection = new Connection();
		this.connection.authToken = null;
		this.connection.username = null;

		if (!api) api = 'Hive';
		if (api == "AlertMe") this.connection.domain = this.config.api.AlertMe;
		else this.connection.domain = this.config.api.Hive;
	}

	login(callback) {

		if (this.connection.authToken && this.connection.username) {
			let hubsCounter = 0;
			this.connection.hubs.forEach(hubConnection => {
				const hub = new Hub(JSON.parse('{\"users\":{\"' + this.connection.username + '\":{}}}'), hubConnection, this.connection);
				hub.findController(deviceId => {
					// remove the drain callback which may log us out again
					this.connection.command.drain = undefined;
					this.emit('login', deviceId);
					if (hubsCounter === this.connections.hubs.length) {
						hubsCounter = 0;
						return callback(null, deviceId);
					}
				});
			});
		} else {
			// re-authenticate our credentials with the server
			this.connection.command.unshift({
				login: {
					POST: {
						"username": this.config.credentials.username,
						"password": this.config.credentials.password,
						"caller": "HiveHome"
					}
				}
			}, (error, response, body) => {
				if (!error && response.statusCode == 200) {
					const data = JSON.parse(body);
					const j = request.jar();
					j.setCookie(request.cookie('ApiSession=' + data.ApiSession), this.config.api.Hive);
					this.connection.authToken = j;
					this.connection.username = data.username;
					const userObject = JSON.parse('{\"users\":{\"' + data.username + '\":{}}}');
					if (data.hubIds && data.hubIds.length > 0) {
						let hubsCounter = data.hubIds.length;
						for (let i = 0; i < data.hubIds.length; i++) {
							this.connection.hubs[i].id = data.hubIds[i];
							const hub = new Hub(userObject, this.connection.hubs[i], this.connection);
							hub.findController(deviceId => {
								this.connection.command.drain = undefined;
								this.emit('login', deviceId);
								if (hubsCounter === data.hubIds.length) {
									hubsCounter = 0;
									return callback(null, deviceId);
								}
							});
						}
					}
				} else {
					const errorReason = JSON.parse(response.body);
					if (response.statusCode == 400) {
						if (errorReason.error.reason == 'USERNAME_PASSWORD_ERROR') this.emit('not_authorised', errorReason);
						else if (errorReason.error.reason == 'ACCOUNT_LOCKED') this.emit('locked', errorReason);
						else if (errorReason.error.reason == 'TOKENS_ARE_NOT_COMPATIBLE_WITH_LOGIN') this.emit('invalid', errorReason);
					}
					else if (response.statusCode == 500) this.emit('unavailable', errorReason);
					else if (response.statusCode == 503) this.emit('rate_limit', errorReason);
					return callback(errorReason);
				}
			});
		}

		// resume processing the queue
		if (this.connection.command.paused) this.connection.command.resume();
	}

	logout() {
		if (!this.connection.command.idle()) {
			this.connection.command.drain = function () {
				this.logoutWrapper();
			}.bind(this);
		} else {
			this.logoutWrapper();
		}
	}

	logoutWrapper() {
		this.connection.command.push({
			logout: {
				POST: {}
			}
		}, (error, response) => {
			if (!error && response.statusCode == 204) {
				this.connection.authToken = undefined;
				this.connection.username = undefined;
				this.emit('logout');
			}
			// stop the queue from processing and clear down all tasks
			this.connection.command.pause();
			this.connection.command.kill();
		});
	}
}

module.exports = Hive;


