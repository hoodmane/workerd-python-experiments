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
