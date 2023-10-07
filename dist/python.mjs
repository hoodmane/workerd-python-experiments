import { createPython } from "./python.asm.mjs";
import module from "./python.asm.wasm";
import stdlib from "./python_stdlib.zip";
import memory from "./memory.dat";
import dylinkInfo from "./dylinkInfo.json";
import numpy from "./numpy.json";

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

async function makeDirs(Module, prefix, dir) {
  Module.FS.mkdir(prefix + dir.name);
  for (let entry of dir.contents) {
    if (entry.type === "directory") {
      await makeDirs(Module, prefix, entry);
    } else {
      let contents;
      if (entry.name.endsWith(".so")) {
        contents = new Uint8Array([0]);
      } else {
        contents = new Uint8Array((await import("./" + entry.name)).default);
      }
      Module.FS.writeFile(prefix + entry.name, contents);
    }
  }
}

function findSoFiles(dir) {
  return dir.contents.flatMap((entry) => {
    if (entry.type === "directory") {
      return findSoFiles(entry);
    }
    if (entry.name.endsWith(".so")) {
      return entry.name;
    }
    return [];
  });
}

function prepareFileSystem(Module) {
  const pymajor = 3;
  const pyminor = 11;
  Module.FS.mkdirTree("/lib");
  Module.FS.mkdirTree(`/lib/python${pymajor}.${pyminor}/site-packages`);
  Module.FS.writeFile(
    `/lib/python${pymajor}${pyminor}.zip`,
    new Uint8Array(stdlib),
    { canOwn: true },
  );
  Module.FS.mkdir("/session");
}

function loadDynlib(Module, path, wasmModule) {
  const dso = Module.newDSO(path, undefined, "loading");
  dso.refcount = Infinity;
  dso.global = false;
  dso.exports = Module.loadWebAssemblyModule(wasmModule, {}, path);
  const { handles } = dylinkInfo[path] || { handles: [] };
  for (let handle of handles) {
    Module.LDSO.loadedLibsByHandle[handle] = dso;
  }
}

async function makeSnapshot(Module, run) {
  run(`import sys; sys.path.append("/session/"); del sys`);

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
    "numpy",
  ];
  const to_import = imports.join(",");
  const to_delete = Array.from(
    new Set(imports.map((x) => x.split(".")[0])),
  ).join(",");
  run(`import ${to_import}`);
  run("sysconfig.get_config_vars()");
  run(`del ${to_delete}`);
  for (let [handle, { name }] of Object.entries(
    Module.LDSO.loadedLibsByHandle,
  )) {
    if (handle == 0) {
      continue;
    }
    if (!(name in dylinkInfo)) {
      dylinkInfo[name] = { handles: [] };
    }
    dylinkInfo[name].handles.push(handle);
  }
  const { writeFile } = await import("fs/promises");
  await writeFile("dylinkInfo.json", JSON.stringify(dylinkInfo));
  await writeFile("memory.dat", Module.HEAP8);
}

export async function loadPyodide() {
  const API = {};
  const config = { jsglobals: globalThis };
  const soFiles = await Promise.all(
    findSoFiles(numpy[0]).map(async (file) => [
      "/session/" + file,
      (await import("./" + file)).default,
    ]),
  );

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
      prepareFileSystem,
      () => {
        soFiles.forEach(([path, wasmModule]) => {
          try {
            loadDynlib(Module, path, wasmModule);
          } catch (e) {
            console.log(path);
            process.exit(1);
          }
        });
      },
    ],
  };

  const t1 = performance.now();
  try {
    await createPython(Module);
  } catch (e) {
    e.stack.split("\n").forEach(console.log.bind(console));
  }
  function run(code) {
    const [status, err] = API.rawRun(code);
    if (status) {
      console.warn("Command failed:", code);
      console.warn("Error was:");
      for (const line of err.split("\n")) {
        console.warn(line);
      }
      throw new Error("Failed");
    }
  }
  await makeDirs(Module, "/session/", numpy[0]);

  const t2 = performance.now();

  if (!memory) {
    await makeSnapshot(Module, run);
    process.exit(0);
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
  // console.log("createPython", t2 - t1);
  // console.log("import _pyodide_core", t3 - t2);
  // console.log("finalizeBootstrap ", t4 - t3);
  return API.public_api;
}

if (!memory) {
  loadPyodide();
}
