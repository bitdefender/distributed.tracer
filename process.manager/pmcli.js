const procman = require("./index.js");
const requiredArgsLen = 6;

if (process.argv.length < 3) {
    console.log("Usage: node pmcli.js <command>\n");
    process.exit(1);
}

procman.connect(() => {
    var cmd = process.argv[2];
    //console.dir(process.argv);

    if ("start" == cmd) {
        if (process.argv.length < requiredArgsLen) {
            console.log("Usage: node pmcli.js start <processName> <execId> <instanceCount> [programArgs]\n");
            process.exit(1);
        }

        var processName = process.argv[3];
        var execId = process.argv[4];
        var iCount = process.argv[5];

        var programArgs = [];
		for (var i = requiredArgsLen; i < process.argv.length; ++i) {
			programArgs.push(process.argv[i]);
		}

		procman.ensureRunning(processName, execId, iCount, programArgs, () => {
			console.log("INFO: Started " + processName);
			process.exit(0);
		});
	} else if ("stop" == cmd) {
        if (process.argv.length < 5) {
            console.log("Usage: node pmcli.js stop <processName> <execId>\n");
            process.exit(1);
        }

		var processName = process.argv[3];
        var execId = process.argv[4];

        procman.ensureRunning(processName, execId, 0, [], () => {
            console.log("INFO: Done!");
            process.exit(0);
        });
    } else if ("kill" == cmd) {
        if (process.argv.length < 4) {
            console.log("Usage: node pmcli.js kill <pmId>\n");
            process.exit(1);
        }

        var pmid = process.argv[3];

        procman.terminate(pmid, () => {
            console.log("INFO: Done!");
            process.exit(0);
        });
	} else if ("status" == cmd) {
		if (process.argv.length < 4) {
			console.log("Usage: node pmcli.js status <processName>\n");
			process.exit(1);
		}

		var processName = process.argv[3];

		procman.status((resJson) => {
			if (!(processName in resJson)) {
				console.log("ERROR: Not a valid process name " + processName);
				process.exit(1);
			}
			console.log(processName + ": " + resJson[processName].running.length);
			process.exit(0);
		});
    } else {
        console.log("Unkown command " + cmd);
        process.exit(1);
    }
})


