"""One-off tool: bake per-room wallpapers into apartment.glb.

Each wall object keeps its name and position. Its faces are cut where rooms meet and
given one material per room ("Wallpaper / archive / plum tulips" etc.), so in Blender
every wall shows the right paper and can be re-assigned with ordinary material slots.

Usage:  python3 tools/paper_glb.py assets/apartment.glb assets/apartment.glb
Needs:  pip install pygltflib numpy
You only need this again if you start from a GLB without the wallpaper materials.
"""
import sys, struct
import numpy as np
from pygltflib import GLTF2, Material, PbrMetallicRoughness, TextureInfo, Texture, Image, BufferView, Accessor, Primitive, Attributes

ROSE = 'Faded floral paper / packed'          # the original rose lattice already in the GLB
PAPERS = {                                    # room -> (label, jpeg file) ; None = original rose lattice
    'vestibule': None,
    'bedroom':   None,
    'passage':   ('pink damask',         'assets/wallpapers/pink-damask.jpg'),
    'courtyard': ('heart damask',        'assets/wallpapers/heart-damask.jpg'),
    'textile':   ('ivory cross-stitch',  'assets/wallpapers/ivory-cross-stitch.jpg'),
    'atelier':   ('blue cross-stitch',   'assets/wallpapers/blue-cross-stitch.jpg'),
    'archive':   ('plum tulips',         'assets/wallpapers/plum-tulips.jpg'),
    'fitting':   ('rose floral',         'assets/wallpapers/rose-floral.jpg'),
    'gallery':   ('sage fern',           'assets/wallpapers/sage-fern.jpg'),
}
SECRET_WALL_ROOM = 'textile'  # the hidden wall wears the textile room's paper so it stays hidden

def room_at(x, z):  # Babylon/glTF world coords (x, z)
    if z > 5.8: return 'vestibule'
    if z < -5.8: return 'bedroom' if x < -1.97 else 'gallery'
    if x < -5.3: return 'textile' if z < -1.6 else 'atelier'
    if x > 5.3: return 'archive' if z < -0.1 else 'fitting'
    if abs(x) < 3.1 and abs(z) < 3.6: return 'courtyard'
    return 'passage'
CUT_X = [-5.3, -3.1, -2.2, -1.97, 2.2, 3.1, 5.3]
CUT_Z = [-5.8, -3.6, -1.6, -0.1, 3.6, 5.8]
PROBE = 0.3

def split(poly, axis, value):
    a, b = [], []
    for i, v in enumerate(poly):
        w = poly[(i + 1) % len(poly)]
        dv, dw = v[0][axis] - value, w[0][axis] - value
        (a if dv <= 0 else b).append(v)
        if (dv < 0 < dw) or (dw < 0 < dv):
            t = dv / (dv - dw)
            c = (v[0] + (w[0] - v[0]) * t, v[1], v[2] + (w[2] - v[2]) * t)
            a.append(c); b.append(c)
    return [q for q in (a, b) if len(q) >= 3]

def main(src, dst):
    g = GLTF2().load(src)
    blob = bytearray(g.binary_blob())
    def read(acc_i):
        acc = g.accessors[acc_i]; bv = g.bufferViews[acc.bufferView]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[acc.type]
        dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}[acc.componentType]
        off = (bv.byteOffset or 0) + (acc.byteOffset or 0)
        stride = bv.byteStride or n * np.dtype(dt).itemsize
        raw = np.frombuffer(bytes(blob[off: off + stride * acc.count]), dtype=np.uint8).reshape(acc.count, stride)
        return raw[:, : n * np.dtype(dt).itemsize].copy().view(dt).reshape(acc.count, n) if n > 1 else raw[:, : np.dtype(dt).itemsize].copy().view(dt).reshape(acc.count)
    def add_view(data, target=None):
        while len(blob) % 4: blob.append(0)
        g.bufferViews.append(BufferView(buffer=0, byteOffset=len(blob), byteLength=len(data), target=target))
        blob.extend(data); return len(g.bufferViews) - 1
    def add_acc(arr, typ, comp, target):
        v = add_view(arr.tobytes(), target)
        kw = {}
        if typ == 'VEC3' and comp == 5126: kw = dict(min=arr.min(0).tolist(), max=arr.max(0).tolist())
        g.accessors.append(Accessor(bufferView=v, componentType=comp, count=len(arr), type=typ, **kw))
        return len(g.accessors) - 1

    rose_i = next(i for i, m in enumerate(g.materials) if m.name == ROSE)
    rose = g.materials[rose_i]
    sampler = g.textures[rose.pbrMetallicRoughness.baseColorTexture.index].sampler
    mat_for = {}
    for room, paper in PAPERS.items():
        if paper is None: mat_for[room] = rose_i; continue
        label, path = paper
        existing = next((i for i, m in enumerate(g.materials) if m.name == f'Wallpaper / {room} / {label}'), None)
        if existing is not None: mat_for[room] = existing; continue
        img_view = add_view(open(path, 'rb').read())
        g.images.append(Image(bufferView=img_view, mimeType='image/jpeg', name='wallpaper-' + label.replace(' ', '-')))
        g.textures.append(Texture(sampler=sampler, source=len(g.images) - 1))
        g.materials.append(Material(name=f'Wallpaper / {room} / {label}', doubleSided=rose.doubleSided, alphaMode='OPAQUE',
            pbrMetallicRoughness=PbrMetallicRoughness(baseColorFactor=list(rose.pbrMetallicRoughness.baseColorFactor or [1, 1, 1, 1]),
                metallicFactor=rose.pbrMetallicRoughness.metallicFactor, roughnessFactor=rose.pbrMetallicRoughness.roughnessFactor,
                baseColorTexture=TextureInfo(index=len(g.textures) - 1, texCoord=0))))
        mat_for[room] = len(g.materials) - 1
    paper_mats = set(mat_for.values())

    changed = 0
    for node in g.nodes:
        if node.mesh is None: continue
        mesh = g.meshes[node.mesh]
        if not all(p.material in paper_mats for p in mesh.primitives): continue
        if node.name == 'secret_wall':
            for p in mesh.primitives: p.material = mat_for[SECRET_WALL_ROOM]
            continue
        t = np.array(node.translation or [0, 0, 0], dtype=np.float64)
        buckets = {}
        for prim in mesh.primitives:
            P, N, U = read(prim.attributes.POSITION).astype(np.float64), read(prim.attributes.NORMAL).astype(np.float64), read(prim.attributes.TEXCOORD_0).astype(np.float64)
            I = read(prim.indices).astype(np.int64)
            for k in range(0, len(I), 3):
                pieces = [[(P[j] + t, N[j], U[j]) for j in I[k:k + 3]]]
                for x in CUT_X: pieces = [q for p in pieces for q in split(p, 0, x)]
                for z in CUT_Z: pieces = [q for p in pieces for q in split(p, 2, z)]
                for q in pieces:
                    area = sum(np.linalg.norm(np.cross(q[j][0] - q[0][0], q[j + 1][0] - q[0][0])) for j in range(1, len(q) - 1))
                    if area < 1e-8: continue  # sliver left by a cut landing exactly on an edge
                    c = np.mean([v[0] for v in q], axis=0); n = q[0][1]
                    room = room_at(c[0] + n[0] * PROBE, c[2] + n[2] * PROBE)
                    b = buckets.setdefault(mat_for[room], ([], [], [], []))
                    base = len(b[0])
                    for v in q: b[0].append(v[0] - t); b[1].append(v[1]); b[2].append(v[2])
                    for j in range(1, len(q) - 1): b[3].extend([base, base + j, base + j + 1])
        prims = []
        for mat in sorted(buckets):
            pos, nor, uv, idx = buckets[mat]
            # weld identical vertices so Blender gets clean faces
            key = {}; remap = []; P2 = []; N2 = []; U2 = []
            for p_, n_, u_ in zip(pos, nor, uv):
                k = (tuple(np.round(p_, 5)), tuple(np.round(n_, 4)), tuple(np.round(u_, 5)))
                if k not in key: key[k] = len(P2); P2.append(p_); N2.append(n_); U2.append(u_)
                remap.append(key[k])
            tris = []
            for k in range(0, len(idx), 3):
                a_, b_, c_ = (remap[i] for i in idx[k:k + 3])
                if len({a_, b_, c_}) < 3: continue
                if np.linalg.norm(np.cross(np.array(P2[b_]) - P2[a_], np.array(P2[c_]) - P2[a_])) < 1e-9: continue
                tris += [a_, b_, c_]
            idx = np.array(tris, dtype=np.uint32)
            prims.append(Primitive(material=mat, mode=4,
                attributes=Attributes(POSITION=add_acc(np.array(P2, np.float32), 'VEC3', 5126, 34962),
                                      NORMAL=add_acc(np.array(N2, np.float32), 'VEC3', 5126, 34962),
                                      TEXCOORD_0=add_acc(np.array(U2, np.float32), 'VEC2', 5126, 34962)),
                indices=add_acc(idx, 'SCALAR', 5125, 34963)))
        mesh.primitives = prims; changed += 1
    g.buffers[0].byteLength = len(blob)
    g.set_binary_blob(bytes(blob))
    g.save_binary(dst)
    print(f'papered {changed} wall objects; materials:', sorted({g.materials[m].name for m in paper_mats}))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
