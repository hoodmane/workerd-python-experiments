import numpy as np


def mandelbrot(h, w, maxit=20, r=2):
    """Returns an image of the Mandelbrot fractal of size (h,w)."""

    x = np.linspace(-2.5, 1.5, h)
    y = np.linspace(-1.5, 1.5, w)
    A, B = np.meshgrid(x, y)
    C = A + B * 1j
    z = np.zeros_like(C)
    divtime = maxit + np.zeros(z.shape, dtype=int)

    for i in range(maxit):
        z = z**2 + C
        diverge = abs(z) > r  # who is diverging
        div_now = diverge & (divtime == maxit)  # who is diverging now
        divtime[div_now] = i  # note when
        z[diverge] = r  # avoid diverging too much
    return divtime


async def onfetch(req):
    from js import performance, Response

    t1 = performance.now()
    print(t1)
    res = mandelbrot(1600, 1600)
    print(res[800, 800])
    t2 = performance.now()
    print(t2)
    return Response.new(f"Time: {t2 - t1}", statusText=res[800, 1448])
