const path = require('path');
const rpc = require('axon-rpc');
const axon = require('axon');
const rep = axon.socket('rep');
const crypto = require('crypto');
const Q = require('q');
const randomstring = require('randomstring');

const ObjectId = require('mongodb').ObjectID;
const MongoClient = require('mongodb').MongoClient;
const Code = require('mongodb').Code;

const bb = require("./bb.js");
const bbdata = require("./bb.data.js");

const bbmongo = require("./bb.mongo.js");
function MongoCode(code) {
    switch (typeof(code)) {
        case "function" : 
            return new Code(code.toString());
        case "object" :
            var keys = Object.keys(code);
            var ret = {};
            for (var i in keys) {
                ret[keys[i]] = MongoCode(code[keys[i]]);
            }
            return ret;
        default :
            return code;
    };
}

const mrCode = MongoCode(bbmongo);

/*const mrCode = new Code(
	require('fs').readFileSync(
        require('path').join(__dirname, "bb.data.js")
    )
);*/



const common = require('distributed-common');
if (!common.Init()) {
	console.log("Initialization error!");
	process.exit();
}

const { ParseBinTrace } = require("./bintrace.js");

function ConnectToDb(connectUrl, callback) {
	MongoClient.connect(connectUrl, callback);
}

var db = null;
var dbReady = Q.defer();

ConnectToDb(common.mongo.GetUrl(), (err, conn) => {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        db = conn;
        dbReady.resolve(true);
});

function Initialize() {
        return dbReady.promise;
}

const localUrl = "tcp://0.0.0.0:3000";

var server = new rpc.Server(rep);
//rep.bind(localUrl);

function HashName(collName) {
	const hash = crypto.createHash('sha256');
	hash.update(collName);
	return hash.digest('hex');
}

function AcquireGlobalCollection(execId) {
    const collName = common.mongo.GetStateTocCollection(execId);
	var deferred = Q.defer();
	
	var toc = db.collection(collName);

	var r = toc.findOneAndUpdate(
		{ // filter
			type: "global",
			master: true
		},
		{ // update
			$inc: {
				refCnt: 1
			}
		},
		{ // options
			sort: {
				createdTs: -1,
			},
			returnOriginal: false
		}
	).then(function(ret) {
		if (null == ret.value) {
			var cTime =  new Date().getTime();
			var suffix = randomstring.generate({length: 8, charset:"hex"});
			var collId = common.mongo.GetStateGlobalCollection(execId, suffix);
			var newColl = {
				_id: HashName(collId),
				name: collId,
				type: "global",
				execId: execId,
				master: true,
				refCnt: 1,
				createdTs: cTime
			};

			toc.insert(
				newColl
			).then(() => {
				deferred.resolve(newColl.name);
			});
		} else {
			deferred.resolve(ret.value.name);
		}
	});

	return deferred.promise;
}

function ReleaseGlobalCollection(execId, collId) {
	const collName = common.mongo.GetStateTocCollection(execId);
	var deferred = Q.defer();
	
	var toc = db.collection(collName);
	var collHash = HashName(collId);

	var r = toc.findOneAndUpdate(
		{ // filter
			_id: collHash
		},
		{ // update
			$inc: {
				refCnt: -1
			}
		},
		{ // options
			sort: {
				createdTs: -1,
			},
			returnOriginal: false
		}
	).then(function(ret) {
		if ((0 >= ret.value.refCnt) && (!ret.value.master)) {
			db.collection(ret.value.name).drop(function(err, reply) {
				toc.remove({
					_id: collHash
				}, function(err, reply) {
					deferred.resolve(true);
				});
			});
		} else {
			deferred.resolve(true);
		}
	});

	return deferred.promise;
}

function AcquireLocalCollection(execId) {
	const collName = common.mongo.GetStateTocCollection(execId);
	var deferred = Q.defer();
	
	AcquireGlobalCollection(
		execId
	).then(function (gCollId) {
		var toc = db.collection(collName);

		var cTime =  new Date().getTime();
		var suffix = randomstring.generate({length: 8, charset:"hex"});
		var collId = common.mongo.GetStateLocalCollection(execId, suffix);
		var newColl = {
			_id: HashName(collId),
			name: collId,
			type: "local",
			execId: execId,
			parent: gCollId,
			createdTs: cTime,
			state: "open"
		};

		toc.insert(
			newColl
		).then(() => {
			deferred.resolve({
				execId: execId,
				global: gCollId,
				local: collId
			});
		});
	})

	return deferred.promise;
}

function ReleaseLocalCollection(collection) {
	const collName = common.mongo.GetStateTocCollection(collection.execId);
	var deferred = Q.defer();
	
	var toc = db.collection(collName);

	var r = toc.findOneAndUpdate(
		{ // filter
			_id: HashName(collection.local)
		}, { // update
			$set: {
				state: "closed"
			}
		}, { // options
			sort: {
				createdTs: -1,
			},
			returnOriginal: false
		}
	).then(function(ret) {
		ReleaseGlobalCollection(collection.execId, collection.global)
			.then(function (ret) {
				deferred.resolve(true);
			});
	});

	return deferred.promise;
}

function GetLocalCollections(execId) {
	const collName = common.mongo.GetStateTocCollection(execId);
	var deferred = Q.defer();
	
	var toc = db.collection(collName);

	var r = toc.find(
		{
			type: "local",
			execId: execId,
			state: "closed"
		}
	).toArray(function (err, ret) {
		if (err) {
			deferred.reject(err);
		} else {
			deferred.resolve(ret);
		}
	})

	return deferred.promise;
}

function GetAllCollections(execId) {
    const collName = common.mongo.GetStateTocCollection(execId);
	var deferred = Q.defer();
	
	var toc = db.collection(collName);

	var r = toc.find(
		{
			execId: execId
		}
	).toArray(function (err, ret) {
		if (err) {
			deferred.reject(err);
		} else {
            var names = [];

            for(var i in ret) {
                names.push(ret[i].name);
            }
			deferred.resolve(names);
		}
	})

	return deferred.promise;
}

function GetAllCollectionsLow(execId) {
    var deferred = Q.defer();
    
    db.listCollections().toArray(function(err, cols) {
        if (err) {
            deferred.reject(err);
            return;
        }

        var ret = [];

        for (var i in cols) {
            var cName = cols[i].name; //cols[i].name.substring(cols[i].name.indexOf('.'));
            if (common.mongo.IsStateGlobalCollection(execId, cName) || common.mongo.IsStateLocalCollection(execId, cName)) {
                ret.push(cName);
            }
        }

        deferred.resolve(ret);
    });

    return deferred.promise;
}

function RemoveCollection(execId, collection) {
    const collName = common.mongo.GetStateTocCollection(execId);
	var deferred = Q.defer();
    
	var toc = db.collection(collName);
    db.collection(collection).drop(
        function(err, reply) {
            toc.remove({
                name: collection
            }, function(err, reply) {
                deferred.resolve(true);
            });
        }
    );

    return deferred.promise;
}

function DeleteCollection(execId, collection) {
	var deferred = Q.defer();
    
    db.collection(collection).drop(
        function(err, reply) {
            deferred.resolve(true);
        }
    );

    return deferred.promise;
}

function DeleteToc(execId) {
    const collName = common.mongo.GetStateTocCollection(execId);
	var deferred = Q.defer();
    
	db.collection(collName).drop(
        function(err, reply) {
            deferred.resolve(true);
        }
    );

    return deferred.promise;
}

function GetAllTests(coll) {
	var deferred = Q.defer();
	coll.global.distinct("value.address.firstTest.testname", (err, firstTests) => {
		if (err) {
			deferred.reject(err);
			return;
		}
		coll.global.distinct("value.address.lastTest.testname", {}, (err, lastTests) => {
			if (err) {
				deferred.reject(err);
				return;
			}
			var tests = [];
			tests.push(firstTests);
			tests.push(lastTests);
			console.dir(tests);
			deferred.resolve(tests);
		});
	});
	return deferred.promise;
}

function GetInterestingTests(prev, next) {
	var deferred = Q.defer();
	var prevcoll = GetGlobalCollection(prev);
	var nextcoll = GetGlobalCollection(next);

	GetAllTests(prevcoll).then((prevtests) => {
		GetAllTests(nextcoll).then((nexttests) => {
			var interesting = nexttests.filter((x) => {
				return prevtests.indexOf(x) < 0;
			});
			deferred.resolve(interesting);
		});
	});
	return deferred.promise;
}

function ShrinkCoverageInfo(execId) {
	var deferred = Q.defer();
	const tocName = common.mongo.GetStateTocCollection(execId);

	// sort global states in toc by createdTs
	db.collection(tocName).find({type:"global"},
		{sort:{createdTs : 1}}).toArray((err, globals) => {
			if (err) {
				deferred.reject(false);
				return;
			}
			var prevGlobalDoc = null;
			var qret = Q(true);

			var x = (idx) => {
				return () => {
					var doc = globals[idx];
					if (prevGlobalDoc != null) {
						if (prevGlobalDoc.master == false) {
							GetInterestingTests(prevGlobalDoc.name, doc.name);
							prevGlobalDoc = doc;
						}
					} else {
						prevGlobalDoc = doc;
					}
				};
			};

			for (var i in globals) {
				qret = qret.then(x(i));
			}
			qret.then(() => {
				deferred.resolve(true);
			});
		})
	return deferred.promise;
}

function GenerateNewGlobal(execId) {
	var deferred = Q.defer();

	const tocName = common.mongo.GetStateTocCollection(execId);
	var toc = db.collection(tocName);

	AcquireGlobalCollection(execId)
	.then(function(global) {
		var cTime =  new Date().getTime();
		var suffix = randomstring.generate({length: 8, charset:"hex"});
		var newGlobal = common.mongo.GetStateGlobalCollection(execId, suffix);

		db.collection(global).aggregate(
			{ $match: {} },
			{ $out: newGlobal },
			function (ret) {
				GetLocalCollections(execId).then(function (localColl) {
                    var qret = Q(true);
					var processCol = function(c) {
						return function() {
							var dfrd = Q.defer();
                            
							db.collection(c.name).mapReduce(
								function() {
									emit(this._id, this.value); 
								},
								function(key, values) { 
									return Reduce(values);
								},
								{ 
									out: { 
										reduce: newGlobal
									},
									scope: mrCode, /*{
										bbops: mrCode
									},*/
									/*finalize: function(key, value) {
										return value;
									},*/
									include_statistics: true,
							        verbose: true
								},
								function (err, collection, stats) {
									if (err) {
										console.log(err);
									}

									//console.dir(collection);
									//console.dir(stats);

									db.collection(c.name).drop(
										function(err, reply) {
											toc.remove({
												_id: c._id
											}, function(err, reply) {
												dfrd.resolve(true);
											});
										}
									);
								}
							);

							return dfrd.promise;
						};
					};

					for (var col in localColl) {
						qret = qret.then(processCol(localColl[col]));
					}

					qret.then(function () {
						var newColl = {
							_id: HashName(newGlobal),
							name: newGlobal,
							type: "global",
							execId: execId,
							master: true,
							refCnt: 0,
							createdTs: cTime,
							parent: global
						};

						return toc.insert(
							newColl
						);
					})
					.then(function () {
						toc.update({
							name: global
						}, {
							$set: {
								master: false
							}
						}, function () {
							// parent global is not released here because it is
							// referenced by its child
							deferred.resolve(true);
						});
					});
				});
			}
		)
		
		
	});

	return deferred.promise;
}

function GetCollections(collNames) {
	return {
		execId: collNames.execId,
		global: db.collection(collNames.global),
		local: db.collection(collNames.local),
		name: collNames
	};
}

function GetGlobalCollection(collName) {
	return {
		global: db.collection(collName),
		name: collName
	};
}

function AddTrace(collection, trace) {
    var deferred = Q.defer();
    var lst = Q(true);
    //var prevBB = null;
    var prevBB = {module: '<begin>', offset: 0};
    
    var processBB = function(thebb, nxbb) {
        return function(r) {
			return bb.Get(collection, thebb)
			.then(function(data) {
				if (null === nxbb) {
					// won't reach this call because <end> doesn't get into db
					return bb.Update(data, bbdata.New(thebb));
				} else {
        			return bb.Update(data, bbdata.New(thebb, nxbb));
				}
			});
		};
	}

	for (var nextBB of ParseBinTrace(trace)) {
		if (prevBB != null) {
            lst = lst.then(processBB(prevBB, nextBB));
		}
		prevBB = nextBB;
	}

	lst = lst.then(processBB(prevBB, {module:'<end>', offset: 0}));
		

	lst = lst.then(function (r) {
		deferred.resolve(true);
	});

	return deferred.promise;
}

function FlushBB(collection) {
	return bb.Flush(collection);
}

module.exports.Initialize = Initialize;
module.exports.AcquireGlobalCollection = AcquireGlobalCollection;
module.exports.ReleaseGlobalCollection = ReleaseGlobalCollection;
module.exports.AcquireLocalCollection = AcquireLocalCollection;
module.exports.ReleaseLocalCollection = ReleaseLocalCollection;
module.exports.GetCollections = GetCollections;
module.exports.GetGlobalCollection = GetGlobalCollection;
module.exports.AddTrace = AddTrace;
module.exports.FlushBB = FlushBB;
module.exports.GenerateNewGlobal = GenerateNewGlobal;

module.exports.GetAllCollections = GetAllCollections;
module.exports.GetAllCollectionsLow = GetAllCollectionsLow;
module.exports.RemoveCollection = RemoveCollection;
module.exports.DeleteCollection = DeleteCollection;
module.exports.DeleteToc = DeleteToc;
module.exports.ShrinkCoverageInfo = ShrinkCoverageInfo;
