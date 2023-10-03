import { createPython } from "./python.asm.mjs";
import module from "./python.asm.wasm";
import stdlib from "./python_stdlib.zip"
import memory from "./memory.dat"

function logError(e){
  for(let line of e.stack.split("\n")) {
    console.log("!!!", line);
  }
}

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
  API.runPythonInternal_dict = API._pyodide._base.eval_code("{}");
  API.importlib = API.runPythonInternal("import importlib; importlib");
  let import_module = API.importlib.import_module;

  API.sys = import_module("sys");
  // API.sys.path.insert(0, config.env.HOME);
  API.os = import_module("os");

  // Set up globals
  let globals = API.runPythonInternal(
    "import __main__; __main__.__dict__",
  );
  let builtins = API.runPythonInternal(
    "import builtins; builtins.__dict__",
  );
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

  // import pyodide_py. We want to ensure that as much stuff as possible is
  // already set up before importing pyodide_py to simplify development of
  // pyodide_py code (Otherwise it's very hard to keep track of which things
  // aren't set up yet.)
  API.pyodide_py = import_module("pyodide");
  API.pyodide_code = import_module("pyodide.code");
  API.pyodide_ffi = import_module("pyodide.ffi");
  API.package_loader = import_module("pyodide._package_loader");

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

// import * as fs from "fs";
export async function doStuff(code) {
  const orig_log = console.log.bind(console);
  console.log = function(...args) {
    // logError(new Error());
    orig_log(...args);
  }

  let stdout_chars;
  function capture_stdout(Module) {
    stdout_chars = [];
    const FS = Module.FS;
    FS.createDevice("/dev", "capture_stdout", null, (e) => stdout_chars.push(e));
    FS.closeStream(1 /* stderr */);
    // open takes the lowest available file descriptor. Since 0 is occupied by stdin it takes 1.
    FS.open("/dev/capture_stdout", 1 /* O_WRONLY */);
  }

  function restore_stdout(Module) {
    const FS = Module.FS;
    FS.closeStream(2 /* stderr */);
    FS.unlink("/dev/capture_stdout");
    // open takes the lowest available file descriptor. Since 0 and 1 are occupied by stdin and stdout it takes 2.
    FS.open("/dev/stdout", 1 /* O_WRONLY */);
    return new TextDecoder().decode(new Uint8Array(stdout_chars));
  }



  const API = {};
  const config = {jsglobals: globalThis};
  const Module = {
    noInitialRun: true,
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
        
        try {
          Module.FS.mkdirTree("/lib");
          Module.FS.mkdirTree(`/lib/python${pymajor}.${pyminor}/site-packages`);
          Module.FS.writeFile(`/lib/python${pymajor}${pyminor}.zip`, new Uint8Array(stdlib));
        } catch(e) {
          logError(e);
        }
      }
    ]
  };

  let res;
  try {
    res = await createPython(Module);
  } catch(e) {
    logError(e);
    return;
  }

  Module.HEAP8.set(new Uint8Array(memory));
  let [err, captured_stderr] = API.rawRun("import _pyodide_core");
  if (err) {
    Module.API.fatal_loading_error(
      "Failed to import _pyodide_core\n",
      captured_stderr,
    );
  }
  finalizeBootstrap(API, config);


  const ptr = res.stringToNewUTF8(code);
  capture_stdout(res);
  res._PyRun_SimpleString(ptr);
  return restore_stdout(res);
}
