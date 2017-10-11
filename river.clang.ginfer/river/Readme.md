
river.clang.ginfer

Project description:

Static analysis tool implemented using clang tooling.
Project compiling phase generates an initial corpus by analyzing string
manipulation function calls.
Specific function calls can be configured in this tool at the cost of rebuild.

Project workflow:
river.clang.ginfer is a set of bash scripts that compile cardinal
benchmark software in static libraries.
First tool ran by distributed.tracer is the specific river.clang.ginfer
bash script that compiles the static library and generates
$project.initial.corpus.
$project.initial.corpus is further used as initial corpus for libfuzzer
component of cardinal.
