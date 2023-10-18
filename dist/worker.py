# User code
from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
from pydantic import BaseModel


my_awesome_api = FastAPI()
app = my_awesome_api


@my_awesome_api.get("/hello")
async def root():
    return {"message": "Hello World"}


@my_awesome_api.get("/route")
async def root():
    return {"message": "this is my custom route"}


@my_awesome_api.get("/favicon.ico")
async def root():
    return {"message": "here's a favicon I guess?"}


@app.get("/items/{item_id}")
async def read_item(item_id: int):
    return {"item_id": item_id}


class Item(BaseModel):
    name: str
    description: str | None = None
    price: float
    tax: float | None = None


@app.post("/items/")
async def create_item(item: Item):
    return item


@app.put("/items/{item_id}")
async def create_item(item_id: int, item: Item, q: str | None = None):
    result = {"item_id": item_id, **item.dict()}
    if q:
        result.update({"q": q})
    return result


html = """
<!DOCTYPE html>
<html>
    <head>
        <title>Echo WebSocket</title>
    </head>
    <body>
        <h1>Echo WebSocket</h1>
        <form action="" onsubmit="sendMessage(event)">
            <input type="text" id="messageText" autocomplete="off"/>
            <button>Send</button>
        </form>
        <ul id='messages'>
        </ul>
        <script>
            const u = new URL("/ws", location);
            u.protocol = "ws";
            const ws = new WebSocket(u);
            ws.onmessage = function(event) {
                const messages = document.querySelector('#messages');
                const message = document.createElement('li');
                const content = document.createTextNode(event.data);
                message.appendChild(content);
                messages.appendChild(message);
            };
            function sendMessage(event) {
                const input = document.querySelector("#messageText");
                ws.send(input.value);
                input.value = '';
                event.preventDefault();
            }
        </script>
    </body>
</html>
"""


@app.get("/ws-example")
async def get():
    return HTMLResponse(html)


index = """
<!DOCTYPE html>
<html>
    <head>
        <title>FastAPI Worker</title>
    </head>
    <body>
        <h1>FastAPI Worker Index</h1>
        <h3><a href="docs">My Special API Docs</a></h3>
        <h3><a href="ws-example">Echo WebSocket example</a></h3>
    </body>
</html>
"""



@app.get("/")
async def get():
    return HTMLResponse(index)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Message text was: {data}")
