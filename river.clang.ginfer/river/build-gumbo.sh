SRC_DIR="gumbo-src"
init_target() {
  cd "$WORK_DIR"
  if ! [ -d $SRC_DIR ]; then
    git clone https://github.com/google/gumbo-parser.git $SRC_DIR
    cd $SRC_DIR
    ./autogen.sh
    cd -
  fi
  cd -
}

build_target_and_fuzzer() {
  local name="$1"
  local extra_cflags="$2"

  cd "$WORK_DIR"
  if ! [ -d "target-${name}-build" ]; then
    mkdir -p "target-${name}-build"
    cd "target-${name}-build"

    for source in ../$SRC_DIR/src/*.c; do
      "$CC" -extra-arg="-I../$SRC_DIR/src" "$extra_cflags" $source
    done

    cd -
  fi
  cd -
}
