Evals the code search param as a Python string and `respond`s with the result.
I.e.,
http://localhost:8080/?code=import%20sys;%20print(sys.modules)

The "artifacts" directory comes from Pyodide's build artifacts.

Can rebuild by running `./build.sh`. Make sure Emscripten 3.1.45 is on your
path.


