"""Three more rug designs for layering (run from the project root):  python3 tools/make_more_rugs.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from make_textures import rug

# frosty silver-white ground, black + pink medallion (good on dark parquet)
rug('rug-ice', 60, 92, dict(field='W', trellis='S', edge='K', guard='P', line='K', minor=('K', 'S'),
    mainGround='K', mainMotif='W', mainAccent='P', rings=[(1, 'K'), (.86, 'P'), (.74, 'K'), (.6, 'S'), (.44, 'K'), (.32, 'P')],
    core='H', hooks='K', cornerOuter='K', cornerInner='S', cornerCore='P', fill=['K', 'G', 'P'], fillAccent='H',
    medallions=[(0, .6, .32)]), seed=31)
# long pink runner for the passages
rug('rug-runner-pink', 34, 128, dict(field='M', trellis='P', edge='K', guard='W', line='K', minor=('K', 'W'),
    bands=[(1, 'edge'), (1, 'guard'), (2, 'minor'), (1, 'line')],
    rings=[(1, 'K'), (.82, 'W'), (.68, 'K'), (.5, 'P'), (.36, 'H')], core='W', hooks='K',
    cornerOuter='M', cornerInner='M', cornerCore='M', corner=.01, fill=['K', 'W'], fillAccent='H', lattice=(8, 10),
    medallions=[(-.75, .8, .12), (-.375, .8, .12), (0, .8, .12), (.375, .8, .12), (.75, .8, .12)]), seed=37)
# small black prayer-rug style piece with an arched niche (bedside, doorways, the shrine step)
rug('rug-small', 44, 64, dict(field='K', trellis='C', edge='C', guard='P', line='C', minor=('C', 'P'),
    bands=[(1, 'edge'), (1, 'guard'), (2, 'minor'), (5, 'main'), (1, 'guard')], unit=10,
    mainGround='C', mainMotif='S', mainAccent='P', rings=[(1, 'S'), (.84, 'K'), (.7, 'P'), (.5, 'K'), (.34, 'W')],
    core='H', hooks='S', cornerOuter='S', cornerInner='K', cornerCore='P', fill=['S', 'P'], fillAccent='H',
    medallions=[(0, .62, .38)]), seed=41)
print('wrote rug-ice, rug-runner-pink, rug-small')
