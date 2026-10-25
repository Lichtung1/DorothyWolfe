// ambience.js: procedural sound for the world (no audio files, nothing to license).
//  - wind in the birches: loud on the road, softer inside the lace house
//  - the fireplace crackles, the TV hisses, the shrine hums
//  - the rotary phone rings once the first time you walk past it; touching it plays a dial tone
//  - pulling a sky thread makes it zip back up
// Everything is positional: louder when close, panned left/right by where it is relative to you.
// Starts only after the visitor turns sound on (browsers require a tap first).

const SOURCES = {
  fire: { x: 3.8, z: -9.6, r: 9, vol: .5 },
  tv: { x: 8.95, z: -7.2, r: 6.5, vol: .22 },
  shrine: { x: 3.3, z: 46, r: 12, vol: .22 },
  phone: { x: 1.84, z: 7.1, r: 9, vol: .5 },
};
export const AMBIENCE = { master: .8, wind: .32 };

export class Ambience {
  constructor() { this.ctx = null; this.on = false; this.rang = false; }
  start() {
    if (this.ctx) { this.ctx.resume(); return; }
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const c = this.ctx = new A(); c.resume();
    this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(c.destination);
    // shared noise buffer
    const nb = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = () => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.start(0, Math.random() * 2); return s; };
    const chain = (...nodes) => { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; };
    const spot = () => { const g = c.createGain(), p = c.createStereoPanner(); g.gain.value = 0; g.connect(p); p.connect(this.out); return { g, p }; };

    // wind: band-passed noise whose pitch and level drift like gusts
    const wf = c.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 520; wf.Q.value = .7;
    this.wind = c.createGain(); this.wind.gain.value = 0; chain(this.noise(), wf, this.wind, this.out);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .07; lg.gain.value = 260; chain(lfo, lg, wf.frequency); lfo.start();
    this.windFilter = wf;

    // fireplace: low rumble + random crackles
    this.fire = spot();
    const rum = c.createBiquadFilter(); rum.type = 'lowpass'; rum.frequency.value = 180; const rg = c.createGain(); rg.gain.value = .5;
    chain(this.noise(), rum, rg, this.fire.g);
    this.crackleBus = c.createGain(); this.crackleBus.gain.value = 1; this.crackleBus.connect(this.fire.g);

    // TV: thin high hiss
    this.tv = spot();
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3200; chain(this.noise(), hp, this.tv.g);

    // shrine: two slow, slightly detuned sines, like a held note in a small chapel
    this.shrine = spot();
    for (const [f, v] of [[392, .12], [393.4, .1], [587.3, .05]]) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.value = v; chain(o, g, this.shrine.g); o.start(); }

    this.phone = spot();
    this.on = true;
  }

  crackle(t) {
    const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    s.buffer = c.createBuffer(1, 600, c.sampleRate); const d = s.buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    f.type = 'highpass'; f.frequency.value = 900 + Math.random() * 2500; g.gain.value = .4 + Math.random() * .9;
    s.connect(f); f.connect(g); g.connect(this.crackleBus); s.start(t);
  }

  ring() { // old bell phone: two bursts of a fast-trembling bell tone
    const c = this.ctx, now = c.currentTime;
    for (const start of [0, .45, 2.4, 2.85]) {
      for (const f of [1046, 1318]) {
        const o = c.createOscillator(), g = c.createGain(), trem = c.createOscillator(), tg = c.createGain();
        o.type = 'triangle'; o.frequency.value = f; trem.frequency.value = 22; tg.gain.value = .5;
        g.gain.setValueAtTime(0, now + start); g.gain.linearRampToValueAtTime(.18, now + start + .02); g.gain.setValueAtTime(.18, now + start + .35); g.gain.linearRampToValueAtTime(0, now + start + .4);
        trem.connect(tg); tg.connect(g.gain); o.connect(g); g.connect(this.phone.g);
        o.start(now + start); trem.start(now + start); o.stop(now + start + .42); trem.stop(now + start + .42);
      }
    }
  }

  dialTone() { // touching the phone: a dial tone that drowns in static
    if (!this.on) return;
    const c = this.ctx, now = c.currentTime, g = c.createGain();
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(.1, now + .05); g.gain.setValueAtTime(.1, now + 1.4); g.gain.linearRampToValueAtTime(0, now + 2.2); g.connect(this.out);
    for (const f of [350, 440]) { const o = c.createOscillator(); o.frequency.value = f; o.connect(g); o.start(now); o.stop(now + 2.3); }
    const n = this.noise(), ng = c.createGain(), nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1800;
    ng.gain.setValueAtTime(0, now + 1); ng.gain.linearRampToValueAtTime(.12, now + 2); ng.gain.linearRampToValueAtTime(0, now + 3.2);
    n.connect(nf); nf.connect(ng); ng.connect(this.out); n.stop(now + 3.3);
  }

  zip() { // a thread being pulled up into the sky
    if (!this.on) return;
    const c = this.ctx, now = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(180, now); o.frequency.exponentialRampToValueAtTime(2400, now + .8);
    g.gain.setValueAtTime(.0, now); g.gain.linearRampToValueAtTime(.05, now + .05); g.gain.exponentialRampToValueAtTime(.001, now + .9);
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2;
    o.connect(f); f.connect(g); g.connect(this.out); o.start(now); o.stop(now + 1);
  }

  update(player, enabled, hidden) {
    if (!this.ctx) return;
    const c = this.ctx, now = c.currentTime, live = enabled && !hidden;
    this.out.gain.setTargetAtTime(live ? AMBIENCE.master : 0, now, .3);
    if (!live) return;
    const outside = player.y > 10;
    this.wind.gain.setTargetAtTime(AMBIENCE.wind * (outside ? 1 : .35) * (.7 + .3 * Math.sin(now * .23)), now, .8);
    const place = (s, src) => {
      const dx = src.x - player.x, dz = src.z - player.y, dist = Math.hypot(dx, dz), k = Math.max(0, 1 - dist / src.r) ** 2;
      s.g.gain.setTargetAtTime(src.vol * k, now, .2);
      s.p.pan.setTargetAtTime(Math.max(-.8, Math.min(.8, Math.sin(Math.atan2(dz, dx) - player.a) * .8)), now, .2);
      return dist;
    };
    place(this.fire, SOURCES.fire); place(this.tv, SOURCES.tv); place(this.shrine, SOURCES.shrine);
    const pd = place(this.phone, SOURCES.phone);
    if (pd > 6) this.armed = true; // you have to have wandered off first
    if (this.armed && !this.rang && pd < 4.5) { this.rang = true; this.ring(); }
    if (Math.random() < .09) this.crackle(now + Math.random() * .1);
  }
}
