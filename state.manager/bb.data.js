function __add32(a, b) {
    return (a + b) & 0xFFFFFFFF;
}

function __cmn(q, a, b, x, s, t) {
    a = __add32(__add32(a, q), __add32(x, t));
    return __add32((a << s) | (a >>> (32 - s)), b);
}

function __ff(a, b, c, d, x, s, t) {
    return __cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function __gg(a, b, c, d, x, s, t) {
    return __cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function __hh(a, b, c, d, x, s, t) {
    return __cmn(b ^ c ^ d, a, b, x, s, t);
}

function __ii(a, b, c, d, x, s, t) {
    return __cmn(c ^ (b | (~d)), a, b, x, s, t);
}

function __md5cycle(x, k) {
    var a = x[0], b = x[1], c = x[2], d = x[3];

    a = __ff(a, b, c, d, k[0], 7, -680876936);
    d = __ff(d, a, b, c, k[1], 12, -389564586);
    c = __ff(c, d, a, b, k[2], 17,  606105819);
    b = __ff(b, c, d, a, k[3], 22, -1044525330);
    a = __ff(a, b, c, d, k[4], 7, -176418897);
    d = __ff(d, a, b, c, k[5], 12,  1200080426);
    c = __ff(c, d, a, b, k[6], 17, -1473231341);
    b = __ff(b, c, d, a, k[7], 22, -45705983);
    a = __ff(a, b, c, d, k[8], 7,  1770035416);
    d = __ff(d, a, b, c, k[9], 12, -1958414417);
    c = __ff(c, d, a, b, k[10], 17, -42063);
    b = __ff(b, c, d, a, k[11], 22, -1990404162);
    a = __ff(a, b, c, d, k[12], 7,  1804603682);
    d = __ff(d, a, b, c, k[13], 12, -40341101);
    c = __ff(c, d, a, b, k[14], 17, -1502002290);
    b = __ff(b, c, d, a, k[15], 22,  1236535329);

    a = __gg(a, b, c, d, k[1], 5, -165796510);
    d = __gg(d, a, b, c, k[6], 9, -1069501632);
    c = __gg(c, d, a, b, k[11], 14,  643717713);
    b = __gg(b, c, d, a, k[0], 20, -373897302);
    a = __gg(a, b, c, d, k[5], 5, -701558691);
    d = __gg(d, a, b, c, k[10], 9,  38016083);
    c = __gg(c, d, a, b, k[15], 14, -660478335);
    b = __gg(b, c, d, a, k[4], 20, -405537848);
    a = __gg(a, b, c, d, k[9], 5,  568446438);
    d = __gg(d, a, b, c, k[14], 9, -1019803690);
    c = __gg(c, d, a, b, k[3], 14, -187363961);
    b = __gg(b, c, d, a, k[8], 20,  1163531501);
    a = __gg(a, b, c, d, k[13], 5, -1444681467);
    d = __gg(d, a, b, c, k[2], 9, -51403784);
    c = __gg(c, d, a, b, k[7], 14,  1735328473);
    b = __gg(b, c, d, a, k[12], 20, -1926607734);

    a = __hh(a, b, c, d, k[5], 4, -378558);
    d = __hh(d, a, b, c, k[8], 11, -2022574463);
    c = __hh(c, d, a, b, k[11], 16,  1839030562);
    b = __hh(b, c, d, a, k[14], 23, -35309556);
    a = __hh(a, b, c, d, k[1], 4, -1530992060);
    d = __hh(d, a, b, c, k[4], 11,  1272893353);
    c = __hh(c, d, a, b, k[7], 16, -155497632);
    b = __hh(b, c, d, a, k[10], 23, -1094730640);
    a = __hh(a, b, c, d, k[13], 4,  681279174);
    d = __hh(d, a, b, c, k[0], 11, -358537222);
    c = __hh(c, d, a, b, k[3], 16, -722521979);
    b = __hh(b, c, d, a, k[6], 23,  76029189);
    a = __hh(a, b, c, d, k[9], 4, -640364487);
    d = __hh(d, a, b, c, k[12], 11, -421815835);
    c = __hh(c, d, a, b, k[15], 16,  530742520);
    b = __hh(b, c, d, a, k[2], 23, -995338651);

    a = __ii(a, b, c, d, k[0], 6, -198630844);
    d = __ii(d, a, b, c, k[7], 10,  1126891415);
    c = __ii(c, d, a, b, k[14], 15, -1416354905);
    b = __ii(b, c, d, a, k[5], 21, -57434055);
    a = __ii(a, b, c, d, k[12], 6,  1700485571);
    d = __ii(d, a, b, c, k[3], 10, -1894986606);
    c = __ii(c, d, a, b, k[10], 15, -1051523);
    b = __ii(b, c, d, a, k[1], 21, -2054922799);
    a = __ii(a, b, c, d, k[8], 6,  1873313359);
    d = __ii(d, a, b, c, k[15], 10, -30611744);
    c = __ii(c, d, a, b, k[6], 15, -1560198380);
    b = __ii(b, c, d, a, k[13], 21,  1309151649);
    a = __ii(a, b, c, d, k[4], 6, -145523070);
    d = __ii(d, a, b, c, k[11], 10, -1120210379);
    c = __ii(c, d, a, b, k[2], 15,  718787259);
    b = __ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = __add32(a, x[0]);
    x[1] = __add32(b, x[1]);
    x[2] = __add32(c, x[2]);
    x[3] = __add32(d, x[3]);
}

function __md5blk(s) {
    var md5blks = [], i;
    for (var i = 0; i < 64; i += 4) {
        md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8)
        + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
    }
    return md5blks;
}

function __md51(s) {
    txt = '';
    var n = s.length,
    state = [1732584193, -271733879, -1732584194, 271733878], i;
    for (var i = 64; i <= s.length; i += 64) {
        __md5cycle(state, __md5blk(s.substring(i - 64, i)));
    }

    s = s.substring(i - 64);
    var tail = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
    for (var i = 0; i < s.length; i++) {
        tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
    }

    tail[i >> 2] |= 0x80 << ((i % 4) << 3);
    if (i > 55) {
        __md5cycle(state, tail);
        for (i=0; i<16; i++) {
            tail[i] = 0;
        }
    }

    tail[14] = n * 8;
    __md5cycle(state, tail);
    return state;
}

const __hex_chr = '0123456789abcdef'.split('');

function __rhex(n) {
    var s='', j=0;
    for(; j < 4; j++) {
        s += __hex_chr[(n >> (j * 8 + 4)) & 0x0F] + __hex_chr[(n >> (j * 8)) & 0x0F];
    }
    return s;
}

function __hex(x) {
    for (var i = 0; i < x.length; i++) {
        x[i] = __rhex(x[i]);
    }
    return x.join('');
}

function HashFunc(module, offset) {
    return __hex(__md51(offset + "|" + module));
}

function Id(module, offset) {
    /*if ('undefined' === typeof module) {
        if (('undefined' === typeof offset) || (0xFFFFFFFF == offset)) {
            return 'end';
        } else {
            return 'begin';
        }
    }*/

    if ('<begin>' == module) {
        return '<begin>';
    } else if ('<end>' == module) {
        return '<end>';
    }

    return HashFunc(module, offset);
}

function UnionKeys(obj1, obj2) {
    var ret = Object.keys(obj1);

    for (var k in obj2) {
        if (-1 === ret.indexOf(k)) {
            ret.push(k);
        }
    }
    return ret;
}

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

            return {
                module: bb.module,
                offset: bb.offset,
                taken: bb.next[0],
                nottaken: bb.next[1]
            };
        },

        emit: function(prev, next) { 
            if ('<begin>' == prev.module) {
                return {
                    module: '<begin>',
                    offset: 0
                };
            } else if ('<end>' == prev.module) {
                return {
                    module: '<end>',
                    offset: 0
                };
            }
            
            return { 
                module: prev.module,
                offset: prev.offset,
				taken: prev.next[0],
				nottaken: prev.next[1]

            };
        },

        reduce: function(d1, d2) {
            var d = ("undefined" !== typeof(d1)) ? d1 : d2;
            return {
                module: d.module,
                offset: d.offset,
                taken: d.taken,
                nottaken: d.nottaken
            }; // since d1 == d2
        }
    },
    global: {
        zero: (bb) => {
            return {
                count: 0,
                next: { }
            }
        },

        emit: function(prev, next) {
            var ret = { 
                count: 1,
                next: { }
            };

            ret.next[Id(next.module, next.offset)] = 1;
            return ret;
        },

        reduce: function(d1, d2) {
            var ret = {
                count: d1.count + d2.count,
                next: { }
            };

            var nexts = UnionKeys(d1.next, d2.next);
            for (var k in nexts) {
                ret.next[nexts[k]] = (d1.next[nexts[k]] || 0) + (d2.next[nexts[k]] || 0);
            }

            return ret;
        }
    }
}

function ZeroBBData(bb) {
    var ret = {
        value: {}
    };

    for (var p in bbPlugins) {
        ret.value[p] = bbPlugins[p].zero(bb);
    }

    return ret;
}

function NewBBData(prev, next) {
    var ret = {
        value: {}
    };

    for (var p in bbPlugins) {
        ret.value[p] = bbPlugins[p].emit(prev, next);
    }

    return ret;
}

// bb : {module, offset, next[{module, offset}]
function Zero(bb) {
    var ret = ZeroBBData(bb);
    ret._id = Id(bb.module, bb.offset);

    return ret;
}

function New(prev, next) {
    var ret = NewBBData(prev, next);
    ret._id = Id(prev.module, prev.offset);
    
    return ret;
}

// use for full documents
function ReduceFull(d1, d2) {
    var ret = {
        _id: d1._id,
        value: { }
    };

    for (var p in bbPlugins) {
        ret.value[p] = bbPlugins[p].reduce(d1.value[p], d2.value[p]);
    }

    return ret;
}

// use for mongodb's mapreduce
function Reduce(d) {
    var ret = {};
    var dz = d[0];

    var asBBStruct = {
        module : dz.value.address.module,
        offset : dz.value.address.offset,
        next : [
            dz.value.address.taken,
            dz.value.address.nottaken
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


module.exports = {
    '__add32': __add32,
    '__cmn': __cmn,
    '__ff': __ff,
    '__gg': __gg,
    '__hh': __hh,
    '__ii': __ii,
    '__md5cycle': __md5cycle,
    '__md5blk': __md5blk,
    '__md51': __md51,
    '__hex_chr': __hex_chr,
    '__rhex': __rhex,
    '__hex': __hex,
    'HashFunc': HashFunc,
    'Id': Id,
    'UnionKeys': UnionKeys,
    'bbPlugins': bbPlugins,
    'ZeroBBData': ZeroBBData,
    'NewBBData': NewBBData,
    'Zero': Zero,
    'New': New,
    'ReduceFull': ReduceFull,
    'Reduce': Reduce
};


