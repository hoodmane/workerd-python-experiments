import numpy as np

def gradient():
    x = np.ones((50, 50, 4))
    x[:, :, 0:4] = [1, 1, 0, 1]

    y = np.ones((50, 50, 4))
    y[:, :, 0:4] = [0.3, 0, 1, 1]

    c = np.linspace(0, 1, 50)[:, None, None]
    gradient = x + (y - x) * c
    return (255 * gradient).astype(np.uint8)


async def onfetch(req):
    from js import Response, Object
    from pyodide.ffi import to_js

    print(req.url)
    if req.url.endswith("gradient"):
        a = gradient()
        b = to_js(a.flatten())
        return Response.new(b)
    return Response.new(
        """
<html>
    <head>
        <title>Numpy example</title>
    </head>
    <body>
        <canvas></canvas>
        <script type="module">
            let resp, img;
            resp = await fetch("gradient");
            globalThis.buf = new Uint8ClampedArray(await resp.arrayBuffer());
            img = new ImageData(buf, 50, 50);
            const ctx = document.querySelector("canvas").getContext("2d");
            globalThis.ctx = ctx;
            globalThis.img = img;
            ctx.putImageData(img, 0, 0);
        </script>
    </body>
</html>
        """,
        headers=Object.fromEntries([["Content-Type", "html"]]),
    )
