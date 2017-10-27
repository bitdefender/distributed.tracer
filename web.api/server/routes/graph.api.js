var express = require('express');
var router = express.Router();

const graph = require('graphlib');
const dot = require('graphlib-dot');
const chroma = require('chroma-js');
const Viz = require('viz.js');

var graphService = require('../services/graph.service');
 
// routes
router.get('/:_id', getGraph);

module.exports = router;

const  RIVER_INSTR_RET = 0x00
const  RIVER_INSTR_JMP = 0x01
const  RIVER_INSTR_JXX = 0x02
const  RIVER_INSTR_CALL = 0x03
const  RIVER_INSTR_SYSCALL = 0x04

const  RIVER_OPTYPE_NONE = 0x00
const  RIVER_OPTYPE_IMM = 0x04
const  RIVER_OPTYPE_REG = 0x08
const  RIVER_OPTYPE_MEM = 0x0C
const  RIVER_OPTYPE_ALL = 0x10


function getGraph(req, res) {
    graphService.getAll(req.params._id)
        .then(function (nodes) {
            var oType = req.query.type || "JSON";

            if (oType == "JSON") {
                res.setHeader('Content-Type', 'application/json');
                res.status(200).send(JSON.stringify(nodes), null, 4);
            } else if ((oType == "DOT") || (oType == "SVG")) {
                var digraph = new graph.Graph({ multigraph: true, outputorder: "edgesfirst" });
                var bgScale = chroma.scale(['#31708f', '#3c763d', '#8a6d3b', '#a94442']).mode('lab');
                var maxNode = 1, maxEdge = 1;

                for (var n in nodes) {
                    if (nodes[n].value.global.count > maxNode) {
                        maxNode = nodes[n].value.global.count;
                    }

                    for (var e in nodes[n].value.global.next) {
                        if (nodes[n].value.global.next[e] > maxEdge) {
                            maxEdge = nodes[n].value.global.next[e];
                        }
                    }
                }

                digraph.setNode(
                    "graph",
                    {
                        outputorder : "edgesfirst"
                    }
                );

                digraph.setNode(
                    "node",
                    {
                        shape : "box",
                        fontname : "courier",
                        fontcolor : "white"
                    }
                );

                digraph.setNode(
                    "edge",
                    {
                        fontname : "courier",
                        fontcolor : "black",
                        splines : "polyline"
                    }
                );

                digraph.setNode(
                    "<end>",
                    {
                        "label" : "<end>",
                        "style" : "filled",
                        "shape" : "ellipse",
                        "color" : bgScale(0).hex()
                    }
                );


                for (var n in nodes) {
                    var label = nodes[n].value.address.module + ":" +
                    nodes[n].value.address.offset.toString(16) +
                    " (" + nodes[n].value.address.nInstructions + ")";
                    if (nodes[n]._id == "<begin>") {
                        label = "<begin>";

                        digraph.setNode(
                            nodes[n]._id,
                            {
                                "label" : label,
                                "style" : "filled",
                                "shape" : "ellipse",
                                "color" : bgScale(
                                    nodes[n].value.global.count / maxNode
                                ).hex()
                            }
                        );
                    } else {
                        digraph.setNode(
                            nodes[n]._id,
                            {
                                "label" : label,
                                "style" : "filled",
                                "color" : bgScale(
                                    nodes[n].value.global.count / maxNode
                                ).hex()
                            }
                        );
                    }
                }

                for (var n in nodes) {
                    for (var e in nodes[n].value.global.next) {
                        if (digraph.hasNode(e)) {
                            var nextId = e;
                            var color = 0;

                            if (nodes[n].value.address.jumpType == RIVER_OPTYPE_REG ||
                                nodes[n].value.address.jumpInstruction == RIVER_OPTYPE_NONE) {
                                    color = 0;
                            } else if (nodes[n].value.address.taken !== null) {
                                if (nodes[n].value.address.jumpInstruction == RIVER_INSTR_JMP ||
                                    nodes[n].value.address.jumpInstruction == RIVER_INSTR_CALL) {
                                        color = "#0000FF";
                                } else if (nodes[n].value.address.jumpInstruction == RIVER_INSTR_JXX) {
                                    var takenId = nodes[n].value.address.taken._id;
                                    var notTakenId = nodes[n].value.address.nottaken._id;
                                    if (nextId == takenId) {
                                        color = "#008000";
                                    } else if (nextId == notTakenId) {
                                        color = "#FF0000";
                                    }
                                }
                            }

                            digraph.setEdge(
                                nodes[n]._id,
                                e,
                                {
                                    "label" : nodes[n].value.global.next[e],
                                    "penwidth" : 1 + 9 * nodes[n].value.global.next[e] / maxEdge,
                                    "style" : "filled",
                                    "color" : color
                                }
                            );
                        } else {
                            console.log("Unknown node " + e);
                        }
                    }
                }

                var dg = dot.write(digraph);
                if (oType == "DOT") {
                    res.status(200).send(dg);
                } else {
                    var result = Viz(dg);
                    res.setHeader('Content-Type', 'image/svg+xml');
                    res.status(200).send(result);
                }
            } else {
                let errObj = {
                    error: "Invalid output format"
                };
    
                res.setHeader('Content-Type', 'application/json');
                res.status(400).send(JSON.stringify(errObj), null, 4);    
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
