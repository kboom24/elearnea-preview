/* Clocktower Gears (Math, ages 4-6, Kindergarten). Original Elearnea game in the Math realm's clocktower.
   Modes (catalog lesson config.mode):
   - pattern: a brass gear train carries shapes in a repeating pattern (AB, AAB, ABB, ABC, AABB) with one empty gear. Tap the shape that
     fits; the gears mesh and turn and the clock ticks. Pattern work has no K CCSS content code: tagged MP7 (look for structure), K.OA-adjacent.
   - name: "Find the triangle!" Tap the named shape among 2-4 shapes (K.G.A.2: name shapes regardless of size or orientation).
   - sort: a shape rides the big gear; tap the drawer with the same shape (circle, square, triangle, rectangle, hexagon) (K.G.B.4 + K.G.A.2).
   Adaptive (El.Learn difficulty, ~80% first-try): pattern type and length of the unit, number of choices, colour cue removed (pure shape
   patterns), missing gear in the middle; for shapes: more choices/drawers, then size, turn and proportion changes, look-alike pairs.
   Never fail: no lives, no timers. 1st miss = gentle wobble + voiced hint; 2nd miss = Wick sings the pattern / counts the sides along
   with highlights, and the right answer glows. Spaced review via El.Learn.pick (mastery items: pattern types / shape names).
   Contract: start(config, host) -> {stop}; host.emit('progress'|'mastery'); host.end(results). On-device only. */
El.defineGame({
  id: 'clocktower-gears',
  start(cfg, host) {
    const L = host.learn, rng = host.rng, root = host.root, mode = cfg.mode || 'pattern', total = cfg.rounds || 6;
    const SHAPES = cfg.shapes || ['circle', 'square', 'triangle', 'rectangle'];
    const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
    const FACT = { circle: 'Round, with no corners. A circle!', square: 'Four sides, all the same. A square!', triangle: 'Three sides. A triangle!',
      rectangle: 'Four sides. Two long, two short. A rectangle!', hexagon: 'Six sides. A hexagon!' };
    const PRAISE = ['Yes! The gears turn!', 'You fixed the pattern!']; // 'Tick tock! Great job!' rendered but held: speech-recognition flag, awaiting a human listen
    const COLORS = ['#F08A7E', '#7CC4A4', '#F5B841', '#9B8AD1', '#5DA9D6'];
    const LOOK = { square: 'rectangle', rectangle: 'square', circle: 'hexagon', hexagon: 'circle', triangle: 'square' };
    let alive = true, qi = 0, firstTry = 0, timers = [], prompt = '', hexIntro = false, busy = false;
    // QA mode only (?qa=1): the stage carries data-want (the answer) and data-busy so automated QA can play; never set for kids
    const QA = /[?&]qa=1(&|$)/.test(location.search), qaMark = (k, v) => { if (!QA) return; if (v == null) delete root.dataset[k]; else root.dataset[k] = v; };
    const setBusy = (b) => { busy = b; qaMark('busy', b ? '1' : '0'); };
    const T = (fn, ms) => { const h = setTimeout(() => { if (alive) fn(); }, ms); timers.push(h); return h; };
    const lvl = () => L.levelIndex(cfg.skill, 4);
    // speech: every line below is in voice/manifest.json (tools/voice/build-manifest.js, Clocktower Gears section)
    // cb runs once the line has really ended (ElVoice's onend: end, error, interruption or its clip watchdog; voice/voice-then.js), never on a fixed timer that could
    // cut a long line short; wd (old fixed watchdog) is ignored
    const speak = (t, cb) => praising ? false : host.sayThen(t, { rate: .95 }, cb ? () => { if (alive) cb(); } : null, 0).heard;
    // praise after a right answer, then the next question: only after the praise has ended (+ 300 ms), and at least `min` ms after the tap
    let praising = false; const praiseThen = (line, min) => { praising = true; const t0 = Date.now();
      host.sayThen(line, { rate: .95 }, () => T(() => { praising = false; next(); }, Math.max(0, min - (Date.now() - t0))), 300); };
    const setPrompt = (shown, spoken) => { prompt = spoken; txt.textContent = shown; speak(spoken); };

    /* ---------------- art: paper-cut shapes, brass gears, clock (inline SVG, original) ---------------- */
    const pts = (a) => a.map(p => p.map(v => +v.toFixed(1)).join(',')).join(' ');
    function geom(kind, v) { v = v || {}; const g = geom0(kind, v); if (!v.fit) return g;
      // fit: shapes riding a gear are scaled so every corner (at any turn) stays inside the gear's cream plate
      const rm = g.r || Math.max(...g.p.map(q => Math.hypot(q[0], q[1]))), f = Math.min(1, v.fit / rm); return g.r ? { r: g.r * f } : { p: g.p.map(q => [q[0] * f, q[1] * f]) }; }
    function geom0(kind, v) { const k = v.k || 1;
      if (kind === 'circle') return { r: 40 * k };
      if (kind === 'square') { const h = 34 * k; return { p: [[-h, -h], [h, -h], [h, h], [-h, h]] }; }
      if (kind === 'rectangle') { const a = v.aspect || 1.75, h = 40 * k / Math.sqrt(a) * 1.05, w = h * a; const W = Math.min(w, 47), H = W / a; return { p: [[-W, -H], [W, -H], [W, H], [-W, H]] }; }
      if (kind === 'triangle') { const t = v.tri || 0, s = 44 * k; return { p: t === 1 ? [[-s * .8, s * .75], [s * .8, s * .75], [-s * .8, -s * .85]] : t === 2 ? [[-s, s * .55], [s, s * .55], [s * .25, -s * .7]] : [[0, -s * .95], [s * .95, s * .7], [-s * .95, s * .7]] }; }
      if (kind === 'hexagon') { const r = 42 * k; return { p: [0, 1, 2, 3, 4, 5].map(i => [r * Math.cos(i * Math.PI / 3), r * Math.sin(i * Math.PI / 3)]) }; }
    }
    // one paper-cut shape: dark paper shadow layer, coloured felt layer, light cut edge; sides as separate lines for count-along highlights
    function shapeSVG(kind, color, v) { v = v || {}; const g = geom(kind, v), rot = v.rot || 0;
      const body = g.r ? (d, x) => `<circle cx="${d}" cy="${d}" r="${g.r}" ${x}/>` : (d, x) => `<polygon points="${pts(g.p.map(q => [q[0] + d, q[1] + d]))}" stroke-linejoin="round" ${x}/>`;
      const sides = g.r ? `<circle class="side ring" cx="0" cy="0" r="${g.r}" pathLength="100"/>` : g.p.map((q, i) => { const n = g.p[(i + 1) % g.p.length]; return `<line class="side" data-i="${i}" x1="${q[0].toFixed(1)}" y1="${q[1].toFixed(1)}" x2="${n[0].toFixed(1)}" y2="${n[1].toFixed(1)}"/>`; }).join('');
      return `<svg class="shp" viewBox="-51 -51 102 102" aria-hidden="true"><g transform="rotate(${rot})">${body(4, 'fill="rgba(20,17,58,.45)" stroke="rgba(20,17,58,.45)" stroke-width="7"')}
        ${body(0, `fill="${color}" stroke="${color}" stroke-width="7"`)}${body(0, 'fill="url(#cgFeltP)" opacity=".5"')}
        ${body(0, 'fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.5" stroke-dasharray="5 6" transform="scale(.82)"')}<g class="sides">${sides}</g></g></svg>`; }
    function gearPath(n, ro, ri) { let d = ''; const st = Math.PI * 2 / n;
      for (let i = 0; i < n; i++) { const a = i * st; const P = (r, t) => `${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
        d += (i ? 'L' : 'M') + P(ri, a - st * .5) + 'L' + P(ri, a - st * .28) + 'L' + P(ro, a - st * .17) + 'L' + P(ro, a + st * .17) + 'L' + P(ri, a + st * .28); }
      return d + 'Z'; }
    const GEAR = gearPath(10, 50, 41), GEAR_S = gearPath(8, 50, 39);
    const gearSVG = (small) => `<svg class="gsvg" viewBox="-56 -56 112 112" aria-hidden="true"><path d="${small ? GEAR_S : GEAR}" transform="translate(3 4)" fill="rgba(20,17,58,.5)"/>
      <path d="${small ? GEAR_S : GEAR} M0 -35a35 35 0 1 0 0 70a35 35 0 1 0 0-70z" fill-rule="evenodd" fill="url(#cgBrass)" stroke="#8E5A12" stroke-width="2.5"/>
      <path d="${small ? GEAR_S : GEAR}" fill="url(#cgFeltP)" opacity=".35"/><circle r="38.5" fill="none" stroke="#FFE7A8" stroke-width="2" stroke-dasharray="4 5" opacity=".7"/>
      <circle r="35.5" fill="#F6EBD9"/><circle r="35.5" fill="url(#cgFeltP)" opacity=".4"/><circle r="35.5" fill="none" stroke="#C98A1C" stroke-width="3"/></svg>`;
    const decoGear = (cls, n) => `<div class="cg-deco ${cls}"><svg viewBox="-56 -56 112 112"><path d="${gearPath(n, 52, 43)} M0 -22a22 22 0 1 0 0 44a22 22 0 1 0 0-44z" fill-rule="evenodd" fill="url(#cgBrass)" opacity=".9"/><circle r="9" fill="#8E5A12"/></svg></div>`;
    const clockSVG = `<svg class="cg-clock" viewBox="-60 -60 120 120" aria-hidden="true">
      <circle r="58" fill="#8E5427"/><circle r="54" fill="url(#cgBrass)"/><circle r="47" fill="#F6EBD9"/><circle r="47" fill="url(#cgFeltP)" opacity=".5"/>
      ${Array.from({ length: 12 }, (_, i) => `<rect x="-2.5" y="-43" width="5" height="${i % 3 ? 7 : 12}" rx="2.5" fill="#2A2152" transform="rotate(${i * 30})"/>`).join('')}
      <g class="hand hr"><rect x="-3.5" y="-26" width="7" height="30" rx="3.5" fill="#2A2152"/></g><g class="hand mn"><rect x="-2.5" y="-38" width="5" height="42" rx="2.5" fill="#C25F54"/></g>
      <circle r="6" fill="#F5B841" stroke="#2A2152" stroke-width="2"/></svg>`;
    const bell = `<svg class="cg-bell" viewBox="0 0 60 60" aria-hidden="true"><path d="M30 6c-12 0-18 10-18 22v10l-6 8h48l-6-8V28C48 16 42 6 30 6z" fill="url(#cgBrass)" stroke="#8E5A12" stroke-width="2.5"/><circle cx="30" cy="50" r="5" fill="#8E5A12"/></svg>`;
    const drawerFront = (kind) => `<span class="dr-box"><span class="dr-in"></span></span><span class="dr-front">${shapeSVG(kind, '#F6EBD9', { k: .78 })}<i class="dr-knob"></i></span>`;

    root.innerHTML = `<div class="cg cg-${mode}">
      <svg class="cg-defs" width="0" height="0" aria-hidden="true"><defs>
        <linearGradient id="cgBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FCE3A0"/><stop offset=".45" stop-color="#F5B841"/><stop offset="1" stop-color="#B9791A"/></linearGradient>
        <pattern id="cgFeltP" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="none"/>${Array.from({ length: 26 }, (_, i) => `<circle cx="${(i * 37) % 40}" cy="${(i * 23 + 7) % 40}" r="${.6 + (i % 3) * .35}" fill="${i % 2 ? '#fff' : '#000'}" opacity=".18"/>`).join('')}</pattern>
      </defs></svg>
      <div class="cg-prompt"><button class="wick cg-wick" id="cgWick" aria-label="Wick: hear it again"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""></button>
        <div class="bubble" id="cgTxt"></div><button class="btn round cream" id="cgSay" aria-label="Hear it again">${El.icon('sound')}</button></div>
      <div class="cg-scene" id="cgScene"><div class="cg-tower">${decoGear('d1', 12)}${decoGear('d2', 9)}
        <div class="cg-top"><div class="cg-roof"></div>${bell}<div class="cg-clockwrap">${clockSVG}</div></div>
        <div class="cg-window" id="cgWin"></div></div></div>
      <div class="cg-tray" id="cgTray"></div><div class="cg-fx" id="cgFx"></div></div>`;
    const $ = (id) => root.querySelector('#' + id), txt = $('cgTxt'), win = $('cgWin'), tray = $('cgTray'), fx = $('cgFx'), cgRoot = root.querySelector('.cg');
    const replay = () => { if (praising || busy) return; host.sfx.tap(); speak(prompt); }; // never over the praise or a count-along / pattern song (each step goes on from the line's onend, which also fires when interrupted)
    $('cgSay').onclick = replay; $('cgWick').onclick = () => { cheer(); replay(); };
    const cheer = () => { const w = $('cgWick'); w.classList.remove('cheer'); void w.offsetWidth; w.classList.add('cheer'); };

    /* ---------------- sounds (WebAudio synth via El.sfx.tone; no files) ---------------- */
    const tone = (o) => host.sfx.tone && host.sfx.tone(o);
    const sfx = {
      tick(k) { tone({ type: 'square', freq: k % 2 ? 1900 : 2300, dur: .035, vol: .045 }); tone({ type: 'triangle', freq: 180, dur: .06, vol: .06 }); },
      whirr() { for (let i = 0; i < 6; i++) sfx.tickAt(i * .07, i); },
      tickAt(d, k) { tone({ type: 'square', freq: k % 2 ? 1700 : 2100, dur: .03, vol: .035, delay: d }); },
      clunk() { tone({ type: 'triangle', freq: 160, to: 110, dur: .2, vol: .14 }); tone({ type: 'square', freq: 900, dur: .03, vol: .03 }); },
      // bell: inharmonic partials (1, 2, 2.4, 3, 4.2) with long decays
      bell(f, d) { [[1, .16, 2.2], [2, .07, 1.4], [2.4, .05, 1.1], [3, .04, .8], [4.2, .025, .5]].forEach(([m, v, t]) => tone({ freq: f * m, dur: t, vol: v, delay: d || 0 })); },
      chime() { [659.25, 523.25, 587.33, 392, 392, 587.33, 659.25, 523.25].forEach((f, i) => sfx.bell(f, i * .42)); }
    };

    /* ---------------- fx ---------------- */
    function burst(el, n) { const fr = fx.getBoundingClientRect(), r = el.getBoundingClientRect(), cx = r.left + r.width / 2 - fr.left, cy = r.top + r.height / 2 - fr.top;
      for (let i = 0; i < (n || 12); i++) { const s = document.createElement('i'); const a = i / (n || 12) * Math.PI * 2 + rng.next() * .4, d = 50 + rng.next() * 60;
        s.className = 'spark' + (i % 3 ? '' : ' star'); s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.setProperty('--x', (Math.cos(a) * d).toFixed(0) + 'px'); s.style.setProperty('--y', (Math.sin(a) * d).toFixed(0) + 'px');
        s.style.background = i % 3 ? COLORS[i % COLORS.length] : ''; fx.appendChild(s); T(() => s.remove(), 900); } }
    let ticks = 0; const hand = (sel) => root.querySelector('.cg-clock .' + sel);
    function advanceClock(final) { ticks++; const mn = final ? 720 : ticks * 360 / total; hand('mn').style.transform = `rotate(${mn}deg)`; hand('hr').style.transform = `rotate(${final ? 360 : ticks * 30 / total * 2}deg)`; sfx.tick(ticks); }
    function spinAll(k) { root.querySelectorAll('.gear, .cg-deco').forEach(g => { g.classList.remove('spin'); void g.offsetWidth; g.style.setProperty('--turn', (k || 1) * 72 + 'deg'); g.classList.add('spin'); }); sfx.whirr(); }
    function wobble(el) { el.classList.remove('wob'); void el.offsetWidth; el.classList.add('wob'); sfx.clunk(); }
    // fly a copy of `from` onto `to` (positions only; works with reduced motion because completion is timer-driven)
    function fly(from, to, html, ms, cls) { if (!from || !to) return null; const fr = fx.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect(); const c = document.createElement('div'); c.className = 'cg-fly ' + (cls || ''); c.innerHTML = html;
      const sz = Math.min(a.width, a.height); c.style.width = c.style.height = sz + 'px'; c.style.left = (a.left - fr.left + (a.width - sz) / 2) + 'px'; c.style.top = (a.top - fr.top + (a.height - sz) / 2) + 'px'; fx.appendChild(c);
      const tz = Math.min(b.width, b.height), dx = b.left - fr.left + (b.width - tz) / 2 - parseFloat(c.style.left), dy = b.top - fr.top + (b.height - tz) / 2 - parseFloat(c.style.top);
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transform = `translate(${dx}px, ${dy}px) scale(${(tz / sz).toFixed(3)})`; })); T(() => c.remove(), (ms || 520) + 60); return c; }
    // count the sides of a shape along with highlights (circle: trace the edge); then say its fact line
    function countSides(holder, kind, cb) { const sides = [...holder.querySelectorAll('.side')]; holder.classList.add('counting'); let k = 0;
      if (kind === 'circle') { sides[0].classList.add('hl'); return speak(FACT.circle, () => { sides[0].classList.remove('hl'); holder.classList.remove('counting'); cb && cb(); }, 3600); }
      const step = () => { if (k > 0) sides[k - 1].classList.remove('hl'); if (k >= sides.length) { holder.classList.remove('counting'); speak(FACT[kind], cb, 3800); return; }
        sides[k].classList.add('hl'); host.sfx.step(k); k++; speak(NUM[k], () => T(step, 120), 1100); };
      step(); }
    const variant = (kind, lv) => { const v = { k: 1, rot: 0 }; if (lv >= 1) v.k = .74 + rng.next() * .3;
      if (lv >= 2 && kind !== 'circle') v.rot = rng.pick(kind === 'square' && lv < 3 ? [0, 10, -12, 20] : [0, 15, -20, 30, 90, 180, -35]);
      if (kind === 'rectangle') v.aspect = lv >= 2 ? rng.pick([1.6, 2, 2.4]) : 1.75; if (kind === 'triangle' && lv >= 2) v.tri = rng.int(0, 2); return v; };
    const colorFor = (i) => COLORS[i % COLORS.length];
    const onGear = (v) => Object.assign({}, v || {}, { fit: 41 }); // shapes on a gear stay inside its cream plate

    /* ---------------- round flow ---------------- */
    const PT = { 0: ['AB'], 1: ['AB', 'AAB'], 2: ['AB', 'AAB', 'ABB', 'ABC'], 3: ['AAB', 'ABB', 'ABC', 'AABB'] };
    // Finale: the bell chime only; the line "Ding, dong! The clocktower sings!" is rendered but held (ASR flag) until a human listens.
    const pool = () => mode === 'pattern' ? PT[lvl()] : SHAPES.slice();
    const plan = L.pick(cfg.skill, pool(), total, rng);
    function next() { setBusy(false); if (qi >= total) return finale(); host.emit('progress', { done: qi, total }); win.innerHTML = ''; tray.innerHTML = ''; tray.className = 'cg-tray';
      const item = plan[qi]; (mode === 'pattern' ? patternQ : mode === 'name' ? nameQ : sortQ)(item); }
    function solved(item, misses, el) { setBusy(true); if (qi >= total) return; const ft = misses === 0; if (ft) firstTry++; host.emit('mastery', { item, correct: true, firstTry: ft });
      cheer(); host.sfx.right(); advanceClock(false); spinAll(1); if (el) burst(el, 14); qi++; }
    function finale() { setBusy(true); qaMark('want', null); host.emit('progress', { done: total, total }); win.classList.add('done'); advanceClock(true); spinAll(4); cgRoot.classList.add('ring');
      sfx.chime(); burst(root.querySelector('.cg-clock'), 22); T(() => burst(root.querySelector('.cg-bell'), 16), 600);
      T(() => host.end({ total, done: total, firstTry }), 3600); }

    // ----- pattern: gear train with one empty gear
    function patternQ(type) { const lv = lvl(), uniq = [...new Set(type)], kinds = rng.shuffle(['circle', 'square', 'triangle', 'rectangle', 'hexagon'].filter(k => k !== 'hexagon' || lv >= 2)).slice(0, uniq.length);
      const mono = lv >= 2 && rng.next() < .6, base = rng.int(0, 4), tok = {}; uniq.forEach((u, i) => { tok[u] = { kind: kinds[i], color: mono ? colorFor(base) : colorFor(base + i * 2 + 1) }; });
      const n = 6, seq = Array.from({ length: n }, (_, i) => type[i % type.length]); const miss = lv >= 3 && rng.next() < .5 ? rng.int(2, n - 2) : n - 1; const want = seq[miss];
      const train = document.createElement('div'); train.className = 'cg-train'; train.style.setProperty('--n', n);
      // narrow (phone portrait) windows: two rows of three, read like a book; wider windows: one row of six
      const rows = win.clientHeight > win.clientWidth * .9; if (rows) train.classList.add('rows'); let row = null;
      const gears = seq.map((u, i) => { if (!row || (rows && i === 3)) { row = document.createElement('div'); row.className = 'grow'; train.appendChild(row); }
        const g = document.createElement('div'); g.className = 'gear' + (i % 2 ? ' odd' : '') + (i === miss ? ' empty' : ''); g.innerHTML = gearSVG() + `<div class="tok">${i === miss ? '<b>?</b>' : shapeSVG(tok[u].kind, tok[u].color, onGear())}</div>`; g._u = u; row.appendChild(g); return g; });
      win.appendChild(train);
      // choices: the right token + distractors (other tokens in the pattern first, then new shapes)
      const nc = lv === 0 ? 2 : lv === 3 ? 4 : 3, opts = [want]; uniq.forEach(u => { if (opts.length < nc && !opts.includes(u)) opts.push(u); });
      const extra = ['circle', 'square', 'triangle', 'rectangle', 'hexagon'].filter(k => !Object.values(tok).some(t => t.kind === k)); let xi = 0;
      while (opts.length < nc && xi < extra.length) { const id = 'x' + xi; tok[id] = { kind: extra[xi], color: mono ? colorFor(base) : colorFor(base + 2 + xi) }; opts.push(id); xi++; }
      let misses = 0; const chips = rng.shuffle(opts.slice()).map(u => { const b = document.createElement('button'); b.className = 'chip'; b.innerHTML = shapeSVG(tok[u].kind, tok[u].color); b.setAttribute('aria-label', tok[u].kind); b._u = u;
        b.onclick = () => { if (busy) return; if (u === want) { const slot = gears[miss]; b.classList.add('used'); fly(b.querySelector('.shp'), slot.querySelector('.tok'), shapeSVG(tok[u].kind, tok[u].color, onGear()), 480);
            T(() => { slot.classList.remove('empty'); slot.querySelector('.tok').innerHTML = shapeSVG(tok[u].kind, tok[u].color, onGear()); solved(type, misses, slot); praiseThen(rng.pick(PRAISE), 1600); }, 470); setBusy(true); }
          else { misses++; wobble(b); b.classList.add('no'); if (misses === 1) { setBusy(true); speak('Listen to the pattern.', () => sing(0)); } else hint(); } };
        tray.appendChild(b); return b; });
      qaMark('want', tok[want].kind);
      const hint = () => { chips.forEach(c => { if (c._u === want) c.classList.add('hint'); }); speak('This one fits!'); };
      // Wick sings the pattern along the gears (highlight + shape name), pausing on the empty gear
      const sing = (i) => { gears.forEach(g => g.classList.remove('hl')); if (i >= n) { setBusy(false); speak('What comes next?'); return; } const g = gears[i]; g.classList.add('hl'); host.sfx.step(i % 5);
        if (i === miss) { T(() => sing(i + 1), 900); return; } const s = tok[g._u]; speak(s.kind, () => T(() => sing(i + 1), 80), 1300); };
      if (qi === 0) setPrompt('What comes next?', 'Fix the gears! What comes next?'); else setPrompt('What comes next?', 'What comes next?'); }

    // ----- name: find the named shape
    function nameQ(t) { const lv = lvl(), nc = lv === 0 ? 2 : lv === 3 ? 4 : 3; const kinds = [t]; if (lv >= 2 && SHAPES.includes(LOOK[t])) kinds.push(LOOK[t]);
      rng.shuffle(SHAPES.filter(k => !kinds.includes(k))).forEach(k => { if (kinds.length < nc) kinds.push(k); });
      const play = document.createElement('div'); play.className = 'cg-play'; const grid = document.createElement('div'); grid.className = 'cg-cards n' + kinds.length; play.appendChild(grid);
      const hub = document.createElement('div'); hub.className = 'gear hub'; hub.innerHTML = gearSVG() + '<div class="tok"></div>'; play.appendChild(hub); win.appendChild(play); tray.classList.add('none');
      let misses = 0; const cards = rng.shuffle(kinds.slice()).map((k, i) => { const v = variant(k, lv), col = colorFor(rng.int(0, 4)); const b = document.createElement('button'); b.className = 'card'; b.style.setProperty('--d', (i * .07) + 's');
        b.innerHTML = `<span class="plate"></span>${shapeSVG(k, col, v)}`; b.setAttribute('aria-label', k); b._k = k;
        b.onclick = () => { if (busy) return; if (k === t) { b.classList.add('got'); fly(b.querySelector('.shp'), hub.querySelector('.tok'), shapeSVG(k, col, onGear(v)), 520);
            T(() => { hub.querySelector('.tok').innerHTML = shapeSVG(k, col, onGear(v)); solved(t, misses, hub); praiseThen(`Yes! A ${t}!`, 1600); }, 500); setBusy(true); }
          else { misses++; wobble(b); b.classList.add('no');
            if (misses === 1) speak([`That's a ${k}.`, `Find the ${t}!`]);
            else if (misses === 2) { const c = cards.find(x => x._k === t); setBusy(true); speak("Let's count the sides.", () => countSides(c, t, () => { setBusy(false); c.classList.add('hint'); speak(`Find the ${t}!`); })); }
            else speak('Here it is!'); } };
        grid.appendChild(b); return b; });
      qaMark('want', t); setPrompt(`Find the ${t}!`, `Find the ${t}!`); }

    // ----- sort: the shape on the big gear goes into its drawer
    function sortQ(t) { const lv = lvl(), nd = lv === 0 ? 2 : lv === 3 ? 4 : 3; const kinds = [t]; if (lv >= 2 && SHAPES.includes(LOOK[t])) kinds.push(LOOK[t]);
      rng.shuffle(SHAPES.filter(k => !kinds.includes(k))).forEach(k => { if (kinds.length < nd) kinds.push(k); });
      const v = variant(t, lv), col = colorFor(rng.int(0, 4));
      const stage = document.createElement('div'); stage.className = 'cg-conveyor'; stage.innerHTML = `<div class="gear big">${gearSVG()}<div class="tok">${shapeSVG(t, col, onGear(v))}</div></div>`; win.appendChild(stage);
      const ride = stage.querySelector('.gear'); ride.classList.add('arrive');
      let misses = 0; const drawers = [...kinds].sort((a, b) => SHAPES.indexOf(a) - SHAPES.indexOf(b)).map(k => { const b = document.createElement('button'); b.className = 'drawer'; b.innerHTML = drawerFront(k); b.setAttribute('aria-label', k + ' drawer'); b._k = k;
        b.onclick = () => { if (busy) return; if (k === t) { b.classList.add('open'); setBusy(true); fly(ride.querySelector('.shp'), b.querySelector('.dr-box'), shapeSVG(t, col, v), 560, 'sm'); ride.querySelector('.tok').innerHTML = '';
            T(() => { b.classList.remove('open'); b.classList.add('full'); solved(t, misses, b); praiseThen(`Yes! A ${t}!`, 1600); }, 600); }
          else { misses++; wobble(b); b.classList.add('no');
            if (misses === 1) { setBusy(true); speak("Let's count the sides.", () => countSides(ride, t, () => { setBusy(false); speak('Which drawer does it go in?'); })); }
            else { drawers.forEach(d => { if (d._k === t) d.classList.add('hint'); }); speak('Here it is!'); } } };
        tray.appendChild(b); return b; });
      tray.classList.add('drawers', 'n' + drawers.length); qaMark('want', t);
      if (t === 'hexagon' && !hexIntro) { hexIntro = true; setPrompt('A hexagon!', 'This is a hexagon. It has six sides!'); T(() => { prompt = 'Which drawer does it go in?'; txt.textContent = 'Which drawer?'; }, 3200); }
      else if (qi === 0) setPrompt('Which drawer?', 'Put the shape in its drawer!');
      else setPrompt('Which drawer?', 'Which drawer does it go in?'); }

    T(next, 350);
    return { stop() { alive = false; timers.forEach(clearTimeout); host.say(''); } };
  }
});
