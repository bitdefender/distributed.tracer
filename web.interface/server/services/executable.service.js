var crypto = require('crypto');
var _ = require('lodash');
var Q = require('q');
var mongo = require('mongoskin');
var randomstring = require('randomstring');
var AdmZip = require('adm-zip');

var common = require('distributed-common');
common.Init();

var db = mongo.db(common.mongo.GetUrl(), { native_parser: true });
db.bind('executables');

var service = {};
 
service.getAll = getAll;
service.getOne = getOne;
service.getName = getName;
service.create = create;

service.download = download;
service.uploadExecutable = uploadExecutable;
service.uploadMempatch = uploadMempatch;
service.uploadCorpus = uploadCorpus;
service.uploadFuzzer = uploadFuzzer;
 
module.exports = service;


function getAll() {
    var deferred = Q.defer();
 
    db.executables.find({"state" : "ready"}, {
        binary: 0,
        mempatch: 0,
        "corpus.data": 0,
        "fuzzer.data": 0
    }).toArray(function (err, executables) {
        if (err) deferred.reject(err);
 
        if (executables) {
            let ret = [];
            executables.forEach((elem) => {
                let itm = _.omit(elem, ["_id"]);
                itm.id = elem._id;
                ret.push(itm);
            });
            
            deferred.resolve(ret);
        } else {
            deferred.resolve();
        }
    });
 
    return deferred.promise;
}

function getName(id) {
    var deferred = Q.defer();
 
    if (!mongo.ObjectId.isValid(id)) {
        deferred.resolve({});
    } else {
        db.executables.findById(mongo.ObjectId(id), {
            name: 1
        }, function(err, executable) {
            if (err) {
                deferred.resolve({});
                return;
            }
            deferred.resolve({
                id: id,
                name: executable.name
            });
        });
    }

    return deferred.promise;
}

function getOne(id) {
    var deferred = Q.defer();
 
    if (!mongo.ObjectId.isValid(id)) {
        deferred.resolve();
    } else {
        db.executables.findById(mongo.ObjectId(id), {
            binary: 0,
            //mempatch: 0,
            "corpus.data": 0,
            "fuzzer.data": 0
        }, function (err, executable) {
            if (err) deferred.reject(err);

            if (executable) {
                let itm = _.omit(executable, ["_id"]);
                itm.id = executable._id;
                deferred.resolve(itm);
            } else {
                deferred.resolve();
            }
        });
    }
 
    return deferred.promise;
}

function create(executableParam) {
    var deferred = Q.defer();

    var newId = randomstring.generate({
        length: 24,
        charset: 'hex'
    });

    var executable = {
        "_id" : mongo.ObjectID(newId),
        "state" : "unavailable",
        "name" : executableParam.executableName,
        "platform" : executableParam.platform,
        "execution" : executableParam.execution,
        "features" : {
            "mempatch" : false,
            "corpus" : false,
            "fuzzer" : false
        }
    };

    db.executables.insert(
        executable,
        function (err, doc) {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve({id: doc.ops[0]._id});
        }
    );

    return deferred.promise;
}

function download(executableId) {
    var deferred = Q.defer();

    deferred.resolve(true);
    return deferred.promise;
}

function uploadExecutable(executableId, binary) {
    var deferred = Q.defer();

    console.log("Executable ID " + executableId);

    var hash = crypto.createHash('sha256');
    hash.update(binary.buffer);

    db.executables.updateOne(
        {
            "_id" : mongo.ObjectID(executableId)
        }, {
            "$set" : {
                "state" : "ready",
                "binary" : binary.buffer,
                "sha256" : hash.digest('hex'),
                "size" : binary.buffer.length
            }
        }, (err, ret) => {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve(true);
        }
    );

    return deferred.promise;
}

function uploadMempatch(executableId, mempatch) {
    var deferred = Q.defer();

    db.executables.updateOne(
        {
            "_id" : mongo.ObjectID(executableId)
        }, {
            "$set" : {
                "mempatch" : mempatch.buffer,
                "features.mempatch" : true
            }
        }, (err, ret) => {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve(true);
        }
    );

    return deferred.promise;
}

function uploadCorpus(executableId, corpus) {
    var deferred = Q.defer();

    var hash = crypto.createHash('sha256');
    hash.update(corpus.buffer);

    // unzip buffer and count files
    var zip = new AdmZip(corpus.buffer);
    var inputs = zip.getEntries().length;

    db.executables.updateOne(
        {
            "_id" : mongo.ObjectID(executableId)
        }, {
            "$set" : {
                "corpus" : {
                  "data" : corpus.buffer,
                  "size" : corpus.buffer.length,
                  "inputs" : inputs,
                  "checksum" : hash.digest('hex')
                },
                "features.corpus" : true
            }
        }, (err, ret) => {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve(true);
        }
    );

    return deferred.promise;
}

function uploadFuzzer(executableId, fuzzer) {
    var deferred = Q.defer();

    var hash = crypto.createHash('sha256');
    hash.update(fuzzer.buffer);

    db.executables.updateOne(
        {
            "_id" : mongo.ObjectID(executableId)
        }, {
            "$set" : {
                "fuzzer" : {
                    "data" : fuzzer.buffer,
                    "size" : fuzzer.buffer.length,
                    "checksum" : hash.digest('hex')
                },
                "features.fuzzer" : true
            }
        }, (err, ret) => {
            if (err) {
                deferred.reject(err);
                return;
            }
            deferred.resolve(true);
        }
    );

    return deferred.promise;
}
