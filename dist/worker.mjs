import { loadPyodide } from "./python.mjs";
import worker from "./worker.py";

async function fetch(request) {
  console.log("\n\n\n\n request", request.url);
  const t1 = performance.now();
  const pyodide = await loadPyodide();
  const t2 = performance.now();

  pyodide.FS.writeFile(`/session/worker.py`, new Uint8Array(worker), {
    canOwn: true,
  });
  const api = pyodide.pyimport("worker").my_awesome_api;
  const asgi = pyodide.pyimport("asgi");
  const upgradeHeader = request.headers.get("Upgrade");
  let result;
  if (upgradeHeader === "websocket") {
    result = await asgi.websocket(api, request);
  } else {
    result = await asgi.onfetch(api, request);
  }
  const t3 = performance.now();
  // console.log("bootstrap", t2 - t1);
  // console.log("handle", t3 - t2);
  console.log("result:", request.url, result.status);
  if (typeof process !== "undefined") {
    globalThis.WebSocketPair = class WebSocketPair {
      constructor() {
        globalThis.server = { accept() {} };
        return { 0: {}, 1: server };
      }
    };
    await asgi.onfetch(api, new Request("http://localhost:8080/favicon.ico"));
    await asgi.onfetch(api, new Request("http://localhost:8080/docs"));
    await asgi.onfetch(api, new Request("http://localhost:8080/openapi.json"));
    await asgi.onfetch(
      api,
      new Request("http://localhost:8080/items/55?q=qqqq", {
        method: "PUT",
        body: `{
                  "name": "string",
                  "description": "string",
                  "price": 0,
                  "tax": 0
              }`,
      })
    );
    pyodide.runPython(`
        from pyodide.code import run_js
        len(run_js("[]"))
        run_js("({})").object_values()

      `);
    try {
      await asgi.websocket(api, new Request("ws://localhost:8000/ws"));
    } catch (e) {}
    let resolve;
    const a = new Promise((res) => (resolve = res));
    server.send = resolve;
    server.onmessage({ data: "abc" });
    await a;
    pyodide._module._dump_traceback();
    pyodide._module.__Py_wgetcwd();
    pyodide._module._PyErr_PrintEx();
    pyodide._module._wcsncpy();
    function try1(cb) {
      try {
        cb();
      } catch (e) {}
    }
    try1(() => pyodide._module.__PyObject_CallMethodFormat());
    try1(() => pyodide._module.__Py_DumpASCII());
    // pyodide._module._sys_excepthook();
    console.log("writeprofile!");
    pyodide._module._write_profile();
  }

  // pyodide.runPython("import sys; print(list(sys.modules))")
  return result;
}

export default { fetch };

if (typeof process !== "undefined") {
  console.log(await fetch(new Request("http://localhost:8080/ws-example")));
}
