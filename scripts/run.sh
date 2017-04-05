#!/usr/bin/env bash

[ $# -lt 6 ] && { echo "Usage: $0 [binary-id] [runs] [cores] [benchmark-runs] [(no)rebuild] [(no)regenerate-corpus]"; exit 1; }
read binary_id runs cores benchmark_runs rebuild regenerate_corpus <<<$@

RUNS=$runs
DRIVER_DIR=$(pwd)
TRACER_NODE=$DRIVER_DIR/tracer.node
NODE_RIVER=$TRACER_NODE/deps/node-river

CONFIG_PATH=$(readlink -f config.json)

DB_NAME="tests_$binary_id"
LOGS_DIR=$(pwd)/logs/$binary_id
STATS_FILE=$LOGS_DIR/stats-$cores.csv
FUZZER_STATS_FILE=$LOGS_DIR/fuzzer-stats-$cores.csv
LOG_FILE=$LOGS_DIR/run-$cores.log
FUZZER_LOG_FILE=$LOGS_DIR/fuzzer-$cores.log
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
  sudo rabbitmqctl purge_queue driver.newtests.$binary_id
}

generate_testcases() {
  # generate testcases
  echo -e "\033[0;32m[DRIVER] Generating testcases using $fuzzer_path ..."; echo -e "\033[0m"

  while true; do
    if [ ! -f $fuzzer_path ]; then
      sleep 1
      continue
    fi
    busy=$(lsof $fuzzer_path)
    if [ "$busy" == "" ]; then
      break
    fi
    sleep 1
  done

  export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib
  rm -f $FUZZER_LOG_FILE
  $fuzzer_path -close_fd_mask=3 -runs=$RUNS -initial_corpus_db=1 \
    -dump_all_testcases=1  -dump_to_db=1 -config=$CONFIG_PATH \
    -binary_id=$binary_id -print_final_stats=1 >> $FUZZER_LOG_FILE 2>&1

  # $DB_NAME contains $RUNS testcases that will be traced by DRIVER
  NO_TESTCASES=$(mongo --eval "db.$DB_NAME.count()" | tail -n1)
  echo -e "\033[0;32m[DRIVER] Generated $NO_TESTCASES testcases in $DB_NAME ..."; echo -e "\033[0m"
}

start_tracer() {
  # start the desired number of node river running processes
  echo -e "\033[0;32m[DRIVER] Starting $cores processes of node RIVER ..."; echo -e "\033[0m"
  cd $TRACER_NODE
  export LD_LIBRARY_PATH=$NODE_RIVER/lib
  for i in $(seq $cores) ; do
    ( node index.js -c $CONFIG_PATH $binary_id > $LOG_FILE 2>&1 & )
  done

  fuzzer_path=$(pwd)/$binary_id/fuzzer
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
  fst=$(mongo --eval "db.$DB_NAME.find({}, {tracedTs:1, _id:0}).sort({tracedTs: 1}).limit(1)" | tail -n 1 | grep --only-matching --perl-regex "(?<=\"tracedTs\" : )[^ ]*")
  lst=$(mongo --eval "db.$DB_NAME.find({}, {tracedTs:1, _id:0}).sort({tracedTs: -1}).limit(1)" | tail -n 1 | grep --only-matching --perl-regex "(?<=\"tracedTs\" : )[^ ]*")
  printf "%30s\t%12s\t%8s\t%20s\n" "$binary_id" "$NO_TESTCASES" "$cores" "$((lst - fst))" >> $STATS_FILE

  ## Get fuzzer stats
  execs="$(grep 'stat::number_of_executed_units:' $FUZZER_LOG_FILE | grep -o '[0-9]*' | sort -n | tail -n1)"
  execs_per_sec="$(grep 'stat::average_exec_per_sec:' $FUZZER_LOG_FILE | grep -o '[0-9]*' | sort -n | tail -n1)"
  units="$(grep 'stat::new_units_added:' $FUZZER_LOG_FILE | grep -o '[0-9]*' | sort -n | tail -n1)"

  printf "%30s\t%12s\t%8s\t%8s\t%8s\t%8s\n" "$binary_id" "$NO_TESTCASES" "$cores" "$execs" "$execs_per_sec" "$units" >> $FUZZER_STATS_FILE

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

  for i in $(seq $benchmark_runs); do
    cleanup
    start_tracer
    generate_testcases
    wait_for_termination
    print_statistics
  done
}

main
