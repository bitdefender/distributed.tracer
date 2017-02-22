#!/usr/bin/env bash

[ $# -lt 3 ] && { echo "Usage: $0 [runs] [cores] [river-libfuzzer-path] <rebuild> <regenerate-corpus>"; exit 1; }
read runs cores rlf_path rebuild regenerate_corpus <<<$@

RUNS=$runs
DRIVER_DIR=$(pwd)
CORPUS_TESTER=$DRIVER_DIR/corpus.tester
TEST_BATCHER=$DRIVER_DIR/test.batcher
TRACER_NODE=$DRIVER_DIR/tracer.node
NODE_RIVER=$TRACER_NODE/deps/node-river

[ ! -d $CORPUS_TESTER ] && { echo "Wrong $0 script call. Please chdir to distributed.tracer"; exit 1; }

# clean the DRIVER build and stop node
echo -e "\033[0;32m[DRIVER] Cleaning DRIVER environment ..."; echo -e "\033[0m"
killall -9 node

if [ "$rebuild" == "rebuild" ]; then
  cd $TRACER_NODE && rm -rf build && npm install
  cd $TRACER_NODE && rm -rf node_modules/node-river/ && npm install
fi

# drop test mongo db
mongo test --eval "db.test.drop()"

# purge rabbit queues
sudo rabbitmqctl purge_queue batchedtests
sudo rabbitmqctl purge_queue newtests

RLIB_FUZZER=$rlf_path
cd $RLIB_FUZZER
BUILD_DIR=$(pwd)/../build

if [ "$regenerate_corpus" == "regenerate-corpus" ]; then
  # generate testcases
  echo -e "\033[0;32m[DRIVER] Generating testcases using river-libfuzzer ..."; echo -e "\033[0m"

  rm -rf $BUILD_DIR/target-pcs-build
  ./river-scripts/build-all.sh

  cd $BUILD_DIR
  cd target-pcs-build
  mkdir CORPUS && mkdir EXT
  ./fuzzer ./CORPUS -runs=$RUNS -dump_all_testcases=1 -extended_corpus=EXT
fi

# $CORPUS_DIR contains $RUNS testcases that will be traced by DRIVER
CORPUS_DIR=$(readlink -f $BUILD_DIR/target-pcs-build/EXT)
NO_TESTCASES=$(ls -1 $CORPUS_DIR | grep "^[a-fA-F0-9]*$" | wc -l)
echo -e "\033[0;32m[DRIVER] Generated $NO_TESTCASES testcases in $CORPUS_DIR ..."; echo -e "\033[0m"


# start corpus tester
# corpus.tester inserts all testcases in mongodb and adds their ids in
# rabbit queues. Corpus.tester command line parameter is the directory
# where we generated the testcases

echo -e "\033[0;32m[DRIVER] Starting corpus tester ..."; echo -e "\033[0m"
cd $CORPUS_TESTER
node index.js $CORPUS_DIR > /dev/null 2>&1 &

# now let's batch the testcases
echo -e "\033[0;32m[DRIVER] Starting test batcher ..."; echo -e "\033[0m"
cd $TEST_BATCHER
node index.js > /dev/null 2>&1 &

# start the desired number of node river running processes
echo -e "\033[0;32m[DRIVER] Starting $cores processes of node RIVER ..."; echo -e "\033[0m"
cd $TRACER_NODE
export LD_LIBRARY_PATH=$NODE_RIVER/lib
for i in $(seq $cores) ; do
  ( node index.js  > /dev/null 2>&1 & )
done

while true; do
  left=$(mongo --eval 'db.test.find({state : "traced"}).count()' | tail -n1)
  sleep 3 #todo fix this
  echo "Tracing progress: $left out of $NO_TESTCASES testcases traced"
  if [ "$left" == "$NO_TESTCASES" ]; then
    break;
  fi
done

fst=$(mongo --eval "db.test.find({}, {tracedTS:1, _id:0}).sort({tracedTS: 1}).limit(1)" | tail -n 1 | grep --only-matching --perl-regex "(?<=\"tracedTS\" : )[^ ]*")
lst=$(mongo --eval "db.test.find({}, {tracedTS:1, _id:0}).sort({tracedTS: -1}).limit(1)" | tail -n 1 | grep --only-matching --perl-regex "(?<=\"tracedTS\" : )[^ ]*")

echo "RIVER statistics"
echo "number_of_testcases : $NO_TESTCASES"
echo "number_of_cores : $cores"
echo "time_in_ms : $((lst - fst))"
