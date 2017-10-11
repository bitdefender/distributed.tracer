
/*if (process.argv.length < 3) {
	console.log("Usage: node index.js executable_id\n");
	return;
}

var execId = process.argv[process.argv.length - 1];
console.log("Started... for " + execId);*/

setInterval(() => {}, 10000);

process.on('SIGINT', () => {
  console.log('Closing all connections...');
  setTimeout(function() {
    console.log('Finished closing connections');
    process.exit(0);
  }, 1500);
});
