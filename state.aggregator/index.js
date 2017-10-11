const stateManager = require('state.manager');

const common = require('distributed-common');
if (!common.Init()) {
    console.log("Initialization error!");
    process.exit();
}

if (process.argv.length < 3) {
    console.log("Usage: node index.js executable_id\n");
    return;
}
var execId = process.argv[process.argv.length - 1];
var running = true;


var aggregator = new stateManager.StateAggregator(execId);

var lock = false;
var lastOp = null;
function Perform() {
    if (!lock) {
        lock = true;
        lastOp = aggregator.NewGlobal();
        lastOp.then(() => {
            lock = false;
        });

        return lastOp;
    } else {
        return lastOp;
    }
}

var aggInterval = setInterval(() => {
    console.log("New global state!");
    Perform();
}, 10000);

process.on('SIGINT', () => {
    if (running) {
        console.log('Received SIGINT, new global state!');
        clearInterval(aggInterval);
        Perform().then(() => {
            console.log("Done!");
            process.exit();
        });
        running = false;
    } else {
        console.log('Received second SIGINT, killing!');
        process.exit();
    }
});




