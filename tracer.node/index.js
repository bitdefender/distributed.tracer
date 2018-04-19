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

const fs = require('fs');
const BufferList = require('bl');
const path = require('path');
const async = require('async');
const amqp = require('amqplib/callback_api');
const stateManager = require('state.manager');
const probe = require('pmx').probe();

var aggregator = new stateManager.StateAggregator(execId);
var aggCount = 0;

var running = true;

var aggInterval = setInterval(() => {
    if (aggCount) {
        // todo move in state manager;
        console.log("Aggregated " + aggCount + " collections");


        aggregator.GetCollections();
        aggCount = 0;
    }
}, 1000);

const rabbit = common.amqp.GetUrl();
const rabbitExchange = common.amqp.GetNewTests();
const rabbitExchangeTraced = common.amqp.GetTracedTests();
const rabbitQueueIn = common.amqp.GetNewQueue(execId);
const rabbitQueueTraced = common.amqp.GetTracedQueue(execId);
const exchangeData = {
    newExchange: rabbitExchange,
    newQueue: rabbitQueueIn,
    tracedExchange: rabbitExchangeTraced,
    tracedQueue: rabbitQueueTraced
};

const ObjectId = require('mongodb').ObjectID,
    MongoClient = require('mongodb').MongoClient,
    GridStore = require('mongodb').GridStore;

const noderiver = require('node-river');

const mongo = require('mongodb');

const mongoUrl = common.mongo.GetUrl();
const collName = common.mongo.GetCollection(execId);

function ConnectToDb(connectUrl, callback) {
    MongoClient.connect(connectUrl, callback);
}

function ProcessExchangeAmqp(channel, exchange, queue, pattern, callback) {
    channel.assertQueue(queue, {}, (err, ok) => {
        if (err) {
            callback(err);
            return;
        }

        console.log("Reading from queue " + queue + " with pattern " + pattern);
        channel.bindQueue(queue, exchange, pattern, {}, (err, ok) => {
            if (err) {
                callback(err);
                return;
            }

            callback(null, channel);
        });
    });
}

function ConnectAmqp(server, exchangeData, pattern, callback) {
    amqp.connect(server, (err, conn) => {
        if (err) {
            callback(err);
            return;
        }

        conn.createConfirmChannel((err, channel) => {
            if (err) {
                callback(err);
                return;
            }

            channel.prefetch(1);

            ProcessExchangeAmqp(channel, exchangeData.newExchange,
                exchangeData.newQueue, pattern, () => {
                    ProcessExchangeAmqp(channel, exchangeData.tracedExchange,
                        exchangeData.tracedQueue, pattern, callback);
                });

        });
    });
}

function CreateTracer(options) {
    var eType = noderiver.EXECUTION_INPROCESS;
    if ("execution_type" in options) {
        switch (options.execution_type) {
            case "inprocess":
                eType = noderiver.EXECUTION_INPROCESS;
                break;
            case "extern":
                eType = noderiver.EXECUTION_EXTERN;
                break;
        };
    }

    var tType = noderiver.TRACE_TYPE_SIMPLE;
    if ("tracing_type" in options) {
        switch (options.tracing_type) {
            case "simple":
                tType = noderiver.TRACE_TYPE_SIMPLE;
                break;
            case "annotated":
                tType = noderiver.TRACE_TYPE_ANNOTATED;
                break;
        };
    }

    var lType = noderiver.LOG_TYPE_TEXT;
    if ("log_type" in options) {
        switch (options.log_type) {
            case "text":
                lType = noderiver.LOG_TYPE_TEXT;
                break;
            case "binary":
                lType = noderiver.LOG_TYPE_BINARY;
                break;
        };
    }

    var oType = noderiver.OUT_TYPE_FILE;
    if ("out_type" in options) {
        switch (options.out_type) {
            case "file":
                oType = noderiver.OUT_TYPE_FILE;
                break;
            case "callback":
                oType = noderiver.OUT_TYPE_CALLBACK;
                break;
        };
    }

    if (!("target" in options)) {
        // throw something
        return null;
    }

    var ret = new noderiver.Tracer(eType, tType, lType, oType);
    if (!ret.SetTarget(options.target)) {
        // throw something
        return null;
    }

    if ("mempatch" in options) {
        if (!ret.SetOption(noderiver.TRACE_OPTION_MEMPATCH_FILE, options.mempatch)) {
            // throw something
            return null;
        }
    }

    return ret;
}

var firstTrace = true;
var logBuffer = new BufferList();
let testCounter = probe.counter({
	name: 'Total tests ran'
});
let testMeter = probe.meter({
	name: 'tests/sec',
	samples: 1,
	timeframe: 60
});

function TraceSingle(db, tracer, name, payload, testCb) {
    console.log("[INFO] TraceSingle Testing " + name);
    tracer.SetInputBuffer(name, payload);
    var trFunc = firstTrace ? tracer.Execute : tracer.Resume;
    firstTrace = false;

    trFunc.call(tracer, (err, ok) => {
		testCounter.inc();
		testMeter.mark();

        if (err) {
            // insert error in db
            var ip = "0x" + ((err) >>> 0).toString(16);
            console.log("[Tracer Node][ERROR] Translation error at address " + ip);
            db.collection(collName).findAndModify(
                { "_id": name },
                [['_id', 'asc']],
                { $set: { "state": "traced", "result": "river-error", "address": ip } },
                {},
                function (err, object) {
                    if (err) {
                        console.warn(err.message);  // returns error if no matching object found
                    }
                    console.warn("[Tracer Node][INFO] Logged translation error in db");
                    process.exit(1);
                }
            );
        } else {
            testCb(name, Buffer.concat(logBuffer._bufs));
            logBuffer = new BufferList();
            //process.nextTick( () => {
            //  console.log("Returned EXECUTION_SUSPEND..." + noderiver.EXECUTION_SUSPEND);
            //});
        }
        return noderiver.EXECUTION_SUSPEND;
    });
}

async.parallel({
    db: function (callback) { ConnectToDb(mongoUrl, callback); },
    amqp: function (callback) { ConnectAmqp(rabbit, exchangeData, "*.tests_" + execId, callback); }
}, function (err, connections) {
    if (err) {
        console.log("Could not establish a connection. " + err + "\n");
        return true;
    }

    console.log("Succesfully connected!\n");

    const cachePath = path.join(process.cwd(), execId);

    if (!fs.existsSync(cachePath)) {
        fs.mkdirSync(cachePath, 0755);
    }

    connections.db.collection("executables").findOne({ _id: ObjectId(execId) })
        .then((executable) => {
            const payloadFile = path.join(cachePath, "ParserPayload." + ((process.platform == "win32") ? "dll" : "so"));
            const fuzzerFile = path.join(cachePath, "fuzzer");
            const corpusFile = path.join(cachePath, "corpus");
            
            if (!fs.existsSync(payloadFile)) {
                fs.writeFileSync(
                    payloadFile,
                    executable.binary.buffer,
                    {
                        encoding: "binary"
                    }
                );
            }

            var mode = 0775 & ~process.umask();
            if (executable.features.fuzzer && !fs.existsSync(fuzzerFile)) {
                fs.writeFileSync(
                    fuzzerFile,
                    executable.fuzzer.data.buffer,
                    {
                        encoding: "binary",
                        mode: mode
                    }
                );
            }

            if (executable.features.corpus && !fs.existsSync(corpusFile)) {
                fs.writeFileSync(
                    corpusFile,
                    executable.corpus.data.buffer,
                    {
                        encoding: "binary"
                    }
                );
            }

            var execType;
            switch (executable.execution) {
                case "Inprocess":
                    execType = "inproc";
                    break;
                case "Extern":
                    execType = "extern";
                    break;
                default:
                    console.log("Invalid execution type " + executable.execution);
                    process.exit(1);
            }

            var tracerOpts = {
                "execution_type": execType,
                "tracing_type": "simple",
                "log_type": "binary",
                "out_type": "callback",
                //"mempatch" : "memory.patch",
                //"target" : "/home/asandulescu/libhttp-parser.so"
                "target": payloadFile
            };

            if (executable.mempatch) {
                const mempatchFile = path.join(cachePath, "memory.patch");
                if (!fs.existsSync(mempatchFile)) {
                    fs.writeFileSync(
                        mempatchFile,
                        executable.mempatch.buffer,
                        {
                            encoding: "binary"
                        }
                    );
                }
                tracerOpts.mempatch = mempatchFile;
            }

            var tracer = CreateTracer(tracerOpts);
            
            tracer.SetOption(noderiver.TRACE_OPTION_OUTPUT_CALLBACK, (buffer) => {
                logBuffer.append(buffer);
            });

            console.log("Consuming from " + rabbitQueueIn);

            var svQueue = async.queue((task, callback) => {
                if (!running) {
                    console.log("Rejecting message, we are shuting down!");
                    connections.amqp.nack(task.msg);
                    return;
                }

                aggregator.AddTrace(task.test).then(() => {
                    aggCount++;
                    // Add binary trace in gridfs
                    var buffer = new Buffer(task.test);
                    var gs = new GridStore(connections.db, new ObjectId(), task.name, "w", {
                        root: "trace_" + execId
                    });
                    gs.open(function (err, gs) {
                        if (err) {
                            console.log("Error encountered when writing trace: " + task.name + " to gridfs");
                            process.exit(1);
                        }
                        gs.write(buffer, function (err, gs) {
                            gs.close(function (err, fileData) {
                                if (err) {
                                    console.warn(err);
                                    process.exit(1);
                                }

                                connections.db.collection(collName).findAndModify(
                                    { "_id": task.name },
                                    [['_id', 'asc']],
                                    { $set: { "state": "traced", "result": "pass", "tracedTs": new Date().getTime() } },
                                    {},
                                    function (err, object) {
                                        if (err) {
                                            console.log("Failed to add trace to testcase " + task.name);
                                            console.warn(err.message);  // returns error if no matching object found
                                            process.exit(1);
                                        } else {
                                            console.log("[info] accepting " + task.name);
                                            connections.amqp.ack(task.msg);
                                            callback();
                                            console.log("OK!!!");
                                        }
                                    }
                                );
                            });
                        });
                    });
                });
            }, 5);

            var trQueue = async.queue((task, callback) => {
                if (!running) {
                    console.log("Rejecting message, we are shuting down!");
                    connections.amqp.nack(task.msg);
                    return;
                }

                var testId = task.msg.content.toString();
                TraceSingle(
                    connections.db,
                    tracer,
                    testId,
                    task.doc.data.buffer,
                    (name, test) => {
                        if (!running) {
                            console.log("Rejecting message, we are shuting down!");
                            connections.amqp.nack(task.msg);
                            callback();
                            return;
                        }
                        console.warn("Tst: " + name + " " + test.length);

                        svQueue.push(
                            {
                                name: name,
                                msg: task.msg,
                                doc: task.doc,
                                test: test
                            },
                            (err) => { }
                        );
                        callback();
                    });
            }, 1);

            var dbQueue = async.queue((msg, callback) => {
                if (!running) {
                    console.log("Rejecting message, we are shuting down!");
                    connections.amqp.nack(msg);
                    return;
                }

                var testId = msg.content.toString();

                connections.db.collection(collName).findOne({ _id: testId })
                    .then((doc) => {
                        if (doc.state == "new") {
                            trQueue.push(
                                {
                                    msg: msg,
                                    doc: doc
                                },
                                (err) => { }
                            );
                        } else {
                            console.log("[INFO] Early accepted state: " + doc.state);
                            connections.amqp.ack(msg);
                        }
                        callback(err);
                    })
                    .catch((err) => {
                        connections.amqp.ack(msg);
                        callback(err);
                    });
            }, 10);

            process.on('SIGINT', () => {
                if (running) {
                    console.log('Received SIGINT, shutting down!');
                    running = false;

                    connections.amqp.close();
                    //connections.db.

                    dbQueue.kill();
                    trQueue.kill();

                    clearInterval(aggInterval);
                    aggInterval = null;
                    aggregator.ReleaseCollections();
                    aggCount = 0;
                    
                    /*console.dir(
                        process._getActiveRequests()
                    );

                    console.dir(
                        process._getActiveHandles()
                    );*/
                } else {
                    console.log('Received second SIGINT, killing!');
                    process.exit();
                }
            });

            connections.amqp.consume(rabbitQueueIn, (msg) => {
                console.log("[INFO] Message arived " + msg.content.toString());
                if (running) {
                    dbQueue.push(msg);
                } else {
                    console.log("Rejecting message, we are shuting down!");
                    connections.amqp.nack(msg);
                }
            });
        })
        .catch((err) => {
            console.log("Couldn't find executable " + execId);
        });

});


