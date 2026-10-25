"""Turns a baked (or painted) stained-glass image into an arched window texture for the site.

    python3 tools/import_glass.py my-bake.png rose
    python3 tools/import_glass.py my-wolf-window.png wolf

The first writes over assets/textures/stained-glass-rose.png (every 'rose' window changes). The second makes a new
design called 'wolf'; to use it, change a window's design name to 'wolf' in WINDOWS in decor.js.

It takes any rectangle (ideally 1:2, e.g. a 128x256 Blender bake), scales it to 128x256 keeping hard pixels,
cuts the round-topped arch shape, adds a black lead frame around the edge, and prints a colour to paste into
GLASS_LIGHT in decor.js so the light it throws on the floor matches.
Options: --no-arch (keep it rectangular), --frame N (lead frame width in px, default 3), --size WxH.
"""
import os, sys
from PIL import Image, ImageDraw, ImageChops, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'textures')


def main(argv):
    args = [a for a in argv if not a.startswith('--')]
    if len(args) < 2:
        print(__doc__); return 1
    src, name = args[0], args[1]
    opt = lambda k, d: next((argv[i + 1] for i, a in enumerate(argv) if a == k and i + 1 < len(argv)), d)
    W, H = (int(v) for v in opt('--size', '128x256').split('x'))
    frame = int(opt('--frame', '3'))
    arch = '--no-arch' not in argv

    im = Image.open(src).convert('RGBA')
    # fit: cover the target aspect (crop the excess), then scale with hard pixels
    sw, sh = im.size
    if sw / sh > W / H:
        nw = int(sh * W / H); im = im.crop(((sw - nw) // 2, 0, (sw - nw) // 2 + nw, sh))
    else:
        nh = int(sw * H / W); im = im.crop((0, (sh - nh) // 2, sw, (sh - nh) // 2 + nh))
    im = im.resize((W, H), Image.NEAREST if im.size[0] <= W * 2 else Image.LANCZOS)

    S = 4  # supersampled mask for a clean arch edge
    mask = Image.new('L', (W * S, H * S), 0); d = ImageDraw.Draw(mask)
    r = W * S / 2
    if arch:
        d.rectangle([0, r, W * S, H * S], fill=255); d.ellipse([0, 0, W * S, 2 * r], fill=255)
    else:
        d.rectangle([0, 0, W * S, H * S], fill=255)
    mask = mask.resize((W, H), Image.LANCZOS).point(lambda v: 255 if v > 127 else 0)
    alpha = ImageChops.multiply(mask, im.getchannel('A'))
    lead = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(frame * 2 + 1)))
    out = Image.composite(Image.new('RGBA', (W, H), (16, 14, 18, 255)), im, lead)
    out.putalpha(alpha)
    dst = os.path.join(OUT, 'stained-glass-%s.png' % name)
    out.save(dst, optimize=True)

    # suggested floor-light colour: average of the bright glass, boosted a little
    rgb_b, a_b = out.convert('RGB').tobytes(), alpha.tobytes()
    px = [tuple(rgb_b[i * 3:i * 3 + 3]) for i in range(W * H) if a_b[i] and sum(rgb_b[i * 3:i * 3 + 3]) > 300]
    if px:
        avg = [sum(c[i] for c in px) / len(px) for i in range(3)]
        m = max(avg) or 1
        hexc = '#%02x%02x%02x' % tuple(int(min(255, v / m * 245)) for v in avg)
    else:
        hexc = '#f2d4ea'
    print('wrote', os.path.abspath(dst))
    print("floor light: add  %s: '%s'  to GLASS_LIGHT in decor.js" % (name, hexc))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
