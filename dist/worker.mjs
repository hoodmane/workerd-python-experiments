import { loadPyodide } from "./python.mjs";
import worker from "./worker.py";

export default {
  async fetch(request) {
    const t1 = performance.now();
    const pyodide = await loadPyodide();
    const t2 = performance.now();

    pyodide.FS.writeFile(`/session/worker.py`, new Uint8Array(worker), {
      canOwn: true,
    });
    const result = await pyodide.pyimport("worker").onfetch(request);
    const t3 = performance.now();
    console.log(request.url, "bootstrap", t2 - t1);
    console.log(request.url, "handle", t3 - t2);
    // pyodide.runPython("import sys; print(list(sys.modules))")
    return result;
  },
};
