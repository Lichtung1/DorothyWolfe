// ps1.js: the PlayStation-1 look, applied to every material in the scene.
//
//  - low render resolution (PS1.lines pixels on the short side of the screen), scaled up with hard pixels
//  - point-sampled textures (no smoothing), like the PS1 had no texture filtering
//  - vertex snapping: vertices jump to a coarse screen grid, giving the famous PS1 'wobble'
//  - 15-bit colour with ordered (Bayer) dithering, the PS1's grainy gradients
//
// Toggle in game with the terminal command `ps1`. Tune the numbers below.
// This also makes the game much cheaper to draw on phones (far fewer pixels).
const B = window.BABYLON;

export const PS1 = {
  enabled: true,
  lines: 256,      // pixels on the short side of the screen (PS1 games were 224-240 lines tall)
  wobble: 0,       // vertex snapping ('PS1 wobble'): 0 = off, .5 = 2-pixel grid, 1 = every pixel. Off by default: it makes
                   // touching objects jitter apart and is disorienting. The terminal command `wobble` turns it on for fun.
  colorBits: 5,    // bits per colour channel (PS1 = 5). 8 = no banding
  dither: 1,       // 0 = no dither, 1 = PS1-style ordered dither
  sampling: 4,     // texture sampling: 4 = nearest + nearest mip (crisp), 8 = nearest + smoother mips
  warp: 0,         // affine texture warping (textures slide around as you turn). 0 = off, .3 subtle, 1 = full PS1 (seasick)
};

const VERT_DEF = '\nuniform vec4 dwPs1;\n';
const VERT_END = `
if (dwPs1.x > 0. && gl_Position.w > .5) { // snap the projected vertex to a coarse pixel grid (not vertices behind/near the camera: big floors would tear)
  vec2 g = max(dwPs1.xy, vec2(8.));
  gl_Position.xy = floor(gl_Position.xy / gl_Position.w * g + .5) / g * gl_Position.w;
}
`;
const FRAG_DEF = `
uniform vec4 dwPs1;
float dwBayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
float dwBayer4(vec2 a) { return dwBayer2(.5 * a) * .25 + dwBayer2(a); }
`;
const FRAG_END = `
if (dwPs1.z > 0.) { // quantise to PS1 colour depth, with an ordered dither pattern
  float lv = dwPs1.z;
  color.rgb += (dwBayer4(gl_FragCoord.xy) - .5) * dwPs1.w / lv;
  color.rgb = floor(color.rgb * lv + .5) / lv;
}
`;

// Affine texture mapping, the PS1 way: multiply each UV by w in the vertex shader and divide it back per pixel,
// which cancels the GPU's perspective correction. dwAff blends between correct (0) and fully affine (1).
const UVDECL = /(?:varying|out)\s+(?:highp\s+|mediump\s+|lowp\s+)?vec2\s+(v\w*UV\d?)\s*;/g;
function affineVertex(code) {
  const names = [...code.matchAll(UVDECL)].map(m => m[1]);
  if (!names.length) return code;
  const kw = /\bout\s+vec[234]\s+v/.test(code) ? 'out' : 'varying';
  code = code.replace('uniform vec4 dwPs1;', 'uniform vec4 dwPs1;\nuniform float dwAff;\n' + kw + ' float dwAffW;');
  const end = code.lastIndexOf('}');
  return code.slice(0, end) + `float dwW = mix(1., max(gl_Position.w, .1), dwAff);\ndwAffW = dwW;\n` + names.map(n => n + ' *= dwW;').join('\n') + '\n' + code.slice(end);
}
function affineFragment(code) {
  const i = code.indexOf('void main');
  if (i < 0 || !/\bv\w*UV\d?\b/.test(code.slice(i))) return code;
  const kw = /\bin\s+vec[234]\s+v/.test(code) ? 'in' : 'varying';
  const head = code.slice(0, i).replace('uniform vec4 dwPs1;', 'uniform vec4 dwPs1;\n' + kw + ' float dwAffW;');
  return head + code.slice(i).replace(/\b(v[A-Za-z]*UV\d?)\b/g, '($1/dwAffW)');
}

export function installPS1(scene, engine) {
  const state = { snap: [0, 0] };
  const hook = (m) => {
    if (!m || m.getClassName?.() !== 'StandardMaterial' || m._dwPs1) return;
    m._dwPs1 = true;
    const prev = m.customShaderNameResolve;
    m.customShaderNameResolve = (name, uniforms, ubos, samplers, defines, attribs, opts) => {
      if (!uniforms.includes('dwPs1')) uniforms.push('dwPs1', 'dwAff');
      if (opts) {
        const before = opts.processFinalCode;
        opts.processFinalCode = (type, code) => {
          if (before) code = before(type, code);
          if (type === 'vertex') return affineVertex(code.replace('#define CUSTOM_VERTEX_DEFINITIONS', VERT_DEF).replace('#define CUSTOM_VERTEX_MAIN_END', VERT_END));
          return affineFragment(code.replace('#define CUSTOM_FRAGMENT_DEFINITIONS', FRAG_DEF).replace('#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR', FRAG_END));
        };
      }
      return prev ? prev(name, uniforms, ubos, samplers, defines, attribs, opts) : name;
    };
    m.onBindObservable.add(() => {
      const e = m.getEffect(); if (!e) return;
      const on = PS1.enabled, lv = Math.pow(2, PS1.colorBits) - 1;
      e.setFloat('dwAff', on ? PS1.warp : 0);
      e.setFloat4('dwPs1', on && PS1.wobble > 0 ? state.snap[0] : 0, on ? state.snap[1] : 0, on && PS1.colorBits < 8 ? lv : 0, PS1.dither);
    });
  };
  for (const m of scene.materials) hook(m);
  scene.onNewMaterialAddedObservable.add(hook);
  const tex = (t) => {
    if (!t || !t.updateSamplingMode || t._dwKeep || t.getClassName?.() === 'MirrorTexture') return;
    if (t._dwOrig === undefined) t._dwOrig = t.samplingMode;
    const want = PS1.enabled ? (t._dwOrig === 1 ? 1 : PS1.sampling) : t._dwOrig;
    if (t.samplingMode !== want) t.updateSamplingMode(want);
  };
  scene.onNewTextureAddedObservable?.add(tex);
  return {
    // call after a resize with the new render size
    setRenderSize(w, h) { const k = Math.max(.05, PS1.wobble); state.snap = [w / 2 * k, h / 2 * k]; },
    refreshTextures() { for (const t of scene.textures) tex(t); },
  };
}

// Render size for a screen of the given aspect ratio.
export function ps1Size(aspect) {
  const L = PS1.lines;
  return aspect >= 1 ? [Math.round(L * aspect), L] : [L, Math.round(L / aspect)];
}
