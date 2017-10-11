# Cardinal - Initial Corpus Generator
river.clang.ginfer uses static analysis on input C sources to generate testcases that exercise core parts of target program code.

# Quick Start
Use Cardinal script at:
  `scripts/setup-initial-corpus.sh` [1]

  1. The script downloads an exetended version of clang.ginfer sdk from orthrus [2].
  2. Cardinal webapi is queried at /api/executables for all target software configured inside Cardinal
  3. For each target, source is downloaded and each C source is compiled with  orthrus extended compiler based on LLVM

[1] https://github.com/teodor-stoenescu/distributed.tracer  
[2] https://github.com/test-pipeline/orthrus  
# Configuring a new benchmark

  1. Add target software in Cardinal
  2. Create a setup script in `./river` named `build-<sw-name>.sh`
  3. Create `init_target` function to download software code
  4. Create `build_target` function to compile each C source with orthrus
     compiler
  5. Use `-extra-arg` to expecify compiler specific arguments
  6. Use `-corpus-dir` to specify the results directory
