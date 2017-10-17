# tracer.node
Execution tracer written in Node.js based on original River tracer [1].

[1] https://github.com/teodor-stoenescu/simpletracer

# Quick start
tracer.node reads raw inputs from newtests queue, generates traces and pushes them to tracedtests queue.  
Usage: `node index.js -c <config-path> <binary-id>`
  
    -c              # Cardinal config path
    <config-path>
    
    <binary-id>     # binary-id associated with new tests
 
