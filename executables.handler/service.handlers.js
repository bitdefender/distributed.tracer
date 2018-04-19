const processManager = require('process.manager');

const services = {
	"state.aggregator" : [1],
	"tracer.node" : [1],
	"basic.fuzzer" : [1, "-runs=100000"],
	"eval.fuzzer" : [1, "-runs=150000"]
};

function StartServices(executableId) {
	for (var key in services) {
		value = services[key];
		StartService(key, executableId, value[0], value.slice(1));
	}
}

function StopServices(executableId) {
	for (var key in services) {
		value = services[key];
		StopService(key, executableId);
	}
}

function StartService(serviceName, executableId, nrInstances, extraArgs) {
	processManager.connect(() => {
		if (nrInstances == 0) {
			return;
		}
		processManager.ensureRunning(serviceName, executableId,
			nrInstances, extraArgs, () => {
				console.log("INFO: Started " + serviceName);
				return;
			});
	});
}

function CheckExited(serviceName, executableId) {
	processManager.connect(() => {
		processManager.status((serviceStatus) => {
			if (serviceStatus[serviceName].running.length != 0) {
				console.log("ERROR: Service " + serviceName + " not stopped. Kill attempt");
				serviceStatus[serviceName].running.forEach((pmId) => {
					processManager.terminate(pmId, () => {
						console.log("INFO: Killed pmid: " + pmId);
					});
				});
			}
		});
	});
}

function StopService(serviceName, executableId) {
	processManager.connect(() => {
		processManager.ensureRunning(serviceName, executableId,
			0, [], () => {
				console.log("INFO: Stopped " + serviceName);
				//CheckExited(serviceName, executableId);
			});
	});
}


module.exports = exports = {
  "StartServices" : StartServices,
  "StopServices" : StopServices
};
