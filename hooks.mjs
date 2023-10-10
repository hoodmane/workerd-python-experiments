import { readFile } from 'node:fs/promises';


export async function load(url, context, nextLoad) {
  if (!url.startsWith("file://")) {
    return nextLoad(url, context);
  }
  const path = url.slice("file://".length);
  const extension = (path.match(/\.[^.]*$/) || [""])[0];
  if ([".zip", ".py", ".pyc", ".pyi", ".pyx", ".txt", ".typed", ".ini", ".tar"].includes(extension)) {
    if (extension === ".pyc") {
      // console.log(path);
    }
    const bin = await readFile(path);
    // console.log(path, bin.length);
    const b64 = bin.toString('base64');
    const source = `export default Buffer.from("${b64}", "base64");`
    return {format: 'module', shortCircuit: true, source};
  }
  if (path.endsWith("/dylinkInfo.json")) {
    const source = `export default {};`
    return {format: 'module', shortCircuit: true, source};
  }
  if ([".json"].includes(extension)) {
    const bin = await readFile(path);
    const b64 = bin.toString('base64');
    const source = `export default JSON.parse(new TextDecoder().decode(Buffer.from("${b64}", "base64")));`
    return {format: 'module', shortCircuit: true, source};
  }
  if ([".dat", ".c", ".pxd", ".h", ".build", ".a", ".in"].includes(extension)) {
    const source = `export default undefined;`
    return {format: 'module', shortCircuit: true, source};
  }
  if ([".wasm", ".so"].includes(extension)) {
    const bin = await readFile(path);
    const b64 = bin.toString('base64');
    const source = `export default new WebAssembly.Module(Buffer.from("${b64}", "base64"));`
    return {format: 'module', shortCircuit: true, source};
  }
  return nextLoad(url, context);
} 
