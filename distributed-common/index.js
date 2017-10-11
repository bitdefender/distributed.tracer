const commander = require('commander');
const fs = require('fs');

var configuration = {};

function GetUrl(protocol, server) {
	var ret = protocol + "://";

	if ("undefined" !== typeof server.user) {
		ret += server.user;
		if ("undefined" !== typeof server.password) {
			ret += ':' + server.password;
		}

		ret += '@';
	}

	if ("undefined" === typeof server.host) {
		return null;
	}

	ret += server.host;
	
	if ("undefined" !== typeof server.port) {
		ret += ':' + server.port;
	}

	ret += '/'
	return ret;
}

module.exports = exports = {
	"Init" : () => {
		try {
			commander
				.option('-c, --config [config_file]', 'Configuration file')
				.parse(process.argv);
		} catch (ex) {
		}

		try {
			var configFile = commander.config_file || "config.json";
			console.log("Using config " + configFile);
			var cfg = fs.readFileSync(configFile);
			configuration = JSON.parse(cfg);

			console.log(configuration);
			return true;
		} catch (ex) {
			return false;
		}
		
	},

	"amqp" : {
		"GetUrl" : () => {
			return GetUrl('amqp', configuration.rabbit);
		},

		"GetNewTests" : () => {
			return configuration.rabbit.flow.prefix + "." + configuration.rabbit.flow.new;
		},

		"GetNewQueue" : (executableId) => {
			return configuration.rabbit.flow.prefix + "." + 
				configuration.rabbit.flow.new + "." +
				executableId;
		},

		"GetBatchedQueue" : (executableId) => {
			return configuration.rabbit.flow.prefix + "." + 
				configuration.rabbit.flow.batched + "." +
				executableId;
		}
	},

	"mongo" : {
		"GetUrl" : () => {
			return GetUrl('mongodb', configuration.mongo) + configuration.mongo.database;
		},

		"GetOplogUrl" : () => {
			return GetUrl('mongodb', configuration.mongo) + "local";
		},

		"GetDatabase" : () => {
			return configuration.mongo.database;
		}
	}
};