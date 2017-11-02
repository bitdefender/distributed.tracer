const common = require('distributed-common');
if (!common.Init()) {
	console.log("Initialization error!");
	process.exit();
}

const state = require("./state.manager.js");

const Q = require("q");

process.on( 'unhandledRejection', ( error, promise ) => {
     console.log( 'UPR: ' + promise + ' with ' + error )
     console.log( error.stack )
} );

function StateAggregator(execId) {
    this.execId = execId;
    this.lastReady = state.Initialize(); //Q(true); //state.AcquireLocalCollection(execId);
    this.coll = null;
    this.dirty = false;

    this.GetCollections();
}

StateAggregator.prototype.GetCollections = function() {
    var _this = this;

    if (_this.coll != null) {
        this.Flush();
        this.lastReady = this.lastReady.then((c) => {
            var defered = Q.defer();
            state.ReleaseLocalCollection(_this.coll.name).then((cl) => {
                _this.coll = null;
                defered.resolve(true);
            });
            return defered.promise;
        });
    }

    this.lastReady = this.lastReady.then((c) => {
        var defered = Q.defer();
        state.AcquireLocalCollection(_this.execId).then((cl) => {
            _this.coll = state.GetCollections(cl);
            defered.resolve(true);            
        });
        return defered.promise;
    });
};

StateAggregator.prototype.ReleaseCollections = function() {
    var _this = this;

    if (_this.coll != null) {
        this.Flush();
        this.lastReady = this.lastReady.then((c) => {
            var defered = Q.defer();

            state.ReleaseLocalCollection(_this.coll.name).then((cl) => {
                _this.coll = null;
                console.log("Collection released");
                defered.resolve(true);
            });
            return defered.promise;
        });
    }
}

StateAggregator.prototype.AddTrace = function(body) {
    var _this = this;
    _this.dirty = true;
    
    return this.lastReady = this.lastReady.then((c) => {
        return state.AddTrace(_this.coll, body);
    });
};

StateAggregator.prototype.NewGlobal = function() {
    var _this = this;
    return this.lastReady = this.lastReady.then((c) => {
        return state.GenerateNewGlobal(_this.execId);
    });
}

StateAggregator.prototype.Flush = function() {
    var _this = this;
    var deferred = Q.defer();

    if (_this.dirty) {
        this.lastReady = this.lastReady.then(() => {
            state.FlushBB(_this.coll).then(() => {
                _this.dirty = false;
                deferred.resolve(true);
            });
        });
    } else {
        deferred.resolve(true);
    }

    return deferred.promise;
}

function StateQuery(execId) {
    this.execId = execId;
    this.lastReady = state.Initialize();
}

StateQuery.prototype.Get = function() {
    var deferred = Q.defer();
    var _this = this;

    // added a this.lastReady = ? is this ok?
    this.lastReady.then(() => {
        state.AcquireGlobalCollection(_this.execId).then((cName) => {
            var coll = state.GetGlobalCollection(cName);

            coll.global.find().toArray((err, ret) => {
                state.ReleaseGlobalCollection(_this.execId, cName).then((r) => {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(ret);
                    }
                });
            });
        });
    });

    this.lastReady = deferred.promise;
    return deferred.promise;
}

StateQuery.prototype.GetCoverage = function() {
	var deferred = Q.defer();
	var _this = this;

	this.lastReady.then(() => {
		state.AcquireGlobalCollection(_this.execId).then((cName) => {
			var coll = state.GetGlobalCollection(cName);

			var ret = coll.global.count((err, ret) => {
				if (err) {
					console.log(err);
					deferred.reject(err);
				} else {
					deferred.resolve(ret);
				}
			});

		});
	});

	this.lastReady = deferred.promise;
	return deferred.promise;
}

StateQuery.prototype.Debug = function() {
	var deferred = Q.defer();
	var _this = this;

	this.lastReady.then(() => {
		state.ShrinkCoverageInfo(_this.execId).then((res) => {
			deferred.resolve(true);
		});
	});

	this.lastReady = deferred.promise;
	return deferred.promise;
}

function StateCleaner(execId) {
    this.execId = execId;
    this.lastReady = state.Initialize();
}

// options: {
//     state: ["full", "normal", "none"] // default:normal
//     tests: true/false // default: true
//     traces: true/false // default: true
StateCleaner.prototype.CleanCollections = function(options) {
    var deferred = Q.defer();

    options = options || {};
    options.state = options.state || "normal";
    options.tests = options.tests || false;
    options.traces = options.traces || false;

    var _this = this;
    var qret;

    this.lastReady = this.lastReady.then(() => {
        var l, rc;

        var delFunc = (collName, delOp) => {
            return () => {
                console.log("Deleting " + collName);
                return delOp(_this.execId, collName);
            };
        };

        if ("none" != options.state) {
            if ("full" == options.state) {
                qret = state.GetAllCollectionsLow(_this.execId);
                rc = state.DeleteCollectionByName.bind(state);
            } else if ("normal" == options.state) {
                qret = state.GetAllCollections(_this.execId);
                rc = state.RemoveCollectionByName.bind(state);
            }

            qret = qret.then(
                (collections) => {
                    var qq = Q(true);
                    for (var i in collections) {
                        qq = qq.then(
                            delFunc(collections[i], rc)()
                        );
                    }

                    return qq.promise;
                }
            );
    
            qret = qret.then(() => {
                return state.DeleteToc(_this.execId);
            });
        } else {
            qret = Q(true);
        }

        var eList = [];
        if (options.tests) {
            eList.push(common.mongo.GetTestsCollection(_this.execId));
        }

        if (options.traces) {
            eList.push("trace_" + _this.execId + ".files");
            eList.push("trace_" + _this.execId + ".chunks");
        }

        console.dir(eList);
        for (var i in eList) {
            qret = qret.then(
                delFunc(eList[i], state.DeleteCollectionByName.bind(state))()
            );
        }

        qret = qret.then(() => {
            deferred.resolve(true);
        });
    });
    
    return deferred.promise;
}


module.exports.StateAggregator = StateAggregator;
module.exports.StateQuery = StateQuery;
module.exports.StateCleaner = StateCleaner;
