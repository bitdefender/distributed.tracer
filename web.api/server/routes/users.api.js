var express = require('express');
var router = express.Router();
var userService = require('../services/user.service');
 
// routes
router.post('/authenticate', authenticateUser);
router.post('/register', registerUser);
router.get('/current', getCurrentUser);
router.put('/', updateUser);
router.delete('/:_id', deleteUser);
 
module.exports = router;
 
function authenticateUser(req, res) {
    userService.authenticate(req.body.username, req.body.password)
        .then(function (token) {
            if (token) {
                // authentication successful
                let retObj = {
                    token: token
                };

                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(retObj), null, 4);
            } else {
                // authentication failed
                res.setHeader('Content-Type', 'application/json');
                res.sendStatus(401);
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
 
function registerUser(req, res) {
    userService.create(req.body)
        .then(function () {
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
 
function getCurrentUser(req, res) {
    userService.getById(req.user.userId)
        .then(function (user) {
            if (user) {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify(user, null, 4));
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
 
function updateUser(req, res) {
    var userId = req.user.userId;
    userService.update(userId, req.body)
        .then(function () {
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
 
function deleteUser(req, res) {
    var userId = req.user.sub;
    if (req.params._id !== userId) {
        // can only delete own account
        return res.status(401).send('You can only delete your own account');
    }
 
    userService.delete(userId)
        .then(function () {
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