"""Turns the lace ornament masks in assets/lace-source/ into the wall textures assets/textures/lace-*.png.

    python3 tools/import_lace.py

Source masks: 1024x1024, white ornament on black, seamless, no net (the 'ornaments/' folder from the
refined lace pack). To change a room's lace, replace its PNG in assets/lace-source/ and re-run.

For each room this:
  - scales the ornament to 512 (one tile = 2.2 m of wall) with clean hard edges,
  - adds the diagonal tulle net behind it, 2 px wide so it survives the PS1 resolution,
  - adds a slightly brighter stitched rim (cordonnet) and a faint woven texture inside the motifs,
    so it reads as thread rather than paper cut-outs,
  - tints it white or light pink, with alpha = thread (see-through everywhere else).
"""
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..', 'assets')
SRC = os.path.join(ROOT, 'lace-source')
OUT = os.path.join(ROOT, 'textures')

WHITE = (246, 242, 248)
PINK = (247, 205, 226)
ROOMS = {  # source mask -> (texture name, thread colour)
    'rose': ('lace-rose', WHITE),          # entrance, bedroom, outside of the house
    'courtyard': ('lace-courtyard', WHITE),
    'passage': ('lace-passage', WHITE),
    'archive': ('lace-archive', WHITE),
    'gallery': ('lace-gallery', PINK),
    'fitting': ('lace-fitting', PINK),
    'atelier': ('lace-atelier', PINK),
    'textile': ('lace-textile', PINK),
    'shrine': ('lace-shrine', WHITE),      # the panel behind the statue
}
NET_PERIOD = 32   # px along an edge between net threads (matches the pack's mesh)
NET_WIDTH = 2


def convert(src, colour, size=512):
    mask = Image.open(src).convert('L').resize((size, size), Image.LANCZOS).point(lambda v: 255 if v > 127 else 0)
    # tulle net, wrapped so the tile stays seamless
    net = Image.new('L', (size, size), 0)
    d = ImageDraw.Draw(net)
    for k in range(-size, 2 * size + 1, NET_PERIOD):
        d.line([(k, 0), (k + size, size)], fill=255, width=NET_WIDTH)
        d.line([(k, size), (k + size, 0)], fill=255, width=NET_WIDTH)
    rim = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(3)))           # 1 px inner edge
    weave = Image.new('L', (size, size), 0)                                          # faint stitch texture
    wd = ImageDraw.Draw(weave)
    for k in range(-size, 2 * size, 4):
        wd.line([(k, 0), (k + size, size)], fill=255)
    weave = ImageChops.multiply(weave, mask.filter(ImageFilter.MinFilter(5)))
    alpha = ImageChops.lighter(mask, net)
    rgb = Image.new('RGB', (size, size), tuple(int(c * .76) for c in colour))         # net: a little darker
    rgb = Image.composite(Image.new('RGB', (size, size), tuple(int(c * .95) for c in colour)), rgb, mask)
    rgb = Image.composite(Image.new('RGB', (size, size), tuple(int(c * .88) for c in colour)), rgb, weave)
    rgb = Image.composite(Image.new('RGB', (size, size), tuple(min(255, int(c * 1.04)) for c in colour)), rgb, rim)
    rgb.putalpha(alpha)
    return rgb


def run():
    done = []
    for src, (name, colour) in ROOMS.items():
        path = os.path.join(SRC, src + '.png')
        if not os.path.exists(path):
            continue
        convert(path, colour).save(os.path.join(OUT, name + '.png'), optimize=True)
        done.append(name)
    return done


if __name__ == '__main__':
    print('wrote', ', '.join(run()))
