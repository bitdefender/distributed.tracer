const common = require('distributed-common');
if (!common.Init()) {
    console.log("Initialization error!");
    process.exit();
}

const rabbit = common.amqp.GetUrl();
const amqp = require('amqplib/callback_api');
const MongoClient = require('mongodb').MongoClient;
const mongoURL = common.mongo.GetUrl();
const dbName = common.mongo.GetDatabase();

function FillQueue(channel, q) {
  MongoClient.connect(mongoURL, (err, client) => {
    if (err) {
      console.log("Error: " + err);
      return;
    }

    const db = client.db(dbName);
    db.collection("executables").find({}, {ObjectId:1}).toArray((err, executables) => {
      if (err) {
        console.log("Error: " + err);
        return;
      }

      executables.forEach((value) => {
        channel.sendToQueue(q, new Buffer(value._id.toString()));
      });
    });
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

       FillQueue(channel, q);
    });
    setTimeout(() => { conn.close(); process.exit(0) }, 500);
});
