var express = require('express');
const util = require('util');
const child_process = require('child_process');
var router = express.Router();
var infrastructureService = require('../services/infrastructure.service');
 
// routes
router.get('/', getStatus);
router.get('/:_id', getExecStatus);
router.post('/:_id', ensureRunning);
router.post('/run/:_id', runTest);
router.delete('/:pmid', terminateProcess);

module.exports = router;

function getStatus(req, res) {
    infrastructureService.status()
        .then(function (user) {
            if (user) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(user, null, 4));
            } else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
}

function ensureRunning(req, res) {
    infrastructureService.ensureRunning(req.params._id, req.body)
        .then(function (resp) {
            return infrastructureService.execStatus(req.params._id);
        })
        .then(function (resp) {
            if (resp) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(resp, null, 4));
            } else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
}

function runTest(req, res) {

    cardinalPath = process.cwd() + "/" + "../";
    runScriptPath = process.cwd() + "/" + "../scripts/run.sh";
    runScriptArgs = "%s %d %d %d %s %s"; //binaryId, runs, cores, repetitions, (no)rebuild, (no)genetic
    args = util.format(runScriptArgs, req.params._id, 100000, 4, 1, "norebuild", "genetic");

    console.log("[INFO] Running test for id: " + req.params._id + " exec: " + runScriptPath + " args: " + args);
    try{
        dir = child_process.exec(runScriptPath + " " + args,
        {"cwd": cardinalPath},
        function(err, stdout, stderr) {
            if (err) {
                console.log("[ERROR] Failed to test binary: " + req.params._id);
            }
            console.log(stdout);
        });
    } catch (e) {
        console.log(e);
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({"status":"OK"}, null, 4));

    dir.on('exit', function (code) {
        console.log("[INFO] Run command exited with code: " + code);
    })

    

}

function getExecStatus(req, res) {
    infrastructureService.execStatus(req.params._id)
        .then(function (resp) {
            if (resp) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(resp, null, 4));
            } else {
                res.sendStatus(404);
            }
        })
        .catch(function (err) {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
}

function terminateProcess(req, res) {
    infrastructureService.terminateProcess(req.params.pmid)
        .then(function (resp) {
            let retObj = {
                result: 'OK'
            };

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(retObj), null, 4);
        })
        .catch(function (err) {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
}
