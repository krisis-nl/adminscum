const fs = require('fs');
const _ = require('lodash');

const browser = require('browser');
var b = new browser();

const parser = require('htmlparser2');

const moment = require('moment');

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const CFG = {
	username: 'GPORTAL_USERNAME',
	password: 'GPORTAL_PASSWORD',
	serverid: 'SERVERIDHEREPLZ',
}
const LOG_INDEX_ONDISK = './data/logs.json';
const LOG_TYPES = ['kill', 'admin', 'chat', 'login', 'violations'];
const LOGIN_BASE_URL = 'https://id2.g-portal.com';
const LOGIN_URL = LOGIN_BASE_URL + '/login?redirect=https%3A%2F%2Fwww.g-portal.com%2Fen%2Fgportalid%2Flogin%3FredirectAfterLogin%3Dhttps%253A%252F%252Fwww.g-portal.com%252F';
const BASE_URL = 'https://g-portal.com'
const LOGS_URL = BASE_URL + '/en/scum/logs/' + CFG.serverid;
const EMPTY_LOG_INDEX = generateEmptyLogIndex();

function generateEmptyLogIndex() {
	var index = {};

	_.each(LOG_TYPES, (t, i) => { index[t] = {} });

	return index;
}

function downloadLogs() {
	return;
}

function processLogs(log) {
	return;
}

function writeUpdatedLogIndex(current) {
	return fs.writeFileSync(LOG_INDEX_ONDISK, JSON.stringify(current));
}

function verifyLogIndex(current, remote) {
	if (_.isUndefined(current)) {
		// First time or wiped.
		return remote;
	}
	// Compare and add to current where necessary.
	_.each(LOG_TYPES, (c, i) => {
		_each(remote[c], (data, id) => {
			// Omit already known log files.
			if (_.has(current[c], id)) continue;
			
			// Add to current.
			current[c][id] = data;
		});
	});
	return current;
}

function errorHandler(err) {
	console.error(err)
}

function populateLocalLogIndex() {

	return new Promise((resolve, reject) => {
		fs.stat(LOG_INDEX_ONDISK, (err, stats) => {
			if (err) {
				if (err.code === 'ENOENT') {
					resolve(undefined);
				}
				return reject(err)
			}
			fs.readFile(LOG_INDEX_ONDISK, 'utf8', (err, data) => {
				if (err) {
					return reject(err)
				}
				resolve(data)
			})
		})
	})
}

function __populateRemoteLogIndex() {
	
	return new Promise((resolve, reject) => {
		var logIndex = EMPTY_LOG_INDEX

		// Login.
		b.browse('login', LOGIN_URL, { debug: true });
		b.browse((err, out) => {
			if (err) return new Error('Package browser complained while accessing ' + LOGIN_URL + '.');

			const { window } = new JSDOM(out.result);
			var $ = require('jquery')(window);
		
			var $form = $('.content > form');
			var target = LOGIN_BASE_URL + $form.attr('action');
			var pairs = {};
			
			$('input').each((k, el) => {
				var $e = $(el);
				var type = $e.attr('type')
				var name = $e.attr('name')
				var value = $e.val();
				if (type == 'submit') pairs[type] = value;
				if (name == 'login') pairs[name] = CFG.username;
				if (name == 'password') pairs[name] = CFG.password;
				if (name == 'rememberme' || name == '_method') pairs[name] = value;
			})
		
			return [target, { data: pairs, method: 'POST' }];
		}).after('login');

		// Go to logs and create an index.
		b.browse(LOGS_URL, { debug: true }, (err, out) => {
			if (err) return new Error('Package browser complained while accessing ' + LOGS_URL + '.')

			const { window } = new JSDOM(out.result)
			var $ = require('jquery')(window)
		
			var logs = $('.wrapper.logs').data('logs')
		
			if (_.size(logs) > 0) {
				var table = []
		
				_.each(logs, (v, k) => {
					var row = {}
		
					// Fetch only the filename for further dissection.
					var dot = v.lastIndexOf('.')
					var slash = v.lastIndexOf('\\') + 1
					var filename = v.substring(slash, dot)
					var parts = filename.split('_')
					var date = moment(parts[1], 'YYYYMMDDHHmmss')
					var unix = date.unix()
					var type = parts[0]
					var id = type + '-' + unix
		
					// Build a row.
					row._id = id
					row._dt = date.format('DD-MM-YYYY @ HH:mm:ssZZ')
					row.unix = date.unix()
					row.type = type
					row.key = k
					row.value = v
					row.downloaded = false
					row.processed = false 
		
					// Next patient, please!
					logIndex[type][id] = row
				})
				resolve(logIndex)
			} else {
				return reject(new Error('No logs were found.'))
			}
		})
		.after()
		
		b.on('end', err => { if (err) return reject(err) })

		b.run()
	})
}

function populateRemoteLogIndex() {
	return new Promise((resolve, reject) => {
		$b = new browser()
		let data = {}
		let selector = '.content > form'
		
		$b.browse('login', LOGIN_URL, { debug: true })
		$b.browse((err, out) => {
			if (err) reject(err)

			const { window } = new JSDOM(out.result);
			var $ = require('jquery')(window);
		
			var $form = $(selector);
			var target = LOGIN_BASE_URL + $form.attr('action');
			var pairs = {};
			
			$('input').each((k, el) => {
				var $e = $(el);
				var type = $e.attr('type')
				var name = $e.attr('name')
				var value = $e.val();
				if (type == 'submit') data[type] = value;
				if (name == 'login') data[name] = CFG.username;
				if (name == 'password') data[name] = CFG.password;
				if (name == 'rememberme' || name == '_method') data[name] = value;
			})
		})
		.after('login')
		
		$b.submit({
			from: LOGIN_URL,
			selector,
			data
		})
		.after()
		

		$b.browse(LOGS_URL, { debug: true })
		$b.browse((err, out) => {
			if(err) reject(err)
			const { window } = new JSDOM(out.result)
			var $ = require('jquery')(window)
		
			var logs = $('.wrapper.logs').data('logs')
		
			if (_.size(logs) > 0) {
				var table = []
		
				_.each(logs, (v, k) => {
					var row = {}
		
					// Fetch only the filename for further dissection.
					var dot = v.lastIndexOf('.')
					var slash = v.lastIndexOf('\\') + 1
					var filename = v.substring(slash, dot)
					var parts = filename.split('_')
					var date = moment(parts[1], 'YYYYMMDDHHmmss')
					var unix = date.unix()
					var type = parts[0]
					var id = type + '-' + unix
		
					// Build a row.
					row._id = id
					row._dt = date.format('DD-MM-YYYY @ HH:mm:ssZZ')
					row.unix = date.unix()
					row.type = type
					row.key = k
					row.value = v
					row.downloaded = false
					row.processed = false 
		
					// Next patient, please!
					logIndex[type][id] = row
				})
				resolve(logIndex)
			} else {
				reject(new Error('No logs were found.'))
			}
		})
		.after()
		
		$b.on('end', err => { if (err) reject(err) })
		
		$b.run()
	})
}

function main() {
	
	populateRemoteLogIndex().then(res => {
		console.log(res)
		return populateLocalLogIndex()
	}, errorHandler)
	.then(res => {
		console.log(res)
	}, errorHandler)
}


main();
//setInterval(monitor, 60000);

