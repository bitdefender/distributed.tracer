var crypto = require('crypto');
var _ = require('lodash');
var Q = require('q');
var mongo = require('mongoskin');
const fs = require('fs');

var common = require('distributed-common');
common.Init();

const stateManager = require("state.manager");

var db = mongo.db(common.mongo.GetUrl(), { native_parser: true });

var service = {};
 
service.stats = getStats;
service.test = getTest;
service.list = getList;
 
module.exports = service;

function getStats(id) {
    var deferred = Q.defer();
    var ret = {
        total: 0,
        corpus: 0,
        traced: 0,
        passed: 0,
        failed: 0,
        errored: 0,
        coverage: 0
    };

    // compute .failed by counting the number of crash-files
    // in ../<id>/crashes

    crashDirPath = process.cwd() + '/' + '../' + id + '/' + 'crashes'
    fs.readdir(crashDirPath, (err, files) => {
        if (err) {
            console.log("[ERROR] List error for dir: " + crashDirPath);
            console.dir(err);
            return;
        }
        console.log(files);
        files.forEach(file => {
            if (file.startsWith('crash-')) {
                ret.failed += 1;
            }
        });
    });

    var coll = db.collection('tests_' + id);

    coll.count(function(err, count) {
        if (err) {
            deferred.reject(err);
            return;
        }

        ret.total = count;

        coll.count({state: "traced"}, function(err, count) {
            if (err) {
                deferred.reject(err);
                return;
            }

            ret.traced = count;

            coll.count({result: "pass"}, function(err, count) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                ret.passed = count;

                coll.count({result: "river-error"}, function(err, count) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    ret.errored = count;
                    var st = new stateManager.StateQuery(id);
                    st.GetCoverage().then((coverage) => {
                        ret.coverage = coverage;

                        coll.count({interesting: true}, function(err, count) {
                            if (err) {
                                deferred.reject(err);
                                return;
                            }
                            ret.corpus = count;
                            deferred.resolve(ret);
                        });
                    });
                });
            });
        });
    });

    return deferred.promise;
}

function getTest(execId, testId) {
    var deferred = Q.defer();
    var coll = db.collection('tests_' + execId);

    coll.findById(
        testId, 
        { trace: 0 },
        function(err, test) {
            if (err) {
                deferred.reject(err);
                return;
            }

            deferred.resolve(test);
        }
    );

    return deferred.promise;
}

function getList(execId, start, count, exclude) {
    var deferred = Q.defer();
    var coll = db.collection('tests_' + execId);
    var filter = {"result": {"$nin": exclude}};

    coll.find(
        filter,
        { _id: 1, strid: 1, state: 1, result: 1 }
    )
    .skip(start * 1)
    .limit(count * 1)
    .toArray(function(err, tests) {
            if (err) {
                deferred.reject(err);
                return;
            }

            var tst = [];
            for (var i in tests) {
                tst.push({
                    id: tests[i]._id,
                    strid: tests[i].strid,
                    state: tests[i].state,
                    result: tests[i].result
                });
            }

            coll.count(filter, function(err, count) {
                var ret = {
                    tests: tst,
                    total: count
                };
                deferred.resolve(ret);
            });
        }
    );


    return deferred.promise;
}
