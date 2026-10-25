# Dorothy Wolfe: GitHub Pages

## What's new (24 Oct 2026, round 8)

- **Opal's garments on the gallery rails** (`garments.js`): picture cards hanging from the rails, swaying slightly, replacing the flat pink swatches. Walk up to a rail ("the collection") or open Rooms → Collections to see them all in a grid. Add real pieces by dropping photos into `assets/garments/` and listing them in `garments.json` (see the README in that folder). Six pixel-art placeholders are there for now (`tools/make_garments.py`).
- **Opalescent stained glass** (`opal.js`): the windows shift between milky pink, silver-blue and white as you move past, with soft glints. Works on any glass texture. Tune `OPAL` (strength, speed, sparkle).
- **Bring your own windows** (`tools/import_glass.py`): `python3 tools/import_glass.py my-bake.png rose` turns a baked or painted rectangle into an arched window with a lead frame, and prints the floor-light colour. New designs can have their own names (`WINDOWS` / `GLASS_LIGHT` in `decor.js`).
- **Arrival**: the welcome screen now looks at the lace house from the road. "Enter the apartment" glides you in through the front door (about 3.5 s). Any joystick or key input cancels it, and reduced-motion users start inside. `ARRIVAL.ms = 0` in `app.js` turns it off.
- **Snow** on the road and at the shrine (`snow.js`), outside only. The `snow` terminal command toggles it (remembered).

## What's new (24 Oct 2026, round 7)

- **Refined lace pack** on every wall: hand-directed designs per room (rose sprigs, heart-and-tulip damask, fleur-de-lis, ferns, carnations, tulip ovals, snowflake stars, cross-stitch, and stars and crosses for the shrine). Source masks live in `assets/lace-source/`; `python3 tools/import_lace.py` converts them (2 px net, stitched rim, white or pink per room). To change a room's lace, replace its mask and re-run.
- The shrine now has a panel of star-and-cross lace behind the statue.

## What's new (24 Oct 2026, round 6)

- **Cleaner lace**: same patterns as before (each room's wallpaper turned into lace), now read by *local contrast*, so aged-paper blotches are ignored and only the printed motif becomes lace. Specks are removed, motif edges are solid, and each room is tuned separately (`LACE_TUNE` / `lace_clean` in `tools/make_lace_and_sprites.py`). A geometric cut-paper set also exists in `tools/make_clean_lace.py` but isn't used.
- **One layer of lace per wall**: back faces are hidden, so you no longer see two lace layers 20 cm apart shimmering against each other.
- **Puzzle progress is remembered** in the visitor's browser (threads pulled, passage open). Terminal `reset` starts over.

## What's new (24 Oct 2026, round 5)

- **PS1 vertex wobble and texture warp are now off by default** (they made objects jitter apart and textures slide when turning). The `wobble` terminal command turns both on for fun.
- **Calmer field of view**: about 80° across on desktop (was ~100°) and less vertical stretch on phones, so things don't smear at the screen edges when you turn.
- **Fixed floating trees**: the outdoor ground had been lowered 30 cm, which left trees, lanterns, road and shrine hovering. The ground is back at floor level, and the house floor gets a depth bias instead.

## What's new (24 Oct 2026, round 4)

- **Sound** (`ambience.js`, all generated in code with no audio files): wind in the birches (louder on the road), a crackling fireplace, TV hiss, a soft hum at the shrine, the rotary phone ringing once when you come back to the entrance, a dial tone that drowns in static when you pick it up, and a zip when a thread is pulled into the sky. It starts when the visitor turns sound on.
- **Affine texture warping** (the PS1 'swimming' textures): subtle by default, `PS1.warp` in `ps1.js` (0 = off, 1 = full PS1).

## What's new (24 Oct 2026, round 3)

- **PS1 render mode** (`ps1.js`): 256-line resolution with hard pixels, point-sampled textures, vertex wobble, 15-bit colour with dithering. The `ps1` terminal command toggles it, and the choice is remembered. It also draws far fewer pixels, so it's much lighter on phones.
- **Loose threads now hang down out of the sky** (pink thread with a spool) instead of floating rings. Pulling one makes it zip back up into the stars.
- **The mirror no longer pops in**: it's always there in a silver frame, and its reflection refreshes faster as you get closer.
- **Lighting**: a gradient sky dome that melts into the fog, plus PS1-style 'blob lights' on the floor under lanterns, candles, the TV (flickering), the shrine and the stained glass.
- Depth bias on rugs, decals and the road, so nothing flickers with the wobble.

## What's new (24 Oct 2026, round 2)

- **Lace house**: every wall is see-through lace made from its own wallpaper pattern, with loose threads blowing off the wall tops. You can see the secret bedroom through the lace but still need the puzzle to get in.
- **Bedroom / library** behind the secret wall: iron bed with a swaying lace canopy, an open window with billowing curtains, a wall of old photos (`assets/photos/`), bookshelves.
- **Layered rugs** across the floors, and your **reflection in the mirror is a star**.
- **PS1-style forest**: flat pixel tree cards and a continuous treeline wall, with thick fog so you can't see forever.
- **Shrine at the end of the road**: a veiled statue with a halo. Visitors can light candles, leave flowers, tie threads and pin notes, all remembered in their browser.
- **Fixed snagging on the road**: outdoor walking now slides along the road's edges instead of catching on its corners.

## What's new (24 Oct 2026)

- **Slower, smoother joystick**: gentler response for small pushes and eased starts and stops. Tune `JOY` in `app.js`.
- **Dorothy's palette** (black, silver, light pink, a little hot pink): wallpapers recoloured at runtime (originals kept), no plum, neutral moonlight instead of amber lamps, a hot pink wordmark, and the UI's plum tones turned to black/silver.
- **Russian rugs** on floors and walls (no red), plus **stained-glass windows**.
- **Outside**: walk out the front door onto a winding cobbled road with lanterns, through a misty birch and spruce forest. The sky, moon and stars are kept, and the moon has a halo.
- **Textile room**: clawfoot dye tub, clothesline, tapestry loom, two old sewing machines, a wall of scissors, a drawing table.
- **House decor**: fireplace, polar bear rug, samovar with tea set and cakes, box TV with static, rotary phone, ashtray and cigarettes, magazines, candles.
- All the new objects are **greybox stand-ins**. See **MODELING-GUIDE.md** for what to model, sizes, triangle budgets and how to swap real models in.
- Fixes: gallery furniture collision was stale (invisible walls in the bedroom, no collision on the real benches/table); the reader's card now sits on the gallery side table; dream mode's moonlight colour was an invalid hex.
- Add `?debug` to the URL to expose `window.__dw` (player position etc.) for testing.

New files: `decor.js` (palette, rugs, windows, props, lace, wind threads), `exterior.js` (road, PS1 forest, treeline, walking), `shrine.js` (shrine + offerings), `ps1.js` (PS1 look), `ambience.js` (sound), `garments.js` (collection on the rails), `opal.js` (opalescent glass), `snow.js`, `assets/photos/`, `tools/make_lace_and_sprites.py`, `babylon-extras.js` (helpers for the slim Babylon build), `assets/textures/`, `assets/models/`, `assets/wallpapers/*-dw.jpg`, `tools/make_textures.py`.

Ready-to-upload static website, exported from the corrected 5 October 2026 version.
Includes the environment, textures, font, Babylon.js engine, and editable HTML/CSS/JavaScript.
No npm install or build step is needed to publish this package.

## Upload

1. Extract this ZIP on your computer. Do not upload the ZIP itself.
2. Create/open the GitHub repository you want to use.
3. Upload the extracted contents, keeping all folders intact. `index.html` must be at the repository root, beside `app.js`, `assets/`, and `vendor/`.
4. Commit the upload to `main` (or your chosen branch).
5. Open Settings > Pages. Select Deploy from a branch, choose `main` and `/ (root)`, and Save.
6. Wait for deployment to finish; open the URL shown in Pages settings.

The included `.nojekyll` file is intentional. If your file picker hides it, create an empty file named `.nojekyll` in the repository root.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Local preview

Open a terminal in this folder and run `python -m http.server 8000` (or `python3 -m http.server 8000`). Visit http://localhost:8000/ . Opening index.html by double-clicking will not reliably load the JavaScript modules and model.

## Files you will edit

- `index.html`: page structure and entrance buttons.
- `style.css` and `soft-terminal.css`: appearance.
- `loader.js` / `loader.css`: loading screen. `loader.js` loads the Babylon engine with a progress count, then starts `app.js`. If you replace `vendor/babylon.js`, update `ENGINE_BYTES` at the top of `loader.js` (the bar still works if you forget, just less accurately).
- `mobile.css`: phone layout (portrait first). Loaded last, so phone-specific changes go here; desktop is not affected.
- `app.js`: controls, directory text, interaction positions, room shortcuts and puzzle state.
- `babylon-world.js`: active 3D renderer, model loading, collision checks, mirror, lights and procedural objects.
- `radio.js`: audio.
- `assets/apartment.glb`: visible environment, including the wallpapers. Each wall object has one material slot per room it faces; materials are named `Wallpaper / <room> / <paper>` (the original rose lattice is `Faded floral paper / packed`). To repaper a wall in Blender, change the material on its faces and re-export. Wallpaper source images are in `assets/wallpapers/`.
- `assets/collision.json`: separate wall/obstacle boxes and walkable floor bounds. This is not part of the GLB. `Bedroom_Wall_00` was added for the hidden bedroom's partition (Blender object `Vestibule_East_00.001`), which previously had no collision.
- `tools/paper_glb.py`: the one-off script that baked the wallpapers into the GLB. Not needed for normal Blender edits.

Other scene scripts are retained from the supplied project; the active entry point is app.js, which imports babylon-world.js. Do not switch engines to update the model.

## Replacing the environment GLB

Replace `assets/apartment.glb` with your exported GLB using that exact filename. An arbitrary extra GLB in the repository is not loaded automatically.

The GLB updates visible geometry, but it does not regenerate collision.json or relocate interactions.

| Change | Required updates |
| --- | --- |
| Textures or appearance, same layout and object names | Replace apartment.glb; supply any external textures if not embedded. |
| Walls, doors, floors, room dimensions or solid furniture | Replace apartment.glb and regenerate/update collision.json to match. |
| Position of an interactive object, room shortcut or entrance | Update objects, targets, roomSigns and/or player in app.js. |
| Mirror location, lights, sky or scripted effects | Update babylon-world.js as appropriate. |

Keep the existing scale, origin and export orientation when only changing decoration. Collision bounds are in the original Blender Z-up coordinates; the runtime converts horizontal scene z to Blender -Y. Each bounds array is [minX,minY,minZ,maxX,maxY,maxZ]. `boxes` contains objects with name and bounds; `floors` contains bounds arrays. These are axis-aligned boxes, so complex or rotated spaces may need several carefully chosen bounds.

For existing special behaviour, preserve the mesh names `secret_wall` and `mirror_surface`, and the Floating pearl naming pattern. The runtime hides mirror_surface and builds its own reflective plane at fixed coordinates. It creates stars, a moon and collectible threads separately from the GLB, so changing the GLB will not remove or reposition those. It also converts imported materials to simpler StandardMaterials; not every Blender/PBR material effect will transfer exactly.

If you change the layout without changing collision.json, you can hit invisible walls, walk through visible furniture, or be unable to enter newly added floor areas. No automatic collision export is included in this package. For a substantial layout edit, provide the updated .blend or GLB so the collision bounds and interaction coordinates can be updated together.

After committing replacements, wait for Pages deployment and hard-refresh the page. Keep a working copy before replacing the environment.

## Verification

This export preserves the corrected site's runtime files and uses relative asset paths suitable for a repository Pages URL. Keyboard and touch-control simulations passed against the actual HTML element IDs. A browser/WebGL visual test was not available during this export.

## Performance note

On load, `babylon-world.js` merges static GLB pieces that share a material into single meshes (about 190 draw calls per frame down to about 25). Objects that move or are interacted with stay separate: `secret_wall`, `Floating pearl*`, `mirror_surface`, and the thread rings. If you add a new animated or interactive object in Blender, add its name to that exclusion list in `load()`.
