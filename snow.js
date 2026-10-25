// snow.js: gentle snow on the road and at the shrine (outside only). Flakes always face you, drift a little,
// and stay put in the world as you walk (they wrap around you in a box, so a few hundred flakes look endless).
// One mesh, one draw call. Terminal command `snow` toggles it (remembered in the browser).
const B = window.BABYLON;

export const SNOW = {
  enabled: true,
  flakes: 420,        // phones get 60%
  box: 14,            // metres around you that flakes fill (fog hides the edge)
  height: 7,          // fall height
  speed: .55,         // metres per second
  size: .035,
};

export function buildSnow(scene, { touch } = {}) {
  try { const v = localStorage.getItem('dw-snow'); if (v) SNOW.enabled = v === '1'; } catch {}
  const n = Math.round(SNOW.flakes * (touch ? .6 : 1)), S = SNOW.box, Hh = SNOW.height;
  const seed = []; let r = 7; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < n; i++) seed.push([rnd() * S, rnd() * Hh, rnd() * S, .7 + rnd() * .6, rnd() * 6.28, .7 + rnd() * .6]);
  const pos = new Float32Array(n * 12), col = [], idx = [];
  for (let i = 0; i < n; i++) {
    const c = i % 9 === 0 ? [1, .86, .95, 1] : [1, 1, 1, 1];
    for (let k = 0; k < 4; k++) col.push(...c);
    const o = i * 4; idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const mesh = new B.Mesh('snow', scene), vd = new B.VertexData();
  vd.positions = Array.from(pos); vd.colors = col; vd.indices = idx; vd.applyToMesh(mesh, true);
  const m = new B.StandardMaterial('snow', scene); m.disableLighting = true; m.emissiveColor = new B.Color3(.95, .93, .97); m.backFaceCulling = false;
  mesh.material = m; mesh.isPickable = false; mesh.alwaysSelectAsActiveMesh = true; mesh.setEnabled(false);
  const mod = (a, b) => ((a % b) + b) % b;
  let last = -1e9;
  const tick = (t, reduced, p) => {
    const show = SNOW.enabled && p && p.y > 9.6;
    if (mesh.isEnabled() !== !!show) mesh.setEnabled(!!show);
    if (!show || t - last < 33) return; last = t;
    const s = t / 1000, rx = -Math.sin(p.a), rz = Math.cos(p.a);
    for (let i = 0; i < n; i++) {
      const [bx, by, bz, v, ph, sz] = seed[i];
      const fall = reduced ? 0 : s * SNOW.speed * v, sway = reduced ? 0 : Math.sin(s * .6 + ph) * .35;
      const x = p.x + mod(bx + sway + s * .08 - p.x + S / 2, S) - S / 2;
      const z = p.y + mod(bz + Math.cos(s * .45 + ph) * .25 - p.y + S / 2, S) - S / 2;
      const y = mod(by - fall, Hh) + .05, near = Math.hypot(x - p.x, z - p.y), h = near < 1.3 ? 0 : SNOW.size * sz; // no giant flakes in your face
      const o = i * 12;
      pos[o] = x - rx * h; pos[o + 1] = y - h; pos[o + 2] = z - rz * h;
      pos[o + 3] = x + rx * h; pos[o + 4] = y - h; pos[o + 5] = z + rz * h;
      pos[o + 6] = x + rx * h; pos[o + 7] = y + h; pos[o + 8] = z + rz * h;
      pos[o + 9] = x - rx * h; pos[o + 10] = y + h; pos[o + 11] = z - rz * h;
    }
    mesh.updateVerticesData('position', pos);
  };
  const toggle = () => { SNOW.enabled = !SNOW.enabled; try { localStorage.setItem('dw-snow', SNOW.enabled ? '1' : '0'); } catch {} return SNOW.enabled; };
  return { mesh, tick, toggle };
}
