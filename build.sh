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

MORE_EXPORTS=`cat exports.save.list`

EXPORTS=`cat main_exports.list`


readarray -d '' SO_FILES < <(find .venv-pyodide/ -name '*.so' -print0)

emcc -c ./src/main.c -o ./build/main.o -O2 -Iartifacts/include -fPIC
emcc -Lartifacts/ -lpython3.11 -lpyodide -lhiwire -lffi ./build/main.o -o ./build/python.asm.js \
    -sEXPORTED_FUNCTIONS=_memcmp,_memcpy,$EXPORTS,$MORE_EXPORTS\
 \
-sEXPORTED_RUNTIME_METHODS=\
stringToNewUTF8,\
FS,\
wasmMemory,\
STACK_SIZE,\
preloadPlugins,\
PATH,\
ERRNO_CODES,\
loadWebAssemblyModule,\
loadDynamicLibrary,\
newDSO,\
LDSO \
    -sMODULARIZE=1 -sWASM_BIGINT \
    -sEXPORT_NAME="createPython" \
    -sENVIRONMENT=web,node \
    -s TOTAL_MEMORY=25165824 -s STACK_SIZE=5MB \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s USE_ZLIB -sLZ4=1 -sUSE_BZIP2  \
    -sMAIN_MODULE=2 \



sed -i 's/var createPython/export var createPython/' build/python.asm.js
sed -i 's/var ENVIRONMENT_IS_WORKER =.*;/var ENVIRONMENT_IS_WORKER = false;/' build/python.asm.js
sed -i 's/var ENVIRONMENT_IS_SHELL =.*;/var ENVIRONMENT_IS_SHELL = false; ENVIRONMENT_IS_WEB=!ENVIRONMENT_IS_NODE;/' build/python.asm.js
mv build/python.asm.js build/python.asm.mjs


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
cp src/*.py dist
cp artifacts/python_stdlib.zip dist
cp build/python.asm.* dist
touch dist/memory.dat
touch dist/dylinkInfo.json

pushd .venv-pyodide/lib/python3.11/site-packages/
tree -Jf numpy > ../../../../dist/numpy.json
popd


cp -r .venv-pyodide/lib/python3.11/site-packages/{numpy,markupsafe} dist
cd dist
node --import ../register-hooks.mjs python.mjs
# npx prettier -w python.asm.mjs
