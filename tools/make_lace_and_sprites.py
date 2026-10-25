"""Second batch of generated textures (run after make_textures.py):  python3 tools/make_lace_and_sprites.py

- lace-*.png      : each wallpaper's pattern turned into see-through lace (alpha = thread)
- lace-sheer.png  : fine tulle for the bed canopy and the bedroom curtains
- tree-*.png      : PS1-style flat tree cards (low-res, hard pixel edges, alpha cut-out)
- treeline-*.png  : 'Zelda wall' strips of dense forest that ring the playable area
- photos/*.jpg    : placeholder old photographs for the bedroom frames (replace with real ones, same names)
- extra rugs for layering
"""
import math, os, random, io, json, struct
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets')
TEX = os.path.join(ROOT, 'textures')
WP = os.path.join(ROOT, 'wallpapers')
PH = os.path.join(ROOT, 'photos')
os.makedirs(PH, exist_ok=True)

PINK = (246, 206, 226)
WHITE = (244, 240, 246)


# ---------------------------------------------------------------- lace
def load_rose_from_glb():
    glb = open(os.path.join(ROOT, 'apartment.glb'), 'rb').read()
    n = struct.unpack('<I', glb[12:16])[0]
    js = json.loads(glb[20:20 + n])
    for meta in js['images']:
        if meta.get('name') == 'rose-wallpaper':
            bv = js['bufferViews'][meta['bufferView']]
            o = 20 + n + 8 + bv.get('byteOffset', 0)
            return Image.open(io.BytesIO(glb[o:o + bv['byteLength']])).convert('RGB')


def lace(src_img, name, colour, invert=False, net=14, coverage=.36):
    im = src_img.convert('RGB').resize((512, 512), Image.LANCZOS)
    L = im.convert('L').filter(ImageFilter.GaussianBlur(2.2))
    hist = sorted(L.tobytes())
    med = hist[len(hist) // 2]
    # motif = pixels that differ from the paper's background tone; pick the threshold that gives ~coverage
    dev = sorted(abs(v - med) for v in hist)
    t = dev[int(len(dev) * (1 - coverage))]
    diff = L.point(lambda v: 255 if abs(v - med) > t else 0)
    diff = diff.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # remove specks
    diff = diff.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))  # close small gaps
    if invert: diff = ImageChops.invert(diff)
    # cordonnet: a raised outline around each motif
    outline = ImageChops.subtract(diff.filter(ImageFilter.MaxFilter(3)), diff.filter(ImageFilter.MinFilter(3)))
    # tulle net in the background: two diagonal sets of 2px threads
    netimg = Image.new('L', (512, 512), 0)
    d = ImageDraw.Draw(netimg)
    for k in range(-512, 1024, net):
        d.line([(k, 0), (k + 512, 512)], fill=255, width=2)
        d.line([(k, 512), (k + 512, 0)], fill=255, width=2)
    alpha = ImageChops.lighter(diff, netimg)
    # fill the inside of large motifs with an open 'toile' pattern so it reads as lace, not stickers
    holes = Image.new('L', (512, 512), 0)
    hd = ImageDraw.Draw(holes)
    for y in range(0, 512, 6):
        for x in range((y // 6) % 2 * 3, 512, 6):
            hd.rectangle([x, y, x + 2, y + 2], fill=255)
    inner = diff.filter(ImageFilter.MinFilter(7))
    alpha = ImageChops.subtract(alpha, ImageChops.multiply(inner, holes))
    alpha = ImageChops.lighter(alpha, outline)
    # shade threads a little with the original tones; net slightly darker
    shade = im.convert('L').point(lambda v: int(200 + (v - 128) * .25))
    rgb = Image.new('RGB', (512, 512), colour)
    rgb = ImageChops.multiply(rgb, Image.merge('RGB', [shade.point(lambda v: min(255, v + 40))] * 3))
    netcol = Image.new('RGB', (512, 512), tuple(int(c * .82) for c in colour))
    rgb = Image.composite(rgb, netcol, diff)
    rgb = Image.composite(Image.new('RGB', (512, 512), tuple(min(255, int(c * 1.04)) for c in colour)), rgb, outline)
    rgb.putalpha(alpha)
    rgb.save(os.path.join(TEX, name + '.png'), optimize=True)


# Per-wallpaper tuning for lace_clean: sign = 1 if the motif is darker than the paper, -1 if lighter;
# cov = how much of the tile becomes solid motif; minsz = smallest island kept (px).
LACE_TUNE = {
    'pink-damask': dict(sign=-1), 'heart-damask': dict(sign=1, cov=.30), 'ivory-cross-stitch': dict(sign=1),
    'blue-cross-stitch': dict(sign=-1), 'rose-floral': dict(sign=1), 'plum-tulips': dict(sign=1),
    'sage-fern': dict(sign=-1), 'rose': dict(sign=1, cov=.28, minsz=120, close=2, smooth=2.0),
}


def lace_clean(src_img, name, colour, sign=1, cov=.32, minsz=60, close=1, smooth=1.4, net=14, out_dir=None):
    """Each wallpaper's motif as lace, read by LOCAL contrast: a motif is whatever is darker (or lighter)
    than the paper right around it. Aged-paper blotches are broad, so they cancel out and only the
    printed pattern survives. Then: tiny islands removed, pin-holes inside motifs filled, a raised rim,
    the tulle net, and a few toile holes deep inside big motifs."""
    import numpy as np
    from scipy import ndimage
    im = src_img.convert('RGB').resize((512, 512), Image.LANCZOS)
    L = np.asarray(im.convert('L'), dtype=float)
    big = np.tile(L, (3, 3))  # wrap-aware filtering so the tile stays seamless
    hp = (ndimage.gaussian_filter(big, smooth) - ndimage.gaussian_filter(big, 10))[512:1024, 512:1024] * sign
    m = hp < np.quantile(hp, cov)
    m = ndimage.binary_opening(m, iterations=1); m = ndimage.binary_closing(m, iterations=close)
    def islands(mask, test):
        bm = np.tile(mask, (3, 3)); lab, n = ndimage.label(bm); sizes = ndimage.sum(bm, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool); keep[1:] = test(sizes); return keep[lab][512:1024, 512:1024]
    m = islands(m, lambda sz: sz >= minsz)          # drop specks
    m = m | islands(~m, lambda sz: sz < 40)          # fill pin-holes
    motif = Image.fromarray((m * 255).astype('uint8'))
    outline = ImageChops.subtract(motif.filter(ImageFilter.MaxFilter(3)), motif.filter(ImageFilter.MinFilter(3)))
    netimg = Image.new('L', (512, 512), 0); d = ImageDraw.Draw(netimg)
    for k in range(-512, 1024, net):
        d.line([(k, 0), (k + 512, 512)], fill=255, width=2); d.line([(k, 512), (k + 512, 0)], fill=255, width=2)
    alpha = ImageChops.lighter(motif, netimg)
    holes_img = Image.new('L', (512, 512), 0); hd = ImageDraw.Draw(holes_img)
    for y in range(0, 512, 8):
        for x in range((y // 8) % 2 * 4, 512, 8):
            hd.rectangle([x, y, x + 2, y + 2], fill=255)
    alpha = ImageChops.subtract(alpha, ImageChops.multiply(motif.filter(ImageFilter.MinFilter(11)), holes_img))
    alpha = ImageChops.lighter(alpha, outline)
    shade = im.convert('L').point(lambda v: int(200 + (v - 128) * .25))
    rgb = ImageChops.multiply(Image.new('RGB', (512, 512), colour), Image.merge('RGB', [shade.point(lambda v: min(255, v + 40))] * 3))
    rgb = Image.composite(rgb, Image.new('RGB', (512, 512), tuple(int(c * .82) for c in colour)), motif)
    rgb = Image.composite(Image.new('RGB', (512, 512), tuple(min(255, int(c * 1.04)) for c in colour)), rgb, outline)
    rgb.putalpha(alpha)
    rgb.save(os.path.join(out_dir or TEX, name + '.png'), optimize=True)


LACE = {  # wallpaper -> (lace name, colour, invert)
    'pink-damask': ('lace-passage', WHITE, False),
    'heart-damask': ('lace-courtyard', WHITE, False),
    'ivory-cross-stitch': ('lace-textile', PINK, False),
    'blue-cross-stitch': ('lace-atelier', PINK, False),
    'rose-floral': ('lace-fitting', PINK, False),
    'plum-tulips': ('lace-archive', WHITE, False),
    'sage-fern': ('lace-gallery', PINK, False),
}


def sheer():
    W = 256
    img = Image.new('RGBA', (W, W), WHITE + (60,))  # faint veil everywhere, lace motifs solid
    d = ImageDraw.Draw(img)
    col = WHITE + (255,)
    for k in range(-W, 2 * W, 8):
        d.line([(k, 0), (k + W, W)], fill=WHITE + (150,), width=1)
        d.line([(k, W), (k + W, 0)], fill=WHITE + (150,), width=1)
    rnd = random.Random(4)
    for _ in range(14):  # little embroidered flowers
        x, y = rnd.randrange(W), rnd.randrange(W)
        for a in range(6):
            t = a / 6 * math.tau
            px, py = x + math.cos(t) * 5, y + math.sin(t) * 5
            for ox in (-W, 0, W):
                for oy in (-W, 0, W):
                    d.ellipse([px - 2.5 + ox, py - 2.5 + oy, px + 2.5 + ox, py + 2.5 + oy], fill=col)
    # scalloped hem at the bottom
    for x in range(0, W, 16):
        d.arc([x, W - 18, x + 16, W - 2], 0, 180, fill=col, width=2)
    d.line([(0, W - 10), (W, W - 10)], fill=col, width=2)
    img.save(os.path.join(TEX, 'lace-sheer.png'), optimize=True)


# ---------------------------------------------------------------- PS1 tree cards
def ps1_upscale(img, k):
    return img.resize((img.size[0] * k, img.size[1] * k), Image.NEAREST)


def birch_card(name, seed, w=48, h=128):
    rnd = random.Random(seed)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = w // 2 + rnd.randint(-2, 2)
    leaves = [(150, 142, 158), (186, 178, 192), (214, 204, 218), (232, 214, 228), (120, 114, 128)]
    # trunk with a slight wobble
    xs = []
    for y in range(h - 1, 6, -1):
        x = cx + int(math.sin(y * .07 + seed) * 1.5)
        wdt = 4 if y > h * .55 else 3
        xs.append((y, x))
        for dx in range(wdt):
            c = (232, 228, 236) if rnd.random() > .16 else (20, 18, 24)
            d.point((x + dx - wdt // 2, y), fill=c + (255,))
    # weeping clumps of leaves hanging off branches
    for _ in range(34):
        by = rnd.randint(8, int(h * .66))
        bx = dict(xs).get(by, cx)
        side = rnd.choice((-1, 1)); L = rnd.randint(4, 15)
        ex, ey = bx + side * L, by + rnd.randint(-4, 3)
        d.line([(bx, by), (ex, ey)], fill=(40, 36, 44, 255))
        for _ in range(16):  # drooping clumps of leaves (2-3 px so they survive mipmapping)
            px = ex + rnd.randint(-6, 6); py = ey + rnd.randint(-4, 9)
            c = rnd.choice(leaves)
            d.rectangle([px, py, px + 1, py + rnd.randint(1, 3)], fill=c + (255,))
    return ps1_upscale(img, 4).save(os.path.join(TEX, name + '.png'), optimize=True)


def spruce_card(name, seed, w=48, h=128):
    rnd = random.Random(seed)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = w // 2
    tones = [(28, 27, 34), (38, 37, 46), (52, 50, 62), (70, 68, 82)]
    top = 4
    for y in range(top, h - 10):
        t = (y - top) / (h - 10 - top)
        layer = (y % 14) / 14  # stepped tiers
        half = int((w * .46) * t * (.7 + .3 * layer)) + 1
        for x in range(cx - half, cx + half + 1):
            edge = abs(x - cx) / max(1, half)
            if edge > .85 and rnd.random() < .5: continue  # ragged edge
            c = tones[min(3, int((1 - edge) * 2 + (1 - layer) * 1.5 + rnd.random() * .8))]
            d.point((x, y), fill=c + (255,))
    for y in range(h - 10, h):
        d.point((cx, y), fill=(30, 26, 30, 255)); d.point((cx + 1, y), fill=(22, 20, 24, 255))
    # a little moonlight frost on the tips
    for _ in range(40):
        y = rnd.randint(top + 4, h - 14); t = (y - top) / (h - 10 - top)
        x = cx + rnd.choice((-1, 1)) * int(w * .4 * t * rnd.random())
        if img.getpixel((x, y))[3]: d.point((x, y), fill=(168, 162, 180, 255))
    ps1_upscale(img, 4).save(os.path.join(TEX, name + '.png'), optimize=True)


def treeline(name, seed, dark, w=256, h=96):
    """Horizontally tileable strip of dense forest (alpha above the canopy line)."""
    rnd = random.Random(seed)
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    base = (24, 23, 30) if dark else (36, 35, 44)
    # back row of spruce silhouettes
    for k in range(40):
        x = rnd.randrange(w); th = rnd.randint(int(h * .55), h - 2); half = rnd.randint(6, 12)
        col = tuple(min(255, c + rnd.randint(-4, 6)) for c in base)
        for ox in (-w, 0, w):
            d.polygon([(x + ox, h - th), (x + ox - half, h), (x + ox + half, h)], fill=col + (255,))
    # solid band at the bottom so you cannot see between the trunks
    d.rectangle([0, int(h * .62), w, h], fill=base + (255,))
    if not dark:  # pale birch trunks in front
        for k in range(16):
            x = rnd.randrange(w)
            for y in range(int(h * .3), h):
                c = (214, 210, 220) if rnd.random() > .2 else (20, 18, 24)
                for ox in (0, w, -w):
                    d.point((x + ox, y), fill=c + (255,))
            for _ in range(30):
                px = x + rnd.randint(-7, 7); py = rnd.randint(int(h * .25), int(h * .6))
                c = rnd.choice([(150, 142, 158), (186, 178, 192), (120, 114, 128)])
                for ox in (0, w, -w):
                    d.point((px + ox, py), fill=c + (255,))
    ps1_upscale(img, 2).save(os.path.join(TEX, name + '.png'), optimize=True)


# ---------------------------------------------------------------- placeholder photographs
def photo(name, kind, seed):
    rnd = random.Random(seed)
    W, H = (120, 160) if kind != 'house' else (160, 120)
    img = Image.new('L', (W, H), 196)
    d = ImageDraw.Draw(img)
    # studio backdrop gradient
    for y in range(H):
        d.line([(0, y), (W, y)], fill=int(170 + 50 * y / H))
    if kind == 'portrait':
        cx = W // 2 + rnd.randint(-6, 6)
        d.ellipse([cx - 18, 34, cx + 18, 78], fill=70)                       # head
        d.ellipse([cx - 22, 28, cx + 22, 58], fill=40)                       # hair
        d.polygon([(cx - 46, H), (cx - 30, 92), (cx, 84), (cx + 30, 92), (cx + 46, H)], fill=55)  # dress
        d.polygon([(cx - 10, 84), (cx + 10, 84), (cx, 104)], fill=200)       # collar
    elif kind == 'couple':
        for cx, hh in ((W // 2 - 22, 46), (W // 2 + 20, 38)):
            d.ellipse([cx - 14, hh, cx + 14, hh + 34], fill=72)
            d.polygon([(cx - 30, H), (cx - 22, hh + 44), (cx + 22, hh + 44), (cx + 30, H)], fill=50)
    else:  # house / street
        d.rectangle([0, 80, W, H], fill=120)
        d.polygon([(40, 80), (40, 44), (80, 22), (120, 44), (120, 80)], fill=80)
        for x in (52, 74, 96): d.rectangle([x, 50, x + 12, 66], fill=190)
        for x in range(0, W, 22): d.line([(x, 0), (x + 6, 40)], fill=150)
    img = img.filter(ImageFilter.GaussianBlur(1.1))
    noise = Image.effect_noise((W, H), 26).convert('L')
    img = Image.blend(img, noise, .12)
    # vignette + sepia/pink tone
    vig = Image.new('L', (W, H), 0)
    ImageDraw.Draw(vig).ellipse([-W * .2, -H * .15, W * 1.2, H * 1.15], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(14))
    img = ImageChops.multiply(img, vig)
    rgb = Image.merge('RGB', [img.point(lambda v, k=k: int(min(255, v * k + 12))) for k in (1.0, .9, .92)])
    rgb.resize((W * 2, H * 2), Image.LANCZOS).save(os.path.join(PH, name + '.jpg'), quality=86)


if __name__ == '__main__':
    import sys
    sys.path.insert(0, os.path.dirname(__file__))
    from make_textures import rug
    # Wall lace. Default: the hand-refined lace pack in assets/lace-source/ (tools/import_lace.py).
    #   --wallpaper-lace each wallpaper's own pattern as lace, de-gritted (lace_clean)
    #   --raw-lace       the first, grittier wallpaper version (lace)
    #   --geometric-lace the cut-paper geometric set from tools/make_clean_lace.py
    use_pack = os.path.isdir(os.path.join(ROOT, 'lace-source')) and not any(f in sys.argv for f in ('--wallpaper-lace', '--raw-lace', '--geometric-lace'))
    if use_pack:
        import import_lace
        import_lace.run()
    elif '--geometric-lace' in sys.argv:
        import make_clean_lace
        for name, (fn, col) in make_clean_lace.DESIGNS.items():
            fn().save(name, col)
    else:
        raw = '--raw-lace' in sys.argv
        for n, (out, col, inv) in LACE.items():
            img = Image.open(os.path.join(WP, n + '.jpg'))
            lace(img, out, col) if raw else lace_clean(img, out, col, **LACE_TUNE.get(n, {}))
        rose = load_rose_from_glb()
        lace(rose, 'lace-rose', WHITE) if raw else lace_clean(rose, 'lace-rose', WHITE, **LACE_TUNE['rose'])
    sheer()
    for i, s in enumerate((3, 8)): birch_card('tree-birch-%d' % i, s)
    for i, s in enumerate((5, 9)): spruce_card('tree-spruce-%d' % i, s)
    treeline('treeline-near', 2, False); treeline('treeline-far', 6, True)
    for i, (k, s) in enumerate([('portrait', 1), ('couple', 2), ('portrait', 3), ('house', 4), ('portrait', 5), ('couple', 6), ('house', 7)]):
        photo('photo-%d' % (i + 1), k, s)
    # two more rugs so floors can be layered without repeating
    rug('rug-rose', 56, 84, dict(field='M', trellis='P', edge='K', guard='W', line='K', minor=('K', 'W'),
        mainGround='K', mainMotif='M', mainAccent='W', rings=[(1, 'K'), (.86, 'W'), (.74, 'K'), (.6, 'P'), (.44, 'K'), (.32, 'W')],
        core='H', hooks='K', cornerOuter='K', cornerInner='W', cornerCore='P', fill=['K', 'W', 'P'], fillAccent='H', medallions=[(0, .58, .3)]), seed=23)
    rug('rug-graphite', 56, 84, dict(field='G', trellis='C', edge='K', guard='S', line='K', minor=('K', 'S'),
        mainGround='C', mainMotif='S', mainAccent='P', rings=[(1, 'K'), (.86, 'S'), (.74, 'K'), (.6, 'P'), (.44, 'K'), (.32, 'S')],
        core='H', hooks='S', cornerOuter='K', cornerInner='S', cornerCore='P', fill=['S', 'K', 'P'], fillAccent='H', medallions=[(0, .58, .3)]), seed=29)
    print('done')
