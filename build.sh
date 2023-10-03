#!/bin/bash
set -e

if [ $# -ne 0 ];  then
    pushd ~/Documents/programming/pyodide
    touch src/core/hiwire.h && make dist/libpyodide.a && cp dist/libpyodide.a ../workerd/tmp/python1/artifacts/
    popd
fi

rm -rf build
rm -rf dist
mkdir build
mkdir dist
emcc -c ./src/main.c -o ./build/main.o -O2 -Iartifacts/include
emcc -Lartifacts/ -lpython3.11 -lpyodide -lhiwire -lffi ./build/main.o -o ./build/python.asm.js \
    -sEXPORTED_FUNCTIONS=\
_main,\
_pyodide_export,\
_PyRun_SimpleString,\
_PyLong_FromDouble,\
__PyTraceback_Add,\
_PyErr_Occurred,\
_PyUnicode_New,\
_hiwire_intern,\
_hiwire_num_refs,\
_hiwire_get,\
_hiwire_new,\
_hiwire_incref,\
_hiwire_decref,\
_hiwire_pop,\
_Py_IncRef,\
_Py_DecRef,\
_free,\
_check_gil\
    -sMODULARIZE=1 -sWASM_BIGINT \
    -sEXPORT_NAME="createPython" \
    -sEXPORTED_RUNTIME_METHODS=stringToNewUTF8,FS,wasmMemory,STACK_SIZE,preloadPlugins,PATH,ERRNO_CODES \
    -sENVIRONMENT=web -s TOTAL_MEMORY=20971520 -s ALLOW_MEMORY_GROWTH=1  -s USE_ZLIB \
    -sLZ4=1 -sUSE_BZIP2 -s STACK_SIZE=5MB
sed -i 's/var createPython/export var createPython/' build/python.asm.js && mv build/python.asm.js build/python.asm.mjs

cat << 'END' >> build/python.asm.mjs
let require, __dirname;
if (typeof process === "object") {
  const { createRequire } = await import("node:module");
  const { dirname } = await import('path');
  const { fileURLToPath } = await import('url');

  require = createRequire(import.meta.url);
  __dirname = dirname(fileURLToPath(import.meta.url));
}
END

cp src/*.mjs dist
cp artifacts/python_stdlib.zip dist
cp artifacts/memory.dat dist
cp build/python.asm.* dist
cd dist
# npx prettier -w python.asm.mjs
