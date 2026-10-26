// garments.js: hangs Opal's garments on the gallery rails, from assets/garments/garments.json.
// Each garment is a picture card hanging from a hook, swaying very slightly. Add or replace pieces by editing the
// JSON and dropping images into assets/garments/ (see the README there). The first RAIL_SLOTS.length pieces hang.
// All cards share one atlas texture and one mesh (one draw call); the sway is done by moving their corners.
import { makeAtlas } from './babylon-extras.js';
const B = window.BABYLON;

// Hook positions on the two gallery rails (rail top is at 1.7 m). Cards face into the room (+z).
export const RAIL_SLOTS = [
  [0.43, -9.35], [0.93, -9.35], [1.43, -9.35],   // west rail
  [6.19, -9.35], [6.69, -9.35], [7.19, -9.35],   // east rail
];
const HOOK_Y = 1.72, CARD_H = 1.45, MAX_W = .62;

export async function loadGarments() {
  try {
    const r = await fetch('assets/garments/garments.json?v=' + Date.now().toString(36).slice(0, 5));
    if (!r.ok) throw Error(r.status);
    const list = await r.json();
    return Array.isArray(list) ? list.filter(g => g && g.image) : [];
  } catch (e) { console.warn('garments.json could not be read', e); return []; }
}

function imageSize(url) {
  return new Promise(res => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => res(null); i.src = url; });
}

export async function hangGarments(scene, list, { reduced } = {}) {
  const hung = list.slice(0, RAIL_SLOTS.length).map(g => 'assets/garments/' + g.image);
  if (!hung.length) return { cards: [], tick: () => {} }; // nothing to hang yet: the rails stay empty
  const sizes = await Promise.all(hung.map(imageSize));
  const atlas = makeAtlas(scene, hung, { cellW: 256, cellH: 512, cols: 4, alpha: true });
  const cards = [], pos = [], uv = [], idx = [];
  hung.forEach((url, i) => {
    if (!sizes[i]) { console.warn('missing garment image', url); return; }
    const w = Math.min(MAX_W, CARD_H * sizes[i][0] / sizes[i][1]), [x, z] = RAIL_SLOTS[i];
    const [u0, v0, u1, v1] = atlas.rect(i), k = cards.length * 4;
    cards.push({ x, z: z + .015 * (i % 3 - 1), w, ph: i * 1.7 }); // tiny depth offsets so overlapping cards never flicker
    pos.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    uv.push(u0, v1, u1, v1, u1, v0, u0, v0);          // top-left, top-right, bottom-right, bottom-left
    idx.push(k, k + 2, k + 1, k, k + 3, k + 2);
  });
  if (!cards.length) return { cards, tick: () => {} };
  const mesh = new B.Mesh('garments', scene), vd = new B.VertexData();
  vd.positions = pos; vd.uvs = uv; vd.indices = idx; vd.normals = pos.map((_, j) => j % 3 === 2 ? 1 : 0); vd.applyToMesh(mesh, true);
  const m = new B.StandardMaterial('garments', scene);
  m.specularColor = B.Color3.Black(); m.emissiveColor = B.Color3.FromHexString('#3a3438'); m.backFaceCulling = false;
  mesh.material = m; mesh.isPickable = false; mesh.alwaysSelectAsActiveMesh = true; mesh.setEnabled(false);
  atlas.onReady(t => { m.diffuseTexture = t; mesh.setEnabled(true); });
  const P = new Float32Array(cards.length * 12);
  const place = (t, still) => {
    cards.forEach((c, i) => {
      const rz = still ? 0 : Math.sin(t * .0011 + c.ph) * .025, rx = still ? 0 : Math.sin(t * .0008 + c.ph * 2) * .02;
      const cz = Math.cos(rz), sz = Math.sin(rz), cx = Math.cos(rx), sx = Math.sin(rx);
      [[-c.w / 2, 0], [c.w / 2, 0], [c.w / 2, -CARD_H], [-c.w / 2, -CARD_H]].forEach(([lx, ly], j) => {
        const x1 = lx * cz - ly * sz, y1 = lx * sz + ly * cz, o = i * 12 + j * 3;
        P[o] = c.x + x1; P[o + 1] = HOOK_Y + y1 * cx; P[o + 2] = c.z + y1 * sx;
      });
    });
    mesh.updateVerticesData('position', P);
  };
  place(0, true);
  let last = 0;
  const tick = (t, red, p) => {
    if (red || reduced || (p && p.y > -2) || t - last < 33) return; // only sway when you're in the gallery
    last = t; place(t, false);
  };
  return { cards, tick };
}
