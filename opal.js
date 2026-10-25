// opal.js: opalescent stained glass. Milky glass that shifts between pale pink, silver-blue and white as you move
// past it (it uses the angle you're looking from), with a soft sparkle. Works on any baked or painted glass texture:
// dark lead lines stay dark, light glass shimmers. Costs almost nothing (a few lines in the glass's shader).
const B = window.BABYLON;

export const OPAL = {
  strength: .45,   // 0 = plain glass, 1 = very milky and shifty
  speed: .25,      // slow drift over time, even when you stand still
  sparkle: .18,    // brief bright glints
};

const DEFS = `
uniform vec4 dwOpal;
vec3 dwOpalTint(float t) {
  vec3 pink = vec3(1., .80, .92), ice = vec3(.82, .90, 1.), milk = vec3(1., .98, 1.);
  float a = .5 + .5 * sin(t), b = .5 + .5 * sin(t * 1.7 + 2.1);
  return mix(mix(pink, ice, a), milk, b * .45);
}
`;
const APPLY = `
{
  vec3 dwV = normalize(vEyePosition.xyz - vPositionW);
  float dwT = dot(dwV, vec3(3.1, 2.4, 2.9)) * 2.2 + dot(vPositionW.xz, vec2(1.3, 1.7)) + dwOpal.w * dwOpal.y;
  float dwL = dot(color.rgb, vec3(.3, .59, .11));
  vec3 dwTint = dwOpalTint(dwT);
  float dwGlint = pow(max(0., sin(dwT * 2.3 + vPositionW.y * 9.)), 16.) * dwOpal.z;
  color.rgb = mix(color.rgb, color.rgb * dwTint * 1.06 + (dwTint - .8) * .25, dwOpal.x * smoothstep(.2, .6, dwL)) + dwGlint * smoothstep(.3, .7, dwL);
}
`;

let registered = false;
function register(scene) {
  if (registered) return true;
  const withEffect = scene.materials.find(m => m.getEffect && m.getEffect());
  const store = withEffect?.getEffect().constructor.ShadersStore;
  if (!store || !store.defaultVertexShader) return false;
  store.dwopalVertexShader = store.defaultVertexShader; store.dwopalPixelShader = store.defaultPixelShader;
  return (registered = true);
}

// Call once the scene has rendered at least one frame (the shader library has to be loaded).
export function makeOpal(scene, materials) {
  if (!register(scene)) return false;
  for (const m of materials) {
    if (!m || m._dwOpal) continue;
    m._dwOpal = true;
    const prev = m.customShaderNameResolve;
    m.customShaderNameResolve = (name, uniforms, ubos, samplers, defines, attribs, opts) => {
      if (!uniforms.includes('dwOpal')) uniforms.push('dwOpal');
      if (opts) {
        const before = opts.processFinalCode;
        opts.processFinalCode = (type, code) => {
          if (before) code = before(type, code);
          if (type !== 'fragment' || code.includes('dwOpalTint')) return code;
          const i = code.indexOf('void main');
          if (i < 0 || !code.includes('#define CUSTOM_FRAGMENT_BEFORE_FOG')) return code;
          code = code.slice(0, i) + DEFS + '\n' + code.slice(i); // definitions just before main(), whatever other hooks did
          return code.replace('#define CUSTOM_FRAGMENT_BEFORE_FOG', APPLY + '\n#define CUSTOM_FRAGMENT_BEFORE_FOG');
        };
      }
      if (prev) prev(name, uniforms, ubos, samplers, defines, attribs, opts);
      return 'dwopal'; // its own shader, so nothing else in the scene picks up the shimmer
    };
    m.onBindObservable.add(() => { const e = m.getEffect(); if (e) e.setFloat4('dwOpal', OPAL.strength, OPAL.speed, OPAL.sparkle, performance.now() / 1000); });
    m.markAsDirty(63);
  }
  return true;
}
