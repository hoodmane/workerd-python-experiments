#!/usr/bin/python3
from pathlib import Path
import subprocess

def get_info(file, type):
    res = subprocess.run(["wasm-objdump", "-j", type, "-x", file], capture_output=True, check=True, encoding="utf8")
    for line in res.stdout.splitlines():
        if line.startswith(" - "):
            yield line
        
    
def main():
    s = set()
    for sofile in Path(".venv-pyodide").glob("**/*.so"):
        for line in get_info(sofile, "Import"):
            symName = line.rpartition(".")[-1]
            s.add("_" +  symName)
    for sofile in Path(".venv-pyodide").glob("**/*.so"):
        for line in get_info(sofile, "Export"):
            symName = line[:-1].rpartition('"')[-1]
            s.discard("_" +  symName)
    s.discard("___indirect_function_table")
    s.discard("_memory")
    print(",".join(sorted(s)), file=open("exports.list", "w"))

if __name__ == "__main__":
    main()
