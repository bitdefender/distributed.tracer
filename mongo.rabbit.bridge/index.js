const common = require('distributed-common');
if (!common.Init()) {
	console.log("Initialization error!");
	process.exit();
}

const MongoOplog = require('mongo-oplog');

const MongoClient = require('mongodb').MongoClient;
const amqp = require('amqplib/callback_api');

var rabbit = common.amqp.GetUrl();

var rabbitNewExchange = common.amqp.GetNewTests();
var rabbitTracedExchange = common.amqp.GetTracedTests();
var exchangeData = { rabbitNewExchange : rabbitNewExchange,
	rabbitBackupNewExchange : rabbitNewExchange + ".bkp",
	rabbitBackupNewQueue : rabbitNewExchange + ".qbkp",
	rabbitTracedExchange : rabbitTracedExchange,
	rabbitBackupTracedExchange : rabbitTracedExchange + ".bkp",
	rabbitBackupTracedQueue : rabbitTracedExchange + ".qbkp"
}

function ProcessExchange(channel, exchange, bkpExchange, bkpQueue, callback) {
	channel.assertExchange(bkpExchange, "fanout", {
		//				durable: true,
		//				internal: false,
		//				autoDelete: false
	}, (err, ok) => {
		if (err) {
			callback(err);
			return;
		}

		channel.assertQueue(bkpQueue, {}, (err, ok) => {
			if (err) {
				callback(err);
				return;
			}

			channel.bindQueue(bkpQueue, bkpExchange, "", {}, (err, ok) => {
				if (err) {
					callback(err);
					return;
				}

				channel.assertExchange(exchange, "topic", {
					//						durable: true,
					//						internal: false,
					//						autoDelete: false,
					alternateExchange: bkpExchange
				}, (err, ok) => {
					if (err) {
						callback(err);
						return;
					}
					callback(null, channel);
				});
			});
		});
	});
}

function ConnectAmqp(server, exchangeData, callback) {
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
			ProcessExchange(channel,
				exchangeData.rabbitNewExchange,
				exchangeData.rabbitBackupNewExchange,
				exchangeData.rabbitBackupNewQueue,
				() => {
					ProcessExchange(channel,
						exchangeData.rabbitTracedExchange,
						exchangeData.rabbitBackupTracedExchange,
						exchangeData.rabbitBackupTracedQueue,
						callback);
				});

		});
	});
}

ConnectAmqp(rabbit, exchangeData, (err, chn) => {
	if (err) {
		console.log(err);
		return;
	}

	const dbName = common.mongo.GetDatabase();
	console.log(common.mongo.GetOplogUrl());
	const oplog = MongoOplog(common.mongo.GetOplogUrl());

	oplog.tail();

	var nsPrefix = dbName + ".tests_";

	var knownQueues = [];
	// if rk not available
	chn.consume(exchangeData.rabbitBackupNewQueue, (msg) => {
		console.log("Lost NEW message");
		console.dir(msg);
		chn.ack(msg);
	});

	chn.consume(exchangeData.rabbitBackupTracedQueue, (msg) => {
		console.log("Lost TRACED message");
		console.dir(msg);
		chn.ack(msg);
	});


	oplog.on('insert', (doc) => {
		if (doc.ns.startsWith(nsPrefix)) {
			if (doc.o.state == "new") {
        console.log("INFO: Adding id " + doc.o._id + " to NEW tests queue")
				rabbitExchange = exchangeData.rabbitNewExchange;
				chn.publish(rabbitExchange, doc.ns, new Buffer(doc.o._id));
				chn.waitForConfirms((err) => {
					if (err) {
						return;
					}
				});
			}
		}
	});

	oplog.on('update', (doc) => {
		if (doc.ns.startsWith(nsPrefix)) {
			//o: { '$set': { trace: [Object], state: 'traced' } } }
			if (doc.o.$set.state == "traced") {
        console.log("INFO: Adding id " + doc.o2._id + " to TRACED tests queue")
				rabbitExchange = exchangeData.rabbitTracedExchange;
				chn.publish(rabbitExchange, doc.ns, new Buffer(doc.o2._id));
				chn.waitForConfirms((err) => {
					if (err) {
						return;
					}
				});
			}
		}
	});

	oplog.on('error', error => {
		console.log(error);
	});

	oplog.on('end', () => {
		console.log('Stream ended');
	});

	oplog.stop(() => {
		console.log('server stopped');
	});
});
