'use strict';

const DeviceDriver = require('homey-devicedriver');
const path = require('path');

const Hive = require('./../../lib/HiveAPI');

// TODO target temp changed not working
// TODO hot water changed not working
// TODO thermostat mode changed not working
// TODO set hot water mode is not working
// TODO locales nl

module.exports = new DeviceDriver(path.basename(__dirname), {
	debug: true,
	initDevice: (device, callback) => {
		const username = new Buffer(device.data.username, 'base64');
		const password = new Buffer(device.data.password, 'base64');
		device.api = new Hive({
			debug: true,
			username: username.toString(),
			password: password.toString()
		});
		device.api.on('custom_thermostat_mode_changed', value => {
			Homey.manager('flow').triggerDevice('custom_thermostat_mode_changed', { "mode": value }, {}, device.data, err => {
				if (err) console.error('failed to trigger device custom_thermostat_mode_changed', value);
			});
		});
		return callback(null, device);
	},
	capabilities: {
		target_temperature: {
			pollInterval: 15000,
			get: (device, callback) => {
				device.api.getTargetTemperature((err, result) => {
					return callback(err, result);
				});
			},
			set: (device, temperature, callback) => {
				device.api.setTargetTemperature(temperature, err => {
					return callback(err, temperature);
				});
			}
		},
		measure_temperature: {
			pollInterval: 15000,
			get: (device, callback) => {
				device.api.getMeasureTemperature((err, result) => {
					return callback(err, result);
				});
			},
		},
		alarm_battery: {
			pollInterval: 15000,
			get: (device, callback) => {
				device.api.getBatteryState((err, result) => {
					return callback(err, result !== 'OK');
				});
			},
		},
		hot_water: {
			pollInterval: 15000,
			get: (device, callback) => {
				device.api.getHotWaterControllerState((err, result) => {
					if(result === 'off') result = null;
					return callback(err, result);
				});
			},
			set: (device, state, callback) => {
				device.api.setHotWaterControllerState(state, err => {
					return callback(err, state);
				});
			}
		},
		custom_thermostat_mode: {
			pollInterval: 15000,
			get: (device, callback) => {
				device.api.getClimateControllerState((err, result) => {
					return callback(err, result.control);
				});
			},
			set: (device, state, callback) => {
				device.api.setClimateControllerState(state, err => {
					return callback(err, state);
				});
			}
		}
	},
	pair: socket => {
		socket.on('authenticate', (data, callback) => {
			new Hive({
				debug: true,
				username: data.username,
				password: data.password
			})
				.on('login', context => {
					if (context && context.hasOwnProperty('users') &&
						context.users.hasOwnProperty(data.username) &&
						context.users[data.username].hasOwnProperty('hubs')) {

						const devices = [];
						for (let i in context.users[data.username].hubs) {
							Homey.manager('settings').set(`${i}_username`, data.username);
							Homey.manager('settings').set(`${i}_password`, data.password);
							devices.push({
								name: 'Hive Active Heating',
								data: {
									username: new Buffer(data.username).toString('base64'),
									password: new Buffer(data.password).toString('base64'),
									id: i
								}
							});
						}
						return callback(null, devices);
					}
					return callback('no_devices_found');
				})
				.on('login_error', err => {
					return callback(err);
				});
		});
	}
});

Homey.manager('flow').on('action.hot_water', function (callback, args) {
	const device = module.exports.getDevice(args.device);
	if (typeof device === 'undefined' || device instanceof Error) return callback('invalid_device');
	device.api.setHotWaterControllerState(args.mode, err => {
		return callback(err, args.mode);
	});
});

Homey.manager('flow').on('action.climate_control', function (callback, args) {
	const device = module.exports.getDevice(args.device);
	if (typeof device === 'undefined' || device instanceof Error) return callback('invalid_device');
	device.api.setClimateControllerState(args.mode, err => {
		return callback(err, args.mode);
	});
});

Homey.manager('flow').on('trigger.custom_thermostat_mode_changed', function (callback, args, state) {
	console.log('trigger.custom_thermostat_mode_changed', 'args', args, 'state',state);
	if (typeof args.mode === 'undefined' || typeof state.mode === 'undefined') return callback('invalid_parameters');
	if (args.mode === state.mode) return callback(null, true);
	return callback(null, false);
});

module.exports.on('custom_thermostat_mode_changed', (device, capability, value) => {
	console.log(capability, value)
	Homey.manager('flow').triggerDevice('custom_thermostat_mode_changed', { mode: value }, { mode: value }, device.data, err => {
		if (err) console.error('custom_thermostat_mode_changed error -> ', err);
	});
});

Homey.manager('flow').on('trigger.hot_water_changed', function (callback, args, state) {
	console.log('trigger.hot_water_changed', 'args', args, 'state',state);
	if (typeof args.mode === 'undefined' || typeof state.mode === 'undefined') return callback('invalid_parameters');
	if (args.mode === state.mode) return callback(null, true);
	return callback(null, false);
});

module.exports.on('hot_water_changed', (device, capability, value) => {
	console.log(capability, value)
	if (value === null) value = 'off';
	Homey.manager('flow').triggerDevice('hot_water_changed', { mode: value }, { mode: value }, device.data, err => {
		if (err) console.error('hot_water_changed error -> ', err);
	});
});