// garments.js: hangs Opal's garments on the gallery rails, from assets/garments/garments.json.
// Each garment is a picture card hanging from a hook, swaying very slightly. Add or replace pieces by editing the
// JSON and dropping images into assets/garments/ (see the README there). The first RAIL_SLOTS.length pieces hang.
import { Texture } from './babylon-extras.js';
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
  const cards = [];
  for (let i = 0; i < Math.min(list.length, RAIL_SLOTS.length); i++) {
    const g = list[i], url = 'assets/garments/' + g.image, size = await imageSize(url);
    if (!size) { console.warn('missing garment image', url); continue; }
    const w = Math.min(MAX_W, CARD_H * size[0] / size[1]);
    const card = B.MeshBuilder.CreatePlane('garment ' + (g.name || i), { width: w, height: CARD_H }, scene);
    card.bakeTransformIntoVertices(B.Matrix.Translation(0, -CARD_H / 2, 0)); // pivot at the hook
    const [x, z] = RAIL_SLOTS[i];
    card.position.set(x, HOOK_Y, z + .015 * (i % 3 - 1)); // tiny depth offsets so overlapping cards never flicker
    card.rotation.y = Math.PI;
    const m = new B.StandardMaterial('garment ' + i, scene);
    m.diffuseTexture = new Texture(url, scene, false, true); m.diffuseTexture.hasAlpha = /\.png$/i.test(g.image);
    m.specularColor = B.Color3.Black(); m.emissiveColor = B.Color3.FromHexString('#3a3438'); m.backFaceCulling = false;
    card.material = m; card.isPickable = false;
    cards.push({ card, ph: i * 1.7 });
  }
  const tick = (t, red, p) => {
    if (red || reduced || !cards.length || (p && p.y > -2)) return; // only sway when you're in the gallery
    for (const c of cards) { c.card.rotation.z = Math.sin(t * .0011 + c.ph) * .025; c.card.rotation.x = Math.sin(t * .0008 + c.ph * 2) * .02; }
  };
  return { cards, tick };
}
