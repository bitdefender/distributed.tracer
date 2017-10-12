var _ = require('lodash');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var Q = require('q');
var mongo = require('mongoskin');

var common = require('distributed-common');
common.Init();

var db = mongo.db(common.mongo.GetUrl(), { native_parser: true });
db.bind('tokens');

var service = {};

service.login = login;
service.create = create;
service.validate = validate;
service.get = getByUser;
service.delete = _delete;

module.exports = service;


function login(user) {
    var deferred = Q.defer();
 
    db.tokens.insert(
        {
            user: user._id,
            type: "login",
            permissions: user.permissions,
            name: "Web login @" + ( new Date().toISOString() )
        }, function (err, token) {
            if (err) {
                deferred.reject(err);
                return;
            }

            let tokSig = jwt.sign(
                {
                    tokenId: token.ops[0]._id.toString(),
                    userId: token.ops[0].user.toString(),
                    permissions: token.ops[0].permissions,
                    name: token.ops[0].name
                }, 
                common.interface.GetSecret()
            );

            db.tokens.update(
                {
                    _id: token.ops[0]._id
                }, {
                    $set: {
                        value: tokSig
                    }
                }, function(err, utoken) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                        
                    deferred.resolve({
                        tokenId: token.ops[0]._id.toString(),
                        userId: token.ops[0].user.toString(),
                        permissions: token.ops[0].permissions,
                        name: token.ops[0].name,
                        value: tokSig
                    });
                }
            );
        }
    );
    
    return deferred.promise;
}

function create(user, name, permissions) {
    var deferred = Q.defer();

    var perms = [];
    for (var p in permissions) {
        if ((true == permissions[p]) && (-1 !== user.permissions.indexOf(p))) {
            perms.push(p);
        }
    }
    
    db.tokens.insert(
        {
            user: mongo.ObjectId(user.userId),
            type: "api",
            permissions: perms,
            name: name
        }, function (err, token) {
            if (err) {
                deferred.reject(err);
                return;
            }

            let tokSig = jwt.sign(
                {
                    tokenId: token.ops[0]._id.toString(),
                    userId: token.ops[0].user.toString(),
                    permissions: token.ops[0].permissions,
                    name: token.ops[0].name
                }, 
                common.interface.GetSecret()
            );

            db.tokens.update(
                {
                    _id: token.ops[0]._id
                }, {
                    $set: {
                        value: tokSig
                    }
                }, function(err, utoken) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                        
                    deferred.resolve({
                        tokenId: token.ops[0]._id.toString(),
                        userId: token.ops[0].user.toString(),
                        permissions: token.ops[0].permissions,
                        name: token.ops[0].name,
                        value: tokSig
                    });
                }
            );
        }
    );
    
    return deferred.promise;
}

function validate(token) {
    var deferred = Q.defer();

    db.tokens.findOne(
        { _id: token.tokenId },
        function (err, dbtoken) {
            if (err) {
                deferred.reject(err);
                return;
            }

            if (null == dbtoken) {
                deferred.resolve(false);
                return;
            }

            if (token.userId != dbtoken.user) {
                deferred.resolve(false);
                return;
            }

            for (var p in token.permissions) {
                if (-1 == dbtoken.permissions.indexOf(token.permissions[p])) {
                    deferred.resolve(false);
                    return;
                }
            }

            deferred.resolve(true);
        }
    );

    return deferred.promise;
}

function getByUser(userId) {
    var deferred = Q.defer();
 
    db.tokens.find({
        user: mongo.ObjectID(userId),
        type: "api"
    }).toArray(function (err, tokens) {
        console.dir(err);
        if (err) deferred.reject(err);
 
        console.dir(tokens);

        if (tokens) {
            let ret = [];
            tokens.forEach((elem) => {
                let itm = _.omit(elem, ["user", "type", "_id"]);
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

function _delete(userId, tokenId) {
    var deferred = Q.defer();

    console.dir(userId);
    console.dir(tokenId);

    db.tokens.remove({
        _id: mongo.ObjectId(tokenId),
        user: mongo.ObjectId(userId)
    }, function(err, result) {
        if (err) {
            deferred.reject(err);
            return;
        }

        deferred.resolve();
    });

    return deferred.promise;
}