/*!
 * Hexan Engine v1.2.1 — tiny HTML5 canvas game engine for the Hexan browser-game library.
 * Original code, released for use in Hexan games. No dependencies, no network calls.
 * Exposes a single global: HX
 */
(function (root) {
  'use strict';
  const HX = { version: '1.2.1', VERSION: '1.2.1' }; // version kept for 1.0 compatibility
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  HX.clamp = clamp; HX.lerp = lerp;
  HX.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  HX.now = () => (root.performance ? performance.now() : Date.now());

  /* ------------------------------------------------------------------ RNG */
  function hashStr(str) { // xmur3-style 32-bit string hash
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  HX.hash = hashStr;
  /** Seeded RNG (mulberry32). seed: number or string. */
  HX.RNG = function (seed) {
    let a = (typeof seed === 'string' ? hashStr(seed) : (seed >>> 0)) || 0x9e3779b9;
    const r = {
      seed: a,
      next() { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; },
      range(lo, hi) { return lo + r.next() * (hi - lo); },
      int(lo, hi) { return lo + Math.floor(r.next() * (hi - lo + 1)); }, // inclusive
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      chance(p) { return r.next() < p; },
      shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
      weighted(items, weights) { let s = 0; for (const w of weights) s += w; let x = r.next() * s; for (let i = 0; i < items.length; i++) { x -= weights[i]; if (x < 0) return items[i]; } return items[items.length - 1]; }
    };
    return r;
  };
  HX.rng = HX.RNG(Date.now() ^ (Math.random() * 1e9));

  /* --------------------------------------------------------------- Easing */
  const E = {
    linear: t => t,
    inQuad: t => t * t, outQuad: t => t * (2 - t), inOutQuad: t => (t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    inCubic: t => t * t * t, outCubic: t => (--t) * t * t + 1, inOutCubic: t => (t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
    outQuart: t => 1 - (--t) * t * t * t, outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inBack: t => { const s = 1.70158; return t * t * ((s + 1) * t - s); },
    outBack: t => { const s = 1.70158; return --t * t * ((s + 1) * t + s) + 1; },
    outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1),
    outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; },
    outSine: t => Math.sin(t * Math.PI / 2), inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2
  };
  HX.Ease = E;

  /* --------------------------------------------------------------- Tweens */
  class Tweens {
    constructor() { this.list = []; }
    /** to(target, {prop: endValue}, seconds, {ease, delay, onUpdate, onComplete, yoyo, repeat}) */
    to(target, props, dur, opt = {}) {
      const tw = { target, props, dur: Math.max(dur, 1e-4), t: -(opt.delay || 0), ease: typeof opt.ease === 'function' ? opt.ease : (E[opt.ease] || E.outQuad), from: null, opt, done: false, repeat: opt.repeat || 0 };
      tw.promise = new Promise(res => (tw._res = res));
      tw.then = (f) => tw.promise.then(f);
      tw.kill = () => { tw.done = true; tw._res(); };
      this.list.push(tw); return tw;
    }
    wait(sec) { return this.to({}, {}, sec).promise; }
    killOf(target) { for (const tw of this.list) if (tw.target === target) tw.done = true; this.list = this.list.filter(t => !t.done); }
    update(dt) {
      for (let i = 0; i < this.list.length; i++) {
        const tw = this.list[i]; if (tw.done) continue;
        tw.t += dt; if (tw.t < 0) continue;
        if (!tw.from) { tw.from = {}; for (const k in tw.props) tw.from[k] = tw.target[k]; }
        let p = clamp(tw.t / tw.dur, 0, 1); const e = tw.ease(tw.opt.yoyo ? (p < .5 ? p * 2 : 2 - p * 2) : p);
        for (const k in tw.props) tw.target[k] = tw.from[k] + (tw.props[k] - tw.from[k]) * e;
        tw.opt.onUpdate && tw.opt.onUpdate(e, tw.target);
        if (p >= 1) {
          if (tw.repeat === -1 || tw.repeat > 0) { if (tw.repeat > 0) tw.repeat--; tw.t = 0; if (!tw.opt.yoyo) for (const k in tw.props) tw.target[k] = tw.from[k]; }
          else { tw.done = true; tw.opt.onComplete && tw.opt.onComplete(tw.target); tw._res(tw.target); }
        }
      }
      if (this.list.length > 64 || this.list.some(t => t.done)) this.list = this.list.filter(t => !t.done);
    }
    clear() { this.list.length = 0; }
  }
  HX.Tweens = Tweens;

  /* ------------------------------------------------------------ Particles */
  class Particles {
    constructor(max = 900) { this.list = []; this.max = max; }
    /** burst(x, y, {count, colors, speed:[min,max], life:[min,max], size:[min,max], gravity, drag, shape:'circle'|'square'|'shard'|'spark'|'ring', angle, spread, spin, glow}) */
    burst(x, y, o = {}) {
      const n = o.count || 16, cols = o.colors || ['#fff'], sp = o.speed || [120, 360], lf = o.life || [0.4, 0.9], sz = o.size || [3, 7];
      const ang = o.angle == null ? 0 : o.angle, spread = o.spread == null ? Math.PI * 2 : o.spread;
      for (let i = 0; i < n; i++) {
        if (this.list.length >= this.max) this.list.shift();
        const a = ang - spread / 2 + Math.random() * spread, v = lerp(sp[0], sp[1], Math.random());
        const life = lerp(lf[0], lf[1], Math.random());
        this.list.push({ x: x + (o.jitter ? (Math.random() - .5) * o.jitter : 0), y: y + (o.jitter ? (Math.random() - .5) * o.jitter : 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life,
          size: lerp(sz[0], sz[1], Math.random()), color: cols[(Math.random() * cols.length) | 0], g: o.gravity == null ? 600 : o.gravity, drag: o.drag == null ? 1.5 : o.drag,
          shape: o.shape || 'circle', rot: Math.random() * 6.28, vr: (Math.random() - .5) * (o.spin == null ? 12 : o.spin), glow: !!o.glow, shrink: o.shrink !== false });
      }
    }
    ring(x, y, o = {}) { this.list.push({ x, y, vx: 0, vy: 0, life: o.life || .45, max: o.life || .45, size: o.size || 20, grow: o.grow || 160, color: o.color || '#fff', g: 0, drag: 0, shape: 'ring', rot: 0, vr: 0, width: o.width || 4 }); }
    update(dt) {
      const L = this.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i]; p.life -= dt; if (p.life <= 0) { L.splice(i, 1); continue; }
        const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy = p.vy * d + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.shape === 'ring') p.size += p.grow * dt;
      }
    }
    draw(ctx) {
      for (const p of this.list) {
        const k = p.life / p.max, s = p.shrink === false ? p.size : p.size * (0.3 + 0.7 * k);
        ctx.globalAlpha = Math.min(1, k * 1.6);
        if (p.glow) ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
        switch (p.shape) {
          case 'square': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore(); break;
          case 'shard': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * .6, s * .4); ctx.lineTo(-s * .5, s * .6); ctx.closePath(); ctx.fill(); ctx.globalAlpha *= .6; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * .2, 0); ctx.lineTo(-s * .2, s * .1); ctx.fill(); ctx.restore(); break;
          case 'spark': { const vl = Math.hypot(p.vx, p.vy) || 1; ctx.lineWidth = Math.max(1, s * .45); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / vl * s * 3, p.y - p.vy / vl * s * 3); ctx.stroke(); break; }
          case 'ring': ctx.lineWidth = p.width * k; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.2832); ctx.stroke(); break;
          default: ctx.beginPath(); ctx.arc(p.x, p.y, s / 2, 0, 6.2832); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
    }
    clear() { this.list.length = 0; }
  }
  HX.Particles = Particles;

  /* ---------------------------------------------------------------- Juice */
  class FX {
    constructor(game) { this.g = game; this.particles = new Particles(); this.texts = []; this.shakeAmp = 0; this.shakeT = 0; this.shakeDur = 0; this.flashes = []; this.ox = 0; this.oy = 0; this.trauma = 0; }
    /** Screen shake: amplitude in logical px, duration seconds. */
    shake(amp = 8, dur = 0.3) { if (this.g.save && this.g.save.data.settings.reduceMotion) amp *= 0.3; if (amp >= this.shakeAmp * (this.shakeT / (this.shakeDur || 1))) { this.shakeAmp = amp; this.shakeDur = dur; this.shakeT = dur; } }
    /** Freeze gameplay updates for sec (hit-stop). */
    hitStop(sec = 0.06) { this.g.hitStopT = Math.max(this.g.hitStopT, sec); }
    /** Full-screen flash. */
    flash(color = '#fff', dur = 0.18, alpha = 0.6) { this.flashes.push({ color, dur, t: dur, alpha }); }
    /** Floating text (score popups). */
    floatText(x, y, text, o = {}) { this.texts.push({ x, y, text: String(text), t: 0, life: o.life || 0.9, rise: o.rise == null ? 70 : o.rise, color: o.color || '#fff', size: o.size || 34, stroke: o.stroke || 'rgba(0,0,0,.55)', pop: o.pop !== false, weight: o.weight || 900 }); }
    burst(x, y, o) { this.particles.burst(x, y, o); }
    ring(x, y, o) { this.particles.ring(x, y, o); }
    update(dt) {
      this.particles.update(dt);
      for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.t += dt; if (t.t >= t.life) this.texts.splice(i, 1); }
      if (this.shakeT > 0) { this.shakeT -= dt; const k = Math.max(0, this.shakeT / this.shakeDur), a = this.shakeAmp * k * k; this.ox = (Math.random() * 2 - 1) * a; this.oy = (Math.random() * 2 - 1) * a; } else { this.ox = this.oy = 0; }
      for (let i = this.flashes.length - 1; i >= 0; i--) { const f = this.flashes[i]; f.t -= dt; if (f.t <= 0) this.flashes.splice(i, 1); }
    }
    draw(ctx) {
      this.particles.draw(ctx);
      for (const t of this.texts) {
        const k = t.t / t.life, sc = t.pop ? (k < .15 ? E.outBack(k / .15) : 1) : 1;
        ctx.save(); ctx.globalAlpha = k > .7 ? (1 - k) / .3 : 1; ctx.translate(t.x, t.y - t.rise * E.outCubic(k)); ctx.scale(sc, sc);
        UI.text(ctx, t.text, 0, 0, { size: t.size, color: t.color, stroke: t.stroke, strokeWidth: Math.max(3, t.size / 7), weight: t.weight });
        ctx.restore();
      }
    }
    drawFlash(ctx, W, H) { for (const f of this.flashes) { ctx.globalAlpha = f.alpha * (f.t / f.dur); ctx.fillStyle = f.color; ctx.fillRect(-50, -50, W + 100, H + 100); } ctx.globalAlpha = 1; }
    clear() { this.particles.clear(); this.texts.length = 0; this.flashes.length = 0; this.shakeT = 0; }
  }
  HX.FX = FX;

  /* ---------------------------------------------------------------- Audio */
  const Audio = HX.Audio = {
    ctx: null, master: null, sfxGain: null, musicGain: null, muted: false, unlocked: false, _noise: null, _save: null, _music: null, volume: 0.8,
    debug: true, // logs unlock path at console.debug level
    init(save) {
      this._save = save || null;
      if (save) {
        const st = save.data.settings;
        // Only honour a saved mute if the player explicitly chose it (guards against stale/accidental mute flags from older saves).
        if (st.muted && !st.mutedByUser) { st.muted = false; save.write(); this._log('cleared stale saved mute'); }
        this.muted = !!st.muted;
      }
      this._log(`init muted=${this.muted}`); this.installUnlock(); return this;
    },
    _log(msg) { if (this.debug) console.debug('[HX audio] ' + msg); },
    _isIOS() { const n = root.navigator || {}; return /iP(hone|ad|od)/.test(n.userAgent || '') || (n.platform === 'MacIntel' && n.maxTouchPoints > 1); },
    /** Gesture listeners (capture phase on document) that retry unlocking until the context is running. */
    installUnlock() {
      if (this._unlockOn || typeof document === 'undefined') return; this._unlockOn = true;
      this._unlockH = this._unlockH || ((e) => this.unlock(e.type));
      ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, this._unlockH, { capture: true, passive: true }));
    },
    removeUnlock() {
      if (!this._unlockOn) return; this._unlockOn = false;
      ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'click', 'keydown'].forEach(ev => document.removeEventListener(ev, this._unlockH, { capture: true }));
    },
    /** Tiny silent WAV played through an <audio> element: moves iOS (17+) into the "playback" audio session so the ring/silent switch doesn't mute WebAudio. */
    _silentWav() {
      if (this._wav) return this._wav; const n = 64, b = new Uint8Array(44 + n), dv = new DataView(b.buffer), w = (o, str) => { for (let i = 0; i < str.length; i++) b[o + i] = str.charCodeAt(i); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true); for (let i = 0; i < n; i++) b[44 + i] = 128;
      let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]); return (this._wav = 'data:audio/wav;base64,' + btoa(bin));
    },
    htmlAudioUnlock: 'ios', // 'ios' | true | false
    _htmlUnlock() {
      const want = this.htmlAudioUnlock === true || (this.htmlAudioUnlock === 'ios' && this._isIOS()); if (!want || typeof document === 'undefined') return;
      try { if (root.navigator && root.navigator.audioSession) root.navigator.audioSession.type = 'playback'; } catch (e) {}
      try { if (!this._el) { const el = this._el = document.createElement('audio'); el.setAttribute('playsinline', ''); el.setAttribute('x-webkit-airplay', 'deny'); el.preload = 'auto'; el.loop = true; el.src = this._silentWav(); }
        const pr = this._el.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
    },
    _ensure() {
      if (this.ctx) return this.ctx;
      const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
      try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { this.ctx = new AC(); } catch (e2) { return null; } }
      this.ctx.onstatechange = () => { const st = this.ctx.state; this._log('state=' + st); if (st === 'running') this._unlocked(this._lastVia || 'statechange'); else if (!this._hiddenSuspend) { this._reported = false; this.installUnlock(); } };
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.volume; this.master.connect(this.ctx.destination);
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 6; comp.connect(this.master);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.9; this.sfxGain.connect(comp);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.35; this.musicGain.connect(comp);
      const len = this.ctx.sampleRate; const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; this._noise = b;
      return this.ctx;
    },
    /** Call from a user gesture (engine does this on first pointer/key). */
    /** Must run synchronously inside a user gesture handler (the engine wires this up). No awaits before resume(). */
    unlock(via = 'manual') {
      const c = this._ensure(); if (!c) return;
      this._htmlUnlock();
      if (c.state !== 'running') { try { const pr = c.resume(); if (pr && pr.then) pr.then(() => this._unlocked(via), () => {}); } catch (e) {} }
      try { const b = c.createBuffer(1, 1, 22050), src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0); } catch (e) {}
      this.unlocked = true; this._lastVia = via;
      if (this.master) this.master.gain.value = this._gainTarget();
      if (c.state === 'running') this._unlocked(via);
    },
    _unlocked(via) {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (!this._reported) { this._reported = true; this._log(`unlocked via ${via}, state=${this.ctx.state}, muted=${this.muted}, gain=${this.master ? this.master.gain.value.toFixed(2) : '-'}`); }
      this.removeUnlock();
    },
    get state() { return this.ctx ? this.ctx.state : 'none'; },
    _gainTarget() { return (this.muted || this._ducked || (HX.Bridge && HX.Bridge.hold)) ? 0 : this.volume; },
    /** Temporarily silence (ads) without touching the saved mute setting. */
    _duck(on) { this._ducked = !!on; if (this.master) { try { this.master.gain.cancelScheduledValues(this.ctx.currentTime); this.master.gain.setValueAtTime(this._gainTarget(), this.ctx.currentTime); } catch (e) { this.master.gain.value = this._gainTarget(); } } },
    setMuted(m, byUser = true) { this.muted = !!m; if (this._save) { this._save.data.settings.muted = this.muted; if (byUser) this._save.data.settings.mutedByUser = this.muted; this._save.write(); } if (this.master) this.master.gain.setTargetAtTime(this._gainTarget(), this.ctx.currentTime, 0.02); this._log(`muted=${this.muted}`); },
    toggleMute() { this.setMuted(!this.muted); if (!this.muted) { this.unlock('mute-toggle'); this.sfx('blip'); } return this.muted; },
    /** Low-level voice. o: {type, freq, to, dur, vol, attack, delay, noise, filter, filterTo, q, detune} */
    tone(o) {
      const c = this.ctx; if (!c || c.state !== 'running' || this.muted) return;
      const t0 = c.currentTime + (o.delay || 0), dur = o.dur || 0.1, vol = (o.vol == null ? 0.3 : o.vol), att = o.attack || 0.004;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + att); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      let src;
      if (o.noise) { src = c.createBufferSource(); src.buffer = this._noise; src.loop = true; }
      else { src = c.createOscillator(); src.type = o.type || 'square'; src.frequency.setValueAtTime(o.freq || 440, t0); if (o.to) src.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + dur); if (o.detune) src.detune.value = o.detune; }
      let node = src;
      if (o.filter) { const f = c.createBiquadFilter(); f.type = o.filterType || 'lowpass'; f.frequency.setValueAtTime(o.filter, t0); if (o.filterTo) f.frequency.exponentialRampToValueAtTime(o.filterTo, t0 + dur); f.Q.value = o.q || 1; node.connect(f); node = f; }
      node.connect(g); g.connect(o.bus || this.sfxGain); src.start(t0); src.stop(t0 + dur + 0.05);
    },
    /** Named procedural sound effects. opts.pitch multiplies frequencies. */
    sfx(name, opts = {}) {
      if (!this.ctx || this.muted) return; const p = opts.pitch || 1, v = opts.vol == null ? 1 : opts.vol, T = (o) => this.tone(Object.assign(o, { freq: o.freq && o.freq * p, to: o.to && o.to * p, vol: (o.vol == null ? .3 : o.vol) * v }));
      const S = Audio.presets[name]; if (S) S(T, p); else console.warn('[HX.Audio] unknown sfx', name);
    },
    presets: {
      blip: T => T({ type: 'square', freq: 880, to: 1320, dur: 0.07, vol: .18 }),
      click: T => T({ type: 'triangle', freq: 600, to: 420, dur: 0.05, vol: .25 }),
      coin: T => { T({ type: 'square', freq: 988, dur: 0.08, vol: .18 }); T({ type: 'square', freq: 1319, dur: 0.25, vol: .18, delay: 0.07 }); },
      hit: T => { T({ noise: true, dur: 0.14, vol: .35, filter: 2400, filterTo: 300 }); T({ type: 'square', freq: 220, to: 55, dur: 0.12, vol: .25 }); },
      jump: T => T({ type: 'square', freq: 260, to: 720, dur: 0.16, vol: .18 }),
      explosion: T => { T({ noise: true, dur: 0.7, vol: .55, filter: 1800, filterTo: 80 }); T({ type: 'sine', freq: 140, to: 28, dur: 0.6, vol: .5 }); },
      powerup: T => [523, 659, 784, 1047].forEach((f, i) => T({ type: 'square', freq: f, dur: 0.1, vol: .14, delay: i * 0.06 })),
      win: T => [523, 659, 784, 1047, 1319].forEach((f, i) => T({ type: 'triangle', freq: f, dur: 0.22, vol: .3, delay: i * 0.08 })),
      lose: T => [392, 330, 262, 196].forEach((f, i) => T({ type: 'triangle', freq: f, to: f * .97, dur: 0.25, vol: .3, delay: i * 0.13 })),
      place: T => { T({ type: 'sine', freq: 180, to: 90, dur: 0.09, vol: .4 }); T({ noise: true, dur: 0.05, vol: .12, filter: 900 }); },
      pickup: T => T({ type: 'sine', freq: 500, to: 800, dur: 0.07, vol: .2 }),
      error: T => { T({ type: 'square', freq: 150, dur: 0.12, vol: .15 }); T({ type: 'square', freq: 110, dur: 0.16, vol: .15, delay: .1 }); },
      chime: T => { T({ type: 'sine', freq: 1568, dur: 0.5, vol: .22 }); T({ type: 'sine', freq: 2093, dur: 0.6, vol: .16, delay: .05 }); T({ type: 'triangle', freq: 784, dur: .3, vol: .12 }); },
      shatter: T => { T({ noise: true, dur: 0.35, vol: .3, filter: 3000, filterType: 'highpass' }); [2637, 3136, 3520, 2349].forEach((f, i) => T({ type: 'sine', freq: f, dur: 0.18, vol: .08, delay: i * 0.035 })); },
      whoosh: T => T({ noise: true, dur: 0.3, vol: .2, filter: 400, filterTo: 3000, filterType: 'bandpass', q: 2 })
    },
    /** Tiny step-sequencer music loop.
     *  song = {bpm, steps (per bar, 16th notes), tracks:[{wave, vol, len (steps), notes:[midi|null,...], octave}]} */
    music(song) {
      this.stopMusic(); const c = this.ctx; if (!song) return;
      const m = { song, step: 0, next: c ? c.currentTime + 0.05 : 0, timer: null };
      const mtof = n => 440 * Math.pow(2, (n - 69) / 12), stepDur = 60 / song.bpm / 4;
      m.timer = setInterval(() => {
        const c = this.ctx; if (!c || c.state !== 'running') return; if (m.next < c.currentTime - 0.2) m.next = c.currentTime + 0.05;
        while (m.next < c.currentTime + 0.12) {
          for (const tr of song.tracks) {
            const n = tr.notes[m.step % tr.notes.length]; if (n == null || this.muted) continue;
            if (tr.wave === 'noise') this.tone({ noise: true, dur: stepDur * (tr.len || 1), vol: tr.vol || .1, filter: tr.filter || 6000, filterType: 'highpass', bus: this.musicGain, delay: m.next - c.currentTime });
            else this.tone({ type: tr.wave || 'triangle', freq: mtof(n + (tr.octave || 0) * 12), dur: stepDur * (tr.len || 1) * 0.95, vol: tr.vol || .15, attack: .01, bus: this.musicGain, delay: m.next - c.currentTime });
          }
          m.step++; m.next += stepDur;
        }
      }, 25);
      this._music = m;
    },
    stopMusic() { if (this._music) { clearInterval(this._music.timer); this._music = null; } },
    suspend() { this._hiddenSuspend = true; if (this._el) try { this._el.pause(); } catch (e) {} if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); },
    /** Resume after visibility change / ad break / iOS 'interrupted'. If the browser refuses without a gesture, gesture listeners retry. */
    resume() {
      this._hiddenSuspend = false; if (!this.ctx || !this.unlocked) return;
      if (this.ctx.state !== 'running') { this._reported = false; this.installUnlock(); try { this.ctx.resume().then(() => this._unlocked('resume'), () => {}); } catch (e) {} }
      if (this._el && this._el.paused) { const pr = this._el.play(); if (pr && pr.catch) pr.catch(() => {}); }
    }
  };

  /* ----------------------------------------------------------------- Save */
  function lsAvailable() { try { const k = '__hx_t'; root.localStorage.setItem(k, '1'); root.localStorage.removeItem(k); return true; } catch (e) { return false; } }
  const mem = {};
  const store = {
    ok: lsAvailable(),
    get(k) { try { return this.ok ? root.localStorage.getItem(k) : (mem[k] ?? null); } catch (e) { return mem[k] ?? null; } },
    set(k, v) { try { if (this.ok) root.localStorage.setItem(k, v); else mem[k] = v; } catch (e) { mem[k] = v; } },
    del(k) { try { if (this.ok) root.localStorage.removeItem(k); delete mem[k]; } catch (e) { delete mem[k]; } }
  };
  HX.storage = store;
  function deepMerge(base, over) { if (!over || typeof over !== 'object') return base; for (const k in over) { if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && base[k] && typeof base[k] === 'object') deepMerge(base[k], over[k]); else base[k] = over[k]; } return base; }
  /** Per-game save: localStorage key "hexan:<slug>". Safe in incognito / blocked storage (falls back to memory). */
  class Save {
    constructor(slug, defaults = {}) {
      this.slug = slug; this.key = 'hexan:' + slug;
      this.defaults = () => deepMerge({ v: 1, best: 0, plays: 0, levels: { unlocked: 1, results: {} }, settings: { muted: false, reduceMotion: false }, daily: { last: null, streak: 0, bestStreak: 0, results: {} }, custom: {} }, JSON.parse(JSON.stringify(defaults)));
      this.data = this.defaults(); this.load();
    }
    load() { const raw = store.get(this.key); if (raw) { try { deepMerge(this.data, JSON.parse(raw)); } catch (e) { console.warn('[HX.Save] corrupt save reset'); } } return this.data; }
    /** Persist. Bumps data._rev (1.2) and runs HX.Save.hooks (the bridge uses this to emit save.put). write(true) = remote apply: no bump, no hooks. */
    write(remote) { if (!remote) this.data._rev = (this.data._rev | 0) + 1; store.set(this.key, JSON.stringify(this.data)); if (!remote) for (const f of Save.hooks) { try { f(this); } catch (e) { console.warn('[HX.Save] hook error', e); } } }
    /** Monotonic revision counter (1.2). */
    get rev() { return this.data._rev | 0; }
    /** Apply a newer remote copy (portal save.sync). Returns true if applied (remote rev > local rev). */
    applyRemote(json, rev) { let d; try { d = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { console.warn('[HX.Save] applyRemote: bad json'); return false; }
      if (!d || typeof d !== 'object') return false; const r = rev != null ? rev | 0 : (d._rev | 0); if (r <= this.rev) return false;
      this.data = this.defaults(); deepMerge(this.data, d); this.data._rev = r; this.write(true); if (typeof this.onRemote === 'function') try { this.onRemote(this.data); } catch (e) {} return true; }
    get(path, dflt) { let o = this.data; for (const p of path.split('.')) { if (o == null) return dflt; o = o[p]; } return o === undefined ? dflt : o; }
    set(path, v) { const ps = path.split('.'); let o = this.data; for (let i = 0; i < ps.length - 1; i++) { if (typeof o[ps[i]] !== 'object' || o[ps[i]] === null) o[ps[i]] = {}; o = o[ps[i]]; } o[ps[ps.length - 1]] = v; this.write(); return v; }
    /** Returns true if score is a new best (and saves it). key lets you keep separate bests per mode. */
    submitBest(score, key = 'best') { const cur = this.get(key, 0) || 0; if (score > cur) { this.set(key, score); return true; } return false; }
    get best() { return this.data.best || 0; }
    unlock(level) { if (level > this.data.levels.unlocked) { this.data.levels.unlocked = level; this.write(); } }
    isUnlocked(level) { return level <= this.data.levels.unlocked; }
    /** Record a level result; keeps the best stars/score; unlocks next level. */
    completeLevel(level, res = {}) { const prev = this.data.levels.results[level] || {}; this.data.levels.results[level] = { stars: Math.max(prev.stars || 0, res.stars || 0), score: Math.max(prev.score || 0, res.score || 0) }; this.unlock(level + 1); this.write(); }
    levelResult(level) { return this.data.levels.results[level] || null; }
    reset() { this.data = this.defaults(); this.write(); }
  }
  Save.hooks = [];
  HX.Save = Save;

  /* ---------------------------------------------------------------- Daily */
  const pad = n => String(n).padStart(2, '0');
  HX.Daily = {
    /** Local-date key "YYYY-MM-DD" (offsetDays shifts). */
    key(d = new Date(), offsetDays = 0) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offsetDays); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); },
    seed(slug, key) { return hashStr(slug + '|' + (key || this.key())); },
    rng(slug, key) { return HX.RNG(this.seed(slug, key)); },
    /** Streak status without modifying. */
    status(save, now = new Date()) {
      const d = save.data.daily, today = this.key(now), yest = this.key(now, -1);
      const alive = d.last === today || d.last === yest;
      return { today, doneToday: d.last === today, streak: alive ? d.streak : 0, bestStreak: d.bestStreak, result: d.results[today] || null };
    },
    /** Mark today's daily as completed. Returns {streak, firstToday}. */
    complete(save, result = {}, now = new Date()) {
      const d = save.data.daily, today = this.key(now), yest = this.key(now, -1); let first = false;
      if (d.last !== today) { d.streak = d.last === yest ? d.streak + 1 : 1; d.last = today; first = true; }
      d.bestStreak = Math.max(d.bestStreak || 0, d.streak);
      const prev = d.results[today]; if (!prev || (result.score || 0) > (prev.score || 0)) d.results[today] = result;
      const keys = Object.keys(d.results).sort(); while (keys.length > 60) delete d.results[keys.shift()];
      save.write(); if (HX.track) HX.track('daily_complete', { day: today, streak: d.streak, firstToday: first, score: result.score }); return { streak: d.streak, firstToday: first };
    }
  };

  /* ---------------------------------------------------------------- Stars (1.1) */
  /** Generic level-star helper. rules: [{key, text, test(ctx) -> bool}]. Returns {earned:[bool], count}.
   *  Convention used by Hexan games: rule 0 = goal met, rules 1-2 = two clear extra criteria. */
  HX.Stars = {
    evaluate(rules, ctx) { const earned = rules.map(r => !!r.test(ctx)); return { earned, count: earned.filter(Boolean).length }; },
    /** Plain-words summary lines, e.g. for a level-start card. */
    describe(rules) { return rules.map((r, i) => (i === 0 ? '' : '+1 star: ') + r.text); }
  };

  /* ---------------------------------------------------------------- Consent (1.2) */
  /** Platform-wide consent flags, persisted in localStorage "playtoom:consent" (migrated once from the legacy "playversy:consent") (shared by all games on the origin).
   *  URL overrides for the platform shell: ?consent=0|1 (analytics), ?child=1 (child-directed), ?pads=0|1 (personalized ads). */
  const CONSENT_KEY = 'playtoom:consent', CONSENT_KEY_LEGACY = 'playversy:consent';
  HX.consent = {
    _s: { analytics: true, ads: true, personalizedAds: false, childDirected: false, underAge: false }, _fns: [],
    get(key) { return key ? this._s[key] : Object.assign({}, this._s); },
    set(a, b) { const o = typeof a === 'string' ? { [a]: b } : (a || {}); for (const k in o) this._s[k] = !!o[k]; try { store.set(CONSENT_KEY, JSON.stringify(this._s)); } catch (e) {} this._fns.forEach(f => { try { f(this.get()); } catch (e) {} }); HX.track('consent_change', this.get()); return this.get(); },
    onChange(fn) { this._fns.push(fn); return () => (this._fns = this._fns.filter(f => f !== fn)); },
    /** true when analytics may be sent beyond strictly-necessary events */
    analyticsAllowed() { const s = this._s; return s.analytics && !s.childDirected && !s.underAge; },
    _init() {
      try { let raw = store.get(CONSENT_KEY); if (!raw) { const old = store.get(CONSENT_KEY_LEGACY); if (old) { raw = old; store.set(CONSENT_KEY, old); store.del(CONSENT_KEY_LEGACY); this.migrated = true; } } if (raw) Object.assign(this._s, JSON.parse(raw)); } catch (e) {}
      try { const q = new URLSearchParams(root.location ? root.location.search : ''); if (q.has('consent')) this._s.analytics = q.get('consent') !== '0'; if (q.has('child')) this._s.childDirected = q.get('child') === '1'; if (q.has('pads')) this._s.personalizedAds = q.get('pads') === '1'; } catch (e) {}
      if (this._s.childDirected || this._s.underAge) this._s.personalizedAds = false;
    }
  };

  /* Platform globals injected by tools/build.sh (or the dev shim engine/brand/brand.js). PLAYTOOM_* is current; PLAYVERSY_* is a legacy alias (pre-rename builds). */
  const brandCfg = () => root.PLAYTOOM_BRAND || root.PLAYVERSY_BRAND || null;
  const buildCfg = () => root.PLAYTOOM_BUILD || root.PLAYVERSY_BUILD || null;
  HX.brandConfig = brandCfg;
  /* ------------------------------------------------------------------ Track (1.2) */
  /** HX.track(event, props): analytics stub. No network by default. Events go to HX.events (local ring buffer) and,
   *  consent permitting, to the sink in batches. Sink signature: fn(batch: Array<{event, props, t, sid, slug, v}>). */
  HX.events = [];
  const INTERNAL = new Set(['scene', 'resize', 'gameplay_start', 'gameplay_stop', 'consent_change']);
  const T = HX.track = function track(name, props) {
    const e = { event: String(name), name: String(name), props: props || {}, data: props, t: Date.now(), sid: T.sid, slug: T.slug, v: HX.VERSION };
    HX.events.push(e); if (HX.events.length > 500) HX.events.shift();
    if (INTERNAL.has(e.event) && !T.includeInternal) return e;
    let out = e;
    if (!HX.consent.analyticsAllowed()) { if (!T.NECESSARY.has(e.event)) { e.blocked = true; return e; } out = { event: e.event, props: e.props && e.props.placement ? { placement: e.props.placement } : {}, t: e.t, slug: e.slug, v: e.v, limited: true }; }
    if (T.beforeSend) { try { out = T.beforeSend(out); } catch (er) { console.warn('[HX.track] beforeSend error', er); } if (!out) return e; }
    T._q.push(out); if (T._q.length >= T.batchSize) T.flush(); else if (!T._timer && T.flushMs > 0) T._timer = setTimeout(() => T.flush(), T.flushMs);
    return e;
  };
  Object.assign(T, {
    sid: Math.random().toString(36).slice(2, 10) + Date.now().toString(36), slug: null, t0: Date.now(), _q: [], _timer: null, batchSize: 1, flushMs: 0, includeInternal: false, beforeSend: null,
    /** Events still sent when analytics consent is off / child-directed: needed for ad delivery & reward grant only (props reduced to placement). */
    NECESSARY: new Set(['ad_break', 'rewarded_shown', 'rewarded_complete']),
    defaultSink(batch) { for (const e of batch) console.debug('[HX.track]', e.event, e.props); },
    setSink(fn, opt = {}) { T.flush(); T.sink = typeof fn === 'function' ? fn : T.defaultSink; T.configure(opt); return T; },
    configure(o = {}) { ['batchSize', 'flushMs', 'includeInternal', 'beforeSend'].forEach(k => { if (k in o) T[k] = o[k]; }); T.batchSize = Math.max(1, T.batchSize | 0); return T; },
    flush() { if (T._timer) { clearTimeout(T._timer); T._timer = null; } if (!T._q.length) return; const b = T._q.splice(0); try { (T.sink || T.defaultSink)(b); } catch (er) { console.warn('[HX.track] sink error', er); } },
    // Standard event helpers (platform standard event names)
    gameStart(p) { return T('game_start', p); }, levelStart(level, p) { return T('level_start', Object.assign({ level }, p)); }, levelComplete(level, p) { return T('level_complete', Object.assign({ level }, p)); },
    gameOver(p) { return T('game_over', p); }, dailyStart(p) { return T('daily_start', p); }, rewardedOffer(placement, p) { return T('rewarded_offer', Object.assign({ placement }, p)); },
    dailyComplete(p) { return T('daily_complete', p); },
    sessionEnd(reason = 'pagehide') { if (T._ended) return; T._ended = true; T('session_end', { duration_s: Math.round((Date.now() - T.t0) / 1000), reason }); T.flush(); }
  });
  T.sink = T.defaultSink;
  // js_error (1.2): uncaught errors / rejections are reported as events (never re-thrown or logged again).
  if (root.addEventListener) { let n = 0; const rep = (msg, src, line) => { if (++n <= 20) T('js_error', { msg: String(msg || '').slice(0, 200), src: String(src || '').split('/').pop().slice(0, 80), line: line | 0 }); };
    root.addEventListener('error', e => rep(e.message, e.filename, e.lineno)); root.addEventListener('unhandledrejection', e => rep(e.reason && (e.reason.message || e.reason), 'promise', 0)); }

  /* ------------------------------------------------------------------ Ads (1.2) */
  /** HX.Ads — provider-agnostic ad hooks. Contract (all promises ALWAYS resolve, never reject):
   *   breakPoint(placement, opts?) → Promise<{shown:boolean, reason:string}>
   *   rewarded(placement | {placement, reward}, opts?) → Promise<{shown:boolean, rewarded:boolean, granted:boolean, reason:string}>
   *  Provider (HX.Ads.setProvider(p)): { name?, init?(ctx) → any|Promise, breakPoint?(ctx) → {shown, reason?}|Promise, rewarded?(ctx) → {shown, rewarded, reason?}|Promise,
   *    gameplayStart?(), gameplayStop?() }. ctx = {type:'interstitial'|'rewarded', placement, reward, slug, consent, timeoutMs, aborted}.
   *  The engine pauses game updates/input and silences audio while a provider call is in flight, enforces a timeout (failsafe),
   *  a frequency cap between interstitials (minInterval seconds), and normalises/sanitises provider results. */
  const AD_TYPES = ['between-rounds', 'game-over', 'level-complete'];
  const withTimeout = (p, ms, msg) => new Promise((res, rej) => { const id = setTimeout(() => rej(new Error(msg)), ms); Promise.resolve(p).then(v => { clearTimeout(id); res(v); }, e => { clearTimeout(id); rej(e); }); });
  HX.Ads = {
    // Pacing (platform ARCHITECTURE.md 4.3): ≥120 s between interstitials, none in the first 60 s of a session or at the first game-over,
    // none within afterRewardedSec of a rewarded ad, max maxPerHour per hour. Applied only when a real provider is set (the stub never shows ads).
    sessionGraceSec: 60, skipFirstGameOver: true, afterRewardedSec: 30, maxPerHour: 6, canRewardTimeoutMs: 3000, _t0: HX.now(), _gameOvers: 0, _lastRewarded: 0, _shownAt: [],
    provider: null, log: [], minInterval: 120, timeoutMs: 10000, rewardedTimeoutMs: 45000, initTimeoutMs: 5000, stubGrantsRewards: true, active: false, _last: 0, _playing: false, _ready: Promise.resolve(true), _game: null,
    placements: { 'game-over': { type: 'interstitial' }, 'level-complete': { type: 'interstitial' }, 'between-levels': { type: 'interstitial' }, 'between-rounds': { type: 'interstitial', alias: 'between-levels' } },
    definePlacement(name, o = {}) { this.placements[name] = Object.assign({ type: 'interstitial' }, o); return this; },
    configure(o = {}) { ['minInterval', 'timeoutMs', 'rewardedTimeoutMs', 'initTimeoutMs', 'stubGrantsRewards', 'sessionGraceSec', 'skipFirstGameOver', 'afterRewardedSec', 'maxPerHour', 'canRewardTimeoutMs'].forEach(k => { if (k in o) this[k] = o[k]; }); return this; },
    /** Install a provider (or null for the built-in console stub). Returns Promise<boolean ready>. A failing/hanging init falls back to the stub. */
    setProvider(p) {
      this.provider = p || null;
      if (!p || !p.init) return (this._ready = Promise.resolve(true));
      const ctx = { slug: T.slug, consent: HX.consent.get(), version: HX.VERSION };
      return (this._ready = withTimeout(Promise.resolve().then(() => p.init(ctx)), this.initTimeoutMs, 'init-timeout').then(() => { console.log('[HX.Ads] provider ready:', p.name || 'custom'); return true; },
        (e) => { console.warn('[HX.Ads] provider init failed (' + ((e && e.message) || e) + '); using stub'); if (this.provider === p) this.provider = null; return false; }));
    },
    breakPoint(type, opts = {}) {
      const placement = String(type || 'break'); if (!this.placements[placement] && HX.debug) console.debug('[HX.Ads] unregistered placement', placement);
      this.log.push({ kind: 'break', type: placement, placement, t: Date.now() }); T('ad_break', { placement });
      if (placement === 'game-over') this._gameOvers++;
      if (this.active) return Promise.resolve({ shown: false, reason: 'busy' });
      if (!this.provider) { console.log('[HX.Ads] breakPoint:', placement, '(stub, no ad shown)'); return Promise.resolve({ shown: false, reason: 'no-provider', stub: true }); }
      const why = this.pacing(placement); if (why) { console.log('[HX.Ads] breakPoint:', placement, '(paced: ' + why + ')'); const r = { shown: false, reason: why }; this.log.push({ kind: 'result', type: 'interstitial', placement, result: r, t: Date.now() }); return Promise.resolve(r); }
      return this._show('interstitial', { placement, reward: null }, opts).then(r => { if (r.shown) { this._last = HX.now(); this._shownAt.push(this._last); } return r; });
    },
    /** Pacing verdict for an interstitial now: null = allowed, else a reason string. */
    pacing(placement) { const now = HX.now(), s = (t) => (now - t) / 1000;
      if (this.sessionGraceSec > 0 && s(this._t0) < this.sessionGraceSec) return 'session-start';
      if (this.skipFirstGameOver && placement === 'game-over' && this._gameOvers <= 1) return 'first-game-over';
      if (this.minInterval > 0 && this._last && s(this._last) < this.minInterval) return 'frequency-cap';
      if (this.afterRewardedSec > 0 && this._lastRewarded && s(this._lastRewarded) < this.afterRewardedSec) return 'after-rewarded';
      if (this.maxPerHour > 0 && this._shownAt.filter(t => now - t < 3600e3).length >= this.maxPerHour) return 'hourly-cap';
      return null; },
    /** Is a rewarded ad available for this placement? Promise<boolean>; never rejects. Show reward offers only when true.
     *  Stub → stubGrantsRewards (true). Provider without canReward → true. Provider error/timeout → false. */
    canReward(placement = 'default') {
      if (this.active) return Promise.resolve(false); if (!this.provider) return Promise.resolve(!!this.stubGrantsRewards);
      const p = this.provider, ctx = { type: 'rewarded', placement: String(placement), slug: T.slug, consent: HX.consent.get() };
      if (!p.canReward) return this._ready.then(() => true);
      return withTimeout(this._ready.then(() => p.canReward(ctx)), this.canRewardTimeoutMs, 'timeout').then(r => !!(r && typeof r === 'object' ? (r.available !== undefined ? r.available : r.canReward) : r),
        e => { console.warn('[HX.Ads] canReward ' + ((e && e.message) || e) + ' → false'); return false; }); },
    rewarded(placement = 'default', opts = {}) {
      const c = typeof placement === 'object' && placement ? placement : { placement: String(placement), reward: String(placement) }; c.placement = c.placement || 'default';
      this.log.push({ kind: 'rewarded', placement: c.placement, t: Date.now() });
      if (this.active) return Promise.resolve({ shown: false, rewarded: false, granted: false, reason: 'busy' });
      if (!this.provider) { const g = !!this.stubGrantsRewards; console.log('[HX.Ads] rewarded:', c.placement, g ? '(stub, auto-granted)' : '(stub, not granted)'); if (g) T('rewarded_complete', { placement: c.placement, stub: true }); return Promise.resolve({ shown: false, rewarded: g, granted: g, reason: 'no-provider', stub: true }); }
      return this._show('rewarded', c, opts).then(r => { if (r.shown) { this._lastRewarded = HX.now(); T('rewarded_shown', { placement: c.placement }); } if (r.rewarded) T('rewarded_complete', { placement: c.placement }); return r; });
    },
    _show(type, c, opts) {
      const p = this.provider, ms = opts.timeoutMs || (type === 'rewarded' ? this.rewardedTimeoutMs : this.timeoutMs);
      const ctx = { type, placement: c.placement, reward: c.reward || null, slug: T.slug, consent: HX.consent.get(), timeoutMs: ms, aborted: false };
      this.active = true; this._pause();
      const call = this._ready.then(() => { const fn = type === 'rewarded' ? p.rewarded : p.breakPoint; if (!fn) return { shown: false, reason: 'unsupported' }; return fn.call(p, ctx); });
      return withTimeout(call, ms, 'timeout').then(r => {
        r = r && typeof r === 'object' ? r : { shown: !!r };
        // With a real provider a reward is granted ONLY on an explicit rewarded:true / granted:true (no-fill, skip, garbage → false).
        const rew = r.rewarded !== undefined ? r.rewarded : r.granted, shown = r.shown !== undefined ? !!r.shown : rew === true;
        const out = { shown, reason: String(r.reason || (shown ? 'ok' : 'not-shown')) }; if (r.format) out.format = String(r.format); if (type === 'rewarded') out.rewarded = out.granted = rew === true; return out;
      }, (e) => { const to = e && e.message === 'timeout'; ctx.aborted = true; console.warn('[HX.Ads] provider ' + (to ? 'timed out after ' + ms + ' ms' : 'error: ' + ((e && e.message) || e)) + ' — resuming game'); const out = { shown: false, reason: to ? 'timeout' : 'error' }; if (type === 'rewarded') out.rewarded = out.granted = false; return out; })
        .then(out => { this.active = false; this._resume(); this.log.push({ kind: 'result', type, placement: c.placement, result: out, t: Date.now() }); return out; });
    },
    _pause() { Audio._duck(true); const g = this._game; if (g) { g.input.keys.clear(); if (g.input.p.down) { g.input.p.down = false; g._dispatch('pointerUp', g.input.p, null, true); } } if (this.provider && this.provider.gameplayStop && this._playing) try { this.provider.gameplayStop(); } catch (e) {} },
    _resume() { Audio._duck(false); Audio.resume(); const g = this._game; if (g && g._resetClock) g._resetClock(); if (this.provider && this.provider.gameplayStart && this._playing) try { this.provider.gameplayStart(); } catch (e) {} },
    gameplayStart() { if (this._playing) return; this._playing = true; if (this.provider && this.provider.gameplayStart) try { this.provider.gameplayStart(); } catch (e) {} T('gameplay_start'); },
    gameplayStop() { if (!this._playing) return; this._playing = false; if (this.provider && this.provider.gameplayStop) try { this.provider.gameplayStop(); } catch (e) {} T('gameplay_stop'); }
  };
  HX.Ads.offerRewarded = (placement, props) => T.rewardedOffer(placement, props);
  HX.consent._init();


  /* ------------------------------------------------------------------ Bridge (1.2): pv-bridge/1 portal client */
  /** Opt-in postMessage client for the platform portal (ARCHITECTURE.md 1.3; portal origins come from the brand config `portalOrigins`). It activates ONLY when the page is framed and receives
   *  {pv:1, type:'hello'} from an allowlisted origin within handshakeMs (1.5 s); otherwise it removes its listener and the game stays
   *  standalone (stub ads, local track). Once connected it: replies hello.ack, applies consent/kidMode/muted, installs the portal
   *  ad provider (ads.break / ads.rewarded / ads.canReward / gameplay), forwards HX.track batches (≤20, consent-gated), emits debounced
   *  save.put on every save write, and handles pause / resume / mute / consent.update / save.sync. Posts only to the verified origin. */
  /** Fallback portal origins if the brand config has no portalOrigins. playversy.com is accepted for a transition period (legacy). */
  const PORTAL_ORIGINS = ['https://playtoom.com', 'https://*.playtoom.com', 'https://playversy.com', 'https://*.playversy.com'];
  HX.Bridge = {
    enabled: true, handshakeMs: 1500, requestTimeoutMs: 15000, adTimeoutMs: 35000, saveDebounceMs: 2000, autoProvider: true,
    allow: [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/], // + brand config portalOrigins (fallback PORTAL_ORIGINS); exact origins or 'https://*.domain'
    connected: false, listening: false, origin: null, hold: false, info: null, log: [], _src: null, _seq: 0, _pending: {}, _h: {},
    on(type, fn) { (this._h[type] = this._h[type] || []).push(fn); return this; },
    _emit(type, m) { for (const f of this._h[type] || []) { try { f(m); } catch (e) { console.warn('[HX.Bridge] handler error', e); } } },
    allowed(origin) { const extra = ((brandCfg() && brandCfg().portalOrigins) || PORTAL_ORIGINS).map(o => (typeof o === 'string' && o.includes('*') ? new RegExp('^' + o.split('*.').map(x => x.replace(/[.]/g, '\\.')).join('([a-z0-9-]+\\.)+') + '$') : o));
      return this.allow.concat(extra).some(a => (a instanceof RegExp ? a.test(origin) : a === origin)); },
    framed() { try { return !!root.parent && root.parent !== root; } catch (e) { return true; } },
    listen() {
      if (this.listening || this.connected || !this.enabled || !root.addEventListener || !this.framed()) return false;
      this.listening = true; this._onMsg = (e) => this._recv(e); root.addEventListener('message', this._onMsg);
      this._timer = setTimeout(() => { if (!this.connected) { root.removeEventListener('message', this._onMsg); this.listening = false; if (HX.debug) console.debug('[HX.Bridge] no handshake; standalone'); } }, this.handshakeMs);
      return true;
    },
    buildHash() { const bc = buildCfg(); if (bc && bc.hash) return bc.hash; try { const sc = [...document.scripts].map(x => x.src).find(x => /app\.[a-f0-9]+\.js/.test(x)); return sc ? sc.match(/app\.([a-f0-9]+)\.js/)[1] : null; } catch (e) { return null; } },
    _recv(e) {
      const m = e.data; if (!m || typeof m !== 'object' || m.pv !== 1 || typeof m.type !== 'string') return;
      if (!this.connected) { if (m.type === 'hello' && e.source === root.parent && this.allowed(e.origin)) this._hello(e, m); return; }
      if (e.origin !== this.origin || e.source !== this._src) return;
      this.log.push({ dir: 'in', type: m.type, t: Date.now() }); if (this.log.length > 200) this.log.shift();
      const p = m.id != null && this._pending[m.id]; if (p && (/\.done$|\.ack$/.test(m.type))) { delete this._pending[m.id]; clearTimeout(p.timer); p.res(m); return; }
      switch (m.type) {
        case 'pause': this.setHold(true); break; case 'resume': this.setHold(false); break;
        case 'mute': Audio.setMuted(!!m.muted, false); break;
        case 'consent.update': this._consent(m); break;
        case 'save.sync': { const g = HX.Ads._game; if (g && g.save) g.save.applyRemote(m.json, m.rev); break; }
      }
      this._emit(m.type, m);
    },
    _hello(e, m) {
      clearTimeout(this._timer); this.connected = true; this.listening = false; this.origin = e.origin; this._src = e.source; this.info = { nonce: m.nonce, locale: m.locale || null, kidMode: !!m.kidMode };
      this.post({ pv: 1, id: m.id, type: 'hello.ack', nonce: m.nonce, engine: HX.VERSION, slug: T.slug, buildHash: this.buildHash(), caps: ['ads', 'track', 'save'] });
      this._consent(m); if (typeof m.muted === 'boolean') Audio.setMuted(m.muted, false);
      if (this.autoProvider) { HX.Ads.setProvider(this.provider()); HX.Ads.timeoutMs = Math.max(HX.Ads.timeoutMs, this.adTimeoutMs); if (HX.Ads._playing) this.send('gameplay', { state: 'start' }); }
      // Forward analytics: replay this session's already-recorded, consent-eligible events, then stream batches of ≤20.
      T.setSink((b) => { for (let i = 0; i < b.length; i += 20) this.send('track', { events: b.slice(i, i + 20).map(x => ({ event: x.event, data: x.props, ts: x.t, limited: x.limited || undefined })) }); }, { batchSize: 20, flushMs: 2000 });
      if (HX.consent.analyticsAllowed()) { for (const x of HX.events) if (!x.blocked && !INTERNAL.has(x.event)) T._q.push(x); T.flush(); }
      Save.hooks.push((sv) => { clearTimeout(this._saveT); this._saveT = setTimeout(() => this.send('save.put', { key: sv.key, json: JSON.stringify(sv.data), rev: sv.rev }), this.saveDebounceMs); });
      console.log('[HX.Bridge] connected to ' + e.origin); this._emit('hello', m);
    },
    _consent(m) { const c = m.consent, o = {};
      if (c && typeof c === 'object') { if ('analytics' in c) o.analytics = !!c.analytics; if ('ads_personalized' in c) o.personalizedAds = !!c.ads_personalized; if ('personalizedAds' in c) o.personalizedAds = !!c.personalizedAds; if ('kid' in c) o.childDirected = !!c.kid; }
      else if (typeof c === 'boolean') o.analytics = c;
      if ('kidMode' in m) o.childDirected = !!m.kidMode; if (Object.keys(o).length) HX.consent.set(o); },
    /** Portal pause/resume: freezes updates + input and silences audio (independent of ads and the in-game pause menu). */
    setHold(on) { this.hold = !!on; Audio._duck(HX.Ads.active); if (!on) { Audio.resume(); const g = HX.Ads._game; if (g && g._resetClock) g._resetClock(); } },
    post(m) { if (!this.connected || !this._src) return false; this.log.push({ dir: 'out', type: m.type, t: Date.now() }); if (this.log.length > 200) this.log.shift(); try { this._src.postMessage(m, this.origin); return true; } catch (e) { console.warn('[HX.Bridge] post failed', e); return false; } },
    send(type, payload) { return this.post(Object.assign({ pv: 1, id: 'g' + (++this._seq), type }, payload)); },
    /** Request/response; resolves the reply message, or {timeout:true}. Never rejects. */
    request(type, payload, ms) { return new Promise((res) => { if (!this.connected) return res({ timeout: true, offline: true }); const id = 'g' + (++this._seq);
      this._pending[id] = { res, timer: setTimeout(() => { delete this._pending[id]; res({ timeout: true }); }, ms || this.requestTimeoutMs) }; this.post(Object.assign({ pv: 1, id, type }, payload)); }); },
    /** The portal ad provider (ads render in the portal overlay; the engine still pauses/silences the game around them). */
    provider() { const B = this, to = (r) => (r && !r.timeout ? r : Promise.reject(new Error('timeout')));
      return { name: 'portal-bridge',
        breakPoint: (ctx) => B.request('ads.break', { placement: ctx.placement }, ctx.timeoutMs + 500).then(to).then(r => ({ shown: !!r.shown, format: r.format, reason: r.reason || (r.shown ? 'ok' : 'not-shown') })),
        rewarded: (ctx) => B.request('ads.rewarded', { placement: ctx.placement }, ctx.timeoutMs + 500).then(to).then(r => ({ shown: r.shown !== undefined ? !!r.shown : r.granted === true, rewarded: r.granted === true, reason: r.reason || (r.granted === true ? 'completed' : 'not-granted') })),
        canReward: (ctx) => B.request('ads.canReward', { placement: ctx.placement }, HX.Ads.canRewardTimeoutMs).then(r => !r.timeout && r.available === true),
        gameplayStart: () => B.send('gameplay', { state: 'start' }), gameplayStop: () => B.send('gameplay', { state: 'stop' }) }; }
  };

  /** Mock provider for testing (enable with ?mockads=1). Shows a DOM "Ad" overlay with a countdown.
   *  opts: {mode:'ok'|'hang'|'error'|'noshow'|'nofill', seconds:3, rewardedSeconds:5}. URL: ?mockads=1|hang|error|nofill&mockadsSec=3&mockpacing=0 */
  HX.Ads.MockProvider = function (opts = {}) {
    const o = Object.assign({ mode: 'ok', seconds: 3, rewardedSeconds: 5 }, opts);
    const show = (ctx, secs, rewarded) => {
      if (o.mode === 'hang') return new Promise(() => {}); if (o.mode === 'error') throw new Error('mock provider error'); if (o.mode === 'noshow' || o.mode === 'nofill') return { shown: false, rewarded: false, reason: 'no-fill' };
      return new Promise(res => {
        const d = document.createElement('div'); d.id = 'hx-mock-ad'; d.setAttribute('role', 'dialog');
        d.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(8,8,16,.94);color:#fff;font:700 18px system-ui,sans-serif;text-align:center;touch-action:none';
        d.innerHTML = '<div style="font:900 64px system-ui;letter-spacing:4px;border:4px solid #fff;padding:6px 26px;border-radius:14px">AD</div><div>Mock ' + (rewarded ? 'rewarded' : 'interstitial') + ' ad · ' + ctx.placement + '</div><div id="hx-mock-ad-count" style="font-size:22px;opacity:.85"></div>' + (rewarded ? '<button id="hx-mock-ad-skip" style="font:700 16px system-ui;padding:10px 18px;border-radius:12px;border:0;background:#444;color:#fff">Skip (no reward)</button>' : '');
        document.body.appendChild(d); let left = secs, done = false; const cnt = d.querySelector('#hx-mock-ad-count');
        const fin = (r) => { if (done) return; done = true; clearInterval(iv); d.remove(); res(r); };
        const tick = () => { cnt.textContent = 'Closes in ' + left + 's'; if (ctx.aborted) fin({ shown: true, reason: 'aborted' }); if (left-- <= 0) fin(rewarded ? { shown: true, rewarded: true, reason: 'completed' } : { shown: true, reason: 'completed' }); };
        const iv = setInterval(tick, 1000); tick();
        const sk = d.querySelector('#hx-mock-ad-skip'); if (sk) sk.addEventListener('click', () => fin({ shown: true, rewarded: false, reason: 'skipped' }));
      });
    };
    return { name: 'mock:' + o.mode, init() { return true; }, breakPoint: (ctx) => show(ctx, o.seconds, false), rewarded: (ctx) => show(ctx, o.rewardedSeconds, true), canReward: () => !['noshow', 'nofill', 'error'].includes(o.mode) };
  };

  /* ------------------------------------------------------------------- UI */
  const theme = HX.theme = {
    font: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    bgTop: '#1b1640', bgBottom: '#0b0a1f', letterbox: '#07061a',
    primary: ['#7c6cff', '#5a46e6', '#3d2bb3'], secondary: ['#2c2a5a', '#23214a', '#16143a'], accent: ['#ffd65a', '#ffb52e', '#c97a12'], danger: ['#ff6b8a', '#e64a6b', '#a3233f'],
    text: '#ffffff', muted: 'rgba(255,255,255,.65)', panel: 'rgba(20,18,52,.92)', panelEdge: 'rgba(255,255,255,.12)',
    displayFont: null // 1.2.1: display/heading stack (brand fonts); null → same as font
  };
  /** Brand web fonts (1.2.1). Faces come from the brand config (PLAYTOOM_BRAND.fonts: Latin-subset WOFF2 + OFL texts, copied by build.sh)
   *  and are registered with the FontFace API so nothing blocks startup: text draws with the system fallback until a face is ready
   *  (canvas redraws every frame, so there is no layout shift). On file:// (where Chrome blocks font loads) registration is skipped
   *  and the system stack is used. HX.Fonts.ready → Promise<boolean all loaded> (resolves false after timeoutMs). */
  HX.Fonts = {
    state: 'none', faces: [], loaded: [], timeoutMs: 1500, ready: Promise.resolve(false),
    init() {
      if (this._init) return this.ready; this._init = true; const b = brandCfg();
      if (!b || !b.fonts || !b.fonts.length || typeof FontFace === 'undefined' || !root.document || !document.fonts) return this.ready;
      if (root.location && root.location.protocol === 'file:') { this.state = 'file-fallback'; return this.ready; }
      const base = b.path || './brand/'; if (b.fontStacks) { if (b.fontStacks.ui) theme.font = b.fontStacks.ui; if (b.fontStacks.display) theme.displayFont = b.fontStacks.display; }
      try { this.faces = b.fonts.map(f => { const ff = new FontFace(f.family, `url("${base}${f.file}") format("woff2")`, { weight: String(f.weight), style: 'normal', display: 'swap' }); document.fonts.add(ff); return ff; }); } catch (e) { this.state = 'error'; return this.ready; }
      this.state = 'loading'; const t0 = HX.now();
      const all = Promise.all(this.faces.map(ff => ff.load().then(() => true, () => false))).then(r => { this.loaded = r; this.state = r.every(Boolean) ? 'loaded' : 'partial'; this.ms = Math.round(HX.now() - t0); return r.every(Boolean); });
      return (this.ready = Promise.race([all, new Promise(res => setTimeout(() => res(false), this.timeoutMs))]));
    }
  };
  const UI = HX.UI = {
    font(size, weight = 800, display = false) { return `${weight} ${size}px ${(display && theme.displayFont) || theme.font}`; },
    /** text(ctx, str, x, y, {size, color, align, baseline, weight, stroke, strokeWidth, shadow, maxWidth}) */
    text(ctx, s, x, y, o = {}) {
      ctx.font = UI.font(o.size || 28, o.weight || 800, o.display); ctx.textAlign = o.align || 'center'; ctx.textBaseline = o.baseline || 'middle';
      if (o.shadow) { ctx.save(); ctx.fillStyle = typeof o.shadow === 'string' ? o.shadow : 'rgba(0,0,0,.35)'; ctx.fillText(s, x, y + (o.shadowY || Math.max(2, (o.size || 28) / 12)), o.maxWidth); ctx.restore(); }
      if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeWidth || 6; ctx.strokeStyle = o.stroke; ctx.strokeText(s, x, y, o.maxWidth); }
      ctx.fillStyle = o.color || theme.text; ctx.fillText(s, x, y, o.maxWidth);
    },
    roundRect(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); },
    panel(ctx, x, y, w, h, o = {}) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
      UI.roundRect(ctx, x, y, w, h, o.radius || 28); ctx.fillStyle = o.fill || theme.panel; ctx.fill(); ctx.restore();
      ctx.lineWidth = 2; ctx.strokeStyle = o.edge || theme.panelEdge; UI.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, (o.radius || 28) - 1); ctx.stroke();
    },
    /** Background gradient fill for the full view. */
    background(ctx, W, H, top = theme.bgTop, bottom = theme.bgBottom) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120); },
    /** Procedural icons: pause, play, sound, mute, restart, home, star, lock, trophy, calendar, check, close, arrow */
    icon(ctx, name, x, y, s, color = '#fff', filled = true) {
      ctx.save(); ctx.translate(x, y); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; const h = s / 2;
      switch (name) {
        case 'pause': UI.roundRect(ctx, -h * .6, -h * .7, h * .42, h * 1.4, h * .12); ctx.fill(); UI.roundRect(ctx, h * .18, -h * .7, h * .42, h * 1.4, h * .12); ctx.fill(); break;
        case 'play': ctx.beginPath(); ctx.moveTo(-h * .45, -h * .7); ctx.lineTo(h * .7, 0); ctx.lineTo(-h * .45, h * .7); ctx.closePath(); ctx.fill(); break;
        case 'sound': case 'mute':
          ctx.beginPath(); ctx.moveTo(-h * .8, -h * .3); ctx.lineTo(-h * .4, -h * .3); ctx.lineTo(h * .05, -h * .75); ctx.lineTo(h * .05, h * .75); ctx.lineTo(-h * .4, h * .3); ctx.lineTo(-h * .8, h * .3); ctx.closePath(); ctx.fill();
          if (name === 'sound') { ctx.beginPath(); ctx.arc(h * .1, 0, h * .4, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(h * .1, 0, h * .75, -0.9, 0.9); ctx.stroke(); }
          else { ctx.beginPath(); ctx.moveTo(h * .35, -h * .35); ctx.lineTo(h * .85, h * .35); ctx.moveTo(h * .85, -h * .35); ctx.lineTo(h * .35, h * .35); ctx.stroke(); } break;
        case 'restart': ctx.beginPath(); ctx.arc(0, 0, h * .62, -Math.PI * .35, Math.PI * 1.45); ctx.stroke(); ctx.beginPath(); const ax = Math.cos(-Math.PI * .35) * h * .62, ay = Math.sin(-Math.PI * .35) * h * .62; ctx.moveTo(ax + h * .32, ay - h * .1); ctx.lineTo(ax - h * .05, ay - h * .38); ctx.lineTo(ax - h * .12, ay + h * .12); ctx.closePath(); ctx.fill(); break;
        case 'home': ctx.beginPath(); ctx.moveTo(-h * .8, -h * .05); ctx.lineTo(0, -h * .8); ctx.lineTo(h * .8, -h * .05); ctx.stroke(); UI.roundRect(ctx, -h * .55, -h * .15, h * 1.1, h * .9, h * .1); ctx.fill(); break;
        case 'star': ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? h * .42 : h * .95, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); filled ? ctx.fill() : ctx.stroke(); break;
        case 'lock': UI.roundRect(ctx, -h * .6, -h * .1, h * 1.2, h * .9, h * .15); ctx.fill(); ctx.beginPath(); ctx.arc(0, -h * .15, h * .38, Math.PI, 0); ctx.stroke(); break;
        case 'trophy': ctx.beginPath(); ctx.moveTo(-h * .55, -h * .75); ctx.lineTo(h * .55, -h * .75); ctx.lineTo(h * .45, -h * .1); ctx.quadraticCurveTo(0, h * .35, -h * .45, -h * .1); ctx.closePath(); ctx.fill(); ctx.fillRect(-h * .1, h * .1, h * .2, h * .35); UI.roundRect(ctx, -h * .45, h * .45, h * .9, h * .25, h * .06); ctx.fill(); ctx.beginPath(); ctx.arc(-h * .55, -h * .4, h * .25, Math.PI * .5, Math.PI * 1.5); ctx.arc(h * .55, -h * .4, h * .25, -Math.PI * .5, Math.PI * .5); ctx.stroke(); break;
        case 'calendar': UI.roundRect(ctx, -h * .75, -h * .6, h * 1.5, h * 1.4, h * .2); ctx.stroke(); ctx.fillRect(-h * .75, -h * .6, h * 1.5, h * .4); ctx.fillRect(-h * .45, -h * .9, h * .15, h * .4); ctx.fillRect(h * .3, -h * .9, h * .15, h * .4); break;
        case 'check': ctx.beginPath(); ctx.moveTo(-h * .6, 0); ctx.lineTo(-h * .15, h * .5); ctx.lineTo(h * .7, -h * .5); ctx.stroke(); break;
        case 'close': ctx.beginPath(); ctx.moveTo(-h * .55, -h * .55); ctx.lineTo(h * .55, h * .55); ctx.moveTo(h * .55, -h * .55); ctx.lineTo(-h * .55, h * .55); ctx.stroke(); break;
        case 'arrow': ctx.beginPath(); ctx.moveTo(-h * .6, 0); ctx.lineTo(h * .6, 0); ctx.moveTo(h * .15, -h * .5); ctx.lineTo(h * .6, 0); ctx.lineTo(h * .15, h * .5); ctx.stroke(); break;
        case 'back': ctx.beginPath(); ctx.moveTo(h * .6, 0); ctx.lineTo(-h * .6, 0); ctx.moveTo(-h * .15, -h * .5); ctx.lineTo(-h * .6, 0); ctx.lineTo(-h * .15, h * .5); ctx.stroke(); break;
      }
      ctx.restore();
    },
    /** Row of n stars (1.1). earned: array of booleans or a count. */
    starRow(ctx, x, y, size, earned, n = 3, gap = 1.25) { const on = (i) => Array.isArray(earned) ? earned[i] : i < earned; for (let i = 0; i < n; i++) UI.icon(ctx, 'star', x + (i - (n - 1) / 2) * size * gap, y, size, on(i) ? '#ffd65a' : 'rgba(255,255,255,.22)'); },
    /** Hexan brand mark (hexagon + wordmark). Original artwork. */
    brandMark(ctx, x, y, s = 1, o = {}) {
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      const hex = (r) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); };
      const gx = o.word === false ? 0 : -78;
      ctx.translate(gx, 0); const g = ctx.createLinearGradient(-20, -20, 20, 20); g.addColorStop(0, '#9d8cff'); g.addColorStop(1, '#ffcf5a');
      hex(22); ctx.fillStyle = g; ctx.fill(); hex(13); ctx.fillStyle = '#16133a'; ctx.fill(); hex(6); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.translate(-gx, 0);
      if (o.word !== false) UI.text(ctx, 'HEXAN', 18, 2, { size: 30, weight: 900, color: o.color || '#fff' });
      ctx.restore();
    }
  };

  /** Button: rounded, 3D-ish, press animation. style: 'primary'|'secondary'|'accent'|'danger'|'ghost'. icon: UI.icon name. */
  class Button {
    constructor(o) { Object.assign(this, { x: 0, y: 0, w: 220, h: 72, label: '', style: 'primary', icon: null, size: null, enabled: true, visible: true, radius: null, scale: 1, hover: false, pressed: false, sub: null }, o); }
    contains(px, py) { const pad = this.hitPad == null ? 6 : this.hitPad; return this.visible && px >= this.x - pad && px <= this.x + this.w + pad && py >= this.y - pad && py <= this.y + this.h + pad; }
    draw(ctx) {
      if (!this.visible) return; const cols = theme[this.style] || theme.primary, r = this.radius == null ? Math.min(this.h / 2, 26) : this.radius;
      const sc = this.scale * (this.pressed ? 0.94 : this.hover ? 1.03 : 1), cx = this.x + this.w / 2, cy = this.y + this.h / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy); ctx.globalAlpha *= this.enabled ? 1 : 0.45;
      const depth = this.style === 'ghost' ? 0 : Math.max(4, this.h * 0.08), py = this.pressed ? depth * .6 : 0;
      if (this.style === 'sound') { // high-contrast round speaker toggle; red when muted
        const off = Audio.muted; ctx.beginPath(); ctx.arc(cx, cy, this.w / 2, 0, 6.2832); ctx.fillStyle = off ? 'rgba(200,40,70,.92)' : 'rgba(12,10,36,.78)'; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = off ? '#ffb3c2' : 'rgba(255,255,255,.85)'; ctx.stroke();
        UI.icon(ctx, off ? 'mute' : 'sound', cx, cy, this.h * 0.5, '#fff'); ctx.restore(); return;
      }
      if (this.style === 'ghost') { UI.roundRect(ctx, this.x, this.y, this.w, this.h, r); ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.stroke(); }
      else {
        UI.roundRect(ctx, this.x, this.y + depth, this.w, this.h, r); ctx.fillStyle = cols[2]; ctx.fill();
        UI.roundRect(ctx, this.x, this.y + py, this.w, this.h, r); const g = ctx.createLinearGradient(0, this.y, 0, this.y + this.h); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]); ctx.fillStyle = g; ctx.fill();
        ctx.save(); ctx.clip(); ctx.globalAlpha *= .18; ctx.fillStyle = '#fff'; UI.roundRect(ctx, this.x + 6, this.y + py + 4, this.w - 12, this.h * .38, r * .7); ctx.fill(); ctx.restore();
      }
      const fs = this.size || Math.round(this.h * 0.4), tc = this.style === 'accent' ? '#3b2300' : '#fff';
      if (this.icon && !this.label) UI.icon(ctx, this.icon, cx, cy + py, this.h * 0.5, tc);
      else if (this.icon) { ctx.font = UI.font(fs); const tw = ctx.measureText(this.label).width, tot = tw + fs * 1.3; UI.icon(ctx, this.icon, cx - tot / 2 + fs * .45, cy + py, fs * 1.0, tc); UI.text(ctx, this.label, cx - tot / 2 + fs * 1.3, cy + py + 1, { size: fs, align: 'left', color: tc }); }
      else UI.text(ctx, this.label, cx, cy + py + 1 - (this.sub ? fs * .35 : 0), { size: fs, color: tc, maxWidth: this.w - 20 });
      if (this.sub) UI.text(ctx, this.sub, cx, cy + py + fs * .55, { size: fs * .5, color: this.style === 'accent' ? 'rgba(59,35,0,.75)' : 'rgba(255,255,255,.75)', weight: 700 });
      if (this.badge) { UI.icon(ctx, this.badge, this.x + this.w - 18, this.y + 18 + py, 22, '#fff'); }
      ctx.restore();
    }
  }
  HX.Button = Button;

  /* ---------------------------------------------------------------- Brand (1.2) */
  /** Platform splash + corner badge, driven by ONE brand config (engine/brand/brand.json → tools/brand-sync.js).
   *  build.sh inlines it as window.PLAYTOOM_BRAND (legacy alias PLAYVERSY_BRAND) = {name, wordmarkText, poweredBy, badgeText, colors, splash, badge, files:{mark, wordmark, badge}, favicons, path};
   *  un-built games get it from the dev shim <script src="../engine/brand/brand.js" data-pv-brand>. Only declared files are loaded (no 404 probing).
   *  Missing/failed assets → text fallback using the configured name. No brand config at all → splash skipped (nothing hard-coded here).
   *  Layout/timing follow the brand guide §7: violet radial glow + sparse stars, mark at 30% (27% portrait) of the short edge centred at 41%,
   *  gradient progress bar, "POWERED BY" + wordmark; min 0.8 s, max 1.5 s, 250 ms fade-out, skippable; badge ≥ 160 CSS px wide. */
  HX.Brand = {
    config: { enabled: true, splash: true, badge: false, duration: null, path: './brand/', files: null, fallback: 'text', badgeCorner: null, minShow: 0.35,
      name: null, wordmarkText: null, poweredBy: 'POWERED BY', badgeText: null, tagline: null, bg: null },
    state: { mode: 'pending', splashImg: null, markImg: null, wordmarkImg: null, badgeImg: null, loaded: false, shown: false, skipped: false, ms: 0 },
    configure(o = {}) { Object.assign(this.config, o); return this; },
    /** Effective brand: game overrides (configure) > window.PLAYTOOM_BRAND > defaults. */
    get b() { const m = brandCfg() || {}, c = this.config, pick = (k) => (c[k] != null ? c[k] : m[k]);
      const col = Object.assign({ bg: '#1A0F3A', glow: ['#3B1F86', '#22124D', '#1A0F3A'], surface: '#2D1B69', magenta: '#FF2E88', cyan: '#22D3F5', stardust: '#B9AEE6', bar: ['#FF2E88', '#9B5CFF', '#22D3F5'], barTrack: 'rgba(255,255,255,0.14)' }, m.colors || {});
      if (c.bg) col.bg = c.bg;
      return { name: pick('name'), wordmarkText: pick('wordmarkText') || pick('name'), poweredBy: pick('poweredBy'), badgeText: pick('badgeText') || pick('name'), tagline: pick('tagline'), colors: col,
        sp: Object.assign({ minSec: 0.8, maxSec: 1.5, fadeSec: 0.25, markShort: 0.30, markShortPortrait: 0.27, markCenterY: 0.41, barWidth: 0.36, barWidthPortrait: 0.56, barHeight: 0.022 }, m.splash || {}),
        badge: Object.assign({ minCssWidth: 160, corner: 'bl' }, m.badge || {}, c.badgeCorner ? { corner: c.badgeCorner } : {}) }; },
    hasConfig() { return !!this.b.name; },
    _manifest() { const m = brandCfg() || {}; return { path: this.config.files ? this.config.path : (m.path || this.config.path), files: this.config.files || m.files || [] }; },
    /** Asset URL for a role ('mark'|'wordmark'|'badge'); also accepts 1.2-early array manifests (pick by file name). */
    asset(role) { const { path, files } = this._manifest(); if (!files) return null;
      if (!Array.isArray(files)) return files[role] ? path + files[role] : null;
      const kinds = { mark: ['splash', 'logo', 'icon', 'mark'], wordmark: ['wordmark'], badge: ['badge', 'icon'] }[role] || [role], ext = ['svg', 'webp', 'png', 'jpg', 'jpeg'];
      for (const k of kinds) { const c = files.filter(f => new RegExp('^([a-z]+[-_])?' + k + '([._-]|$)', 'i').test(f)).sort((x, y) => ext.indexOf(x.split('.').pop()) - ext.indexOf(y.split('.').pop())); if (c.length) return path + c[0]; } return null; },
    pick(kinds) { return this.asset(kinds && kinds[0] === 'badge' ? 'badge' : 'mark'); }, // 1.2-early compat
    _load(src) { return new Promise(res => { if (!src || typeof Image === 'undefined') return res(null); const im = new Image(); const to = setTimeout(() => res(null), 1500); im.onload = () => { clearTimeout(to); res(im); }; im.onerror = () => { clearTimeout(to); res(null); }; im.src = src; }); },
    preload() { if (this._pre) return this._pre; return (this._pre = Promise.all(['mark', 'wordmark', 'badge'].map(r => this._load(this.asset(r))))
      .then(([m, w, bd]) => { Object.assign(this.state, { markImg: m, splashImg: m, wordmarkImg: w, badgeImg: bd, loaded: true }); return this.state; })); },
    /** Show the splash on game g (default HXGAME), then go to `next` scene (default the game's start scene). Resolves when done. */
    splash(g = root.HXGAME, next) { return new Promise(res => { if (!g) return res(false); g.go('hx-splash', { next: next || g.config.start, done: res }); }); },
    /** Text fallback wordmark (used only when the outlined wordmark/mark files are missing). */
    wordmark(ctx, x, y, s = 1, alpha = 1) { const b = this.b, C = b.colors; if (!b.wordmarkText) return;
      ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(s, s); ctx.font = UI.font(84, 700, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '-1px'; const w = ctx.measureText(b.wordmarkText).width;
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillText(b.wordmarkText, 0, 5); ctx.fillStyle = '#fff'; ctx.fillText(b.wordmarkText, 0, 0);
      // accent: a small play-triangle in the brand magenta after the word, and a magenta→cyan underline swoosh
      ctx.fillStyle = C.magenta; ctx.beginPath(); const tx = w / 2 + 22; ctx.moveTo(tx - 9, -16); ctx.lineTo(tx + 15, 0); ctx.lineTo(tx - 9, 16); ctx.closePath(); ctx.fill();
      const lg = ctx.createLinearGradient(-w / 2, 0, w / 2, 0); lg.addColorStop(0, C.magenta); lg.addColorStop(1, C.cyan); ctx.strokeStyle = lg; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-w * .42, 52); ctx.quadraticCurveTo(0, 64, w * .42, 50); ctx.stroke(); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'; ctx.restore(); },
    _spaced(ctx, txt, x, y, em) { if ('letterSpacing' in ctx) { ctx.letterSpacing = em + 'px'; ctx.fillText(txt, x + em / 2, y); ctx.letterSpacing = '0px'; } else ctx.fillText(txt.split('').join(String.fromCharCode(8202)), x, y); },
    _stars: null,
    drawSplash(ctx, W, H, k, prog, t, reduce) {
      const b = this.b, C = b.colors, sp = b.sp, S = Math.min(W, H), portrait = H > W, st = this.state;
      const gr = ctx.createRadialGradient(W / 2, H * sp.markCenterY, 0, W / 2, H * sp.markCenterY, Math.max(W, H) * .75); gr.addColorStop(0, C.glow[0]); gr.addColorStop(.45, C.glow[1]); gr.addColorStop(1, C.glow[2]);
      ctx.fillStyle = gr; ctx.fillRect(-50, -50, W + 100, H + 100);
      if (!this._stars) { const r = HX.RNG(20261027), n = () => r.next(); this._stars = Array.from({ length: 70 }, () => [n(), n(), n() * 1.6 + .6, n() * .6 + .2]); }
      ctx.fillStyle = '#fff'; for (const [sx, sy, sr, sa] of this._stars) { ctx.globalAlpha = sa * k; ctx.beginPath(); ctx.arc(sx * W, sy * H, sr, 0, 6.283); ctx.fill(); }
      ctx.globalAlpha = Math.max(0, k);
      const markH = S * (portrait ? sp.markShortPortrait : sp.markShort), cy = H * sp.markCenterY, bob = reduce ? 0 : Math.sin(t / 1.8 * 6.283) * markH * (6 / 1100);
      if (st.markImg) { const im = st.markImg, w = markH * im.width / im.height; ctx.drawImage(im, W / 2 - w / 2, cy - markH / 2 + bob, w, markH); }
      else this.wordmark(ctx, W / 2, cy, Math.min(1.5, S * .12 / 84));
      const bw = (portrait ? sp.barWidthPortrait : sp.barWidth) * S, bh = Math.max(4, sp.barHeight * S), by = cy + markH / 2 + S * .07;
      UI.roundRect(ctx, W / 2 - bw / 2, by, bw, bh, bh / 2); ctx.fillStyle = C.barTrack; ctx.fill();
      if (prog > 0) { const lg = ctx.createLinearGradient(W / 2 - bw / 2, 0, W / 2 + bw / 2, 0); C.bar.forEach((c, i) => lg.addColorStop(i / (C.bar.length - 1), c)); UI.roundRect(ctx, W / 2 - bw / 2, by, Math.max(bh, bw * prog), bh, bh / 2); ctx.fillStyle = lg; ctx.fill(); }
      if (!st.markImg && b.tagline) { const fs = Math.max(12, S * .03); ctx.font = UI.font(fs, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.stardust; ctx.fillText(b.tagline, W / 2, by + bh + S * .055); }
      if (b.poweredBy && (st.markImg || st.wordmarkImg)) { const fs = Math.max(11, S * .026); ctx.font = UI.font(fs, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.stardust; this._spaced(ctx, b.poweredBy, W / 2, by + bh + S * .05, fs * .18);
        const wy = by + bh + S * .1, wh = S * .062; if (st.wordmarkImg) { const im = st.wordmarkImg, ww = wh * im.width / im.height; ctx.drawImage(im, W / 2 - ww / 2, wy - wh * .2, ww, wh); }
        else { ctx.font = UI.font(wh * .8, 900); ctx.fillStyle = '#fff'; ctx.fillText(b.wordmarkText || '', W / 2, wy + wh * .3); } }
      ctx.globalAlpha = 1; },
    drawBadge(ctx, g) {
      const c = this.config, b = this.b; if (!c.enabled || !c.badge || !b.name) return; const img = this.state.badgeImg, sc = (g.view && g.view.scale) || 1;
      const minW = b.badge.minCssWidth / sc; let w, h; if (img) { w = Math.max(minW, 150); h = w * img.height / img.width; } else { h = Math.max(34, minW * .31); w = Math.max(minW, h * 3.2); }
      const m = Math.max(12, h * .3), corner = b.badge.corner, x = corner.includes('r') ? g.W - w - m : m, y = corner.includes('t') ? m : g.H - h - m;
      this.state.badgeRect = { x, y, w, h, cssW: Math.round(w * sc) };
      ctx.save();
      if (img) ctx.drawImage(img, x, y, w, h);
      else { UI.roundRect(ctx, x, y, w, h, h / 2); ctx.fillStyle = b.colors.surface; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (b.poweredBy && b.name) { ctx.fillStyle = b.colors.stardust; ctx.font = UI.font(h * .24, 800); this._spaced(ctx, b.poweredBy, x + w / 2, y + h * .32, h * .03); ctx.fillStyle = '#fff'; ctx.font = UI.font(h * .4, 900); ctx.fillText(b.name, x + w / 2, y + h * .66, w - h * .6); }
        else { ctx.fillStyle = '#fff'; ctx.font = UI.font(h * .38, 900); ctx.fillText(b.badgeText, x + w / 2, y + h / 2 + 1, w - h * .6); } }
      ctx.restore();
    }
  };
  const SplashScene = {
    pausable: false, hideMute: true, brandBadge: false,
    enter(d) { this.d = d || {}; this.t = 0; this.done = false; const B = HX.Brand, sp = B.b.sp; this.reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
      this.dur = clamp(B.config.duration != null ? B.config.duration : sp.minSec + sp.fadeSec, Math.max(.3, sp.minSec), Math.min(1.5, sp.maxSec)); this.fade = sp.fadeSec;
      this.ready = false; Promise.all([B.preload(), HX.Fonts.ready]).then(() => (this.ready = true)); B.state.shown = true; this.t0 = HX.now(); },
    finish(skipped) { if (this.done) return; this.done = true; const B = HX.Brand; B.state.skipped = !!skipped; B.state.ms = Math.round(HX.now() - this.t0); T('brand_splash', { mode: B.state.mode, skipped: !!skipped, ms: B.state.ms }); const d = this.d; this.game.go(d.next || this.game.config.start, null, { fade: .15 }); d.done && d.done(true); },
    // Waits ≤0.4 s for assets (counted inside the 1.5 s cap), then shows for `dur` (≥ minSec incl. the 250 ms fade-out).
    update(dt) { this.t += dt; if (!this.ready && this.t < .4) return; if (this.tShow == null) { this.tShow = this.t; const st = HX.Brand.state; st.mode = st.markImg ? 'image' : 'text'; this.dur = Math.min(this.dur, 1.5 - this.tShow); }
      if (this.t - this.tShow >= this.dur) this.finish(false); },
    pointerDown() { if (this.t > HX.Brand.config.minShow * .5) this.finish(true); }, keyDown() { this.finish(true); },
    draw(ctx) { const g = this.game, { W, H } = g, B = HX.Brand; if (this.tShow == null) { ctx.fillStyle = B.b.colors.bg; ctx.fillRect(-50, -50, W + 100, H + 100); return; }
      const ts = this.t - this.tShow, k = Math.max(0, Math.min(1, ts / .12, (this.dur - ts) / this.fade)), prog = Math.min(1, ts / Math.max(.1, this.dur - this.fade));
      B.drawSplash(ctx, W, H, k, prog, ts, this.reduce); }
  };

  /* ---------------------------------------------------------------- Input */
  class Input {
    constructor(game) {
      this.g = game; this.keys = new Set(); this.pressed = new Set(); this.pointers = new Map();
      this.p = { x: 0, y: 0, down: false, type: 'mouse', id: null, sx: 0, sy: 0, st: 0, moved: 0 };
      this.tapDist = 14; this.swipeDist = 50; this.swipeTime = 500;
      const c = game.canvas, opt = { passive: false };
      const P = (e) => this._pos(e);
      c.addEventListener('pointerdown', (e) => { e.preventDefault(); Audio.unlock('pointerdown'); try { c.setPointerCapture(e.pointerId); } catch (_) {} const q = P(e); this.pointers.set(e.pointerId, q);
        if (this.p.down && e.pointerType !== 'mouse') return; // ignore extra fingers for primary gestures
        Object.assign(this.p, { x: q.x, y: q.y, down: true, type: e.pointerType || 'mouse', id: e.pointerId, sx: q.x, sy: q.y, st: HX.now(), moved: 0 }); game._dispatch('pointerDown', this.p, e); }, opt);
      c.addEventListener('pointermove', (e) => { const q = P(e); if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, q);
        if (this.p.down && e.pointerId !== this.p.id) return; this.p.x = q.x; this.p.y = q.y; if (!this.p.down) this.p.type = e.pointerType || 'mouse';
        if (this.p.down) this.p.moved = Math.max(this.p.moved, Math.hypot(q.x - this.p.sx, q.y - this.p.sy)); game._dispatch('pointerMove', this.p, e); }, opt);
      const up = (e, cancel) => { this.pointers.delete(e.pointerId); if (!this.p.down || e.pointerId !== this.p.id) return; const q = P(e); this.p.x = q.x; this.p.y = q.y; this.p.down = false;
        const dt = HX.now() - this.p.st, dx = q.x - this.p.sx, dy = q.y - this.p.sy, d = Math.hypot(dx, dy);
        game._dispatch('pointerUp', this.p, e);
        if (cancel) return;
        if (this.p.moved < this.tapDist && dt < 400) game._dispatch('tap', this.p, e);
        else if (d > this.swipeDist && dt < this.swipeTime) { const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); game._dispatch('swipe', dir, this.p); }
      };
      c.addEventListener('pointerup', (e) => up(e, false), opt);
      c.addEventListener('pointercancel', (e) => up(e, true), opt);
      c.addEventListener('lostpointercapture', (e) => { if (this.p.down && e.pointerId === this.p.id) up(e, true); });
      c.addEventListener('contextmenu', e => e.preventDefault());
      // Block page scroll / pinch / double-tap zoom over the game.
      ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'gesturechange', 'dblclick'].forEach(ev => c.addEventListener(ev, e => { if (e.cancelable) e.preventDefault(); }, opt));
      const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'PageUp', 'PageDown'];
      root.addEventListener('keydown', (e) => { Audio.unlock('keydown'); if (GAME_KEYS.includes(e.code)) e.preventDefault(); if (!this.keys.has(e.code)) { this.pressed.add(e.code); game._dispatch('keyDown', e.code, e); } this.keys.add(e.code); });
      root.addEventListener('keyup', (e) => { this.keys.delete(e.code); game._dispatch('keyUp', e.code, e); });
      root.addEventListener('blur', () => { this.keys.clear(); if (this.p.down) { this.p.down = false; game._dispatch('pointerUp', this.p, null); } });
    }
    _pos(e) { const r = this.g.canvas.getBoundingClientRect(), v = this.g.view; return { x: (e.clientX - r.left - v.ox) / v.scale, y: (e.clientY - r.top - v.oy) / v.scale }; }
    isDown(...codes) { return codes.some(c => this.keys.has(c)); }
    wasPressed(...codes) { return codes.some(c => this.pressed.has(c)); }
    /** Axis helper: arrows / WASD → {x,y} in [-1,1]. */
    axis() { return { x: (this.isDown('ArrowRight', 'KeyD') ? 1 : 0) - (this.isDown('ArrowLeft', 'KeyA') ? 1 : 0), y: (this.isDown('ArrowDown', 'KeyS') ? 1 : 0) - (this.isDown('ArrowUp', 'KeyW') ? 1 : 0) }; }
    endFrame() { this.pressed.clear(); }
  }
  HX.Input = Input;

  /* ----------------------------------------------------------- Pause scene */
  const PauseScene = {
    overlay: true,
    enter() { this.t = 0; const g = this.game; this.buttons = [
      new Button({ label: 'Resume', icon: 'play', style: 'accent', onClick: () => g.resume() }),
      new Button({ label: 'Restart', icon: 'restart', style: 'primary', onClick: () => { g.pop(); const s = g.scene; s && s.restart ? s.restart() : g.go(g.scene.name, g.scene.data); } }),
      new Button({ label: 'Menu', icon: 'home', style: 'secondary', onClick: () => g.go(g.config.menuScene || g.config.start, null, { fade: .2 }) })
    ]; this.layout(); HX.Ads.gameplayStop(); },
    layout() { const { W, H } = this.game; const bw = Math.min(360, W - 80); this.buttons.forEach((b, i) => Object.assign(b, { x: W / 2 - bw / 2, y: H / 2 - 40 + i * 96, w: bw, h: 76 })); },
    resize() { this.layout(); },
    update(dt) { this.t += dt; },
    keyDown(code) { if (code === 'Escape' || code === 'KeyP') this.game.resume(); },
    draw(ctx) { const { W, H } = this.game; ctx.fillStyle = `rgba(6,5,20,${Math.min(.7, this.t * 4)})`; ctx.fillRect(-50, -50, W + 100, H + 100); UI.text(ctx, 'Paused', W / 2, H / 2 - 120, { size: 64, weight: 900, shadow: true }); }
  };

  /* ----------------------------------------------------------------- Game */
  /**
   * HX.createGame({
   *   slug, title, canvas?, parent?, layout: {mode:'adaptive', short:720, minAspect:1.25, maxAspect:2.2} | {mode:'fixed', width, height},
   *   scenes: {name: sceneObject}, start: 'title', menuScene, hud: {pause:true, mute:true}, saveDefaults, letterbox, maxDpr
   * })
   * Scene object hooks (all optional): enter(data), exit(), update(dt), draw(ctx), resize(W,H), pointerDown(p), pointerMove(p), pointerUp(p),
   *   tap(p), swipe(dir,p), keyDown(code), keyUp(code), restart(), buttons:[Button], hud:true, pausable:true, overlay:false
   */
  function createGame(cfg) {
    const g = { config: cfg, slug: cfg.slug, W: 1280, H: 720, portrait: false, view: { scale: 1, ox: 0, oy: 0, cssW: 0, cssH: 0, dpr: 1 }, time: 0, frame: 0, hitStopT: 0, stack: [], scenes: {}, paused: false };
    let canvas = cfg.canvas;
    if (!canvas) { canvas = document.createElement('canvas'); (cfg.parent || document.body).appendChild(canvas); }
    canvas.setAttribute('tabindex', '0'); canvas.style.touchAction = 'none'; canvas.style.outline = 'none';
    g.canvas = canvas; g.ctx = canvas.getContext('2d', { alpha: false });
    g.save = new Save(cfg.slug, cfg.saveDefaults); g.audio = Audio.init(g.save); g.tweens = new Tweens(); g.uiTweens = new Tweens(); g.fx = new FX(g); g.input = new Input(g);
    g.rng = HX.rng; g.ads = HX.Ads; g.daily = HX.Daily; g.brand = HX.Brand; g.track = HX.track;
    HX.Ads._game = g; T.slug = cfg.slug;
    // ?mockads=1|hang|error|noshow (&mockadsSec=N) installs the mock ad provider for testing.
    try { const q = new URLSearchParams(root.location.search); if (q.has('mockads') && q.get('mockads') !== '0') { const m = q.get('mockads'), sec = +q.get('mockadsSec') || 3; HX.Ads.setProvider(HX.Ads.MockProvider({ mode: ['hang', 'error', 'noshow', 'nofill'].includes(m) ? m : 'ok', seconds: sec, rewardedSeconds: sec + 2 })); if (q.get('mockpacing') === '0') HX.Ads.configure({ sessionGraceSec: 0, skipFirstGameOver: false }); } } catch (e) {}
    // pv-bridge/1 (opt-in): listens for a portal `hello` only when framed; standalone/file:// is unaffected. Disable with cfg.bridge:false or ?pvbridge=0.
    if (cfg.bridge !== false && !/[?&]pvbridge=0/.test((root.location && root.location.search) || '')) HX.Bridge.listen();
    // Brand: cfg.brand = true | {splash, badge, duration, ...}; omitted/false → no splash/badge (1.1 behaviour).
    if (cfg.brand && typeof cfg.brand === 'object') HX.Brand.configure(cfg.brand); const brandOn = !!cfg.brand && HX.Brand.config.enabled !== false && HX.Brand.hasConfig(); if (brandOn) HX.Brand.preload(); else if (cfg.brand) HX.Brand.state.mode = 'none';
    const pageEnd = (why) => T.sessionEnd(why); root.addEventListener('pagehide', () => pageEnd('pagehide')); root.addEventListener('beforeunload', () => pageEnd('beforeunload'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) T.flush(); });
    const layout = Object.assign({ mode: 'adaptive', short: 720, minAspect: 1.25, maxAspect: 2.2 }, cfg.layout || {});

    function resize() {
      const cssW = Math.max(1, root.innerWidth), cssH = Math.max(1, root.innerHeight), dpr = Math.min(root.devicePixelRatio || 1, cfg.maxDpr || 3);
      let W, H;
      if (layout.mode === 'fixed') { W = layout.width; H = layout.height; }
      else {
        const portrait = cssH > cssW, ar = clamp(portrait ? cssH / cssW : cssW / cssH, layout.minAspect, layout.maxAspect);
        if (portrait) { W = layout.short; H = Math.round(layout.short * ar); } else { H = layout.short; W = Math.round(layout.short * ar); }
      }
      const scale = Math.min(cssW / W, cssH / H);
      Object.assign(g.view, { scale, ox: (cssW - W * scale) / 2, oy: (cssH - H * scale) / 2, cssW, cssH, dpr });
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px'; canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      const changed = W !== g.W || H !== g.H; g.W = W; g.H = H; g.portrait = H > W;
      layoutHud();
      for (const s of g.stack) s.resize && s.resize(W, H);
      if (changed) HX.track('resize', { W, H });
    }
    g.resize = resize;

    // HUD buttons (pause + mute) ------------------------------------------
    const hudCfg = Object.assign({ pause: true, mute: true }, cfg.hud || {});
    g.hudButtons = [];
    const muteBtn = new Button({ icon: 'sound', style: 'sound', w: 68, h: 68, radius: 34, onClick: () => { Audio.toggleMute(); } });
    const pauseBtn = new Button({ icon: 'pause', style: 'ghost', w: 64, h: 64, radius: 20, onClick: () => g.pause() });
    if (hudCfg.mute) g.hudButtons.push(muteBtn); if (hudCfg.pause) g.hudButtons.push(pauseBtn);
    g.muteButton = muteBtn; g.pauseButton = pauseBtn;
    function layoutHud() { const m = 16; let x = g.W - m; for (const b of g.hudButtons.slice().reverse()) { x -= b.w; b.x = x; b.y = m; x -= 12; } }
    // Sound toggle is always visible (every scene, overlays too) unless a scene sets hideMute; pause shows on hud scenes that are pausable.
    const hudVisible = (b) => { const s = g.scene; if (!s) return false; if (b === muteBtn) return !s.hideMute; if (!s.hud) return false; return s.pausable !== false && !s.overlay; };

    // Scene management -----------------------------------------------------
    g.addScene = (name, s) => { s.name = name; s.game = g; g.scenes[name] = s; return s; };
    for (const k in (cfg.scenes || {})) g.addScene(k, cfg.scenes[k]);
    if (!g.scenes.pause) g.addScene('pause', Object.assign({}, PauseScene));
    HX.Fonts.init();
    if (!g.scenes['hx-splash']) g.addScene('hx-splash', Object.assign({}, SplashScene));
    Object.defineProperty(g, 'scene', { get: () => g.stack[g.stack.length - 1] || null });
    Object.defineProperty(g, 'base', { get: () => g.stack[0] || null });
    let fade = { a: 0 };
    g.go = (name, data, opt = {}) => {
      const doSwitch = () => { while (g.stack.length) { const s = g.stack.pop(); s.exit && s.exit(); } g.tweens.clear(); g.fx.clear(); g.hitStopT = 0; const s = g.scenes[name]; if (!s) throw new Error('No scene ' + name); s.data = data; g.stack.push(s); s.enter && s.enter(data); s.resize && s.resize(g.W, g.H); HX.track('scene', { name }); };
      if (opt.fade) { g.uiTweens.killOf(fade); g.uiTweens.to(fade, { a: 1 }, opt.fade / 2, { ease: 'linear' }).then(() => { doSwitch(); g.uiTweens.to(fade, { a: 0 }, opt.fade / 2, { ease: 'linear' }); }); }
      else doSwitch();
    };
    g.push = (name, data) => { const s = g.scenes[name]; s.data = data; g.stack.push(s); s.enter && s.enter(data); s.resize && s.resize(g.W, g.H); };
    g.pop = () => { const s = g.stack.pop(); s && s.exit && s.exit(); const t = g.scene; t && t.resumed && t.resumed(); return s; };
    g.pause = () => { const s = g.scene; if (!s || s.overlay || s.pausable === false || !s.hud && !s.pausable) return; g.paused = true; g.push('pause'); };
    g.resume = () => { if (g.scene && g.scene.name === 'pause') { g.pop(); g.paused = false; HX.Ads.gameplayStart(); } };

    g._dispatch = (type, a, b, force) => {
      if ((HX.Ads.active || HX.Bridge.hold) && !force) return; // input is frozen while an ad is in flight / portal paused
      const s = g.scene; if (!s) return;
      if (type === 'pointerDown' || type === 'pointerMove' || type === 'pointerUp') {
        const btns = [...(s.buttons || []), ...g.hudButtons.filter(hudVisible)];
        const p = a;
        if (type === 'pointerDown') { for (const bt of btns) if (bt.enabled && bt.contains(p.x, p.y)) { bt.pressed = true; g._btnCapture = bt; Audio.sfx('click'); return; } }
        else if (type === 'pointerMove') { if (p.type === 'mouse') for (const bt of btns) bt.hover = bt.contains(p.x, p.y); if (g._btnCapture) { g._btnCapture.pressed = g._btnCapture.contains(p.x, p.y); return; } }
        else if (g._btnCapture) { const bt = g._btnCapture; g._btnCapture = null; const hit = bt.pressed && bt.contains(p.x, p.y); bt.pressed = false; if (hit && bt.onClick) bt.onClick(bt); g._swallowTap = true; return; }
      }
      if (type === 'tap' && g._swallowTap) { g._swallowTap = false; return; }
      if (type === 'pointerDown') g._swallowTap = false;
      if (type === 'keyDown' && (a === 'KeyM')) { Audio.toggleMute(); }
      if (type === 'keyDown' && (a === 'Escape' || a === 'KeyP') && !s.overlay && s.pausable !== false && s.hud) { g.pause(); return; }
      s[type] && s[type](a, b);
    };

    // Visibility: auto pause + suspend audio --------------------------------
    document.addEventListener('visibilitychange', () => { if (document.hidden) { Audio.suspend(); g.pause(); } else Audio.resume(); });
    root.addEventListener('pageshow', () => Audio.resume()); root.addEventListener('focus', () => { if (!document.hidden) Audio.resume(); });
    root.addEventListener('resize', resize); root.addEventListener('orientationchange', () => setTimeout(resize, 120));
    if (root.visualViewport) root.visualViewport.addEventListener('resize', resize);

    // Loop ----------------------------------------------------------------
    const STEP = 1 / 60; let acc = 0, last = HX.now(), raf = 0; g.fps = 60;
    function update(dt) {
      if (HX.Ads.active || HX.Bridge.hold) return; // game time is frozen during ads / portal pause
      g.uiTweens.update(dt); muteBtn.icon = Audio.muted ? 'mute' : 'sound';
      if (g.hitStopT > 0) { g.hitStopT -= dt; g.fx.update(dt * 0.25); return; }
      const top = g.scene; if (!top) return;
      if (top.overlay) { top.update && top.update(dt); } else { g.tweens.update(dt); top.update && top.update(dt); }
      g.fx.update(dt); g.time += dt;
    }
    function draw() {
      const ctx = g.ctx, v = g.view, d = v.dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = cfg.letterbox || theme.letterbox; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(v.scale * d, 0, 0, v.scale * d, v.ox * d, v.oy * d);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, g.W, g.H); ctx.clip();
      ctx.save(); ctx.translate(g.fx.ox, g.fx.oy);
      const drawScene = (s) => { s.draw && s.draw(ctx); if (s.buttons) for (const b of s.buttons) b.draw(ctx); };
      if (g.stack[0]) drawScene(g.stack[0]);
      g.fx.draw(ctx);
      ctx.restore();
      for (let i = 1; i < g.stack.length; i++) drawScene(g.stack[i]);
      for (const b of g.hudButtons) if (hudVisible(b)) b.draw(ctx);
      if (brandOn && g.scene && (g.scene.brandBadge || (g.scene.name === (cfg.menuScene || cfg.start) && g.scene.brandBadge !== false))) HX.Brand.drawBadge(ctx, g);
      g.fx.drawFlash(ctx, g.W, g.H);
      if (fade.a > 0) { ctx.fillStyle = `rgba(7,6,26,${fade.a})`; ctx.fillRect(0, 0, g.W, g.H); }
      ctx.restore();
    }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      let dt = (t - last) / 1000; last = t; if (dt > 0.25) dt = 0.25; if (dt < 0) dt = 0; g.fps = g.fps * .95 + (dt > 0 ? 1 / dt : 60) * .05;
      acc += dt; let n = 0; while (acc >= STEP && n < 8) { update(STEP); acc -= STEP; n++; g.input.endFrame(); } if (n >= 8) acc = 0;
      g.alpha = acc / STEP; draw(); g.frame++;
    }
    g._resetClock = () => { last = HX.now(); acc = 0; };
    g.start = () => { resize(); T('game_load', { ms: Math.round(HX.now()), engine: HX.VERSION, w: g.W, h: g.H, dpr: g.view.dpr }); T('load_time', { ms: Math.round(HX.now()) }); const first = cfg.start || Object.keys(g.scenes)[0]; if (brandOn && HX.Brand.config.splash) g.go('hx-splash', { next: first }); else g.go(first); last = HX.now(); raf = requestAnimationFrame(frame); canvas.focus && canvas.focus({ preventScroll: true }); return g; };
    g.stop = () => cancelAnimationFrame(raf);
    /** Step the simulation manually (used by QA / tests). */
    g.step = (n = 1) => { for (let i = 0; i < n; i++) update(STEP); draw(); };
    g.wait = (s) => g.tweens.wait(s); g.tween = (...a) => g.tweens.to(...a);
    root.HXGAME = g;
    return g;
  }
  HX.createGame = createGame;

  /** Inject the standard full-screen page CSS (no scroll, no zoom, no selection). */
  HX.pageStyle = function () {
    const css = 'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:' + theme.letterbox + ';overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}body{position:fixed;inset:0}canvas{display:block;position:absolute;left:0;top:0}';
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  };

  root.HX = HX;
})(typeof window !== 'undefined' ? window : globalThis);
