const _ = require('lodash');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Q = require('q');
const mongo = require('mongoskin');

const common = require('distributed-common');
common.Init();

const tokenService = require('./token.service');

var db = mongo.db(common.mongo.GetUrl(), { native_parser: true });
db.bind('users');
 
var service = {};
 
service.authenticate = authenticate;
service.getById = getById;
service.create = create;
service.update = update;
service.delete = _delete;
 
module.exports = service;
 
function authenticate(username, password) {
    var deferred = Q.defer();
 
    db.users.findOne({ username: username }, function (err, user) {
        if (err) deferred.reject(err);
 
        if (user && bcrypt.compareSync(password, user.hash)) {
            tokenService.login(user)
                .then(function(token) {
                    console.log(token);
                    // authentication successful
                    deferred.resolve(token.value);                    
                })
                .catch(function(err) {
                    deferred.reject(err);
                });
        } else {
            // authentication failed
            deferred.resolve();
        }
    });
 
    return deferred.promise;
}
 
function getById(_id) {
    var deferred = Q.defer();
 
    db.users.findById(_id, function (err, user) {
        if (err) deferred.reject(err);
 
        if (user) {
            // return user (without hashed password)
            deferred.resolve(_.omit(user, 'hash'));
        } else {
            // user not found
            deferred.resolve();
        }
    });
 
    return deferred.promise;
}
 
function create(userParam) {
    var deferred = Q.defer();
 
    // validation
    db.users.findOne(
        { username: userParam.username },
        function (err, user) {
            if (err) deferred.reject(err);
 
            if (user) {
                // username already exists
                deferred.reject('Username "' + userParam.username + '" is already taken');
            } else {
                createUser();
            }
        });
 
    function createUser() {
        // set user object to userParam without the cleartext password
        var user = _.omit(userParam, 'password');
 
        // add hashed password to user object
        user.hash = bcrypt.hashSync(userParam.password, 10);
 
        db.users.insert(
            user,
            function (err, doc) {
                if (err) deferred.reject(err);
 
                deferred.resolve();
            });
    }
 
    return deferred.promise;
}
 
function update(_id, userParam) {
    var deferred = Q.defer();
 
    // validation
    db.users.findById(_id, function (err, user) {
        if (err) deferred.reject(err);
 
        if (userParam.newPass) {
            if (!bcrypt.compareSync(userParam.oldPass, user.hash)) {
                deferred.reject('Invalid password');
                return;
            }
        }

        updateUser();
    });
 
    function updateUser() {
        // fields to update
        
        console.log("Update for " + _id);
        console.dir(userParam);

        var set = { };

        if (userParam.firstName) {
            set.firstName = userParam.firstName;
        }
        
        if (userParam.lastName) {
            set.firstName = userParam.firstName;
        }

        // update password if it was entered
        if (userParam.newPass) {
            set.hash = bcrypt.hashSync(userParam.newPass, 10);
        }
 
        console.dir(set);

        db.users.update(
            { _id: mongo.ObjectId(_id) },
            { $set: set },
            function (err, doc) {
                if (err) deferred.reject(err);
 
                deferred.resolve();
            });
    }
 
    return deferred.promise;
}
 
// prefixed function name with underscore because 'delete' is a reserved word in javascript
function _delete(_id) {
    var deferred = Q.defer();
 
    db.users.remove(
        { _id: mongo.helper.toObjectID(_id) },
        function (err) {
            if (err) deferred.reject(err);
 
            deferred.resolve();
        });
 
    return deferred.promise;
}