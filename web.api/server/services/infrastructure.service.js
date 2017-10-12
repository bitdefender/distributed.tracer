var Q = require('q');

const common = require('distributed-common');
common.Init();

const processManager = require('process.manager');
const executableService = require('./executable.service');

var service = {};

service.status = status;
service.execStatus = execStatus;
service.ensureRunning = ensureRunning;
service.terminateProcess = terminateProcess;

module.exports = service;

var execNameCache = {};

function status() {
    var deferred = Q.defer();

    processManager.status((st) => {
        var noCache = [];
        for (let i in st) {
            for (let j in st[i].running) {
                if (!(st[i].running[j].execId in execNameCache) && (-1 == noCache.indexOf(st[i].running[j].execId))) {
                    noCache.push(st[i].running[j].execId);
                }
            }
        }

        var pNoCache = [];
        for (let i in noCache) {
            pNoCache.push(executableService.getName(noCache[i]));
        }

        Q.all(pNoCache).then((ret) => {
            for (let i in ret) {
                if ("name" in ret[i]) {
                    execNameCache[ret[i].id] = ret[i].name;
                }
            }

            for (let i in st) {
                for (let j in st[i].running) {
                    st[i].running[j].execName = execNameCache[st[i].running[j].execId];
                }
            }

            deferred.resolve(st);
        });
    });

    return deferred.promise;
}

function execStatus(_id) {
    var deferred = Q.defer();
    processManager.status((st) => {
        var noCache = [];
        if (!(_id in execNameCache)) {
            noCache.push(_id);
        }

        var pNoCache = [];
        for (let i in noCache) {
            pNoCache.push(executableService.getName(noCache[i]));
        }

        Q.all(pNoCache).then((ret) => {
            for (let i in ret) {
                if ("name" in ret[i]) {
                    execNameCache[ret[i].id] = ret[i].name;
                }
            }

            for (let i in st) {
                var r = [];
                for (let j in st[i].running) {
                    //st[i].running[j].execName = execNameCache[st[i].running[j].execId];
                    if (st[i].running[j].execId == _id) {
                        r.push(st[i].running[j]);
                    }
                }

                for (var j in r) {
                    r[j].execName = execNameCache[r[j].execId];
                }

                st[i].running = r;
            }

            deferred.resolve(st);
        });
    });
    return deferred.promise;
}

function ensureRunning(id, values) {
    var deferred = Q.defer();

    //deferred.resolve(true);
    var procs = Object.keys(values);
    var cnt = 0;

    var exec = () => {
        if (cnt > procs.length) {
            status()
                .then((data) => {
                    deferred.resolve(data);
                })
                .catch((err) => {
                    deferred.reject(err);
                });
            return;
        }

        var c = cnt;
        cnt++;
        processManager.ensureRunning(procs[c], id, values[procs[c]], exec);
    };

    return deferred.promise;
}

function terminateProcess(pmid) {
    var deferred = Q.defer();

    console.log("Killing " + pmid);
    processManager.terminate(pmid, () => {
        console.log("Killed!");
        deferred.resolve(0);
    });

    return deferred.promise;
}