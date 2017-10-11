var express = require('express');
var multer = require('multer');

var router = express.Router();
var upload = multer({ storage: multer.memoryStorage() });

var executableService = require('../services/executable.service');
 
// routes
router.get('/', getAll);
router.get('/:_id', getById);
router.post('/', createExecutable);
router.post('/:_id/uploadexecutable', upload.single("file"), uploadExecutable);
router.post('/:_id/uploadmempatch', upload.single("file"), uploadMempatch);
router.post('/:_id/uploadcorpus', upload.single("file"), uploadCorpus);
router.post('/:_id/uploadfuzzer', upload.single("file"), uploadFuzzer);
 
module.exports = router;

function getAll(req, res) {
    executableService.getAll()
        .then(function (executables) {
            if (executables) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(executables, null, 4));
            } else {
                res.setHeader('Content-Type', 'application/json');
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

function getById(req, res) {
    executableService.getOne(req.params._id)
        .then(function (executable) {
            if (executable) {
                res.send(executable);
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

function createExecutable(req, res) {
    if (('object' != typeof req.body) || 
        ('string' != typeof req.body.executableName) ||
        ('string' != typeof req.body.platform) ||
        (-1 == ['Windows', 'Linux'].indexOf(req.body.platform)) ||
        ('string' != typeof req.body.execution) ||
        (-1 == ['Inprocess', 'Extern'].indexOf(req.body.execution))
    ) {
        let errObj = {
            error: "Invalid parameters"
        };
        res.status(400).send(JSON.stringify(errObj), null, 4);
    }

    executableService.create(req.body)
        .then((resp) => {
            if (resp) {
                res.send(resp);
            } else {
                res.sendStatus(404);
            }
        })
        .catch((err) => {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        })
}
 

function uploadExecutable(req, res) {
    executableService.uploadExecutable(req.params._id, req.file)
        .then((resp) => {
            let retObj = {
                result: 'OK'
            };

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(retObj), null, 4);
        })
        .catch((err) => {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
} 

function uploadMempatch(req, res) {
    executableService.uploadMempatch(req.params._id, req.file)
        .then((resp) => {
            let retObj = {
                result: 'OK'
            };

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(retObj), null, 4);
        })
        .catch((err) => {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
} 

function uploadCorpus(req, res) {
    executableService.uploadCorpus(req.params._id, req.file)
        .then((resp) => {
            let retObj = {
                result: 'OK'
            };

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(retObj), null, 4);
        })
        .catch((err) => {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
} 

function uploadFuzzer(req, res) {
    executableService.uploadFuzzer(req.params._id, req.file)
        .then((resp) => {
            let retObj = {
                result: 'OK'
            };

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(retObj), null, 4);
        })
        .catch((err) => {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
} 
