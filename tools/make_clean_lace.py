"""OPTIONAL geometric lace set (cut-paper look). Not used by default: the walls use the de-gritted
wallpaper lace from tools/make_lace_and_sprites.py. Run this only if you want the geometric look back.

    python3 tools/make_clean_lace.py

Each wall texture tile covers 2.2 m of wall. Threads are drawn ~4 cm thick so they stay crisp at the PS1
resolution, with a slightly darker edge so they read as thread, not paper cut-outs. All tiles wrap seamlessly.
Every room keeps its own motif. Change COLORS or a design function and re-run.
"""
import math, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'textures')
S = 1024          # drawn at 2x, saved at 512
T = 18            # main thread width (at 2x)
t = 11            # fine thread width
WHITE = (246, 242, 248)
PINK = (247, 205, 226)


class Lace:
    def __init__(self):
        self.im = Image.new('L', (S, S), 0)
        self.d = ImageDraw.Draw(self.im)
        self.rim = None

    def _wrap(self, fn):
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                fn(ox, oy)

    def line(self, a, b, w=T):
        self._wrap(lambda ox, oy: self.d.line([(a[0] + ox, a[1] + oy), (b[0] + ox, b[1] + oy)], fill=255, width=w))
        for p in (a, b):  # round caps
            self.disk(p, w / 2)

    def poly(self, pts, w=T, closed=True):
        for i in range(len(pts) - (0 if closed else 1)):
            self.line(pts[i], pts[(i + 1) % len(pts)], w)

    def ring(self, c, r, w=T):
        self._wrap(lambda ox, oy: self.d.ellipse([c[0] - r + ox, c[1] - r + oy, c[0] + r + ox, c[1] + r + oy], outline=255, width=w))

    def disk(self, c, r):
        self._wrap(lambda ox, oy: self.d.ellipse([c[0] - r + ox, c[1] - r + oy, c[0] + r + ox, c[1] + r + oy], fill=255))

    def petal(self, c, ang, length, width, w=t, filled=False):
        pts = []
        for i in range(24):
            a = i / 24 * math.tau
            x, y = math.cos(a) * length / 2, math.sin(a) * width / 2
            x += length / 2
            pts.append((c[0] + x * math.cos(ang) - y * math.sin(ang), c[1] + x * math.sin(ang) + y * math.cos(ang)))
        if filled:
            self._wrap(lambda ox, oy: self.d.polygon([(px + ox, py + oy) for px, py in pts], fill=255))
        else:
            self.poly(pts, w)

    def rosette(self, c, r, n=8):
        self.ring(c, r * .45, t)
        for i in range(n):
            self.petal((c[0] + math.cos(i / n * math.tau) * r * .45, c[1] + math.sin(i / n * math.tau) * r * .45), i / n * math.tau, r * .6, r * .38)
        self.disk(c, r * .2)

    def save(self, name, colour):
        a = self.im.resize((512, 512), Image.LANCZOS).point(lambda v: 255 if v > 110 else 0)
        edge = ImageChops.subtract(a, a.filter(ImageFilter.MinFilter(3)))
        rgb = Image.new('RGB', (512, 512), colour)
        if getattr(self, 'rim', None) is not None:  # eyelet cloth: stitched rims + a faint weave so it isn't flat
            rim = self.rim.resize((512, 512), Image.LANCZOS).point(lambda v: 255 if v > 100 else 0)
            weave = Image.new('L', (512, 512), 0); wd = ImageDraw.Draw(weave)
            for k in range(0, 512, 4): wd.line([(k, 0), (k, 512)], fill=255); wd.line([(0, k), (512, k)], fill=255)
            rgb = Image.composite(Image.new('RGB', (512, 512), tuple(int(c * .93) for c in colour)), rgb, weave)
            rgb = Image.composite(Image.new('RGB', (512, 512), tuple(min(255, int(c * 1.03)) for c in colour)), rgb, rim)
        rgb = Image.composite(Image.new('RGB', (512, 512), tuple(int(c * .78) for c in colour)), rgb, edge)
        rgb.putalpha(a)
        rgb.save(os.path.join(OUT, name + '.png'), optimize=True)
        return rgb


def rose_trellis():  # vestibule, bedroom, outside walls: double diamond trellis with rosettes
    L, u = Lace(), S / 4
    for k in range(-8, 9):
        for off in (-13, 13):
            L.line((k * u + off, 0), (k * u + S + off, S), t)
            L.line((k * u + off, S), (k * u + S + off, 0), t)
    for i in range(5):
        for j in range(5):
            L.rosette((i * u, j * u), 64)
            L.disk(((i + .5) * u, (j + .5) * u), 12)
            for a in range(4):
                L.disk(((i + .5) * u + math.cos(a * math.pi / 2) * 26, (j + .5) * u + math.sin(a * math.pi / 2) * 26), 9)
    return L


def scallops():  # passage: fish-scale scallops with a trefoil in each
    L, u = Lace(), S / 5
    for row in range(-1, 12):
        y = row * u / 2
        for col in range(-1, 7):
            x = col * u + (u / 2 if row % 2 else 0)
            L._wrap(lambda ox, oy, x=x, y=y: L.d.arc([x - u / 2 + ox, y - u / 2 + oy, x + u / 2 + ox, y + u / 2 + oy], 0, 180, fill=255, width=T))
            L.ring((x, y + u * .2), 18, t)
            L.line((x, y + u * .2 + 18), (x, y + u / 2), t)
    return L


def star_grid():  # courtyard: square grid with eight-point stars at the joins
    L, u = Lace(), S / 4
    for k in range(5):
        L.line((k * u, 0), (k * u, S), t); L.line((0, k * u), (S, k * u), t)
    for i in range(5):
        for j in range(5):
            c, r = (i * u, j * u), 56
            for rot in (0, math.pi / 4):
                L.poly([(c[0] + math.cos(rot + a * math.pi / 2) * r, c[1] + math.sin(rot + a * math.pi / 2) * r) for a in range(4)], t)
            L.disk(c, 16)
            L.ring(((i + .5) * u, (j + .5) * u), 30, t)
            L.disk(((i + .5) * u, (j + .5) * u), 9)
    return L


def vines():  # archive: climbing vines with leaves between ladder bars
    L, u = Lace(), S / 4
    for k in range(4):
        x0 = k * u + u / 2
        pts = [(x0 + math.sin(y / S * math.tau * 2) * 34, y) for y in range(0, S + 1, 16)]
        L.poly(pts, T, closed=False)
        for n in range(8):
            y = n * S / 8 + 32; x = x0 + math.sin(y / S * math.tau * 2) * 34; side = 1 if n % 2 else -1
            L.petal((x, y), math.pi / 2 + side * 1.1, 64, 30, filled=True)
        L.line((k * u, 0), (k * u, S), t)
    for n in range(4):
        L.line((0, n * u), (S, n * u), t)
    return L


def hearts():  # fitting room: hearts inside a diamond lattice
    L, u = Lace(), S / 4
    for k in range(-8, 9):
        L.line((k * u, 0), (k * u + S, S), t); L.line((k * u, S), (k * u + S, 0), t)
    for i in range(5):
        for j in range(5):
            c = ((i + .5) * u, (j + .5) * u + 6)
            pts = []
            for n in range(40):
                a = n / 40 * math.tau
                x = 16 * math.sin(a) ** 3; y = -(13 * math.cos(a) - 5 * math.cos(2 * a) - 2 * math.cos(3 * a) - math.cos(4 * a))
                pts.append((c[0] + x * 3.2, c[1] + y * 3.2))
            L.poly(pts, T)
            L.disk((i * u, j * u), 22)
    return L


def fern():  # gallery: leafy sprigs in a diagonal lattice
    L, u = Lace(), S / 4
    for k in range(-8, 9):
        L.line((k * u, 0), (k * u + S, S), t); L.line((k * u, S), (k * u + S, 0), t)
    for i in range(5):
        for j in range(5):
            cx, cy = (i + .5) * u, (j + .5) * u
            L.line((cx, cy - 80), (cx, cy + 80), t)
            for n in range(5):
                y = cy - 64 + n * 30; ln = 50 - abs(n - 2) * 8
                L.petal((cx, y), -.5, ln, 22, filled=True); L.petal((cx, y), math.pi + .5, ln, 22, filled=True)
    return L


def snowflakes():  # atelier: cross-stitch style snowflakes joined by threads
    L, u = Lace(), S / 4
    for i in range(5):
        for j in range(5):
            c = (i * u + (u / 2 if j % 2 else 0), j * u)
            L.line((c[0], c[1] - u / 2), (c[0], c[1] + u / 2), t)  # stem joining the bars above and below
            for a in range(6):
                ang = math.pi / 6 + a * math.pi / 3
                tip = (c[0] + math.cos(ang) * 84, c[1] + math.sin(ang) * 84)
                L.line(c, tip, T)
                for k in (.45, .72):
                    m = (c[0] + math.cos(ang) * 84 * k, c[1] + math.sin(ang) * 84 * k)
                    for s in (-1, 1):
                        L.line(m, (m[0] + math.cos(ang + s * .8) * 30, m[1] + math.sin(ang + s * .8) * 30), t)
            L.disk(c, 20)
    for k in range(5):
        L.line((0, k * u + u / 2), (S, k * u + u / 2), t)
    return L


def honeycomb():  # textile room: hexagons with a small flower in each (sized so the tile wraps exactly)
    L = Lace()
    w, h = S / 5, S / 6            # 5 columns, 6 rows -> seamless
    rx, ry = w / math.sqrt(3), h / 1.5
    for row in range(-1, 8):
        for col in range(-1, 7):
            cx = col * w + (w / 2 if row % 2 else 0); cy = row * h
            L.poly([(cx + math.cos(math.pi / 6 + a * math.pi / 3) * rx, cy + math.sin(math.pi / 6 + a * math.pi / 3) * ry) for a in range(6)], t)
            for a in range(5):
                L.disk((cx + math.cos(a / 5 * math.tau - math.pi / 2) * 24, cy + math.sin(a / 5 * math.tau - math.pi / 2) * 24), 13)
            L.disk((cx, cy), 10)
    return L


def eyelet():  # vestibule, bedroom, outside walls: broderie anglaise, white cloth with embroidered eyelet holes
    L, u = Lace(), S / 4
    L.d.rectangle([0, 0, S, S], fill=255)           # solid cloth...
    holes = Image.new('L', (S, S), 0); hd = ImageDraw.Draw(holes)
    def hole(c, rx, ry, ang=0):
        pts = [(c[0] + math.cos(a / 20 * math.tau) * rx * math.cos(ang) - math.sin(a / 20 * math.tau) * ry * math.sin(ang),
                c[1] + math.cos(a / 20 * math.tau) * rx * math.sin(ang) + math.sin(a / 20 * math.tau) * ry * math.cos(ang)) for a in range(20)]
        for ox in (-S, 0, S):
            for oy in (-S, 0, S):
                hd.polygon([(x + ox, y + oy) for x, y in pts], fill=255)
    for i in range(4):
        for j in range(4):
            cx, cy = i * u + (u / 2 if j % 2 else 0), j * u
            hole((cx, cy), 15, 15)                                   # flower centre
            for k in range(6):                                       # six petal eyelets
                a = k / 6 * math.tau
                hole((cx + math.cos(a) * 52, cy + math.sin(a) * 52), 26, 12, a)
            for k in range(4):                                       # leaf eyelets on a little stem
                a = math.pi / 4 + k * math.pi / 2
                hole((cx + math.cos(a) * 100, cy + math.sin(a) * 100), 16, 7, a)
            hole((cx + u / 2, cy), 9, 9)                             # small round eyelets between flowers
    # ...with a raised satin-stitch rim around every hole
    rim = ImageChops.subtract(holes.filter(ImageFilter.MaxFilter(9)), holes)
    L.im = ImageChops.subtract(L.im, holes)
    L.rim = rim
    return L


DESIGNS = {  # texture name: (design, thread colour)
    'lace-rose': (eyelet, WHITE),            # rose_trellis() is the busier alternative
    'lace-passage': (scallops, WHITE),
    'lace-courtyard': (star_grid, WHITE),
    'lace-archive': (vines, WHITE),
    'lace-fitting': (hearts, PINK),
    'lace-gallery': (fern, PINK),
    'lace-atelier': (snowflakes, PINK),
    'lace-textile': (honeycomb, PINK),
}

if __name__ == '__main__':
    for name, (fn, col) in DESIGNS.items():
        fn().save(name, col)
    print('wrote', len(DESIGNS), 'lace tiles to', os.path.abspath(OUT))
