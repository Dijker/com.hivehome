'use strict';

const Widget = require('./widget');

class HotWaterControl extends Widget {

	constructor(context, connection) {
		super(context, "hotwater", connection);
		this.mode = { "Schedule": "SCHEDULE", "Manual": "MANUAL", "Boost": "BOOST" };
	}

	setState(state, callback) {
		this.call({
			'controls': {
				'PUT': {
					'operation': state
				}
			}
		}, callback);
	}

	getState(callback) {
		this.call({
			'controls': {
				'GET': {}
			}
		}, callback);
	}
}

module.exports = HotWaterControl;
