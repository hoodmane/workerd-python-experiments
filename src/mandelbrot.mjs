export function mandelbrot(h) {
    const maxit = 20
    const limit = 2.0;

    const w = h;
    const grid = new Uint8Array(w*h);

    for (let y = 0; y < h; ++y) {
        for (let x = 0; x < w; ++x) {
            let zr = 0;
            let zi = 0;
            let tr = 0;
            let ti = 0;
            let cr = 2 * x / w - 1.5;
            let ci = 2 * y / h - 1;
            let i = 0;
            for (i = 0; i < maxit && (tr * tr + ti * ti <= limit * limit); ++i) {
                zi = 2 * zr * zi + ci;
                zr = tr - ti + cr;
                tr = zr * zr;
                ti = zi * zi;
            }
            grid[y*w + x] = i;
        }
    }
    return grid;
}
