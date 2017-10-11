var express = require('express');
var multer = require('multer');

var router = express.Router();
var upload = multer({ storage: multer.memoryStorage() });

var corpusService = require('../services/corpus.service');

router.get('/:_id/list', getList);
router.get('/:_id/stats', getStats);
router.get('/:_id/:_test', getTest);
module.exports = router;

function getList(req, res) {
    var qStart = req.query.first || 0;
    var qCount = req.query.count || 64;
    var qExclude = req.query.exclude || [];

    corpusService.list(req.params._id, qStart, qCount, qExclude)
        .then(function (tests) {
            if (tests) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(tests, null, 4));
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

function getStats(req, res) {
    corpusService.stats(req.params._id)
        .then(function (corpusStats) {
            if (corpusStats) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(corpusStats, null, 4));
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

function getTest(req, res) {
    corpusService.test(req.params._id, req.params._test)
        .then(function(test) {
            if (test) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(test, null, 4));
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.sendStatus(404);
            }
        })
        .catch(function(err) {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
}
