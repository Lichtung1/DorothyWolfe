"""Processes full-quality wall art into game textures. Your originals are never changed.

    python3 tools/import_art.py                  # every original in assets/art-source/
    python3 tools/import_art.py firebird         # just one
    python3 tools/import_art.py --palette        # also recolour into Dorothy's palette
    python3 tools/import_art.py --raw            # no PS1 colour reduction (just crop + resize)
    python3 tools/import_art.py --fry            # the house look: 192 px, the 7-colour dusty-rose palette, light ordered dither
    python3 tools/import_art.py --fry=free       # 96 px, 20 colours picked from the picture itself
    python3 tools/import_art.py --fry=hard       # chunky pixel art (56 px, 12 colours, flattened colour areas)
    python3 tools/import_art.py --fry=soft       # gentler (128 px, 24 colours)
    python3 tools/import_art.py --fry --warm     # skip the cool-pink grade (keep the original's warm tones)
Per-piece settings (crop, recolour, how hard to fry) are in SLOT_OPTIONS below.

1. Save the good, full-size art in assets/art-source/ with the slot's name: firebird.png, moonlit-river.jpg, ...
   (the names and frame shapes come from ART in decor.js; see assets/art/README.txt).
2. Run this. For each original it:
   - crops to the frame's proportions (from the centre), or to a circle for the tray and plate,
   - shrinks it to texture size (512 px on the long side; the game crunches it further when drawing),
   - reduces it to 64 colours with a light dither, like a PS1 texture's colour table (skip with --raw),
   - grades warm tones into Opal's colours: salmon and peach become cool pink, sepia becomes silver (skip with --warm),
   - optionally maps it into the palette: black, silver, light pink, a little hot pink (--palette),
   and writes assets/art/<name>.png, replacing the placeholder.
"""
import os, re, sys
from PIL import Image, ImageChops, ImageDraw, ImageOps

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC, OUT = os.path.join(ROOT, 'assets', 'art-source'), os.path.join(ROOT, 'assets', 'art')
LONG = 512
# The house palette: black, charcoal, two dusty mauve-greys, dusty rose, ivory, light pink.
DUSTY = [(9, 9, 12), (48, 43, 49), (98, 83, 91), (151, 129, 139), (210, 161, 172), (238, 228, 223), (240, 197, 204)]
FRY = {'default': (192, 7, .26, 0, DUSTY), 'free': (96, 20, .5, 3, None),
       'soft': (128, 24, .45, 0, None), 'hard': (56, 12, .6, 5, None)}  # (px, colours, dither, flatten, fixed palette)

# Per-piece overrides. crop = (left, top, right, bottom) in source pixels; palette = 'mono' (black/silver/pink by
# brightness, colour removed) or 'pink' (keeps white, turns every colour into pinks); fry = (px, colours, dither);
# fringe = make the photo background around a textile transparent; boost = pre-saturate small painted details;
# cool = False keeps the original's warm tones for that piece; done = the original is already a finished texture
# (made by hand in the house palette), so it is never cropped or recoloured.
SLOT_OPTIONS = {
    # Finished pieces (small, a handful of colours) are detected automatically. These round ones have soft
    # edges with many in-between colours, so they're marked by hand:
    'gzhel-plate': dict(done=True), 'zhostovo-tray': dict(done=True), 'plate-flowers': dict(done=True),
    # examples (museum photos of a plate and a shawl):
    # 'some-plate': dict(crop=(55, 115, 1042, 1102), palette='pink', fry=(64, 14, .55, 0, None), boost=1.8),
    # 'some-shawl': dict(palette='pink', fry=(56, 12, 1.1, 0, None), fringe=True),
}


def art_slots():
    js = open(os.path.join(ROOT, 'decor.js'), encoding='utf8').read()
    block = js[js.index('export const ART'):]
    block = block[:block.index('];')]
    block = '\n'.join(l for l in block.splitlines() if not l.strip().startswith('//'))  # commented-out lines are spares
    row = re.compile(r"\['([\w-]+)\.png',\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+),\s*[^,]+,\s*'(\w+)'")
    return {m[0]: dict(w=float(m[4]), h=float(m[5]), round=m[6] == 'none') for m in row.findall(block)}


def palette_map(im):
    """Luminance -> black / charcoal / silver / light pink / white, with strong colour pulled to hot pink."""
    stops = [(0, (18, 16, 20)), (.25, (48, 42, 52)), (.55, (150, 146, 160)), (.78, (238, 190, 214)), (1, (248, 242, 248))]
    rgb = im.convert('RGB'); px = rgb.load(); w, h = rgb.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]; l = (.3 * r + .59 * g + .11 * b) / 255
            mx, mn = max(r, g, b), min(r, g, b); sat = (mx - mn) / max(1, mx)
            for (a, ca), (bb, cb) in zip(stops, stops[1:]):
                if l <= bb:
                    k = (l - a) / (bb - a); c = [ca[i] + (cb[i] - ca[i]) * k for i in range(3)]; break
            if sat > .55 and l > .3:  # vivid accents become hot pink
                f = min(1, (sat - .55) * 2.5); c = [c[i] + ((244, 95, 240)[i] - c[i]) * f * .7 for i in range(3)]
            px[x, y] = tuple(int(v) for v in c)
    out = rgb.convert('RGBA'); out.putalpha(im.getchannel('A')); return out


def cool_pink(im, centre=342, squeeze=.3, desat=.4):
    """Opal's pink is cool (rose, hue ~333), most paintings' pinks are warm (salmon, peach) and their greys sepia.
    Reds, oranges and yellows are squeezed into a narrow band of rose pinks around `centre`; low-colour warm
    greys lose most of their tint, so sepia reads as silver. Blues, greens and neutrals are left alone."""
    import numpy as np
    a = im.getchannel('A'); hsv = np.asarray(im.convert('RGB').convert('HSV'), float)
    h, s = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
    w = (h + 180) % 360 - 180  # degrees from red
    warm = np.abs(w) <= 70
    hsv[..., 0] = np.where(warm, (centre + w * squeeze) % 360, h) * 255 / 360
    hsv[..., 1] = np.where(warm & (s < .22), s * desat, s) * 255
    out = Image.fromarray(hsv.round().astype('uint8'), 'HSV').convert('RGBA'); out.putalpha(a); return out


BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def deep_fry(im, long_side=192, colours=7, strength=.26, flatten=0, fixed=DUSTY):
    """A PS1-era texture: tiny native resolution, a small colour table and ordered (Bayer) dithering,
    blown back up with hard pixels. Smooth gradients and fine detail can't survive it."""
    import numpy as np
    from PIL import ImageEnhance, ImageFilter
    if flatten:  # pixel-art pass: flatten colour areas at a mid size first, so shapes come out as clean blocks
        s = 256 / max(im.size); mid = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
        al = mid.getchannel('A'); im = mid.convert('RGB').filter(ImageFilter.ModeFilter(flatten)).convert('RGBA'); im.putalpha(al)
    a = im.getchannel('A')
    rgb = ImageEnhance.Contrast(im.convert('RGB')).enhance(1.12)
    rgb = ImageEnhance.Color(rgb).enhance(1.25).filter(ImageFilter.UnsharpMask(2, 80, 2))  # keep pinks pink and shapes readable
    s = long_side / max(rgb.size); small = (max(1, round(rgb.size[0] * s)), max(1, round(rgb.size[1] * s)))
    rgb = rgb.resize(small, Image.BOX); a = a.resize(small, Image.BOX)
    if fixed: pal = np.array(fixed, float); colours = len(pal)
    else: pal = np.array(rgb.quantize(colors=colours, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).getpalette()[:colours * 3], float).reshape(-1, 3)
    px = np.asarray(rgb, float)
    h, w = px.shape[:2]
    spread = 255 / (colours ** (1 / 3)) * strength  # dither amplitude ~ one palette step
    th = (np.array(BAYER, float)[np.arange(h)[:, None] % 4, np.arange(w)[None, :] % 4] / 16 - .5) * spread
    d = ((px + th[..., None])[:, :, None, :] - pal[None, None]) ** 2
    out = pal[d.sum(-1).argmin(-1)].astype('uint8')
    fried = Image.fromarray(out, 'RGB').convert('RGBA'); fried.putalpha(a.point(lambda v: 255 if v > 127 else 0))
    k = max(1, 256 // max(small))  # up to at most 256 px with hard pixels: the game packs each piece into a 256 px cell
    return fried.resize((small[0] * k, small[1] * k), Image.NEAREST)


def pink_map(im):
    """Porcelain look: whites stay white, greys go silver/black, and colours become Opal's pinks:
    dark colours go to charcoal (never purple or plum), mid colours to hot pink, light colours to light pink."""
    def lerp(a, b, k): return [a[i] + (b[i] - a[i]) * k for i in range(3)]
    HOT, LIGHT, WHITE, CHAR = (244, 95, 240), (243, 192, 215), (250, 242, 247), (34, 30, 36)
    rgb = im.convert('RGB'); px = rgb.load(); w, h = rgb.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]; l = (.3 * r + .59 * g + .11 * b) / 255
            mx, mn = max(r, g, b), min(r, g, b); sat = (mx - mn) / max(1, mx)
            grey = lerp((18, 16, 20), (248, 244, 248), l)
            if l < .18: pink = CHAR
            elif l < .6: pink = lerp(HOT, LIGHT, (l - .18) / .42)
            else: pink = lerp(LIGHT, WHITE, (l - .6) / .4)
            k = min(1, max(0, (sat - .15) * 3))
            px[x, y] = tuple(int(v) for v in lerp(grey, pink, k))
    out = rgb.convert('RGBA'); out.putalpha(im.getchannel('A')); return out


def drop_fringe_background(im, border=.07):
    """Textile photos: grey studio background showing between the fringe becomes transparent."""
    px = im.load(); w, h = im.size; bw, bh = int(w * border), int(h * border)
    for y in range(h):
        for x in range(w):
            if bw <= x < w - bw and bh <= y < h - bh: continue
            r, g, b, a = px[x, y]; mx, mn = max(r, g, b), min(r, g, b)
            if (mx - mn) / max(1, mx) < .1 and 120 < mx < 220: px[x, y] = (r, g, b, 0)
    return im


def fill_holes(im, colour=(238, 228, 223)):
    """Round pieces (plates, trays): see-through gaps INSIDE the plate (a pierced rim, say) are filled with
    porcelain ivory, so you never see the wall through a plate. Only the outside of the circle stays transparent."""
    from PIL import ImageDraw
    m = im.getchannel('A').point(lambda v: 255 if v > 127 else 0)
    w, h = m.size  # the outside: every see-through area touching the edge (a plate that touches the edges splits it in four)
    for xy in [(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)]:
        if m.getpixel(xy) == 0: ImageDraw.floodfill(m, xy, 128)
    holes = m.point(lambda v: 255 if v == 0 else 0)
    if holes.getbbox(): im.paste(Image.new('RGBA', im.size, colour + (255,)), (0, 0), holes)
    return im


def process(name, slot, path, palette, raw, fry=None, cool=True):
    opt = SLOT_OPTIONS.get(name, {})
    im = Image.open(path).convert('RGBA')
    if 'done' not in opt:  # a small picture with only a handful of colours is already a finished texture
        import numpy as np
        px = np.asarray(im); solid = px[px[..., 3] > 127][:, :3]
        opt = dict(opt, done=max(im.size) <= 256 and len(np.unique(solid, axis=0)) <= 12)
    if opt.get('done'):  # finished by hand: just scale up with hard pixels
        im.putalpha(im.getchannel('A').point(lambda v: 255 if v > 127 else 0))
        if slot['round']: im = fill_holes(im)
        k = max(1, 256 // max(im.size)); im = im.resize((im.size[0] * k, im.size[1] * k), Image.NEAREST)
        dst = os.path.join(OUT, name + '.png'); im.save(dst, optimize=True); return dst, im.size
    if opt.get('crop'): im = im.crop(opt['crop'])
    if opt.get('fringe'): im = drop_fringe_background(im)
    if fry and opt.get('fry'): fry = opt['fry']
    palette = opt.get('palette', palette)
    if opt.get('boost'):  # stronger colour first, so small painted details survive the shrink
        from PIL import ImageEnhance
        al = im.getchannel('A'); im = ImageEnhance.Color(im.convert('RGB')).enhance(opt['boost']).convert('RGBA'); im.putalpha(al)
    if slot['round']:
        side = min(im.size); im = ImageOps.fit(im, (side, side), Image.LANCZOS)
        mask = Image.new('L', (side * 4, side * 4), 0); ImageDraw.Draw(mask).ellipse([4, 4, side * 4 - 4, side * 4 - 4], fill=255)
        mask = mask.resize((side, side), Image.LANCZOS)
        im.putalpha(ImageChops.multiply(mask, im.getchannel('A')))  # circle, keeping any transparency the original had
    else:
        ar = slot['w'] / slot['h']
        tw, th = (LONG, round(LONG / ar)) if ar >= 1 else (round(LONG * ar), LONG)
        im = ImageOps.fit(im, (tw, th), Image.LANCZOS)
    s = LONG / max(im.size)
    if s < 1: im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
    if cool and opt.get('cool', True) and not palette: im = cool_pink(im)
    if palette == 'pink': im = pink_map(im)
    elif palette: im = palette_map(im)
    if fry:
        im = deep_fry(im, *fry)
    elif not raw:  # PS1-style colour table: 64 colours, light dither (alpha kept as-is)
        a = im.getchannel('A')
        q = im.convert('RGB').quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).convert('RGBA')
        q.putalpha(a.point(lambda v: 255 if v > 127 else 0)); im = q
    if slot['round']: im = fill_holes(im)
    dst = os.path.join(OUT, name + '.png'); im.save(dst, optimize=True)
    return dst, im.size


def main(argv):
    os.makedirs(SRC, exist_ok=True)
    slots = art_slots(); only = [a for a in argv if not a.startswith('--')]
    palette, raw = '--palette' in argv, '--raw' in argv
    fry = next((FRY[k] for k in ('hard', 'soft') if '--fry=' + k in argv), FRY['default'] if '--fry' in argv else None)
    done = 0
    for name, slot in slots.items():
        if only and name not in only: continue
        src = next((os.path.join(SRC, name + e) for e in ('.png', '.jpg', '.jpeg', '.webp') if os.path.exists(os.path.join(SRC, name + e))), None)
        if not src:
            if only: print('no original for', name, 'in assets/art-source/')
            continue
        dst, size = process(name, slot, src, palette, raw, fry, '--warm' not in argv); done += 1
        print('%-22s -> %s  %dx%d%s' % (os.path.basename(src), os.path.relpath(dst, ROOT), size[0], size[1], '  (round)' if slot['round'] else ''))
    if not done: print('Nothing to do: put originals in assets/art-source/ named after the slots:', ', '.join(slots))


if __name__ == '__main__':
    main(sys.argv[1:])
