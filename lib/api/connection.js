'use strict';

const request = require('request');
const async = require("async");

class Connection {

	constructor() {

		this.domain = "https://api-prod.bgchprod.info/api";
		this.headers = { 'User-Agent': 'bg-hive-api/1.0.5' };
		this.username = undefined;
		this.authToken = undefined;
		this.hubs = [{
			id: undefined,
			devices: undefined
		}];

		this.command = async.queue((task, callback) => {

			const options = {
				url: undefined,
				headers: this.headers,
				jar: this.authToken,
				form: undefined,
				method: undefined,
				qs: undefined,
				timeout: 5000
			};

			if (typeof task == 'object') {
				const result = getTaskURI(task);
				options.url = this.domain + result.url;
				options.method = result.method;
				if (result.method !== 'GET') options.form = result.body;
				else options.qs = result.body;
			}

			request(options, (error, response, body) => callback(error, response, body));
		}, 2);
	}
}


function getTaskURI(task) {

	let rval = { url: '',
		body: undefined,
		method: undefined
	};

	if (typeof task == 'object') {
		Object.keys(task).forEach(key => {
			if (key !== 'PUT' && key !== 'POST' && key !== 'GET') {
				const url = '/' + key;
				const result = getTaskURI(task[key]);
				rval = result;
				rval.url = url + result.url;
			}
			else {
				rval.body = task[key];
				rval.method = key;
			}
		});
	}
	return rval;
}


module.exports = Connection;