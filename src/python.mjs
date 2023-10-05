import { createPython } from "./python.asm.mjs";
import module from "./python.asm.wasm";
import stdlib from "./python_stdlib.zip";
import memory from "./memory.dat";
import markupsafe_init from "./markupsafe/__init__.py";
import markupsafe_speedups from "./markupsafe/_speedups.cpython-311-wasm32-emscripten.so";

function wrapPythonGlobals(globals_dict, builtins_dict) {
  return new Proxy(globals_dict, {
    get(target, symbol) {
      if (symbol === "get") {
        return (key) => {
          let result = target.get(key);
          if (result === undefined) {
            result = builtins_dict.get(key);
          }
          return result;
        };
      }
      if (symbol === "has") {
        return (key) => target.has(key) || builtins_dict.has(key);
      }
      return Reflect.get(target, symbol);
    },
  });
}

function finalizeBootstrap(API, config) {
  // First make internal dict so that we can use runPythonInternal.
  // runPythonInternal uses a separate namespace, so we don't pollute the main
  // environment with variables from our setup.
  const t1 = performance.now();
  API.runPythonInternal_dict = API._pyodide._base.eval_code("{}");
  API.importlib = API.runPythonInternal("import importlib; importlib");
  const t2 = performance.now();
  let import_module = API.importlib.import_module;

  API.sys = import_module("sys");
  API.sys.path.insert(0, "/session");
  API.os = import_module("os");

  // Set up globals
  let globals = API.runPythonInternal("import __main__; __main__.__dict__");
  let builtins = API.runPythonInternal("import builtins; builtins.__dict__");
  API.globals = wrapPythonGlobals(globals, builtins);

  // Set up key Javascript modules.
  let importhook = API._pyodide._importhook;
  function jsFinderHook(o) {
    if ("__all__" in o) {
      return;
    }
    Object.defineProperty(o, "__all__", {
      get: () =>
        pyodide.toPy(
          Object.getOwnPropertyNames(o).filter((name) => name !== "__all__"),
        ),
      enumerable: false,
      configurable: true,
    });
  }
  importhook.register_js_finder.callKwargs({ hook: jsFinderHook });
  importhook.register_js_module("js", config.jsglobals);

  let pyodide = API.makePublicAPI();
  importhook.register_js_module("pyodide_js", pyodide);
  const t3 = performance.now();

  // import pyodide_py. We want to ensure that as much stuff as possible is
  // already set up before importing pyodide_py to simplify development of
  // pyodide_py code (Otherwise it's very hard to keep track of which things
  // aren't set up yet.)
  API.pyodide_py = import_module("pyodide");
  const t4 = performance.now();
  API.pyodide_code = import_module("pyodide.code");
  const t5 = performance.now();
  API.pyodide_ffi = import_module("pyodide.ffi");
  const t6 = performance.now();
  API.package_loader = import_module("pyodide._package_loader");
  const t7 = performance.now();
  console.log("");
  console.log("importlib", t2 - t1);
  console.log("tasks", t3 - t2);
  console.log("pyodide ", t4 - t3);
  console.log("pyodide.code ", t5 - t4);
  console.log("pyodide.ffi ", t6 - t5);
  console.log("_package_loader ", t7 - t6);
  console.log("");
  API.sitepackages = API.package_loader.SITE_PACKAGES.__str__();
  API.dsodir = API.package_loader.DSO_DIR.__str__();
  API.defaultLdLibraryPath = [API.dsodir, API.sitepackages];

  API.os.environ.__setitem__(
    "LD_LIBRARY_PATH",
    API.defaultLdLibraryPath.join(":"),
  );

  // copy some last constants onto public API.
  pyodide.pyodide_py = API.pyodide_py;
  pyodide.globals = API.globals;
  return pyodide;
}

export async function loadPyodide() {
  const API = {};
  const config = { jsglobals: globalThis };
  const Module = {
    noInitialRun: !!memory,
    API,
    instantiateWasm(info, receiveInstance) {
      (async function () {
        const instance = await WebAssembly.instantiate(module, info);
        receiveInstance(instance, module);
      })();
      return {};
    },
    preRun: [
      () => {
        /* @ts-ignore */
        const pymajor = 3;
        /* @ts-ignore */
        const pyminor = 11;
        Module.FS.mkdirTree("/lib");
        Module.FS.mkdirTree(`/lib/python${pymajor}.${pyminor}/site-packages`);
        Module.FS.writeFile(
          `/lib/python${pymajor}${pyminor}.zip`,
          new Uint8Array(stdlib),
          {canOwn: true}
        );
        Module.FS.mkdir("/session");
      },
    ],
  };

  const t1 = performance.now();
  try {
    await createPython(Module);
  } catch (e) {
    e.stack.split("\n").forEach(console.log.bind(console));
  }
  Module.FS.mkdir("/session/markupsafe");
  console.log(1);
  Module.FS.writeFile("/session/markupsafe/__init__.py",new Uint8Array(markupsafe_init),{canOwn: true});
  console.log(2);
  const speedups_path = "/session/markupsafe/_speedups.cpython-311-wasm32-emscripten.so";
  console.log(3);
  Module.FS.writeFile(speedups_path, "");
  console.log(4);



  const t2 = performance.now();
  if (!memory) {
    const imports = [
      "_pyodide.docstring",
      "_pyodide._core_docs",
      "traceback",
      "collections.abc",
      "asyncio",
      "inspect",
      "tarfile",
      "importlib.metadata",
      "re",
      "shutil",
      "sysconfig",
      "importlib.machinery",
      "pathlib",
      "site",
      "tempfile",
      "typing",
      "zipfile",
    ];
    const to_import = imports.join(",");
    const to_delete = imports.map((x) => x.split(".")[0]).join(",");
    API.rawRun(`import ${to_import}; del ${to_delete}`);
    API.rawRun("sysconfig.get_config_vars()");
    const { writeFile } = await import("fs/promises");
    await writeFile("memory.dat", Module.HEAP8);
    return;
  }

  Module.HEAP8.set(new Uint8Array(memory));
  let [err, captured_stderr] = API.rawRun("import _pyodide_core");
  const t3 = performance.now();
  if (err) {
    Module.API.fatal_loading_error(
      "Failed to import _pyodide_core\n",
      captured_stderr,
    );
  }
  finalizeBootstrap(API, config);
  const t4 = performance.now();

  const dso = Module.newDSO(speedups_path, undefined, "loading");
  dso.refcount = Infinity;
  dso.global = false;
  dso.exports = await Module.loadWebAssemblyModule(
    markupsafe_speedups,
    { loadAsync: true },
    speedups_path,
  );

  console.log("createPython", t2 - t1);
  console.log("import _pyodide_core", t3 - t2);
  console.log("finalizeBootstrap ", t4 - t3);
  return API.public_api;
}

if (!memory) {
  loadPyodide();
}
