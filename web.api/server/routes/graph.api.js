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
                    var label = nodes[n].value.address.module + ":" + nodes[n].value.address.offset.toString(16);
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
                            digraph.setEdge(
                                nodes[n]._id,
                                e,
                                {
                                    "label" : nodes[n].value.global.next[e],
                                    "penwidth" : 1 + 9 * nodes[n].value.global.next[e] / maxEdge
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