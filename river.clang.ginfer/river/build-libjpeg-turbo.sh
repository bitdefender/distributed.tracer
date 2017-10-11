SRC_DIR="libjpeg-turbo-src"
init_target() {
  cd "$WORK_DIR"
  if ! [ -d $SRC_DIR ]; then
    wget https://github.com/libjpeg-turbo/libjpeg-turbo/archive/1.5.1.tar.gz
    tar xvf 1.5.1.tar.gz
    mv libjpeg-turbo-1.5.1 $SRC_DIR
    cd $SRC_DIR
    autoreconf -fiv
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

    for source in ../$SRC_DIR/*.c ; do
      "$CC" -extra-arg="-I../$SRC_DIR" \
        -extra-arg="-I../target-${name}-build" \
        "$extra_cflags" $source
    done

    cd -
  fi
  cd -
}
