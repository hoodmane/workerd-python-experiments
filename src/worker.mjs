import { doStuff } from "./python.mjs";

// await doStuff();

export default {
  async fetch(request) {
    const url = new URL(request.url)
    const code = url.searchParams.get("code");
    console.log(code);
    const res = await doStuff(code);
    return new Response(res);
  },
};
