async def onfetch(req):
    from js import Response, Object
    return Response.new(
        """
<html>
    <head>
        <title>Hello?</title>
    </head>
    <body>
        Hello from python!
    </body>
</html>
        """,
        headers=Object.fromEntries([["Content-Type", "html"]]),
    )
