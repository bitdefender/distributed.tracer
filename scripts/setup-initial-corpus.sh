#!/usr/bin/env bash

[ $# -lt 1 ] && { echo "Usage: $0 <river.clang.ginfer path>"; exit 1; }
read rcg_path <<<$@

SCRIPTS_PATH=$rcg_path/river
WORK_DIR=`pwd`/setup-initial-corpus
LIBS_SCRIPT_PATH=$SIMPLETRACER_ROOT_PATH/scripts/libs.sh

if [ ! -d $WORK_DIR ]; then
  mkdir $WORK_DIR
fi
cd $WORK_DIR

EXECUTABLES=$(curl -s --insecure \
  -H "Authorization: Bearer $JWT_TOKEN" \
  https://10.18.0.32:8443/api/executables)

## download clang-ginfer sdk
if [ ! -d sdk ]; then
  CLANG_SDICT_ZIP=clang-sdict-sdk.zip
  $LIBS_SCRIPT_PATH teodor-stoenescu river.clang.ginfer 0.0.1 $CLANG_SDICT_ZIP $CLANG_SDICT_ZIP
  mkdir sdk && cd sdk
  unzip ../$CLANG_SDICT_ZIP
  cd -
fi

CLANG_SDICT_BIN=$WORK_DIR/sdk/bin/clang-sdict

index=0
while true; do
  item=$(echo $EXECUTABLES | jq --arg index "$index" '.[$index | tonumber]')
  index=$(($index + 1))
  if [ "$item" == "null" ]; then
    break
  fi

  ## for each executable found in webapi
  id=$(echo $item | jq '.id')
  id=$(sed -e 's/^"//' -e 's/"$//' <<<"$id")
  name=$(echo $item | jq '.name')
  name=$(sed -e 's/^"//' -e 's/"$//' <<<"$name")

  ## skip freetype
  if [ "$name" == "freetype" ]; then
    continue
  fi

  ## generate corpus
. $SCRIPTS_PATH/build-$name.sh

  CC=$CLANG_SDICT_BIN
  init_target
  INITIAL_CORPUS_DIR=$WORK_DIR/initial-corpus-$name
  INITIAL_CORPUS_ZIP=$WORK_DIR/initial-corpus-$name.zip
  build_target_and_fuzzer "$name" "-corpus-dir=$INITIAL_CORPUS_DIR"
  cd $INITIAL_CORPUS_DIR
  zip -r $INITIAL_CORPUS_ZIP .
  cd -

  ## send corpus to webapi
  curl -s --insecure -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    --form  "file=@$INITIAL_CORPUS_ZIP" \
    https://10.18.0.32:8443/api/executables/$id/uploadcorpus
done
