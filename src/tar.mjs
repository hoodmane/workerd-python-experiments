const decoder = new TextDecoder();
function decodeString(buf) {
  const nullIdx = buf.indexOf(0);
  if (nullIdx >= 0) {
    buf = buf.subarray(0, nullIdx);
  }
  return decoder.decode(buf);
}
function decodeField(buf, offset, size) {
  return decodeString(buf.subarray(offset, offset + size));
}
function decodeNumber(buf, offset, size) {
  return parseInt(decodeField(buf, offset, size), 8);
}

function decodeHeader(buf) {
  const nameBase = decodeField(buf, 0, 100);
  const namePrefix = decodeField(buf, 345, 155);
  const path = namePrefix + nameBase;
  const mode = decodeNumber(buf, 100, 8);
  const size = decodeNumber(buf, 124, 12);
  const modtime = decodeNumber(buf, 136, 12);
  const type = Number(String.fromCharCode(buf[156]));
  return {
    path,
    name: path,
    mode,
    size,
    modtime,
    type,
    parts: [],
    children: undefined,
  };
}

export function tarInfo(buf) {
  const directories = [];
  const soFiles = [];
  const root = { children: new Map() };
  let directory = root;
  while (true) {
    const info = decodeHeader(buf);
    if (info.path === "") {
      return [root.children, soFiles];
    }
    while (directories.length && !info.name.startsWith(directory.path)) {
      directory = directories.pop();
    }
    if (info.type === 5) {
      // a directory
      directories.push(directory);
      info.parts = info.path.slice(0, -1).split("/");
      info.name = info.parts.at(-1);
      info.children = new Map();
      directory.children.set(info.name, info);
      directory = info;
    } else {
      info.contents = buf.subarray(512, 512 + info.size);
      info.name = info.path.slice(directory.path.length);
      if (info.name.endsWith(".so")) {
        soFiles.push(info.path);
      }
      directory.children.set(info.name, info);
    }
    buf = buf.subarray(512 * Math.ceil(info.size / 512 + 1));
  }
}

// console.log(f(numpy_tar).children[0]);
