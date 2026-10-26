// The bundled vendor/babylon.js is a slim build that only exposes a few classes (Mesh, MeshBuilder with
// Box/Cylinder/Sphere/Plane/Torus, StandardMaterial, MirrorTexture...). These helpers fill the gaps.
const B = window.BABYLON;
// Texture is not exported, but MirrorTexture -> RenderTargetTexture -> Texture.
export const Texture = Object.getPrototypeOf(Object.getPrototypeOf(B.MirrorTexture));
// Flat ground plane (CreateGround is not in the build): a Plane baked to face up. UV v runs along +z.
export function ground(name, { width, height }, scene) {
  const m = B.MeshBuilder.CreatePlane(name, { width, height }, scene);
  m.bakeTransformIntoVertices(B.Matrix.RotationX(Math.PI / 2));
  return m;
}
// Empty node to parent things to (TransformNode is not exported; an empty Mesh works the same).
export function node(name, scene) { return new B.Mesh(name, scene); }
// Draw once into a canvas and turn it into a texture (DynamicTexture is not in the build).
export function canvasTexture(scene, w, h, draw, { alpha = false, sampling = Texture.TRILINEAR_SAMPLINGMODE, mipmaps = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new Texture(c.toDataURL(), scene, !mipmaps, true, sampling); t.hasAlpha = alpha; return t;
}
// A chunky 3D star (two-sided), used for your reflection in the mirror.
export function starMesh(name, scene, { outer = .25, inner = .1, depth = .06, points = 5 } = {}) {
  const pos = [0, 0, depth, 0, 0, -depth], idx = [];
  for (let i = 0; i < points * 2; i++) { const a = Math.PI / 2 + i * Math.PI / points, r = i % 2 ? inner : outer; pos.push(Math.cos(a) * r, Math.sin(a) * r, 0); }
  for (let i = 0; i < points * 2; i++) { const a = 2 + i, b = 2 + (i + 1) % (points * 2); idx.push(0, a, b, 1, b, a); }
  const m = new B.Mesh(name, scene), vd = new B.VertexData(), nrm = [];
  B.VertexData.ComputeNormals(pos, idx, nrm); vd.positions = pos; vd.indices = idx; vd.normals = nrm; vd.applyToMesh(m); return m;
}
// PS1-style 'blob lights': soft additive pools of colour on the floor under lamps, candles and windows.
// pools: [{ x, z, w, l, ry, color: '#hex', k: strength }]. All merged into one mesh (one draw call).
let poolTex = null;
export function buildLightPools(scene, pools, name = 'light pools') {
  if (!pools.length) return null;
  poolTex ??= canvasTexture(scene, 64, 64, g => {
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(.45, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  }, { alpha: true });
  const parts = pools.map(p => {
    const q = ground('pool', { width: p.w, height: p.l ?? p.w }, scene);
    q.position.set(p.x, p.y ?? .026, p.z); q.rotation.y = p.ry || 0;
    const c = B.Color3.FromHexString(p.color), k = p.k ?? .3, n = q.getTotalVertices(), col = [];
    for (let i = 0; i < n; i++) col.push(c.r * k, c.g * k, c.b * k, 1);
    q.setVerticesData('color', col); return q;
  });
  const m = parts.length > 1 ? B.Mesh.MergeMeshes(parts, true, true) : parts[0];
  m.name = name;
  const mat = new B.StandardMaterial(name, scene); mat.disableLighting = true; mat.emissiveColor = B.Color3.White();
  mat.diffuseTexture = poolTex; mat.useAlphaFromDiffuseTexture = true; mat.alphaMode = B.Engine.ALPHA_ADD; mat.backFaceCulling = false; mat.zOffset = -10;
  m.material = mat; m.isPickable = false; m.freezeWorldMatrix();
  return m;
}
// Texture atlas: packs several images into one grid texture so many pictures cost ONE draw call.
// Layout is fixed up front (cell index = position in the list), so meshes can be UV-mapped immediately;
// the texture fills in once the images have loaded.
//   const atlas = makeAtlas(scene, urls, { cellW: 256, cellH: 512, cols: 4, alpha: true });
//   atlas.mapUVs(mesh, index)   // squeeze a 0..1-UV mesh into that cell (call before merging)
//   material.diffuseTexture = atlas.texture  (set automatically via atlas.onReady)
// crisp: no mipmaps, so pixel art stays sharp at a distance instead of blurring into a smudge (PS1 had no mipmaps either).
export function makeAtlas(scene, urls, { cellW = 256, cellH = 256, cols = 4, alpha = false, smooth = true, crisp = false } = {}) {
  const rows = 2 ** Math.ceil(Math.log2(Math.max(1, Math.ceil(urls.length / cols)))), W = cellW * cols, H = cellH * rows, pad = 1; // power-of-two rows: safe mipmaps everywhere
  const rect = i => {
    const c = i % cols, r = Math.floor(i / cols);
    return [(c * cellW + pad) / W, 1 - ((r + 1) * cellH - pad) / H, ((c + 1) * cellW - pad) / W, 1 - (r * cellH + pad) / H];
  };
  const atlas = {
    W, H, rect, texture: null, ready: false, waiting: [],
    // flipU: for planes turned to face the viewer, so pictures aren't mirrored. turn: the picture turned a quarter
    // (a tall rug texture hung sideways on a wall).
    mapUVs(mesh, i, flipU = false, turn = false) {
      const [u0, v0, u1, v1] = rect(i), uv = mesh.getVerticesData('uv');
      for (let k = 0; k < uv.length; k += 2) {
        let u = flipU ? 1 - uv[k] : uv[k], v = uv[k + 1];
        if (turn) [u, v] = [v, 1 - u];
        uv[k] = u0 + u * (u1 - u0); uv[k + 1] = v0 + v * (v1 - v0);
      }
      mesh.setVerticesData('uv', uv);
    },
    onReady(fn) { if (atlas.ready) fn(atlas.texture); else atlas.waiting.push(fn); },
  };
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'); g.imageSmoothingEnabled = smooth;
  Promise.all(urls.map((u, i) => new Promise(res => {
    if (!u) return res();
    const img = new Image();
    img.onload = () => { const c = i % cols, r = Math.floor(i / cols); g.drawImage(img, c * cellW, r * cellH, cellW, cellH); res(); };
    img.onerror = () => { console.warn('atlas image missing', u); res(); };
    img.src = u;
  }))).then(() => {
    const t = new Texture(canvas.toDataURL('image/png'), scene, crisp, true, crisp ? Texture.NEAREST_SAMPLINGMODE : Texture.TRILINEAR_SAMPLINGMODE); t.hasAlpha = alpha;
    atlas.texture = t; atlas.ready = true; atlas.waiting.forEach(fn => fn(t));
  });
  return atlas;
}
