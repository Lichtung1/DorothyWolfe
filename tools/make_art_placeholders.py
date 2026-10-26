"""Placeholder wall art for the frames around the house (stand-ins until the real pieces go in).

    python3 tools/make_art_placeholders.py

Writes assets/art/*.png in Dorothy's palette (black, silver, light pink, a little hot pink; no red, no plum).
Each is drawn at the aspect ratio of its frame (see ART in decor.js and assets/art/README.txt).
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'art')
os.makedirs(OUT, exist_ok=True)
K = (18, 16, 20); C = (44, 40, 48); G = (112, 108, 120); S = (192, 190, 200); W = (240, 236, 242)
P = (243, 192, 215); M = (220, 150, 188); H = (244, 95, 240); NIGHT = (34, 26, 44)
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'


def canvas(w, h, bg=K, alpha=False):
    im = Image.new('RGBA', (w, h), bg + (0 if alpha else 255,))
    return im, ImageDraw.Draw(im)


def grain(im, amt=10, seed=1):
    random.seed(seed)
    n = Image.effect_noise(im.size, amt).convert('L')
    r, g, b, a = im.split()
    blend = lambda ch: Image.blend(ch, n, .06)
    return Image.merge('RGBA', (blend(r), blend(g), blend(b), a))


def rose(d, cx, cy, r, col=P, dark=M, centre=H):
    for i in range(6):
        a = i / 6 * math.tau
        d.ellipse([cx + math.cos(a) * r * .55 - r * .6, cy + math.sin(a) * r * .55 - r * .6, cx + math.cos(a) * r * .55 + r * .6, cy + math.sin(a) * r * .55 + r * .6], fill=dark + (255,))
    d.ellipse([cx - r * .85, cy - r * .85, cx + r * .85, cy + r * .85], fill=col + (255,))
    d.arc([cx - r * .55, cy - r * .55, cx + r * .55, cy + r * .55], 200, 520, fill=dark + (255,), width=max(2, int(r * .12)))
    d.ellipse([cx - r * .22, cy - r * .22, cx + r * .22, cy + r * .22], fill=centre + (255,))


def leaf(d, cx, cy, ang, ln, wd, col=S):
    pts = []
    for i in range(16):
        t = i / 15 * math.pi
        x, y = ln * i / 15, math.sin(t) * wd
        pts.append((cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang)))
    for i in range(15, -1, -1):
        t = i / 15 * math.pi
        x, y = ln * i / 15, -math.sin(t) * wd
        pts.append((cx + x * math.cos(ang) - y * math.sin(ang), cy + x * math.sin(ang) + y * math.cos(ang)))
    d.polygon(pts, fill=col + (255,))


def moonlit_river(w=640, h=480):  # after Kuindzhi's 'Moonlit Night on the Dnieper'
    im, d = canvas(w, h)
    for y in range(h):
        t = y / h
        c = tuple(int(NIGHT[i] * (1 - t) + (60, 52, 70)[i] * t) for i in range(3)) if t < .55 else tuple(int(v * .6) for v in NIGHT)
        d.line([(0, y), (w, y)], fill=c + (255,))
    mx, my = int(w * .62), int(h * .26)
    for r, a in ((70, 30), (48, 60), (30, 120)):
        d.ellipse([mx - r, my - r, mx + r, my + r], fill=(230, 214, 232, a))
    d.ellipse([mx - 20, my - 20, mx + 20, my + 20], fill=W + (255,))
    for y in range(int(h * .58), h, 5):  # moon path on the water
        k = (y - h * .58) / (h * .42); ww = 8 + k * 60 + random.random() * 10
        d.line([(mx - ww / 2 + random.uniform(-6, 6), y), (mx + ww / 2, y)], fill=(P if y % 15 else W) + (255,), width=2)
    d.polygon([(0, h * .56), (w * .2, h * .5), (w * .45, h * .55), (w * .7, h * .53), (w, h * .57), (w, h * .6), (0, h * .6)], fill=K + (255,))
    for x in (60, 95, 130):
        d.rectangle([x, h * .38, x + 30, h * .55], fill=C + (255,)); d.polygon([(x - 4, h * .38), (x + 15, h * .3), (x + 34, h * .38)], fill=K + (255,))
        d.rectangle([x + 10, h * .44, x + 18, h * .5], fill=P + (255,))
    random.seed(2)
    for _ in range(40): d.point((random.randrange(w), random.randrange(int(h * .4))), fill=W + (255,))
    grain(im).save(os.path.join(OUT, 'moonlit-river.png'))


def zhostovo_tray(s=512):  # black lacquered tray, bouquet of pink roses, silver border
    im, d = canvas(s, s, alpha=True)
    d.ellipse([4, 4, s - 4, s - 4], fill=K + (255,))
    d.ellipse([18, 18, s - 18, s - 18], outline=S + (255,), width=4)
    for i in range(36):
        a = i / 36 * math.tau; x, y = s / 2 + math.cos(a) * (s / 2 - 34), s / 2 + math.sin(a) * (s / 2 - 34)
        leaf(d, x, y, a + math.pi / 2, 18, 5, S)
    random.seed(4)
    for i in range(14):
        a = random.uniform(0, math.tau); r = random.uniform(40, 150)
        leaf(d, s / 2 + math.cos(a) * r * .6, s / 2 + math.sin(a) * r * .6, a, random.uniform(50, 80), 14, (150, 160, 158) if i % 3 else S)
    for (dx, dy, r, c) in [(0, 0, 58, P), (-80, -40, 44, W), (78, -30, 46, M), (-40, 75, 40, P), (60, 70, 36, W), (0, -95, 30, H)]:
        rose(d, s / 2 + dx, s / 2 + dy, r, c, tuple(int(v * .8) for v in c), H if c != H else P)
    grain(im).save(os.path.join(OUT, 'zhostovo-tray.png'))


def birch_wood(w=480, h=640):
    im, d = canvas(w, h, (52, 46, 60))
    for y in range(h):
        t = y / h; c = tuple(int((40, 34, 52)[i] * (1 - t) + (214, 196, 214)[i] * t * .5 + 30 * t) for i in range(3))
        d.line([(0, y), (w, y)], fill=c + (255,))
    random.seed(6)
    for x in sorted(random.sample(range(10, w - 20), 9)):
        tw = random.randint(10, 22)
        d.rectangle([x, 0, x + tw, h * .9], fill=W + (255,))
        for _ in range(26):
            yy = random.randrange(int(h * .9)); d.rectangle([x, yy, x + random.randint(4, tw), yy + random.randint(2, 6)], fill=K + (255,))
    d.rectangle([0, h * .88, w, h], fill=P + (255,))
    for _ in range(80): d.point((random.randrange(w), random.randrange(int(h * .88), h)), fill=W + (255,))
    grain(im, seed=7).save(os.path.join(OUT, 'birch-wood.png'))


def gzhel_plate(s=512):  # porcelain plate, silver-grey brushwork, one pink flower
    im, d = canvas(s, s, alpha=True)
    d.ellipse([4, 4, s - 4, s - 4], fill=W + (255,))
    for r, c, wd in ((s / 2 - 12, G, 8), (s / 2 - 40, S, 4), (s / 2 - 110, G, 3)):
        d.ellipse([s / 2 - r, s / 2 - r, s / 2 + r, s / 2 + r], outline=c + (255,), width=wd)
    for i in range(16):
        a = i / 16 * math.tau
        leaf(d, s / 2 + math.cos(a) * (s / 2 - 70), s / 2 + math.sin(a) * (s / 2 - 70), a + math.pi / 2, 30, 9, G)
    for i in range(5):
        a = i / 5 * math.tau - math.pi / 2
        leaf(d, s / 2, s / 2, a, 95, 32, (150, 150, 170))
    rose(d, s / 2, s / 2, 44, P, M, H)
    grain(im, seed=9).save(os.path.join(OUT, 'gzhel-plate.png'))


def kokoshnik_portrait(w=512, h=640):
    im, d = canvas(w, h, (44, 38, 50))
    for y in range(h):
        c = tuple(int((58, 50, 66)[i] * (1 - y / h) + (30, 26, 34)[i] * y / h) for i in range(3)); d.line([(0, y), (w, y)], fill=c + (255,))
    cx = w / 2
    d.polygon([(cx - 220, h), (cx - 150, h * .66), (cx, h * .6), (cx + 150, h * .66), (cx + 220, h)], fill=K + (255,))
    d.polygon([(cx - 40, h * .6), (cx + 40, h * .6), (cx, h * .72)], fill=(236, 220, 226, 255))
    d.ellipse([cx - 70, h * .3, cx + 70, h * .55], fill=(236, 220, 226, 255))
    d.rectangle([cx - 30, h * .52, cx + 30, h * .62], fill=(226, 208, 216, 255))
    d.pieslice([cx - 150, h * .1, cx + 150, h * .52], 180, 360, fill=P + (255,))  # kokoshnik
    d.pieslice([cx - 120, h * .16, cx + 120, h * .5], 180, 360, fill=M + (255,))
    for i in range(13):
        a = math.pi + i / 12 * math.pi; d.ellipse([cx + math.cos(a) * 135 - 7, h * .31 + math.sin(a) * 105 - 7, cx + math.cos(a) * 135 + 7, h * .31 + math.sin(a) * 105 + 7], fill=W + (255,))
    for x in range(int(cx - 70), int(cx + 70), 10): d.line([(x, h * .32), (x, h * .38 + (x % 20))], fill=W + (255,), width=3)  # pearl fringe
    d.ellipse([cx - 12, h * .2, cx + 12, h * .24], fill=H + (255,))
    for dx in (-26, 26): d.ellipse([cx + dx - 8, h * .41, cx + dx + 8, h * .43], fill=K + (255,))
    d.arc([cx - 18, h * .46, cx + 18, h * .5], 20, 160, fill=M + (255,), width=3)
    grain(im, seed=11).save(os.path.join(OUT, 'kokoshnik-portrait.png'))


def winter_domes(w=640, h=500):
    im, d = canvas(w, h, NIGHT)
    for y in range(h):
        t = y / h; c = tuple(int(NIGHT[i] * (1 - t) + (90, 80, 100)[i] * t) for i in range(3)); d.line([(0, y), (w, y)], fill=c + (255,))
    d.polygon([(0, h * .72), (w * .3, h * .62), (w * .6, h * .7), (w, h * .6), (w, h), (0, h)], fill=W + (255,))
    for (x, ww, hh) in ((w * .42, 70, 150), (w * .55, 50, 120), (w * .32, 44, 100)):
        d.rectangle([x - ww / 2, h * .66 - hh, x + ww / 2, h * .66], fill=(214, 210, 222, 255))
        d.ellipse([x - ww * .55, h * .66 - hh - ww * .9, x + ww * .55, h * .66 - hh + ww * .1], fill=P + (255,))
        d.polygon([(x - 4, h * .66 - hh - ww * .8), (x, h * .66 - hh - ww * 1.3), (x + 4, h * .66 - hh - ww * .8)], fill=S + (255,))
        for k in range(3): d.rectangle([x - ww / 2 + 8 + k * ww / 3.4, h * .66 - hh * .7, x - ww / 2 + 16 + k * ww / 3.4, h * .66 - hh * .45], fill=H + (255,))
    random.seed(12)
    for x in range(10, w, 38):
        if abs(x - w * .45) < 140: continue
        d.rectangle([x, h * .3, x + 6, h * .75], fill=K + (255,))
    for _ in range(160): d.point((random.randrange(w), random.randrange(h)), fill=W + (255,))
    grain(im, seed=13).save(os.path.join(OUT, 'winter-domes.png'))


def firebird(w=480, h=640):  # after Bilibin's fairy-tale firebird, in pink on black
    im, d = canvas(w, h, K)
    d.rectangle([12, 12, w - 12, h - 12], outline=S + (255,), width=3); d.rectangle([22, 22, w - 22, h - 22], outline=G + (255,), width=1)
    cx, cy = w * .45, h * .35
    for i in range(7):  # tail feathers
        a = math.pi * .35 + i * .12; ln = 320 + i * 12
        x2, y2 = cx + math.cos(a) * ln * .35, cy + math.sin(a) * ln
        d.line([(cx, cy), (x2, y2)], fill=M + (255,), width=6)
        d.ellipse([x2 - 22, y2 - 30, x2 + 22, y2 + 30], fill=P + (255,)); d.ellipse([x2 - 10, y2 - 14, x2 + 10, y2 + 14], fill=H + (255,)); d.ellipse([x2 - 4, y2 - 6, x2 + 4, y2 + 6], fill=K + (255,))
    d.ellipse([cx - 60, cy - 50, cx + 60, cy + 50], fill=P + (255,))
    leaf(d, cx - 20, cy, -2.4, 120, 34, M)  # wing
    d.ellipse([cx + 30, cy - 110, cx + 80, cy - 60], fill=P + (255,)); d.line([(cx + 40, cy - 40), (cx + 55, cy - 80)], fill=P + (255,), width=26)
    d.polygon([(cx + 78, cy - 88), (cx + 104, cy - 80), (cx + 78, cy - 74)], fill=S + (255,)); d.ellipse([cx + 58, cy - 96, cx + 66, cy - 88], fill=K + (255,))
    for i in range(5): d.line([(cx + 50 + i * 6, cy - 110), (cx + 46 + i * 10, cy - 140 - i * 4)], fill=H + (255,), width=3)
    grain(im, seed=14).save(os.path.join(OUT, 'firebird.png'))


def fashion_magazine(w=480, h=640):  # a 1960s Soviet fashion-magazine cover feel
    im, d = canvas(w, h, P)
    d.rectangle([0, 0, w, h * .2], fill=K + (255,))
    try:
        f = ImageFont.truetype(FONT, 96); d.text((w / 2, h * .1), 'МОДА', font=f, fill=P + (255,), anchor='mm')
        f2 = ImageFont.truetype(FONT, 26); d.text((w / 2, h * .95), '1967 · №3', font=f2, fill=K + (255,), anchor='mm')
    except Exception: pass
    cx = w / 2
    d.ellipse([cx - 34, h * .26, cx + 34, h * .36], fill=(236, 220, 226, 255))
    d.pieslice([cx - 60, h * .22, cx + 60, h * .34], 180, 360, fill=K + (255,))
    d.polygon([(cx - 50, h * .38), (cx + 50, h * .38), (cx + 120, h * .86), (cx - 120, h * .86)], fill=K + (255,))
    d.rectangle([cx - 52, h * .5, cx + 52, h * .53], fill=H + (255,))
    for y in range(int(h * .6), int(h * .86), 24): d.line([(cx - 100, y), (cx + 100, y)], fill=C + (255,), width=2)
    d.rectangle([cx - 14, h * .36, cx + 14, h * .39], fill=(226, 208, 216, 255))
    grain(im, seed=15).save(os.path.join(OUT, 'fashion-magazine.png'))


def pavlovo_shawl(s=512):  # black wool shawl with roses in the corners and centre, silver border and fringe
    im, d = canvas(s, s, alpha=True)
    d.rectangle([14, 14, s - 14, s - 14], fill=K + (255,))
    d.rectangle([30, 30, s - 30, s - 30], outline=S + (255,), width=6)
    for x in range(14, s - 14, 8):
        for (yy, dy) in ((0, 1), (s, -1)): d.line([(x, yy + 14 * dy), (x + 2, yy + 2 * dy)], fill=S + (255,), width=2)
    for y in range(14, s - 14, 8):
        for (xx, dx) in ((0, 1), (s, -1)): d.line([(xx + 14 * dx, y), (xx + 2 * dx, y + 2)], fill=S + (255,), width=2)
    random.seed(16)
    for (cx, cy, sc) in ((s / 2, s / 2, 1), (90, 90, .7), (s - 90, 90, .7), (90, s - 90, .7), (s - 90, s - 90, .7)):
        for i in range(8):
            a = i / 8 * math.tau; leaf(d, cx, cy, a, 70 * sc, 18 * sc, (120, 138, 128) if i % 2 else S)
        rose(d, cx, cy, 40 * sc, P, M, H)
        for i in range(4):
            a = i / 4 * math.tau + .7; rose(d, cx + math.cos(a) * 52 * sc, cy + math.sin(a) * 52 * sc, 20 * sc, W if i % 2 else M, G, P)
    grain(im, seed=17).save(os.path.join(OUT, 'pavlovo-shawl.png'))


def glamour(name, w, h, bg, seed, title=None, smoke=True, fur=False):
    """Stand-in for the mid-century glamour set: a woman's silhouette with a long cigarette holder and smoke."""
    im, d = canvas(w, h, bg); random.seed(seed); cx = w * .46
    d.polygon([(cx - 120, h), (cx - 70, h * .52), (cx, h * .47), (cx + 70, h * .52), (cx + 130, h)], fill=K + (255,))  # black dress
    if fur: d.ellipse([cx - 95, h * .4, cx + 95, h * .58], fill=S + (255,)); d.rectangle([cx - 60, h * .1, cx + 60, h * .24], fill=S + (255,))
    d.ellipse([cx - 40, h * .22, cx + 40, h * .42], fill=(236, 220, 226, 255))                       # face
    if not fur: d.pieslice([cx - 58, h * .16, cx + 58, h * .4], 180, 360, fill=K + (255,))           # bouffant
    d.ellipse([cx - 22, h * .33, cx - 8, h * .345], fill=K + (255,)); d.ellipse([cx + 8, h * .33, cx + 22, h * .345], fill=K + (255,))
    d.ellipse([cx - 9, h * .385, cx + 9, h * .4], fill=H + (255,))                                     # lips
    for k in range(9): d.ellipse([cx - 40 + k * 10, h * .47, cx - 34 + k * 10, h * .48 + 6], fill=W + (255,))  # pearls
    hx, hy = cx + 110, h * .44
    d.line([(cx + 6, h * .395), (hx, hy - 30)], fill=K + (255,), width=4); d.line([(hx - 8, hy - 26), (hx, hy - 30)], fill=W + (255,), width=4)
    d.ellipse([hx - 3, hy - 34, hx + 3, hy - 28], fill=H + (255,))                                     # glowing tip
    if smoke:
        x, y = hx, hy - 34
        for i in range(30):
            nx, ny = x + math.sin(i * .5) * 9, y - 9
            d.line([(x, y), (nx, ny)], fill=(220, 214, 226, 200 - i * 5), width=3); x, y = nx, ny
    if title:
        try: d.text((w / 2, h * .07), title, font=ImageFont.truetype(FONT, int(h * .085)), fill=K + (255,), anchor='mm')
        except Exception: pass
    grain(im, seed=seed).save(os.path.join(OUT, name + '.png'))


PLACEHOLDERS = {
    'moonlit-river': moonlit_river, 'zhostovo-tray': zhostovo_tray, 'birch-wood': birch_wood, 'gzhel-plate': gzhel_plate,
    'kokoshnik-portrait': kokoshnik_portrait,
    'cover-pearls': lambda: glamour('cover-pearls', 480, 640, P, 26, 'МОДА'),
    'cover-boudoir': lambda: glamour('cover-boudoir', 480, 640, (60, 50, 62), 27),
    'painting-reclining': lambda: glamour('painting-reclining', 640, 476, (44, 36, 48), 28, smoke=False),
    'painting-goblet': lambda: glamour('painting-goblet', 480, 634, (40, 34, 44), 29, smoke=False, fur=True),
    'cover-atelier': lambda: glamour('cover-atelier', 480, 640, (238, 226, 234), 30, 'МОДА', fur=True),
    'painting-white-nights': lambda: glamour('painting-white-nights', 640, 480, (116, 118, 128), 31, smoke=False), 'winter-domes': winter_domes, 'firebird': firebird,
    'fashion-magazine': fashion_magazine, 'pavlovo-shawl': pavlovo_shawl,
    'smoke-rings': lambda: glamour('smoke-rings', 480, 640, P, 21, 'ЛУНА'),
    'vanity': lambda: glamour('vanity', 500, 620, (48, 40, 52), 22),
    'perfume-ad': lambda: glamour('perfume-ad', 480, 640, (238, 226, 234), 23, 'БЕЛАЯ НОЧЬ'),
    'cinema-poster': lambda: glamour('cinema-poster', 480, 646, (30, 26, 38), 24, fur=True),
    'winter-cover': lambda: glamour('winter-cover', 480, 640, P, 25, 'МОДА', fur=True),
}

if __name__ == '__main__':
    # Only fills in MISSING art, so real art you've added is never overwritten. --force redraws everything.
    # Only slots that are hung (not commented out) in ART in decor.js.
    import sys
    sys.path.insert(0, os.path.dirname(__file__)); from import_art import art_slots
    hung = art_slots()
    made = [n for n, f in PLACEHOLDERS.items() if n in hung and ('--force' in sys.argv or not os.path.exists(os.path.join(OUT, n + '.png'))) and f() is None]
    print('wrote placeholders:', ', '.join(made) or 'none (all slots already have art)')
