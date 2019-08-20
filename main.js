'use strict'
import fs from 'fs'
import _ from 'lodash'
import moment from 'moment'
import cheerio from 'cheerio'
import rp from 'request-promise-native'

const LOG_INDEX_ONDISK = './data/logs.json'
const LOG_TYPES = ['kill', 'admin', 'chat', 'login', 'violations']
const BASE_URL = 'https://g-portal.com'
const LOGIN_QS = `?redirect=${encodeURIComponent('https://www.g-portal.com/en/gportalid/login&redirectAfterLogin=https%3A%2F%2Fwww.g-portal.com%2F')}`
const LOGIN_URL = 'https://id2.g-portal.com/login'

const LOGS_URL = BASE_URL + '/en/scum/logs'
const EMPTY_LOG_INDEX = (() => { var index = {}; _.each(LOG_TYPES, (t, i) => { index[t] = {} }); return index })()

function writeFile(file, data, enc = 'utf8') {

	return new Promise((resolve, reject) => {

        fs.writeFile('./' + file, data, enc, (err) => {

            if (err) reject(err)
            resolve(`File ${file} written to disk.`)
        })
    })
}

function readFile(file, enc = 'utf8') {

    return new Promise((resolve, reject) => {

        fs.readFile('./' + file, enc, (err, data) => {
			
            if (err) reject(err)
            resolve(data)
        })
    })
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

// 		b.browse('login', LOGIN_URL, { debug: true })
// 		b.browse((err, out) => {

// 			if (err) reject(err)

// 			const { window } = new JSDOM(out.result)
// 			let $form = $('.content > form')
// 			let target = LOGIN_BASE_URL + $form.attr('action')
// 			let pairs = {}
			
// 			$('input').each((k, el) => {
// 				let $e = $(el)
// 				let type = $e.attr('type')
// 				let name = $e.attr('name')
// 				let value = $e.val()
// 				if (type == 'submit') pairs[type] = value
// 				if (name == 'login') pairs[name] = config.password
// 				if (name == 'rememberme' || name == '_method') pairs[name] = value
// 			})
// 			return [target, { data: pairs, method: 'POST' }]
// 		})
// 		.after('login')

// 		let logIndex = EMPTY_LOG_INDEX

// 		b.browse(LOGS_URL + `/${config.serverid}`, { debug: true }, (err, out) => {

// 			if(err) reject(err)

// 			const { window } = new JSDOM(out.result)
// 			let $ = require('jquery')(window)
// 			let logs = $('.wrapper.logs').data('logs')

// 			if (_.size(logs) > 0) {
// 				let table = []
		
// 				_.each(logs, (v, k) => {
// 					let row = {}
		
// 					// Fetch only the filename for further dissection.
// 					let dot = v.lastIndexOf('.')
// 					let slash = v.lastIndexOf('\\') + 1
// 					let filename = v.substring(slash, dot)
// 					let parts = filename.split('_')
// 					let date = moment(parts[1], 'YYYYMMDDHHmmss')
// 					let unix = date.unix()
// 					let type = parts[0]
// 					let id = type + '-' + unix
		
// 					// Build a row.
// 					row._id = id
// 					row._dt = date.format('DD-MM-YYYY @ HH:mm:ssZZ')
// 					row.unix = date.unix()
// 					row.type = type
// 					row.key = k
// 					row.value = v
// 					row.downloaded = false
// 					row.processed = false 
		
// 					// Next patient, please!
// 					logIndex[type][id] = row
// 				})
// 			} else {
// 				reject(new Error('No logs were found.'))
// 			}
// 		})
// 		.after()
		
// 		b.on('end', err => { 

// 			if (err) {
// 				reject(err) 
// 			}
// 			else {
// 				resolve(logIndex)
// 			}
// 		})
		
// 		b.run()

function main() {

	// Retrieve config from local file.
	/* Assure the next JSON is in ./.credentials: 
	     {
			"username": "YOUR_GPORTAL_USERNAME",
			"password": "YOUR_GPORTAL_PASSWORD",
			"serverid": "TARGETED_SERVER"
		 }
		The last value can be found in the admin-section at the end of
		for example: g-portal.com/en/scum/logs/[serverid]
	*/
	readFile('./.credentials')
		.then(JSON.parse)
		.then(config => {
			// Use the info to start logging into G-Portal.
			rp({
				// method: 'POST',
				// form: {
				// 	'_method': 'POST',
				// 	'login': config.username,
				// 	'password': config.password,
				// 	'rememberme': '0',
				// 	'submit': 'Log in'
				// },
				url: LOGIN_URL,
				transform: body => { return cheerio.load(body) },
				simple: false
			})
			.then($ => {
				console.log($)
			})
			.catch(console.error)
		})
		.catch(console.error)
}

main();


