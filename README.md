# Dorothy Wolfe: GitHub Pages

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
- `mobile.css`: phone layout (portrait first). Loaded last, so phone-specific changes go here; desktop is not affected.
- `app.js`: controls, directory text, interaction positions, room shortcuts and puzzle state.
- `babylon-world.js`: active 3D renderer, model loading, collision checks, mirror, lights and procedural objects.
- `radio.js`: audio.
- `assets/apartment.glb`: visible environment.
- `assets/collision.json`: separate wall/obstacle boxes and walkable floor bounds.

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
