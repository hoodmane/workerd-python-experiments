from js import fetch, Response, Object

async def onfetch(req):
    resp = await fetch("http://example.com")
    text = await resp.text()
    text = text.replace("xample", "xample with Python in workerd")
    to_insert = f"<p>Request was: {req.url}, {req.method}</p>"
    insertion_point = "permission.</p>"
    text = text.replace(insertion_point, insertion_point + to_insert)
    return Response.new(text, headers=Object.fromEntries([["Content-Type", "html"]]))
