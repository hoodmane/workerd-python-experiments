import { readFile } from 'node:fs/promises';

export async function load(url, context, nextLoad) {
  const path = url.slice("file://".length);
  if(path.endsWith(".zip") || path.endsWith(".py")) {
    const bin = await readFile(path);
    const b64 = bin.toString('base64');
    const source = `export default Buffer.from("${b64}", "base64");`
    return {format: 'module', shortCircuit: true, source};
  }
  if(path.endsWith(".dat")) {
    const bin = await readFile(path);
    const b64 = bin.toString('base64');
    const source = `export default undefined;`
    return {format: 'module', shortCircuit: true, source};
  }
  if (path.endsWith(".wasm") || path.endsWith(".so")) {
    const bin = await readFile(path);
    const b64 = bin.toString('base64');
    const source = `export default new WebAssembly.Module(Buffer.from("${b64}", "base64"));`
    return {format: 'module', shortCircuit: true, source};
  }
  return nextLoad(url, context);
} 
