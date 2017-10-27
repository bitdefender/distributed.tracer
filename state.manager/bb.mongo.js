// use for mongodb's mapreduce
function Reduce(d) {
    
    const bbPlugins = {
        address: {
            zero: (bb) => {
                if ('<begin>' == bb.module) {
                    return {
                        module: '<begin>',
                        offset: 0
                    };
                } else if ('<end>' == bb.module) {
                    return {
                        module: '<end>',
                        offset: 0
                    };
                }

                var ret = {
                    module: bb.module,
                    offset: bb.offset,
                    jumpType: bb.jumpType,
                    jumpInstruction: bb.jumpInstruction,
                    nInstructions: bb.nInstructions,
                    taken: bb.next[0],
                    nottaken: bb.next[1]
                };

                return ret;
			},

            reduce: function(d1, d2) {
				var d = ("undefined" !== typeof(d1)) ? d1 : d2;
				return {
					module: d.module,
					offset: d.offset,
					jumpType: d.jumpType,
					jumpInstruction: d.jumpInstruction,
          nInstructions: d.nInstructions,
					taken: d.taken,
					nottaken: d.nottaken
				};
            }
        },
        global: {
            zero: (bb) => {
                return {
                    count: 0,
                    next: { }
                }
            },

            reduce: function(d1, d2) {
                var ret = {
                    count: d1.count + d2.count,
                    next: { }
                };

                var nexts = Object.keys(d1.next);
                
                for (var k in d2.next) {
                    if (-1 === nexts.indexOf(k)) {
                        nexts.push(k);
                    }
                }
                
                for (var k in nexts) {
                    ret.next[nexts[k]] = (d1.next[nexts[k]] || 0) + (d2.next[nexts[k]] || 0);
                }

                return ret;
            }
        }
    };

    var ret = {};
    var dz = d[0];

    var asBBStruct = {
        module : dz.address.module,
        offset : dz.address.offset,
        jumpType : dz.address.jumpType,
        jumpInstruction : dz.address.jumpInstruction,
        nInstructions : dz.address.nInstructions,
        next : [
            dz.address.taken,
            dz.address.nottaken
        ]
    };
    for (var p in bbPlugins) {
        ret[p] = bbPlugins[p].zero(asBBStruct);
    }
    
    for (var dx in d) {
        var dxx = d[dx];
        for (var p in bbPlugins) {
            ret[p] = bbPlugins[p].reduce(ret[p], dxx[p]);
        }
    }

    return ret;
}

module.exports.Reduce = Reduce;
