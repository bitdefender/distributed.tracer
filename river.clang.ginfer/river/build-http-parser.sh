HTTP_PARSER_CFLAGS="-DHTTP_PARSER_STRICT=0 -Wextra -Werror -Wno-unused-parameter"

# Init http-parser source code
init_target() {
  cd "$WORK_DIR"
  if ! [ -d http-parser-src ]; then
    git clone http://github.com/nodejs/http-parser.git http-parser-src
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
    "$CC" -extra-arg="$HTTP_PARSER_CFLAGS" \
      -extra-arg="$DEFAULT_CFLAGS" -extra-arg="-I ../http-parser-src" \
      "$extra_cflags" ../http-parser-src/http_parser.c
    cd ..
  fi
  cd -
}
