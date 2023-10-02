#!/bin/sh
rm -rf build
rm -rf dist
mkdir build
mkdir dist
emcc -c ./src/main.c -o ./build/main.o -O2 -Iartifacts/include
emcc -Lartifacts/ -lpython3.11 -lffi ./build/main.o -o ./build/python.asm.js \
    -sEXPORTED_FUNCTIONS=_main,_PyRun_SimpleString -sMODULARIZE=1 -sWASM_BIGINT \
    -sEXPORT_NAME="createPython" \
    -sEXPORTED_RUNTIME_METHODS=stringToNewUTF8,FS,wasmMemory,STACK_SIZE,preloadPlugins \
    -sENVIRONMENT=web -s TOTAL_MEMORY=20971520 -s ALLOW_MEMORY_GROWTH=1  -s USE_ZLIB \
    -sLZ4=1 -sUSE_BZIP2 -s STACK_SIZE=5MB
sed -i 's/var createPython/export var createPython/' build/python.asm.js && mv build/python.asm.js build/python.asm.mjs

cp src/*.mjs dist
cp artifacts/python_stdlib.zip dist
cp build/python.asm.* dist

