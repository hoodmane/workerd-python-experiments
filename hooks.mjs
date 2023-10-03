import { readFile } from 'node:fs/promises';

export async function load(url, context, nextLoad) {
  if(url.endsWith(".zip")) {
    url = url.slice("file://".length);
    const bin = await readFile(url);
    const b64 = bin.toString('base64');
    const source = `export default Buffer.from("${b64}", "base64");`
    return {format: 'module', shortCircuit: true, source};
  }
  if(url.endsWith(".dat")) {
    url = url.slice("file://".length);
    const bin = await readFile(url);
    const b64 = bin.toString('base64');
    const source = `export default undefined;`
    return {format: 'module', shortCircuit: true, source};
  }
  if (url.endsWith(".wasm")) {
    url = url.slice("file://".length);
    const bin = await readFile(url);
    const b64 = bin.toString('base64');
    const source = `export default new WebAssembly.Module(Buffer.from("${b64}", "base64"));`
    return {format: 'module', shortCircuit: true, source};
  }
  return nextLoad(url, context);
} 
