# User code
from fastapi import FastAPI

my_awesome_api = FastAPI()

@my_awesome_api.get("/")
async def root():
    return {"message": "Hello World"}

@my_awesome_api.get("/route")
async def root():
    return {"message": "this is my custom route"}

@my_awesome_api.get("/favicon.ico")
async def root():
    return {"message": "here's a favicon I guess?"}



# ASGI implementation
from asyncio import Future, ensure_future
from inspect import isawaitable
def request_to_scope(req):
    from js import URL
    headers = [tuple(x) for x in req.headers]
    url = URL.new(req.url)
    scheme = url.protocol[:-1]
    path = url.pathname
    query_string = url.search[1:].encode()
    return {
        'asgi': {'spec_version': '2.3', 'version': '3.0'},
        'headers': headers,
        'http_version': '1.1',
        'method': req.method,
        "scheme": scheme,
        'path': path,
        'query_string': query_string,
        'type': 'http'
    }


async def start_application(app):
    it = iter([{'type': 'lifespan.startup'}, Future()])
    async def receive():
        res = next(it)
        if isawaitable(res):
            await res
        return res
    ready = Future()
    async def send(got):
        print("Application startup complete.")
        print("Uvicorn running")
        ready.set_result(None)
    ensure_future(app(
        {
        'asgi': {'spec_version': '2.0', 'version': '3.0'},
        'state': {},
        'type': 'lifespan'
        },
        receive,
        send
    ))
    await ready

async def process_request(app, req):
    status = None
    headers = None
    result = Future()
    async def receive():
        print("receive")
        1/0

    async def send(got):
        nonlocal status
        nonlocal headers
        if got["type"] == "http.response.start":
            status = got["status"]
            headers = got["headers"]
        if got["type"] == "http.response.body":
            from js import Response, Object
            from pyodide.ffi import to_js
            resp = Response.new(
                to_js(got["body"]),
                headers=Object.fromEntries(headers),
                status=status
            )
            result.set_result(resp)
    await app(request_to_scope(req), receive, send)
    return await result



async def onfetch(req):
    await start_application(my_awesome_api)
    return await process_request(my_awesome_api, req)
