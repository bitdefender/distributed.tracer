Distributed Tracer
==================

Distributed version of RIVER. DRIVER can trace multiple testcases at a
time and log the resulting traces.

How to use it
-------------

        ./run.sh [binary-id] [runs] [cores] [benchmark-runs] [(no)rebuild] [(no)regenerate-corpus]
                 
                 binary-id = unique identification string of the benchmark binary
                 runs = number of testcases that will be traced by river
                 cores = number of tracer processes that run in parallel
                 benchmark-runs = number of repetitions for current benchmark (needed to compute confidence intervals)
                 (no)rebuild = if "rebuild", node-river build is updated
                 (no)regenerate-corpus = if "regenerate-corpus" is specified, the corpus directory is deleted or the db collection is dropped and all testcases are regenerated. "noregenerate-corpus" is useful to reduce the randomness level of benchmarking results
