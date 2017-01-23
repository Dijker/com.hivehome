'use strict';

const EventEmitter = require('events').EventEmitter;

class Hubs extends EventEmitter {

	constructor(user, hub, connection) {
		super();

		this.hub = user;
		this.actualHub = hub;
		this.connection = connection;
		console.log('Hubs init')
		console.log(this.connection);
		this.hub['users'][this.connection.username] = { 'hubs': JSON.parse('{\"' + this.actualHub.id + '\":{}}') };
		this.context = {
			'id': this.actualHub.id,
			'deviceId': undefined
		}
	}

	findController(callback) {
		this.hub['users'][this.connection.username]['hubs'][this.actualHub.id] = {
			devices: {
				GET: ''
			}
		};

		if (this.actualHub.devices) {
			this.hub['users'][this.connection.username]['hubs'][this.actualHub.id] = this.actualHub.devices;
			return callback(this.hub);
		} else {
			this.connection.command.push(this.hub, (error, response, body) => {

				if (!error && response.statusCode == 200) {
					let installedDevices = JSON.parse(body);

					installedDevices.forEach(dev => {
						if (dev.type.substring(0, 16) == 'HAHVACThermostat') {
							this.actualHub.devices = getDevices(dev.id);
							this.hub['users'][this.connection.username]['hubs'][this.actualHub.id] = this.actualHub.devices;
						}
					});

					return callback(this.hub);
				}
				else {
					let errorReason = JSON.parse(response.body);
					this.emit('invalid', errorReason);
				}
			});
		}
	}
}


function getDevices(deviceId) {
	return {
		'devices': {
			'hotwater': JSON.parse("{\"" + deviceId + "\":{}}"),
			'climate': JSON.parse("{\"" + deviceId + "\":{}}"),
			'temperature': JSON.parse("{\"" + deviceId + "\":{}}")
		}
	};
}

module.exports = Hubs;
