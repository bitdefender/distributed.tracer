const common = require('distributed-common');
if (!common.Init()) {
    console.log("Initialization error!");
    process.exit();
}

const rabbit = common.amqp.GetUrl();
const amqp = require('amqplib/callback_api');

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

        channel.assertQueue(common.amqp.GetExecutables(), {}, (err, ok) => {
            if (err) {
                console.log("Error: " + err);
                return;
            }
        });

    });
    setTimeout(() => { conn.close(); process.exit(0) }, 500);
});
