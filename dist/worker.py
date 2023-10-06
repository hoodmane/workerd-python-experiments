from js import fetch, Response, Object
from markupsafe import Markup, escape
print(escape)

async def onfetch(req):
    resp = await fetch("http://example.com")
    text = await resp.text()
    text = text.replace("xample", "xample with Python in workerd")
    template = Markup("<p>Hello <em>{name}</em></p>")
    print(escape, type(escape))
    template.format(name='"World"')

    to_insert = f"<p>Request was: {req.url}, {req.method}</p>{template}"
    insertion_point = "permission.</p>"
    text = text.replace(insertion_point, insertion_point + to_insert)
    return Response.new(text, headers=Object.fromEntries([["Content-Type", "html"]]))
