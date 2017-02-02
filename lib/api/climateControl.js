'use strict';

const Widget = require('./widget');

class ClimateControl extends Widget {

	constructor(context, connection) {
		super(context, "climate", connection);
		this.mode = { "off": "OFF", "manual": "MANUAL", "schedule": "SCHEDULE", "boost": "BOOST" };
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

