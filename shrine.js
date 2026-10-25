// shrine.js: a little Russian wayside shrine at the end of the road, with a veiled statue,
// and the offerings visitors leave (candles, flowers, threads, notes). Offerings are remembered in the
// visitor's own browser (app.js stores them); this file only draws them.
//
// Real models: set SHRINE.chapelModel / SHRINE.statueModel to .glb files in assets/models/
// (origin = floor centre of the shrine, front facing -Y in Blender). Offerings and flames stay code-driven.
import { Kit, PAL, loadModel } from './decor.js?v=dw-20261024j';
import { Texture } from './babylon-extras.js';
const B = window.BABYLON;
const PI = Math.PI;

export const SHRINE = { chapelModel: '', statueModel: '' };
export const MAX_SHOWN = 16; // per offering type

function newKit(scene, prop) {
  const out = { flames: [], fires: [], screens: [], tapestries: [], canopies: [], curtains: [], photos: [], nodes: [] };
  return { k: new Kit(scene, prop, out), out };
}
function bake(scene, kit, name, mat) {
  if (!kit.parts.length) { kit.node.dispose(); return null; }
  const m = B.Mesh.MergeMeshes(kit.parts, true, true, undefined, false, false);
  kit.node.dispose(); m.name = name; m.material = mat; m.isPickable = false; m.freezeWorldMatrix(); return m;
}

function chapel(k) {
  const stone = '#7d7a86', white = '#e6e1e8', roof = '#25222a';
  k.box(1.6, .45, 1.2, stone, { p: [0, .225, 0] });
  k.box(1.4, .14, .45, '#8c8996', { p: [0, .07, .8] });                 // offering step
  k.box(1.4, 1.9, .14, white, { p: [0, 1.4, -.53] });
  k.box(1.12, 1.6, .02, '#2e2a33', { p: [0, 1.3, -.45] });              // shadowy niche back
  for (const x of [-.63, .63]) k.box(.14, 1.9, 1.0, white, { p: [x, 1.4, -.03] });
  k.box(1.46, .18, .16, PAL.chrome, { p: [0, 2.3, .44] });              // lintel
  for (const s of [-1, 1]) {
    k.box(1.02, .08, 1.3, roof, { p: [s * .37, 2.62, -.03], r: [0, 0, -s * .6] });
    k.box(1.04, .03, 1.32, PAL.silver, { p: [s * .39, 2.58, -.03], r: [0, 0, -s * .6] });
  }
  k.cyl(.22, .24, .2, white, { p: [0, 3.02, -.03] }, 10);               // drum
  k.sph(.36, PAL.pink, { p: [0, 3.25, -.03], s: [1, 1.15, 1] }, 10);     // little onion dome
  k.cyl(0, .1, .22, PAL.chrome, { p: [0, 3.5, -.03] }, 8);
  k.sph(.05, PAL.chrome, { p: [0, 3.62, -.03] }, 5);
  // ribbon rail to the right, where threads get tied
  for (const x of [1.25, 2.25]) k.cyl(.07, .08, 1.05, '#3a3034', { p: [x, .525, .2] }, 6);
  k.cyl(.04, .04, 1.1, '#3a3034', { p: [1.75, .95, .2], r: [0, 0, PI / 2] }, 6);
  // hanging icon lamp (lampada)
  k.cyl(.006, .006, .45, PAL.chrome, { p: [0, 2.02, .25] }, 4);
  k.cyl(.1, .06, .08, PAL.pink, { p: [0, 1.76, .25] }, 8);
  k.flame(0, 1.82, .25, .8);
  // permanent candles + flowers so the shrine looks tended even before anyone visits
  for (const [x, h] of [[-.55, .22], [-.42, .16], [.5, .2]]) { k.cyl(.05, .05, h, PAL.ivory, { p: [x, .14 + h / 2, .8] }, 8); k.flame(x, .14 + h + .03, .8, 1); }
}
function statue(k) {
  const stone = '#efecf2', veil = '#dcdae6';
  k.cyl(.38, .42, .1, '#cfccd8', { p: [0, .5, -.12] }, 12);
  k.cyl(.26, .5, 1.05, stone, { p: [0, 1.075, -.12] }, 14);              // robe
  k.cyl(.3, .58, .85, veil, { p: [0, 1.12, -.16] }, 14);                 // mantle
  k.sph(.38, veil, { p: [0, 1.58, -.14], s: [1, .5, .8] }, 10);          // shoulders
  k.sph(.2, stone, { p: [0, 1.76, -.08] }, 10);                          // face
  k.sph(.28, veil, { p: [0, 1.79, -.13], s: [1, 1.1, 1] }, 10);          // veil over the head
  for (const x of [-.03, .03]) k.sph(.075, stone, { p: [x, 1.33, .1] }, 6); // hands together
  k.cyl(.02, .3, .03, PAL.hot, { p: [0, .565, .02], r: [PI / 2, 0, 0], s: [1, 1, .4] }, 12); // crescent-ish hem accent
}

export function buildShrine(scene, { x, z, ry, touch } = {}) {
  const res = { boxes: [], tick: [], meshes: [] };
  const vc = new B.StandardMaterial('shrine stone', scene); vc.specularColor = new B.Color3(.05, .05, .06); vc.emissiveColor = B.Color3.FromHexString('#1e1a22');
  const prop = { id: 'shrine', x, z, ry };
  const base = newKit(scene, prop);
  if (SHRINE.chapelModel) { loadModel(scene, { ...prop, model: SHRINE.chapelModel }); base.k.ghost = true; }
  chapel(base.k);
  const permanentFlames = base.out.flames.slice();
  const m1 = bake(scene, base.k, 'shrine', vc); if (m1) res.meshes.push(m1);
  // a panel of star-and-cross lace hanging in the niche behind the statue
  const lp = B.MeshBuilder.CreatePlane('shrine lace', { width: 1.06, height: 1.54 }, scene);
  const [lx, lz] = rot(0, -.425, ry); lp.position.set(x + lx, 1.3, z + lz); lp.rotation.y = ry + PI;
  const lm = new B.StandardMaterial('shrine lace', scene); lm.diffuseTexture = new Texture('assets/textures/lace-shrine.png', scene, false, true);
  lm.diffuseTexture.hasAlpha = true; lm.diffuseTexture.uScale = .5; lm.diffuseTexture.vScale = .73; lm.disableLighting = true; lm.emissiveColor = B.Color3.FromHexString('#d8d2de');
  lm.zOffset = -1; lp.material = lm; lp.isPickable = false; lp.freezeWorldMatrix(); res.meshes.push(lp);
  if (SHRINE.statueModel) loadModel(scene, { ...prop, id: 'shrine_statue', model: SHRINE.statueModel });
  else { const st = newKit(scene, prop); statue(st.k); const m2 = bake(scene, st.k, 'shrine statue', vc); if (m2) res.meshes.push(m2); }
  // halo: a softly glowing ring behind the statue's head
  const halo = B.MeshBuilder.CreateTorus('halo', { diameter: .46, thickness: .025, tessellation: 24 }, scene);
  const [hx, hz] = rot(0, -.24, ry); halo.position.set(x + hx, 1.82, z + hz); halo.rotation.set(PI / 2, ry, 0);
  const hm = new B.StandardMaterial('halo', scene); hm.disableLighting = true; hm.emissiveColor = B.Color3.FromHexString('#ffe6f4'); halo.material = hm; halo.isPickable = false;
  res.tick.push((t, reduced) => { if (!reduced) { const f = .85 + Math.sin(t * .0015) * .15; hm.emissiveColor.set(f, f * .9, f * .96); } });
  // collision: the shrine body + the rail
  for (const [x0, z0, x1, z1, h] of [[-.85, -.65, .85, 1.05, 3.6], [1.15, .1, 2.35, .3, 1.1]]) {
    const xs = [], zs = [];
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) { const [dx, dz] = rot(px, pz, ry); xs.push(x + dx); zs.push(z + dz); }
    res.boxes.push({ name: 'prop_shrine', bounds: [Math.min(...xs), -Math.max(...zs), 0, Math.max(...xs), -Math.min(...zs), h] });
  }
  // flames share one flickering material; offerings are rebuilt whenever someone leaves something
  const fm = new B.StandardMaterial('shrine flame', scene); fm.disableLighting = true; fm.emissiveColor = B.Color3.FromHexString('#ffe6f3');
  res.tick.push((t, reduced) => { if (reduced) return; const f = .86 + Math.sin(t * .011) * .06 + Math.sin(t * .029) * .05; fm.emissiveColor.set(f, f * .86, f * .94); });
  let built = [];
  res.setOfferings = (st = {}) => {
    for (const m of built) m.dispose(); built = [];
    const o = newKit(scene, prop), k = o.k, n = t => Math.min(MAX_SHOWN, st[t] || 0);
    let r = 5; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < n('candle'); i++) { // step first, then the ground in front
      const row = i < 8 ? 0 : 1, j = row ? i - 8 : i, cx = -.6 + (j % 8) * .17 + (row ? .08 : 0), cz = row ? 1.2 + (j % 2) * .12 : .8, y0 = row ? 0 : .14, h = .1 + rnd() * .14;
      if (!row && Math.abs(cx) > .35 && Math.abs(cx) < .6 && i < 3) continue;
      k.cyl(.045, .045, h, rnd() < .25 ? PAL.pink : PAL.ivory, { p: [cx, y0 + h / 2, cz] }, 8); k.flame(cx, y0 + h + .03, cz, .9);
    }
    for (let i = 0; i < n('flower'); i++) {
      const fx = -.85 + rnd() * 1.7, fz = 1.05 + rnd() * .5, a = rnd() * 6.28, c = [PAL.pink, PAL.pale, PAL.hot, PAL.midpink][(rnd() * 4) | 0];
      k.cyl(.012, .012, .32, '#5c6a5e', { p: [fx, .03, fz], r: [PI / 2 - .1, a, 0] }, 4);
      k.sph(.08, c, { p: [fx + Math.cos(a) * .17, .05, fz - Math.sin(a) * .17], s: [1, .7, 1] }, 6);
    }
    for (let i = 0; i < n('thread'); i++) {
      const tx = 1.3 + (i % 8) * .12 + (i >= 8 ? .06 : 0), L = .25 + rnd() * .45, c = [PAL.hot, PAL.pink, PAL.pale, PAL.silver, PAL.black][(rnd() * 5) | 0];
      k.box(.025, L, .006, c, { p: [tx, .95 - L / 2, .2 + (i >= 8 ? .03 : -.03)], r: [0, 0, (rnd() - .5) * .25] });
      k.tor(.045, .012, c, { p: [tx, .95, .2], r: [0, 0, PI / 2] }, 8);
    }
    const notes = Math.min(MAX_SHOWN, (st.notes || []).length);
    for (let i = 0; i < notes; i++) {
      const side = i % 2 ? 1 : -1, ny = 1.0 + ((i >> 1) % 4) * .24, nz = .32 - ((i >> 3) % 2) * .3;
      k.box(.006, .11, .08, '#fbf7f2', { p: [side * .705, ny, nz], r: [(rnd() - .5) * .3, 0, 0] });
    }
    const m = bake(scene, k, 'offerings', vc); if (m) built.push(m);
    const fl = permanentFlames.concat(o.out.flames).map(([fx, fy, fz, s]) => { const f = B.MeshBuilder.CreateSphere('flame', { diameter: .035 * s, segments: 3 }, scene); f.position.set(fx, fy, fz); f.scaling.y = 2; return f; });
    const flames = B.Mesh.MergeMeshes(fl, true, true); flames.material = fm; flames.isPickable = false; built.push(flames);
  };
  res.setOfferings({});
  return res;
}
function rot(x, z, ry) { const c = Math.cos(ry), s = Math.sin(ry); return [x * c + z * s, -x * s + z * c]; }
