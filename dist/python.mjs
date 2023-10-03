import { createPython } from "./python.asm.mjs";
import module from "./python.asm.wasm";
import stdlib from "./python_stdlib.zip"
import memory from "./memory.dat"

// import * as fs from "fs";
export async function doStuff(code) {

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

  function logError(e){
    for(let line of e.stack.split("\n")) {
      console.log("!!!", line);
    }
  }

  const Module = {
    noInitialRun: true,
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
  const ptr = res.stringToNewUTF8(code);
  capture_stdout(res);
  res._PyRun_SimpleString(ptr);
  return restore_stdout(res);
}
