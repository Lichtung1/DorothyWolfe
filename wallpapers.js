// Wallpaper per room.
// The GLB keeps a single floral wall material. At load time every wall face is cut at the room
// boundaries below and re-papered according to the room it faces, so a new Blender export
// works without changes as long as the wall material name still contains "floral".
//
// To change a room's paper, edit PAPERS. null = keep the original paper baked into the GLB.

export const PAPERS = {
  vestibule: null,                                   // original rose lattice: the first thing visitors see
  passage:   'assets/wallpapers/pink-damask.jpg',    // the hallway loop: a quiet cousin of the original
  courtyard: 'assets/wallpapers/heart-damask.jpg',   // under the stars: the heart of the apartment
  textile:   'assets/wallpapers/ivory-cross-stitch.jpg', // cross-stitch as pixels, beside the wardrobe
  atelier:   'assets/wallpapers/blue-cross-stitch.jpg',  // the computer room: CRT blue in thread
  archive:   'assets/wallpapers/plum-tulips.jpg',    // darker and bookish for the library
  fitting:   'assets/wallpapers/rose-floral.jpg',    // big romantic blooms around the mirror
  gallery:   'assets/wallpapers/sage-fern.jpg',      // a garden-room gallery with the potted plants
  bedroom:   null,                                   // the hidden bedroom behind the secret wall: original rose lattice, echoing the entrance
};
// Spare paper, not currently used: assets/wallpapers/pink-stripe.jpg

// Room of a point on the floor plan, in Babylon world coordinates (x, z).
// Same boundaries as the room names shown in the corner of the screen.
export function roomAt(x, z) {
  if (z > 5.8) return 'vestibule';
  if (z < -5.8) return x < -1.97 ? 'bedroom' : 'gallery'; // the hidden bedroom: west of its partition wall
  if (x < -5.3) return z < -1.6 ? 'textile' : 'atelier';
  if (x > 5.3) return z < -0.1 ? 'archive' : 'fitting';
  if (Math.abs(x) < 3.1 && Math.abs(z) < 3.6) return 'courtyard';
  return 'passage';
}
// Lines where one room's paper meets another's; wall faces are cut along these.
const CUT_X = [-5.3, -3.1, -2.2, -1.97, 2.2, 3.1, 5.3];
const CUT_Z = [-5.8, -3.6, -1.6, -0.1, 3.6, 5.8];
const PROBE = 0.3; // how far in front of a wall face we look to decide which room it faces

// Split a polygon (array of {p:[x,y,z], n:[..], uv:[u,v]}) by the plane axis=value.
function split(poly, axis, value) {
  const a = [], b = [];
  for (let i = 0; i < poly.length; i++) {
    const v = poly[i], w = poly[(i + 1) % poly.length];
    const dv = v.p[axis] - value, dw = w.p[axis] - value;
    (dv <= 0 ? a : b).push(v);
    if ((dv < 0 && dw > 0) || (dv > 0 && dw < 0)) {
      const t = dv / (dv - dw), mix = (x, y) => x.map((k, j) => k + (y[j] - k) * t);
      const c = { p: mix(v.p, w.p), n: v.n, uv: mix(v.uv, w.uv) };
      a.push(c); b.push(c);
    }
  }
  return [a, b].filter(q => q.length >= 3);
}

// Rebuild the wall meshes as one mesh per room. Returns { materials, ready }.
export function paperWalls(B, scene, walls, baseMaterial) {
  const buckets = new Map();
  for (const mesh of walls) {
    const pos = mesh.getVerticesData('position'), nor = mesh.getVerticesData('normal'),
      uv = mesh.getVerticesData('uv'), idx = mesh.getIndices();
    if (!pos || !nor || !uv || !idx) continue;
    const m = mesh.computeWorldMatrix(true), vert = i => {
      const p = B.Vector3.TransformCoordinates(new B.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]), m);
      const n = B.Vector3.TransformNormal(new B.Vector3(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2]), m).normalize();
      return { p: [p.x, p.y, p.z], n: [n.x, n.y, n.z], uv: [uv[i * 2], uv[i * 2 + 1]] };
    };
    for (let t = 0; t < idx.length; t += 3) {
      let pieces = [[vert(idx[t]), vert(idx[t + 1]), vert(idx[t + 2])]];
      for (const x of CUT_X) pieces = pieces.flatMap(q => split(q, 0, x));
      for (const z of CUT_Z) pieces = pieces.flatMap(q => split(q, 2, z));
      for (const q of pieces) {
        const c = [0, 2].map(k => q.reduce((s, v) => s + v.p[k], 0) / q.length), n = q[0].n;
        const room = roomAt(c[0] + n[0] * PROBE, c[1] + n[2] * PROBE);
        if (!buckets.has(room)) buckets.set(room, { p: [], n: [], uv: [], i: [] });
        const bk = buckets.get(room), base = bk.p.length / 3;
        for (const v of q) { bk.p.push(...v.p); bk.n.push(...v.n); bk.uv.push(...v.uv); }
        for (let k = 1; k < q.length - 1; k++) bk.i.push(base, base + k, base + k + 1);
      }
    }
    mesh.dispose();
  }
  const materials = [], loads = [];
  for (const [room, bk] of buckets) {
    const mesh = new B.Mesh('wallpaper_' + room, scene), vd = new B.VertexData();
    vd.positions = bk.p; vd.normals = bk.n; vd.uvs = bk.uv; vd.indices = bk.i; vd.applyToMesh(mesh);
    let mat = baseMaterial;
    const url = PAPERS[room];
    if (url && baseMaterial.diffuseTexture) {
      mat = baseMaterial.clone('wallpaper ' + room);
      loads.push(new Promise(done => {
        // This trimmed engine build doesn't expose Texture, so borrow the class from the GLB's own wall texture.
        const Tex = baseMaterial.diffuseTexture.constructor;
        const tex = new Tex(url, scene, false, false, 3, done, () => { console.warn('wallpaper missing', url); done(); });
        tex.anisotropicFilteringLevel = 2; mat.diffuseTexture = tex;
      }));
    }
    mesh.material = mat; mesh.layerMask = 1; mesh.isPickable = false; mesh.freezeWorldMatrix(); mesh.doNotSyncBoundingInfo = true;
    if (!materials.includes(mat)) materials.push(mat);
  }
  return { materials, ready: Promise.all(loads) };
}

// The hidden wall in the textile room wears the textile room's paper so it stays hidden.
export function paperFor(room, scene, like) {
  const url = PAPERS[room];
  return url && like ? new like.constructor(url, scene, false, false, 3) : null;
}
