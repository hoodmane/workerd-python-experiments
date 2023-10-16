import { loadPyodide } from "./python.mjs";
import worker from "./worker.py";

export default {
  async fetch(request) {
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
    // pyodide.runPython("import sys; print(list(sys.modules))")
    return result;
  },
};
