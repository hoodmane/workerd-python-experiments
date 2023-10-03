import { loadPyodide } from "./python.mjs";

// await doStuff();

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const code = url.searchParams.get("code");
    if (!code) {
      // favicon?
      return new Response("");
    }
    const res = await loadPyodide();
    return new Response("xyz");
  },
};
