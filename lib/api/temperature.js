'use strict';

const Widget = require('./widget');

class Temperature extends Widget {
	constructor(context, connection) {
		super(context, "temperature", connection);
	}
}

module.exports = Temperature;
