#!/usr/bin/env bash

[ $# -lt 1 ] && { echo "Usage: $0 <executables path>"; exit 1; }
read rcg_path <<<$@

SCRIPTS_PATH=$rcg_path/river

EXECUTABLES=$(curl -s --insecure \
  -H "Authorization: Bearer $JWT_TOKEN" \
  https://10.18.0.32:8443/api/executables)

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

  if [ "$name" == "libxml2" ]; then
    file="$1/libxml.so"
  elif [ "$name" == "libjpeg-turbo" ]; then
    file="$1/libjpeg_turbo.so"
  elif [[ $name == lib* ]]; then
    file="$1/${name}.so"
  else
    file="$1/lib${name}.so"
  fi

  echo -n "Upload: $name with id: $id. Filepath: $file. Result: "
  ## send corpus to webapi
  res=$(curl -s --insecure -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    --form  "file=@$file" \
    https://10.18.0.32:8443/api/executables/$id/uploadexecutable)
  if [ "$res" != "{\"result\":\"OK\"}" ]; then
    echo -e "\033[0;31mFAILED"; echo -e "\033[0m"
  else
    echo -e "\033[0;32mPASSED"; echo -e "\033[0m"
  fi
done
