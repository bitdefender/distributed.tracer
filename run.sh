#!/usr/bin/env bash

[ $# -lt 7 ] && { echo "Usage: $0 [binary-id] [runs] [cores] [river-libfuzzer-path] [benchmark-runs] [(no)rebuild] [(no)regenerate-corpus]"; exit 1; }
read binary_id runs cores rlf_path benchmark_runs rebuild regenerate_corpus <<<$@

RUNS=$runs
DRIVER_DIR=$(pwd)
CORPUS_TESTER=$DRIVER_DIR/corpus.tester
TEST_BATCHER=$DRIVER_DIR/test.batcher
TRACER_NODE=$DRIVER_DIR/tracer.node
NODE_RIVER=$TRACER_NODE/deps/node-river

CONFIG_PATH=$(readlink -f config.json)

DB_NAME="tests_$binary_id"
LOGS_DIR=$(pwd)/logs
STATS_FILE=$LOGS_DIR/stats-$binary_id-$cores.csv
LOG_FILE=$LOGS_DIR/run-$binary_id-$cores.log
NO_TESTCASES=0

cleanup() {
  # clean the DRIVER build and stop node
  echo -e "\033[0;32m[DRIVER] Cleaning DRIVER environment ..."; echo -e "\033[0m"
  killall -9 node

  if [ "$rebuild" == "rebuild" ]; then
    cd $TRACER_NODE && rm -rf build && npm install
    cd $TRACER_NODE && rm -rf node_modules/node-river/ && npm install
  fi

  services="mongod.service rabbitmq-server.service mongo.rabbit.bridge.service"

  for s in $services; do
    active=$(sudo systemctl status $s | grep "active (running)");
    if [ "$active" == "" ]; then
      sudo systemctl restart mongo.rabbit.bridge.service;
    fi
  done

  # drop $DB_NAME mongo db
  mongo --eval "db.$DB_NAME.drop()"

  # purge rabbit queues
  sudo rabbitmqctl purge_queue batchedtests
  sudo rabbitmqctl purge_queue newtests
}

generate_testcases() {
  RLIB_FUZZER=$rlf_path
  cd $RLIB_FUZZER
  BUILD_DIR=$(pwd)/../build

  # generate testcases
  echo -e "\033[0;32m[DRIVER] Generating testcases using river-libfuzzer ..."; echo -e "\033[0m"
  if [ "$regenerate_corpus" == "regenerate-corpus" ]; then
    rm -rf $BUILD_DIR/target-pcs-build
    ./river-scripts/build-all.sh
  fi

  cd $BUILD_DIR
  cd target-pcs-build
  ./fuzzer -runs=$RUNS -dump_all_testcases=1  -dump_to_db=1 -config=$CONFIG_PATH -binary_id=$binary_id

  # $DB_NAME contains $RUNS testcases that will be traced by DRIVER
  NO_TESTCASES=$(mongo --eval "db.$DB_NAME.count()" | tail -n1)
  echo -e "\033[0;32m[DRIVER] Generated $NO_TESTCASES testcases in $DB_NAME ..."; echo -e "\033[0m"
}

start_test_batcher() {
  # now let's batch the testcases
  echo -e "\033[0;32m[DRIVER] Starting test batcher ..."; echo -e "\033[0m"
  cd $TEST_BATCHER
  for i in $(seq 1); do
    ( node index.js -c $CONFIG_PATH $binary_id > $LOG_FILE 2>&1 & )
  done
}

start_tracer() {
  # start the desired number of node river running processes
  echo -e "\033[0;32m[DRIVER] Starting $cores processes of node RIVER ..."; echo -e "\033[0m"
  cd $TRACER_NODE
  export LD_LIBRARY_PATH=$NODE_RIVER/lib
  for i in $(seq $cores) ; do
    ( node index.js -c $CONFIG_PATH $binary_id > $LOG_FILE 2>&1 & )
  done
}

wait_for_termination() {
  while true; do
    left=$(mongo --eval "db.$DB_NAME.find({state : \"traced\"}).count()" | tail -n1)
    sleep 3 #todo fix this
    echo "Tracing progress: $left out of $NO_TESTCASES testcases traced"
    if [ "$left" == "$NO_TESTCASES" ]; then
      break;
    fi
  done
}

print_statistics() {
  fst=$(mongo --eval "db.$DB_NAME.find({}, {tracedTS:1, _id:0}).sort({tracedTS: 1}).limit(1)" | tail -n 1 | grep --only-matching --perl-regex "(?<=\"tracedTS\" : )[^ ]*")
  lst=$(mongo --eval "db.$DB_NAME.find({}, {tracedTS:1, _id:0}).sort({tracedTS: -1}).limit(1)" | tail -n 1 | grep --only-matching --perl-regex "(?<=\"tracedTS\" : )[^ ]*")
  printf "%30s\t%12s\t%8s\t%20s\n" "http-parser" "$NO_TESTCASES" "$cores" "$((lst - fst))" >> $STATS_FILE
}

main() {

  [ ! -d $CORPUS_TESTER ] && { echo "Wrong $0 script call. Please chdir to distributed.tracer"; exit 1; }

  if [ ! -d $LOGS_DIR ]; then
    mkdir $LOGS_DIR
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

  for i in $(seq $benchmark_runs); do
    cleanup
    generate_testcases
    start_test_batcher
    start_tracer
    wait_for_termination
    print_statistics
  done
}

main
