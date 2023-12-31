#!/bin/bash
set -ex

if [ $# -ne 0 ];  then
    pushd ~/Documents/programming/pyodide
    touch src/core/hiwire.h && make dist/libpyodide.a && cp dist/libpyodide.a ../workerd/tmp/python1/artifacts/
    popd
fi

rm -rf build
rm -rf dist
mkdir build
mkdir dist

EXPORTS=`cat main_exports.list`
MORE_EXPORTS=`cat exports.save.list`
RUNTIME_EXPORTS=\
stringToNewUTF8,\
FS,\
wasmMemory,\
STACK_SIZE,\
preloadPlugins,\
PATH,\
ERRNO_CODES,\
growMemory

readarray -d '' SO_FILES < <(find .venv-pyodide/ -name '*.so' -print0)

emcc -c ./src/main.c -o ./build/main.o -O2 -Iartifacts/include -fPIC
emcc -Lartifacts/ -lpython3.11 -lpyodide -lhiwire -lffi -lnodefs.js ./build/main.o -o ./dist/python.asm.mjs \
    -sMODULARIZE=1 \
    -sEXPORT_ES6 \
    -sWASM_BIGINT \
    -sENVIRONMENT=web,node \
    -s TOTAL_MEMORY=25165824 -s STACK_SIZE=5MB \
    -s USE_ZLIB -sLZ4=1 -sUSE_BZIP2  \
    -sEXPORTED_FUNCTIONS=$EXPORTS \
    -sEXPORTED_RUNTIME_METHODS=$RUNTIME_EXPORTS


cp src/*.mjs dist
cp src/*.py dist
cp artifacts/python_stdlib.zip dist
touch dist/memory.dat

cd dist
node --import ../register-hooks.mjs python.mjs
# npx prettier -w python.asm.mjs
