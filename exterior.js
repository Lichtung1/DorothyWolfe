// exterior.js: the winding road from the front door to the shrine, through a dense PS1-style forest.
//
// Look: trees are flat picture cards (two crossed planes, pixel textures, no filtering), like old
// PlayStation / N64 games. Behind them, two continuous 'treeline' walls ring the playable area so you can
// never see out, and thick fog swallows everything past ~25 m. All of it is a handful of draw calls.
//
// Walking: outside the house you can be anywhere within ROAD_WIDTH of the road's centre line, on the
// doorstep, or in the shrine clearing. Movement slides smoothly along those edges (see constrain()).
import { Texture, ground as flat, canvasTexture } from './babylon-extras.js';
import { buildShrine } from './shrine.js?v=dw-20261024j';
const B = window.BABYLON;

// Road centre line from the front door (z = 10) to the clearing. Edit freely; walking and trees follow it.
export const ROAD = [[0, 9.95], [0, 12.5], [.6, 15], [2.6, 18.5], [2.2, 22], [-.8, 25.5], [-3.6, 29], [-3.2, 33], [.2, 36.5], [2.6, 39.4]];
export const ROAD_WIDTH = 2.5;
export const CLEARING = { x: 3.3, z: 42.6, r: 3.8 };          // the shrine stands at the back of this circle
export const FOREST = { cards: 420, seed: 7, phone: .75 };     // tree cards (phones get 75%)
export const TREELINE = [{ gap: 7, h: 9, tex: 'treeline-near' }, { gap: 13, h: 13, tex: 'treeline-far' }]; // metres beyond the walkable area
export const FOG = { density: .055 };                          // higher = shorter view. .04 airy, .07 very thick

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function sampleRoad(step = .3) {
  const P = ROAD.map(([x, z]) => new B.Vector3(x, 0, z)), pts = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(B.Vector3.Distance(p1, p2) / step));
    for (let k = 0; k < n; k++) pts.push(B.Vector3.CatmullRom(p0, p1, p2, p3, k / n));
  }
  pts.push(P[P.length - 1]);
  let d = 0; return pts.map((p, i) => { if (i) d += B.Vector3.Distance(p, pts[i - 1]); return { x: p.x, z: p.z, d }; });
}

function hull(pts) { // monotone chain convex hull of [x,z] points
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function buildExterior(scene, { touch } = {}) {
  const out = { floors: [], tick: [], meshes: [], boxes: [], pools: [] }, rand = rng(FOREST.seed), road = sampleRoad(), hw = ROAD_WIDTH / 2;
  const tex = (n, u = 1, v = 1, pixel = false) => {
    const t = new Texture('assets/textures/' + n + '.png', scene, false, true, pixel ? Texture.NEAREST_SAMPLINGMODE : Texture.TRILINEAR_SAMPLINGMODE);
    t.uScale = u; t.vScale = v; return t;
  };

  // ---------------------------------------------------------------- walkable area + smooth sliding
  const R = hw - .3; // how far from the centre line your centre may go
  const caps = [];
  for (let i = 1; i < road.length; i++) caps.push([road[i - 1].x, road[i - 1].z, road[i].x, road[i].z]);
  const rects = [[-.46, 9.9, .46, 10.6], [-1.45, 10.33, 1.45, 12.3]]; // through the door, doorstep
  // Returns the nearest walkable point to (x, z). Called with where you are trying to go, so pushing into an
  // edge slides you along it instead of stopping dead (the old version snagged on the road's corners).
  out.constrain = (x, z) => {
    let best = null, bd = Infinity;
    const take = (px, pz) => { const d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = { x: px, z: pz }; } return d === 0; };
    for (const [x0, z0, x1, z1] of rects) if (take(Math.min(x1, Math.max(x0, x)), Math.min(z1, Math.max(z0, z)))) return best;
    const cr = CLEARING.r - .3, cd = Math.hypot(x - CLEARING.x, z - CLEARING.z);
    if (cd <= cr) return { x, z }; take(CLEARING.x + (x - CLEARING.x) * cr / cd, CLEARING.z + (z - CLEARING.z) * cr / cd);
    for (const [ax, az, bx, bz] of caps) {
      const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2)), cx = ax + vx * t, cz = az + vz * t;
      const d = Math.hypot(x - cx, z - cz) || 1e-6;
      if (d <= R) return { x, z };
      take(cx + (x - cx) * R / d, cz + (z - cz) * R / d);
    }
    return best;
  };
  out.outsideZ = 10.0; // player centre beyond this = outdoor rules
  out.floors.push([-1.6, -12.4, -.2, 1.6, -9.9, 0]); // doorstep, so the indoor rules can step through the door

  // ---------------------------------------------------------------- ground, road, clearing
  const ground = flat('forest floor', { width: 220, height: 220 }, scene);
  ground.position.set(0, -.02, 20); // trees, road, lanterns and shrine stand at y = 0 (the house floors get a depth bias so they always win)
  const gm = new B.StandardMaterial('forest floor', scene); gm.diffuseTexture = tex('forest-floor', 55, 55); gm.specularColor = B.Color3.Black();
  gm.diffuseColor = B.Color3.FromHexString('#8f8a99'); gm.backFaceCulling = false; ground.material = gm; out.meshes.push(ground);

  const pos = [], uv = [], idx = [], nrm = [];
  road.forEach((p, i) => {
    const a = road[Math.max(0, i - 1)], b = road[Math.min(road.length - 1, i + 1)];
    let tx = b.x - a.x, tz = b.z - a.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    pos.push(p.x - tz * hw, .006, p.z + tx * hw, p.x + tz * hw, .006, p.z - tx * hw);
    nrm.push(0, 1, 0, 0, 1, 0); uv.push(0, p.d / 2.5, 1, p.d / 2.5);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const rm = new B.Mesh('road', scene), vd = new B.VertexData();
  vd.positions = pos; vd.indices = idx; vd.normals = nrm; vd.uvs = uv; vd.applyToMesh(rm);
  const roadMat = new B.StandardMaterial('road', scene); roadMat.diffuseTexture = tex('road-cobbles'); roadMat.specularColor = B.Color3.Black(); roadMat.backFaceCulling = false;
  roadMat.zOffset = -2; rm.material = roadMat; out.meshes.push(rm);
  const disc = B.MeshBuilder.CreateCylinder('clearing', { diameter: CLEARING.r * 2 + .6, height: .01, tessellation: 28 }, scene);
  disc.position.set(CLEARING.x, .004, CLEARING.z);
  const dm = new B.StandardMaterial('clearing', scene); dm.diffuseTexture = tex('road-cobbles', 3, 3); dm.specularColor = B.Color3.Black(); dm.zOffset = -1; disc.material = dm; out.meshes.push(disc);

  // ---------------------------------------------------------------- lanterns along the road
  const posts = [], orbs = [];
  for (let d = 4, side = 1; d < road[road.length - 1].d; d += 6.5, side = -side) {
    const p = road.find(q => q.d >= d); if (!p) break;
    const i = road.indexOf(p), n = road[Math.min(road.length - 1, i + 1)];
    let tx = n.x - p.x, tz = n.z - p.z; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const x = p.x - tz * (hw + .45) * side, z = p.z + tx * (hw + .45) * side;
    const post = B.MeshBuilder.CreateCylinder('lantern post', { diameterTop: .05, diameterBottom: .09, height: 1.9, tessellation: 6 }, scene); post.position.set(x, .95, z); posts.push(post);
    const cap = B.MeshBuilder.CreateCylinder('lantern cap', { diameterTop: 0, diameterBottom: .26, height: .14, tessellation: 6 }, scene); cap.position.set(x, 2.2, z); posts.push(cap);
    const orb = B.MeshBuilder.CreateSphere('lantern orb', { diameter: .24, segments: 5 }, scene); orb.position.set(x, 2.02, z); orbs.push(orb);
    out.pools.push({ x, z, w: 4.2, color: '#ffd2ea', k: .3 });
  }
  if (posts.length) {
    const pm = B.Mesh.MergeMeshes(posts, true, true); const m = new B.StandardMaterial('lantern iron', scene); m.diffuseColor = B.Color3.FromHexString('#1a181d'); m.specularColor = B.Color3.Black(); pm.material = m; out.meshes.push(pm);
    const om = B.Mesh.MergeMeshes(orbs, true, true); const m2 = new B.StandardMaterial('lantern glow', scene); m2.disableLighting = true; m2.emissiveColor = B.Color3.FromHexString('#ffe0f0'); m2.fogEnabled = false; om.material = m2; out.meshes.push(om);
  }

  // ---------------------------------------------------------------- the 'Zelda wall': continuous treelines around everything
  const core = [[-10.2, -10.6], [10.2, -10.6], [10.2, 10.4], [-10.2, 10.4]];
  for (let i = 0; i < road.length; i += 6) core.push([road[i].x, road[i].z]);
  for (let a = 0; a < 12; a++) core.push([CLEARING.x + Math.cos(a / 12 * 6.283) * CLEARING.r, CLEARING.z + Math.sin(a / 12 * 6.283) * CLEARING.r]);
  const ring = gap => { const pts = []; for (const [x, z] of core) for (let a = 0; a < 16; a++) pts.push([x + Math.cos(a / 16 * 6.283) * gap, z + Math.sin(a / 16 * 6.283) * gap]); return hull(pts); };
  const rings = TREELINE.map(t => ring(t.gap));
  TREELINE.forEach((t, ri) => {
    const poly = rings[ri], p = [], u = [], ix = [];
    let run = 0;
    for (let i = 0; i <= poly.length; i++) {
      const [x, z] = poly[i % poly.length];
      if (i) run += Math.hypot(x - poly[(i - 1) % poly.length][0], z - poly[(i - 1) % poly.length][1]);
      p.push(x, 0, z, x, t.h, z); u.push(run / (t.h * 2.6), 0, run / (t.h * 2.6), 1);
      if (i) { const k = i * 2; ix.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    }
    const wall = new B.Mesh('treeline ' + ri, scene), v2 = new B.VertexData(); v2.positions = p; v2.uvs = u; v2.indices = ix; v2.applyToMesh(wall);
    const wm = new B.StandardMaterial('treeline ' + ri, scene); wm.diffuseTexture = tex(t.tex, 1, 1, true); wm.diffuseTexture.hasAlpha = true;
    wm.disableLighting = true; wm.emissiveColor = B.Color3.FromHexString(ri ? '#8e8a99' : '#b4aebf'); wm.backFaceCulling = false; wall.material = wm; wall.isPickable = false;
    out.meshes.push(wall);
  });

  // ---------------------------------------------------------------- PS1 tree cards scattered between the road and the treeline
  const walkDist = (x, z) => {
    let d = Math.hypot(x - CLEARING.x, z - CLEARING.z) - CLEARING.r;
    for (const [ax, az, bx, bz] of caps) {
      const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
      d = Math.min(d, Math.hypot(x - ax - vx * t, z - az - vz * t) - hw);
    }
    return d;
  };
  const inHouse = (x, z) => Math.abs(x) < 10.4 && z > -10.8 && z < 10.6;
  const outer = rings[rings.length - 1];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of outer) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  const cross = () => { // two crossed 1x1 planes, base on the ground (one per kind: thin-instance buffers live on the geometry, so no clones)
    const a = B.MeshBuilder.CreatePlane('card', { size: 1 }, scene), b = B.MeshBuilder.CreatePlane('card', { size: 1 }, scene);
    b.rotation.y = Math.PI / 2; const m = B.Mesh.MergeMeshes([a, b], true); m.bakeTransformIntoVertices(B.Matrix.Translation(0, .5, 0)); return m;
  };
  const kinds = ['tree-birch-0', 'tree-birch-1', 'tree-spruce-0', 'tree-spruce-1'];
  const mats = kinds.map(() => []);
  const total = Math.round(FOREST.cards * (touch ? FOREST.phone : 1));
  for (let n = 0, tries = 0; n < total && tries < total * 20; tries++) {
    const x = minX + rand() * (maxX - minX), z = minZ + rand() * (maxZ - minZ);
    if (!inPoly(x, z, outer) || inHouse(x, z) || walkDist(x, z) < 1.4) continue;
    const kind = rand() < .45 ? (rand() < .5 ? 0 : 1) : (rand() < .5 ? 2 : 3);
    const h = kind < 2 ? 7 + rand() * 5 : 6 + rand() * 7, w = h * .375 * (.9 + rand() * .25);
    mats[kind].push(B.Matrix.Compose(new B.Vector3(w, h, w), B.Quaternion.RotationYawPitchRoll(rand() * Math.PI, 0, 0), new B.Vector3(x, 0, z)));
    n++;
  }
  const cards = kinds.map(() => cross());
  kinds.forEach((k, i) => {
    const mesh = cards[i]; mesh.name = 'trees ' + k;
    if (!mats[i].length) { mesh.dispose(); return; }
    const m = new B.StandardMaterial(k, scene); m.diffuseTexture = tex(k, 1, 1, true); m.diffuseTexture.hasAlpha = true;
    m.disableLighting = true; m.emissiveColor = B.Color3.FromHexString(i < 2 ? '#c2bccb' : '#a9a5b6'); m.backFaceCulling = false; mesh.material = m;
    const buf = new Float32Array(mats[i].length * 16); mats[i].forEach((mm, j) => mm.copyToArray(buf, j * 16));
    mesh.thinInstanceSetBuffer('matrix', buf, 16, true); mesh.thinInstanceRefreshBoundingInfo(false); mesh.isPickable = false; out.meshes.push(mesh);
  });

  // ---------------------------------------------------------------- drifting motes (fireflies): one mesh, vertex-coloured pink
  const motes = [], mr = rng(21);
  for (let i = 0; i < (touch ? 60 : 110); i++) {
    const p = road[(mr() * road.length) | 0], a = mr() * 6.28, d = 1.5 + mr() * 7;
    const m = B.MeshBuilder.CreateSphere('mote', { diameter: .05 + mr() * .05, segments: 1 }, scene);
    m.position.set(p.x + Math.cos(a) * d, .4 + mr() * 3.2, p.z + Math.sin(a) * d);
    const c = mr() < .3 ? [.96, .37, .94, 1] : [1, .86, .93, 1], n = m.getTotalVertices(), col = [];
    for (let k = 0; k < n; k++) col.push(...c); m.setVerticesData('color', col); motes.push(m);
  }
  const moteMesh = B.Mesh.MergeMeshes(motes, true, true); const mm = new B.StandardMaterial('motes', scene);
  mm.disableLighting = true; mm.emissiveColor = B.Color3.White(); mm.fogEnabled = false; moteMesh.material = mm; moteMesh.isPickable = false; out.meshes.push(moteMesh);
  out.tick.push((t, reduced) => { if (reduced) return; moteMesh.position.y = Math.sin(t * .0006) * .25; moteMesh.position.x = Math.sin(t * .00023) * .6; moteMesh.position.z = Math.cos(t * .00017) * .6; });

  // ---------------------------------------------------------------- a soft halo around the moon
  const ht = canvasTexture(scene, 128, 128, g => {
    const grd = g.createRadialGradient(64, 64, 6, 64, 64, 64); grd.addColorStop(0, 'rgba(240,215,235,.42)'); grd.addColorStop(.35, 'rgba(225,200,230,.12)'); grd.addColorStop(1, 'rgba(220,200,230,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  }, { alpha: true });
  const halo = B.MeshBuilder.CreatePlane('moon halo', { size: 22 }, scene); halo.position.set(-17, 23, -37.5); halo.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
  const hm = new B.StandardMaterial('moon halo', scene); hm.disableLighting = true; hm.emissiveColor = B.Color3.White(); hm.diffuseTexture = ht; hm.useAlphaFromDiffuseTexture = true; hm.alphaMode = B.Engine.ALPHA_ADD; hm.fogEnabled = false; hm.backFaceCulling = false;
  halo.material = hm; halo.isPickable = false;

  // ---------------------------------------------------------------- the shrine at the back of the clearing, facing the road
  const sx = CLEARING.x, sz = CLEARING.z + CLEARING.r - .2;
  out.shrine = buildShrine(scene, { x: sx, z: sz, ry: Math.PI, touch });
  out.boxes.push(...out.shrine.boxes); out.tick.push(...out.shrine.tick); out.meshes.push(...out.shrine.meshes);
  out.shrineFront = { x: sx, z: sz - 1.6 };
  out.pools.push({ x: sx, z: sz - 1.3, w: 3.4, l: 2.6, color: '#ffb2de', k: .35 });

  scene.fogMode = B.Scene.FOGMODE_EXP2; scene.fogDensity = FOG.density;
  return out;
}
