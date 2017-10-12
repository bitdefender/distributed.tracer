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
				.option('-c, --config [config_file]', 'Configuration file', "config.json")
				.parse(process.argv);
		} catch (ex) {
		}

		try {
			var configFile = commander.config;
			var cfg = fs.readFileSync(configFile);
			configuration = JSON.parse(cfg);

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

		"GetTracedTests" : () => {
			return configuration.rabbit.flow.prefix + "." + configuration.rabbit.flow.traced;
		},

		"GetNewQueue" : (executableId) => {
			return configuration.rabbit.flow.prefix + "." + 
				configuration.rabbit.flow.new + "." +
				executableId;
		},

		"GetTracedQueue" : (executableId) => {
			return configuration.rabbit.flow.prefix + "." + 
				configuration.rabbit.flow.traced + "." +
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
			var auth = '';
			if (configuration.mongo.authdb) {
				auth = '?authSource=' + configuration.mongo.authdb
			}
			return GetUrl('mongodb', configuration.mongo) + configuration.mongo.database + auth;
		},

		"GetOplogUrl" : () => {
			var auth = '';
			if (configuration.mongo.authdb) {
				auth = '?authSource=' + configuration.mongo.authdb
			}
			return GetUrl('mongodb', configuration.mongo) + "local" + auth;
		},

		"GetDatabase" : () => {
			return configuration.mongo.database;
		},

		"GetCollection" : (executableId) => {
			return configuration.mongo.prefix + executableId;
		},

		"GetTestsCollection" : (executableId) => {
			return configuration.mongo.testsPrefix + executableId;
		},

		"GetStateTocCollection" : (executableId) => {
			return configuration.mongo.tocPrefix + executableId;
		},

		"GetStateGlobalCollection" : (executableId, suffix) => {
			return configuration.mongo.stateGlobalPrefix + executableId + "_" + suffix;
		},

		"IsStateGlobalCollection" : (executableId, collName) => {
			return collName.startsWith(configuration.mongo.stateGlobalPrefix + executableId + "_");
		},

		"GetStateLocalCollection" : (executableId, suffix) => {
			return configuration.mongo.stateLocalPrefix + executableId + "_" + suffix;
		},

		"IsStateLocalCollection" : (executableId, collName) => {
			return collName.startsWith(configuration.mongo.stateLocalPrefix + executableId + "_");
		}
	},

	"interface" : {
		"GetSecret" : () => {
			return configuration.interface.secret;
		},

		"GetPublicPort" : () => {
			return configuration.interface.publicport;
		},

		"GetHTTPSPort" : () => {
			return configuration.interface.port;
		},

		"GetHTTPPort" : () => {
			return configuration.interface.httpport;
		}
	}
};
