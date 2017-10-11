LIBXML_CONFIGURE_ARGS="
--enable-option-checking
--disable-shared --disable-ipv6
--without-c14n --without-catalog --without-debug --without-docbook --without-ftp --without-http
--without-legacy --without-output --without-pattern --without-push --without-python
--without-reader --without-readline --without-regexps --without-sax1 --without-schemas
--without-schematron --without-threads --without-valid --without-writer --without-xinclude
--without-xpath --without-xptr --with-zlib=no --with-lzma=no"

SRC_DIR=libxml2-src
init_target() {
  cd "$WORK_DIR"
  if ! [ -d $SRC_DIR ]; then
    git clone https://github.com/GNOME/libxml2.git $SRC_DIR
    cd $SRC_DIR
    autoreconf -fiv
    cd -
  fi
  cd -
}

build_target_and_fuzzer() {
  local name="$1"
  local extra_cflags="$2"

   libxml2_la_SOURCES="SAX.c entities.c encoding.c error.c
     parserInternals.c
     parser.c tree.c hash.c list.c xmlIO.c xmlmemory.c uri.c
     valid.c xlink.c HTMLparser.c HTMLtree.c debugXML.c xpath.c
     xpointer.c xinclude.c nanohttp.c nanoftp.c
     catalog.c globals.c threads.c c14n.c xmlstring.c buf.c
     xmlregexp.c xmlschemas.c xmlschemastypes.c xmlunicode.c
     xmlreader.c relaxng.c dict.c SAX2.c
     xmlwriter.c legacy.c chvalid.c pattern.c xmlsave.c
     xmlmodule.c schematron.c xzlib.c"

  cd "$WORK_DIR"
  if ! [ -d "target-${name}-build" ]; then
    mkdir -p "target-${name}-build"
    cd "target-${name}-build"

    CC="gcc" ../$SRC_DIR/configure $LIBXML_CONFIGURE_ARGS

    for source in $libxml2_la_SOURCES; do
      "$CC" -extra-arg="-I../$SRC_DIR/include" \
        -extra-arg="-I$WORK_DIR/target-${name}-build" \
        -extra-arg="-I$WORK_DIR/target-${name}-build/include" \
        "$extra_cflags" ../$SRC_DIR/$source
    done
    cd -

  fi
  cd -
}
