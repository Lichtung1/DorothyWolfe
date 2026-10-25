"""Placeholder garments for the gallery rails (pixel art, in the palette).

    python3 tools/make_garments.py

Writes assets/garments/placeholder-*.png. They are stand-ins: replace them with photos of Opal's real
pieces and list them in assets/garments/garments.json (see the README in that folder).
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'garments')
os.makedirs(OUT, exist_ok=True)
W, H, K = 64, 160, 4  # drawn size, upscale factor

K_ = (20, 18, 22); C_ = (46, 43, 50); G_ = (110, 106, 118); S_ = (190, 188, 198); W_ = (240, 236, 242)
P_ = (243, 192, 215); M_ = (222, 156, 190); H_ = (244, 95, 240); HD = (196, 60, 196)


def shade(c, f): return tuple(max(0, min(255, int(v * f))) for v in c)


class G:
    def __init__(self):
        self.im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); self.d = ImageDraw.Draw(self.im)
        # hanger
        self.d.arc([28, 2, 36, 10], 180, 360, fill=S_ + (255,), width=1)
        self.d.line([(36, 6), (36, 9)], fill=S_ + (255,))
        self.d.line([(32, 10), (14, 18)], fill=S_ + (255,), width=2)
        self.d.line([(32, 10), (50, 18)], fill=S_ + (255,), width=2)

    def poly(self, pts, c): self.d.polygon(pts, fill=c + (255,))
    def rect(self, box, c): self.d.rectangle(box, fill=c + (255,))
    def px(self, x, y, c): self.d.point((x, y), fill=c + (255,))

    def lace_hem(self, y, x0, x1, c, depth=4):
        for x in range(x0, x1 + 1):
            k = (x - x0) % 6
            for dy in range(depth):
                if (k in (0, 5) and dy < depth - 1) or (k in (1, 4) and dy < depth) or k in (2, 3):
                    if not (dy == depth - 1 and k in (2, 3)) or (x % 2 == 0):
                        self.px(x, y + dy, c)
            if (x - x0) % 2 == 0: self.px(x, y + depth, c)

    def finish(self, name):
        a = self.im.getchannel('A'); px = self.im.load()
        for y in range(H):  # side shading: light from the left, a darker right edge
            row = [x for x in range(W) if a.getpixel((x, y))]
            if not row: continue
            x0, x1 = row[0], row[-1]
            for x in row:
                r, g, b, al = px[x, y]
                t = (x - x0) / max(1, x1 - x0)
                f = 1.08 if t < .2 else (.82 if t > .82 else 1)
                px[x, y] = shade((r, g, b), f) + (al,)
        self.im.resize((W * K, H * K), Image.NEAREST).save(os.path.join(OUT, name + '.png'), optimize=True)


def slip():  # black bias-cut slip with pink lace hem and thin straps
    g = G()
    g.d.line([(23, 18), (25, 34)], fill=S_ + (255,)); g.d.line([(41, 18), (39, 34)], fill=S_ + (255,))
    g.poly([(23, 34), (32, 42), (41, 34), (43, 60), (47, 128), (17, 128), (21, 60)], K_)
    g.poly([(23, 34), (32, 42), (41, 34), (40, 38), (32, 45), (24, 38)], P_)  # lace V trim
    g.lace_hem(126, 17, 47, P_, 5)
    for y in range(60, 126, 9): g.px(25 + (y // 9) % 3, y, C_)
    g.finish('placeholder-1')


def babydoll():  # light pink babydoll with puff sleeves and a white lace collar
    g = G()
    g.poly([(18, 20), (46, 20), (48, 50), (16, 50)], P_)
    for s in (-1, 1):
        cx = 32 + s * 17
        g.d.ellipse([cx - 7, 19, cx + 7, 35], fill=M_ + (255,))
    g.poly([(18, 48), (46, 48), (58, 104), (6, 104)], P_)
    g.rect([16, 46, 48, 49], H_)  # empire seam ribbon
    g.poly([(31, 49), (33, 49), (36, 56), (28, 56)], H_)  # bow tail
    g.d.ellipse([22, 17, 42, 29], fill=W_ + (255,)); g.d.ellipse([26, 15, 38, 23], fill=(0, 0, 0, 0))
    g.lace_hem(102, 6, 58, W_, 5)
    g.finish('placeholder-2')


def coat():  # long silver coat, white fur collar and cuffs, black buttons
    g = G()
    g.poly([(14, 20), (50, 20), (54, 140), (10, 140)], S_)
    g.poly([(14, 20), (6, 26), (2, 96), (10, 98), (14, 40)], shade(S_, .92))
    g.poly([(50, 20), (58, 26), (62, 96), (54, 98), (50, 40)], shade(S_, .92))
    for x0 in (1, 53): g.d.ellipse([x0, 92, x0 + 10, 102], fill=W_ + (255,))
    g.d.ellipse([12, 14, 52, 38], fill=W_ + (255,)); g.poly([(28, 30), (36, 30), (32, 40)], K_)
    g.d.line([(32, 40), (32, 138)], fill=G_ + (255,))
    for y in range(50, 130, 14): g.rect([34, y, 36, y + 2], K_)
    g.rect([10, 136, 54, 140], W_)
    g.finish('placeholder-3')


def blouse_skirt():  # white blouse with puff sleeves, long black skirt with an embroidered pink band
    g = G()
    g.poly([(18, 20), (46, 20), (46, 54), (18, 54)], W_)
    for s in (-1, 1):
        cx = 32 + s * 19
        g.d.ellipse([cx - 8, 18, cx + 8, 46], fill=W_ + (255,))
        g.rect([cx - 3, 44, cx + 3, 48], P_)
    g.d.arc([24, 16, 40, 28], 0, 180, fill=H_ + (255,))
    g.poly([(18, 54), (46, 54), (56, 148), (8, 148)], K_)
    g.rect([18, 52, 46, 56], C_)
    for x in range(10, 55):
        y = 134 + (1 if x % 4 < 2 else 0)
        g.px(x, y, P_); g.px(x, y + 3, P_)
        if x % 6 == 0: g.rect([x - 1, y + 1, x + 1, y + 2], H_)
    g.finish('placeholder-4')


def bow_mini():  # hot pink mini with a big black bow
    g = G()
    g.d.line([(24, 18), (26, 30)], fill=H_ + (255,), width=2); g.d.line([(40, 18), (38, 30)], fill=H_ + (255,), width=2)
    g.poly([(22, 30), (42, 30), (44, 52), (54, 92), (10, 92), (20, 52)], H_)
    g.poly([(32, 46), (25, 41), (25, 51)], K_); g.poly([(32, 46), (39, 41), (39, 51)], K_)
    g.rect([30, 44, 34, 48], K_)
    g.poly([(31, 48), (28, 60), (30, 60), (32, 50)], K_); g.poly([(33, 48), (36, 60), (34, 60), (32, 50)], K_)
    for x in range(12, 54, 3): g.px(x, 90, HD)
    g.finish('placeholder-5')


def nightgown():  # long white lace nightgown
    g = G()
    g.d.line([(24, 18), (25, 30)], fill=W_ + (255,)); g.d.line([(40, 18), (39, 30)], fill=W_ + (255,))
    g.poly([(22, 30), (42, 30), (44, 46), (54, 150), (10, 150), (20, 46)], W_)
    for y in range(31, 46):  # open lace yoke
        for x in range(21, 44):
            if (x + y) % 3 == 0 and g.im.getpixel((x, y))[3]: g.px(x, y, S_)
    g.rect([20, 46, 44, 47], P_)
    for y in range(60, 140, 16):
        for x in range(14, 52, 8): g.px(x + (y // 16) % 2 * 4, y, S_)
    g.lace_hem(146, 10, 54, P_, 6)
    g.finish('placeholder-6')


if __name__ == '__main__':
    for f in (slip, babydoll, coat, blouse_skirt, bow_mini, nightgown): f()
    print('wrote 6 placeholder garments to', os.path.abspath(OUT))
