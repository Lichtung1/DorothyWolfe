"""Roughs up the clean lace carpets in assets/rug-source/ into lived-in rug textures.

    python3 tools/rough_rugs.py            # every lace_*.png in assets/rug-source/
    python3 tools/rough_rugs.py --seed=7   # a different pattern of wear

For each source carpet (128x256, one shared 16-colour palette) it writes assets/textures/rug-lace-<name>.png:
faded, with a worn walking path, dye banding, stains and a frayed fringe.

Everything stays inside the same 16 colours (like a real PS1 4-bit texture) and every change is dithered,
so it reads as pixel art rather than a blurry filter:
  - fade: the candy pinks become dusty rose, the plum blacks become charcoal, white ages to ivory;
    the hot pink stays as the one bright accent,
  - abrash: horizontal bands where the wool took the dye a shade lighter or darker, as in hand-dyed rugs,
  - wear: the middle (where feet go) loses contrast and drifts toward grey-ivory,
  - pile: scattered single pixels a shade off, so flat areas look woven,
  - stains: a couple of faint tea-coloured blotches,
  - fringe: the gaps between tassels made see-through, and some tassels missing or shortened.
"""
import glob, math, os, random, sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC, OUT = os.path.join(ROOT, 'assets', 'rug-source'), os.path.join(ROOT, 'assets', 'textures')
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], float) / 16 + 1 / 32

# The carpets' 16 colours -> faded versions (source colour: approximate, matched to the nearest).
FADE = [
    ((16, 10, 16), (12, 10, 13)),      # black
    ((44, 22, 38), (46, 40, 46)),      # plum black -> charcoal
    ((88, 86, 100), (92, 86, 94)),     # dark silver
    ((148, 148, 162), (150, 144, 150)),  # silver
    ((200, 200, 212), (200, 196, 200)),  # light silver
    ((248, 246, 250), (236, 228, 222)),  # white -> aged ivory
    ((228, 218, 226), (218, 206, 204)),  # lace shade
    ((120, 24, 64), (118, 66, 84)),    # deep rose -> dusty
    ((196, 58, 112), (188, 104, 132)),  # rose -> dusty
    ((240, 96, 160), (236, 108, 168)),  # hot pink: kept as the accent
    ((246, 148, 190), (216, 156, 176)),  # pink -> dusty rose
    ((250, 192, 214), (234, 196, 206)),  # light pink
    ((252, 224, 236), (236, 218, 220)),  # blush
    ((78, 16, 48), (68, 48, 58)),      # dark magenta -> near charcoal
    ((172, 120, 148), (160, 128, 140)),  # mauve
    ((122, 100, 124), (118, 104, 112)),  # lilac grey
]


def lum(c): return .3 * c[0] + .59 * c[1] + .11 * c[2]


def smooth_noise(w, h, cell, rnd):
    """Value noise in 0..1, bilinear between random points every `cell` pixels."""
    gw, gh = w // cell + 2, h // cell + 2
    g = np.array([[rnd.random() for _ in range(gw)] for _ in range(gh)])
    ys, xs = np.mgrid[0:h, 0:w] / cell
    x0, y0 = xs.astype(int), ys.astype(int); fx, fy = xs - x0, ys - y0
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx
    b = g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx
    return a * (1 - fy) + b * fy


def rough(path, seed, floor=True):
    rnd = random.Random(seed)
    src = np.asarray(Image.open(path).convert('RGB'), float)
    h, w = src.shape[:2]
    pal = np.array([f for _, f in FADE], float)
    srcpal = np.array([s for s, _ in FADE], float)
    idx = ((src[:, :, None, :] - srcpal[None, None]) ** 2).sum(-1).argmin(-1)  # pixel -> palette index

    def nearest_other(target, me):
        d = ((pal - target) ** 2).sum(-1); d[me] = 1e9; return int(d.argmin())
    lighter = [nearest_other(np.minimum(255, c * 1.12 + 8), i) for i, c in enumerate(pal)]
    darker = [nearest_other(c * .84, i) for i, c in enumerate(pal)]
    worn = [nearest_other(c + (np.array([226, 214, 208]) * (lum(c) / 255 * .5 + .5) - c) * .6, i) for i, c in enumerate(pal)]

    th = BAYER[np.arange(h)[:, None] % 4, np.arange(w)[None, :] % 4]
    out = idx.copy()
    # abrash: a few horizontal dye bands
    band = np.zeros(h)
    for _ in range(rnd.randint(2, 4)):
        y0, bh, s = rnd.randrange(h), rnd.randint(8, 28), rnd.choice([-1, 1]) * rnd.uniform(.25, .45)
        band[max(0, y0 - bh // 2):y0 + bh // 2] += s
    band = np.convolve(band, np.ones(5) / 5, 'same')
    B = np.broadcast_to(band[:, None], (h, w))
    out = np.where((B > 0) & (B > th), np.take(lighter, out), out)
    out = np.where((B < 0) & (-B > th), np.take(darker, out), out)
    if floor:
        # worn walking path: an ellipse down the middle, broken up by noise
        ys, xs = np.mgrid[0:h, 0:w]
        e = 1 - np.sqrt(((xs - w / 2) / (w * .42)) ** 2 + ((ys - h / 2) / (h * .4)) ** 2)
        W = np.clip(e * 1.4, 0, 1) * (.35 + .65 * smooth_noise(w, h, 14, rnd)) * .62
        out = np.where(W > th, np.take(worn, out), out)
        # stains
        for _ in range(rnd.randint(1, 2)):
            cx, cy, r = rnd.uniform(.2, .8) * w, rnd.uniform(.25, .75) * h, rnd.uniform(5, 11)
            S = np.clip(1 - np.hypot(xs - cx, ys - cy) / r, 0, 1) * .55
            out = np.where(S > th, np.take(darker, out), out)
    # pile: scattered single pixels a shade off
    noise = np.array([[rnd.random() for _ in range(w)] for _ in range(h)])
    out = np.where(noise < .025, np.take(darker, out), np.where(noise > .985, np.take(lighter, out), out))
    rgba = np.dstack([pal[out], np.full((h, w), 255.)]).astype('uint8')
    # frayed fringe: tassels missing or shortened (the fringe is the top and bottom 1/32 of the carpet)
    fr = max(3, round(8 * w / 128))
    for x in range(w):  # the gaps between tassels are see-through (they were painted in a flat colour)
        if (x - (w // 2 - 1)) % 2:
            for k in range(round(fr * .7)): rgba[k, x, 3] = rgba[h - 1 - k, x, 3] = 0
    for x in range(w):
        for top in (True, False):
            r = rnd.random()
            cut = fr if r < .12 else rnd.randint(1, fr // 2) if r < .4 else 0
            for k in range(cut):
                rgba[k if top else h - 1 - k, x, 3] = 0
    return Image.fromarray(rgba, 'RGBA')


def main(argv):
    seed = next((int(a.split('=')[1]) for a in argv if a.startswith('--seed=')), 3)
    files = sorted(glob.glob(os.path.join(SRC, 'lace_*.png')))
    if not files: print('Nothing to do: put the lace carpets (lace_<name>.png, 128x256) in assets/rug-source/'); return
    for i, f in enumerate(files):
        name = os.path.basename(f)[5:-4]
        dst = os.path.join(OUT, 'rug-lace-%s.png' % name)
        rough(f, seed * 100 + i * 7).save(dst, optimize=True)
        print('wrote', os.path.relpath(dst, ROOT))


if __name__ == '__main__':
    main(sys.argv[1:])
