const ENTRY_TYPE_TEST_NAME = 0x0010
const ENTRY_TYPE_BB_MODULE = 0x00B0
const ENTRY_TYPE_BB_NEXT_MODULE = 0x00C0
const ENTRY_TYPE_BB_OFFSET = 0x00BB
const ENTRY_TYPE_INPUT_USAGE = 0x00AA
const ENTRY_TYPE_BB_OFFSET_NEXT_OFFSET = 0x00A0

function* ParseBinTrace(trace) {
    var bin;

    if ("string" === typeof trace) {
        bin = Buffer.from(trace, 'base64');
    } else {
        bin = trace;
    }

    var offset = 0;
	var lastModule = "";
	var lastNextModule = "";
	var it = {};

    while (offset < bin.length) {
		var entryType = bin.readInt16LE(offset);
        var entryLength = bin.readInt16LE(offset + 2);
		offset += 4;

		if (ENTRY_TYPE_TEST_NAME == entryType) {
		} else if (ENTRY_TYPE_BB_NEXT_MODULE == entryType) {
			lastNextModule = bin.toString('ascii', offset, offset + entryLength - 1);
		} else if (ENTRY_TYPE_BB_MODULE == entryType) {
			lastModule = bin.toString('ascii', offset, offset + entryLength - 1);
		} else if (ENTRY_TYPE_BB_OFFSET == entryType) {
			var off = bin.readInt32LE(offset);
			var cost = bin.readInt16LE(offset + 4);
			var jumpType = bin.readInt16LE(offset + 6);
			var jumpInstruction = bin.readInt16LE(offset + 8);
			var nInstructions = bin.readInt16LE(offset + 10);

			it = { module : lastModule,
				offset : off,
				cost : cost,
				jumpType : jumpType,
				jumpInstruction : jumpInstruction,
				nInstructions : nInstructions,
				next : []
			};
		} else if (ENTRY_TYPE_BB_OFFSET_NEXT_OFFSET == entryType) {
			var off = bin.readInt32LE(offset);
			it.next.push({ module : lastNextModule,
						   offset : off});
			if (it.next.length == 2) {
				yield it;
			}
		}

		offset += entryLength;
    }
}

module.exports.ParseBinTrace = ParseBinTrace;
