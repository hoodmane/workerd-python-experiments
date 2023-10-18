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
MORE_EXPORTS=,__Py_wgetcwd\
,_wcsncpy\
,_PyErr_PrintEx\
,__Py_DumpASCII\
,__PyObject_CallMethodFormat


RUNTIME_EXPORTS=\
stringToNewUTF8,\
FS,\
wasmMemory,\
STACK_SIZE,\
PATH,\
ERRNO_CODES,\
growMemory

readarray -d '' SO_FILES < <(find .venv-pyodide/ -name '*.so' -print0)

emcc -c ./src/main.c -o ./build/main.o -O2 -Iartifacts/include -fPIC
emcc -Lartifacts/ -lpython3.11 -lpyodide -lhiwire -lffi ./build/main.o -o ./dist/python.asm.mjs \
    -sMODULARIZE=1 \
    -sEXPORT_ES6 \
    -sWASM_BIGINT \
    -sENVIRONMENT=web,node \
    -sSPLIT_MODULE \
    -s TOTAL_MEMORY=25165824 -s STACK_SIZE=5MB \
    -s USE_ZLIB -sLZ4=1 -sUSE_BZIP2  \
    -sEXPORTED_FUNCTIONS=$EXPORTS$MORE_EXPORTS \
    -sEXPORTED_RUNTIME_METHODS=$RUNTIME_EXPORTS


cp src/*.mjs dist
cp src/*.py dist
cp artifacts/python_stdlib.zip dist

tar -cf dist/lib.tar lib/

cd dist
node --import ../register-hooks.mjs worker.mjs
# npx prettier -w python.asm.mjs
~/Documents/programming/pyodide/emsdk/emsdk/upstream/bin/wasm-split -g --enable-mutable-globals --export-prefix=% python.asm.wasm.orig -o1 python.asm.wasm -o2 python.asm.deferred.wasm --profile=profile.data -v > keeping.info
