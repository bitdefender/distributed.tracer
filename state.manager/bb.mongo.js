// use for mongodb's mapreduce
function Reduce(d) {
    
    const bbPlugins = {
        address: {
            zero: (module, offset) => {
                if ('<begin>' == module) {
                    return {
                        module: '<begin>',
                        offset: 0
                    };
                } else if ('<end>' == module) {
                    return {
                        module: '<end>',
                        offset: 0
                    };
                }

                return {
                    module: module,
                    offset: offset
                };
            },

            reduce: function(d1, d2) {
                return {
                    module: ("undefined" !== typeof(d1.module)) ? d1.module : d2.module,
                    offset: ("undefined" !== typeof(d1.offset)) ? d1.offset : d2.offset
                }; // since d1 == d2
            }
        },
        global: {
            zero: () => {
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

    for (var p in bbPlugins) {
        ret[p] = bbPlugins[p].zero();
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