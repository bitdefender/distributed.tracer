#!/usr/bin/env bash

[ $# -lt 6 ] && { echo "Usage: $0 [binary-id] [runs] [cores] [benchmark-runs] [(no)rebuild] [(no)regenerate-corpus] [genetic]"; exit 1; }
read binary_id runs cores benchmark_runs rebuild regenerate_corpus genetic<<<$@

RUNS=$runs
DRIVER_DIR=$(pwd)
GRIVER=$DRIVER_DIR/river.genetic
TRACER_NODE=$DRIVER_DIR/tracer.node
PROCESS_MANAGER=$DRIVER_DIR/process.manager
NODE_RIVER=$TRACER_NODE/deps/node-river

CONFIG_PATH=$(readlink -f config.json)

DB_NAME="tests_$binary_id"

ID_LOGS_DIR=$(pwd)/$binary_id
LOGS_DIR=$ID_LOGS_DIR/logs
RESULTS_DIR=$ID_LOGS_DIR/results

STATS_FILE=$LOGS_DIR/stats-$cores.csv
FUZZER_STATS_FILE=$LOGS_DIR/fuzzer-stats-$cores.csv
GRIVER_STATS=$LOGS_DIR/river-genetic-fuzzer-$cores.csv
BASELINE=$LOGS_DIR/baseline-$cores.csv
LOG_FILE=$LOGS_DIR/run-$cores.log
FUZZER_LOG_FILE=$LOGS_DIR/fuzzer-$cores.log
DEFUZZER_LOG_FILE=$LOGS_DIR/defuzzer-$cores.log
GRIVER_LOG_FILE=$LOGS_DIR/river-genetic-$cores.log

MONGO_URL="mongodb://worker:workwork@10.18.0.32:27017/test?authSource=admin"

NO_TESTCASES=0
FUZZER_PID=0

start_tracer() {
  # start the desired number of node river running processes
  echo -e "\033[0;32m[DRIVER] Starting $cores processes of node RIVER ..."; echo -e "\033[0m"
  #cd $TRACER_NODE
  #export LD_LIBRARY_PATH=$NODE_RIVER/lib
  #for i in $(seq $cores) ; do
  #  ( node index.js -c $CONFIG_PATH $binary_id > $LOG_FILE 2>&1 & )
  #done
  cd $PROCESS_MANAGER
  node ./pmcli.js start $binary_id $cores

  fuzzer_path=$(pwd)/$binary_id/fuzzer
}

stop_tracer() {
  echo -e "\033[0;32m[DRIVER] Stopping processes of node RIVER ..."; echo -e "\033[0m"
  cd $PROCESS_MANAGER

  node ./pmcli.js stop $binary_id
}

cleanup() {
  # clean the DRIVER build and stop node
  echo -e "\033[0;32m[DRIVER] Cleaning DRIVER environment ..."; echo -e "\033[0m"
  stop_tracer
  killall -9 fuzzer
  if [ "$genetic" == "genetic" ]; then
    killall -9 python3
  fi

  if [ "$rebuild" == "rebuild" ]; then
    cd $TRACER_NODE && rm -rf build && npm install
    cd $TRACER_NODE && rm -rf node_modules/node-river/ && npm install
  fi

  services="mongod.service rabbitmq-server.service mongo.rabbit.bridge.service"

  for s in $services; do
    active=$(sudo systemctl status $s | grep "active (running)");
    if [ "$active" == "" ]; then
      sudo systemctl restart $s;
    fi
  done

  # drop $DB_NAME mongo db
  mongo $MONGO_URL --eval "db.$DB_NAME.drop()"

  # purge rabbit queues
  sudo rabbitmqctl purge_queue driver.newtests.$binary_id
  sudo rabbitmqctl purge_queue driver.tracedtests.$binary_id

  # remove results dumped to disk
  if [ -d $RESULTS_DIR ]; then
    rm -rf $RESULTS_DIR
  fi
}

sigint_handler()
{
  echo -e "\033[0;32m[DRIVER] Received SIGINT. Cleaning DRIVER environment ..."; echo -e "\033[0m"

  sudo systemctl stop mongo.rabbit.bridge
  stop_tracer
  killall -9 fuzzer
  killall -9 python3

  exit 1
}

generate_testcases() {
  # generate testcases
  echo -e "\033[0;32m[DRIVER] Generating testcases using $fuzzer_path ..."; echo -e "\033[0m"

  while true; do
    if [ ! -f $fuzzer_path ]; then
      sleep 1
      continue
    fi
    busy=$(lsof $fuzzer_path 2> /dev/null )
    if [ "$busy" == "" ]; then
      break
    fi
    sleep 1
  done

  export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib
  rm -f $FUZZER_LOG_FILE
  if [ ! -d "$RESULTS_DIR/results" ]; then
    mkdir -p "$RESULTS_DIR/results"
  fi
  $fuzzer_path "$RESULTS_DIR/results" -close_fd_mask=3 \
     -dump_to_db=1 -config=$CONFIG_PATH -max_total_time=1800 -max_len=1024 \
    -binary_id=$binary_id -print_final_stats=1 >> $FUZZER_LOG_FILE 2>&1 &
  FUZZER_PID=$!

  echo -e "\033[0;32m[DRIVER] Started fuzzer to generate interesting testcases for genetic river ..."; echo -e "\033[0m"
}

griver_environment() {
  ## genetic alg setup
  ## TODO get rid of this stuff
  export SPARK_HOME=/data/spark/spark-2.0.1-bin-hadoop2.7
  export PYSPARK_PYTHON=python3
  export PYSPARK_DRIVER_PYTHON=python3
  export PYTHONPATH=$SPARK_HOME/python:$SPARK_HOME/python/lib/py4j-0.10.3-src.zip
  export JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk-amd64
  export SPARK_WORKER_DIR=/data/spark_worker_dir
  export SPARK_EXECUTOR_INSTANCES=2
  export SCALA_HOME=/usr/share/scala/lib
  export SPARK_LOCAL_IP=10.18.0.32

  export PYTHONUNBUFFERED=1
  export SIMPLETRACERLOGSPATH=$RESULTS_DIR
  #export LD_LIBRARY_PATH=/data/simpletracer/build-river-tools/lib
  #export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/data/simpletracer/river.sdk/lin/lib
  #export SIMPLETRACERPATH=/data/simpletracer/build-river-tools/bin/simple_tracer
}

start_griver() {
  echo -e "\033[0;32m[DRIVER] Starting river genetic for $binary_id executable..."; echo -e "\033[0m"
  cd $GRIVER
  griver_environment
  ( python3 ./genetic_code/main.py --testsFolderCount 10 --numTasks 1 \
      --isParallelExecution 0 --populationSize 10 --numberOfIterations 10 \
      --config $CONFIG_PATH --driver 1  --isDebugEnabled 1 \
      --executableId $binary_id > $GRIVER_LOG_FILE 2>&1 &)
}

wait_for_termination() {
  while true; do
    left=$( mongo $MONGO_URL --eval "db.$DB_NAME.find({state : \"traced\"}).count()" 2> /dev/null | tail -n1; \
      exitcode=${PIPESTATUS[0]}; if test $exitcode -ne 0; then echo -n -1; fi )
    if [ $left -lt 0 ]; then
      echo -e "\033[0;32m[DRIVER] Mongo could not connect. Exiting...."; echo -e "\033[0m"
      sleep 120
      break
    fi
    if ! kill -0 $FUZZER_PID > /dev/null 2>&1 ; then
      echo -e "\033[0;32m[DRIVER] Source fuzzer exited. Exiting...."; echo -e "\033[0m"
      break
    fi
    sleep 3 #todo fix this
    echo "Tracing progress: found [$left] testcases traced."
  done
}

print_statistics() {
  sleep 10
  fst=$(mongo $MONGO_URL --eval "db.$DB_NAME.find({}, {tracedTs:1, _id:0}).sort({tracedTs: 1}).limit(1)" | tail -n 1 | grep --only-matching --perl-regex "(?<=\"tracedTs\" : )[^ ]*")
  lst=$(mongo $MONGO_URL --eval "db.$DB_NAME.find({}, {tracedTs:1, _id:0}).sort({tracedTs: -1}).limit(1)" | tail -n 1 | grep --only-matching --perl-regex "(?<=\"tracedTs\" : )[^ ]*")
  printf "%30s\t%12s\t%8s\t%20s\n" "$binary_id" "$NO_TESTCASES" "$cores" "$((lst - fst))" >> $STATS_FILE

  ## Get fuzzer stats
  execs="$(grep 'stat::number_of_executed_units:' $FUZZER_LOG_FILE | grep -o '[0-9]*' | sort -n | tail -n1)"
  execs_per_sec="$(grep 'stat::average_exec_per_sec:' $FUZZER_LOG_FILE | grep -o '[0-9]*' | sort -n | tail -n1)"
  units="$(grep 'stat::new_units_added:' $FUZZER_LOG_FILE | grep -o '[0-9]*' | sort -n | tail -n1)"

  printf "%30s\t%12s\t%8s\t%8s\t%8s\t%8s\n" "$binary_id" "$NO_TESTCASES" "$cores" "$execs" "$execs_per_sec" "$units" >> $FUZZER_STATS_FILE

}

evaluate_new_corpus() {
  ## Driver is a system that uses testcases in order to generate new ones.
  ## First set of testcases is generated by a raw fuzzer.
  ## These testcases are traced by river and all traces go in mongo.
  ## A special component will retrieve all traced testcases from mongo
  ##  and will generate new testcases based on the distribution of
  ##  cold spots and hot spots in traced testcases.
  ##
  ## This function evaluates the new corpus generated in $RESULTS_DIR
  ## The result is a set of (testcaseId, coverage) dumped in csv

  ## run all testcases and do not add anything new
  $fuzzer_path $RESULTS_DIR/results -close_fd_mask=3 -runs=$RUNS -max_len=1024 \
    -print_final_stats=1 >> $DEFUZZER_LOG_FILE 2>&1

  ### 131072pulse  cov: 53 ft: 83 corp: 51/1011b exec/s: 65536 rss:  40Mb
  pulsecov="$(grep -o '#[0-9]*[^p]*[pulse\|NEW] *cov: [0-9]*' $DEFUZZER_LOG_FILE | grep -P  '(\d+)' -o)"
  ### pulsecov is like (id\ncov\nid\ncov ...)
  printf "%20s\t%8s\n" $pulsecov >> $GRIVER_STATS

  pc="$(grep -o '#[0-9]*[^p]*[pulse\|NEW] *cov: [0-9]*' $FUZZER_LOG_FILE | grep -P  '(\d+)' -o)"
  ### pulsecov is like (id\ncov\nid\ncov ...)
  printf "%20s\t%8s\n" $pc >> $BASELINE
}

main() {

  [ ! -d $CORPUS_TESTER ] && { echo "Wrong $0 script call. Please chdir to distributed.tracer"; exit 1; }

  if [ ! -d $LOGS_DIR ]; then
    mkdir -p $LOGS_DIR
  fi

  if [ -f $STATS_FILE ]; then
    rm -f $STATS_FILE
  fi

  if [ -f $LOG_FILE ]; then
    rm -f $LOG_FILE
  fi

  echo
  echo "River running $benchmark_runs benchmarks on http-parser"
  echo "======================================================="
  printf "%30s\t%12s\t%8s\t%20s\n" "name" "testcases" "cores" "time_in_ms" >> $STATS_FILE
  printf "%30s\t%12s\t%8s\t%8s\t%8s\t%8s\n" "name" "testcases" "cores" "execs" "execs_per_sec" "units" >> $FUZZER_STATS_FILE
  printf "%20s\t%8s\n" "testcaseid" "cov" >> $GRIVER_STATS
  printf "%20s\t%8s\n" "testcaseid" "cov" >> $BASELINE

  for i in $(seq $benchmark_runs); do
    cleanup
    start_tracer
    if [ "$genetic" == "genetic" ]; then
      start_griver
    fi
    generate_testcases
    wait_for_termination
    print_statistics
    evaluate_new_corpus

    ## cleanup
    stop_tracer
    killall -9 python3
    sudo systemctl stop mongo.rabbit.bridge

  done
}

trap sigint_handler SIGINT
main
