const common = require('distributed-common');
if (!common.Init()) {
    console.log("Initialization error!");
    process.exit();
}

const id = process.argv[2];
const rabbit = common.amqp.GetUrl();
const amqp = require('amqplib/callback_api');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const mongoURL = common.mongo.GetUrl();
const dbName = common.mongo.GetDatabase();

function EnqueueAll(channel, q, db) {
	db.collection("executables").find({}, {ObjectId:1}).toArray((err, executables) => {
		if (err) {
			console.log("Error: " + err);
			return;
		}

		executables.forEach((value) => {
			channel.sendToQueue(q, new Buffer(value._id.toString()));
		});
	});
}

function EnqueueOne(channel, q, db, id) {
	db.collection("executables").findOne({_id: new ObjectID(id)}, (err, document) => {
		if (err) {
			console.log("Error: " + err);
			return;
		}

		channel.sendToQueue(q, new Buffer(document._id.toString()));
	});
}

function FillQueue(channel, q, id) {
	MongoClient.connect(mongoURL, (err, client) => {
		if (err) {
			console.log("Error: " + err);
			return;
		}

		const db = client.db(dbName);
		if (id === undefined) {
			EnqueueAll(channel, q, db);
		} else {
			EnqueueOne(channel, q, db, id);
		}
	});
}

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
                return;
            }
        });

		// this will run at least once, passing "undefined" as the last argument
		// to "FillQueue", ensuring that it is called to enqueue all executables
		// when no arguments are provided.
		let i = 2;
		do {
			FillQueue(channel, q, process.argv[i]);
			++i;
		} while (i < process.argv.length);
    });
    setTimeout(() => { conn.close(); process.exit(0) }, 500);
});
