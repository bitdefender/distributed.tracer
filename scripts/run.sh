#!/usr/bin/env bash

[ $# -ne 6 ] && { echo "Usage: $0 [binary-id] [runs] [cores] [benchmark-runs] [(no)rebuild] [genetic]"; exit 1; }
read binary_id runs cores benchmark_runs rebuild  genetic<<<$@

DRIVER_DIR=$(pwd)
TRACER_NODE=$DRIVER_DIR/tracer.node
PROCESS_MANAGER=$DRIVER_DIR/process.manager
NODE_RIVER=$TRACER_NODE/deps/node-river
STATE_AGG=$DRIVER_DIR/state.aggregator
STATE_MANAGER=$DRIVER_DIR/state.manager
FUZZER_PATH=$TRACER_NODE/$binary_id/fuzzer
CORPUS_PATH=$TRACER_NODE/$binary_id/corpus
CORPUS_DIR=$TRACER_NODE/$binary_id/corpus-dir

CONFIG_PATH=$(readlink -f config.json)

DB_NAME="tests_$binary_id"
GRIDFS_NAME="trace_$binary_id"

ID_LOGS_DIR=$(pwd)/$binary_id
LOGS_DIR=$ID_LOGS_DIR/logs
RESULTS_DIR=$ID_LOGS_DIR/results

MONGO_URL="mongodb://worker:workwork@10.18.0.32:27017/test?authSource=admin"

NO_TESTCASES=0

start_tracer() {
  # start the desired number of node river running processes
  echo -e "\033[0;32m[DRIVER] Starting $cores processes of node RIVER ..."; echo -e "\033[0m"
  cd $PROCESS_MANAGER
  node ./pmcli.js start tracer.node $binary_id $cores
  cd -

  # wait until data is downloaded
  while [ ! -f $CORPUS_PATH ]; do
    sleep 1
  done

  # unpack corpus
  echo -e "\033[0;32m[DRIVER] Unpacking corpus ..."; echo -e "\033[0m"
  if [ ! -d $CORPUS_DIR ]; then
    unzip $CORPUS_PATH -d $CORPUS_DIR
  fi
}

start_state_aggregator() {
  cd $PROCESS_MANAGER
  node ./pmcli.js start state.aggregator $binary_id 1
  cd -
}

stop_state_aggregator() {
  cd $PROCESS_MANAGER
  node ./pmcli.js stop state.aggregator $binary_id
  cd -
}

stop_tracer() {
  echo -e "\033[0;32m[DRIVER] Stopping processes of node RIVER ..."; echo -e "\033[0m"
  cd $PROCESS_MANAGER

  node ./pmcli.js stop tracer.node $binary_id
  cd -
}

stop_fuzzers() {
  echo -e "\033[0;32m[DRIVER] Stopping fuzzers ..."; echo -e "\033[0m"
  cd $PROCESS_MANAGER
  node ./pmcli.js stop basic.fuzzer $binary_id
  node ./pmcli.js stop eval.fuzzer $binary_id
  cd -
}

stop_griver() {
  echo -e "\033[0;32m[DRIVER] Stopping genetic river ..."; echo -e "\033[0m"
  cd $PROCESS_MANAGER
  node ./pmcli.js stop griver $binary_id
  cd -
}

cleanup() {
  # clean the DRIVER build and stop node
  echo -e "\033[0;32m[DRIVER] Cleaning DRIVER environment ..."; echo -e "\033[0m"
  stop_tracer
  stop_fuzzers
  if [ "$genetic" == "genetic" ]; then
    stop_griver
  fi

  if [ "$rebuild" == "rebuild" ]; then
    cd $TRACER_NODE && rm -rf build && npm install
    cd $TRACER_NODE && rm -rf node_modules/node-river/ && npm install
  fi

  services="mongod.service rabbitmq-server.service"

  for s in $services; do
    active=$(systemctl status $s | grep "active (running)");
    if [ "$active" == "" ]; then
      echo -e "\033[0;31m[DRIVER] Service: $s is not running. Restart and rerun script!"; echo -e "\033[0m"
      exit 1
    fi
  done

  # drop $DB_NAME mongo db
  #mongo $MONGO_URL --eval "db.$DB_NAME.drop()"
  #mongo $MONGO_URL --eval "db.$GRIDFS_NAME.files.drop()"
  #mongo $MONGO_URL --eval "db.$GRIDFS_NAME.chunks.drop()"
  cd $STATE_MANAGER
  node statecli.js -c ../config.json $binary_id purge
  cd -

  # purge rabbit queues
  rabbitmqadmin purge queue name=driver.newtests.$binary_id
  rabbitmqadmin purge queue name=driver.tracedtests.$binary_id

  # remove results dumped to disk
  if [ -d $RESULTS_DIR ]; then
    rm -rf $RESULTS_DIR
  fi

  if [ ! -d $LOGS_DIR ]; then
    mkdir -p $LOGS_DIR
  fi
}

sigint_handler()
{
  echo -e "\033[0;32m[DRIVER] Received SIGINT. Cleaning DRIVER environment ..."; echo -e "\033[0m"
  evaluate_new_corpus

  stop_tracer
  stop_fuzzers
  stop_griver

  exit 1
}

generate_testcases() {
  # generate testcases
  echo -e "\033[0;32m[DRIVER] Generating testcases using $FUZZER_PATH ..."; echo -e "\033[0m"

  while true; do
    if [ ! -f $FUZZER_PATH ]; then
      sleep 1
      continue
    fi
    busy=$(lsof $FUZZER_PATH 2> /dev/null )
    if [ "$busy" == "" ]; then
      break
    fi
    sleep 1
  done

  export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib
  if [ ! -d "$RESULTS_DIR/results" ]; then
    mkdir -p "$RESULTS_DIR/results"
    ## init results with initial corpus
    cp -r $CORPUS_DIR/* $RESULTS_DIR/
  fi

  cd $PROCESS_MANAGER
  node ./pmcli.js start basic.fuzzer $binary_id 4 -runs=$runs
  cd -

  echo -e "\033[0;32m[DRIVER] Started fuzzer to generate interesting testcases for genetic river ..."; echo -e "\033[0m"
}

start_griver() {
  echo -e "\033[0;32m[DRIVER] Starting river genetic for $binary_id executable..."; echo -e "\033[0m"
  cd $PROCESS_MANAGER
  node ./pmcli.js start griver $binary_id 1
  cd -
}

wait_for_termination() {
  while true; do
    left=$( mongo $MONGO_URL --eval "db.$DB_NAME.find({state : \"traced\"}).count()" 2> /dev/null | tail -n1; \
      exitcode=${PIPESTATUS[0]}; if test $exitcode -ne 0; then echo -n -1; fi )
    if [ $left -lt 0 ]; then
      echo -e "\033[0;31m[DRIVER] Mongo could not connect. Exiting...."; echo -e "\033[0m"
      sleep 120
      break
    fi
    cd $PROCESS_MANAGER
    fuzzers_running=$(node ./pmcli.js status basic.fuzzer | grep "basic.fuzzer:" | awk '{print $2}')
    cd -
    if [ $fuzzers_running == 0 ]; then
      echo -e "\033[0;31m[DRIVER] Source fuzzer exited. Exiting...."; echo -e "\033[0m"
      break
    fi
    sleep 10 #todo fix this
    echo "pulse: Tracing progress: found [$left] testcases traced."
  done
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

  cd $PROCESS_MANAGER
  node ./pmcli.js start eval.fuzzer $binary_id 1 -runs=$runs
  cd -

  cd $PROCESS_MANAGER
  while true; do
    fuzzers_running=$(node ./pmcli.js status eval.fuzzer | grep "eval.fuzzer:" | awk '{print $2}')
    if [ $fuzzers_running == 0 ]; then
      break
    fi
    sleep 5
  done
  cd -
}

main() {

  [ ! -d $CORPUS_TESTER ] && { echo "Wrong $0 script call. Please chdir to distributed.tracer"; exit 1; }

  echo
  echo "River running $benchmark_runs benchmarks on http-parser"
  echo "======================================================="

  for i in $(seq $benchmark_runs); do
    cleanup
    start_state_aggregator
    start_tracer
    if [ "$genetic" == "genetic" ]; then
      start_griver
    fi
    generate_testcases
    wait_for_termination
    evaluate_new_corpus

    ## cleanup
    stop_fuzzers
    stop_tracer
    stop_state_aggregator
    stop_griver
    mv $ID_LOGS_DIR ${ID_LOGS_DIR}_${runs}_${i}

  done
}

trap sigint_handler SIGINT
main
