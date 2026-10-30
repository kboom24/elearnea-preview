/* Firefly Choir (Art & Music realm opener, ages 4-9). Original Elearnea game: Wick's choir of fireflies sings in a night meadow.
   Every sound is synthesized here with WebAudio (no audio files except the shared Kokoro voice prompts). Modes (catalog config.mode):
   - highlow  (am-l1) Listen: Wick's lantern sings a home note, then the mystery firefly sings higher or lower. Tap the HIGH firefly (top of the
              flower) or the LOW firefly (in the grass). Adaptive interval: 19 -> 12 -> 7 -> 4 semitones. NCAS MU:Pr4.2.Ka (high/low contrast),
              MU:Pr4.2.1a (melodic contour).
   - tempo    (am-l2) Fast or slow (rabbit / snail) and loud or soft (big bright firefly / sleepy tiny firefly), mixed. Adaptive: the two tempos and
              the two volumes move closer together. MU:Pr4.2.Ka (loud/soft contrast) + MU:Cr1.1.Ka (beat).
   - echo     (am-l3) Wick's firefly taps a rhythm on the moon drum while big dots (iconic notation, spaced by time) light up; the child taps it
              back. Judged on the tap count and the timing ratios (tempo-free), tolerance 45% -> 28% with level. MU:Cr1.1.Ka (beat),
              MU:Pr4.2.1b (perform rhythmic patterns from iconic notation).
   - pattern  (am-l4) A song branch with an ABAB or AABB pattern of two firefly notes (A = sol, B = mi); fill the empty spots, then press Play
              and the whole repeating melody sings. MU:Cr1.1.Kb (make musical ideas / motives) + math repeating patterns (CCSS MP7).
   Never fail: no lives, no timers. 1st miss = soft wobble + "Listen again" (the sound replays); 2nd miss = the answer glows / Wick models it.
   Mastery items: high, low | fast, slow, loud, soft | rhythm ids | ABAB, AABB (El.Learn spaced review + ~80% adaptive difficulty).
   Contract: start(config, host) -> {stop}; host.emit('progress'|'mastery'); host.end(results). On-device only. */
(function () {
  'use strict';
  // Echo judge (pure; also used by QA): target = inter-onset intervals in beats, taps = tap times in ms. Tempo-free: the child's intervals are
  // fitted to the target with one least-squares scale, which must sit in a sane tempo range; then every interval must be within tol.
  function judge(target, taps, tol, beatMs) {
    const n = target.length + 1; if (taps.length !== n) return { ok: false, why: taps.length < n ? 'few' : 'many', errs: [] };
    if (n === 1) return { ok: true, errs: [] };
    const c = []; for (let i = 1; i < taps.length; i++) c.push(taps[i] - taps[i - 1]);
    const s = c.reduce((a, v, i) => a + v * target[i], 0) / target.reduce((a, t) => a + t * t, 0); // ms per beat the child used
    const bm = beatMs || 500; if (s < bm * .45 || s > bm * 2.2) return { ok: false, why: 'tempo', scale: s, errs: [] };
    const errs = c.map((v, i) => v / (s * target[i]) - 1); const worst = Math.max(...errs.map(Math.abs));
    return { ok: worst <= tol, why: worst <= tol ? '' : 'timing', scale: s, worst, errs };
  }
  El.fireflyChoirJudge = judge;

  El.defineGame({
    id: 'firefly-choir',
    start(cfg, host) {
      const L = host.learn, rng = host.rng, root = host.root, mode = cfg.mode || 'highlow', total = cfg.rounds || 6;
      let alive = true, qi = 0, firstTry = 0, timers = [], busy = false, miss = 0, cur = null, replay = null, demoDone = {};
      const QA = /[?&]qa=1(&|$)/.test(location.search), qaMark = (k, v) => { if (!QA) return; if (v == null) delete root.dataset[k]; else root.dataset[k] = v; };
      const setBusy = (b) => { busy = b; qaMark('busy', b ? '1' : '0'); };
      const T = (fn, ms) => { const h = setTimeout(() => { if (alive) fn(); }, ms); timers.push(h); return h; };
      const lvl = () => L.levelIndex(cfg.skill, 4);
      // speech: every line below is in voice/manifest.json (tools/voice/build-manifest.js, Firefly Choir section)
      const speak = (t, cb, wd) => { let done = false; const fin = () => { if (done) return; done = true; if (cb && alive) cb(); };
        const ok = host.say(t, { rate: .95, onend: fin }); if (cb) T(fin, ok ? (wd || 3000) : 450); return ok; };

      /* ---------------- synth: soft "firefly bell" voice, a wooden "tok" for rhythms, all into a gentle limiter ---------------- */
      let bus = null;
      const ctx = () => { const c = El.audio(); if (!c) return null; if (!bus || bus.context !== c) { const comp = c.createDynamicsCompressor();
        comp.threshold.value = -6; comp.knee.value = 4; comp.ratio.value = 6; comp.attack.value = .003; comp.release.value = .2;
        const g = c.createGain(); g.gain.value = .85; g.connect(comp); comp.connect(c.destination); bus = g; } return c; };
      // note: 12 ms attack, short decay to a held level, 140 ms release; sine + quiet octave triangle through a low-pass (no harsh edges)
      function note(freq, at, dur, vol) { const c = ctx(); if (!c) return; const t = c.currentTime + .04 + (at || 0), d = dur || .42, v = vol || .2;
        const g = c.createGain(), f = c.createBiquadFilter(), o1 = c.createOscillator(), o2 = c.createOscillator(), g2 = c.createGain();
        f.type = 'lowpass'; f.frequency.value = Math.min(5200, freq * 5); o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = freq; o2.frequency.value = freq * 2; g2.gain.value = .16;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(v * .62, t + .14);
        g.gain.setValueAtTime(v * .62, t + d); g.gain.exponentialRampToValueAtTime(.0005, t + d + .14);
        o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(f); f.connect(bus); [o1, o2].forEach(o => { o.start(t); o.stop(t + d + .2); }); }
      function tok(at, vol) { const c = ctx(); if (!c) return; const t = c.currentTime + .02 + (at || 0), v = vol || .3; const g = c.createGain(), o = c.createOscillator();
        o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(260, t + .12);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(.0005, t + .22);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + .26);
        const g3 = c.createGain(), o3 = c.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 1560; g3.gain.setValueAtTime(0, t); g3.gain.linearRampToValueAtTime(v * .12, t + .003); g3.gain.exponentialRampToValueAtTime(.0005, t + .05); o3.connect(g3); g3.connect(bus); o3.start(t); o3.stop(t + .08); }
      const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
      const chime = () => [0, 4, 7, 12].forEach((s, i) => note(hz(72 + s), i * .09, .3, .12));
      const soft = () => note(hz(57), 0, .22, .09);

      /* ---------------- art (inline SVG, original, paper-cut + glow) ---------------- */
      const fly = (col, o) => { o = o || {}; const id = 'g' + Math.floor(rng.next() * 1e9);
        return `<svg class="ffly${o.sleep ? ' sleep' : ''}" viewBox="-60 -60 120 120" aria-hidden="true"><defs><radialGradient id="${id}"><stop offset="0" stop-color="#FFFBE0"/><stop offset=".5" stop-color="${col}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>
          <circle class="halo" r="56" fill="url(#${id})" opacity=".55"/>
          <ellipse cx="-17" cy="-22" rx="15" ry="24" fill="#F6EBD9" opacity=".85" transform="rotate(-28 -17 -22)"/><ellipse cx="17" cy="-22" rx="15" ry="24" fill="#F6EBD9" opacity=".85" transform="rotate(28 17 -22)"/>
          <ellipse cy="6" rx="17" ry="24" fill="#2A2152"/><ellipse cy="18" rx="15" ry="15" fill="${col}"/><ellipse cy="16" rx="8" ry="7" fill="#FFFBE0" opacity=".8"/>
          <circle cy="-20" r="12" fill="#2A2152"/>${o.sleep ? '<path d="M-8 -21q3 3 6 0M2 -21q3 3 6 0" stroke="#F6EBD9" stroke-width="2.5" fill="none" stroke-linecap="round"/>' : '<circle cx="-5" cy="-21" r="3.2" fill="#F6EBD9"/><circle cx="5" cy="-21" r="3.2" fill="#F6EBD9"/><path d="M-5 -14q5 4 10 0" stroke="#F6EBD9" stroke-width="2.2" fill="none" stroke-linecap="round"/>'}
          <path d="M-5 -31q-6-12-13-14M5 -31q6-12 13-14" stroke="#2A2152" stroke-width="3" fill="none" stroke-linecap="round"/>${o.waves ? '<path class="wv" d="M30 -10q10 10 0 20M38 -18q16 18 0 36M46 -26q22 26 0 52" stroke="#F6EBD9" stroke-width="4" fill="none" stroke-linecap="round"/>' : ''}${o.zz ? '<text x="22" y="-26" font-size="20" font-weight="800" fill="#F6EBD9" font-family="sans-serif">z</text><text x="34" y="-38" font-size="14" font-weight="800" fill="#F6EBD9" font-family="sans-serif">z</text>' : ''}</svg>`; };
      const rabbit = `<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M8 70h26M4 80h20M12 60h18" stroke="#F6EBD9" stroke-width="5" stroke-linecap="round" opacity=".7"/><ellipse cx="72" cy="66" rx="30" ry="22" fill="#F6EBD9"/><circle cx="96" cy="50" r="16" fill="#F6EBD9"/><ellipse cx="90" cy="20" rx="6" ry="20" fill="#F6EBD9" transform="rotate(-12 90 20)"/><ellipse cx="102" cy="22" rx="6" ry="19" fill="#F6EBD9" transform="rotate(14 102 22)"/><ellipse cx="90" cy="22" rx="2.5" ry="12" fill="#F08A7E" transform="rotate(-12 90 22)"/><circle cx="101" cy="47" r="3" fill="#2A2152"/><circle cx="44" cy="62" r="7" fill="#fff"/><ellipse cx="66" cy="88" rx="14" ry="5" fill="#E1CFAF"/></svg>`;
      const snail = `<svg viewBox="0 0 120 100" aria-hidden="true"><path d="M14 84h80q12 0 14-10" fill="#7CC4A4" stroke="#7CC4A4" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M100 76V48M110 76V52" stroke="#7CC4A4" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="46" r="5" fill="#2A2152"/><circle cx="110" cy="50" r="5" fill="#2A2152"/><circle cx="54" cy="56" r="28" fill="#F08A7E"/><path d="M54 56m-18 0a18 18 0 1 1 18 18a11 11 0 1 1 -11 -11a5 5 0 1 1 5 5" fill="none" stroke="#C25F54" stroke-width="5" stroke-linecap="round"/></svg>`;
      const flower = (h) => `<svg class="stalk" viewBox="0 0 60 ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="M30 ${h}V10" stroke="#5E9E7E" stroke-width="7" stroke-linecap="round"/><path d="M30 ${h * .6}q-22-6-24-24q20 2 24 20zM30 ${h * .38}q22-6 24-24q-20 2-24 20z" fill="#7CC4A4"/></svg>`;
      const drumSVG = `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="fcMoon" cx=".4" cy=".35"><stop offset="0" stop-color="#FFF8DC"/><stop offset=".7" stop-color="#F5D98A"/><stop offset="1" stop-color="#E0B252"/></radialGradient></defs>
        <circle cx="100" cy="106" r="90" fill="rgba(20,17,58,.45)"/><circle cx="100" cy="100" r="90" fill="#8E5427"/><circle cx="100" cy="100" r="78" fill="url(#fcMoon)"/>
        <circle cx="72" cy="80" r="12" fill="#E8C877" opacity=".7"/><circle cx="128" cy="122" r="16" fill="#E8C877" opacity=".6"/><circle cx="122" cy="70" r="7" fill="#E8C877" opacity=".7"/>
        <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="3" stroke-dasharray="7 8"/></svg>`;
      const play = `<svg viewBox="0 0 52 52" aria-hidden="true"><path d="M18 11l24 15-24 15z" fill="currentColor" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg>`;
      const hand = `<svg viewBox="0 0 60 70" aria-hidden="true"><path d="M22 6a6 6 0 0 1 12 0v26l4-14a6 6 0 0 1 11 4l-3 28c-1 10-8 16-18 16h-4c-9 0-14-5-17-12L2 40a6 6 0 0 1 10-6l10 10z" fill="#F6EBD9" stroke="#2A2152" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
      const COL = { A: '#F5B841', B: '#7CC4A4' };

      root.innerHTML = `<div class="fc fc-${mode}">
        <div class="fc-prompt"><button class="wick fc-wick" id="fcWick" aria-label="Wick: hear it again"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""></button>
          <div class="bubble" id="fcTxt"></div><button class="btn round cream" id="fcSay" aria-label="Hear it again">${El.icon('sound')}</button></div>
        <div class="fc-scene" id="fcScene"><div class="fc-hills"></div><div class="fc-play" id="fcPlay"></div></div>
        <div class="fc-tray" id="fcTray"></div><div class="fc-fx" id="fcFx"></div><div class="fc-hand" id="fcHand">${hand}</div>
        <div class="fc-start" id="fcStart"><button class="btn round big glow" id="fcGo" aria-label="Start">${play}</button></div></div>`;
      const $ = (id) => root.querySelector('#' + id), txt = $('fcTxt'), playEl = $('fcPlay'), tray = $('fcTray'), fx = $('fcFx'), handEl = $('fcHand');
      const setText = (t) => { txt.textContent = t; };
      const wob = (el) => { el.classList.remove('wob'); void el.offsetWidth; el.classList.add('wob'); soft(); };
      const glow = (el, on) => el && el.classList.toggle('glow', on !== false);
      const pulse = (el) => { if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); };
      function sparks(el, n) { const fr = fx.getBoundingClientRect(), r = el.getBoundingClientRect(), cx = r.left + r.width / 2 - fr.left, cy = r.top + r.height / 2 - fr.top;
        for (let i = 0; i < (n || 12); i++) { const s = document.createElement('i'); const a = i / (n || 12) * Math.PI * 2, d = 50 + rng.next() * 60; s.className = 'spark';
          s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.setProperty('--x', (Math.cos(a) * d).toFixed(0) + 'px'); s.style.setProperty('--y', (Math.sin(a) * d).toFixed(0) + 'px'); fx.appendChild(s); T(() => s.remove(), 900); } }
      // the demo hand: glides to an element and "taps" it
      function point(el, cb, ms) { const fr = root.getBoundingClientRect(), r = el.getBoundingClientRect(); handEl.style.left = (r.left - fr.left + r.width / 2 - 20) + 'px'; handEl.style.top = (r.top - fr.top + r.height / 2 - 8) + 'px';
        handEl.classList.add('on'); T(() => { handEl.classList.add('tap'); T(() => handEl.classList.remove('tap'), 180); cb && cb(); }, ms || 520); }
      const handOff = () => handEl.classList.remove('on');
      $('fcSay').onclick = () => { if (!busy && replay) replay(); };
      $('fcWick').onclick = () => { const w = $('fcWick'); w.classList.remove('cheer'); void w.offsetWidth; w.classList.add('cheer'); if (!busy && replay) replay(); };

      const next = () => { host.emit('progress', { done: qi, total }); if (qi >= total) return finish(); miss = 0; ROUND[mode](); };
      const right = (item, el) => { const ft = miss === 0; if (ft) firstTry++; host.emit('mastery', { item, correct: true, firstTry: ft }); qi++; chime(); if (el) sparks(el, 14); };
      function finish() { setBusy(true); qaMark('phase', 'done'); T(() => host.end({ total, done: total, firstTry }), 500); }
      const items = (pool) => L.pick(cfg.skill, pool, total, rng);

      /* ================= 1. high vs low ================= */
      function setupHighLow() {
        playEl.innerHTML = `<div class="hl-col">${flower(400)}<button class="hl-fly hi" id="hlHi" aria-label="High">${fly('#F5B841')}<span class="tag">${El.icon('back')}</span></button>
          <div class="hl-lantern" id="hlMid">${fly('#9B8AD1')}</div><button class="hl-fly lo" id="hlLo" aria-label="Low">${fly('#F08A7E')}<span class="tag">${El.icon('back')}</span></button></div>`;
        $('hlHi').onclick = () => answer('high', $('hlHi')); $('hlLo').onclick = () => answer('low', $('hlLo'));
      }
      let hlPlan = null;
      function hlPlay(it, cb) { setBusy(true); const mid = $('hlMid'); glow(mid); const iv = [19, 12, 7, 4][it.lv], home = 67 + (it.lv >= 2 ? rng.int(-2, 2) : 0);
        note(hz(home), 0, .5, .2); note(hz(home + (it.want === 'high' ? iv : -iv)), .75, .6, .2);
        T(() => { mid.classList.add(it.want === 'high' ? 'up' : 'down'); }, 760); T(() => { glow(mid, false); mid.classList.remove('up', 'down'); setBusy(false); cb && cb(); }, 1550); }
      function demoHighLow(cb) { setBusy(true); const hi = $('hlHi'), lo = $('hlLo'); setText('High or low?');
        speak('This firefly sings high.', () => { glow(hi); pulse(hi); note(hz(79), 0, .6, .2); T(() => { glow(hi, false);
          speak('This firefly sings low.', () => { glow(lo); pulse(lo); note(hz(55), 0, .6, .22); T(() => { glow(lo, false); cb(); }, 900); }, 3200); }, 900); }, 3200); }
      ROUND.highlow = () => { const want = hlPlan[qi]; cur = { want, lv: lvl() }; qaMark('want', want); qaMark('phase', 'choose');
        const go = () => { setText('High or low?'); speak('Listen! High or low?', () => hlPlay(cur), 2600); replay = () => hlPlay(cur); };
        if (!demoDone.hl) { demoDone.hl = 1; demoHighLow(go); } else go(); };

      /* ================= 2. fast/slow + loud/soft ================= */
      const TEMPO = { fast: [.16, .2, .23, .26], slow: [.7, .55, .46, .4] }, VOL = { loud: [.34, .3, .27, .25], soft: [.045, .07, .09, .11] };
      function setupTempo() { playEl.innerHTML = `<div class="tp-singer" id="tpSinger">${fly('#9B8AD1')}</div>`; }
      function tpPlay(it, cb) { setBusy(true); const s = $('tpSinger'); glow(s); const dyn = it.want === 'loud' || it.want === 'soft';
        let t = 0, n = dyn ? 4 : 6; const step = dyn ? .42 : TEMPO[it.want][it.lv], vol = dyn ? VOL[it.want][it.lv] : .18, base = 67;
        for (let i = 0; i < n; i++) { note(hz(base + [0, 4, 7, 4, 0, 4][i]), t, Math.min(.36, step * .8), vol); t += step; }
        T(() => { glow(s, false); setBusy(false); cb && cb(); }, t * 1000 + 350); }
      function tpTray(kind) { const dyn = kind === 'dyn';
        tray.innerHTML = dyn ? `<button class="fc-card" id="c-loud" aria-label="Loud">${fly('#F5B841', { waves: 1 })}</button><button class="fc-card small" id="c-soft" aria-label="Soft"><span class="tiny">${fly('#9B8AD1', { sleep: 1, zz: 1 })}</span></button>`
          : `<button class="fc-card" id="c-fast" aria-label="Fast">${rabbit}</button><button class="fc-card" id="c-slow" aria-label="Slow">${snail}</button>`;
        (dyn ? ['loud', 'soft'] : ['fast', 'slow']).forEach(k => { $('c-' + k).onclick = () => answer(k, $('c-' + k)); }); }
      function demoTempo(kind, cb) { setBusy(true); const [a, b] = kind === 'dyn' ? ['loud', 'soft'] : ['fast', 'slow'];
        const L1 = { fast: 'This is fast.', slow: 'This is slow.', loud: 'This is loud.', soft: 'This is soft.' };
        speak(L1[a], () => { glow($('c-' + a)); tpPlay({ want: a, lv: 0 }, () => { glow($('c-' + a), false); setBusy(true);
          speak(L1[b], () => { glow($('c-' + b)); tpPlay({ want: b, lv: 0 }, () => { glow($('c-' + b), false); cb(); }); }, 2600); }); }, 2600); }
      let tpPlan = null;
      ROUND.tempo = () => { const want = tpPlan[qi], kind = want === 'loud' || want === 'soft' ? 'dyn' : 'tempo'; cur = { want, lv: lvl(), kind }; qaMark('want', want); qaMark('phase', 'choose'); tpTray(kind);
        const q = kind === 'dyn' ? 'Loud or soft?' : 'Fast or slow?';
        const go = () => { setText(q); speak(q, () => tpPlay(cur), 2200); replay = () => tpPlay(cur); };
        if (!demoDone[kind]) { demoDone[kind] = 1; demoTempo(kind, go); } else go(); };

      /* shared answer for the choice modes */
      const YES = { high: 'Yes! High!', low: 'Yes! Low!', fast: 'Yes! Fast!', slow: 'Yes! Slow!', loud: 'Yes! Loud!', soft: 'Yes! Soft!' };
      function answer(k, el) { if (busy || !cur) return;
        if (k === cur.want) { setBusy(true); glow(el); pulse(el); if (mode === 'highlow') note(hz(k === 'high' ? 79 : 55), 0, .45, .18); right(k, el); handOff();
          speak(YES[k], () => { glow(el, false); next(); }, 2200); return; }
        miss++; wob(el);
        if (miss === 1) { setBusy(true); speak('Listen again.', () => (mode === 'highlow' ? hlPlay : tpPlay)(cur), 2000); }
        else { setBusy(true); const good = mode === 'highlow' ? $(cur.want === 'high' ? 'hlHi' : 'hlLo') : $('c-' + cur.want);
          speak('Here it is!', () => { glow(good); (mode === 'highlow' ? hlPlay : tpPlay)(cur, () => { point(good, null, 400); }); }, 1800); } }

      /* ================= 3. echo a rhythm ================= */
      const RHY = [[[1, 1], [1, 1, 1]], [[2, 1, 1], [1, 1, 2], [.5, .5, 1]], [[1, .5, .5, 1], [.5, .5, 1, 1], [1, 1, .5, .5]], [[.5, .5, .5, .5, 1], [1, .5, .5, .5, .5], [.5, .5, 1, .5, .5]]];
      const rid = (p) => 'r' + p.join('-'); const BEAT = 520;
      const TOL = [.45, .38, .32, .28];
      function setupEcho() { playEl.innerHTML = `<div class="ec-dots" id="ecDots"></div><div class="ec-wick" id="ecFly">${fly('#F5B841')}</div>`;
        tray.innerHTML = `<button class="fc-drum" id="ecDrum" aria-label="Moon drum">${drumSVG}</button>`;
        // tap time = performance.now() in the handler (event timeStamp bases differ across browsers and synthetic input)
        $('ecDrum').addEventListener('pointerdown', (e) => { e.preventDefault(); drumTap(performance.now()); }); }
      function drawDots(p) { const n = p.length + 1, sum = p.reduce((a, b) => a + b, 0); let x = 0, h = '';
        for (let i = 0; i < n; i++) { h += `<i style="left:${(6 + 88 * x / sum).toFixed(2)}%"></i>`; if (i < p.length) x += p[i]; } $('ecDots').innerHTML = h; }
      const dot = (i, cls) => { const d = $('ecDots').children[i]; if (d) d.classList.add(cls); };
      const clearDots = () => [...$('ecDots').children].forEach(d => d.classList.remove('lit', 'me', 'off'));
      // Wick's firefly plays the rhythm; dots light in time (visuals from timers, sound on the audio clock)
      function ecPlay(p, cb, withHand) { setBusy(true); clearDots(); let t = 0; const times = [0]; p.forEach(v => { t += v * BEAT; times.push(t); });
        times.forEach((ms, i) => { tok(ms / 1000, .32); T(() => { dot(i, 'lit'); pulse($('ecFly')); if (withHand) { handEl.classList.add('tap'); T(() => handEl.classList.remove('tap'), 140); } }, ms + 40); });
        T(() => { setBusy(false); cb && cb(); }, t + 700); }
      let taps = [], tapWatch = null, guide = false;
      function drumTap(ts) { const d = $('ecDrum'); pulse(d); tok(0, .32); if (busy || !cur || cur.mode !== 'echo') return;
        taps.push(ts); dot(taps.length - 1, 'me'); clearTimeout(tapWatch);
        const n = cur.p.length + 1; if (taps.length >= n) { setBusy(true); const r = judge(cur.p, taps, guide ? 9 : TOL[cur.lv], BEAT); cur.last = r; root.dispatchEvent(new CustomEvent('fc:echo', { detail: r })); qaMark('judge', JSON.stringify(Object.assign({ taps: taps.map(t => Math.round(t - taps[0])) }, r)));
          return T(() => ecResult(r.ok || guide), 260); }
        // stopped tapping: gently treat as a miss after a long pause
        tapWatch = T(() => { if (!busy && taps.length && taps.length < n) { setBusy(true); const r = { ok: false, why: 'few', errs: [] }; cur.last = r; qaMark('judge', JSON.stringify(r)); ecResult(false); } }, 2600); }
      function ecTurn() { taps = []; clearDots(); setBusy(false); qaMark('judge', null); qaMark('phase', 'echo'); handOff(); }
      function ecResult(ok) { setBusy(true); clearTimeout(tapWatch); const d = $('ecDrum');
        if (ok) { glow(d); right(rid(cur.p), d); speak('Yes! You echoed it!', () => { glow(d, false); next(); }, 2400); return; }
        miss++; wob(d); [...$('ecDots').children].forEach(x => x.classList.add('off'));
        if (miss === 1) speak('Listen again.', () => ecPlay(cur.p, () => { setText('Your turn!'); speak('Your turn!', ecTurn, 1400); }), 2000);
        else { guide = true; speak('Tap with the lights.', () => { const fr = root.getBoundingClientRect(), r = d.getBoundingClientRect(); handEl.style.left = (r.left - fr.left + r.width / 2 - 20) + 'px'; handEl.style.top = (r.top - fr.top + r.height / 2 - 8) + 'px'; handEl.classList.add('on');
          ecPlay(cur.p, () => { taps = []; clearDots(); handOff(); setBusy(false); qaMark('judge', null); qaMark('phase', 'echo'); }, true); }, 2400); } }
      let ecPlan = null;
      ROUND.echo = () => { const p = ecPlan[qi]; guide = false; cur = { mode: 'echo', p, lv: lvl() }; drawDots(p); qaMark('want', p.map(v => Math.round(v * BEAT)).join(',')); qaMark('phase', 'listen'); setBusy(true);
        replay = () => ecPlay(cur.p, ecTurn);
        const go = () => { setText('Your turn!'); speak('Listen, then tap it back!', () => ecPlay(p, () => speak('Your turn!', ecTurn, 1400)), 2600); };
        if (!demoDone.ec) { demoDone.ec = 1; setText('Watch me first.');
          speak('Watch me first.', () => ecPlay(p, () => { setBusy(true); const d = $('ecDrum'), fr = root.getBoundingClientRect(), r = d.getBoundingClientRect(); handEl.style.left = (r.left - fr.left + r.width / 2 - 20) + 'px'; handEl.style.top = (r.top - fr.top + r.height / 2 - 8) + 'px'; handEl.classList.add('on');
            clearDots(); let t = 0; const times = [0]; p.forEach(v => { t += v * BEAT; times.push(t); }); times.forEach((ms, i) => T(() => { pulse(d); tok(0, .32); dot(i, 'me'); handEl.classList.add('tap'); T(() => handEl.classList.remove('tap'), 140); }, 400 + ms));
            T(() => { handOff(); clearDots(); setText('Your turn!'); speak('Your turn!', ecTurn, 1400); }, 400 + t + 800); }), 2200); }
        else go(); };

      /* ================= 4. ABAB / AABB melody patterns: build, then play ================= */
      const NOTE = { A: hz(79), B: hz(76) }; // sol (G5) and mi (E5): the "cuckoo" interval every child can sing
      const UNIT = { ABAB: 'AB', AABB: 'AABB' };
      function setupPattern() { playEl.innerHTML = `<div class="pt-branch" id="ptBranch"></div>`;
        tray.innerHTML = `<button class="fc-card nt" id="pA" aria-label="Gold firefly">${fly(COL.A)}</button><button class="fc-play btn round big glow" id="pPlay" aria-label="Play the song">${play}</button><button class="fc-card nt" id="pB" aria-label="Teal firefly">${fly(COL.B)}</button>`;
        $('pA').onclick = () => ptPick('A'); $('pB').onclick = () => ptPick('B'); $('pPlay').onclick = () => ptPlaySong(); }
      function ptDraw() { const b = $('ptBranch'); b.innerHTML = cur.seq.map((s, i) => `<span class="spot${i < cur.filled ? ' on' : ''}${i === cur.filled ? ' next' : ''}${i >= cur.given ? ' kid' : ''}" style="--c:${i < cur.filled ? COL[s] : 'transparent'}">${i < cur.filled ? fly(COL[s]) : ''}</span>`).join('');
        qaMark('want', cur.filled < cur.seq.length ? cur.seq[cur.filled] : 'play'); $('pPlay').classList.toggle('ready', cur.filled >= cur.seq.length); }
      function ptSing(from, to, cb, step) { setBusy(true); step = step || .42; const spots = $('ptBranch').children;
        for (let i = from; i < to; i++) { note(NOTE[cur.seq[i]], (i - from) * step, step * .78, .2); T(() => pulse(spots[i]), (i - from) * step * 1000 + 40); }
        T(() => { setBusy(false); cb && cb(); }, (to - from) * step * 1000 + 300); }
      function ptPick(s) { if (busy || !cur || cur.filled >= cur.seq.length) return; const btn = $('p' + s); note(NOTE[s], 0, .34, .2); pulse(btn); handOff();
        if (s === cur.seq[cur.filled]) { glow(btn, false); cur.filled++; ptDraw(); const sp = $('ptBranch').children[cur.filled - 1]; sparks(sp, 6);
          if (cur.filled >= cur.seq.length) { setBusy(true); setText('Now play your song!'); T(() => speak('Now play your song!', () => { setBusy(false); point($('pPlay'), null, 500); qaMark('phase', 'play'); }, 2200), 350); }
          return; }
        miss++; wob(btn); setBusy(true);
        if (miss === 1) speak('Listen to the pattern.', () => ptSing(0, cur.filled, () => setText('What comes next?')), 2200);
        else { const g = $('p' + cur.seq[cur.filled]); speak('This one fits!', () => { glow(g); point(g, null, 450); setBusy(false); }, 1800); } }
      function ptPlaySong() { if (busy || !cur || cur.filled < cur.seq.length) { if (!busy && cur) wob($('pPlay')); return; } handOff(); setText('Now play your song!');
        ptSing(0, cur.seq.length, () => { setBusy(true); right(cur.type, $('ptBranch')); speak('Your song repeats!', next, 2400); }, .4); }
      let ptPlan = null;
      ROUND.pattern = () => { const type = ptPlan[qi], lv = lvl(), u = UNIT[type], seq = (u + u + u + u).slice(0, 8).split('');
        const given = type === 'ABAB' ? [6, 4, 4, 2][lv] : [6, 4, 4, 4][lv];
        cur = { type, seq, given, filled: given, lv }; ptDraw(); qaMark('phase', 'build'); setBusy(true); replay = () => ptSing(0, cur.filled);
        const go = () => { setText('What comes next?'); ptSing(0, given, () => speak('What comes next?', null)); };
        if (!demoDone.pt) { demoDone.pt = 1; setText('Finish the song pattern!');
          speak('Finish the song pattern!', () => ptSing(0, given, () => speak('Watch me first.', () => { const g = $('p' + seq[given]); point(g, () => { setBusy(false); ptPick(seq[given]); setText('What comes next?'); speak('What comes next?', null); }, 700); }, 1800)), 2600); }
        else go(); };

      /* ================= boot ================= */
      function ROUND() {} // namespace holder for the per-mode round functions
      const setup = { highlow: setupHighLow, tempo: setupTempo, echo: setupEcho, pattern: setupPattern }[mode];
      if (mode === 'highlow') { const pool = ['high', 'low']; hlPlan = items(pool); if (!hlPlan.includes('high')) hlPlan[0] = 'high'; if (!hlPlan.includes('low')) hlPlan[1] = 'low'; }
      if (mode === 'tempo') { const lv = lvl(), pool = ['fast', 'slow', 'loud', 'soft']; tpPlan = items(pool);
        // keep pairs together early on (one contrast at a time), mix them later
        if (lv < 2) tpPlan = [...tpPlan.filter(k => k === 'fast' || k === 'slow'), ...tpPlan.filter(k => k === 'loud' || k === 'soft')]; }
      if (mode === 'echo') { const lv = lvl(), pool = []; for (let k = 0; k <= Math.min(3, lv + 1); k++) RHY[k].forEach(p => pool.push(rid(p)));
        const byId = Object.fromEntries(RHY.flat().map(p => [rid(p), p])); ecPlan = items(pool).map(id => byId[id]);
        ecPlan.sort((a, b) => a.length - b.length || 0); }
      if (mode === 'pattern') { ptPlan = items(['ABAB', 'AABB']); if (total > 1 && ptPlan.every(t => t === ptPlan[0])) ptPlan[1] = ptPlan[0] === 'ABAB' ? 'AABB' : 'ABAB'; if (lvl() < 2) ptPlan.sort(); }
      setup(); setBusy(true); qaMark('phase', 'start'); host.emit('progress', { done: 0, total });
      // first tap starts the lesson: it unlocks the AudioContext (and speech) on iPad/iPhone before any sound plays
      $('fcGo').onclick = () => { ctx(); El.sfx.tap(); $('fcStart').classList.add('gone'); T(() => { $('fcStart').remove(); next(); }, 260); };
      return { stop() { alive = false; timers.forEach(clearTimeout); clearTimeout(tapWatch); El.Voice.stop(); } };
    }
  });
})();
