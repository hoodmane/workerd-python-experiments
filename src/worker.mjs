import { loadPyodide } from "./python.mjs";


export default {
  async fetch(request) {
    const url = new URL(request.url)
    const code = url.searchParams.get("code");
    if (!code) {
      // favicon?
      return new Response("");
    }
    const t1 = performance.now();
    const pyodide = await loadPyodide();
    const t2 = performance.now();

    pyodide.runPython(`
      async def handle_request(req):
          from js import fetch, Response
          resp = await fetch("http://example.com")
          return Response.new(await resp.arrayBuffer())
    `);
    const handle_request = pyodide.globals.get("handle_request");
    const result = await handle_request(request);
    const t3 = performance.now();
    console.log("bootstrap", t2-t1);
    console.log("handle", t3-t2);
    return result;
  },
};
