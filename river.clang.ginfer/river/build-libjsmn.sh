SRC_DIR="jsmn-src"
init_target() {
  cd "$WORK_DIR"
  if ! [ -d $SRC_DIR ]; then
     git clone https://github.com/zserge/jsmn.git $SRC_DIR
  fi
  cd -
}


# Build http-parser with the given `name` and flags.
build_target_and_fuzzer() {
  local name="$1"
  local extra_cflags="$2"

  cd "$WORK_DIR"
  if ! [ -d "target-${name}-build" ]; then
    mkdir -p "target-${name}-build"
    cd "target-${name}-build"
    "$CC" -extra-arg="$DEFAULT_CFLAGS" \
      -extra-arg="-I ../$SRC_DIR" "$extra_cflags" ../$SRC_DIR/jsmn.c

    cd ..
  fi
  cd -
}
