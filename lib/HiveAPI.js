'use strict';

const events = require('events');

const HiveAPI = require('./api');
const ClimateControl = require('./api/climateControl');
const HotWaterControl = require('./api/hotWaterControl');

class Hive extends events.EventEmitter {

	constructor(options) {
		super();

		// Store options and override defaults
		this.options = Object.assign({
			debug: false,
			username: undefined,
			password: undefined
		}, options);

		// Do not continue without username and password
		if (typeof this.options.username === 'undefined' || typeof this.options.password === 'undefined') {
			return this._error('missing username or password');
		}

		this.login(err => {
			if (err) return this._error(err);
		});
	}

	/**
	 * Login method, times out after 5 seconds, stores
	 * climateController and hotWaterController object.
	 * @param callback
	 */
	login(callback) {
		if (!this.api) this.api = new HiveAPI(this.options.username, this.options.password);
		this.api.login((err, result) => {
			if (err) {
				this.loggedIn = false;
				this._error(`login failed -> ${err}`);
				this.emit('login_error', err);
				return callback(`login failed -> ${err}`);
			}
			this.loggedIn = true;
			this._debug('login successful', result);
			if (result) {
				this.context = result;
				this.climateController = new ClimateControl(result, this.api.connection);
				this.hotWaterController = new HotWaterControl(result, this.api.connection);
			}
			this.emit('login', result);
			return callback(err, result)
		});
	}

	/**
	 * Get climate controller state object.
	 * @param callback
	 */
	getClimateControllerState(callback) {
		this.loginMiddleware(err => {
			if (!err) {
				this.climateController.getState((err, result) => {
					if (err) {
						this._error(`getClimateControllerState failed -> ${err}`);
						return callback(`getClimateControllerState failed -> ${err}`);
					}
					return callback(null, result);
				});
			} else return callback(err);
		});
	}

	/**
	 * Set climate controller state object.
	 * @param mode ['Off', 'Manual', 'Schedule', 'Boost']
	 * @param callback
	 */
	setClimateControllerState(mode, callback) {
		if (mode !== 'Off' && mode !== 'Manual' && mode !== 'Schedule' && mode !== 'Boost') return callback(`invalid mode ${mode}`);
		this.loginMiddleware(err => {
			if (!err) {
				this.climateController.setState(this.climateController.mode[mode], err => {
					if (err) {
						this._error(`setClimateControllerState failed -> ${err}`);
						return callback(`error -> ${err}`);
					}
					return callback(null, true);
				});
			}
		});
	}

	/**
	 * Set target temperature.
	 * @param temperature
	 * @param callback
	 */
	setTargetTemperature(temperature, callback) {
		if (typeof temperature !== 'number') return callback('invalid temperature');
		this.setClimateControllerState('Manual', err => {
			if (!err) {
				this.climateController.targetTemperature(temperature, err => {
					if (err) {
						this._error(`setTargetTemperature failed -> ${err}`);
						return callback(`error -> ${err}`);
					}
					return callback(null, temperature);
				});
			} else return callback(err);
		});
	}

	/**
	 * Get target temperature.
	 * @param callback
	 */
	getTargetTemperature(callback) {
		this.getClimateControllerState((err, result) => {
			if (err || typeof result === 'undefined') return callback(err || 'no response');
			return callback(null, result.targetTemperature);
		});
	}

	/**
	 * Get measure temperature.
	 * @param callback
	 */
	getMeasureTemperature(callback) {
		this.getClimateControllerState((err, result) => {
			if (err || typeof result === 'undefined') return callback(err || 'no response');
			return callback(null, result.currentTemperature);
		});
	}

	/**
	 * Get hot water controller state object.
	 * @param callback
	 */
	getHotWaterControllerState(callback) {
		this.loginMiddleware(err => {
			if (!err) {
				this.hotWaterController.getState((err, result) => {
					if (err) {
						this._error(`getHotWaterControllerState failed -> ${err}`);
						return callback(`getHotWaterControllerState failed -> ${err}`);
					}
					if (result && result.hasOwnProperty('current')) result = result.current.toLowerCase();
					return callback(null, result);
				});
			} else return callback(err);
		});
	}

	/**
	 * Set hot water controller mode.
	 * @param mode ['SCHEDULE', 'MANUAL', 'BOOST', 'OFF']
	 * @param callback
	 */
	setHotWaterControllerState(mode, callback) {
		this.loginMiddleware(err => {
			if (!err) {
				console.log(mode)
				this.hotWaterController.setState(mode, err => {
					if (err) {
						this._error(`setHotWaterControllerState failed -> ${JSON.stringify(err)}`);
						return callback(`setHotWaterControllerState failed -> ${JSON.stringify(err)}`);
					}
					return callback(null, true);
				});
			}
		})
	}

	getBatteryState(callback) {
		this.getClimateControllerState((err, result) => {
			if (err) return callback(err);
			return callback(null, result.battery);
		});
	}

	/**
	 * Check if logged in, if not login.
	 * @param callback
	 * @returns {*}
	 */
	loginMiddleware(callback) {
		if (!this.loggedIn) {
			this.login((err, result) => {
				if (result) return callback(err, result);
			});
		} else {
			return callback(null, this.context);
		}
	}

	/**
	 * Debug method that will enable logging when
	 * debug: true is provided in the main options
	 * object.
	 * @private
	 */
	_debug() {
		if (this.options.debug) {
			const args = Array.prototype.slice.call(arguments);
			args.unshift('[debug] bg-hive-api');
			console.log.apply(null, args);
		}
	}

	/**
	 * Debug method that will enable logging when
	 * debug: true is provided in the main options
	 * object.
	 * @private
	 */
	_error() {
		if (this.options.debug) {
			const args = Array.prototype.slice.call(arguments);
			args.unshift('[error] bg-hive-api');
			console.log.apply(null, args);
		}
	}
}

module.exports = Hive;