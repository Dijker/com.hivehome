'use strict';

const DeviceDriver = require('homey-devicedriver');
const path = require('path');

const Hive = require('./../../lib/HiveAPI');

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
				if (device.data.id.includes('heating_control')) {
					device.api.getTargetTemperature((err, result) => {
						return callback(err, result);
					});
				} else return callback('capability_not_active');
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
				if (device.data.id.includes('heating_control')) {
					device.api.getMeasureTemperature((err, result) => {
						return callback(err, result);
					});
				} else return callback('capability_not_active');
			},
		},
		alarm_battery: {
			pollInterval: 60000,
			get: (device, callback) => {
				device.api.getBatteryState((err, result) => {
					return callback(err, result !== 'OK');
				});
			},
		},
		hot_water: {
			pollInterval: 15000,
			get: (device, callback) => {
				if (device.data.id.includes('hot_water')) {
					device.api.getHotWaterControllerState((err, result) => {
						return callback(err, result);
					});
				} else return callback('capability_not_active');
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
				if (device.data.id.includes('heating_control')) {

					device.api.getClimateControllerState((err, result) => {
						return callback(err, result.control);
					});
				} else return callback('capability_not_active');
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

							// Check if hot water and climate devices are present
							if (context.users[data.username].hubs[i].hasOwnProperty('devices')) {

								Homey.manager('settings').set(`${i}_username`, data.username);
								Homey.manager('settings').set(`${i}_password`, data.password);

								if (context.users[data.username].hubs[i].devices['climate']) {
									devices.push({
										name: 'Hive Heating Control',
										capabilities: ["target_temperature", "measure_temperature", "alarm_battery", "custom_thermostat_mode"],
										mobile: {
											"components": [
												{
													"capabilities": [],
													"id": "icon"
												},
												{
													"capabilities": [
														"measure_temperature",
														"alarm_battery"
													],
													"id": "sensor"
												},
												{
													"capabilities": [
														"custom_thermostat_mode"
													],
													"id": "picker"
												},
												{
													"capabilities": [
														"target_temperature"
													],
													"id": "thermostat"
												}
											]
										},
										data: {
											username: new Buffer(data.username).toString('base64'),
											password: new Buffer(data.password).toString('base64'),
											id: i + 'heating_control'
										}
									});
								}

								if (context.users[data.username].hubs[i].devices['hotwater']) {
									devices.push({
										name: 'Hive Hot Water Control',
										capabilities: ["hot_water", "alarm_battery"],
										mobile: {
											"components": [
												{
													"capabilities": [],
													"id": "icon"
												},
												{
													"capabilities": [
														"alarm_battery"
													],
													"id": "sensor"
												},
												{
													"capabilities": [
														"hot_water"
													],
													"id": "picker"
												}
											]
										},
										data: {
											username: new Buffer(data.username).toString('base64'),
											password: new Buffer(data.password).toString('base64'),
											id: i + 'hot_water'
										}
									});
								}
							}
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
	if (typeof args.mode === 'undefined' || typeof state.custom_thermostat_mode === 'undefined') return callback('invalid_parameters');
	if (args.mode === state.custom_thermostat_mode) return callback(null, true);
	return callback(null, false);
});

module.exports.on('custom_thermostat_mode_changed', (device, value) => {
	Homey.manager('flow').triggerDevice('custom_thermostat_mode_changed', { custom_thermostat_mode: value }, { custom_thermostat_mode: value }, device.data, err => {
		if (err) console.error('custom_thermostat_mode_changed error -> ', err);
	});
});

Homey.manager('flow').on('trigger.hot_water_changed', function (callback, args, state) {
	if (typeof args.mode === 'undefined' || typeof state.hot_water === 'undefined') return callback('invalid_parameters');
	if (args.mode === state.hot_water) return callback(null, true);
	return callback(null, false);
});