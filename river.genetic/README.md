# River Log File Analysis
TODO description.

Example of a <i>logfile</i> can be found in the latest release.

## Requirements
Please use <i>virtualenv</i>.
Install <i>virtualenv</i> like this.
```bash
$ pip3 install virtualenv
```
Create a virtualenv directory.
```bash
$ python3 -m virtualenv venv
```
Activate the configured <i>venv</i>.
```bash
$ source venv/bin/activate
```
Install requirements from <i>requirements.txt</i>.
```bash
$ pip3 install -r requirements.txt
```
To deactivate the virtualenv, use
```bash
$ deactivate
```
In order to run the `analyzer_with_spark.py`, you'll have to install Spark.

Download Spark v2.0.1 from <a href="http://spark.apache.org/downloads.html"> here</a>.

    $ tar -xf <name_of_spark_archive>.tar

Follow instructions from spark-2.0.1/README.md to build and install.

Environment variables in your `~/.bash_profile` for OS X or `~/.bashrc` for Linux.

    export PYSPARK_PYTHON=python3
    export SPARK_HOME=~/path/to/spark-2.0.1
    export PYTHONPATH=$SPARK_HOME/python/:$PYTHONPATH
    export PYTHONPATH=$SPARK_HOME/python:$SPARK_HOME/pyhon/lib/py4j-0.9-src.zip:$PYTHONPATH

Verify it was successfully installed by running

    $ ./bin/pyspark

from spark-2.0.1/

Copy `spark-env.sh`, `spark-defaults.conf` and `slaves` files
from `spark_utils/` to `path/to/spark/conf/`.

- <i>spark-env.sh</i>
       - settings regarding the master node, like number of workers if manages, etc.
         Note: Edit the SCALA_HOME, SPARK_WORKER_DIR environment variables
         to your local needs.
- <i>spark-defaults.conf</i>
       - settings regarding the workers.
          Any values specified as flags or in the properties file will be
          passed on to the 	application and merged with those specified
          through SparkConf invocation in the code.
          Properties set directly on the SparkConf creation, in code, take highest precedence,
          then flags passed to spark-submit or spark-shell,
          then options in the spark-defaults.conf file.
- <i>slaves</i>
       - addresses of the workers.

## Quick start
TODO log files download script.

To download <b>sample log files</b> that will be used, run the following script

    $ python3 download_log_files.py

At this moment, it requires to manually add the log.txt file.
By running the script, it will only create the logs/ directory.

## Run
Run the analyzer script to analyze the logs from logs/log.txt.

    $ python3 analyzer.py

In order to run `analyzer_with_spark.py`, do the following.

### 1. Starting the Spark Master and Workers.
From path/to/spark type

    $ sbin/start-master.sh
    $ sbin/start-slaves.sh

or

    $ sbin/start-all.sh

Similar, to stop the Master and Workers.

    $ sbin/stop-master.sh
    $ sbin/stop-slaves.sh

or

    $ sbin/stop-all.sh


See Spark stats via UI at

[http://localhost:8080](http://localhost:8080)

[http://localhost:4040](http://localhost:4040)

### 2. Sending the Python source file to Spark and run them

    $ sh path/to/spark/bin/spark-submit \
               --master spark://<server_name/server_ip>:7077 \
               --num-executors 2 \
               --total-executor-cores 2 \
               --executor-memory 2g \
               analyzer_with_spark.py -folderPath logs > stdout 2> stderr

where <i>server_name</i> is <i>yosemite/ubuntu/localhost</i> if it's running locally.

Logs can be seen in the above provided files.

    $ tail -f stdout
    $ tail -f stderr
    
### 3. BInary logs
    Use option --binaryInput if your input files are binary files

### 4. Genetic algorithm parameters

 4.1 Environment variables (sample from my machine):
 
        PYSPARK_PYTHON	python3
        PYTHONPATH	/home/paduraru/spark/python
        PYTHONUNBUFFERED	1
        SPARK_HOME	/home/paduraru/spark
        SIMPLETRACERLOGSPATH	/home/paduraru/RiverAnalysis/river-log-file-analysis/genetic_code/logs
        LD_LIBRARY_PATH	/home/paduraru/symexec/simpletracer/river.sdk/lin/lib
        PYSPARK_DRIVER_PYTHON	python3
        SIMPLETRACERPATH	/home/paduraru/symexec/simpletracer/build-river-tools/bin/simple_tracer
 
 4.2 Example of input (many other parameters in /genetic_code/utils.py):
        
        main.py
        --testsFolderCount      # how many test folder generations you want 
        10
        --numTasks              # number of tasks - usually should be F * number of spark instances you submit
        10
        --testProgramName       # name of the program to test
        "libhttp-parser.so"
        --isParallelExecution   # parallel or serial
        1
        --inputLength           # payload input length
        20  
        --populationSize        # population size per task
        10
        --numberOfIterations    // number of population that runs in a single task trying to improve the population
        100
        
   To run the program in parallel, use --isParallelExecution 1 and do the same setup for invoking Spark as in 2.
    
 4.3 TODO list:
 
     A) Create a CPP module for the genetic algorithm and use it from python because it's very slow (2-4 times slower than in CPP)
     
     B) Compute map of probabilities in parallel (currently folders are scanned serially), currently is better to use many numberOFIterations for parallelism efficiency.

## Features
- [x] Determine cold spots and hot spots from log entries.
- [x] Histogram of hot spots.
- [x] Process log files distributed with Spark.
- [ ] Additional optimizations in log file analysis using the cost measure and maybe other ones.
- [ ] Distribute input with Spark.

## Contributing
Please use new branches when contributing with a particular feature.

## Credits
TODO

## License
TODO
