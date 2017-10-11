WORK_DIR=work-clang-sdict
if [ -d $WORK_DIR ]; then
  rm -r $WORK_DIR
fi

TOP_LEVEL_DIR=`pwd`
CLANG_BUILD_DIR=clang-build
if [ ! -d $TOP_LEVEL_DIR/$CLANG_BUILD_DIR ]; then
  echo "Cannot find directory '$CLANG_BUILD_DIR' in current directory"
  exit 1
fi
mkdir $WORK_DIR && cd $WORK_DIR
mkdir bin
cp $TOP_LEVEL_DIR/$CLANG_BUILD_DIR/bin/clang-sdict bin/
mkdir -p lib/clang/6.0.0/
cp -r $TOP_LEVEL_DIR/$CLANG_BUILD_DIR/lib/clang/6.0.0/include lib/clang/6.0.0/

zip -r $TOP_LEVEL_DIR/clang-sdict-sdk.zip .
cd ..
rm -r $WORK_DIR
exit 0
