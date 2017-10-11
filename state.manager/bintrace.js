const ENTRY_TYPE_TEST_NAME = 0x0010;
const ENTRY_TYPE_BB_MODULE = 0x00B0;
const ENTRY_TYPE_BB_OFFSET = 0x00BB;

function* ParseBinTrace(trace) {
    var bin;

    if ("string" === typeof trace) {
        bin = Buffer.from(trace, 'base64');
    } else {
        bin = trace;
    }

    var offset = 0;
	var lastModule = "";

    while (offset < bin.length) {
		var entryType = bin.readInt16LE(offset);
        var entryLength = bin.readInt16LE(offset + 2);
		offset += 4;
		
		if (ENTRY_TYPE_TEST_NAME == entryType) {
        } else if (ENTRY_TYPE_BB_MODULE == entryType) {
			lastModule = bin.toString('ascii', offset, offset + entryLength - 1);
        } else if (ENTRY_TYPE_BB_OFFSET == entryType) {
			var off = bin.readInt32LE(offset);
            var cost = bin.readInt16LE(offset + 4);
            var jumpType = bin.readInt16LE(offset + 6);
			
            yield {
                module : lastModule,
                offset : off,
                cost : cost,
                jumpType : jumpType
            };
        }

		offset += entryLength;
    }
}

module.exports.ParseBinTrace = ParseBinTrace;