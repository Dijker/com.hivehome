'use strict';

const Widget = require('./widget');

class ClimateControl extends Widget {

	constructor(context, connection) {
		super(context, "climate", connection);
		this.mode = { "Off": "OFF", "Manual": "MANUAL", "Schedule": "SCHEDULE", "Boost": "BOOST" };
	}

	setState(req, callback) {
		this.call({
			'control': {
				'PUT': { 'control': req }
			}
		}, callback);
	}

	getState(callback) {
		this.call({ GET: {} }, callback);
	}

	targetTemperature(target, callback) {
		this.call({
			'targetTemperature': {
				'PUT': {
					'temperatureUnit': 'C',
					'temperature': target
				}
			}
		}, callback);
	}
}

module.exports = ClimateControl;

