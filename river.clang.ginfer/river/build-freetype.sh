SRC_DIR="freetype-src"
init_target() {
  cd "$WORK_DIR"
  if ! [ -d $SRC_DIR ]; then
    wget http://download.savannah.gnu.org/releases/freetype/freetype-2.8.tar.gz
    tar xvf freetype-2.8.tar.gz
    mv freetype-2.8 $SRC_DIR
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
    ../$SRC_DIR/configure
    make

    for source in $(find "../$SRC_DIR/src" -name "*.c"); do
      dir=$(dirname $source)
      "$CC" -extra-arg="-I../$SRC_DIR" \
        -extra-arg="-I../$SRC_DIR/include" \
        -extra-arg="-I../target-${name}-build" \
        -extra-arg="-I../$SRC_DIR/builds/unix" \
        "$extra_cflags" $source
    done

    cd -
  fi
  cd -
}
