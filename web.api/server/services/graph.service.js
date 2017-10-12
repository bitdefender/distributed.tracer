var Q = require('q');
var mongo = require('mongoskin');

var common = require('distributed-common');
common.Init();

const stateManager = require("state.manager");

var db = mongo.db(common.mongo.GetUrl(), { native_parser: true });

var service = {};

service.getAll = getAll;

module.exports = service;

function getAll(_id) {
    var st = new stateManager.StateQuery(_id);
    
    return st.Get();
}