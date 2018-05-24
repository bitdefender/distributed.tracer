const common = require('distributed-common');
if (!common.Init()) {
    console.log("Initialization error!");
    process.exit();
}

const serviceHandlers = require('./service.handlers.js');

const rabbit = common.amqp.GetUrl();
const amqp = require('amqplib/callback_api');
const fs = require('fs');

function StartServices() {
	const q = common.amqp.GetExecutables();
	channel.consume(
		q, (msg) => {
			channel.cancel(msg.fields.consumerTag, () => {
				console.log("INFO: start-services " + msg.content.toString());
				serviceHandlers.StartServices(msg.content.toString());
				channel.ack(msg);
			});
		},
		{noAck : false}
	);

	return;
}

function StopServices(services) {
	for (const service of services) {
		console.log("INFO: stop-services " + service);
		serviceHandlers.StopServices(service);
	}

	return;
}

function GetExecJSON(id) {
	let obj = JSON.parse(fs.readFileSync('./benchmark.json', 'utf8'));
	return obj[id];
}

function EnqueueOne(channel, q, exec) {
	channel.sendToQueue(q, new Buffer(exec.toString()));
}

function EnqueueID(id) {
	amqp.connect(rabbit, (err, conn) => {
		if (err) {
			console.log("Error: " + err);
			return;
		}

		conn.createChannel((err, channel) => {
			if (err) {
				console.log("Error: " + err);
				return;
			}

			const q = common.amqp.GetExecutables();
			channel.assertQueue(common.amqp.GetExecutables(), {}, (err, ok) => {
				if (err) {
					console.log("Error: " + err);
					return; }
			});

			// maximum 1 unacked msg
			channel.prefetch(1);

			execJSON = GetExecJSON(id);
			EnqueueOne(channel, q, execJSON);
		});
		setTimeout(() => { conn.close(); process.exit(0) }, 500);
	});
}

module.exports = exports = {
    "StartServices": StartServices,
    "StopServices": StartServices,
    "EnqueueID": EnqueueID,
};
