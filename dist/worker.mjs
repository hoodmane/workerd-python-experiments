import { loadPyodide } from "./python.mjs";
import worker from "./worker.py";
import { mandelbrot } from "./mandelbrot.mjs";

export default {
  async fetch(request) {
    if (request.url.endsWith("py")) {
      const t1 = performance.now();
      const pyodide = await loadPyodide();

      pyodide.FS.writeFile(`/session/worker.py`, new Uint8Array(worker), {
        canOwn: true,
      });
      const t2 = performance.now();
      const result = await pyodide.pyimport("worker").onfetch(request);
      const t3 = performance.now();
      console.log("bootstrap", t2 - t1);
      console.log("handle", t3 - t2);
      // pyodide.runPython("import sys; print(list(sys.modules))")
      return result;
    }
    if (request.url.endsWith("js")) {
      const res = mandelbrot(1600);
      return new Response("ok", {
        statusText: `center: ${res[800 * 1600 + 1448]}`,
      });
    }
    return new Response("ok");
  },
};
