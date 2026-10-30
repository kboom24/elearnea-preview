/* Mothabet: catch letters, spell the night. A reading + spelling game for kids (Phonics 4-6, Spelling 6-9) on Hexan Engine 1.2.1.
   Scenes: title, path (garden path of stages), goal (star card), play (the jar round), results, book (moth collection),
   gate (grown-ups hold gate), grown (dashboard + settings + share), share (card), challenge (incoming #mb link).
   Kid-safe: no chat, no accounts, no free text, no outbound links; sharing and settings live behind the grown-ups gate. */
(function () {
  'use strict';
  HX.pageStyle();
  const { UI, Button, Ads, Daily, Audio } = HX, C = MB.C, SLUG = 'elearnea-mothabet', TAU = Math.PI * 2;
  const clamp = MB.clamp, lerp = MB.lerp;
  Object.assign(HX.theme, { bgTop: '#16123f', bgBottom: '#14113a', letterbox: '#0b0920', panel: 'rgba(29,24,80,.96)',
    primary: ['#ffd36b', '#f5b335', '#a8740e'], secondary: ['#4a3f94', '#3a3184', '#221c58'], accent: ['#ffe48f', '#f5b335', '#b97c0e'], danger: ['#ff9a8a', '#f07a6a', '#9e3b33'] });
  // Child-directed by design: tell any ad/analytics provider (in memory only; the platform-wide consent key is not touched).
  try { if (HX.consent && HX.consent._s) HX.consent._s.childDirected = true; } catch (e) {}

  /* ------------------------------------------------------------------ helpers */
  let game, M = null; // M = MB.data(save)
  const U = () => 1 / (game.view.scale || 1);          // logical units per CSS px
  const T = () => Math.max(64, 64 * U());              // minimum touch target (64 CSS px)
  const FS = (css, min) => Math.max(min || 0, css * U());
  function safeIn() { let si = { t: 0, r: 0, b: 0, l: 0 }; try { const d = document.createElement('div'); d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'; document.body.appendChild(d); const cs = getComputedStyle(d); si = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 }; d.remove(); } catch (e) {} return si; }
  let SI = null; window.addEventListener('resize', () => { SI = null; }); window.addEventListener('orientationchange', () => { SI = null; });
  const SA = () => { SI = SI || safeIn(); const s = game.view.scale || 1; return { t: Math.max(0, SI.t - game.view.oy) / s, b: Math.max(0, SI.b - game.view.oy) / s, l: Math.max(0, SI.l - game.view.ox) / s, r: Math.max(0, SI.r - game.view.ox) / s }; };
  // Site exit tab: top-centre 60x48 CSS px below the safe-area top. Kept free of buttons and key HUD text.
  function zone() { SI = SI || safeIn(); const s = game.view.scale || 1; const w = 60 / s + 10, h = Math.max(48 / s, (48 + SI.t) / s - game.view.oy / s) + 8; return { x: game.W / 2 - w / 2, y: 0, w, h, r: game.W / 2 + w / 2, b: h }; }
  function hudFix() { const s = Math.max(64, T()), sa = SA(); let x = game.W - 14 - sa.r; for (const b of game.hudButtons.slice().reverse()) { b.w = b.h = s; if (b.style === 'sound') b.radius = s / 2; else b.radius = s * .3; x -= s; b.x = x; b.y = 12 + sa.t; x -= 10; } }
  const hudLeft = () => { let x = game.W; for (const b of game.hudButtons) x = Math.min(x, b.x); return x; };
  const hudBottom = () => 12 + SA().t + Math.max(64, 52 * U());
  const por = () => game.H > game.W * 1.1;
  const reduce = () => !!(game.save.data.settings && game.save.data.settings.reduceMotion);
  const say = (t, o) => MB.Voice.say(t, o);
  const voiceOn = () => MB.Voice.ok;

  /* ------------------------------------------------------------------ felt button */
  const BCOL = { gold: '#f5b335', mint: '#8fd6b4', coral: '#f07a6a', cream: '#f3e3c3', indigo: '#3a3184', lilac: '#a993d6', ghost: '#2a2370' };
  class FBtn extends Button {
    draw(ctx) {
      if (!this.visible) return; const col = BCOL[this.style] || BCOL.gold, dark = ['gold', 'mint', 'cream', 'lilac', 'coral'].includes(this.style);
      const cx = this.x + this.w / 2, cy = this.y + this.h / 2, sc = this.scale * (this.pressed ? .95 : this.hover ? 1.025 : 1);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy); ctx.globalAlpha *= this.enabled ? 1 : .5;
      if (this.glowPulse) MB.glow(ctx, cx, cy, Math.max(this.w, this.h) * .85, C.marigold, .5 + .25 * Math.sin(game.time * 3));
      MB.patch(ctx, this.x, this.y + (this.pressed ? 3 : 0), this.w, this.h, col, { r: this.radius == null ? Math.min(this.h * .3, 34) : this.radius, depth: this.pressed ? 2 : null });
      if (this.selected) { ctx.lineWidth = Math.max(4, this.h * .06); ctx.strokeStyle = '#fff7dc'; MB.rr(ctx, this.x - 7, this.y - 7, this.w + 14, this.h + 14, (this.radius == null ? Math.min(this.h * .3, 34) : this.radius) + 7); ctx.stroke(); }
      const tc = dark ? '#2a1f5c' : '#fff7dc', py = this.pressed ? 3 : 0; const fs = this.size || Math.round(this.h * .36);
      if (this.draw2) this.draw2(ctx, this, py, tc);
      else {
        const hasIcon = !!this.ico; let lx = cx;
        if (hasIcon && this.label) { ctx.font = UI.font(fs, 700, true); const tw = Math.min(ctx.measureText(this.label).width, this.w - this.h * 1.1), iw = this.h * .55, tot = iw + fs * .35 + tw; const ix = cx - tot / 2 + iw / 2; lx = ix + iw / 2 + fs * .35 + tw / 2; MB.icon(ctx, this.ico, ix, cy + py - (this.sub ? fs * .1 : 0), iw, tc); }
        else if (hasIcon) MB.icon(ctx, this.ico, cx, cy + py, this.h * .56, tc);
        if (this.label) UI.text(ctx, this.label, lx, cy + py - (this.sub ? fs * .36 : 0), { size: fs, color: tc, display: true, weight: 700, maxWidth: this.w - (hasIcon ? this.h * 1.0 : this.h * .4) });
        if (this.sub) UI.text(ctx, this.sub, lx, cy + py + fs * .62, { size: fs * .58, color: dark ? 'rgba(42,31,92,.8)' : 'rgba(255,247,220,.8)', weight: 800, maxWidth: this.w - (hasIcon ? this.h : 24) });
      }
      if (this.lock && !this.draw2) MB.icon(ctx, 'lock', this.x + this.w - this.h * .26, this.y + this.h * .28 + py, this.h * .3, dark ? '#2a1f5c' : '#fff7dc');
      ctx.restore();
    }
  }
  const B = (label, style, onClick, o) => new FBtn(Object.assign({ label, style, onClick }, o || {}));
  const place = (b, x, y, w, h) => Object.assign(b, { x, y, w, h });
  // audio label for non-readers: speak the button name (if voice is available) when pressed
  const spoken = (txt, fn) => () => { if (voiceOn()) say(txt, { rate: 1 }); fn(); };

  /* ------------------------------------------------------------------ sound + music */
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  const SFX = {
    letter(k) { const f = 523.25 * Math.pow(2, PENTA[Math.min(k, PENTA.length - 1)] / 12); Audio.tone({ type: 'sine', freq: f, dur: .35, vol: .2 }); Audio.tone({ type: 'triangle', freq: f * 2, dur: .2, vol: .06, delay: .03 }); },
    wrong() { Audio.tone({ type: 'triangle', freq: 300, to: 210, dur: .22, vol: .13 }); Audio.tone({ noise: true, dur: .12, vol: .05, filter: 1800, filterType: 'bandpass' }); },
    rustle() { Audio.tone({ noise: true, dur: .09, vol: .045, filter: 3500, filterType: 'bandpass', q: 1.2 }); },
    word() { [0, 4, 7, 12].forEach((s, i) => Audio.tone({ type: 'sine', freq: 659.25 * Math.pow(2, s / 12), dur: .45, vol: .14, delay: i * .07 })); Audio.tone({ type: 'triangle', freq: 1318.5, dur: .6, vol: .05, delay: .3 }); },
    hint() { [0, 7, 12].forEach((s, i) => Audio.tone({ type: 'sine', freq: 880 * Math.pow(2, s / 12), dur: .25, vol: .08, delay: i * .06 })); },
    moth() { [0, 4, 7, 11, 14, 19].forEach((s, i) => Audio.tone({ type: 'sine', freq: 523.25 * Math.pow(2, s / 12), dur: .6, vol: .12, delay: i * .08 })); },
    tick() { Audio.tone({ type: 'sine', freq: 1200, dur: .05, vol: .05 }); },
    tap() { Audio.tone({ type: 'sine', freq: 740, to: 880, dur: .08, vol: .08 }); },
    end() { [12, 7, 4, 0, 4, 7, 12].forEach((s, i) => Audio.tone({ type: 'sine', freq: 392 * Math.pow(2, s / 12), dur: .5, vol: .1, delay: i * .1 })); }
  };
  MB.musicVol = .3;
  const SONGS = {
    // gentle music-box lullaby in C major pentatonic (original)
    night: { bpm: 76, tracks: [
      { wave: 'sine', vol: .06, octave: 1, notes: [72, null, 76, null, 79, null, 76, null, 74, null, 72, null, 69, null, 72, null, 72, null, 76, null, 81, null, 79, null, 76, null, 74, null, 72, null, null, null] },
      { wave: 'triangle', vol: .05, len: 6, notes: [48, null, null, null, null, null, null, null, 45, null, null, null, null, null, null, null, 41, null, null, null, null, null, null, null, 43, null, null, null, null, null, null, null] },
      { wave: 'sine', vol: .025, octave: 2, notes: [null, null, null, null, 84, null, null, null, null, null, null, null, null, null, 88, null, null, null, null, null, 86, null, null, null, null, null, null, null, null, null, null, null] }] }
  };
  let curSong = null;
  function music(name) { const on = M && M.set.music && !Audio.muted; if (!on) { if (curSong) { Audio.stopMusic(); curSong = null; } return; } if (curSong === name) return; curSong = name; Audio.stopMusic(); Audio.music(SONGS[name]); if (Audio.musicGain) Audio.musicGain.gain.value = MB.musicVol; }

  /* ------------------------------------------------------------------ shared drawing */
  function backdrop(ctx, variant) { const { W, H } = game; ctx.drawImage(MB.garden(W, H, game.view.scale * game.view.dpr > 2.5 ? 2.5 : game.view.scale * game.view.dpr, { variant: variant || 'play' }), 0, 0, W, H); }
  function heading(ctx, txt, y) { const z = zone(); const left = 16 + SA().l + T() + 14; const maxW = Math.max(120, Math.min(z.x - left - 8, hudLeft() - left)); UI.text(ctx, txt, left, y, { size: FS(22, 34), align: 'left', color: C.gold, weight: 700, display: true, maxWidth: maxW }); }
  function backBtn(fn) { return B('', 'indigo', fn, { ico: 'back' }); }
  function placeBack(b) { const t = T(); place(b, 14 + SA().l, 12 + SA().t, t, t); }
  function pill(ctx, x, y, w, h, col) { MB.patch(ctx, x, y, w, h, col || '#231d5c', { r: h / 2, stitchCol: 'rgba(255,255,255,.28)', depth: 3 }); }
  // ambient fireflies
  const FLIES = []; for (let i = 0; i < 18; i++) FLIES.push({ x: Math.random(), y: Math.random(), p: Math.random() * TAU, s: .3 + Math.random() * .7 });
  function fireflies(ctx, t) { const { W, H } = game; for (const f of FLIES) { const x = (f.x * W + Math.sin(t * .3 * f.s + f.p) * 40), y = (f.y * H + Math.cos(t * .25 * f.s + f.p) * 30), a = .35 + .35 * Math.sin(t * 2 * f.s + f.p); MB.glow(ctx, x, y, 14 + 8 * f.s, C.gold, a); ctx.fillStyle = `rgba(255,240,180,${a})`; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, TAU); ctx.fill(); } }

  /* ------------------------------------------------------------------ TITLE */
  const Title = {
    hud: true, pausable: false, brandBadge: false,
    enter() {
      M = MB.data(game.save); this.t = 0; music('night'); const s = this;
      this.bPlay = B('PLAY', 'gold', spoken('Play!', () => s.play()), { glowPulse: true });
      this.bPh = B('Phonics', 'mint', spoken('Phonics', () => s.band('s')), { sub: '4-6', ico: 'ear' });
      this.bSp = B('Spelling', 'coral', spoken('Spelling', () => s.band('f')), { sub: '6-9', ico: 'pencil' });
      this.bJar = B('Daily Jar', 'cream', spoken('Daily jar', () => game.push('goal', { mode: 'jar', band: M.set.band })), { ico: 'calendar' });
      this.bBook = B('', 'indigo', spoken('Moth book', () => game.go('book', null, { fade: .2 })), { draw2: (ctx, b, py) => this.drawStats(ctx, b, py) });
      this.bGrown = B('Grown-ups', 'ghost', () => game.push('gate', { then: 'grown' }), { ico: 'lock', size: null });
      this.buttons = [this.bPlay, this.bPh, this.bSp, this.bJar, this.bBook, this.bGrown];
      const ch = null; if (ch && ch.ok && !this._chShown) { this._chShown = true; setTimeout(() => { if (game.scene === this) game.push('challenge', ch); }, 50); }
    },
    play() { const b = M.set.band, si = curStage(b); game.push('goal', { mode: 'stage', band: b, stage: si }); },
    band(b) { M.set.band = b; game.save.write(); game.go('path', { band: b }, { fade: .2 }); },
    resize(W, H) {
      hudFix(); const sa = SA(), t = T(), p = por(), gap = Math.max(14, 10 * U());
      // portrait: one column (logo, mascot, PLAY, tiles, stats). landscape: art on the left, controls on the right.
      const colX = p ? 20 + sa.l : W * .5, colW = p ? W - 40 - sa.l - sa.r : W * .5 - 24 - sa.r;
      const bw = Math.min(colW, p ? 640 : 620), x0 = colX + (colW - bw) / 2;
      let statH = Math.max(t * 1.1, 88), grownH = t, tileH = Math.max(t * 1.75, p ? 170 : 140), playH = Math.max(t * 1.35, p ? 130 : 104);
      const badgeW = 175 * U() + 30, gwid = clamp(W - 28 - sa.r - sa.l - badgeW, t * 2.2, Math.max(t * 3.2, 230));
      let y;
      if (p) { y = H - sa.b - 14 - grownH; place(this.bGrown, W - 14 - sa.r - gwid, y, gwid, grownH); }
      else { place(this.bGrown, 14 + sa.l, 12 + sa.t, Math.min(gwid, zone().x - 28 - sa.l), grownH); y = H - sa.b - 14 + gap; }
      // shrink to fit (never below one touch target)
      const avail = y - gap * 3.4 - Math.max(hudBottom() + 8, zone().b + 8), need = statH + tileH + playH;
      if (need > avail) { const k = Math.max(0, avail - t * 3) / Math.max(1, need - t * 3); statH = t + (statH - t) * k; tileH = t + (tileH - t) * k; playH = t + (playH - t) * k; }
      y -= gap + statH; place(this.bBook, x0, y, bw, statH);
      y -= gap + tileH; const tw = (bw - gap * 2) / 3; [this.bPh, this.bSp, this.bJar].forEach((b, i) => place(b, x0 + i * (tw + gap), y, tw, tileH));
      y -= gap * 1.4 + playH; const pw = Math.min(bw * .86, 520); place(this.bPlay, x0 + bw / 2 - pw / 2, y, pw, playH);
      if (!p) { // centre the control stack vertically in the right column
        const top = Math.max(hudBottom() + 8, zone().b + 8), stackTop = y, stackBot = this.bBook.y + statH, free = (this.bGrown.y - gap) - stackBot; const shift = Math.max(0, Math.min(free, (stackTop - top) / 2)) * 0;
        void shift; }
      this.bPlay.size = Math.round(playH * .5);
      [this.bPh, this.bSp, this.bJar].forEach(b => { b.size = Math.round(Math.min(tileH * .2, tw * .17)); });
      this.top = p ? zone().b + 4 : this.bGrown.y + this.bGrown.h + 10; this.playY = y; this.artX = p ? W / 2 : W * .25 + sa.l / 2; this.artW = p ? W : W * .5 - sa.l; this.artBot = p ? y : H - sa.b - 14 - FS(60, 60) * 0 - 80 * U();
      // tile contents: icon above label
      for (const b of [this.bPh, this.bSp, this.bJar]) { const ico = b.ico; b.draw2 = (ctx, bb, py, tc) => { const cx = bb.x + bb.w / 2, s = bb.size; MB.icon(ctx, ico, cx, bb.y + bb.h * .34 + py, Math.min(bb.h * .38, bb.w * .42), tc);
        UI.text(ctx, bb.label, cx, bb.y + bb.h * .68 + py, { size: s, color: tc, display: true, weight: 700, maxWidth: bb.w - 14 }); if (bb.sub) UI.text(ctx, bb.sub, cx, bb.y + bb.h * .86 + py, { size: s * .9, color: tc, display: true, weight: 700 }); }; }
    },
    drawStats(ctx, b, py) {
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + py, third = b.w / 3, fs = Math.min(b.h * .3, third * .16), s = MB.streakNow(M), got = Object.keys(M.moths).length;
      const cells = [[ 'flame', `${s} ${s === 1 ? 'day' : 'days'}`, null], ['jar', `${got}/${MB.mothCount()}`, 'moths'], ['star', String(Object.values(M.prof).reduce((a, p) => a + Object.values(p.stars || {}).reduce((x, y) => x + (y | 0), 0), 0)), 'stars']];
      cells.forEach(([ic, a, sub], i) => { const x = b.x + third * i; MB.icon(ctx, ic, x + third * .22, cy, Math.min(b.h * .55, third * .3)); UI.text(ctx, a, x + third * .62, cy - (sub ? fs * .38 : 0), { size: fs, color: '#fff7dc', weight: 900, maxWidth: third * .7 }); if (sub) UI.text(ctx, sub, x + third * .62, cy + fs * .62, { size: fs * .72, color: 'rgba(255,247,220,.75)', weight: 800, maxWidth: third * .7 });
        if (i) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, b.y + b.h * .2 + py); ctx.lineTo(x, b.y + b.h * .8 + py); ctx.stroke(); } });
    },
    keyDown(c) { if (c === 'Enter' || c === 'Space') this.play(); },
    update(dt) { this.t += dt; music('night'); },
    draw(ctx) {
      const { W, H } = game, t = this.t; backdrop(ctx, 'title'); fireflies(ctx, t); void H;
      const X = this.artX, AW = this.artW, top = this.top, avail = Math.max(60, this.artBot - top);
      const lsz = Math.max(30, Math.min(AW * .17, avail * (por() ? .2 : .19), 150));
      const ly = top + lsz * .75; MB.drawLogo(ctx, X, ly, lsz);
      const ry = ly + lsz * .78, rw = Math.max(80, Math.min(AW * .8, lsz * 4.4)), rh = Math.max(FS(16, 36), lsz * .36);
      MB.patch(ctx, X - rw / 2, ry - rh / 2, rw, rh, '#2a2370', { r: rh / 2, stitchCol: 'rgba(255,255,255,.25)' });
      UI.text(ctx, 'catch letters, spell the night', X, ry, { size: rh * .48, color: '#fff7dc', weight: 700, display: true, maxWidth: rw - 30 });
      const my = ry + rh / 2 + (this.artBot - (ry + rh / 2)) * .5, mr = Math.min((this.artBot - ry - rh) * .32, AW * .17);
      if (mr > 26) { MB.drawMascot(ctx, X, my, mr, t, 'happy');
        const lm = [['A', C.marigold, -1.55, -.55], ['b', C.rose, 1.55, -.6], ['c', C.mint, 1.35, .45]]; lm.forEach(([l, col, ox, oy], i) => { const R = mr * .38; MB.drawMoth(ctx, X + ox * mr * 1.1 + Math.sin(t * 1.3 + i) * 8, my + oy * mr + Math.cos(t * 1.1 + i * 2) * 8, R, { col, label: l, open: .7 + .3 * Math.sin(t * 5 + i), glowA: .8 }); }); }
    }
  };
  function curStage(b) { const st = MB.STAGES[b], p = M.prof[b]; let si = 0; for (let i = 0; i < st.length; i++) { if (unlockedStage(b, i)) si = i; } // first unlocked without 3 stars, else last unlocked
    for (let i = 0; i <= si; i++) if ((p.stars[st[i].id] | 0) < 1) return i; return si; }
  function unlockedStage(b, i) { if (i === 0) return true; const st = MB.STAGES[b]; return (M.prof[b].stars[st[i - 1].id] | 0) >= 1; }

  /* ------------------------------------------------------------------ PATH (garden path of stages) */
  const Path = {
    hud: true, pausable: false,
    enter(d) { this.band = d.band; this.t = 0; music('night'); this.bBack = backBtn(() => game.go('title', null, { fade: .2 }));
      this.bOther = B(d.band === 's' ? 'Spelling' : 'Phonics', d.band === 's' ? 'coral' : 'mint', spoken(d.band === 's' ? 'Spelling' : 'Phonics', () => { M.set.band = d.band === 's' ? 'f' : 's'; game.save.write(); game.go('path', { band: M.set.band }, { fade: .15 }); }), { ico: d.band === 's' ? 'pencil' : 'ear' });
      const st = MB.STAGES[this.band]; this.nodes = st.map((s, i) => B(String(i + 1), unlockedStage(this.band, i) ? (this.band === 's' ? 'mint' : 'coral') : 'indigo', () => this.open(i), { lock: !unlockedStage(this.band, i), stage: s, idx: i }));
      this.nodes.forEach(n => { n.draw2 = (ctx, b, py, tc) => this.drawNode(ctx, b, py, tc); });
      this.buttons = [this.bBack, this.bOther, ...this.nodes]; },
    open(i) { if (!unlockedStage(this.band, i)) { SFX.wrong(); if (voiceOn()) say('Earn a star on the stage before to open this one.'); this.shake = { i, t: .4 }; return; } game.push('goal', { mode: 'stage', band: this.band, stage: i }); },
    resize(W, H) { hudFix(); placeBack(this.bBack); const sa = SA(), t = T(), n = this.nodes.length, p = por();
      const top = hudBottom() + 10, bot = H - sa.b - 14 - t - 14, cols0 = p ? 2 : (W > H * 1.6 ? 4 : 3), cols = (() => { let c = cols0; while (c < (p ? 3 : 7) && Math.ceil(n / c) * t * 1.3 > bot - top) c++; return c; })(), rows = Math.ceil(n / cols);
      const gw = W - 32 - sa.l - sa.r, cw = gw / cols, ch = Math.max(t * 1.3, (bot - top) / rows), nh = Math.min(ch - 14, Math.max(t * 1.25, 120)), nw = Math.min(cw - 18, 330);
      this.nodes.forEach((b, i) => { const r = Math.floor(i / cols), c0 = i % cols, c = r % 2 ? cols - 1 - c0 : c0; place(b, 16 + sa.l + c * cw + (cw - nw) / 2, top + r * ch + (ch - nh) / 2, nw, nh); });
      place(this.bOther, W / 2 - Math.max(t * 3.6, 260) / 2, H - sa.b - 14 - t, Math.max(t * 3.6, 260), t); },
    drawNode(ctx, b, py, tc) { const s = b.stage, stars = M.prof[this.band].stars[s.id] | 0, h = b.h, nar = b.w < h * 2.3, cr = h * (nar ? .25 : .32), cx = b.x + (nar ? h * .36 : h * .5), cy = b.y + h / 2 + py;
      MB.glow(ctx, cx, cy, cr * 1.7, C.gold, b.lock ? 0 : .45); ctx.fillStyle = b.lock ? '#2a2370' : '#fff7dc'; ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fill();
      UI.text(ctx, b.lock ? '' : String(b.idx + 1), cx, cy + 1, { size: cr, color: '#2a1f5c', weight: 700, display: true }); if (b.lock) MB.icon(ctx, 'lock', cx, cy, cr * 1.06, '#a993d6');
      const tx = nar ? b.x + h * .7 : b.x + h * .95, tw = b.x + b.w - tx - h * .08; UI.text(ctx, s.name, tx, b.y + h * .32 + py, { size: Math.min(h * .24, FS(17, 26)), align: 'left', color: tc, weight: 700, display: true, maxWidth: tw });
      UI.text(ctx, s.sub, tx, b.y + h * .54 + py, { size: Math.min(h * .17, FS(13, 20)), align: 'left', color: tc, weight: 800, maxWidth: tw });
      UI.starRow(ctx, tx + Math.min(h * .45, tw / 2) - 4, b.y + h * .78 + py, Math.min(h * .18, tw / 4), stars, 3); },
    update(dt) { this.t += dt; if (this.shake) { this.shake.t -= dt; if (this.shake.t <= 0) this.shake = null; } },
    keyDown(c) { if (c === 'Escape' || c === 'Backspace') game.go('title', null, { fade: .2 }); if (c === 'Enter' || c === 'Space') this.open(curStage(this.band)); },
    draw(ctx) { backdrop(ctx); fireflies(ctx, this.t); const W = game.W; const band = MB.BANDS[this.band];
      heading(ctx, `${band.name} ${band.sub}`, this.bBack.y + this.bBack.h / 2);
      // dotted path linking the nodes
      ctx.save(); ctx.setLineDash([10, 12]); ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,231,163,.35)'; ctx.beginPath(); this.nodes.forEach((b, i) => { const x = b.x + b.h * .5, y = b.y + b.h / 2; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
      const cur = curStage(this.band), cb = this.nodes[cur]; if (cb) { const bob = Math.sin(this.t * 3) * 6; MB.drawMoth(ctx, cb.x + cb.w - cb.h * .2, cb.y + bob, Math.max(22, cb.h * .2), { col: C.marigold, open: .6 + .4 * Math.sin(this.t * 7), glowA: .6 }); }
      if (this.shake) { const b = this.nodes[this.shake.i]; ctx.strokeStyle = C.coral; ctx.lineWidth = 4; MB.rr(ctx, b.x - 4 + Math.sin(this.t * 60) * 4, b.y - 4, b.w + 8, b.h + 8, 30); ctx.stroke(); }
      void W; }
  };

  /* ------------------------------------------------------------------ GOAL card (overlay) */
  const Goal = {
    overlay: true, hud: true, pausable: false,
    enter(d) { this.d = d; this.t = 0; const s = this; const today = Daily.key();
      if (d.mode === 'jar') { this.jarDone = M.jar[d.band + ':' + today]; }
      this.bGo = B(d.mode === 'jar' && this.jarDone ? 'Practice' : 'Go!', 'gold', spoken('Go!', () => s.go()), { ico: 'next', glowPulse: true });
      this.bX = B('', 'indigo', () => game.pop(), { ico: 'close' });
      this.buttons = [this.bGo, this.bX];
      if (d.mode === 'jar') { this.bBs = B('Phonics', 'mint', spoken('Phonics', () => this.setBand('s')), { ico: 'ear' }); this.bBf = B('Spelling', 'coral', spoken('Spelling', () => this.setBand('f')), { ico: 'pencil' }); this.buttons.push(this.bBs, this.bBf); this.bBs.selected = d.band === 's'; this.bBf.selected = d.band === 'f'; }
      if (voiceOn()) say(d.mode === 'jar' ? 'The daily jar. Everyone gets the same ten words today.' : 'Catch the letter moths. Put them in the jar.', { rate: 1 });
    },
    setBand(b) { this.d.band = b; M.set.band = b; game.save.write(); this.enter(this.d); this.resize(game.W, game.H); },
    go() { const d = this.d; game.pop(); if (d.mode === 'jar') game.go('play', { mode: 'jar', band: d.band, practice: !!this.jarDone }, { fade: .2 }); else game.go('play', { mode: 'stage', band: d.band, stage: d.stage, seed: d.seed }, { fade: .2 }); },
    resize(W, H) { hudFix(); const t = T(), pw = Math.min(W - 40, 640), ph = Math.min(H - hudBottom() - 30, Math.max(560, t * 7.5)); this.px = W / 2 - pw / 2; this.py = Math.max(hudBottom() + 6, H / 2 - ph / 2); this.pw = pw; this.ph = ph;
      const gw = Math.min(pw - 60, 420); place(this.bGo, W / 2 - gw / 2, this.py + ph - t * 1.3 - 26, gw, t * 1.3); this.bGo.size = Math.round(t * .5);
      place(this.bX, this.px + pw - t - 12, this.py + 12, t, t);
      if (this.bBs) { const bw = (pw - 60) / 2; place(this.bBs, this.px + 20, this.bGo.y - t - 22, bw, t); place(this.bBf, this.px + 40 + bw, this.bGo.y - t - 22, bw, t); } },
    keyDown(c) { if (c === 'Enter' || c === 'Space') this.go(); if (c === 'Escape') game.pop(); },
    update(dt) { this.t += dt; },
    draw(ctx) { const { W, H } = game, d = this.d; ctx.fillStyle = 'rgba(8,6,28,.62)'; ctx.fillRect(0, 0, W, H);
      MB.patch(ctx, this.px, this.py, this.pw, this.ph, '#251f63', { r: 40 }); const cx = W / 2; let y = this.py + 70; const fs = FS(18, 30);
      if (d.mode === 'jar') { const key = Daily.key(); UI.text(ctx, `Daily Jar #${MB.jarNo(key)}`, cx, y, { size: fs * 1.25, color: C.gold, weight: 700, display: true, maxWidth: this.pw - 150 }); y += fs * 1.3;
        UI.text(ctx, 'The same 10 words for everyone today', cx, y, { size: fs * .72, color: '#fff7dc', weight: 800, maxWidth: this.pw - 60 }); y += fs * 1.2;
        MB.drawJar(ctx, cx, y + fs * 2.3, fs * 4, fs * 4.2, .7 + .3 * Math.sin(this.t * 2), this.t);
        if (this.jarDone) UI.text(ctx, `Done today: ${this.jarDone.right}/10 · ${this.jarDone.score}`, cx, y + fs * 5.2, { size: fs * .75, color: C.mint, weight: 900 });
        else UI.text(ctx, `Streak: ${Daily.status(game.save).streak} 🔥`, cx, y + fs * 5.2, { size: fs * .75, color: '#fff7dc', weight: 900 });
        return; }
      const st = MB.STAGES[d.band][d.stage]; UI.text(ctx, `${d.stage + 1}. ${st.name}`, cx, y, { size: fs * 1.25, color: C.gold, weight: 700, display: true, maxWidth: this.pw - 150 }); y += fs * 1.15;
      UI.text(ctx, `${MB.BANDS[d.band].name} · ${st.sub}`, cx, y, { size: fs * .72, color: '#fff7dc', weight: 800, maxWidth: this.pw - 60 }); y += fs * 1.25;
      const have = M.prof[d.band].stars[st.id] | 0; const rows = MB.STAR_RULES;
      const avail = this.bGo.y - 20 - y, rh = Math.min(avail / 3.4, fs * 2.1);
      rows.forEach((r, i) => { const ry = y + rh * (i + .5); const on = have > i; MB.icon(ctx, 'star', this.px + 60, ry, rh * .62); if (!on) { ctx.fillStyle = 'rgba(37,31,99,.55)'; ctx.beginPath(); ctx.arc(this.px + 60, ry, rh * .33, 0, TAU); ctx.fill(); }
        UI.text(ctx, r.text, this.px + 60 + rh * .55, ry, { size: Math.min(fs * .85, rh * .42), align: 'left', color: on ? C.gold : '#fff7dc', weight: 900, maxWidth: this.pw - 130 - rh * .55 }); });
      const pm = MB.drawMoth; pm(ctx, this.px + this.pw - 70, y + rh * 3.2, Math.min(40, rh * .5), { col: C.mint, label: 'a', open: .6 + .4 * Math.sin(this.t * 6) });
    }
  };

  /* ------------------------------------------------------------------ PLAY: the jar round */
  const ROUND_SEC = 90, ROUND_WORDS = 10;
  const MOTH_COLS = [C.mint, C.marigold, C.coral, C.lilac, C.rose, '#7cc8c8', C.cream];
  const Play = {
    hud: true, pausable: true,
    enter(d) {
      M = MB.data(game.save); this.cfg = d; this.band = d.band; this.mode = d.mode; this.t = 0; this.over = false;
      const today = Daily.key(); this.seed = d.seed != null ? d.seed >>> 0 : (Date.now() ^ (Math.random() * 1e9)) >>> 0; this.rng = HX.RNG(this.seed);
      if (d.mode === 'jar') { this.items = MB.pickJar(this.band, today); this.stage = -1; this.dFixed = MB.JAR_D[this.band]; HX.track.dailyStart({ band: this.band, jar: MB.jarNo(today) }); }
      else { this.stage = d.stage | 0; this.items = MB.pickRound(M, this.band, this.stage, HX.RNG(this.seed), ROUND_WORDS); this.dFixed = null; HX.track.levelStart(this.stage + 1, { band: this.band }); }
      M.stats.started++; game.save.write(); // rounds started vs finished (grown-ups dashboard); also persists first-launch settings
      this.queue = this.items.map(it => ({ it, retry: false })); this.idx = -1; this.results = []; // per word {it, perfect, helped, done}
      this.time = ROUND_SEC; this.score = 0; this.combo = 0; this.bestCombo = 0; this.moths = []; this.slots = []; this.jarGlow = 0; this.jarShake = 0; this.flash = 0; this.hintsUsed = 0;
      this.drag = null; this.look = 0; this.phase = 'ready'; this.pt = 0; this.cheer = 0;
      this.bSpeak = B('', 'cream', () => this.prompt(true), { radius: null }); this.bSpeak.draw2 = (ctx, b, py) => this.drawSpeaker(ctx, b, py);
      this.bHint = B('', 'gold', () => this.hint(), {}); this.bHint.draw2 = (ctx, b, py) => this.drawHint(ctx, b, py);
      this.buttons = [this.bSpeak, this.bHint];
      HX.track.gameStart({ mode: d.mode, band: this.band, stage: this.stage });
      music('night');
      this.resize(game.W, game.H); this.nextWord();
    },
    exit() { MB.Voice.stop(); },
    restart() { game.go('play', Object.assign({}, this.cfg, { seed: this.cfg.mode === 'challenge' ? this.cfg.seed : undefined }), { fade: .12 }); },
    get word() { return this.queue[this.idx]; },
    tuning() { const w = this.word; return MB.tuning(this.dFixed != null ? this.dFixed : M.prof[this.band].d, w.it, w.retry); },
    resize(W, H) {
      hudFix(); const sa = SA(), t = T(), p = por(), z = zone();
      this.R = Math.max(54, 33 * U());
      this.timerR = Math.max(t * .5, 44); this.timerX = 14 + sa.l + this.timerR; this.timerY = 12 + sa.t + this.timerR;
      const rowB = Math.max(this.timerY + this.timerR, hudBottom());
      const sp = Math.max(t * 1.25, p ? 150 : 128); // speaker button size
      const hintS = Math.max(t * 1.35, 120), dotsH = Math.max(FS(7, 12), 11) * 3.8; // = the progress pill's drawn height
      this.dotsY = H - sa.b - 14 - dotsH / 2;
      if (p) {
        place(this.bSpeak, W / 2 - sp / 2, Math.max(rowB + 14, z.b + 8), sp, sp);
        place(this.bHint, W / 2 - hintS * .6, this.dotsY - dotsH / 2 - 22 - hintS, hintS * 1.2, hintS);
        this.jarCX = W / 2; const top = this.bSpeak.y + sp + 70, bot = this.bHint.y - 30; this.jarCY = (top + bot) / 2 + 10; this.jarMaxH = Math.min(bot - top, W * .62, H * .36); this.jarMaxW = W - 60 - sa.l - sa.r;
        this.picX = this.bSpeak.x + sp + (W - (this.bSpeak.x + sp)) / 2 - 10; this.picY = this.bSpeak.y + sp / 2; this.picS = Math.min(sp * .95, (W - this.bSpeak.x - sp) * .7);
      } else {
        const colX = Math.max(14 + sa.l + sp * .1, W * .16 - sp / 2);
        place(this.bSpeak, colX, Math.max(rowB + 18, H * .2), sp, sp);
        place(this.bHint, 14 + sa.l + 6, this.dotsY - dotsH / 2 - 22 - hintS, hintS * 1.2, hintS);
        const fs = FS(15, 28); this.lineY = Math.max(rowB - this.timerR * .2, z.b + fs * .8); const jtop = this.lineY + fs * 1.4; this.jarCX = W / 2 + W * .04; this.jarMaxH = Math.min((this.dotsY - 26 - jtop) / 1.3, H * .52, W * .4); this.jarCY = jtop + this.jarMaxH * .3 + this.jarMaxH / 2; this.jarMaxW = W * .55;
        this.picX = colX + sp / 2; this.picY = this.bSpeak.y + sp + Math.min(sp * .7, 110); this.picS = Math.min(sp * .9, 150);
        if (this.picY + this.picS / 2 > this.bHint.y - 10) this.picY = this.bHint.y - 10 - this.picS / 2;
      }
      this.layoutJar(); for (const m of this.moths) this.clampMoth(m);
    },
    layoutJar() {
      const n = this.word ? this.word.it.tiles.length : 3, wide = this.word && this.word.it.tiles.some(x => x.length > 1);
      const ts = Math.min(this.jarMaxW * .82 / n, this.jarMaxH * .26, 118) * (wide ? 1.05 : 1);
      const jw = clamp(Math.max(this.jarMaxH * .7, ts * n / .78), 200, this.jarMaxW), jh = clamp(jw * 1.08, 220, this.jarMaxH);
      this.jar = { cx: this.jarCX, cy: this.jarCY, w: jw, h: jh, x: this.jarCX - jw / 2, y: this.jarCY - jh / 2 };
      this.tile = ts; const tw = ts * .92;
      this.slotPos = []; const total = n * ts, x0 = this.jarCX - total / 2 + ts / 2, sy = this.jarCY + jh * .08;
      for (let i = 0; i < n; i++) this.slotPos.push({ x: x0 + i * ts, y: sy, w: tw, h: Math.min(ts * 1.05, jh * .3) });
    },
    tipOn() { const it = this.word && this.word.it; return !!it && !voiceOn() && this.idx === 0 && this.t < 6 && (it.kind === 'spell' || it.kind === 'build'); },
    tipRect() { const j = this.jar, fs = FS(15, 28), tw = Math.min(game.W - 40, fs * .8 * 22), y = Math.min(j.y + j.h + fs * 1.3, this.dotsY - Math.max(FS(7, 12), 11) * 1.9 - fs * .75 - 12); return { x: j.cx - tw / 2, y: y - fs * .75, w: tw, h: fs * 1.5, cy: y, fs }; },
    drawTip(ctx) { if (!this.tipOn()) return; const r = this.tipRect(), a = Math.min(1, (6 - this.t) * 2);
      ctx.save(); ctx.globalAlpha = a; MB.rr(ctx, r.x - 10, r.y, r.w + 20, r.h, r.h / 2); ctx.fillStyle = 'rgba(16,13,46,.72)'; ctx.fill();
      UI.text(ctx, 'Look at the word, then catch its letters!', this.jar.cx, r.cy, { size: r.fs * .8, color: 'rgba(255,247,220,.92)', weight: 800, maxWidth: r.w }); ctx.restore(); },
    blockers() { const pad = this.R * .6, j = this.jar, r = [];
      const jb = { x: j.x - pad, y: j.y - j.h * .25 - pad, w: j.w + pad * 2, h: j.h * 1.25 + pad * 2 };
      if (this.tipOn()) { const tr = this.tipRect(), x0 = Math.min(jb.x, tr.x - pad), x1 = Math.max(jb.x + jb.w, tr.x + tr.w + pad); jb.x = x0; jb.w = x1 - x0; jb.h = Math.max(jb.h, tr.y + tr.h + pad - jb.y); }
      r.push(jb);
      if (this.word) { const it = this.word.it, fs = FS(15, 28), p = por(), ty = p ? this.bSpeak.y + this.bSpeak.h + fs * 1.1 : this.lineY, ww = Math.min(game.W - 60, Math.max(fs * 1.1 * it.w.length + 80, it.s && this.band === 'f' ? (p ? game.W - 50 : Math.min(game.W * .5, j.w * 1.6)) : 0)), wh = fs * 2.4;
        r.push({ x: j.cx - ww / 2 - pad * .4, y: ty - wh / 2 - pad * .4, w: ww + pad * .8, h: wh + pad * .8 }); } // the prompt line / look card
      for (const b of [this.bSpeak, this.bHint]) r.push({ x: b.x - pad * .6, y: b.y - pad * .6, w: b.w + pad * 1.2, h: b.h + pad * 1.2 });
      if (this.word && this.word.it.pic && MB.hasPic(this.word.it.pic)) r.push({ x: this.picX - this.picS / 2 - pad * .4, y: this.picY - this.picS / 2 - pad * .4, w: this.picS + pad * .8, h: this.picS + pad * .8 });
      return r; },
    area() { const sa = SA(), R = this.R; return { x0: 10 + sa.l + R, x1: game.W - 10 - sa.r - R, y0: hudBottom() + R * .7, y1: this.dotsY - 18 - R * .7 }; },
    freePoint(rng) { const a = this.area(), bl = this.blockers(); for (let k = 0; k < 40; k++) { const x = lerp(a.x0, a.x1, rng.next()), y = lerp(a.y0, a.y1, rng.next()); if (!bl.some(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) && !this.moths.some(m => m.state === 'fly' && Math.hypot(m.tx - x, m.ty - y) < this.R * 2.2)) return { x, y }; } return { x: lerp(a.x0, a.x1, rng.next()), y: rng.next() < .5 ? a.y0 : a.y1 }; },
    clampMoth(m) { const a = this.area(); if (m.state === 'fly') { m.x = clamp(m.x, a.x0, a.x1); m.y = clamp(m.y, a.y0, a.y1); const p = this.freePoint(this.rng); m.tx = p.x; m.ty = p.y; } },

    /* ---- word flow ---- */
    nextWord() {
      this.idx++; if (this.idx >= this.queue.length || this.idx >= ROUND_WORDS) return this.endRound('done');
      const w = this.word; w.misses = 0; w.hinted = false; w.filled = 0; w.t0 = this.t;
      this.layoutJar(); this.slots = w.it.tiles.map(() => null);
      // moths: the word's tiles + decoys, entering from the edges
      for (const m of this.moths) if (m.state !== 'gone') { m.state = 'leave'; m.lt = 0; }
      const tn = this.tuning(), dec = MB.decoys(w.it, tn.decoys, tn.confuse, this.rng), tiles = w.it.tiles.concat(dec);
      const order = this.rng.shuffle(tiles.map((c, i) => i)); const { W, H } = game;
      order.forEach((i, k) => { const ch = tiles[i], side = k % 4, p = this.freePoint(this.rng);
        const sx = side === 0 ? -this.R * 2 : side === 1 ? W + this.R * 2 : lerp(0, W, this.rng.next()), sy = side < 2 ? lerp(H * .3, H * .8, this.rng.next()) : (side === 2 ? -this.R * 2 : H + this.R * 2);
        this.moths.push({ ch, real: i < w.it.tiles.length, x: sx, y: sy, vx: 0, vy: 0, tx: p.x, ty: p.y, state: 'fly', enter: .9 + k * .08, col: MOTH_COLS[(this.idx * 3 + k) % MOTH_COLS.length], ph: this.rng.next() * TAU, spd: tn.speed * (.8 + this.rng.next() * .4), wob: 0, rot: 0, ret: 0 }); });
      this.moths = this.moths.filter(m => m.state !== 'gone');
      this.phase = 'word'; this.look = voiceOn() ? 0 : (w.it.kind === 'first' || w.it.kind === 'last' ? 0 : 2.6);
      setTimeout(() => { if (game.base === this && this.word === w && !this.over) this.prompt(false); }, this.idx === 0 ? 350 : 250);
    },
    prompt(manual) {
      if (this.phase !== 'word' && !manual) return; const it = this.word && this.word.it; if (!it) return; SFX.tap();
      if (!voiceOn()) { // visual fallback: show the word again ("look, cover, spell") and pulse the picture
        if (it.kind !== 'first' && it.kind !== 'last') this.look = Math.max(this.look, manual ? 1.6 : 2.6); this.picPulse = 1; return; }
      const s = it.s && this.band === 'f' ? it.s : null;
      if (it.kind === 'first') say(manual ? `${it.w}. ${it.w}.` : `Find the first sound in... ${it.w}.`, { rate: .85 });
      else if (it.kind === 'last') say(manual ? `${it.w}. ${it.w}.` : `Find the last sound in... ${it.w}.`, { rate: .85 });
      else if (it.kind === 'build') say(manual ? `${it.w}.` : `Build... ${it.w}.`, { rate: .8 });
      else say(s ? `${it.w}. ${s} ${it.w}.` : `${it.w}. Spell, ${it.w}.`, { rate: .85 });
      this.speakPulse = 1;
    },
    need() { const w = this.word; return w ? w.it.tiles[w.filled] : null; },
    attempt(m) {
      if (this.phase !== 'word' || !m || m.state !== 'fly' && m.state !== 'drag') return;
      const w = this.word, need = this.need(); if (need == null) return;
      if (this.band === 's' && voiceOn() && m.ch.length && MB.PHON[m.ch]) { /* the tapped moth "says" its sound */ say(MB.PHON[m.ch], { rate: .9 }); }
      if (m.ch === need) {
        const k = w.filled++; this.slots[k] = m.ch; m.state = 'toSlot'; m.slot = k; m.t0 = 0; m.fx = m.x; m.fy = m.y;
        const mult = this.mult(); this.score += 10 * mult; SFX.letter(k); this.letterPop = { k, t: 0 };
        if (w.filled >= w.it.tiles.length) this.wordDone();
      } else {
        w.misses++; this.combo = 0; m.state = 'bounce'; m.t0 = 0; m.fx = m.x; m.fy = m.y; const j = this.jar; const ang = Math.atan2(m.y - j.cy, m.x - j.cx); m.bx = j.cx + Math.cos(ang) * j.w * .55; m.by = j.cy + Math.sin(ang) * j.h * .55;
        SFX.wrong(); this.jarShake = .35; game.fx.shake(reduce() ? 0 : 3, .15);
        if (w.misses >= 2 && !w.hinted) this.hint(true);
      }
    },
    mult() { return this.combo >= 6 ? 3 : this.combo >= 3 ? 2 : 1; },
    hint(auto) {
      if (this.phase !== 'word') return; const w = this.word, need = this.need(); if (!need) return;
      const target = this.moths.find(m => m.ch === need && (m.state === 'fly' || m.state === 'drag'));
      if (!target) return; w.hinted = true; this.combo = 0; this.hintsUsed++; target.hintT = 6; this.hintLit = 1.4; SFX.hint();
      if (voiceOn()) { if (this.band === 's' && MB.PHON[need]) say(auto ? `Try this one. ${MB.PHON[need]}.` : MB.PHON[need], { rate: .9 }); else say(auto ? `Look for the glowing moth.` : need, { rate: .9 }); }
      else this.look = Math.max(this.look, 1.2);
      if (!auto) HX.track('hint', { band: this.band });
    },
    wordDone() {
      const w = this.word, perfect = w.misses === 0 && !w.hinted, today = MB.today();
      this.phase = 'glow'; this.pt = 0; this.jarGlow = 1; SFX.word(); this.cheer = 1.2;
      if (perfect) { this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); }
      const mult = this.mult(), pts = (50 + (perfect ? 30 : 0)) * mult; this.score += pts;
      game.fx.floatText(this.jar.cx, this.jar.y - 20, `+${pts}`, { color: C.gold, size: FS(22, 44) });
      if (!reduce()) game.fx.burst(this.jar.cx, this.jar.cy, { count: 36, colors: [C.gold, '#fff3c4', C.marigold, C.mint], speed: [120, 420], life: [.4, 1], size: [3, 8], shape: 'spark', glow: true });
      this.results.push({ it: w.it, perfect, helped: !perfect, done: true, retry: w.retry });
      // learning: SRS + adaptive + mastery points
      MB.recordWord(M, w.it, perfect, today);
      if (this.dFixed == null) MB.adapt(M.prof[this.band], perfect);
      if (perfect) for (const p of w.it.pats) M.pts[p] = (M.pts[p] || 0) + 1;
      // a missed word comes back later this round in an easier form (fewer decoys, slower moths)
      if (!perfect && !w.retry && this.queue.length - this.idx > 2) { const at = Math.min(this.queue.length, this.idx + 3); this.queue.splice(at, 0, { it: w.it, retry: true }); if (this.queue.length > ROUND_WORDS) this.queue.splice(ROUND_WORDS); }
      if (voiceOn()) setTimeout(() => { if (game.base === this) say(w.it.w + '!', { rate: .95, pitch: 1.2 }); }, 180);
      game.save.write();
    },
    endRound(why) {
      if (this.over) return; this.over = true; this.phase = 'end'; MB.Voice.stop();
      const done = this.results.length, perfect = this.results.filter(r => r.perfect).length;
      const r = { band: this.band, mode: this.mode, stage: this.stage, score: this.score, done, perfect, acc: done ? Math.round(perfect / done * 100) : 0, why, seed: this.seed, bestCombo: this.bestCombo, hints: this.hintsUsed, words: this.results.map(x => ({ w: x.it.w, p: x.perfect })), cfg: this.cfg, time: Math.round(ROUND_SEC - this.time) };
      // marks for the Daily Jar (per planned word)
      if (this.mode === 'jar') { r.marks = this.items.map(it => { const rs = this.results.filter(x => x.it === it); return rs.some(x => x.perfect && !x.retry) ? 2 : rs.length ? 1 : 0; }); r.right = r.marks.filter(k => k === 2).length; }
      r.stars = HX.Stars.evaluate(MB.STAR_RULES, r).count;
      game.go('results', r, { fade: .25 });
    },

    /* ---- input: drag or tap-to-place (moths slow near the finger) ---- */
    hitMoth(x, y) { let best = null, bd = 1e9; for (const m of this.moths) { if (m.state !== 'fly') continue; const d = Math.hypot(m.x - x, m.y - y); if (d < this.R * 1.2 && d < bd) { bd = d; best = m; } } return best; },
    pointerDown(p) { if (this.phase !== 'word') return; const m = this.hitMoth(p.x, p.y); if (!m) return; m.state = 'drag'; this.drag = { m, sx: p.x, sy: p.y, ox: m.x - p.x, oy: m.y - p.y, moved: 0 }; SFX.rustle(); if (!reduce()) game.fx.burst(m.x, m.y, { count: 8, colors: [m.col, '#fff7dc'], speed: [30, 120], life: [.3, .6], size: [2, 4], shape: 'circle' }); },
    pointerMove(p) { const d = this.drag; if (!d) return; d.moved = Math.max(d.moved, Math.hypot(p.x - d.sx, p.y - d.sy)); d.m.x = p.x + d.ox * .6; d.m.y = p.y + d.oy * .6; },
    pointerUp(p) { const d = this.drag; if (!d) return; this.drag = null; const m = d.m; if (m.state !== 'drag') return;
      const j = this.jar, over = p.x > j.x - this.R * .5 && p.x < j.x + j.w + this.R * .5 && p.y > j.y - j.h * .3 && p.y < j.y + j.h + this.R * .3;
      if (d.moved < 16 * U() + 6 || over) this.attempt(m); else { m.state = 'fly'; const q = this.freePoint(this.rng); m.tx = q.x; m.ty = q.y; } },
    keyDown(c) {
      if (c === 'Space' || c === 'Enter') return this.prompt(true);
      if (c === 'Digit1' || c === 'Slash') return this.hint();
      const mk = /^Key([A-Z])$/.exec(c); if (!mk || this.phase !== 'word') return; const L = mk[1].toLowerCase(), need = this.need() || '';
      const fly = this.moths.filter(m => m.state === 'fly'); let m = need.startsWith(L) ? fly.find(x => x.ch === need) : null; if (!m) m = fly.find(x => x.ch === L) || fly.find(x => x.ch[0] === L);
      if (m) this.attempt(m); else { SFX.wrong(); }
    },

    /* ---- simulation ---- */
    update(dt) {
      this.t += dt; const { W } = game; void W; this.jarGlow = Math.max(0, this.jarGlow - dt * .7); this.jarShake = Math.max(0, this.jarShake - dt); this.cheer = Math.max(0, this.cheer - dt);
      this.hintLit = Math.max(0, (this.hintLit || 0) - dt); this.speakPulse = Math.max(0, (this.speakPulse || 0) - dt * 1.5); this.picPulse = Math.max(0, (this.picPulse || 0) - dt * 1.5); this.look = Math.max(0, this.look - dt);
      if (this.letterPop) { this.letterPop.t += dt; if (this.letterPop.t > .5) this.letterPop = null; }
      if (this.phase === 'word') { const prev = Math.ceil(this.time); this.time -= dt; if (this.time <= 10 && Math.ceil(this.time) !== prev) SFX.tick(); if (this.time <= 0) { this.time = 0; return this.endRound('time'); } }
      if (this.phase === 'glow') { this.pt += dt; if (this.pt > 1.25) this.nextWord(); }
      const p = game.input.p, near = p && (p.down || p.type === 'mouse'), R = this.R, a = this.area(), bl = this.blockers();
      for (const m of this.moths) {
        m.ph += dt * (m.state === 'drag' ? 16 : 9); if (m.hintT) m.hintT = Math.max(0, m.hintT - dt);
        if (m.enter > 0) m.enter -= dt;
        if (m.state === 'fly') {
          let spd = m.spd * (m.hintT ? .45 : 1); if (near) { const dd = Math.hypot(p.x - m.x, p.y - m.y); if (dd < R * 3.2) spd *= .25 + .75 * (dd / (R * 3.2)); }
          let dx = m.tx - m.x, dy = m.ty - m.y; const dist = Math.hypot(dx, dy);
          if (dist < 20 || (m.ret -= dt) < -6) { const q = this.freePoint(this.rng); m.tx = q.x; m.ty = q.y; m.ret = 0; }
          let ax = dist ? dx / dist * spd : 0, ay = dist ? dy / dist * spd : 0;
          // flutter + separation + avoid blockers
          ax += Math.cos(m.ph * .37) * spd * .5; ay += Math.sin(m.ph * .29) * spd * .6;
          for (const o of this.moths) if (o !== m && o.state === 'fly') { const ox = m.x - o.x, oy = m.y - o.y, od = Math.hypot(ox, oy); if (od > 0 && od < R * 2.1) { ax += ox / od * spd * 1.6 * (1 - od / (R * 2.1)); ay += oy / od * spd * 1.6 * (1 - od / (R * 2.1)); } }
          for (const b of bl) { if (m.x > b.x - R * .3 && m.x < b.x + b.w + R * .3 && m.y > b.y - R * .3 && m.y < b.y + b.h + R * .3) { const cx = b.x + b.w / 2, cy = b.y + b.h / 2, ox = m.x - cx, oy = m.y - cy, od = Math.hypot(ox, oy) || 1; ax += ox / od * spd * 2.4; ay += oy / od * spd * 2.4; } }
          const k = Math.min(1, dt * (m.enter > 0 ? 2.2 : 1.6)); m.vx = lerp(m.vx, ax, k); m.vy = lerp(m.vy, ay, k);
          const fast = m.enter > 0 ? 3.2 : 1; m.x += m.vx * dt * fast; m.y += m.vy * dt * fast;
          if (m.enter <= 0) { m.x = clamp(m.x, a.x0, a.x1); m.y = clamp(m.y, a.y0, a.y1);
            const jb = bl[0]; if (m.x > jb.x && m.x < jb.x + jb.w && m.y > jb.y && m.y < jb.y + jb.h) { // never rest on the jar: slide out the nearest side
              const dl = m.x - jb.x, dr = jb.x + jb.w - m.x, dt2 = m.y - jb.y, db = jb.y + jb.h - m.y, mn = Math.min(dl, dr, dt2, db), push = Math.min(mn, 220 * dt);
              if (mn === dl) m.x -= push; else if (mn === dr) m.x += push; else if (mn === dt2) m.y -= push; else m.y += push; } }
          m.rot = lerp(m.rot, clamp(m.vx / 300, -.35, .35), Math.min(1, dt * 4));
        } else if (m.state === 'toSlot') { m.t0 += dt / .32; if (!reduce() && Math.random() < .7) game.fx.burst(m.x, m.y, { count: 1, colors: [C.gold, '#fff3c4'], speed: [10, 60], life: [.25, .5], size: [2, 4], shape: 'spark', glow: true }); const s = this.slotPos[m.slot]; const e = HX.Ease.outCubic(Math.min(1, m.t0)); m.x = lerp(m.fx, s.x, e); m.y = lerp(m.fy, s.y, e) - Math.sin(e * Math.PI) * 50; m.rot *= .8;
          if (m.t0 >= 1) { m.state = 'gone'; if (!reduce()) game.fx.burst(s.x, s.y, { count: 14, colors: [C.gold, '#fff3c4'], speed: [60, 220], life: [.3, .6], size: [2, 5], shape: 'spark', glow: true }); }
        } else if (m.state === 'bounce') { m.t0 += dt; const t1 = .22; if (m.t0 < t1) { const e = m.t0 / t1; m.x = lerp(m.fx, m.bx, e); m.y = lerp(m.fy, m.by, e); } else { if (!m.out) { m.out = true; const q = this.freePoint(this.rng); m.tx = q.x; m.ty = q.y; m.vx = (m.x - this.jar.cx) * 3; m.vy = -200; } m.rot += dt * 8; if (m.t0 > .7) { m.state = 'fly'; m.out = false; m.rot = 0; } else { m.x += m.vx * dt; m.y += m.vy * dt; m.vy += 500 * dt; m.x = clamp(m.x, a.x0, a.x1); m.y = clamp(m.y, a.y0, a.y1); } } }
        else if (m.state === 'leave') { m.lt += dt; const dir = m.x < game.W / 2 ? -1 : 1; m.x += dir * 600 * dt * Math.min(1, m.lt * 2); m.y -= 260 * dt; if (m.x < -R * 3 || m.x > game.W + R * 3 || m.y < -R * 3) m.state = 'gone'; }
      }
      if (this.phase === 'glow') this.moths = this.moths.filter(m => m.state !== 'gone' || false);
    },

    /* ---- drawing ---- */
    drawSpeaker(ctx, b, py) { const cx = b.x + b.w / 2, cy = b.y + b.h / 2 + py, r = b.w / 2; const sp = this.speakPulse || 0;
      if (sp) { ctx.strokeStyle = MB.rgba(C.coral, sp); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r * (1 + (1 - sp) * .3), 0, TAU); ctx.stroke(); }
      ctx.lineWidth = r * .12; ctx.strokeStyle = C.coral; ctx.beginPath(); ctx.arc(cx, cy, r * .78, 0, TAU); ctx.stroke();
      MB.icon(ctx, voiceOn() ? 'speaker' : 'eye', cx, cy, r * .95, '#2a2b5c'); },
    drawHint(ctx, b, py) { const cx = b.x + b.w / 2, cy = b.y + b.h * .42 + py; MB.drawFirefly(ctx, cx, cy, b.h * .3, this.t, this.hintLit > 0 || (this.word && this.word.misses >= 2));
      UI.text(ctx, 'HINT', cx, b.y + b.h * .82 + py, { size: b.h * .2, color: '#2a1f5c', weight: 700, display: true }); },
    draw(ctx) {
      const { W, H } = game, t = this.t, w = this.word; backdrop(ctx); fireflies(ctx, t);
      // lantern jar
      const j = this.jar, shx = this.jarShake ? Math.sin(t * 70) * this.jarShake * 18 : 0;
      ctx.save(); ctx.translate(shx, 0); MB.drawJar(ctx, j.cx, j.cy, j.w, j.h, this.jarGlow + (w ? w.filled / w.it.tiles.length * .5 : 0), t);
      // slots
      if (w) w.it.tiles.forEach((tile, i) => { const s = this.slotPos[i], f = this.slots[i]; const pop = this.letterPop && this.letterPop.k === i ? 1 + .25 * Math.sin(Math.min(1, this.letterPop.t / .5) * Math.PI) : 1;
        ctx.save(); ctx.translate(s.x, s.y); ctx.scale(pop, pop);
        MB.rr(ctx, -s.w / 2, -s.h / 2, s.w, s.h, s.w * .18); ctx.fillStyle = f ? 'rgba(255,240,190,.95)' : 'rgba(22,18,64,.88)'; ctx.fill(); ctx.lineWidth = Math.max(2, s.w * .05); ctx.strokeStyle = f ? C.gold : (i === w.filled && this.phase === 'word' ? MB.rgba(C.gold, .55 + .45 * Math.sin(t * 5)) : 'rgba(170,160,230,.5)'); ctx.stroke();
        if (f) { MB.glow(ctx, 0, 0, s.w * 1.1, C.gold, .7); UI.text(ctx, f, 0, 2, { size: s.h * (f.length > 1 ? .5 : .62), color: '#2a1f5c', weight: 700, display: true }); }
        else if (this.look > 0 && w.it.kind !== 'first' && w.it.kind !== 'last') { ctx.globalAlpha = Math.min(1, this.look * 1.5) * .9; UI.text(ctx, tile, 0, 2, { size: s.h * (tile.length > 1 ? .5 : .62), color: '#fff3c4', weight: 700, display: true }); ctx.globalAlpha = 1; }
        ctx.restore(); });
      ctx.restore();
      // prompt support: picture hint + sentence / word card
      if (w) this.drawPrompt(ctx, w);
      // hinted moth: dotted guide line to the jar
      for (const m of this.moths) if (m.hintT && m.state === 'fly') { ctx.save(); ctx.setLineDash([6, 10]); ctx.lineWidth = 4; ctx.strokeStyle = MB.rgba(C.gold, Math.min(1, m.hintT)); ctx.beginPath(); ctx.moveTo(m.x, m.y); const s = this.slotPos[w.filled] || { x: j.cx, y: j.cy }; ctx.quadraticCurveTo((m.x + s.x) / 2, Math.min(m.y, s.y) - 60, s.x, s.y); ctx.stroke(); ctx.restore(); }
      // moths
      const R = this.R;
      for (const m of this.moths) { if (m.state === 'gone') continue; const open = .68 + .32 * Math.sin(m.ph); const sc = m.state === 'toSlot' ? 1 - .45 * Math.min(1, m.t0) : m.state === 'drag' ? 1.12 : 1;
        if (m.hintT) MB.glow(ctx, m.x, m.y, R * 3, C.gold, .6 + .4 * Math.sin(t * 8));
        MB.drawMoth(ctx, m.x, m.y + Math.sin(m.ph * .5) * 3, R, { col: m.col, label: m.ch, open, rot: m.rot, scale: sc, glowA: m.hintT ? 1 : .75 }); }
      this.drawTip(ctx);
      this.drawHud(ctx);
      if (this.phase === 'glow' && w) { const a = Math.min(1, this.pt * 4) * (1 - Math.max(0, this.pt - 1) * 4); UI.text(ctx, w.it.w, j.cx, j.y - j.h * .32, { size: Math.min(FS(30, 64), j.w * .3), color: '#fff7dc', stroke: '#2a1f5c', strokeWidth: 10, weight: 700, display: true, }); void a; }
    },
    drawPrompt(ctx, w) { const it = w.it, j = this.jar;
      if (it.pic && MB.hasPic(it.pic)) { const pp = 1 + (this.picPulse || 0) * .12, s = this.picS * pp; MB.patch(ctx, this.picX - s / 2, this.picY - s / 2, s, s, '#f3e3c3', { r: s * .18 }); MB.drawPic(ctx, it.pic, this.picX, this.picY, s * .78); }
      const fs = FS(15, 28), p = por(); const ty = p ? this.bSpeak.y + this.bSpeak.h + fs * 1.1 : this.lineY;
      let line = null;
      if (it.kind === 'first' && !voiceOn()) line = '_' + it.w.slice(it.tiles[0].length);
      else if (it.kind === 'last' && !voiceOn()) line = it.w.slice(0, -1) + '_';
      else if (this.band === 'f' && it.s) line = it.s.replace(new RegExp('\\b' + it.w + '\\b', 'i'), '____');
      const lookCard = this.look > 0 && (it.kind === 'spell' || it.kind === 'build') && !voiceOn();
      if (lookCard) { const a = Math.min(1, this.look * 2); ctx.globalAlpha = a; const ww = Math.min(game.W - 60, fs * 1.1 * it.w.length + 80), wh = fs * 2.4; MB.patch(ctx, j.cx - ww / 2, ty - wh / 2, ww, wh, '#fff3c4', { r: wh / 2 }); UI.text(ctx, it.w, j.cx, ty, { size: fs * 1.5, color: '#2a1f5c', weight: 700, display: true, maxWidth: ww - 30 }); ctx.globalAlpha = 1; }
      else if (line) { const maxW = p ? game.W - 50 : Math.min(game.W * .5, j.w * 1.6); UI.text(ctx, line, j.cx, ty, { size: it.kind === 'spell' || this.band === 'f' ? fs : fs * 1.6, color: '#fff7dc', weight: 800, maxWidth: maxW, display: it.kind === 'first' || it.kind === 'last' }); }
      void j;
    },
    drawHud(ctx) {
      const t = this.t, r = this.timerR, x = this.timerX, y = this.timerY, frac = this.time / ROUND_SEC, low = this.time <= 10;
      ctx.fillStyle = '#f3e3c3'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(42,31,92,.25)'; ctx.lineWidth = r * .2; ctx.beginPath(); ctx.arc(x, y, r * .8, 0, TAU); ctx.stroke();
      ctx.strokeStyle = low ? C.coral : '#e86a5a'; ctx.lineWidth = r * .2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, r * .8, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke(); ctx.lineCap = 'butt';
      UI.text(ctx, String(Math.ceil(this.time)), x, y - r * .08, { size: r * .62 * (low ? 1 + .08 * Math.sin(t * 12) : 1), color: '#2a1f5c', weight: 900 }); UI.text(ctx, 'SEC', x, y + r * .38, { size: r * .24, color: '#2a1f5c', weight: 900 });
      // score + combo pills (left of the exit zone)
      const z = zone(), ph = Math.max(r * 1.05, 60), px = x + r + 12, room = z.x - 8 - px;
      const sw = Math.min(room, Math.max(ph * 2.6, 150));
      if (sw > ph * 1.8) { pill(ctx, px, y - ph / 2, sw, ph); MB.icon(ctx, 'star', px + ph * .5, y, ph * .6); UI.text(ctx, this.score.toLocaleString('en-US'), px + ph * .92, y + 1, { size: ph * .44, align: 'left', color: '#fff7dc', weight: 900, maxWidth: sw - ph * 1.05 }); }
      // combo under the timer
      const cy = y + r + ph * .5 + 10, cw = Math.max(ph * 1.9, 120); const hot = this.combo >= 3;
      pill(ctx, 14 + SA().l, cy - ph / 2, cw, ph, hot ? '#5a2a63' : '#231d5c'); MB.icon(ctx, 'flame', 14 + SA().l + ph * .5, cy, ph * .62 * (hot ? 1 + .06 * Math.sin(t * 10) : 1));
      UI.text(ctx, `x${this.combo}`, 14 + SA().l + ph * .95, cy + 1, { size: ph * .44, align: 'left', color: hot ? C.gold : '#fff7dc', weight: 900 });
      if (this.mult() > 1) UI.text(ctx, `×${this.mult()} pts`, 14 + SA().l + cw / 2, cy + ph * .78, { size: ph * .28, color: C.gold, weight: 900 });
      // progress dots
      const n = ROUND_WORDS, dr = Math.max(FS(7, 12), 11), gap = dr * 1.2, tw = n * dr * 2 + (n - 1) * gap, dx = game.W / 2 - tw / 2 + dr, dy = this.dotsY;
      pill(ctx, dx - dr * 2, dy - dr * 1.9, tw + dr * 2, dr * 3.8, '#1b1650');
      for (let i = 0; i < n; i++) { const res = this.results[i], cx = dx + i * (dr * 2 + gap); ctx.fillStyle = res ? (res.perfect ? C.gold : C.mint) : 'rgba(170,160,230,.35)'; ctx.beginPath(); ctx.arc(cx, dy, dr, 0, TAU); ctx.fill();
        if (i === this.results.length && this.phase === 'word') { ctx.strokeStyle = MB.rgba(C.gold, .5 + .5 * Math.sin(t * 5)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, dy, dr + 4, 0, TAU); ctx.stroke(); } }
    }
  };

  /* ------------------------------------------------------------------ RESULTS (never auto-advances) */
  const Results = {
    hud: true, pausable: false,
    enter(r) {
      M = MB.data(game.save); this.r = r; this.t = 0; this.stand = null; const today = Daily.key(), dn = MB.today(), s = M.stats, prof = M.prof[r.band];
      s.rounds++; s.words += r.done; if (r.done >= ROUND_WORDS && r.perfect === r.done) s.perfectRounds++; s.bestCombo = Math.max(s.bestCombo, r.bestCombo); s.bands[r.band] = 1; s.hints += r.hints;
      const day = M.days[dn] = M.days[dn] || { r: 0, w: 0, c: 0, s: 0 }; day.r++; day.w += r.done; day.c += r.perfect; day.s += r.time;
      prof.rounds++; prof.words += r.done; prof.perfect += r.perfect; MB.touchStreak(M);
      // keep ~60 days of daily history
      const ks = Object.keys(M.days).map(Number).sort((a, b) => a - b); while (ks.length > 60) delete M.days[ks.shift()];
      this.newBest = game.save.submitBest(r.score);
      this.prevStars = 0;
      if (r.mode === 'stage') { const id = MB.STAGES[r.band][r.stage].id; this.prevStars = prof.stars[id] | 0; prof.stars[id] = Math.max(this.prevStars, r.stars); prof.best[id] = Math.max(prof.best[id] | 0, r.score); HX.track.levelComplete(r.stage + 1, { stars: r.stars, band: r.band, score: r.score }); }
      if (r.mode === 'jar' && !r.cfg.practice) { const k = r.band + ':' + today; if (!M.jar[k]) { M.jar[k] = { score: r.score, right: r.right, marks: r.marks }; s.jarsDone++; } Daily.complete(game.save, { score: r.score }); HX.track.dailyComplete({ band: r.band, right: r.right, score: r.score }); }
      HX.track.gameOver({ mode: r.mode, band: r.band, score: r.score, words: r.done, acc: r.acc });
      this.moths = MB.awardMoths(M, r); if (this.moths.length) setTimeout(() => SFX.moth(), 500);
      // trim old jar results
      const jk = Object.keys(M.jar).sort(); while (jk.length > 80) delete M.jar[jk.shift()];
      game.save.write();
      try { if (window.ElearneaBridge) window.ElearneaBridge.results(r); } catch (e) {}
      const g = this; this.bAgain = B('Again', 'gold', spoken('Again!', () => g.leave('again')), { ico: 'again' });
      const nextOk = r.mode === 'stage' && r.stage + 1 < MB.STAGES[r.band].length && unlockedStage(r.band, r.stage + 1);
      this.bNext = B('Next', 'mint', spoken('Next', () => g.leave('next')), { ico: 'next', visible: nextOk });
      this.bHome = B('', 'indigo', spoken('Home', () => g.leave('home')), { ico: 'home' });
      this.bBook = B('', 'indigo', spoken('Moth book', () => g.leave('book')), { ico: 'book' });
      this.buttons = [this.bAgain, this.bNext, this.bHome, this.bBook];
      music('night'); SFX.end();
      if (voiceOn()) setTimeout(() => { if (game.scene === this) say(r.done >= 10 ? `Wonderful! You caught all ${r.done} words!` : r.done ? `Great job! You caught ${r.done} word${r.done === 1 ? '' : 's'}!` : `Good try! Let's catch some moths.`, { rate: 1 }); }, 400);
    },
    leave(where) { const r = this.r;
      if (where === 'home') return game.go('title', null, { fade: .2 }); if (where === 'book') return game.go('book', null, { fade: .2 });
      Promise.resolve().then(() => { /* Elearnea: no ad break points */
        if (where === 'again') game.go('play', Object.assign({}, r.cfg, { seed: r.mode === 'challenge' ? r.cfg.seed : undefined }), { fade: .12 });
        else if (where === 'next') game.push('goal', { mode: 'stage', band: r.band, stage: r.stage + 1 }); }); },
    resize(W, H) { hudFix(); const sa = SA(), t = T(), p = por(); const pw = Math.min(W - 28 - sa.l - sa.r, 680); this.pw = pw; this.px = W / 2 - pw / 2; this.py = Math.max(hudBottom() + 4, zone().b + 6);
      const by = H - sa.b - 16 - t * 1.25, bw = (pw - 3 * 14 - 2 * t) ; const main = this.bNext.visible ? bw / 2 : bw;
      place(this.bAgain, this.px, by, main, t * 1.25); if (this.bNext.visible) place(this.bNext, this.px + main + 14, by, main, t * 1.25);
      place(this.bHome, this.px + pw - 2 * t - 14, by + t * .125, t, t); place(this.bBook, this.px + pw - t, by + t * .125, t, t); this.ph = by - 16 - this.py; void p; },
    keyDown(c) { if (c === 'Enter' || c === 'Space') this.leave(this.bNext.visible ? 'next' : 'again'); if (c === 'KeyR') this.leave('again'); if (c === 'Escape') this.leave('home'); },
    update(dt) { this.t += dt; },
    draw(ctx) {
      const { W } = game, r = this.r, t = this.t; backdrop(ctx); fireflies(ctx, t);
      MB.patch(ctx, this.px, this.py, this.pw, this.ph, '#251f63', { r: 40 }); const cx = W / 2, fs = FS(17, 30), ph = this.ph;
      let y = this.py + Math.min(ph * .08, fs * 1.6);
      const title = r.mode === 'jar' ? `Daily Jar #${MB.jarNo(Daily.key())}${r.cfg.practice ? ' (practice)' : ''}` : r.mode === 'challenge' ? 'Challenge' : `${r.stage + 1}. ${MB.STAGES[r.band][r.stage].name}`;
      UI.text(ctx, title, cx, y, { size: fs * 1.1, color: C.gold, weight: 700, display: true, maxWidth: this.pw - 40 }); y += fs * 1.3;
      // jar with score
      const jh = Math.min(ph * .26, fs * 7), jw = jh * .9; MB.drawJar(ctx, cx, y + jh * .58, jw, jh, .6 + .4 * Math.sin(t * 2), t);
      UI.text(ctx, r.score.toLocaleString('en-US'), cx, y + jh * .6, { size: Math.min(jw * .32, fs * 2.4), color: '#fff7dc', stroke: '#2a1f5c', strokeWidth: 9, weight: 700, display: true });
      if (this.newBest) { const nb = Math.min(fs * .75, jw * .2); MB.patch(ctx, cx - nb * 3, y + jh * .95, nb * 6, nb * 1.5, C.coral, { r: nb * .75, stitch: false, depth: 2 }); UI.text(ctx, 'New best!', cx, y + jh * .95 + nb * .75, { size: nb, color: '#2a1f5c', weight: 900 }); }
      y += jh * 1.18 + (this.newBest ? fs * .9 : 0);
      if (r.mode === 'stage' || r.mode === 'challenge') { const ss = Math.min(fs * 2, this.pw / 9); UI.starRow(ctx, cx, y + ss * .2, ss, r.stars, 3); y += ss * 1.1;
        MB.STAR_RULES.forEach((rule, i) => { const ok = r.stars > i; UI.text(ctx, `${ok ? '✓' : '·'} ${rule.text}`, cx, y, { size: fs * .72, color: ok ? C.gold : 'rgba(255,247,220,.6)', weight: 900, maxWidth: this.pw - 40 }); y += fs * .95; }); }
      else if (r.marks) { const dr = Math.min(fs * .6, this.pw / 26); r.marks.forEach((k, i) => { ctx.fillStyle = k === 2 ? C.gold : k === 1 ? C.marigold : 'rgba(170,160,230,.35)'; ctx.beginPath(); ctx.arc(cx + (i - 4.5) * dr * 2.4, y, dr, 0, TAU); ctx.fill(); }); y += dr * 2.4; UI.text(ctx, `${r.right}/10 right first try`, cx, y, { size: fs * .8, color: '#fff7dc', weight: 900 }); y += fs * 1.1; }
      UI.text(ctx, `${r.done} words · ${r.acc}% first try${r.bestCombo >= 3 ? ` · best combo x${r.bestCombo}` : ''}`, cx, y, { size: fs * .72, color: '#fff7dc', weight: 800, maxWidth: this.pw - 40 }); y += fs * 1.25;
      // standing
      const st = this.stand; const sy = y;
      if (st) { UI.text(ctx, `You beat ${st.percentile}% of players today`, cx, sy, { size: fs * .9, color: C.mint, weight: 900, maxWidth: this.pw - 40 });
        UI.text(ctx, `Rank #${st.rank.toLocaleString('en-US')} of ${st.total.toLocaleString('en-US')}${st.next ? ` · ${st.next.score.toLocaleString('en-US')} pts passes #${st.next.rank.toLocaleString('en-US')}` : ' · number one!'}`, cx, sy + fs * 1.05, { size: fs * .62, color: 'rgba(255,247,220,.8)', weight: 800, maxWidth: this.pw - 40 });
        UI.text(ctx, 'preview ranks (offline)', cx, sy + fs * 1.8, { size: fs * .5, color: 'rgba(255,247,220,.45)', weight: 800 }); }
      y += fs * 2.4;
      // new moths
      if (this.moths.length) { const room = this.py + ph - y - 10, R = Math.min(room * .3, fs * 1.4); if (R > 12) { const n = Math.min(4, this.moths.length); UI.text(ctx, this.moths.length > 1 ? `${this.moths.length} new moths caught!` : 'New moth caught!', cx, y, { size: fs * .8, color: C.gold, weight: 900 });
        for (let i = 0; i < n; i++) { const mo = this.moths[i], mx = cx + (i - (n - 1) / 2) * Math.min(this.pw / n, R * 4.2), my = y + R * 1.6; const pop = Math.min(1, Math.max(0, (t - .4 - i * .2) * 3));
          MB.drawMoth(ctx, mx, my, R * HX.Ease.outBack(pop), { col: mo.col, col2: mo.col2, pat: mo.pat, label: mo.glyph, open: .6 + .4 * Math.sin(t * 6 + i) });
          UI.text(ctx, mo.name, mx, my + R * 1.45, { size: Math.min(fs * .52, R * .45), color: '#fff7dc', weight: 800, maxWidth: Math.min(this.pw / n, R * 4.2) - 8 }); } } }
    }
  };

  /* ------------------------------------------------------------------ BOOK: the moth collection (doubles as a progress map) */
  const Book = {
    hud: true, pausable: false,
    enter() { M = MB.data(game.save); this.t = 0; this.page = 0; this.sel = null; music('night');
      this.bBack = backBtn(() => game.go('title', null, { fade: .2 })); this.bPrev = B('', 'indigo', () => this.turn(-1), { ico: 'back' }); this.bNext = B('', 'indigo', () => this.turn(1), { ico: 'next' });
      this.buttons = [this.bBack, this.bPrev, this.bNext]; },
    turn(d) { this.page = clamp(this.page + d, 0, this.pages - 1); this.sel = null; SFX.rustle(); },
    resize(W, H) { hudFix(); placeBack(this.bBack); const sa = SA(), t = T(), p = por(); this.cols = p ? 4 : W > H * 1.5 ? 8 : 6;
      const top = hudBottom() + 8, bot = H - sa.b - 16 - t - 12 - (p ? FS(30, 120) : FS(24, 80)); const cw = (W - 32 - sa.l - sa.r) / this.cols; const rows = Math.max(2, Math.floor((bot - top) / Math.max(cw * 1.05, t * 1.3)));
      this.rows = rows; this.per = this.cols * rows; this.pages = Math.ceil(MB.MOTHS.length / this.per); this.page = Math.min(this.page, this.pages - 1); this.cw = cw; this.ch = (bot - top) / rows; this.top = top;
      place(this.bPrev, 16 + sa.l, H - sa.b - 16 - t, t * 1.4, t); place(this.bNext, W - 16 - sa.r - t * 1.4, H - sa.b - 16 - t, t * 1.4, t); this.infoY = bot + 8; },
    cellAt(x, y) { const sa = SA(); const c = Math.floor((x - 16 - sa.l) / this.cw), r = Math.floor((y - this.top) / this.ch); if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return -1; const i = this.page * this.per + r * this.cols + c; return i < MB.MOTHS.length ? i : -1; },
    tap(p) { const i = this.cellAt(p.x, p.y); if (i >= 0) { this.sel = i; SFX.tap(); const mo = MB.MOTHS[i]; if (voiceOn()) say(M.moths[mo.id] ? mo.name : mo.how, { rate: 1 }); } },
    swipe(d) { if (d === 'left') this.turn(1); if (d === 'right') this.turn(-1); },
    keyDown(c) { if (c === 'ArrowRight') this.turn(1); if (c === 'ArrowLeft') this.turn(-1); if (c === 'Escape') game.go('title', null, { fade: .2 }); },
    update(dt) { this.t += dt; this.bPrev.enabled = this.page > 0; this.bNext.enabled = this.page < this.pages - 1; },
    draw(ctx) { const { W } = game, t = this.t, sa = SA(); backdrop(ctx); const got = Object.keys(M.moths).length;
      heading(ctx, `Moth book ${got}/${MB.MOTHS.length}`, this.bBack.y + this.bBack.h / 2);
      for (let k = 0; k < this.per; k++) { const i = this.page * this.per + k; if (i >= MB.MOTHS.length) break; const mo = MB.MOTHS[i], c = k % this.cols, r = Math.floor(k / this.cols);
        const x = 16 + sa.l + c * this.cw + this.cw / 2, y = this.top + r * this.ch + this.ch * .45, R = Math.min(this.cw, this.ch) * .26, have = !!M.moths[mo.id];
        if (this.sel === i) { ctx.fillStyle = 'rgba(255,231,163,.14)'; MB.rr(ctx, x - this.cw / 2 + 4, y - this.ch * .45 + 4, this.cw - 8, this.ch - 8, 18); ctx.fill(); }
        if (have) MB.drawMoth(ctx, x, y, R, { col: mo.col, col2: mo.col2, pat: mo.pat, label: mo.glyph, open: .7 + .3 * Math.sin(t * 4 + i) });
        else { ctx.save(); ctx.globalAlpha = .55; MB.drawMoth(ctx, x, y, R, { col: '#3a3184', col2: '#2a2370', pat: mo.pat, glow: false, label: mo.glyph, ink: '#6a5fb0' }); ctx.restore();
          const pr = MB.mothProgress(M, mo); if (pr > 0) { ctx.strokeStyle = C.gold; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, R * 1.35, -Math.PI / 2, -Math.PI / 2 + TAU * pr); ctx.stroke(); } }
        UI.text(ctx, have ? mo.name : '?', x, y + R * 1.55, { size: Math.min(FS(10, 17), this.ch * .12), color: have ? '#fff7dc' : 'rgba(255,247,220,.45)', weight: 800, maxWidth: this.cw - 8 }); }
      const fs = FS(14, 24); const mo = this.sel != null ? MB.MOTHS[this.sel] : null;
      if (mo) { const have = !!M.moths[mo.id]; UI.text(ctx, have ? mo.name : 'Not caught yet', W / 2, this.infoY + fs * .7, { size: fs, color: C.gold, weight: 900, maxWidth: W - 40 }); UI.text(ctx, mo.how + (have ? ' ✓' : ` (${Math.round(MB.mothProgress(M, mo) * 100)}%)`), W / 2, this.infoY + fs * 1.9, { size: fs * .8, color: '#fff7dc', weight: 800, maxWidth: W - 40 }); }
      else UI.text(ctx, 'Master sounds and words to catch every moth', W / 2, this.infoY + fs, { size: fs * .8, color: 'rgba(255,247,220,.75)', weight: 800, maxWidth: W - 40 });
      UI.text(ctx, `${this.page + 1} / ${this.pages}`, W / 2, this.bPrev.y + this.bPrev.h / 2, { size: fs, color: '#fff7dc', weight: 900 }); }
  };

  /* ------------------------------------------------------------------ GROWN-UPS GATE (press and hold 3 s) */
  const HOLD = 3;
  const Gate = {
    overlay: true, hud: true, pausable: false,
    enter(d) { this.d = d || {}; this.h = 0; this.holding = false; this.bX = B('', 'indigo', () => game.pop(), { ico: 'close' }); this.buttons = [this.bX]; },
    resize(W, H) { hudFix(); const t = T(); this.R = Math.max(t * 1.1, 90); this.cx = W / 2; this.cy = H / 2 + 20; place(this.bX, W / 2 + Math.min(W / 2 - 30, 300) - t - 10, H / 2 - Math.min(H / 2 - 30, 300) + 10, t, t); },
    pointerDown(p) { if (Math.hypot(p.x - this.cx, p.y - this.cy) < this.R * 1.2) this.holding = true; },
    pointerUp() { this.holding = false; },
    keyDown(c) { if (c === 'Escape') game.pop(); },
    update(dt) { if (this.holding && game.input.p.down) { this.h += dt; if (this.h >= HOLD) { const d = this.d; game.pop(); if (d.then === 'grown') game.go('grown', null, { fade: .2 }); else if (d.fn) d.fn(); } } else { this.holding = false; this.h = Math.max(0, this.h - dt * 2); } },
    draw(ctx) { const { W, H } = game; ctx.fillStyle = 'rgba(8,6,28,.8)'; ctx.fillRect(0, 0, W, H); const pw = Math.min(W - 40, 600), ph = Math.min(H - 60, 600);
      MB.patch(ctx, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, '#251f63', { r: 40 }); const fs = FS(17, 30);
      UI.text(ctx, 'For grown-ups', W / 2, H / 2 - ph / 2 + fs * 2, { size: fs * 1.2, color: C.gold, weight: 700, display: true });
      UI.text(ctx, 'Press and hold the lock for 3 seconds', W / 2, H / 2 - ph / 2 + fs * 3.6, { size: fs * .8, color: '#fff7dc', weight: 800, maxWidth: pw - 60 });
      const k = this.h / HOLD; ctx.fillStyle = '#3a3184'; ctx.beginPath(); ctx.arc(this.cx, this.cy, this.R, 0, TAU); ctx.fill();
      ctx.strokeStyle = C.gold; ctx.lineWidth = this.R * .14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(this.cx, this.cy, this.R * .9, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); ctx.lineCap = 'butt';
      MB.icon(ctx, 'lock', this.cx, this.cy, this.R * .9, '#fff7dc');
      UI.text(ctx, 'Progress, settings and sharing', W / 2, H / 2 + ph / 2 - fs * 1.6, { size: fs * .7, color: 'rgba(255,247,220,.65)', weight: 800, maxWidth: pw - 60 }); }
  };

  /* ------------------------------------------------------------------ GROWN-UPS DASHBOARD */
  const Grown = {
    hud: true, pausable: false,
    enter() { M = MB.data(game.save); this.t = 0; this.tab = this.tab || 0; this.msg = null; this.resetH = 0; music('night');
      this.bBack = backBtn(() => game.go('title', null, { fade: .2 }));
      this.tabs = ['Progress', 'Words', 'Settings'].map((n, i) => B(n, 'indigo', () => { this.tab = i; this.layout(); }, { size: null }));
      this.bVoice = B('', 'indigo', () => { M.set.voice = !M.set.voice; MB.Voice.enabled = M.set.voice; game.save.write(); this.layout(); });
      this.bRate = B('', 'indigo', () => { M.set.rate = M.set.rate < 1 ? 1 : .8; MB.Voice.rate = M.set.rate; game.save.write(); this.layout(); if (voiceOn()) say('This is the reading speed.'); });
      this.bMusic = B('', 'indigo', () => { M.set.music = !M.set.music; game.save.write(); curSong = null; if (!M.set.music) Audio.stopMusic(); music('night'); this.layout(); });
      this.bMotion = B('', 'indigo', () => { const s = game.save.data.settings; s.reduceMotion = !s.reduceMotion; game.save.write(); this.layout(); });
      this.bShare = B('Share', 'gold', () => game.go('share', null, { fade: .15 }), { ico: 'share' });
      this.bReset = B('Hold to reset progress', 'coral', () => {}, {});
      this.layout(); },
    layout() { const s = game.save.data.settings; this.bVoice.label = `Voice: ${M.set.voice ? 'on' : 'off'}`; this.bVoice.sub = MB.Voice.voice ? MB.Voice.voice.name.slice(0, 40) : 'no voice on this device: visual cues on';
      this.bRate.label = `Speech: ${M.set.rate < 1 ? 'slow' : 'normal'}`; this.bMusic.label = `Music: ${M.set.music ? 'on' : 'off'}`; this.bMotion.label = `Reduce motion: ${s.reduceMotion ? 'on' : 'off'}`;
      this.tabs.forEach((b, i) => { b.style = i === this.tab ? 'gold' : 'indigo'; });
      this.buttons = [this.bBack, ...this.tabs]; if (this.tab === 2) this.buttons.push(this.bVoice, this.bRate, this.bMusic, this.bMotion, this.bReset); this.resize(game.W, game.H); },
    resize(W, H) { hudFix(); placeBack(this.bBack); const sa = SA(), t = T(); const top = hudBottom() + 8, x0 = 16 + sa.l, ww = W - 32 - sa.l - sa.r; const tw = (ww - 20) / 3;
      this.tabs.forEach((b, i) => place(b, x0 + i * (tw + 10), top, tw, t)); this.top = top + t + 16; this.x0 = x0; this.ww = ww;
      if (this.tab === 2) { const cols = W > H * 1.2 ? 2 : 1, bw = (ww - (cols - 1) * 14) / cols, bh = Math.max(t, 84); [this.bVoice, this.bRate, this.bMusic, this.bMotion].forEach((b, i) => place(b, x0 + (i % cols) * (bw + 14), this.top + Math.floor(i / cols) * (bh + 12), bw, bh));
        place(this.bReset, x0, H - sa.b - 16 - t, Math.min(ww, 480), t); } },
    pointerDown(p) { if (this.tab === 2 && this.bReset.contains(p.x, p.y)) this.resetting = true; },
    pointerUp() { this.resetting = false; },
    update(dt) { this.t += dt; if (this.resetting && game.input.p.down) { this.resetH += dt; if (this.resetH >= 3) { this.resetting = false; this.resetH = 0; const keep = Object.assign({}, M.set); delete game.save.data.mb; game.save.data.best = 0; game.save.write(); M = MB.data(game.save); Object.assign(M.set, keep); game.save.write(); this.msg = { t: 2.5, s: 'Progress reset on this device' }; } } else this.resetH = Math.max(0, this.resetH - dt * 2);
      if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; } this.bReset.label = this.resetH > 0 ? `Keep holding… ${Math.ceil(3 - this.resetH)}` : 'Hold to reset progress'; },
    keyDown(c) { if (c === 'Escape') game.go('title', null, { fade: .2 }); if (c === 'ArrowRight') { this.tab = (this.tab + 1) % 3; this.layout(); } if (c === 'ArrowLeft') { this.tab = (this.tab + 2) % 3; this.layout(); } },
    draw(ctx) { const { W, H } = game, fs = FS(13, 22); backdrop(ctx); ctx.fillStyle = 'rgba(10,8,34,.55)'; ctx.fillRect(0, 0, W, H);
      heading(ctx, 'Grown-ups', this.bBack.y + this.bBack.h / 2);
      const x0 = this.x0, ww = this.ww; let y = this.top;
      if (this.tab === 0) {
        const cols = W > H * 1.2 ? 2 : 1, cw = (ww - (cols - 1) * 14) / cols, chh = Math.min((H - y - 30 - FS(40, 140)) / (cols === 1 ? 2 : 1), fs * 11);
        ['s', 'f'].forEach((b, i) => { const x = x0 + (i % cols) * (cw + 14), yy = y + Math.floor(i / cols) * (chh + 14), p = M.prof[b], st = MB.STAGES[b]; MB.patch(ctx, x, yy, cw, chh, b === 's' ? '#2c5f55' : '#6a3550', { r: 26 });
          const seen = st.reduce((a, s) => a + s.items.filter(it => M.srs[it.id]).length, 0), mast = st.reduce((a, s) => a + s.items.filter(it => MB.boxOf(M, it.id) >= 3).length, 0), tot = st.reduce((a, s) => a + s.items.length, 0);
          const stars = st.reduce((a, s) => a + (p.stars[s.id] | 0), 0), acc = MB.accRecent(p); let ly = yy + fs * 1.6; const L = (a, c2) => { UI.text(ctx, a, x + 24, ly, { size: fs, align: 'left', color: c2 || '#fff7dc', weight: 800, maxWidth: cw - 48 }); ly += fs * 1.45; };
          UI.text(ctx, `${MB.BANDS[b].name} (${MB.BANDS[b].sub})`, x + 24, ly, { size: fs * 1.2, align: 'left', color: C.gold, weight: 700, display: true, maxWidth: cw - 48 }); ly += fs * 1.7;
          L(`Stage ${curStage(b) + 1} of ${st.length}: ${st[curStage(b)].name} · ${stars}/${st.length * 3} stars`);
          L(`Words mastered ${mast} · practised ${seen} of ${tot}`); L(`First-try accuracy (last 30): ${acc == null ? '-' : Math.round(acc * 100) + '%'} · target 80%`);
          L(`Difficulty level ${Math.round(p.d * 100)}/100 · ${p.rounds} rounds · ${p.words} words`); });
        y += (cols === 1 ? 2 : 1) * (chh + 14);
        // streak calendar (last 28 days)
        const s = M.streak, dn = MB.today(); UI.text(ctx, `Streak ${MB.streakNow(M)} days (best ${s.best}) · moths ${Object.keys(M.moths).length}/${MB.MOTHS.length} · rounds finished ${M.stats.rounds} of ${Math.max(M.stats.rounds, M.stats.started)} started`, x0, y + fs * .6, { size: fs, align: 'left', color: C.gold, weight: 900, maxWidth: ww });
        const cr = Math.min(ww / 28 / 2 - 2, fs * .6); for (let i = 0; i < 28; i++) { const d = M.days[dn - 27 + i]; ctx.fillStyle = d ? C.marigold : 'rgba(170,160,230,.25)'; ctx.beginPath(); ctx.arc(x0 + cr + i * (ww / 28), y + fs * 1.9, cr, 0, TAU); ctx.fill(); }
        let mins = 0; for (const k in M.days) mins += M.days[k].s || 0; UI.text(ctx, `Play time: ${Math.round(mins / 60)} min total. All progress is stored only on this device.`, x0, y + fs * 3.3, { size: fs * .8, align: 'left', color: 'rgba(255,247,220,.7)', weight: 800, maxWidth: ww });
      } else if (this.tab === 1) {
        // tricky words + mastered-by-sound chart
        const tricky = Object.entries(M.srs).filter(([id, r]) => r[3] > 0 && MB.ITEM[id]).sort((a, b) => (b[1][3] - b[1][2] * .3) - (a[1][3] - a[1][2] * .3)).slice(0, 12);
        UI.text(ctx, 'Tricky words', x0, y + fs * .6, { size: fs * 1.1, align: 'left', color: C.gold, weight: 900 }); y += fs * 1.6;
        if (!tricky.length) { UI.text(ctx, 'None yet. Missed words show up here.', x0, y + fs * .5, { size: fs * .85, align: 'left', color: 'rgba(255,247,220,.7)', weight: 800 }); y += fs * 1.6; }
        else { const cols = W > H ? 4 : 3, cw = ww / cols; tricky.forEach(([id, r], i) => { const it = MB.ITEM[id]; UI.text(ctx, `${it.w}  ✗${r[3]} ✓${r[2]}`, x0 + (i % cols) * cw, y + Math.floor(i / cols) * fs * 1.5 + fs * .5, { size: fs * .9, align: 'left', color: '#fff7dc', weight: 800, maxWidth: cw - 10 }); }); y += Math.ceil(tricky.length / cols) * fs * 1.5 + fs * .6; }
        UI.text(ctx, 'Mastered by sound and pattern', x0, y + fs * .6, { size: fs * 1.1, align: 'left', color: C.gold, weight: 900 }); y += fs * 1.6;
        const learn = MB.MOTHS.filter(m => m.kind === 'learn'); const cols = Math.max(4, Math.floor(ww / Math.max(fs * 4.4, 88))), cw = ww / cols, ch = Math.min(fs * 2.2, (H - y - 20) / Math.ceil(learn.length / cols));
        learn.forEach((mo, i) => { const x = x0 + (i % cols) * cw, yy = y + Math.floor(i / cols) * ch, pr = MB.mothProgress(M, mo); MB.rr(ctx, x + 2, yy + 2, cw - 4, ch - 4, 8); ctx.fillStyle = 'rgba(58,49,132,.8)'; ctx.fill();
          ctx.save(); MB.rr(ctx, x + 2, yy + 2, (cw - 4) * pr, ch - 4, 8); ctx.fillStyle = pr >= 1 ? '#3f8f6b' : 'rgba(245,179,53,.55)'; ctx.fill(); ctx.restore();
          UI.text(ctx, mo.glyph === '♥' ? mo.pat0.split(':').slice(1).join(' ') : mo.glyph, x + cw / 2, yy + ch / 2, { size: Math.min(fs * .85, ch * .45), color: '#fff7dc', weight: 900, maxWidth: cw - 8 }); });
      } else {
        UI.text(ctx, 'No chat, no accounts. Progress stays on this device.', x0, this.bReset.y - fs * 1.2, { size: fs * .75, align: 'left', color: 'rgba(255,247,220,.7)', weight: 800, maxWidth: ww });
        if (this.resetH > 0) { ctx.fillStyle = 'rgba(255,255,255,.25)'; MB.rr(ctx, this.bReset.x, this.bReset.y, this.bReset.w * this.resetH / 3, this.bReset.h, 20); ctx.fill(); }
      }
      if (this.msg) UI.text(ctx, this.msg.s, W / 2, H * .5, { size: fs * 1.2, color: C.gold, stroke: '#1d1850', strokeWidth: 8, weight: 900 }); }
  };

  /* ------------------------------------------------------------------ SHARE (behind the gate) */
  const Share = {
    hud: true, pausable: false,
    enter() { M = MB.data(game.save); this.t = 0; this.msg = null; const today = Daily.key(); const band = M.set.band; this.jar = M.jar[band + ':' + today] || M.jar[(band === 's' ? 'f' : 's') + ':' + today] || null; this.jband = M.jar[band + ':' + today] ? band : (band === 's' ? 'f' : 's');
      const last = M.prof[band]; const stars = MB.totalStars(M);
      this.text = this.jar ? MB.jarText(this.jband, today, Object.assign({ streak: Daily.status(game.save).streak }, this.jar)) : `🌙 Mothabet: ${Object.keys(M.moths).length}/${MB.MOTHS.length} moths caught, ${stars} stars, ${MB.streakNow(M)}-day streak`;
      this.card = MB.shareCard({ title: this.jar ? `Daily Jar #${MB.jarNo(today)}` : 'My moth jar', big: this.jar ? `${this.jar.right}/10` : String(Object.keys(M.moths).length), line: this.jar ? `${MB.BANDS[this.jband].name} · ${this.jar.score} pts` : `moths caught · ${stars} stars`, sub: `${MB.streakNow(M)}-day streak`, stars: null });
      void last;
      this.bBack = backBtn(() => game.go('grown', null, { fade: .15 }));
      this.bShare = B('Share', 'gold', () => this.share(), { ico: 'share' }); this.bCopy = B('Copy text', 'mint', () => this.copy(this.text, 'Copied!'));
      this.bLink = B('Copy challenge link', 'cream', () => this.copy(this.chLink(), 'Link copied!'));
      this.buttons = [this.bBack, this.bShare, this.bCopy, this.bLink]; },
    chLink() { const band = M.set.band, si = curStage(band); return MB.Challenge.link({ band, stage: si, seed: (MB.h32(Daily.key() + band + si) >>> 0), score: M.prof[band].best[MB.STAGES[band][si].id] | 0 }); },
    copy(s, ok) { const done = () => { this.msg = { s: ok, t: 2 }; }; try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(s).then(done, () => { this.msg = { s: 'Copy not allowed here', t: 2 }; }); else this.msg = { s: 'Copy not available', t: 2 }; } catch (e) { this.msg = { s: 'Copy not available', t: 2 }; } },
    share() { const txt = this.text; try { if (navigator.share) { const go = (files) => navigator.share(Object.assign({ title: 'Mothabet', text: txt }, files ? { files } : {})).catch(() => {});
          if (this.card.toBlob && navigator.canShare) this.card.toBlob(b => { try { const f = new File([b], 'mothabet.png', { type: 'image/png' }); go(navigator.canShare({ files: [f] }) ? [f] : null); } catch (e) { go(null); } }, 'image/png'); else go(null); } else this.copy(txt, 'Copied! Paste it anywhere'); } catch (e) { this.copy(txt, 'Copied!'); } },
    resize(W, H) { hudFix(); placeBack(this.bBack); const sa = SA(), t = T(), p = por(); const top = hudBottom() + 10; const bh = t;
      const nb = 3, by = H - sa.b - 16 - (p ? nb * (bh + 12) : bh); this.cs = Math.min(W - 40, by - top - 20, 620); this.cx = W / 2 - this.cs / 2; this.cy = top;
      if (p) [this.bShare, this.bCopy, this.bLink].forEach((b, i) => place(b, W / 2 - Math.min(W - 40, 480) / 2, by + i * (bh + 12), Math.min(W - 40, 480), bh));
      else { const bw = Math.min((W - 60) / 3, 340); [this.bShare, this.bCopy, this.bLink].forEach((b, i) => place(b, W / 2 - (bw * 3 + 24) / 2 + i * (bw + 12), by, bw, bh)); } },
    update(dt) { this.t += dt; if (this.msg) { this.msg.t -= dt; if (this.msg.t <= 0) this.msg = null; } },
    keyDown(c) { if (c === 'Escape') game.go('grown', null, { fade: .15 }); },
    draw(ctx) { const { W } = game; backdrop(ctx); heading(ctx, 'Share', this.bBack.y + this.bBack.h / 2); ctx.drawImage(this.card, this.cx, this.cy, this.cs, this.cs);
      if (this.msg) UI.text(ctx, this.msg.s, W / 2, this.cy + this.cs / 2, { size: FS(18, 34), color: C.gold, stroke: '#1d1850', strokeWidth: 8, weight: 900 }); }
  };

  /* ------------------------------------------------------------------ CHALLENGE (incoming #mb= link) */
  const Challenge = {
    overlay: true, hud: true, pausable: false,
    enter(c) { this.c = c; this.bGo = B('Try it!', 'gold', spoken('Try it!', () => { game.pop(); game.go('play', { mode: 'challenge', band: c.band, stage: c.stage, seed: c.seed, target: c.score }, { fade: .2 }); }), { ico: 'next', glowPulse: true });
      this.bX = B('', 'indigo', () => { game.pop(); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }, { ico: 'close' }); this.buttons = [this.bGo, this.bX]; },
    resize(W, H) { hudFix(); const t = T(), pw = Math.min(W - 40, 600), ph = Math.min(H - 80, 520); this.px = W / 2 - pw / 2; this.py = H / 2 - ph / 2; this.pw = pw; this.ph = ph; place(this.bGo, W / 2 - 180, this.py + ph - t * 1.3 - 24, 360, t * 1.3); place(this.bX, this.px + pw - t - 12, this.py + 12, t, t); },
    keyDown(c) { if (c === 'Enter') this.bGo.onClick(); if (c === 'Escape') this.bX.onClick(); },
    draw(ctx) { const { W, H } = game, c = this.c, fs = FS(17, 30); ctx.fillStyle = 'rgba(8,6,28,.7)'; ctx.fillRect(0, 0, W, H); MB.patch(ctx, this.px, this.py, this.pw, this.ph, '#251f63', { r: 40 });
      UI.text(ctx, 'A moth challenge!', W / 2, this.py + fs * 2, { size: fs * 1.25, color: C.gold, weight: 700, display: true });
      UI.text(ctx, `${MB.BANDS[c.band].name}, stage ${c.stage + 1}: ${MB.STAGES[c.band][c.stage].name}`, W / 2, this.py + fs * 3.6, { size: fs * .8, color: '#fff7dc', weight: 800, maxWidth: this.pw - 40 });
      UI.text(ctx, c.score ? `Score to beat: ${c.score}` : 'Same words, same moths', W / 2, this.py + fs * 5, { size: fs, color: C.mint, weight: 900 });
      MB.drawMoth(ctx, W / 2, this.py + fs * 7.3, fs * 1.4, { col: C.marigold, label: 'a', open: .6 + .4 * Math.sin(game.time * 6) }); }
  };

  /* ------------------------------------------------------------------ boot */
  // Backing-store cap (rule 9): full DPR up to ~3.2 MP, then scale DPR down so big screens (iPad Pro 12.9" @2x = 5.6 MP) stay smooth. Read by the engine on every resize.
  const PX_CAP = 3.2e6, MAX_DPR = () => Math.max(1, Math.min(3, Math.sqrt(PX_CAP / Math.max(1, innerWidth * innerHeight))));
  game = HX.createGame({ slug: SLUG, canvas: document.getElementById('game'), start: 'title', menuScene: 'title', get maxDpr() { return MAX_DPR(); }, letterbox: '#0b0920',
    brand: { splash: false, badge: false },
    scenes: { title: Title, path: Path, goal: Goal, play: Play, results: Results, book: Book, gate: Gate, grown: Grown, share: Share, challenge: Challenge } });
  M = MB.data(game.save); MB.Voice.enabled = M.set.voice; MB.Voice.rate = M.set.rate; MB.Voice.init(); MB.Voice.onChange(() => { if (game.scene && game.scene.layout && game.scene === game.scenes.grown) game.scene.layout(); });
  // finger-sized pause overlay
  const ps = game.scenes.pause, psl = ps.layout; if (psl) ps.layout = function () { psl.call(this); const bh = Math.max(T(), 74); const W = game.W, H = game.H, bw = Math.min(420, W - 60); this.buttons.forEach((b, i) => Object.assign(b, { x: W / 2 - bw / 2, y: H / 2 - bh * 1.2 + i * (bh + 16), w: bw, h: bh })); };
  // Letter entry: while a jar round is live, letter keys catch moths. Capture them before the engine's window listener so
  // KeyM/KeyP don't mute/pause (mute + pause stay on the on-screen buttons; Esc still pauses). Modifier combos pass through.
  window.addEventListener('keydown', (e) => {
    const s = game.scene, p = game.scenes.play; if (s !== p || e.ctrlKey || e.metaKey || e.altKey || !/^Key[A-Z]$/.test(e.code)) return;
    e.stopImmediatePropagation(); e.preventDefault(); if (e.repeat) return; try { Audio.unlock && Audio.unlock('keydown'); } catch (er) {} p.keyDown(e.code, true);
  }, true);
  game.start();
  try { if (window.ElearneaBridge) window.ElearneaBridge.boot(game, MB, M); } catch (e) { console.warn('[Elearnea] bridge', e); }
  /*@qa*/
  window.__qa = {
    start: (o) => game.go('play', Object.assign({ mode: 'stage', band: 's', stage: 0 }, o || {})),
    forceGameOver: (s) => { const p = game.scenes.play; if (game.base !== p) window.__qa.start(); p.score = s; p.endRound('qa'); },
    state: () => { const p = game.scenes.play, w = p.word; return { scene: game.scene && game.scene.name, base: game.base && game.base.name, phase: p.phase, idx: p.idx, word: w && w.it.w, tiles: w && w.it.tiles, filled: w && w.filled, need: p.need && p.need(), score: p.score, combo: p.combo, time: p.time, moths: (p.moths || []).filter(m => m.state === 'fly').map(m => ({ ch: m.ch, x: Math.round(m.x), y: Math.round(m.y) })), voice: MB.Voice.ok }; },
    // place the next needed tile (true = correct, false = a wrong moth)
    place: (ok) => { const p = game.scenes.play, need = p.need(); const m = p.moths.find(x => x.state === 'fly' && (ok === false ? x.ch !== need : x.ch === need)); if (m) p.attempt(m); return !!m; },
    solveWord: () => { const p = game.scenes.play; let n = 0; while (p.phase === 'word' && n++ < 12) { if (!window.__qa.place(true)) break; } return p.phase; },
    toScreen: (x, y) => { const v = game.view; return { x: v.ox / 1 + x * v.scale, y: v.oy + y * v.scale }; },
    M: () => M, MB
  };
  /*@qa-end*/
})();
