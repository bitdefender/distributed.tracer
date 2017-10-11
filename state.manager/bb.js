const _ = require("lodash");
const Q = require("q");

const bbdata = require("./bb.data.js");

// here are documents available in the global collection
var globalCache = {};

// here are documents available in the local collection
var localCache = {};

// here are reduced versions of the previous caches
var aggCache = {};

var lastCollections = {
    global: "",
    local: ""
}

function FlushCacheBB(collection) {
    if ((collection.name.global != lastCollections.global) || (collection.name.local != lastCollections.local)) {
        console.log("Collection changed, flushing caches!");
        localCache = {};
        aggCache = {};
        lastCollections = collection.name;
    }
}

function GetBB(collection, module, offset) {
    var deferred = Q.defer();
    var query = {
		_id: bbdata.Id(module, offset)
	};

    FlushCacheBB(collection);

    if (query._id in aggCache) {
        deferred.resolve(aggCache[query._id]);
    } else {
        var qGlobal;
        if (!query._id in globalCache) {
            qGlobal = Q(globalCache[query._id]);
        } else {
            var dg = Q.defer();
            collection.global.findOne(
                query
            ).then(function(ret) {
                if (null == ret) {
                    dg.resolve(null);
                } else {
                    globalCache[query._id] = ret;
                    dg.resolve(ret);
                }
            });

            qGlobal = dg.promise;
        }

        var qLocal;

        if (!query._id in localCache) {
            qLocal = Q(localCache[query._id]);
        } else {
            var dl = Q.defer();
            collection.local.findOne(
                query
            ).then(function(ret) {
                if (null == ret) {
                    dl.resolve(null);
                } else {
                    localCache[query._id] = ret;
                    dl.resolve(ret);
                }
            });

            qLocal = dl.promise;
        }

        Q.all([qGlobal, qLocal]).then((data) => {
            var retarr = [];
            for (var i in data) {
                if (null != data[i]) {
                    retarr.push(data[i]);
                }
            }

            var ret;
            switch (retarr.length) {
                case 0:
                    ret = bbdata.Zero(module, offset);
                    break;
                case 1:
                    ret = retarr[0];
                    break;
                case 2:
                    ret = bbdata.ReduceFull(retarr[0], retarr[1]);
                    break;
                /*case 3:
                    ret = bbdata.Reduce(
                        bbData.Reduce(retarr[0], retarr[1]),
                        retarr[2]
                    );*/
                    break;
            }
            
            aggCache[ret._id] = ret;
            deferred.resolve(ret);
        });

    }

	return deferred.promise;
}

function UpdateBB(bb, delta) {
    var oldBB = localCache[bb._id] || bbdata.Zero(bb.value.address.module, bb.value.address.offset);

    localCache[bb._id] = bbdata.ReduceFull(oldBB, delta);
    localCache[bb._id].changed = true;
    aggCache[bb._id] = bbdata.ReduceFull(aggCache[bb._id], delta);

    return aggCache[bb._id];
}

function FlushBB(collection) {
    var deferred = Q.defer();
    var q = [];

    for (var itm in localCache) {
        if (("changed" in localCache[itm]) && (localCache[itm].changed)) {
            if ("<begin>" == itm) {
                console.log("[" + collection.name.local + "] <begin> has " + localCache[itm].value.global.count + " passes!");
            }

            q.push({
                updateOne : {
                    filter: { _id : itm },
                    update: _.omit(localCache[itm], ['_id', 'changed']),
                    upsert: true
                }
            });
        }
    }

    collection.local.bulkWrite(
        q,
        { ordered: false }
    ).then(function(ret) {
        //localCache = {};
        //aggCache = {};
        deferred.resolve(ret);
    });

    return deferred.promise;
}

function DebugBB() {
    console.dir(localCache);
}

module.exports = {
    Get: GetBB,
    Update: UpdateBB,
    Flush: FlushBB,
    Debug: DebugBB
}
