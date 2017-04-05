#!/usr/bin/env bash

[ $# -lt 1 ] && { echo "Usage: $0 <river-cb-multios-path>"; exit 1; }
read rcb_path <<<$@

[ "$JWT_TOKEN" == "" ] && { echo "Error. Export JWT_TOKEN accordingly"; exit 1; }

PROCESSED_CHALLENGES="$rcb_path/processed-challenges"

insert() {
  challenge="$1"
  river_target="$2"
  fuzzer_path="$3"

  ID=$(curl -s --insecure -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    --data '{"executableName" : "'"$challenge"'", "platform" : "Linux", "execution" : "Inprocess"}' \
    https://10.18.0.32/api/executables)

  ID=$(echo $ID | grep -oP  '[0-9a-f]{24}')

  curl -s --insecure -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    --form  "file=@$river_target" \
    https://10.18.0.32/api/executables/$ID/uploadexecutable

  curl -s --insecure -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    --form "file=@$fuzzer_path" \
    https://10.18.0.32/api/executables/$ID/uploadfuzzer
}

for cpath in $PROCESSED_CHALLENGES/*; do
  c=$(basename $cpath)
  FUZZER_PATH=$cpath/bin/"$c"_fuzzer
  RIVER_TARGET=$cpath/bin/lib"$c"_river.so

  echo -e "\033[0;32m[DRIVER SETUP] Inserted target and fuzzer for $c ..."; echo -e "\033[0m"
  insert $c $RIVER_TARGET $FUZZER_PATH
done
