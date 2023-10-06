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
    (name = "markupsafe/_speedups.cpython-311-wasm32-emscripten.so", wasm = embed ".venv-pyodide/lib/python3.11/site-packages/markupsafe/_speedups.cpython-311-wasm32-emscripten.so")
  ],
  compatibilityDate = "2023-02-28",
  compatibilityFlags = ["nodejs_compat"]
  # Learn more about compatibility dates at:
  # https://developers.cloudflare.com/workers/platform/compatibility-dates/
);
