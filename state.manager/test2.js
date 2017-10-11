const { ParseBinTrace } = require("./bintrace.js");
const fs = require('fs');

var trace = fs.readFileSync('last-binlog');

debugger;

for (var nextBB of ParseBinTrace(trace)) {
	console.dir(nextBB);
}
