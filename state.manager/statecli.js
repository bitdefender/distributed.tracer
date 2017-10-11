const common = require('distributed-common');
const stateman = require("./index.js");

if (!common.Init()) {
    console.log("Initialization error!");
    process.exit();
}

if (process.argv.length < 4) {
    console.log("Usage: node index.js {options} executable_id [purge|clean]\n");
    return;
}
var execId = process.argv[process.argv.length - 2];
var verb = process.argv[process.argv.length - 1];

var mgr = new stateman.StateCleaner(execId);

switch (verb) {
    case "purge" :
        mgr.CleanCollections({
            state: "full",
            tests: true,
            traces: true
        }).then(() => {
            console.log("Done!");
            process.exit(0);
        });
        break;
    case "clean" :
        mgr.CleanCollections({
            state: "normal",
            tests: false,
            traces: false
        }).then(() => {
            console.log("Done!");
            process.exit(0);
        });
        break;

    default :
        console.log("Usage: node index.js {options} executable_id [clean|fullclean]\n");
        return;
};



