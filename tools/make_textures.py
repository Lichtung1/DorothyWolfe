"""Generates the procedural textures used by decor.js / exterior.js.

Run from the project root:  python3 tools/make_textures.py
Needs Pillow (pip install pillow). Everything is written to assets/textures/.
Palette is Dorothy's: black, silver, light pink and a little hot pink. No red, no plum.
Change PAL or the scheme dicts below and re-run to recolour everything.
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'textures')
os.makedirs(OUT, exist_ok=True)

PAL = {
    'K': (20, 18, 22),     # black
    'C': (48, 45, 52),     # charcoal
    'G': (120, 117, 126),  # graphite
    'S': (188, 186, 196),  # silver
    'W': (238, 233, 238),  # pale silver / ivory
    'P': (243, 192, 215),  # light pink
    'M': (222, 156, 190),  # mid pink
    'H': (244, 95, 240),   # Dorothy hot pink (sampled from her profile photo)
}


def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)


# ---------------------------------------------------------------- rugs
# Small motifs used to fill rug fields (1 = motif colour, 2 = accent colour)
MOTIFS = {
    'star8': ["..1.1..", "..111..", "1112111", ".12221.", "1112111", "..111..", "..1.1.."],
    'cross': ["..1..", ".121.", "12221", ".121.", "..1.."],
    'flower': [".1.1.", "11211", ".222.", "11211", ".1.1."],
    'hook': ["11...", "1.1..", "..1..", "..1.1", "...11"],
}


def rug(name, W, H, s, cs=4, seed=1):
    """W x H knots, each knot cs pixels. s = scheme dict of palette letters."""
    rnd = random.Random(seed)
    grid = [[s['field'] for _ in range(W)] for _ in range(H)]
    cx, cy = W / 2, H / 2
    bands = s.get('bands', [(1, 'edge'), (1, 'guard'), (2, 'minor'), (6, 'main'), (1, 'guard'), (1, 'line')])
    bw = sum(b for b, _ in bands)
    for j in range(H):
        for i in range(W):
            u, v = min(i, W - 1 - i), min(j, H - 1 - j)
            e = min(u, v)
            if e < bw:
                acc = 0
                for width, kind in bands:
                    if e < acc + width:
                        sdep = e - acc  # depth inside this band
                        along = abs(i + .5 - cx) if v < u else abs(j + .5 - cy)
                        if kind == 'edge': col = s['edge']
                        elif kind == 'guard': col = s['guard']
                        elif kind == 'line': col = s['line']
                        elif kind == 'minor':
                            col = s['minor'][int((int(along) + sdep) % 4 < 2)]
                        else:  # main border: repeating lozenge + dots
                            L = s.get('unit', 12)
                            t = (along + s.get('phase', 0)) % L
                            dd = abs(t - L / 2) / (L / 2) * 3 + abs(sdep + .5 - width / 2)
                            if u < width + acc and v < width + acc and abs(u - v) < 1.0:
                                col = s['mainAccent']  # corner diagonal
                            elif dd < 1.2: col = s['mainAccent']
                            elif dd < 2.4: col = s['mainMotif']
                            elif dd < 3.1: col = s['mainGround']
                            elif (int(t) % 2 == 0) and abs(sdep + .5 - width / 2) < 1: col = s['mainMotif']
                            else: col = s['mainGround']
                        grid[j][i] = col
                        break
                    acc += width
    # field
    fx, fy = cx - bw, cy - bw
    meds = s.get('medallions', [(0, .62, .30)])
    tre = s.get('trellis')
    for j in range(bw, H - bw):
        for i in range(bw, W - bw):
            x, y = i + .5 - cx, j + .5 - cy
            col = None
            if tre and (int(abs(x) + abs(y)) % 8 == 0 or int(abs(x) - abs(y)) % 8 == 0):
                grid[j][i] = tre
            # corner spandrels
            dc = (fx - abs(x)) / (fx * s.get('corner', .38)) + (fy - abs(y)) / (fy * s.get('corner', .38) * .8)
            if dc < 1:
                col = s['cornerOuter'] if dc > .72 else (s['cornerInner'] if dc > .3 else s['cornerCore'])
            for oy, a, b in meds:
                a *= fx * 1.3; b *= fy * 1.3
                yy = y - oy * fy
                d = abs(x) / a + abs(yy) / b
                d = max(d, abs(x) / (a * .8), abs(yy) / (b * .82))
                if d <= 1:
                    for thr, c in s['rings']:
                        if d <= thr: col = c
                    if d < .2 and (abs(x) < 1.2 or abs(yy) < 1.2):
                        col = s['core']
                elif d < 1.16 and (int(abs(x) + abs(yy)) % 3 == 0):
                    col = s['hooks']
            if col: grid[j][i] = col
    # scattered small motifs on a lattice
    sx, sy = s.get('lattice', (10, 9))
    names = s.get('motifs', ['star8', 'cross', 'flower'])
    k = 0
    for gj in range(-int(fy // sy), int(fy // sy) + 1):
        for gi in range(-int(fx // sx), int(fx // sx) + 1):
            px, py = gi * sx + (sx / 2 if gj % 2 else 0), gj * sy
            inside = False
            for oy, a, b in meds:
                if abs(px) / (a * fx * 1.3) + abs(py - oy * fy) / (b * fy * 1.3) < 1.3: inside = True
            if abs(px) > fx - 4 or abs(py) > fy - 4 or inside: continue
            pat = MOTIFS[names[(abs(gi) + abs(gj)) % len(names)]]
            mc = s['fill'][k % len(s['fill'])]; k += 1
            ac = s['fillAccent'] if (abs(gi) + 2 * abs(gj)) % 5 == 0 else mc
            n = len(pat)
            for r, row in enumerate(pat):
                for q, ch in enumerate(row):
                    if ch == '.': continue
                    for sxn in (1, -1):
                        for syn in (1, -1):
                            ii = int(cx + sxn * (abs(px) - n // 2 + q) - (1 if sxn < 0 else 0) * 0)
                            jj = int(cy + syn * (abs(py) - n // 2 + r))
                            if 0 <= ii < W and 0 <= jj < H:
                                grid[jj][ii] = ac if ch == '2' else mc
    # render knots
    img = Image.new('RGB', (W * cs, H * cs))
    px = img.load()
    for j in range(H):
        rowf = 1 + (math.sin(j * .37 + seed) * .025)  # abrash: slight banding like hand-dyed wool
        for i in range(W):
            c = PAL[grid[j][i]]
            n = 1 + rnd.uniform(-.035, .035)
            for b in range(cs):
                for a in range(cs):
                    f = rowf * n * (1.06 - .12 * (a + b) / (2 * cs - 2))
                    px[i * cs + a, j * cs + b] = shade(c, f)
    img.save(os.path.join(OUT, name + '.png'), optimize=True)
    return img


RUGS = {
    # floor, courtyard: black ground, silver + pink medallions
    'rug-nocturne': dict(W=64, H=100, seed=3, s=dict(trellis='K', 
        field='C', edge='K', guard='S', line='K', minor=('K', 'S'),
        mainGround='K', mainMotif='S', mainAccent='P',
        rings=[(1, 'K'), (.9, 'S'), (.8, 'K'), (.7, 'P'), (.5, 'K'), (.42, 'W'), (.3, 'P')], core='H', hooks='S',
        cornerOuter='K', cornerInner='S', cornerCore='P',
        fill=['S', 'P', 'G'], fillAccent='H', medallions=[(0, .55, .26), (.62, .38, .14), (-.62, .38, .14)])),
    # floor, atelier: light pink ground, black medallion
    'rug-blush': dict(W=64, H=104, seed=7, s=dict(trellis='M', 
        field='P', edge='K', guard='W', line='K', minor=('K', 'W'),
        mainGround='K', mainMotif='P', mainAccent='S',
        rings=[(1, 'K'), (.88, 'W'), (.78, 'K'), (.66, 'S'), (.5, 'K'), (.38, 'P')], core='H', hooks='K',
        cornerOuter='K', cornerInner='W', cornerCore='S',
        fill=['K', 'S', 'M'], fillAccent='H', medallions=[(0, .62, .34)])),
    # floor, fitting room: silver ground
    'rug-silver': dict(W=64, H=84, seed=11, s=dict(trellis='W', 
        field='S', edge='K', guard='P', line='K', minor=('K', 'P'),
        mainGround='K', mainMotif='S', mainAccent='P',
        rings=[(1, 'K'), (.86, 'P'), (.74, 'K'), (.62, 'W'), (.44, 'K'), (.34, 'P')], core='H', hooks='K',
        cornerOuter='K', cornerInner='P', cornerCore='W',
        fill=['K', 'W', 'G'], fillAccent='H', medallions=[(0, .6, .36)])),
    # vestibule runner: long, repeating medallions
    'rug-runner': dict(W=36, H=128, seed=5, s=dict(trellis='C', 
        field='K', edge='C', guard='P', line='C', minor=('C', 'S'),
        bands=[(1, 'edge'), (1, 'guard'), (2, 'minor'), (1, 'line')],
        rings=[(1, 'S'), (.82, 'K'), (.7, 'P'), (.5, 'K'), (.36, 'W')], core='H', hooks='S',
        cornerOuter='C', cornerInner='C', cornerCore='C', corner=.01,
        fill=['S', 'P'], fillAccent='H', lattice=(8, 10),
        medallions=[(-.75, .8, .12), (-.375, .8, .12), (0, .8, .12), (.375, .8, .12), (.75, .8, .12)])),
    # wall rug, black, 'over the sofa' Soviet style
    'rug-wall-black': dict(W=72, H=100, seed=13, s=dict(trellis='C', 
        field='K', edge='C', guard='P', line='C', minor=('C', 'P'),
        bands=[(1, 'edge'), (1, 'guard'), (2, 'minor'), (8, 'main'), (1, 'guard'), (1, 'line')], unit=14,
        mainGround='C', mainMotif='P', mainAccent='S',
        rings=[(1, 'P'), (.9, 'K'), (.82, 'S'), (.72, 'K'), (.6, 'P'), (.46, 'K'), (.36, 'W')], core='H', hooks='P',
        cornerOuter='S', cornerInner='K', cornerCore='P',
        fill=['S', 'P', 'G'], fillAccent='H', medallions=[(0, .6, .3), (.66, .34, .14), (-.66, .34, .14)])),
    # wall rug, pale
    'rug-wall-pale': dict(W=72, H=100, seed=17, s=dict(trellis='S', 
        field='W', edge='K', guard='S', line='K', minor=('K', 'S'),
        bands=[(1, 'edge'), (1, 'guard'), (2, 'minor'), (8, 'main'), (1, 'guard'), (1, 'line')], unit=14,
        mainGround='K', mainMotif='P', mainAccent='W',
        rings=[(1, 'K'), (.9, 'P'), (.8, 'K'), (.7, 'S'), (.56, 'K'), (.44, 'P')], core='H', hooks='K',
        cornerOuter='K', cornerInner='P', cornerCore='S',
        fill=['K', 'S', 'M'], fillAccent='H', medallions=[(0, .64, .32)])),
}


# ---------------------------------------------------------------- stained glass
def stained_glass(name, w, h, design, seed=1):
    """Arched window, alpha outside the arch. Bright colours: it is drawn unlit."""
    S = 3  # supersample
    W, H = w * S, h * S
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    lead = (16, 14, 18, 255)
    cols = {'pink': (247, 196, 222), 'hot': (244, 95, 240), 'silver': (214, 220, 236), 'ice': (190, 204, 230),
            'white': (250, 244, 250), 'smoke': (96, 92, 110), 'blush': (236, 160, 200)}
    r = W / 2
    # arch mask
    mask = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([0, r, W, H], fill=255)
    md.ellipse([0, 0, W, 2 * r], fill=255)
    rnd = random.Random(seed)
    # base: diamond quarries
    q = W / 5
    for row in range(-2, int(H / q * 2) + 3):
        for colm in range(-2, 8):
            x0 = colm * q + (q / 2 if row % 2 else 0)
            y0 = row * q / 2
            poly = [(x0, y0 - q / 2), (x0 + q / 2, y0), (x0, y0 + q / 2), (x0 - q / 2, y0)]
            c = cols['silver'] if (row + colm) % 3 else cols['ice']
            if design == 'rose' and rnd.random() < .08: c = cols['blush']
            d.polygon(poly, fill=c + (255,), outline=lead, width=S)
    # border band of small panes
    bwid = W * .09
    step = bwid * 1.6
    k = 0
    yy = r
    while yy < H:
        for x0 in (0, W - bwid):
            d.rectangle([x0, yy, x0 + bwid, yy + step], fill=(cols['hot'] if k % 3 == 0 else cols['pink']) + (255,), outline=lead, width=S)
        yy += step; k += 1
    # arch border
    for a in range(0, 180, 12):
        a0, a1 = math.radians(180 + a), math.radians(180 + a + 12)
        pts = [(r + math.cos(t) * r, r + math.sin(t) * r) for t in (a0, a1)] + [(r + math.cos(t) * (r - bwid), r + math.sin(t) * (r - bwid)) for t in (a1, a0)]
        d.polygon(pts, fill=(cols['hot'] if (a // 12) % 3 == 0 else cols['pink']) + (255,), outline=lead)
    # centre piece
    cxp, cyp = W / 2, (r + H * .58) / 2 if design == 'rose' else H * .55
    if design == 'rose':
        R = W * .3
        for i in range(16):
            t0, t1 = i / 16 * 2 * math.pi, (i + 1) / 16 * 2 * math.pi
            for (ra, rb, c) in ((R * .45, R, 'pink' if i % 2 else 'hot'), (R * .2, R * .45, 'white' if i % 2 else 'blush')):
                pts = [(cxp + math.cos(t0) * ra, cyp + math.sin(t0) * ra), (cxp + math.cos(t0) * rb, cyp + math.sin(t0) * rb),
                       (cxp + math.cos(t1) * rb, cyp + math.sin(t1) * rb), (cxp + math.cos(t1) * ra, cyp + math.sin(t1) * ra)]
                d.polygon(pts, fill=cols[c] + (255,), outline=lead, width=S)
        d.ellipse([cxp - R * .2, cyp - R * .2, cxp + R * .2, cyp + R * .2], fill=cols['hot'] + (255,), outline=lead, width=S)
        # stem + leaves down the lancet
        d.rectangle([cxp - S * 3, cyp + R, cxp + S * 3, H * .9], fill=cols['smoke'] + (255,), outline=lead, width=S)
        for yy in (H * .7, H * .8):
            for sgn in (-1, 1):
                d.polygon([(cxp, yy), (cxp + sgn * W * .22, yy - W * .1), (cxp + sgn * W * .1, yy + W * .02)], fill=cols['pink'] + (255,), outline=lead, width=S)
    else:  # 'moon': crescent moon + stars, for the door sidelights / transom
        R = W * .28
        d.ellipse([cxp - R, cyp - R, cxp + R, cyp + R], fill=cols['white'] + (255,), outline=lead, width=S)
        d.ellipse([cxp - R * .5, cyp - R * 1.05, cxp + R * 1.3, cyp + R * .75], fill=cols['smoke'] + (255,), outline=lead, width=S)
        for (sx, sy) in ((.25, .3), (.72, .22), (.3, .82), (.7, .9)):
            x, y, rr = W * sx, H * sy if sy > .5 else r * sy * 2, W * .06
            pts = []
            for i in range(10):
                t = i / 10 * 2 * math.pi - math.pi / 2
                rad = rr if i % 2 == 0 else rr * .45
                pts.append((x + math.cos(t) * rad, y + math.sin(t) * rad))
            d.polygon(pts, fill=cols['hot'] + (255,), outline=lead, width=S)
    # frame lead
    d.rectangle([0, r, W - 1, H - 1], outline=lead, width=S * 3)
    d.arc([0, 0, W - 1, 2 * r], 180, 360, fill=lead, width=S * 3)
    img.putalpha(Image.composite(img.getchannel('A'), Image.new('L', (W, H), 0), mask))
    # glass texture: slight mottling
    noise = Image.effect_noise((W, H), 18).convert('L').filter(ImageFilter.GaussianBlur(S * 2))
    rgb = Image.merge('RGB', [Image.blend(ch, noise, .08) for ch in img.convert('RGB').split()])
    rgb.putalpha(img.getchannel('A'))
    rgb.resize((w, h), Image.LANCZOS).save(os.path.join(OUT, name + '.png'), optimize=True)


# ---------------------------------------------------------------- exterior
def birch_bark(w=64, h=256, seed=2):
    rnd = random.Random(seed)
    img = Image.new('RGB', (w, h), (226, 224, 230))
    d = ImageDraw.Draw(img)
    for y in range(h):
        f = 1 + math.sin(y * .21) * .02
        for x in range(w):
            g = int(226 * f + rnd.uniform(-8, 8))
            img.putpixel((x, y), (g, g - 2, g + 3))
    for _ in range(46):  # dark lenticels: thin horizontal dashes
        y = rnd.randrange(h); x = rnd.randrange(w); L = rnd.randrange(4, 18); t = rnd.choice((1, 1, 2, 3))
        d.rectangle([x, y, x + L, y + t], fill=(28, 26, 32))
        if x + L > w: d.rectangle([x - w, y, x + L - w, y + t], fill=(28, 26, 32))
    for _ in range(6):  # bigger black patches like old birch
        y = rnd.randrange(h); x = rnd.randrange(w)
        d.polygon([(x, y), (x + 10, y + 3), (x + 4, y + 9), (x - 6, y + 4)], fill=(22, 20, 24))
    img.save(os.path.join(OUT, 'birch-bark.png'), optimize=True)


def road(w=128, h=256, seed=4):
    rnd = random.Random(seed)
    img = Image.new('RGB', (w, h), (40, 38, 44))
    d = ImageDraw.Draw(img)
    # cobbles
    y = 0
    while y < h:
        x = rnd.randrange(-8, 0)
        rh = rnd.randrange(10, 16)
        while x < w:
            rw = rnd.randrange(12, 22)
            g = rnd.randrange(70, 120)
            d.rounded_rectangle([x + 1, y + 1, x + rw - 1, y + rh - 1], radius=4, fill=(g, g - 3, g + 6))
            if rnd.random() < .04: d.ellipse([x + rw / 2 - 2, y + rh / 2 - 2, x + rw / 2 + 2, y + rh / 2 + 2], fill=(243, 192, 215))  # fallen petal
            x += rw
        y += rh
    img = img.filter(ImageFilter.GaussianBlur(.6))
    # dark mossy edges
    px = img.load()
    for yy in range(h):
        for xx in range(w):
            e = min(xx, w - 1 - xx) / (w * .16)
            if e < 1:
                c = px[xx, yy]; f = .35 + .65 * e
                px[xx, yy] = (int(c[0] * f), int(c[1] * f), int(c[2] * f))
    img.save(os.path.join(OUT, 'road-cobbles.png'), optimize=True)


def ground(w=256, seed=6):
    rnd = random.Random(seed)
    img = Image.effect_noise((w, w), 40).convert('L').filter(ImageFilter.GaussianBlur(3))
    base = Image.merge('RGB', [img.point(lambda v, k=k: int(14 + v * k)) for k in (.09, .085, .11)])
    d = ImageDraw.Draw(base)
    for _ in range(140):  # moss flecks + pale pink petals
        x, y = rnd.randrange(w), rnd.randrange(w)
        if rnd.random() < .12: d.point((x, y), fill=(243, 192, 215))
        else: d.point((x, y), fill=(52, 54, 60))
    base.save(os.path.join(OUT, 'forest-floor.png'), optimize=True)


def polar_bear(w=256, h=384, seed=8):
    """Top-down bearskin rug outline (alpha). Head is modelled separately."""
    S = 3
    W, H = w * S, h * S
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    cx = W / 2
    d.ellipse([cx - W * .27, H * .16, cx + W * .27, H * .82], fill=255)  # body
    for sgn in (-1, 1):
        # front legs reach forward, back legs back; paws as blobs
        d.polygon([(cx + sgn * W * .18, H * .26), (cx + sgn * W * .47, H * .12), (cx + sgn * W * .49, H * .2), (cx + sgn * W * .22, H * .38)], fill=255)
        d.ellipse([cx + sgn * W * .47 - W * .06, H * .1, cx + sgn * W * .47 + W * .06, H * .2], fill=255)
        d.polygon([(cx + sgn * W * .2, H * .66), (cx + sgn * W * .47, H * .86), (cx + sgn * W * .42, H * .92), (cx + sgn * W * .15, H * .78)], fill=255)
        d.ellipse([cx + sgn * W * .45 - W * .06, H * .84, cx + sgn * W * .45 + W * .06, H * .95], fill=255)
    d.ellipse([cx - W * .14, H * .03, cx + W * .14, H * .24], fill=255)  # neck
    d.polygon([(cx - W * .04, H * .8), (cx + W * .04, H * .8), (cx, H * .9)], fill=255)  # tail
    m = m.filter(ImageFilter.GaussianBlur(S * 1.2))
    m = m.point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.GaussianBlur(S * .8))
    fur = Image.effect_noise((W, H), 50).convert('L').filter(ImageFilter.GaussianBlur(S))
    rgb = Image.merge('RGB', [fur.point(lambda v, b=b: min(255, int(b + (v - 128) * .25))) for b in (236, 232, 238)])
    # soft shading toward edges
    edge = m.filter(ImageFilter.GaussianBlur(S * 8))
    rgb = Image.composite(rgb, Image.new('RGB', (W, H), (176, 172, 184)), edge.point(lambda v: min(255, v * 2)))
    rgb.putalpha(m)
    rgb.resize((w, h), Image.LANCZOS).save(os.path.join(OUT, 'polar-bear-rug.png'), optimize=True)


# ---------------------------------------------------------------- wallpaper recolour
# Re-maps the existing wallpapers into the palette (luminance -> 3-stop gradient,
# strongly saturated motif pixels pulled toward the accent). Outputs *-dw.jpg next to the originals.
WP = {
    'plum-tulips':        [(18, 16, 22), (110, 106, 118), (206, 204, 214), (243, 192, 215)],  # black + silver (archive)
    'sage-fern':          [(26, 24, 30), (120, 116, 128), (200, 198, 208), None],             # silver/graphite (gallery)
    'blue-cross-stitch':  [(30, 28, 34), (150, 146, 158), (214, 212, 222), (244, 95, 240)],   # silver w/ hot-pink stitches (atelier)
    'ivory-cross-stitch': [(26, 22, 28), (210, 150, 186), (246, 236, 242), (244, 95, 240)],   # ivory w/ black + pink (textile)
    'rose-floral':        [(30, 26, 32), (200, 150, 176), (246, 212, 228), None],             # light pink (fitting)
    'heart-damask':       [(36, 32, 40), (196, 150, 176), (244, 214, 230), None],             # light pink (courtyard)
    'pink-damask':        [(150, 146, 156), (240, 196, 216), (253, 240, 246), None, .5],             # soft pink (passage)
}


def recolour(src, stops, dst):
    im = Image.open(src).convert('RGB')
    L = im.convert('L')
    hist = sorted(L.tobytes())
    lo, hi = hist[len(hist) // 50], hist[-len(hist) // 50]
    out = Image.new('RGB', im.size)
    sp, op = im.load(), out.load()
    a, b, c, acc = stops[:4]
    gamma = stops[4] if len(stops) > 4 else 1
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, bl = sp[x, y]
            t = (0.299 * r + 0.587 * g + 0.114 * bl - lo) / max(1, hi - lo)
            t = max(0, min(1, t)) ** gamma
            if t < .5: k = t / .5; col = [a[i] + (b[i] - a[i]) * k for i in range(3)]
            else: k = (t - .5) / .5; col = [b[i] + (c[i] - b[i]) * k for i in range(3)]
            if acc:
                mx, mn = max(r, g, bl), min(r, g, bl)
                sat = (mx - mn) / max(1, mx)
                if sat > .38 and r > bl and r > g:  # the reddish motif stitches only
                    f = min(1, (sat - .38) * 3.2)
                    col = [col[i] + (acc[i] - col[i]) * f for i in range(3)]
            op[x, y] = tuple(int(v) for v in col)
    out.save(dst, quality=88)


def packed_recolour():
    """The original rose paper (outside walls + hidden bedroom): black ground, pink roses."""
    # the rose paper lives only inside apartment.glb (image 'rose-wallpaper'); pull it out
    import io, json, struct
    glb = open(os.path.join(OUT, '..', 'apartment.glb'), 'rb').read()
    n = struct.unpack('<I', glb[12:16])[0]
    js = json.loads(glb[20:20 + n])
    im = None
    for meta in js['images']:
        if meta.get('name') == 'rose-wallpaper':
            bv = js['bufferViews'][meta['bufferView']]
            o = 20 + n + 8 + bv.get('byteOffset', 0)
            im = Image.open(io.BytesIO(glb[o:o + bv['byteLength']])).convert('RGB').resize((512, 512), Image.LANCZOS)
    if im is None:
        print('rose-wallpaper not found in GLB; skipping'); return
    tmp = os.path.join(OUT, '_rose_src.png'); im.save(tmp)
    # inverted gradient: dark roses -> pink, trellis -> silver, cream ground -> black
    recolour(tmp, [(246, 176, 214), (140, 136, 148), (22, 20, 25), (244, 95, 240)], os.path.join(OUT, '..', 'wallpapers', 'rose-packed-dw.jpg'))
    os.remove(tmp)


if __name__ == '__main__':
    for n, cfg in RUGS.items():
        rug(n, cfg['W'], cfg['H'], cfg['s'], seed=cfg['seed'])
    stained_glass('stained-glass-rose', 128, 256, 'rose')
    stained_glass('stained-glass-moon', 96, 224, 'moon', seed=3)
    birch_bark(); road(); ground(); polar_bear()
    wpdir = os.path.join(OUT, '..', 'wallpapers')
    for n, stops in WP.items():
        recolour(os.path.join(wpdir, n + '.jpg'), stops, os.path.join(wpdir, n + '-dw.jpg'))
    packed_recolour()
    print('textures written to', os.path.abspath(OUT))
