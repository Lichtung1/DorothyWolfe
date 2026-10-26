// decor.js: Dorothy's palette, rugs, stained glass and the greybox props.
//
// Every prop in PROPS is a placeholder built from simple shapes. When a real model is ready:
//   1. Export it from Blender as .glb (1 unit = 1 m, origin at floor centre, front facing -Y in Blender = +Z here).
//   2. Put it in assets/models/ and write its filename in that prop's `model` field below.
//   The greybox disappears and the model is placed at the same spot. Collision stays as the `solid` footprint.
//
// Coordinates: x/z are the same numbers app.js uses for objects (x across, z = app.js `y`). y is height.
// ry: which way the front faces. 0 = +z (toward the front door), PI = -z, PI/2 = +x (east), -PI/2 = -x (west).
import { Texture, ground, node, canvasTexture, buildLightPools, makeAtlas } from './babylon-extras.js';
const B = window.BABYLON;
const PI = Math.PI;

export const PAL = {
  black: '#141216', charcoal: '#2e2b32', graphite: '#6f6b76', silver: '#bcbac4', chrome: '#dcdbe4',
  pale: '#ece7ec', ivory: '#efe8e4', pink: '#f3c0d7', midpink: '#de9cbe', hot: '#f45ff0', ash: '#5a565e',
};

// ---------------------------------------------------------------- palette swaps for the existing GLB
// Wallpaper material (substring of the Blender material name) -> recoloured image in assets/wallpapers/.
// Delete a line to get the original paper back. Originals are untouched.
export const WALLPAPER_SWAP = {
  'plum tulips': 'plum-tulips-dw.jpg',          // archive: no plum, now black + silver
  'sage fern': 'sage-fern-dw.jpg',              // gallery: graphite + silver ferns
  'blue cross-stitch': 'blue-cross-stitch-dw.jpg', // atelier: silver
  'ivory cross-stitch': 'ivory-cross-stitch-dw.jpg', // textile room: ivory, black + pink stitches
  'rose floral': 'rose-floral-dw.jpg',          // fitting room: light pink
  'heart damask': 'heart-damask-dw.jpg',        // courtyard: light pink + black
  'pink damask': 'pink-damask-dw.jpg',          // passage: soft pink
  'Faded floral paper': 'rose-packed-dw.jpg',   // vestibule, bedroom, outside walls: black with pink roses
};
// LACE HOUSE: each wallpaper's own pattern turned into see-through lace (assets/textures/lace-*.png,
// made by tools/make_lace_and_sprites.py). Set LACE_WALLS = false to go back to the solid papers above.
// The 'weave' terminal command toggles lace on/off while walking around.
export const LACE_WALLS = true;
export const LACE_SWAP = {
  'plum tulips': 'lace-archive', 'sage fern': 'lace-gallery', 'blue cross-stitch': 'lace-atelier',
  'ivory cross-stitch': 'lace-textile', 'rose floral': 'lace-fitting', 'heart damask': 'lace-courtyard',
  'pink damask': 'lace-passage', 'Faded floral paper': 'lace-rose',
};
// LACE LINING: how much of the see-through gap behind the lace is filled with a dark 'silk lining' (0 = sheer, 1 = solid).
// Matched against the Blender material names, first match wins. Terminal command `lining` toggles it; Dream mode goes sheer.
export const LACE_LINING = {
  rules: [['Faded floral paper', .45]],  // entrance, bedroom and the outside of the house: lighter, so the cottage glows
  interior: .7,                          // every other room's walls
  secretWall: .3,                        // the hidden passage wall: the sheerest, so you can peek into the bedroom
  color: '#231c27',                      // the lining (a dusky plum-black, darker than the lace)
  dream: .3,                             // Dream mode multiplies the lining by this
};
// Flat material colour overrides (Blender material name -> hex). Delete a line to keep the GLB colour.
export const MATERIAL_TINT = {
  'Warm ivory painted trim': '#cfccd6', // skirting + cornice -> silver
  'Old brass': '#c9c8d2',               // curtain rods -> silver
  'DW_Walnut': '#3a3034',               // furniture -> near-black lacquer
  'DW_Pewter': '#a9a7b2',
  'DW_Dusty_Rose': '#e9b3cc',           // rail swatches: mauve -> light pink
  'Greybox / dusty pink': '#efc0d6',    // central plinth
  'DW_Sage': '#2e2a30',                 // sketchbooks: green -> charcoal
  'Luminous pearl': '#f2d4e5',          // floating pearls: peach -> pearl pink
  'Old paper': '#e9e2dc',               // paper patterns: tan -> ivory
  'Rose thread': '#f45ff0',             // thread spools: red -> Opal's hot pink (one of the few bright accents)
  'CRT midnight glow': '#1c1a22',       // TV glass: teal -> charcoal
};
// Texture overrides (Blender material name -> { file: texture in assets/textures/, alpha, scale }). Empty for now.
export const TEXTURE_SWAP = {};
// GLB objects hidden at runtime because something below replaces them. Delete them in Blender when convenient.
export const HIDE_FROM_GLB = [/^Courtyard carpet/, /^Atelier rug$/, /^Fitting rug$/, /^Textile_Rail_/, /^Gallery_Rail_.*Fabric_Swatch/,
  /^Lace curtain/]; // the window curtains: replaced by the billowing sheer ones (WINDOW_CURTAINS)
// Billowing sheer curtains, like the bedroom's, for the three big window openings in the house (2 m wide, curtains
// drawn back to each side). [x, z (centre of the opening), facing ry: the way they blow, into the room]
export const WINDOW_CURTAINS = [
  [-3.25, 0, -PI / 2],  // courtyard -> west passage
  [3.25, 0, PI / 2],    // courtyard -> east passage
  [-5.45, 0, -PI / 2],  // west passage -> atelier
];

// ---------------------------------------------------------------- rugs (pixel-art textures in assets/textures/rug-*.png)
// floor: [texture, x, z, long, short, alongX, extra turn (radians), layer 0/1/2 (higher sits on top)]
// wall:  [texture, x, y, z, width, height, facing ry]   (wall rugs hang sideways: the texture's long side runs across)
// Rugs: kazak (black, geometric), medallion (black, rose medallion), runner-ivory, runner-rose, plus colourways of the
// first two (-ivory, -rose); and the lace carpets (lace-blush, -noir, -pink, -silver: 1:2, roughed up by
// tools/rough_rugs.py from the clean originals in assets/rug-source/). Keep each rug close to its
// texture's proportions (about 2:3, runners 1:1.9, lace 1:2) so the pattern isn't stretched.
// A long passage gets several runners laid end to end rather than one stretched runner.
function runnerRow(tex, x, z, length, alongX, aspect = 1.9, gap = .08) {
  const n = Math.max(1, Math.round(length / 1.5)), len = (length - gap * (n - 1)) / n, w = len / aspect, out = [];
  for (let i = 0; i < n; i++) { const o = -length / 2 + len / 2 + i * (len + gap); out.push([tex, alongX ? x + o : x, alongX ? z : z + o, len, w, alongX]); }
  return out;
}
export const FLOOR_RUGS = [
  ['rug-medallion', 0, -1.8, 2.7, 1.65, true],               // courtyard
  ['rug-kazak-rose', -1.0, -2.4, 1.6, 1.07, true, .35, 1],
  ['rug-kazak', 1.4, -1.1, 1.6, 1.07, true, -.25, 1],        //   ...under the samovar table
  ['rug-medallion-ivory', -7.4, 2.65, 2.6, 1.57, true],      // atelier
  ['rug-lace-silver', -6.7, 3.6, 1.6, .8, true, .3, 1],
  ['rug-kazak-ivory', 7.3, 2.8, 2.3, 1.53, true],            // fitting room
  ['rug-lace-blush', 7.9, 3.7, 1.5, .75, true, -.4, 1],
  ['rug-medallion-ivory', -6.9, -7.89, 2.7, 1.63, true],     // bedroom / library
  ['rug-lace-noir', -4.1, -7.3, 2.2, 1.1, true, .12, 1],
  ['rug-kazak-ivory', -6.1, -6.8, 1.4, .93, true, -.5, 2],
  ...runnerRow('rug-runner-ivory', 0, 7.75, 3.0, false),     // vestibule
  ['rug-kazak-rose', .25, 9.25, 1.2, .8, true, .5, 1],
  ['rug-kazak-ivory', 7.55, -2.6, 2.0, 1.33, false],         // archive
  ['rug-kazak', -7.5, -3.6, 1.4, .93, true, .4],             // textile room
  ['rug-kazak', 3.8, -8.9, 2.2, 1.47, true, .08],            // gallery, under the polar bear
  // more layering (they all share one texture and one mesh, so extra rugs are free)
  ...runnerRow('rug-runner-rose', -2.7, 4.7, 3.4, true),     // south passage
  ...runnerRow('rug-runner-rose', 2.9, 4.7, 3.4, true),
  ...runnerRow('rug-runner-ivory', -2.6, -4.7, 3.6, true),   // north passage
  ...runnerRow('rug-runner-ivory', 2.6, -4.7, 3.6, true),
  ...runnerRow('rug-runner-rose', -4.2, 0, 4.2, false),      // west passage
  ...runnerRow('rug-runner-ivory', 4.2, 0, 4.2, false),      // east passage
  ['rug-lace-silver', 1.7, 1.6, 1.6, .8, true, .45, 1],      // courtyard, near the chair
  ['rug-kazak-rose', -1.25, 7.25, 1.0, .67, false, .2, 1],   // vestibule, under the coat stand
  ['rug-medallion-ivory', .95, -7.4, 2.0, 1.2, true, .12],   // gallery, in front of the west rail
  ['rug-kazak-rose', 6.0, -7.3, 1.6, 1.07, true, .25, 1],    // gallery, in front of the east rail
  ['rug-lace-pink', 7.9, -7.0, 1.4, .7, false, -.3],         // gallery, by the TV
  ['rug-kazak-rose', 6.9, -4.6, 1.3, .87, true, .2, 1],      // archive, under the desk chair
  ['rug-kazak-ivory', -7.4, .9, 2.4, 1.6, true],             // atelier, under the cutting table
  ['rug-kazak-rose', -6.2, -3.1, 1.4, .93, false, -.35, 1],  // textile room, by the drawing table
  ['rug-medallion', 7.0, 1.1, 1.2, .73, true, .5],           // fitting room, by the door
  ['rug-kazak-rose', -5.1, -8.9, 1.0, .67, true, -.2, 2],    // bedroom, bedside
  ['rug-medallion', 3.3, 44.8, 1.4, .85, true],              // the shrine step: a prayer rug under the offerings
];
// Rugs stay on the floor: what hangs on the walls is the tapestries (in ART). Kept empty, but still works if needed.
export const WALL_RUGS = [];

// ---------------------------------------------------------------- stained glass (unlit, glows at night)
// [design, x, yBottom, z, width, height, facing ry (into the room), outside?]. design = texture
// assets/textures/stained-glass-<design>.png: cigarette, sword, scissors, spool (96x256, 3:8; no flowers;
// add your own with tools/import_glass.py). outside = true: an exterior wall, so the same window also shows on the
// outside of the house, seen from the road. All the glass shares one texture and one mesh. Opalescent: see opal.js.
const G = (d, x, z, ry, w = .54, yb = .95) => [d, x, yb, z, w, w * 8 / 3, ry, true];
export const WINDOWS = [
  G('cigarette', -1.25, 9.885, PI, .5, .9), G('cigarette', 1.25, 9.885, PI, .5, .9), // front door sidelights
  G('sword', -2.085, 7.6, PI / 2),                                          // entrance, west wall
  G('scissors', -9.385, .3, PI / 2), G('spool', -9.385, 2.3, PI / 2),       // atelier
  G('scissors', -9.385, -4.85, PI / 2, .46, 1.12),                          // textile room, over the sewing machine
  G('sword', 2.35, -9.885, 0), G('sword', 5.25, -9.885, 0),                 // gallery, either side of the fireplace
];
// Colour of the light each design throws on the floor (import_glass.py prints a suggestion for new designs).
export const GLASS_LIGHT = { cigarette: '#bfbafa', scissors: '#beb4f6', sword: '#c0acf5', spool: '#e796ea' };

// ---------------------------------------------------------------- wall art (Russian folk + painting, in the palette)
// [file in assets/art/, x, y (centre height), z, width, height, facing ry, frame: silver | black | none | rod, name, line]
// Replace an image with your own (same filename, same proportions) or add a row. All art shares one texture.
export const ART = [
  ['smoke-rings.png', 2.09, 1.62, 8.95, .48, .64, -PI / 2, 'black', 'THE POSTER', 'After Alphonse Mucha\'s poster for JOB cigarette papers, 1896. The smoke curls into her hair.'],
  ['plate-flowers.png', 2.09, 1.7, 7.1, .45, .45, -PI / 2, 'none', 'THE PLATE', 'A porcelain plate painted with pink blossoms, hung by the telephone.'],
  ['moonlit-river.png', -2.0, 1.75, -3.49, .8, .6, 0, 'silver', 'THE PAINTING', 'After Arkhip Kuindzhi\'s Moonlit Night on the Dnieper, 1880. When it was first shown, alone in a dark room, people queued for hours to see it.'],
  ['photo-match.png', -1.2, 1.62, 5.9, .6, .7, 0, 'black', 'THE PHOTOGRAPH', 'A woman lighting a cigarette, her face lit by the flame. She has been waiting a long time for someone.'],
  ['photo-smoke.png', 1.6, 1.62, 5.9, .55, .7, 0, 'black', 'THE PHOTOGRAPH', 'Eyes closed, a cigarette, a little hat. Whatever happened, she is not going to tell you.'],
  ['photo-gun.png', -2.05, 1.72, -3.715, .52, .7, PI, 'black', 'THE FILM STILL', 'She has the gun. He has the chair. It is not clear who is in trouble.'],
  ['photo-pearls.png', -2.99, 1.72, 2.4, .49, .7, PI / 2, 'silver', 'THE PHOTOGRAPH', 'Pearls to the waist and a cigarette holder as long as her arm.'],
  ['photo-holder.png', 2.99, 1.72, 2.4, .46, .7, -PI / 2, 'silver', 'THE PHOTOGRAPH', 'Black gloves, a long holder, and a look that says the party was her idea.'],
  ['photo-fur.png', -.95, 1.75, -9.885, .5, .7, 0, 'black', 'THE FILM STILL', 'A blonde in white fur, smoke curling up, a man watching from the dark behind her.'],
  ['zhostovo-tray.png', 2.0, 1.75, -3.49, .55, .55, 0, 'none', 'THE TRAY', 'A black lacquered Zhostovo tray, painted with roses. Too pretty to carry tea on.'],
  ['birch-wood.png', -2.0, 1.72, 3.49, .46, .66, PI, 'silver', 'THE PAINTING', 'Ivan Shishkin, In the Wild North, 1891. A lone pine on a snowy cliff, dreaming of a palm tree far away.'],
  ['gzhel-plate.png', 2.0, 1.75, 3.49, .45, .45, PI, 'none', 'THE PLATE', 'A porcelain plate, hung on the wall like a second moon.'],
  ['painting-reclining.png', -2.99, 1.72, -2.4, .66, .66, PI / 2, 'silver', 'THE PAINTING', 'Frederic Leighton, Flaming June, 1895. He painted her in blazing orange. Here she sleeps in pink.'],
  ['photo-blonde.png', 2.99, 1.72, -2.4, .56, .7, -PI / 2, 'silver', 'THE PHOTOGRAPH', 'Platinum curls, a cigarette, and no intention of explaining herself.'],
  ['kokoshnik-portrait.png', 2.6, 1.74, -5.91, .62, .92, PI, 'silver', 'THE SWAN PRINCESS', 'Mikhail Vrubel, The Swan Princess, 1900. She is turning back into a swan, and looking over her shoulder at you.'],
  ['plate-birds.png', 4.55, 1.74, -5.91, .62, .62, PI, 'none', 'THE PLATE', 'A pierced porcelain plate: two long-tailed birds in a blossoming branch.'],
  ['firebird.png', 6.4, 1.74, -5.91, .5, .72, PI, 'black', 'THE FIREBIRD', 'Ivan Bilibin, Ivan Tsarevich and the Firebird, 1899. They say one feather lights a whole room.'],
  ['cinema-poster.png', 9.385, 1.62, -8.5, .5, .7, -PI / 2, 'black', 'THE FILM POSTER', '"A Life for a Life", 1916, starring Vera Kholodnaya, queen of the silent screen. "For every tear, a drop of blood."'],
  ['tapestry-birds.png', -7.4, 1.65, 5.69, 1.2, .8, PI, 'rod', 'THE TAPESTRY', 'Two birds of paradise in a flowering branch, woven in black and rose. Hung from a silver rod like a painting.'],
  ['tapestry-leaves.png', -6.4, 1.7, -1.485, 1.2, .8, 0, 'rod', 'THE TAPESTRY', 'Rose acanthus leaves on black wool. There is a copy of it half-finished on the loom.'],
  ['photo-dancer.png', 8.4, 1.9, 5.685, .45, .72, PI, 'black', 'THE PHOTOGRAPH', 'A dancer in a slip of a dress, caught mid-turn in the dark.'],
];

// ---------------------------------------------------------------- props
// solid: local footprint [x0, z0, x1, z1, height] for collision (front = +z). model: '' until a real .glb exists.
export const PROPS = [
  // textile room
  { id: 'clawfoot_tub', model: '', x: -6.55, z: -5.27, ry: 0, solid: [-.78, -.4, .78, .4, .7], build: tub },
  { id: 'clothesline', model: '', x: -7.4, z: -5.05, ry: 0, build: clothesline },
  { id: 'tapestry_loom', model: '', x: -6.6, z: -2.05, ry: PI, solid: [-.66, -.28, .66, .28, 1.85], build: loom },
  { id: 'treadle_sewing_machine', model: '', x: -9.13, z: -4.85, ry: PI / 2, solid: [-.5, -.25, .5, .25, 1.1], build: treadleMachine },
  { id: 'hand_sewing_machine', model: '', x: -8.85, y: .72, z: -2.15, ry: PI / 2, scale: .7, build: sewingHead },
  { id: 'drawing_table', model: '', x: -5.85, z: -3.2, ry: -PI / 2, solid: [-.56, -.4, .56, .8, 1.1], build: drawingTable },
  { id: 'scissor_wall', model: '', x: -5.41, y: 1.3, z: -3.2, ry: -PI / 2, build: scissorWall },
  // gallery / salon
  { id: 'fireplace', model: '', x: 3.8, z: -9.9, ry: 0, solid: [-.95, 0, .95, .62, 1.2], build: fireplace },
  { id: 'polar_bear_rug', model: '', x: 3.8, z: -8.85, ry: PI / 2, build: bearHead },
  { id: 'box_tv', model: '', x: 8.95, z: -7.2, ry: -PI / 2, solid: [-.32, -.24, .32, .24, 1.2], build: boxTV },
  { id: 'ashtray_cigarettes', model: '', x: 3.3, y: .5, z: -8.25, ry: 0, build: ashtray },
  { id: 'magazines_gallery', model: '', x: 5.1, z: -9.5, ry: .3, build: magazineStack },
  // courtyard
  { id: 'samovar_tea_table', model: '', x: 1.85, z: -1.15, ry: PI, solid: [-.4, -.4, .4, .4, .9], build: samovarTable },
  // vestibule
  { id: 'telephone_table', model: '', x: 1.84, z: 7.1, ry: -PI / 2, solid: [-.26, -.2, .26, .2, .9], build: phoneTable },
  // fitting room
  // Soviet cast-iron radiators (MS-140 style), painted with silver 'serebryanka' paint. Model ONE radiator and
  // put the same .glb on all of them (sections: n). Front faces into the room.
  { id: 'radiator_gallery_w', model: '', x: 2.35, z: -9.81, ry: 0, solid: [-.5, -.08, .5, .08, .8], build: k => radiator(k, 9) },
  { id: 'radiator_gallery_e', model: '', x: 5.25, z: -9.81, ry: 0, solid: [-.5, -.08, .5, .08, .8], build: k => radiator(k, 9) },
  { id: 'radiator_fitting', model: '', x: 9.31, z: 3.45, ry: -PI / 2, solid: [-.45, -.08, .45, .08, .8], build: k => radiator(k, 8) },
  { id: 'radiator_bedroom', model: '', x: -9.31, z: -7.9, ry: PI / 2, solid: [-.5, -.08, .5, .08, .8], build: k => radiator(k, 9) },
  { id: 'radiator_vestibule', model: '', x: -2.01, z: 9.4, ry: PI / 2, solid: [-.35, -.08, .35, .08, .8], build: k => radiator(k, 6) },
  { id: 'radiator_courtyard_w', model: '', x: -2.91, z: 0, ry: PI / 2, solid: [-.45, -.08, .45, .08, .8], build: k => radiator(k, 8) },
  { id: 'radiator_courtyard_e', model: '', x: 2.91, z: 0, ry: -PI / 2, solid: [-.45, -.08, .45, .08, .8], build: k => radiator(k, 8) },
  { id: 'mirror_frame', model: '', x: 9.33, z: 2.1, ry: -PI / 2, build: mirrorFrame },
  { id: 'candelabra', model: '', x: 5.75, z: 5.35, ry: 0, solid: [-.15, -.15, .15, .15, 1.4], build: candelabra },
  { id: 'magazines_fitting', model: '', x: 7.6, z: 5.35, ry: -.2, build: magazineStack },
  // bedroom / library (behind the secret wall)
  { id: 'iron_bed', model: '', x: -4.0, z: -8.85, ry: 0, solid: [-.53, -1.0, .53, 1.0, 1.0], build: ironBed },
  { id: 'bed_canopy', model: '', x: -4.0, z: -8.85, ry: 0, build: bedCanopy },
  { id: 'bedroom_window', model: '', x: -9.38, z: -7.9, ry: PI / 2, build: bedroomWindow },
  { id: 'photo_wall', model: '', x: -2.07, z: -7.9, ry: -PI / 2, build: photoWall },
  { id: 'bookshelf_1', model: '', x: -6.1, z: -6.09, ry: PI, solid: [-.5, -.18, .5, .18, 2.05], build: bookshelf },
  { id: 'bookshelf_2', model: '', x: -5.0, z: -6.09, ry: PI, solid: [-.5, -.18, .5, .18, 2.05], build: k => bookshelf(k, 2) },
  { id: 'candles_bedroom', model: '', x: -5.2, z: -9.55, ry: 0, build: candleCluster },
];

// ================================================================ builders
// Each builder draws in local space with the kit k (origin on the floor, front +z) and may call
// k.flame(x,y,z,size) to register a candle flame, k.screen(...) for the TV, k.fire(...) for the hearth.
function tub(k) {
  k.cyl(1, 1, .42, PAL.black, { p: [0, .37, 0], s: [1.5, 1, .72] }, 20);
  k.tor(1, .07, PAL.pale, { p: [0, .6, 0], s: [1.5, 1, .72] }, 24);
  k.cyl(.9, .9, .02, PAL.hot, { p: [0, .57, 0], s: [1.5, 1, .7] }, 20); // pink dye
  for (const [x, z] of [[-.55, -.2], [.55, -.2], [-.55, .2], [.55, .2]]) {
    k.cyl(.05, .09, .14, PAL.silver, { p: [x, .09, z] }, 6);
    k.sph(.09, PAL.silver, { p: [x, .035, z], s: [1.3, .6, 1.3] }, 4);
  }
  k.cyl(.03, .03, .22, PAL.chrome, { p: [-.66, .72, 0] }, 6); // tap
  k.cyl(.025, .025, .14, PAL.chrome, { p: [-.6, .82, 0], r: [0, 0, PI / 2] }, 6);
  k.cyl(.025, .025, .9, PAL.ash, { p: [.3, .75, .05], r: [.25, 0, -.5] }, 5); // dye stick
}
function clothesline(k) {
  k.cyl(.008, .008, 3.96, PAL.silver, { p: [0, 2.2, 0], r: [0, 0, PI / 2] }, 4);
  const cloths = [[-1.65, PAL.black, .7], [.35, PAL.pink, .55], [.82, PAL.hot, .4], [1.3, PAL.charcoal, .5], [1.72, PAL.silver, .6]];
  for (const [x, c, h] of cloths) {
    k.box(.42, h, .012, c, { p: [x, 2.2 - h / 2, 0] });
    k.box(.02, .05, .03, PAL.pale, { p: [x - .15, 2.2, 0] }); k.box(.02, .05, .03, PAL.pale, { p: [x + .15, 2.2, 0] });
  }
}
function loom(k) {
  for (const x of [-.62, .62]) {
    k.box(.07, 1.85, .07, PAL.black, { p: [x, .925, 0] });
    k.box(.07, .05, .55, PAL.black, { p: [x, .025, 0] });
  }
  k.box(1.32, .08, .08, PAL.black, { p: [0, 1.78, 0] });
  k.box(1.32, .08, .08, PAL.black, { p: [0, .3, 0] });
  k.box(1.24, .03, .04, PAL.silver, { p: [0, 1.15, .03] }); // shed stick
  for (let i = 0; i < 22; i++) k.box(.006, .66, .006, PAL.pale, { p: [-.55 + i * 1.1 / 21, 1.42, 0] }); // warp
  k.tapestry(0, .73, .012, 1.1, .76);
  for (const [x, c] of [[-.4, PAL.hot], [-.1, PAL.pink], [.25, PAL.silver]]) k.cyl(.04, .04, .14, c, { p: [x, 1.0, .07], r: [0, 0, PI / 2] }, 6); // bobbins
}
function sewingHead(k, y = 0) {
  k.box(.42, .04, .19, PAL.black, { p: [0, y + .02, 0] });
  k.box(.09, .22, .1, PAL.black, { p: [.15, y + .15, 0] });
  k.box(.38, .07, .09, PAL.black, { p: [0, y + .27, 0] });
  k.box(.08, .13, .09, PAL.black, { p: [-.17, y + .18, 0] });
  k.box(.3, .012, .005, PAL.pink, { p: [0, y + .28, .047] }); // decal stripe
  k.cyl(.11, .11, .03, PAL.chrome, { p: [.22, y + .22, 0], r: [0, 0, PI / 2] }, 10);
  k.cyl(.006, .006, .08, PAL.chrome, { p: [-.17, y + .08, .02] }, 4);
  k.cyl(.03, .03, .05, PAL.hot, { p: [.05, y + .33, 0] }, 6); // spool of thread
}
function treadleMachine(k) {
  k.box(1.0, .035, .48, PAL.charcoal, { p: [0, .76, 0] });
  k.box(.3, .14, .44, PAL.charcoal, { p: [-.3, .67, 0] }); // drawer
  for (const x of [-.44, .44]) {
    k.box(.04, .7, .04, PAL.black, { p: [x, .37, -.18] }); k.box(.04, .7, .04, PAL.black, { p: [x, .37, .18] });
    k.box(.03, .55, .03, PAL.black, { p: [x, .38, 0], r: [.8, 0, 0] }); k.box(.03, .55, .03, PAL.black, { p: [x, .38, 0], r: [-.8, 0, 0] });
  }
  k.box(.6, .02, .3, PAL.black, { p: [0, .12, .05], r: [.12, 0, 0] }); // treadle
  k.tor(.42, .025, PAL.black, { p: [.4, .38, 0], r: [0, 0, PI / 2] }, 16); // flywheel
  sewingHead(k, .78);
}
function drawingTable(k) {
  for (const [x, z] of [[-.5, -.32], [.5, -.32], [-.5, .32], [.5, .32]]) k.box(.04, .8, .04, PAL.black, { p: [x, .4, z] });
  k.box(1.1, .03, .75, PAL.pale, { p: [0, .95, 0], r: [-.35, 0, 0] });
  k.box(.6, .004, .45, '#fbf8fa', { p: [-.1, .97, .02], r: [-.35, 0, 0] }); // paper
  k.box(.5, .006, .03, PAL.chrome, { p: [.2, .96, .25], r: [-.35, 0, 0] }); // ruler
  k.cyl(.012, .012, .16, PAL.hot, { p: [.35, .98, .05], r: [-.35, 0, PI / 2 - .3] }, 5); // pencil
  // lamp
  k.cyl(.02, .02, .55, PAL.silver, { p: [.5, 1.25, -.3] }, 5);
  k.cyl(.02, .02, .4, PAL.silver, { p: [.38, 1.5, -.18], r: [-.8, 0, .6] }, 5);
  k.cyl(.05, .18, .14, PAL.black, { p: [.25, 1.55, -.05], r: [.6, 0, .4] }, 10);
  // stool
  k.cyl(.34, .34, .04, PAL.charcoal, { p: [0, .62, .58] }, 12);
  k.cyl(.05, .05, .6, PAL.black, { p: [0, .31, .58] }, 6);
  k.cyl(.36, .36, .03, PAL.black, { p: [0, .015, .58] }, 12);
}
function scissorWall(k) {
  k.box(1.1, .9, .02, PAL.charcoal, { p: [0, .45, 0] });
  k.box(1.14, .03, .03, PAL.silver, { p: [0, .91, .01] }); k.box(1.14, .03, .03, PAL.silver, { p: [0, -.01, .01] });
  const handle = [PAL.black, PAL.hot, PAL.black, PAL.pink, PAL.black, PAL.silver, PAL.black, PAL.hot];
  for (let i = 0; i < 8; i++) {
    const x = -.4 + (i % 4) * .27, y = i < 4 ? .7 : .28, s = .8 + ((i * 7) % 4) * .12;
    k.cyl(.006, .006, .04, PAL.chrome, { p: [x, y + .07 * s, .02], r: [PI / 2, 0, 0] }, 4); // peg
    for (const a of [-.16, .16]) {
      k.box(.018 * s, .2 * s, .006, PAL.chrome, { p: [x + a * .12 * s, y - .06 * s, .02], r: [0, 0, a] });
      k.tor(.06 * s, .014, handle[i], { p: [x + a * .35 * s, y + .08 * s, .02], r: [PI / 2, 0, 0] }, 8);
    }
  }
  for (let i = 0; i < 5; i++) k.cyl(.035, .035, .05, [PAL.hot, PAL.pink, PAL.black, PAL.silver, PAL.midpink][i], { p: [-.4 + i * .2, .5, .035], r: [PI / 2, 0, 0] }, 6);
}
function fireplace(k) {
  const marble = '#1e1c21';
  k.box(.38, 1.1, .45, marble, { p: [-.66, .55, .225] }); k.box(.38, 1.1, .45, marble, { p: [.66, .55, .225] });
  k.box(1.7, .28, .45, marble, { p: [0, .96, .225] });
  k.box(1.86, .06, .56, PAL.silver, { p: [0, 1.13, .26] }); // mantel shelf
  k.box(.94, .82, .04, '#0b0a0c', { p: [0, .41, .03] });
  k.box(1.9, .04, .42, PAL.graphite, { p: [0, .02, .62] }); // hearth
  k.box(1.0, .015, .03, PAL.chrome, { p: [0, .84, .46] });
  k.cyl(.09, .09, .55, '#2b2326', { p: [0, .1, .2], r: [0, .3, PI / 2] }, 6);
  k.cyl(.08, .08, .5, '#2b2326', { p: [.05, .19, .22], r: [0, -.4, PI / 2] }, 6);
  k.fire(0, .16, .22);
  for (const [x, h] of [[-.7, .22], [-.55, .16], [.62, .26]]) { // mantel candles
    k.cyl(.06, .08, .03, PAL.chrome, { p: [x, 1.175, .3] }, 8);
    k.cyl(.045, .045, h, PAL.ivory, { p: [x, 1.19 + h / 2, .3] }, 8);
    k.flame(x, 1.19 + h + .03, .3, 1);
  }
  k.sph(.34, '#d0d4e2', { p: [0, 1.6, .05], s: [1, 1, .1] }, 10); // round mirror above
  k.tor(.36, .025, PAL.silver, { p: [0, 1.6, .06], r: [PI / 2, 0, 0] }, 20);
}
function bearHead(k) {
  // the flat skin is a textured plane added by buildDecor; this is the 3D head at the +z end (front)
  k.sph(.3, '#ebe7ee', { p: [0, .09, .86], s: [.85, .62, 1.15] }, 8);
  k.cyl(.07, .12, .14, '#e4dfe8', { p: [0, .08, 1.02], r: [PI / 2, 0, 0] }, 8);
  k.sph(.045, PAL.black, { p: [0, .09, 1.1] }, 4);
  for (const x of [-.09, .09]) { k.sph(.025, PAL.black, { p: [x, .14, .95] }, 4); k.sph(.07, '#e2dde6', { p: [x * 1.3, .17, .78], s: [1, .8, .5] }, 4); }
}
function boxTV(k) {
  k.box(.62, .42, .46, PAL.black, { p: [0, .21, 0] });
  k.box(.6, .46, .46, PAL.ash, { p: [0, .65, 0] });
  k.box(.48, .38, .02, PAL.silver, { p: [-.04, .65, .23] });
  k.screen(-.05, .65, .242, .38, .29);
  for (const y of [.75, .64]) k.cyl(.04, .04, .03, PAL.chrome, { p: [.24, y, .24], r: [PI / 2, 0, 0] }, 8);
  k.sph(.08, PAL.black, { p: [0, .9, 0], s: [1, .5, 1] }, 6);
  k.cyl(.008, .008, .5, PAL.chrome, { p: [-.1, 1.12, 0], r: [0, 0, .45] }, 4);
  k.cyl(.008, .008, .5, PAL.chrome, { p: [.1, 1.12, 0], r: [0, 0, -.45] }, 4);
  k.box(.3, .015, .2, PAL.pink, { p: [0, .885, 0] }); // crochet doily
}
function ashtray(k) {
  k.cyl(.15, .13, .03, PAL.chrome, { p: [.24, .015, 0] }, 10);
  k.cyl(.11, .11, .005, PAL.ash, { p: [.24, .028, 0] }, 10);
  for (const [x, z, r] of [[.21, .02, .5], [.26, -.03, -.9]]) k.cyl(.012, .012, .05, PAL.pale, { p: [x, .035, z], r: [0, r, PI / 2] }, 5);
  k.cyl(.012, .012, .08, PAL.pale, { p: [.31, .045, .02], r: [0, .2, PI / 2 - .15] }, 5); // resting cigarette
  k.flame(.355, .052, .025, .25, true); // its glowing tip
  k.box(.06, .02, .09, PAL.black, { p: [-.22, .01, -.04], r: [0, .3, 0] }); // pack
  k.box(.061, .021, .02, PAL.hot, { p: [-.215, .011, -.02], r: [0, .3, 0] });
  k.box(.05, .012, .03, PAL.chrome, { p: [-.12, .006, .06], r: [0, -.5, 0] }); // lighter
}
function magazineStack(k, y = 0, n = 7) {
  const covers = [PAL.hot, PAL.black, PAL.pink, PAL.silver, PAL.black, PAL.pale, PAL.midpink];
  covers.slice(0, n).forEach((c, i) => k.box(.21, .012, .28, c, { p: [(i % 2) * .012, y + .006 + i * .013, 0], r: [0, (i * 37 % 11 - 5) * .04, 0] }));
}
function candleUnit(k, x, z, y, h) {
  k.cyl(.07, .09, .03, PAL.chrome, { p: [x, y + .015, z] }, 8);
  k.cyl(.045, .045, h, PAL.ivory, { p: [x, y + .03 + h / 2, z] }, 8);
  k.flame(x, y + .03 + h + .03, z, 1);
}
function samovarTable(k) {
  const top = .64;
  k.cyl(.76, .76, .04, PAL.black, { p: [0, top - .02, 0] }, 20);
  k.cyl(.86, .86, .006, PAL.pale, { p: [0, top + .003, 0] }, 20); // lace cloth
  k.cyl(.07, .07, top - .04, PAL.black, { p: [0, (top - .04) / 2, 0] }, 6);
  k.cyl(.45, .45, .03, PAL.black, { p: [0, .015, 0] }, 12);
  // samovar
  const sx = -.08, sz = -.08, y0 = top + .006;
  k.cyl(.16, .22, .06, PAL.chrome, { p: [sx, y0 + .03, sz] }, 10);
  k.sph(.3, PAL.chrome, { p: [sx, y0 + .22, sz], s: [1, 1.15, 1] }, 10);
  k.cyl(.12, .16, .07, PAL.chrome, { p: [sx, y0 + .41, sz] }, 10);
  for (const s of [-1, 1]) k.tor(.09, .015, PAL.black, { p: [sx + s * .17, y0 + .3, sz], r: [PI / 2, 0, 0] }, 8);
  k.box(.03, .03, .1, PAL.chrome, { p: [sx, y0 + .13, sz + .17] }); // spigot
  k.sph(.15, PAL.pink, { p: [sx, y0 + .52, sz], s: [1, .8, 1] }, 8); // teapot on the crown
  k.cyl(.02, .03, .08, PAL.pink, { p: [sx + .1, y0 + .53, sz], r: [0, 0, -.9] }, 5);
  k.sph(.03, PAL.hot, { p: [sx, y0 + .58, sz] }, 4);
  // cups + saucers
  for (const [x, z] of [[.2, .12], [.02, .25]]) {
    k.cyl(.13, .13, .01, PAL.silver, { p: [x, y0 + .005, z] }, 10);
    k.cyl(.085, .06, .055, PAL.pink, { p: [x, y0 + .038, z] }, 10);
  }
  // cake on a stand + pastries
  k.cyl(.04, .06, .08, PAL.chrome, { p: [.2, y0 + .04, -.17] }, 8);
  k.cyl(.22, .22, .01, PAL.chrome, { p: [.2, y0 + .085, -.17] }, 12);
  k.cyl(.17, .17, .09, PAL.pink, { p: [.2, y0 + .135, -.17] }, 12);
  k.cyl(.175, .175, .015, PAL.pale, { p: [.2, y0 + .185, -.17] }, 12);
  for (let i = 0; i < 6; i++) k.sph(.025, PAL.hot, { p: [.2 + Math.cos(i) * .06, y0 + .2, -.17 + Math.sin(i) * .06] }, 4);
  k.cyl(.16, .16, .008, PAL.silver, { p: [-.2, y0 + .004, .2] }, 10);
  for (const [x, z, c] of [[-.24, .18, PAL.pale], [-.17, .23, PAL.pink], [-.18, .15, PAL.hot]]) k.sph(.05, c, { p: [x, y0 + .03, z], s: [1, .7, 1] }, 5);
  candleUnit(k, .26, .02, y0, .16); candleUnit(k, -.25, -.12, y0, .2);
}
function phoneTable(k) {
  const top = .72;
  k.box(.52, .03, .4, PAL.black, { p: [0, top - .015, 0] });
  for (const [x, z] of [[-.23, -.17], [.23, -.17], [-.23, .17], [.23, .17]]) k.box(.03, top - .03, .03, PAL.black, { p: [x, (top - .03) / 2, z] });
  k.box(.48, .02, .36, PAL.black, { p: [0, .25, 0] });
  magazineStack(k, .26, 5);
  // rotary phone
  k.box(.2, .08, .22, PAL.hot, { p: [.04, top + .04, 0] });
  k.box(.17, .04, .14, PAL.hot, { p: [.04, top + .1, -.02] });
  k.cyl(.12, .12, .012, PAL.chrome, { p: [.04, top + .085, .085], r: [PI / 2 - .5, 0, 0] }, 12);
  k.cyl(.05, .05, .014, PAL.black, { p: [.04, top + .087, .088], r: [PI / 2 - .5, 0, 0] }, 8);
  k.cyl(.04, .04, .24, PAL.hot, { p: [.04, top + .15, -.02], r: [0, 0, PI / 2] }, 8);
  for (const s of [-1, 1]) k.sph(.07, PAL.hot, { p: [.04 + s * .12, top + .14, -.02], s: [1, .7, 1] }, 6);
  candleUnit(k, -.17, -.08, top, .18);
}
function artFrame(k, w, h, style) { // drawn around the picture, which hangs at local (0, 0) facing +z
  if (style === 'silver' || style === 'black') {
    const t = style === 'silver' ? .055 : .03, c = style === 'silver' ? PAL.chrome : PAL.black, d = .04;
    k.box(w + 2 * t, t, d, c, { p: [0, h / 2 + t / 2, d / 2] }); k.box(w + 2 * t, t, d, c, { p: [0, -h / 2 - t / 2, d / 2] });
    k.box(t, h, d, c, { p: [-w / 2 - t / 2, 0, d / 2] }); k.box(t, h, d, c, { p: [w / 2 + t / 2, 0, d / 2] });
    if (style === 'silver') { k.box(w + .02, .012, .01, PAL.black, { p: [0, h / 2 + .006, .02] }); k.box(w + .02, .012, .01, PAL.black, { p: [0, -h / 2 - .006, .02] }); }
  } else if (style === 'rod') { // a textile hung from a silver rod with round finials
    k.cyl(.025, .025, w + .2, PAL.chrome, { p: [0, h / 2 + .02, .04], r: [0, 0, PI / 2] }, 6);
    for (const x of [-w / 2 - .12, w / 2 + .12]) k.sph(.06, PAL.chrome, { p: [x, h / 2 + .02, .04] }, 6);
  } else k.cyl(.02, .02, .03, PAL.graphite, { p: [0, h / 2 - .03, .015], r: [PI / 2, 0, 0] }, 5); // a nail
}
ART.forEach(([file, x, y, z, w, h, ry, style], i) => PROPS.push({ id: 'art_' + i, model: '', x, y, z, ry, build: k => artFrame(k, w, h, style) }));
function radiator(k, n = 8) {
  const paint = '#a9a8b4', shade = '#8e8c98', sw = .093, w = n * sw;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + sw * (i + .5);
    k.box(.072, .5, .13, i % 2 ? paint : shade, { p: [x, .4, 0] });
    k.cyl(.072, .072, .13, paint, { p: [x, .65, 0], r: [PI / 2, 0, 0] }, 8);   // rounded top of each section
    k.cyl(.072, .072, .13, shade, { p: [x, .15, 0], r: [PI / 2, 0, 0] }, 8);   // rounded bottom
  }
  k.cyl(.035, .035, w + .1, shade, { p: [0, .65, -.03], r: [0, 0, PI / 2] }, 6); // header pipes
  k.cyl(.035, .035, w + .1, shade, { p: [0, .15, -.03], r: [0, 0, PI / 2] }, 6);
  k.cyl(.028, .028, .62, PAL.graphite, { p: [w / 2 + .1, .32, -.03] }, 6);      // supply pipe into the floor
  k.cyl(.03, .03, .1, PAL.graphite, { p: [w / 2 + .05, .65, -.03], r: [0, 0, PI / 2] }, 6);
  k.cyl(.09, .09, .02, PAL.black, { p: [w / 2 + .1, .74, -.03] }, 8);          // valve wheel
  k.cyl(.02, .02, .08, PAL.black, { p: [w / 2 + .1, .7, -.03] }, 5);
  for (const x of [-w / 2 + .1, w / 2 - .1]) k.box(.03, .05, .1, PAL.graphite, { p: [x, .74, -.04] }); // wall brackets
}
function mirrorFrame(k) { // the reflective glass itself is made in babylon-world.js (1 x 2 m at 0.3-2.3 m high)
  const c = PAL.chrome, y = 1.3;
  k.box(.09, 2.18, .07, c, { p: [-.545, y, 0] }); k.box(.09, 2.18, .07, c, { p: [.545, y, 0] });
  k.box(1.18, .09, .07, c, { p: [0, y + 1.045, 0] }); k.box(1.18, .09, .07, c, { p: [0, y - 1.045, 0] });
  k.tor(.34, .045, c, { p: [0, y + 1.22, 0], r: [PI / 2, 0, 0] }, 16);           // crest
  k.sph(.12, PAL.hot, { p: [0, y + 1.22, .02], s: [1, 1, .4] }, 8);               // little pink jewel
  for (const s of [-1, 1]) { k.sph(.1, c, { p: [s * .545, y + 1.045, 0] }, 6); k.sph(.1, c, { p: [s * .545, y - 1.045, 0] }, 6); }
}
function candelabra(k) {
  k.cyl(.26, .3, .04, PAL.chrome, { p: [0, .02, 0] }, 10);
  k.cyl(.035, .05, 1.1, PAL.chrome, { p: [0, .57, 0] }, 8);
  k.box(.5, .025, .025, PAL.chrome, { p: [0, 1.1, 0] });
  for (const x of [-.24, 0, .24]) candleUnit(k, x, 0, x ? 1.1 : 1.14, x ? .18 : .22);
}
function candleCluster(k) {
  [[0, 0, .3], [.14, .06, .2], [-.12, .08, .14], [.05, -.13, .24], [-.2, -.08, .1]].forEach(([x, z, h]) => {
    k.cyl(.07, .07, h, PAL.ivory, { p: [x, h / 2, z] }, 8); k.flame(x, h + .03, z, 1);
  });
}

function ironBed(k) {
  const iron = PAL.black, knob = PAL.chrome;
  for (const [z, h] of [[-.98, 1.15], [.98, .8]]) { // headboard (back) + footboard
    for (const x of [-.5, .5]) { k.cyl(.04, .04, h, iron, { p: [x, h / 2, z] }, 6); k.sph(.07, knob, { p: [x, h + .02, z] }, 6); }
    k.cyl(.025, .025, 1.0, iron, { p: [0, h - .06, z], r: [0, 0, PI / 2] }, 5);
    k.cyl(.025, .025, 1.0, iron, { p: [0, .42, z], r: [0, 0, PI / 2] }, 5);
    for (let i = 1; i < 6; i++) k.cyl(.014, .014, h - .48, iron, { p: [-.5 + i / 6, .42 + (h - .48) / 2, z] }, 4);
    if (z < 0) k.tor(.5, .02, iron, { p: [0, h - .06, z], r: [PI / 2, 0, 0], s: [1, 1, .55] }, 16); // arched top
  }
  for (const x of [-.5, .5]) k.box(.035, .035, 1.96, iron, { p: [x, .36, 0] }); // side rails
  k.box(.96, .18, 1.9, PAL.pale, { p: [0, .48, 0] });                       // mattress
  k.box(1.02, .05, 1.35, PAL.pink, { p: [0, .595, .27] });                  // quilt
  k.box(.98, .2, .03, PAL.pink, { p: [0, .5, .94] });                       //   ...its drop at the foot
  k.box(.62, .12, .34, PAL.ivory, { p: [0, .63, -.72], r: [-.15, 0, 0] });  // pillow
  k.box(.3, .2, .06, PAL.hot, { p: [.18, .66, -.52], r: [-.5, 0, .1] });     // small hot-pink cushion
}
function bedCanopy(k) {
  k.tor(.9, .025, PAL.silver, { p: [0, 2.65, 0], s: [1, 1, 1.25] }, 20);   // crown hoop
  k.cyl(.012, .012, 2.2, PAL.silver, { p: [0, 3.75, 0] }, 4);              // chain up into the dark
  k.canopy(0, 2.65, 0, .9, 2.5, 2.1);
}
function bedroomWindow(k) {
  const f = PAL.chrome, w = .95, h = 1.35, y0 = .95;
  k.box(w + .1, .07, .08, f, { p: [0, y0, 0] }); k.box(w + .1, .07, .08, f, { p: [0, y0 + h, 0] });
  k.box(.07, h, .08, f, { p: [-w / 2, y0 + h / 2, 0] }); k.box(.07, h, .08, f, { p: [w / 2, y0 + h / 2, 0] });
  k.box(.035, h, .05, f, { p: [0, y0 + h / 2, 0] }); k.box(w, .035, .05, f, { p: [0, y0 + h * .62, 0] });
  k.box(w + .3, .05, .22, PAL.pale, { p: [0, y0 - .02, .08] });            // sill
  k.cyl(.025, .025, w + .6, PAL.silver, { p: [0, 2.45, .12], r: [0, 0, PI / 2] }, 6); // curtain rod
  k.curtain(-.32, 2.43, .14, .5, 1.75, 0); k.curtain(.32, 2.43, .14, .5, 1.75, 1.7);
}
const PHOTOS = [ // [z offset along wall, height y, w, h, photo file, oval?]
  [-1.35, 1.75, .34, .44, 'photo-1', true], [-.85, 1.45, .3, .4, 'photo-2'], [-.85, 1.95, .26, .2, 'photo-4'],
  [-.25, 1.62, .42, .55, 'photo-3', true], [.35, 1.85, .3, .4, 'photo-6'], [.35, 1.38, .34, .26, 'photo-7'], [.88, 1.62, .28, .38, 'photo-5', true],
];
function photoWall(k) {
  for (const [x, y, w, h, file, oval] of PHOTOS) {
    if (oval) k.tor(Math.max(w, h) * .92, .035, PAL.silver, { p: [x, y, .02], r: [PI / 2, 0, 0], s: [w / Math.max(w, h), 1, h / Math.max(w, h)] }, 18);
    else {
      k.box(w + .06, .035, .03, PAL.black, { p: [x, y + h / 2 + .015, .015] }); k.box(w + .06, .035, .03, PAL.black, { p: [x, y - h / 2 - .015, .015] });
      k.box(.035, h, .03, PAL.black, { p: [x - w / 2 - .015, y, .015] }); k.box(.035, h, .03, PAL.black, { p: [x + w / 2 + .015, y, .015] });
    }
    k.photo(x, y, .022, w * (oval ? .92 : 1), h * (oval ? .92 : 1), file);
  }
}
function bookshelf(k, seed = 1) {
  const W = 1.0, D = .34, H = 2.0, frame = '#2a2428';
  k.box(.04, H, D, frame, { p: [-W / 2, H / 2, 0] }); k.box(.04, H, D, frame, { p: [W / 2, H / 2, 0] });
  k.box(W, .03, D, frame, { p: [0, H, 0] }); k.box(W, H, .02, frame, { p: [0, H / 2, -D / 2] });
  const cols = [PAL.black, PAL.pink, PAL.silver, PAL.charcoal, PAL.pale, PAL.midpink, PAL.graphite, PAL.black, PAL.hot];
  let r = seed * 97;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let sh = 0; sh < 5; sh++) {
    const y = .06 + sh * .39;
    k.box(W - .04, .03, D - .02, frame, { p: [0, y, 0] });
    let x = -W / 2 + .04;
    while (x < W / 2 - .12) {
      const bw = .03 + rnd() * .04, bh = .22 + rnd() * .12, lean = rnd() < .08;
      if (rnd() < .07) { x += .08; continue; } // gap
      const c = cols[(rnd() * cols.length) | 0 % cols.length] || PAL.black;
      k.box(bw, bh, .22 + rnd() * .06, c === PAL.hot && rnd() < .7 ? PAL.pink : c, { p: [x + bw / 2, y + .015 + bh / 2, .02], r: [0, 0, lean ? .25 : 0] });
      x += bw + .004;
    }
  }
}
// ================================================================ kit: shape helpers, baked into few meshes
function rotY(x, z, ry) { const c = Math.cos(ry), s = Math.sin(ry); return [x * c + z * s, -x * s + z * c]; }

export class Kit {
  constructor(scene, prop, out, ghost = false) {
    this.scene = scene; this.parts = []; this.out = out; this.ghost = ghost; // ghost: real model loaded, keep only the code effects
    this.node = node('gb ' + prop.id, scene); out.nodes.push(this.node);
    this.node.position.set(prop.x, prop.y || 0, prop.z); this.node.rotation.y = prop.ry || 0;
    const s = prop.scale || 1; this.node.scaling.set(s, s, s); this.prop = prop;
  }
  world(x, y, z) { const s = this.prop.scale || 1, [dx, dz] = rotY(x * s, z * s, this.prop.ry || 0); return [this.prop.x + dx, (this.prop.y || 0) + y * s, this.prop.z + dz]; }
  add(mesh, hex, { p = [0, 0, 0], r = [0, 0, 0], s } = {}) {
    mesh.position.set(...p); mesh.rotation.set(...r); if (s) mesh.scaling.set(...s); mesh.parent = this.node;
    const c = B.Color3.FromHexString(hex), n = mesh.getTotalVertices(), a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { a[i * 4] = c.r; a[i * 4 + 1] = c.g; a[i * 4 + 2] = c.b; a[i * 4 + 3] = 1; }
    mesh.setVerticesData('color', a); this.parts.push(mesh); return mesh;
  }
  box(w, h, d, c, o) { if (this.ghost) return null; return this.add(B.MeshBuilder.CreateBox('gb', { width: w, height: h, depth: d }, this.scene), c, o); }
  cyl(dt, db, h, c, o, t = 10) { if (this.ghost) return null; return this.add(B.MeshBuilder.CreateCylinder('gb', { diameterTop: dt, diameterBottom: db, height: h, tessellation: t }, this.scene), c, o); }
  sph(d, c, o, seg = 6) { if (this.ghost) return null; return this.add(B.MeshBuilder.CreateSphere('gb', { diameter: d, segments: seg }, this.scene), c, o); }
  tor(d, th, c, o, t = 16) { if (this.ghost) return null; return this.add(B.MeshBuilder.CreateTorus('gb', { diameter: d, thickness: th, tessellation: t }, this.scene), c, o); }
  flame(x, y, z, size = 1, tip = false) { this.out.flames.push([...this.world(x, y, z), size * (this.prop.scale || 1), tip]); }
  fire(x, y, z) { this.out.fires.push(this.world(x, y, z)); }
  screen(x, y, z, w, h) { this.out.screens.push({ p: this.world(x, y, z), ry: this.prop.ry || 0, w, h }); }
  canopy(x, y, z, dTop, dBottom, h) { if (!this.ghost) this.out.canopies.push({ p: this.world(x, y, z), dTop, dBottom, h }); }
  curtain(x, y, z, w, h, phase) { this.out.curtains.push({ p: this.world(x, y, z), ry: this.prop.ry || 0, w, h, phase }); }
  photo(x, y, z, w, h, file) { if (!this.ghost) this.out.photos.push({ p: this.world(x, y, z), ry: this.prop.ry || 0, w, h, file }); }
  tapestry(x, y, z, w, h) { if (!this.ghost) this.out.tapestries.push({ p: this.world(x, y, z), ry: this.prop.ry || 0, w, h }); }
}

// ================================================================ build everything
export function buildDecor(scene, { touch } = {}) {
  const out = { flames: [], fires: [], screens: [], tapestries: [], canopies: [], curtains: [], photos: [], boxes: [], meshes: [], tick: [], nodes: [], pools: [], poolTicks: [], glassMats: [] };
  const vc = new B.StandardMaterial('greybox palette', scene);
  vc.specularColor = new B.Color3(.08, .08, .1); vc.maxSimultaneousLights = 5;
  const parts = [];
  for (const prop of PROPS) {
    if (prop.solid) {
      const [x0, z0, x1, z1, h] = prop.solid, xs = [], zs = [];
      for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { const [dx, dz] = rotY(x, z, prop.ry || 0); xs.push(prop.x + dx); zs.push(prop.z + dz); }
      // collision.json uses Blender coordinates: y = -z
      out.boxes.push({ name: 'prop_' + prop.id, bounds: [Math.min(...xs), -Math.max(...zs), 0, Math.max(...xs), -Math.min(...zs), h] });
    }
    // With a real model, the builder still runs in 'ghost' mode so flames, fire and TV static stay where they were.
    if (prop.model) loadModel(scene, prop);
    const kit = new Kit(scene, prop, out, !!prop.model);
    prop.build(kit);
    parts.push(...kit.parts);
  }
  if (parts.length) {
    const merged = B.Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    merged.name = 'greybox props'; merged.material = vc; merged.isPickable = false; merged.freezeWorldMatrix();
    out.meshes.push(merged);
  }
  for (const n of out.nodes) n.dispose();

  // ---- rugs
  const texCache = new Map();
  const tex = (name, alpha) => {
    if (!texCache.has(name)) { const t = new Texture('assets/textures/' + name + '.png', scene, false, true); t.hasAlpha = !!alpha; t.anisotropicFilteringLevel = 2; texCache.set(name, t); }
    return texCache.get(name);
  };
  const flatMat = (name, unlit, alpha) => {
    const m = new B.StandardMaterial(name, scene); m.diffuseTexture = tex(name, alpha); m.specularColor = B.Color3.Black();
    if (unlit) { m.disableLighting = true; m.emissiveColor = B.Color3.White(); } // unlit: colour = emissive x texture
    m.backFaceCulling = false; m.maxSimultaneousLights = 5; return m;
  };
  // All rugs share one atlas texture and one mesh (one draw call instead of ~13: the lace walls hide nothing,
  // so everything in the house is drawn from everywhere and every draw call counts on phones).
  const rugNames = [...new Set([...FLOOR_RUGS.map(r => r[0]), ...WALL_RUGS.map(r => r[0])])];
  const rugAtlas = makeAtlas(scene, rugNames.map(n => 'assets/textures/' + n + '.png'), { cellW: 256, cellH: 512, cols: 8, alpha: true, smooth: false, crisp: true }); // alpha: frayed fringes
  const rugParts = [];
  for (const [name, x, z, long, short, alongX, turn = 0, layer = 0] of FLOOR_RUGS) {
    const g = ground('rug', { width: short, height: long }, scene);
    g.position.set(x, .012 + layer * .008, z); g.rotation.y = (alongX ? PI / 2 : 0) + turn; rugAtlas.mapUVs(g, rugNames.indexOf(name)); rugParts.push(g);
  }
  for (const [name, x, y, z, w, h, ry] of WALL_RUGS) {
    const p = B.MeshBuilder.CreatePlane('wall rug', { width: w, height: h }, scene);
    p.position.set(x, y, z); p.rotation.y = ry; rugAtlas.mapUVs(p, rugNames.indexOf(name), false, true); rugParts.push(p); // tall texture, hung sideways
  }
  {
    const rugs = B.Mesh.MergeMeshes(rugParts, true, true); rugs.name = 'rugs';
    const m = new B.StandardMaterial('rugs', scene); m.specularColor = B.Color3.Black(); m.backFaceCulling = false; m.maxSimultaneousLights = 5; m.zOffset = -2;
    rugs.material = m; rugs.isPickable = false; rugs.freezeWorldMatrix(); rugs.setEnabled(false); out.meshes.push(rugs);
    rugAtlas.onReady(t => { m.diffuseTexture = t; rugs.setEnabled(true); });
  }
  for (const t of out.tapestries) { // half-woven piece on the loom: the leaf tapestry from the atelier wall, woven from the bottom up
    const p = B.MeshBuilder.CreatePlane('tapestry', { width: t.w, height: t.h }, scene);
    p.position.set(...t.p); p.rotation.y = t.ry;
    const m = new B.StandardMaterial('loom tapestry', scene); m.specularColor = B.Color3.Black(); m.backFaceCulling = false; m.maxSimultaneousLights = 5;
    m.diffuseTexture = new Texture('assets/art/tapestry-leaves.png', scene, true, true, Texture.NEAREST_SAMPLINGMODE); m.diffuseTexture.vScale = .6;
    p.material = m; p.isPickable = false; p.freezeWorldMatrix(); out.meshes.push(p);
  }
  // ---- wall art: one atlas texture, one mesh
  {
    const atlas = makeAtlas(scene, ART.map(a => 'assets/art/' + a[0]), { cellW: 256, cellH: 256, cols: 8, alpha: true, smooth: false, crisp: true });
    const parts = ART.map(([file, x, y, z, w, h, ry], i) => {
      const p = B.MeshBuilder.CreatePlane('art', { width: w, height: h }, scene);
      p.position.set(x + Math.sin(ry) * .012, y, z + Math.cos(ry) * .012); p.rotation.y = ry + PI; atlas.mapUVs(p, i, true); return p;
    });
    const art = B.Mesh.MergeMeshes(parts, true, true); art.name = 'wall art';
    const m = new B.StandardMaterial('wall art', scene); m.specularColor = B.Color3.Black(); m.emissiveColor = B.Color3.FromHexString('#2c272e'); m.backFaceCulling = true;
    art.material = m; art.isPickable = false; art.freezeWorldMatrix(); art.setEnabled(false); out.meshes.push(art);
    atlas.onReady(t => { m.diffuseTexture = t; art.setEnabled(true); });
  }
  // polar bear skin
  const bear = ground('polar bear rug', { width: 1.05, height: 1.55 }, scene);
  bear.position.set(3.8, .03, -8.85); bear.rotation.y = PI / 2;
  const bm = flatMat('polar-bear-rug', false, true); bm.useAlphaFromDiffuseTexture = false; bm.zOffset = -8; bear.material = bm; bear.isPickable = false; bear.freezeWorldMatrix();

  // ---- stained glass: unlit, alpha-tested arches, every design in one atlas (one draw call for all the windows)
  out.glassMats = [];
  {
    const designs = [...new Set(WINDOWS.map(w => w[0]))];
    const atlas = makeAtlas(scene, designs.map(d => 'assets/textures/stained-glass-' + d + '.png'), { cellW: 128, cellH: 256, cols: 8, alpha: true, smooth: false, crisp: true });
    const parts = [];
    const pane = (d, x, y, z, w, h, ry) => { // faces the direction ry, like the wall art
      const p = B.MeshBuilder.CreatePlane('stained glass', { width: w, height: h }, scene);
      p.position.set(x, y + h / 2, z); p.rotation.y = ry + PI; atlas.mapUVs(p, designs.indexOf(d), true); parts.push(p);
    };
    for (const [d, x, y, z, w, h, ry, outside] of WINDOWS) {
      pane(d, x, y, z, w, h, ry);
      if (outside) pane(d, x - Math.sin(ry) * .23, y, z - Math.cos(ry) * .23, w, h, ry + PI); // the outer face of the wall
    }
    const m = B.Mesh.MergeMeshes(parts, true, true); m.name = 'stained glass';
    const mat = new B.StandardMaterial('stained glass', scene); mat.disableLighting = true; mat.emissiveColor = B.Color3.White();
    mat.specularColor = B.Color3.Black(); mat.zOffset = -1; mat.maxSimultaneousLights = 5;
    m.material = mat; m.isPickable = false; m.freezeWorldMatrix(); m.setEnabled(false); out.meshes.push(m); out.glassMats.push(mat);
    atlas.onReady(t => { mat.diffuseTexture = t; m.setEnabled(true); });
  }

  // ---- sheer lace: bed canopy (gentle sway) and bedroom curtains (billowing in the wind)
  const sheerMat = (tint) => {
    const m = new B.StandardMaterial('sheer lace', scene); m.diffuseTexture = new Texture('assets/textures/lace-sheer.png', scene, false, true);
    m.diffuseTexture.hasAlpha = true; m.useAlphaFromDiffuseTexture = true; m.alpha = .999; // soft see-through (blended), not cut-out
    m.disableLighting = true; m.emissiveColor = B.Color3.FromHexString(tint); m.backFaceCulling = false; return m;
  };
  for (const c of out.canopies) {
    const cone = B.MeshBuilder.CreateCylinder('bed canopy', { diameterTop: c.dTop, diameterBottom: c.dBottom, height: c.h, tessellation: 18, cap: 0 }, scene);
    cone.bakeTransformIntoVertices(B.Matrix.Translation(0, -c.h / 2, 0)); cone.scaling.z = 1.25;
    cone.position.set(...c.p); const m = sheerMat('#f4e8f0'); m.diffuseTexture.uScale = 4; m.diffuseTexture.vScale = 2; cone.material = m; cone.isPickable = false;
    out.tick.push((t, reduced) => { if (reduced) return; cone.rotation.x = Math.sin(t * .0007) * .025; cone.rotation.z = Math.sin(t * .0009 + 1) * .03; });
  }
  // the window openings get the same curtains as the bedroom: a pair drawn back to each side
  for (const [x, z, ry] of WINDOW_CURTAINS) for (const s of [-1, 1]) {
    const o = s * .74; // along the wall, from the middle of the 2 m opening
    out.curtains.push({ p: [x + Math.cos(ry) * o, 2.4, z - Math.sin(ry) * o], ry, w: .58, h: 1.58, phase: (x + s) * 1.3 });
  }
  if (out.curtains.length) { // all curtains are one mesh (one draw call), moved on the CPU a few times a second
    const COLS = 5, ROWS = 9, N = (COLS + 1) * (ROWS + 1), uv = [], idx = [];
    out.curtains.forEach((c, n) => {
      for (let r = 0; r <= ROWS; r++) for (let q = 0; q <= COLS; q++) uv.push(q / COLS, 1 - r / ROWS);
      for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) { const a = n * N + r * (COLS + 1) + q, b = a + COLS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    });
    const pos = new Float32Array(out.curtains.length * N * 3);
    const mesh = new B.Mesh('curtains', scene), vd = new B.VertexData(); vd.positions = pos; vd.uvs = uv; vd.indices = idx; vd.applyToMesh(mesh, true);
    mesh.material = sheerMat('#ffd3e8'); mesh.material.diffuseTexture.uScale = 2; mesh.material.diffuseTexture.vScale = 3; mesh.isPickable = false; mesh.alwaysSelectAsActiveMesh = true;
    let last = -1e9;
    const wave = (t, reduced, p) => {
      if (t - last < 33) return; last = t;
      if (p && !out.curtains.some(c => Math.hypot(p.x - c.p[0], p.y - c.p[2]) < 14)) return; // only when one could be in view
      let i = 0;
      for (const c of out.curtains) {
        const ax = Math.cos(c.ry), az = -Math.sin(c.ry), fx = Math.sin(c.ry), fz = Math.cos(c.ry); // along the wall, into the room
        for (let r = 0; r <= ROWS; r++) for (let q = 0; q <= COLS; q++) {
          const u = q / COLS, v = r / ROWS, k = Math.pow(v, 1.3);
          const gust = reduced ? .35 : .55 + .45 * Math.sin(t * .0011 + c.phase) * Math.sin(t * .00037 + c.phase * 2);
          const billow = k * .55 * gust + (reduced ? 0 : Math.sin(t * .004 + u * 5 + v * 4 + c.phase) * .05 * k);
          const lx = (u - .5) * c.w + (reduced ? 0 : Math.sin(t * .0023 + v * 3 + c.phase) * .08 * k);
          pos[i++] = c.p[0] + ax * lx + fx * billow;
          pos[i++] = c.p[1] - v * c.h + billow * billow * .25;
          pos[i++] = c.p[2] + az * lx + fz * billow;
        }
      }
      mesh.updateVerticesData('position', pos);
    };
    wave(0, true); out.tick.push(wave);
  }
  if (out.photos.length) { // all the old photographs share one atlas texture and one mesh
    const files = [...new Set(out.photos.map(ph => ph.file))];
    const atlas = makeAtlas(scene, files.map(f => 'assets/photos/' + f + '.jpg'), { cellW: 256, cellH: 256, cols: 4 });
    const parts = out.photos.map(ph => {
      const pl = B.MeshBuilder.CreatePlane('photo', { width: ph.w, height: ph.h }, scene);
      pl.position.set(...ph.p); pl.rotation.y = ph.ry + PI; // plane faces -z; turn it to face out of the wall
      atlas.mapUVs(pl, files.indexOf(ph.file), true); return pl;
    });
    const photos = B.Mesh.MergeMeshes(parts, true, true); photos.name = 'photos';
    const m = new B.StandardMaterial('photos', scene); m.specularColor = B.Color3.Black(); m.emissiveColor = B.Color3.FromHexString('#2a2629'); m.zOffset = -1;
    photos.material = m; photos.isPickable = false; photos.freezeWorldMatrix(); photos.setEnabled(false);
    atlas.onReady(t => { m.diffuseTexture = t; photos.setEnabled(true); });
  }

  // ---- PS1 'blob lights' on the floor: candle clusters and coloured light falling through the stained glass
  const clusters = [];
  for (const [x, y, z, s, tip] of out.flames) {
    if (tip) continue;
    const c = clusters.find(c => Math.hypot(c.x - x, c.z - z) < .7);
    if (c) { c.n++; c.x = (c.x * (c.n - 1) + x) / c.n; c.z = (c.z * (c.n - 1) + z) / c.n; } else clusters.push({ x, z, n: 1 });
  }
  for (const c of clusters) out.pools.push({ x: c.x, z: c.z, w: 1.3 + c.n * .15, color: '#ffa6dc', k: .16 + Math.min(.12, c.n * .03) });
  for (const [d, x, y, z, w, h, ry] of WINDOWS) {
    if (z > 10) continue; // the outside-facing door lights
    out.pools.push({ x: x + Math.sin(ry) * 1.0, z: z + Math.cos(ry) * 1.0, w: w * 1.9, l: 1.8, ry, color: GLASS_LIGHT[d] || '#f2d4ea', k: .24 });
  }

  // ---- candle flames: one mesh, flicker by colour (cheap)
  if (out.flames.length) {
    const fl = out.flames.map(([x, y, z, s, tip]) => { const f = B.MeshBuilder.CreateSphere('flame', { diameter: tip ? .02 : .035 * s, segments: 3 }, scene); f.position.set(x, y, z); if (!tip) f.scaling.y = 2; return f; });
    const flames = B.Mesh.MergeMeshes(fl, true, true); const fm = new B.StandardMaterial('candle flame', scene);
    fm.disableLighting = true; fm.emissiveColor = B.Color3.FromHexString('#ffe6f3'); flames.material = fm; flames.isPickable = false;
    out.tick.push((t, reduced) => { if (reduced) return; const f = .86 + Math.sin(t * .013) * .06 + Math.sin(t * .037) * .05; fm.emissiveColor.set(f, f * .86, f * .94); });
  }
  // ---- hearth fire: pale pink flames + floor glow
  for (const [x, y, z] of out.fires) {
    const pivot = node('fire', scene); pivot.position.set(x, y, z);
    const cones = [[0, 0, .34, .5], [-.14, .02, .22, .32], [.15, 0, .2, .36], [.04, -.03, .16, .22]].map(([dx, dz, d, h]) => {
      const c = B.MeshBuilder.CreateCylinder('flame', { diameterTop: 0, diameterBottom: d, height: h, tessellation: 6 }, scene); c.position.set(dx, h / 2, dz); return c;
    });
    const fire = B.Mesh.MergeMeshes(cones, true, true); fire.parent = pivot;
    const mm = new B.StandardMaterial('fire', scene); mm.disableLighting = true; mm.emissiveColor = B.Color3.FromHexString('#ff9fe0'); mm.alpha = .85; fire.material = mm; fire.isPickable = false;
    const core = B.MeshBuilder.CreateCylinder('fire core', { diameterTop: 0, diameterBottom: .2, height: .26, tessellation: 6 }, scene); core.parent = pivot; core.position.y = .13;
    const cm = new B.StandardMaterial('fire core', scene); cm.disableLighting = true; cm.emissiveColor = B.Color3.FromHexString('#fff4fa'); core.material = cm;
    const glowTex = canvasTexture(scene, 64, 64, g => {
      const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32); grd.addColorStop(0, 'rgba(255,170,230,0.55)'); grd.addColorStop(1, 'rgba(255,170,230,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    }, { alpha: true });
    const glow = ground('fire glow', { width: 2.6, height: 1.8 }, scene); glow.position.set(x, .02, z + .9);
    const gm = new B.StandardMaterial('fire glow', scene); gm.disableLighting = true; gm.diffuseTexture = glowTex; gm.useAlphaFromDiffuseTexture = true; gm.emissiveColor = B.Color3.White(); gm.alphaMode = B.Engine.ALPHA_ADD; gm.alpha = 1;
    gm.zOffset = -8; glow.material = gm; glow.isPickable = false;
    out.tick.push((t, reduced) => {
      if (reduced) return;
      const a = Math.sin(t * .009) * .5 + Math.sin(t * .023) * .3 + Math.sin(t * .051) * .2;
      fire.scaling.set(1 + a * .05, 1 + a * .14, 1); fire.rotation.y = Math.sin(t * .002) * .25;
      core.scaling.y = 1 + a * .2; gm.alpha = .8 + a * .2;
    });
  }
  // ---- TV static: 8 frames of noise drawn once into a strip; we just slide the UV offset (no per-frame uploads)
  for (const sc of out.screens) {
    const W = 64, H = 48, F = 8;
    const st = canvasTexture(scene, W, H * F, (g) => {
      const img = g.createImageData(W, H * F), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 235 | 0, pink = Math.random() < .015; d[i] = pink ? 244 : v; d[i + 1] = pink ? 95 : v; d[i + 2] = pink ? 240 : Math.min(255, v + 10); d[i + 3] = 255; }
      g.putImageData(img, 0, 0);
    }, { sampling: Texture.NEAREST_SAMPLINGMODE, mipmaps: false });
    st.vScale = 1 / F;
    const scr = B.MeshBuilder.CreatePlane('tv screen', { width: sc.w, height: sc.h }, scene);
    scr.position.set(...sc.p); scr.rotation.y = sc.ry;
    const sm = new B.StandardMaterial('tv static', scene); sm.disableLighting = true; sm.diffuseTexture = st; sm.emissiveColor = B.Color3.White(); sm.backFaceCulling = false; scr.material = sm; scr.isPickable = false;
    let last = 0, frame = 0;
    const [fx, fz] = [sc.p[0] + Math.sin(sc.ry) * .9, sc.p[2] + Math.cos(sc.ry) * .9];
    const glow = buildLightPools(scene, [{ x: fx, z: fz, w: 1.6, l: 1.9, ry: sc.ry, color: '#c9d2ff', k: .35 }], 'tv glow');
    out.tick.push((t, reduced) => { if (t - last < (reduced ? 500 : 60)) return; last = t; frame = (frame + 1 + (Math.random() * 3 | 0)) % F; st.vOffset = frame / F; if (glow && !reduced) glow.visibility = .55 + Math.random() * .45; });
  }
  return out;
}

// Real model swap-in. Materials are flattened the same way babylon-world.js treats the apartment GLB.
export async function loadModel(scene, prop) {
  try {
    const r = await B.SceneLoader.ImportMeshAsync(null, 'assets/models/', prop.model, scene);
    const root = node('model ' + prop.id, scene);
    root.position.set(prop.x, prop.y || 0, prop.z); root.rotation.y = prop.ry || 0; const s = prop.scale || 1; root.scaling.set(s, s, s);
    r.meshes[0].parent = root;
    const done = new Map();
    for (const m of r.meshes) {
      const src = m.material;
      if (src && !done.has(src)) {
        const sm = new B.StandardMaterial(src.name, scene);
        sm.diffuseColor = src.albedoColor?.clone() || B.Color3.White(); sm.diffuseTexture = src.albedoTexture || null;
        sm.emissiveColor = src.emissiveColor?.clone() || B.Color3.Black(); sm.emissiveTexture = src.emissiveTexture || null;
        sm.specularColor = B.Color3.Black(); sm.backFaceCulling = src.backFaceCulling; sm.maxSimultaneousLights = 5;
        if (src.albedoTexture?.hasAlpha || src.transparencyMode) { sm.useAlphaFromDiffuseTexture = true; sm.diffuseTexture && (sm.diffuseTexture.hasAlpha = true); }
        done.set(src, sm);
      }
      if (src) m.material = done.get(src);
      m.isPickable = false; m.computeWorldMatrix(true); m.freezeWorldMatrix();
    }
  } catch (e) { console.warn('Could not load model for', prop.id, prop.model, e); }
}

// ================================================================ loose threads blowing off the top of the lace walls
// Each thread is two crossed ribbons (visible from any angle) whose segments swing in a slow, gusty wind.
// One mesh for all of them; positions are rewritten ~30 times a second (a few thousand floats: cheap).
export function buildWindThreads(scene, boxes, { touch } = {}) {
  const anchors = [];
  let r = 11; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (const { name, bounds: b } of boxes) {
    if (!(/_\d\d$/.test(name) || name === 'secret_wall') || b[5] < 2.7 || b[2] > 2.4) continue;
    const alongX = b[3] - b[0] > b[4] - b[1], len = alongX ? b[3] - b[0] : b[4] - b[1];
    for (let d = .3; d < len - .2; d += touch ? 1.6 : 1.1) {
      if (rnd() < .35) continue;
      const side = rnd() < .5 ? -1 : 1, x = alongX ? b[0] + d : (side < 0 ? b[0] - .015 : b[3] + .015), y = alongX ? (side < 0 ? b[1] - .015 : b[4] + .015) : b[1] + d;
      anchors.push({ x, z: -y, top: b[5] - .02, L: .3 + rnd() * .9, ph: rnd() * 6.28, col: rnd() < .5 ? [1, .97, 1] : rnd() < .85 ? [.97, .8, .89] : [.96, .37, .94] });
    }
  }
  const N = 6, W = .007, pos = [], col = [], idx = [];
  anchors.forEach((a, ti) => {
    for (let i = 0; i <= N; i++) for (let s = 0; s < 4; s++) { pos.push(a.x, a.top, a.z); col.push(...a.col, 1); }
    const o = ti * (N + 1) * 4;
    for (let i = 0; i < N; i++) for (const [p, q] of [[0, 1], [2, 3]]) { const A = o + i * 4, Bv = o + (i + 1) * 4; idx.push(A + p, Bv + p, A + q, A + q, Bv + p, Bv + q); }
  });
  const mesh = new B.Mesh('wind threads', scene), vd = new B.VertexData();
  vd.positions = pos; vd.colors = col; vd.indices = idx; vd.applyToMesh(mesh, true);
  const m = new B.StandardMaterial('thread', scene); m.disableLighting = true; m.emissiveColor = new B.Color3(.92, .9, .93); m.backFaceCulling = false;
  mesh.material = m; mesh.isPickable = false; mesh.alwaysSelectAsActiveMesh = true;
  const P = new Float32Array(pos); let last = -1e9;
  const tick = (t, reduced, p) => {
    if (t - last < (reduced ? 1e9 : 33)) return; last = t;
    if (p && p.y > 22) return; // out on the road: the house is lost in the fog anyway
    const wd = t * .00005, wx = Math.cos(wd), wz = Math.sin(wd); // the wind slowly turns
    let k = 0;
    for (const a of anchors) {
      let x = a.x, y = a.top, z = a.z; const seg = a.L / N;
      const gust = .35 + .3 * Math.sin(t * .0007 + a.ph * .3) + .15 * Math.sin(t * .0021 + a.ph);
      for (let i = 0; i <= N; i++) {
        for (const [dx, dz] of [[W, 0], [-W, 0], [0, W], [0, -W]]) { P[k++] = x + dx; P[k++] = y; P[k++] = z + dz; }
        const th = gust * (i + 1) / N * 1.2 + Math.sin(t * .006 + a.ph + i * .8) * .12 * (i + 1) / N;
        x += Math.sin(th) * wx * seg; z += Math.sin(th) * wz * seg; y -= Math.cos(th) * seg;
      }
    }
    mesh.updateVerticesData('position', P);
  };
  tick(1, false);
  return { mesh, tick, count: anchors.length };
}
