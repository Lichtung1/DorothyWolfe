# Modeling guide (25 Oct 2026 update)

Everything Dorothy asked for is in the scene now as **greybox** stand-ins: simple shapes in her palette, at the right size and in the right place, with collision. Replace them one at a time. When a real model is ready, nothing else in the code needs to change.

## PS1 style: how to model for this site

The engine now renders like a PS1: low resolution (256 lines), point-sampled textures, 15-bit colour with dithering, and fog. Vertex wobble and texture warp exist but are off by default (the `wobble` command turns them on) (`ps1.js`, toggle with the `ps1` terminal command). Your models will get that treatment automatically. What makes a model *read* as stylized PS1 rather than "cheap 3D" is how it's built:

- **Triangles:** small props 50–300, furniture 200–800, hero pieces (samovar, sewing machine, statue, bed) 800–1,500. Let the silhouette carry it: chunky bevels, no subdivision.
- **Textures:** 64×64 or 128×128, 256×256 max for a hero piece. Paint them by hand or downscale photos and repaint. Keep **texel density consistent**, about 64 px per metre (128 for things you see up close). Mixed densities are the main thing that makes a scene look "sloppy poly".
- **Paint the light in.** No normal, roughness or metal maps (the engine drops them anyway). Paint shading, grime and highlights into the texture, and/or bake soft lighting/AO into **vertex colours** (Blender: Color Attribute, then Bake → Vertex Colors). The engine multiplies vertex colours in, just like PS1 Gouraud shading.
- **Cut-outs, not soft transparency:** lace, leaves, iron curls and fringes should be alpha-clipped quads with hard edges.
- **Preview the look in Blender:** set image textures to *Closest* interpolation and look through a low-res viewport. What you see is close to the game.
- **Palette:** black, silver, light pink, and hot pink only as a spark (a decal, a jewel, a thread).
- Reference mood: *LSD: Dream Emulator*, *Silent Hill* (fog), *Echo Night*, *Mizzurna Falls*, and the *Haunted PS1* demo discs.

## The make-list (most visible first)

Everything below already exists in the game as a greybox or placeholder, at the right size and place. Tick them off as your versions go in. The prop name (in `PROPS` in `decor.js`) is where its filename goes. Triangle counts are PS1 budgets.

**1. Seen constantly**
- [ ] **Birch tree card ×2, spruce tree card ×2** (paint, not model). `assets/textures/tree-*.png`, 48×128 drawn, saved at 4×. They fill most of the screen outside.
- [ ] **Treeline strips ×2** (paint). `treeline-near.png`, `treeline-far.png`; must tile left to right.
- [ ] **Soviet cast-iron radiator**: `radiator_*` (7 placed). Model **one** 8-section MS-140 style radiator (~0.75 × 0.14 × 0.75 m, 200–400 tris), silver "serebryanka" paint with darker grime between the fins, a pipe and valve on one side. Put the same .glb on all seven.
- [ ] **Fireplace**: `fireplace` (1.9 × 0.62 × 1.2 m, 1.5–3k). Leave the firebox empty; the pink fire is code.
- [ ] **Samovar + tea table**: `samovar_tea_table` (3–5k total). Can be split into two models.
- [ ] **Iron bed**: `iron_bed` (1.06 × 2.0 × 1.15 m, 1.5–2.5k). Iron curls as alpha-clipped cards.

**2. The rooms' hero pieces**
- [ ] **Shrine statue** (veiled, Madonna-like), 3–6k: find a scan, decimate, set `SHRINE.statueModel` in `shrine.js`.
- [ ] **Shrine chapel** (white box, dark roof, little pink onion dome), 1.5–3k: `SHRINE.chapelModel`.
- [ ] **Treadle sewing machine**: `treadle_sewing_machine` (2.5–4k); reuse its head for `hand_sewing_machine`.
- [ ] **Clawfoot tub**: `clawfoot_tub` (2–3k). Keep the pink dye surface a separate flat face.
- [ ] **Tapestry loom**: `tapestry_loom` (2–3k). Warp threads as one alpha-clipped plane.
- [ ] **Scissor wall**: `scissor_wall`. Model 3–4 scissors (150–300 tris each) and reuse them.
- [ ] **Box TV**: `box_tv` (1–1.5k). Leave the screen opening where the greybox's is; the static is code.
- [ ] **Rotary phone + telephone table**: `telephone_table` (1.5–2k).
- [ ] **Mirror frame**: `mirror_frame` (300–600). Ornate silver around a 1 × 2 m glass.
- [ ] **House roof / outside walls** (2–5k): the road view of the cottage.

**3. Furniture and fittings**
- [ ] **Bookshelves ×2**: `bookshelf_1`, `bookshelf_2` (300–600 each), with book blocks on one spine texture.
- [ ] **Drawing table + stool**: `drawing_table` (1.5–2k).
- [ ] **Bedroom window frame**: `bedroom_window` (300–600). The curtains are code.
- [ ] **Picture frames, 2 styles** (silver gilt, thin black): the art and photo frames are code-drawn for now. If you model them, make one of each at 1 × 1 m and tell me; I'll scale them per picture without stretching the moulding.
- [ ] **Candelabra**, **candle cluster**: candles without flames (flames are code).
- [ ] **Polar bear head**: `polar_bear_rug` (1.5–2.5k); the flat skin stays a texture.
- [ ] **Lantern post** ×1 model, reused along the road (200–400).

**4. Small stuff (reads fine as greybox at 256 lines)**
- [ ] Ashtray + cigarettes, magazines (one cover atlas), clothesline + cloths, teacups.

**2D art (no modelling)**
- [ ] **Wall art ×21**: keep full-quality originals in `assets/art-source/`, then run `python3 tools/import_art.py --fry` to make the game versions in `assets/art/` (slot list in `assets/art/README.txt`).
- [ ] **Old photographs ×7**: `assets/photos/photo-1..7.jpg`. Real family photos of great-grandmother Dorothy, ideally.
- [ ] **Garments**: photos of Opal's pieces in `assets/garments/` plus `garments.json`.
- [ ] **Stained glass bakes**: `tools/import_glass.py`.
- [x] Lace walls (the refined pack is in). Swap any time via `assets/lace-source/`.
- [x] Rugs: pixel-art kazak, medallion and two runners (plus colourways) on the floors, and four worn lace carpets, about 40 placed, all on the floors (only tapestries hang on the walls). Replace any `rug-*.png` with a better one at the same name.

## How a model replaces a greybox

1. Model it in Blender at real size: **1 unit = 1 m**, origin at the **centre of the footprint, on the floor**, with the **front facing -Y** (Blender's front view looks at it).
2. Export **glTF Binary (.glb)**: +Y up, apply modifiers, selected objects only. **No Draco or meshopt compression**, because the slim Babylon build in `vendor/` can't decode it.
3. Drop the file in `assets/models/` and type its filename into that prop's `model: ''` field in `decor.js` (for example `model: 'samovar.glb'`).
4. If the real thing is bigger or smaller than the greybox, adjust its `solid: [x0, z0, x1, z1, height]` footprint in the same line so the collision matches.

**Effects stay in code.** Candle flames, the hearth fire, the TV static and the lit cigarette tip are drawn by code at the greybox positions, and they stay when your model goes in. So model candles **without flames**, leave the **firebox empty**, and put the **TV screen** where the greybox has it. If yours ends up elsewhere, nudge the numbers in that prop's builder function (for example `k.screen(...)` in `boxTV`).

To move something, change its `x`, `z` (and `ry` for which way it faces) in `PROPS`. Those numbers are the same ones `app.js` uses, so you can stand on the spot with `?debug` in the URL and read the coordinates from the top-left HUD.

## Materials: what survives export

`babylon-world.js` (and the model loader in `decor.js`) turns every material into a simple StandardMaterial for phone speed. Only these properties are kept:

- **Base colour** (texture or flat colour)
- **Emissive** (texture or colour), which makes a surface glow without lighting
- **Alpha**: use **Alpha Clip** (cut-out), not Alpha Blend

Normal maps, roughness, metalness and AO maps are **dropped**. So:

- **Bake AO and edge wear into the base colour.** It's the one thing that makes low-poly props look finished here.
- **Silver and chrome must be painted.** Paint a soft fake reflection into the texture (light top edge, dark band, light bottom). Real metal shading won't show.
- Glowing bits (candle flames, TV screen, lit cigarette, stained glass) use emissive.

## Phone budget

| | Target | Hard ceiling |
|---|---|---|
| Whole scene (everything loaded) | ~120k triangles | 200k |
| On screen at once | ~60k | 100k |
| Draw calls (distinct material × mesh) | ~60 | 100 |
| Total download (GLBs + textures) | ~8 MB | 12 MB |
| Texture size, normal prop | 512 × 512 | 1024 × 1024 for 2–3 hero pieces only |

The scene currently sits at about **50k triangles on a phone** (53k on desktop): roughly 23k of greybox, about 3k of PS1 forest and 11k of apartment. Inside the lace house almost everything is drawn from everywhere (you can see through the walls), so **the number of separate objects (draw calls) matters more than triangle count**. Aim to keep the whole house under ~60 draw calls (check with the `fps` terminal command): give small props in a room one shared texture, and join objects that never move into one mesh before export.

**Habits that help most:** one material per prop, or better one **shared texture atlas per room** for small things; reuse a mesh rather than making unique copies (four scissors, used eight times); JPG inside the GLB for colour textures and PNG only where you need alpha; no subdivision modifiers left live on export.

## Details by room

Sizes are the greybox's, so build to these numbers or update `solid` afterwards.

### Textile room (the old "wardrobe" room)

| Prop (`id` in decor.js) | Size (w × d × h) | Triangles | Texture | Notes |
|---|---|---|---|---|
| `clawfoot_tub` | 1.55 × 0.8 × 0.65 | 2–3k | 512 | Black outside, white enamel rim, silver claw feet. Keep the pink "dye" surface as a separate flat face, slightly emissive. |
| `clothesline` | 3.96 long, at 2.2 m | 300–600 | 512 atlas | Thin line, wooden pegs, 4–6 dyed cloths as **single-sided planes** (Alpha Clip for frayed edges). Cloths in black, silver, light pink and one hot pink. |
| `tapestry_loom` | 1.32 × 0.55 × 1.85 | 2–3k | 512 + tapestry | Upright frame loom. Warp threads as **one textured plane with Alpha Clip**, not hundreds of cylinders. The half-woven tapestry uses `assets/art/tapestry-leaves.png`. It replaces the old clothing rail, and it's the "Collections" interaction now. |
| `treadle_sewing_machine` | 1.0 × 0.5 × 1.1 | 2.5–4k | 1024 (hero) | Cast-iron treadle base and a Singer-style head. The decals can be pink instead of gold. |
| `hand_sewing_machine` | ~0.3 × 0.15 × 0.25 (sits on the fabric box) | 1–1.5k | shares the treadle atlas | Can be the treadle machine's head reused, with a hand crank. |
| `drawing_table` | 1.12 × 0.8 × 1.1, plus stool | 1.5–2k | 512 | Tilted drafting board, paper, ruler, pencil, swing-arm lamp, round stool. |
| `scissor_wall` | 1.1 × 0.9 board | 1.5–2.5k total | 512 | Model **3–4 different scissors** (~150–300 tris each) and duplicate them; they're hung on pegs. Spools of thread on the board are a nice extra. |

### Gallery / salon

| Prop | Size | Triangles | Texture | Notes |
|---|---|---|---|---|
| `fireplace` | 1.9 × 0.62 × 1.2 | 1.5–3k | 512–1024 | Black marble with a silver mantel. Leave the firebox empty, because the pink flames are animated by code. The round mirror above it is part of the greybox; keep it or drop it. |
| `polar_bear_rug` | 1.55 × 1.05 flat + head | 1.5–2.5k (head) | 512 | The flat skin is a textured plane (`assets/textures/polar-bear-rug.png`) and only the **head** needs modelling: open mouth, glass eyes. Origin at the rug centre, head pointing +Y in Blender. |
| `box_tv` | 0.6 × 0.48 × 0.9 incl. stand, plus antenna | 1–1.5k | 512 | Soviet/1970s box TV on a stand, rabbit ears, a crochet doily on top. The animated static is a separate code-made plane at the greybox screen spot (0.38 × 0.29, front face), so build the screen opening there. |
| `ashtray_cigarettes` | on the side table | ~500 total | small atlas | Glass/silver ashtray, 2 butts, 1 resting cigarette (glowing tip = emissive), a pack in black + hot pink, a lighter. |
| `magazines_gallery`, `magazines_fitting` | 0.21 × 0.28 each | 12 per magazine | **1 atlas of covers** | Simple boxes. Make a 1024 atlas of 8 fake cover designs and UV each box to one. Also used under the telephone table. |

### Courtyard ("under the stars")

| Prop | Size | Triangles | Texture | Notes |
|---|---|---|---|---|
| `samovar_tea_table` | Ø 0.8 table, samovar ~0.6 tall | 3–5k total | 1024 (hero) | Vintage silver samovar with a pink porcelain teapot on top, 2 cups and saucers, cake on a stand, small pastries, 2 candles. Split into `samovar.glb` + `tea_table.glb` if that's easier; just add a second line to `PROPS`. |

### Vestibule (entrance)

| Prop | Size | Triangles | Texture | Notes |
|---|---|---|---|---|
| `telephone_table` | 0.52 × 0.4 × 0.72 | 1.5–2k | 512 | Rotary phone (hot pink in the greybox, Dorothy's accent colour; black works too), a curly cord if you like, magazines on the shelf, one candle. |

### Fitting room and bedroom

| Prop | Size | Triangles | Notes |
|---|---|---|---|
| `candelabra` | 0.5 × 0.3 × 1.35 | 600–1k | Silver floor candelabra with 3 candles. |
| `candles_bedroom` | cluster ~0.45 wide | 300–600 | 5 pillar candles of different heights beside the bed. **Candles everywhere:** the flame positions are set in code, so model candles without flames. |

### Things that are textures, not models (already done, replace if you find better)

- **Russian rugs** (`assets/textures/rug-*.png`): pixel-art rugs in the house palette: `rug-kazak` (black, geometric), `rug-medallion` (black, rose medallion), `rug-runner-ivory`, `rug-runner-rose`, colourways of the first two (`-ivory`, `-rose`), and the lace carpets `rug-lace-blush/-noir/-pink/-silver`. The lace ones are made from the clean originals in `assets/rug-source/` by `python3 tools/rough_rugs.py`, which fades them, wears a path down the middle, adds dye banding, stains and frayed fringes (`--seed=N` for different wear). To change a rug, save a new picture over the same filename; keep the proportions about 2:3 (runners 1:1.9, lace 1:2).
- **Stained glass** (`stained-glass-rose.png`, `stained-glass-moon.png`): 9 arched windows: door sidelights (inside and out), gallery either side of the fireplace, fitting room, textile room, bedroom. They glow. To give them real frames, model a thin lead/wood frame and put it at the same spots (`WINDOWS` in decor.js).
- **Wallpapers**: recoloured copies (`assets/wallpapers/*-dw.jpg`). The originals are untouched. Plum tulips are gone (the archive is now black + silver). The vestibule, bedroom and outside walls are now black with pink roses.

### Bedroom / library (behind the secret wall; you can see in through the lace but only the puzzle gets you in)

| Prop | Size | Triangles | Notes |
|---|---|---|---|
| `iron_bed` | 1.06 × 2.0 × 1.15 (headboard) | 1.5–2.5k | Iron twin frame, black with silver knobs. Mattress, pink quilt, pillow. Use **alpha-clipped cards for the iron curls** instead of modelling every scroll. |
| `bed_canopy` | hoop Ø 0.9 at 2.65 m, falls to Ø 2.5 | — | Code-made from `lace-sheer.png` and gently sways. If you model it, keep it **one low-poly cone with the sheer texture**, and leave `model` empty on `bed_canopy` so the sway stays. |
| `bedroom_window` | 0.95 × 1.35 frame | 300–600 | The frame only. The curtains are code-made and billow in the wind, so leave them out. |
| `photo_wall` | 7 frames | 400–800 | Model 3–4 frame styles (oval silver, black rectangle). **The photos are just images:** replace `assets/photos/photo-1.jpg` … `photo-7.jpg` with real old family photos (any size, same filenames). Photos of great-grandmother Dorothy would be perfect here. |
| `bookshelf_1/2` | 1.0 × 0.34 × 2.0 | 300–600 each | Shelves plus **book blocks with a painted spine texture**, not individual books. Fill them with one 512 atlas of spines. |

### The shrine (end of the road)

| Thing | Triangles | Notes |
|---|---|---|
| **Statue** (veiled, Mother-Mary-like) | 3–6k | Best found online: there are many photogrammetry scans of Madonna statues. Decimate to budget and bake the detail into the colour texture (pale stone, a hint of pink in the folds). Set `SHRINE.statueModel` in `shrine.js`. The halo ring is code-made and glows. |
| **Wayside shrine** (chapel box, roof, little onion dome, ribbon rail) | 1.5–3k | Whitewashed with a dark roof and a pink dome. Set `SHRINE.chapelModel`. Offerings (candles, flowers, ribbons, notes) are placed by code on the front step, the ground and the rail on the right, so keep those spots clear. |

**Offerings** are saved in each visitor's own browser (GitHub Pages has no server). A visitor sees their own candles and notes come back on their next visit. If you ever want everyone's offerings shared, that needs a small backend (Firebase, Supabase, etc.).

### Exterior: PS1 style

The trees are **flat picture cards** (two crossed planes) with pixel textures and no filtering, like PS1/N64 games. A continuous **treeline wall** rings the playable area, so the world feels endless but you can't see out. There's also thick fog (`FOG.density` in `exterior.js`).

| Thing | Work | Notes |
|---|---|---|
| **Mirror frame** (`mirror_frame` in decor.js) | 300–600 tris | Ornate silver frame around the 1 × 2 m glass, which stays code-made. |
| **Tree cards** | **Paint, don't model** | Replace `assets/textures/tree-birch-0/1.png` and `tree-spruce-0/1.png` with your own art: transparent PNG, about **48 × 128 px drawn, saved at 4× with nearest-neighbour** (192 × 512). Keep the base of the trunk at the bottom centre. Hard pixel edges, no soft alpha. |
| **Treeline strips** | Paint | `treeline-near.png` (pale birch trunks in front) and `treeline-far.png` (dark). These must **tile left-to-right**; the bottom third should be solid so you can't see between trunks. |
| **House facade + roof** | 2–5k tris | The house is lace now, inside and out, which is lovely from the road. A pitched roof with lace or bare rafters would finish the silhouette. |
| Lantern posts (optional) | 200–400 tris | Six along the road. |
| Road | — | Generated from the points in `ROAD`. Edit them and the walkable area, trees and treeline all follow. |

The total for the whole forest is about **2–3k triangles**, which leaves budget for the house, bedroom and shrine.

### Lace walls (textures, already done)

The walls use the refined lace pack. Each room's design is a clean white-on-black ornament mask in `assets/lace-source/` (1024×1024, seamless, no net). `python3 tools/import_lace.py` turns them into the wall textures: it scales to 512, adds a 2 px tulle net, adds a stitched rim, and tints each room white or light pink (`ROOMS` in that script). One tile covers 2.2 m of wall, and only one lace layer per wall is shown.

| Room | Design |
|---|---|
| Entrance, bedroom, outside of the house | rose sprigs |
| Courtyard | heart-and-tulip damask |
| Passage | fleur-de-lis lattice |
| Archive | tulips in chained ovals |
| Gallery | ferns |
| Fitting room | carnations |
| Atelier | snowflake stars |
| Textile room | cross-stitch diamonds |
| Shrine (panel behind the statue) | stars and crosses |

**To change one:** replace its mask with any seamless white-on-black PNG (no net; keep the thinnest lines at least ~1/80 of the width) and re-run the script. A photographed scrap of Dorothy's own lace, cleaned up the same way, would work too.

## Opal's garments (the gallery rails)

The rails in the gallery hang whatever is listed in `assets/garments/garments.json`: the first six, three per rail. Everything listed also shows in Rooms → Collections. There are six pixel-art placeholders now.

- **Best photos:** the garment on a hanger, shot straight on, ideally cut out on a **transparent PNG**. A photo with a background also works and hangs as a picture card.
- **Size:** about 256 × 640 px for the rail (it gets pixelated anyway). An optional bigger `photo` can be listed for the Collections window.
- Each entry can also have a `note`, `price` and `link` (shop or Instagram). See `assets/garments/README.txt`.

## Stained glass from Blender

1. Bake your glass to an image in Blender:
   - Make a 1:2 plane and build the glass with nodes, ending in an **Emission** shader.
   - Add an unconnected **Image Texture** node with a new 128×256 image, and click it so it's selected.
   - Set the engine to **Cycles**, then Bake → Type **Emit** → **Bake**.
   - Save the image as a PNG.
2. Run `python3 tools/import_glass.py your-bake.png rose`, or send me the PNG. It cuts the arch, adds the lead frame, and writes `assets/textures/stained-glass-rose.png`.
3. For a new design (e.g. `wolf`), import it under that name, change a window's design in `WINDOWS` in `decor.js`, and paste the printed colour into `GLASS_LIGHT`.

The opal shimmer is added in code on top of whatever you bake, so bake the glass flat and milky; don't try to bake the shimmer. Light panes shimmer more than dark ones, and lead lines stay black.

## Things to find online instead of modelling

Check each asset's licence; **CC0** needs no credit, **CC-BY** needs a credit line somewhere on the site.

- **Poly Haven** (CC0): textures for marble, wood, fabric, plaster, and some furniture/props.
- **Sketchfab** (filter by *Downloadable* + licence): samovars, Singer sewing machines, rotary phones, clawfoot tubs and CRT TVs all turn up often. **Check the triangle count first** and decimate in Blender (Decimate modifier → Collapse) to the budgets above.
- **Quaternius / Kenney** (CC0): low-poly trees and small props, good starting points for the forest.
- **Rug photos**: museum collection sites often have high-res public-domain scans of Caucasian/Russian rugs, which make good source material for the rug textures.

## Knobs you can turn without modelling

| What | Where |
|---|---|
| Joystick speed and feel | `JOY` in `app.js` (`walk`, `turn`, `curve`, `ease`). Keyboard speed is `KEYS`, unchanged. |
| Palette, wallpaper swaps, colour tints | `PAL`, `WALLPAPER_SWAP`, `MATERIAL_TINT` in `decor.js` |
| Sky and mist colours | `SKY`, `MIST` at the top of `babylon-world.js` (the sky colour is the original) |
| Forest density, road route, treeline distance, fog thickness | `FOREST`, `ROAD`, `CLEARING`, `TREELINE`, `FOG` in `exterior.js` |
| PS1 look (resolution, wobble, texture warp, colour depth, dither, texture sampling) | `PS1` in `ps1.js`; terminal command `ps1` toggles it |
| Sound levels and positions (wind, fire, TV, shrine, phone) | `AMBIENCE` and `SOURCES` in `ambience.js` |
| Opal glass shimmer | `OPAL` in `opal.js` |
| Lace lining (how see-through each wall is) | `LACE_LINING` in `decor.js`; terminal `lining` |
| Walking speed presets | `SPEEDS` in `app.js`; terminal `speed` |
| Check performance on a phone | terminal `fps` |
| Snow amount, speed, flake size | `SNOW` in `snow.js`; terminal `snow` toggles |
| Arrival glide (start on the road) | `ARRIVAL` in `app.js` (`ms: 0` = start inside) |
| Garment rail positions | `RAIL_SLOTS` in `garments.js` |
| Lace on/off, layered rugs | `LACE_WALLS`, `FLOOR_RUGS` in `decor.js` (each rug: position, size, turn, layer) |
| Bedroom photos | `assets/photos/photo-1.jpg` … `photo-7.jpg` |
| Little lines when you touch the samovar, TV, phone… | `whispers` in `app.js` |
| Regenerate glass/bark/wallpaper colours | `python3 tools/make_textures.py` (it also writes the old generated rugs, which the game no longer uses), then `python3 tools/make_lace_and_sprites.py` for lace, tree cards, treelines and photos (needs Pillow) |

## Open questions for Dorothy

- **"Clothing line"**: I read it as a washing line for the freshly dyed fabric, over the dye tub. If she meant a rail showing her clothing line, the gallery's two rails already do that, and the loom took the place of the textile room's old rail.
- The **fire is pale pink**, to stay in palette. Easy to change in `decor.js` if she wants a normal fire.
- The **lace curtains** are still cream (that's in their texture). Swap the texture in Blender if they bother her.
