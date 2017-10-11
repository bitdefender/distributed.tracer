var express = require('express');
var router = express.Router();
var tokenService = require('../services/token.service');
 
// routes
router.get('/', getTokens);
router.post('/', createToken);
router.delete('/:_id', deleteToken);

module.exports = router;

function getTokens(req, res) {
    tokenService.get(req.user.userId)
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

function createToken(req, res) {
    // some body validation here
    if (("undefined" === typeof req.body) ||
        ("undefined" === typeof req.body.name) ||
        ("undefiend" === typeof req.body.permissions)) {
            res.status(400).send("Invalid format");
            return;
    }

    tokenService.create(req.user, req.body.name, req.body.permissions)
        .then(function (token) {
            let retObj = {
                result: 'OK',
                name: token.name
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

function deleteToken(req, res) {
    tokenService.delete(req.user.userId, req.params._id)
        .then(function () {
            let retObj = {
                result: 'OK'
            };

            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify(retObj), null, 4);
        })
        .catch(function(err) {
            let errObj = {
                error: err
            };

            res.setHeader('Content-Type', 'application/json');
            res.status(400).send(JSON.stringify(errObj), null, 4);
        });
}