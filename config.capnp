using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (name = "main", worker = .mainWorker),
  ],

  sockets = [
    # Serve HTTP on port 8080.
    ( name = "http",
      address = "*:8080",
      http = (),
      service = "main"
    ),
  ]
);

const mainWorker :Workerd.Worker = (
  modules = [
    (name = "worker", esModule = embed "./dist/worker.mjs"),
    (name = "worker.py", data = embed "./dist/worker.py"),
    (name = "python.mjs", esModule = embed "./dist/python.mjs"),
    (name = "python.asm.mjs", esModule = embed "./dist/python.asm.mjs"),
    (name = "python.asm.wasm", wasm = embed "./dist/python.asm.wasm"),
    (name = "python_stdlib.zip", data = embed "./dist/python_stdlib.zip"),
    (name = "memory.dat", data = embed "./dist/memory.dat"),
    (name = "dylinkInfo.json", json = embed "./dist/dylinkInfo.json"),

    (name = "markupsafe/__init__.py", data = embed ".venv-pyodide/lib/python3.11/site-packages/markupsafe/__init__.py"),
    (name = "markupsafe/_speedups.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/markupsafe/_speedups.cpython-311-wasm32-emscripten.so"),

    (name = "tar.mjs", esModule = embed "./dist/tar.mjs"),
    (name = "tarfs.mjs", esModule = embed "./dist/tarfs.mjs"),
    (name = "mandelbrot.mjs", esModule = embed "./dist/mandelbrot.mjs"),

    (name = "numpy.tar", data = embed "./dist/numpy.tar" ),

(name = "numpy/core/_multiarray_tests.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/core/_multiarray_tests.cpython-311-wasm32-emscripten.so"),
(name = "numpy/core/_multiarray_umath.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/core/_multiarray_umath.cpython-311-wasm32-emscripten.so"),
(name = "numpy/core/_operand_flag_tests.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/core/_operand_flag_tests.cpython-311-wasm32-emscripten.so"),
(name = "numpy/core/_rational_tests.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/core/_rational_tests.cpython-311-wasm32-emscripten.so"),
(name = "numpy/core/_simd.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/core/_simd.cpython-311-wasm32-emscripten.so"),
(name = "numpy/core/_struct_ufunc_tests.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/core/_struct_ufunc_tests.cpython-311-wasm32-emscripten.so"),
(name = "numpy/core/_umath_tests.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/core/_umath_tests.cpython-311-wasm32-emscripten.so"),
(name = "numpy/fft/_pocketfft_internal.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/fft/_pocketfft_internal.cpython-311-wasm32-emscripten.so"),
(name = "numpy/linalg/_umath_linalg.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/linalg/_umath_linalg.cpython-311-wasm32-emscripten.so"),
(name = "numpy/linalg/lapack_lite.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/linalg/lapack_lite.cpython-311-wasm32-emscripten.so"),
(name = "numpy/random/_bounded_integers.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/random/_bounded_integers.cpython-311-wasm32-emscripten.so"),
(name = "numpy/random/_common.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/random/_common.cpython-311-wasm32-emscripten.so"),
(name = "numpy/random/_generator.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/random/_generator.cpython-311-wasm32-emscripten.so"),
(name = "numpy/random/_mt19937.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/random/_mt19937.cpython-311-wasm32-emscripten.so"),
(name = "numpy/random/_pcg64.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/random/_pcg64.cpython-311-wasm32-emscripten.so"),
(name = "numpy/random/_philox.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/random/_philox.cpython-311-wasm32-emscripten.so"),
(name = "numpy/random/_sfc64.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/random/_sfc64.cpython-311-wasm32-emscripten.so"),
(name = "numpy/random/bit_generator.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/random/bit_generator.cpython-311-wasm32-emscripten.so"),
(name = "numpy/random/mtrand.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/numpy/random/mtrand.cpython-311-wasm32-emscripten.so"),



  ],
  compatibilityDate = "2023-02-28",
  # Learn more about compatibility dates at:
  # https://developers.cloudflare.com/workers/platform/compatibility-dates/
);
