/* Wick's Lantern Path (Logic & Coding, ages 4-9, K-2 CSTA 1A). Original Elearnea game: the child builds a program of arrow tiles,
   presses Go, and Wick the lantern fox walks it step by step through a paper-cut night garden (the running tile glows) to light lanterns.
   Modes (catalog lesson config.mode):
   - step:  one arrow to the next lantern (an algorithm of one instruction; program -> run).                          CSTA 1A-AP-08
   - seq:   2-5 step sequences with turns, flowerbeds and stones to walk around, then two lanterns in one program.   1A-AP-08/10/11
   - debug: a ready-made program with ONE wrong arrow: run it, find the arrow, tap it, pick the right one, run again. 1A-AP-14
   - loop:  a picture "repeat" block (loop arrow + number badge + dots) shortens a long straight path or a zigzag;
            the program strip has a slot limit so the loop is needed, and the shortest program gets a "short program" cheer.  1A-AP-10
   Running: the program executes exactly as built. A step into a flowerbed, a stone or the garden edge, a step after the last lantern,
   or running out of steps makes Wick stop gently at that step (no crash, no lives, no timer). Help grows with each try:
   1) the step that went wrong glows (first step that leaves every shortest path), 2) the right next arrow is traced on the board
   and glows in the tray, 3) a program that works is laid out and Wick asks for Go.
   Adaptive (El.Learn difficulty, ~80% first-try): longer programs, turns, obstacles, two lanterns, more arrows to choose from,
   loop bodies of two arrows; mastery items per lesson (directions / sequence kinds / bug positions / loop kinds) with spaced review.
   Every spoken line comes from assets/games/wicks-path-lines.js (also read by the voice manifest builder).
   Contract: start(config, host) -> {stop}; host.emit('progress'|'mastery'); host.end(results). On-device only. */
El.defineGame({
  id: 'wicks-path',
  start(cfg, host) {
    const WL = window.WPLines, L = host.learn, rng = host.rng, root = host.root, mode = cfg.mode || 'seq', total = cfg.rounds || 5;
    const DV = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }, DIRS = ['U', 'R', 'D', 'L'], OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
    const COL = { U: '#7CC4A4', R: '#F08A7E', D: '#9B8AD1', L: '#F5B841' }, COLD = { U: '#4E9479', R: '#C25F54', D: '#6E5FAA', L: '#C98A1C' };
    let alive = true, qi = 0, firstTry = 0, timers = [], prompt = '', busy = false, runTok = 0;
    let P = null, prog = [], misses = 0, sel = -1, initial = '', ghost = null;
    // QA mode only (?qa=1): the stage carries data-sol (a program that works), data-bug, data-busy; never set for kids
    const QA = /[?&]qa=1(&|$)/.test(location.search), qaMark = (k, v) => { if (!QA) return; if (v == null) delete root.dataset[k]; else root.dataset[k] = v; };
    const setBusy = (b) => { busy = b; qaMark('busy', b ? '1' : '0'); goBtn && goBtn.classList.toggle('off', b); };
    const T = (fn, ms) => { const h = setTimeout(() => { if (alive) fn(); }, ms); timers.push(h); return h; };
    const lvl = () => L.levelIndex(cfg.skill, 4);
    // speech: cb runs once when the line ends (voice onend; watchdog if the clip never reports), only for the current run token
    const speak = (t, cb, wd) => { let done = false; const tok = runTok; const fin = () => { if (done) return; done = true; if (cb && alive && tok === runTok) cb(); };
      const ok = host.say(t, { rate: .95, onend: fin }); if (cb) T(fin, ok ? (wd || 6000) : 450); return ok; };
    const setPrompt = (shown, spoken) => { prompt = spoken; txt.textContent = shown; speak(spoken); };

    /* ---------------- sound (WebAudio, synthesized) ---------------- */
    const tone = host.sfx.tone;
    const sfx = {
      add(d) { const f = { U: 660, R: 587, D: 523, L: 494 }[d] || 600; tone({ freq: f, to: f * 1.25, dur: .12, vol: .1 }); },
      remove() { tone({ type: 'triangle', freq: 520, to: 300, dur: .14, vol: .08 }); },
      go() { [0, 4, 7].forEach((s, i) => tone({ freq: 392 * Math.pow(2, s / 12), dur: .2, vol: .09, delay: i * .06 })); },
      bump() { tone({ type: 'triangle', freq: 190, to: 140, dur: .22, vol: .14 }); tone({ freq: 95, dur: .16, vol: .08, delay: .02 }); },
      light() { [12, 16, 19, 24].forEach((s, i) => tone({ freq: 523.25 * Math.pow(2, s / 12), dur: .5, vol: .09, delay: i * .08 })); tone({ type: 'triangle', freq: 2093, dur: .6, vol: .03, delay: .3 }); },
      loop() { tone({ freq: 440, to: 880, dur: .25, vol: .07 }); tone({ freq: 660, to: 990, dur: .2, vol: .05, delay: .12 }); }
    };

    /* ---------------- art: paper-cut night garden (inline SVG, original) ---------------- */
    const arrowSVG = (d) => { const rot = { U: 0, R: 90, D: 180, L: 270 }[d];
      return `<svg class="arw" viewBox="-50 -50 100 100" aria-hidden="true"><g transform="rotate(${rot})">
        <path d="M0 -36 L30 -4 L13 -4 L13 34 L-13 34 L-13 -4 L-30 -4 Z" transform="translate(3 4)" fill="rgba(20,17,58,.35)" stroke="rgba(20,17,58,.35)" stroke-width="7" stroke-linejoin="round"/>
        <path d="M0 -36 L30 -4 L13 -4 L13 34 L-13 34 L-13 -4 L-30 -4 Z" fill="${COL[d]}" stroke="${COLD[d]}" stroke-width="7" stroke-linejoin="round"/>
        <path d="M0 -24 L18 -8 L7 -8 L7 26 L-7 26 L-7 -8 L-18 -8 Z" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2.5" stroke-dasharray="5 5" stroke-linejoin="round"/></g></svg>`; };
    const loopSVG = (n) => { const arc = 'M9 -13.05A22 22 0 1 1 -13 -13.05', head = 'M-4.3 -18.05L-11.1 -3.75L-20.1 -19.35Z';
      return `<svg class="loopic" viewBox="-50 -50 100 100" aria-hidden="true"><g transform="translate(3 4)" opacity=".35"><path d="${arc}" fill="none" stroke="#14113A" stroke-width="11" stroke-linecap="round"/><path d="${head}" fill="#14113A" stroke="#14113A" stroke-width="5" stroke-linejoin="round"/></g>
      <path d="${arc}" fill="none" stroke="#F6EBD9" stroke-width="10" stroke-linecap="round"/><path d="${head}" fill="#F6EBD9" stroke="#F6EBD9" stroke-width="5" stroke-linejoin="round"/>
      <circle cx="26" cy="-26" r="17" fill="#F5B841" stroke="#C98A1C" stroke-width="4"/><text x="26" y="-18" text-anchor="middle" font-size="24" font-weight="900" fill="#2A2152" font-family="system-ui,sans-serif">${n}</text></svg>`; };
    const dots = (n) => `<span class="rdots">${'<i></i>'.repeat(n)}</span>`;
    const lanternSVG = `<svg class="lan" viewBox="0 0 60 90" aria-hidden="true"><rect x="28" y="40" width="5" height="48" rx="2" fill="#5E3A24"/><path d="M14 30h32" stroke="#5E3A24" stroke-width="5" stroke-linecap="round"/>
      <g class="lbody"><path d="M22 32h16M24 32a6 6 0 0 1 12 0" fill="none" stroke="#3B2F1E" stroke-width="3" stroke-linecap="round"/><rect x="18" y="35" width="24" height="5" rx="2.5" fill="#3B2F1E"/>
      <rect class="glass" x="19" y="40" width="22" height="24" rx="7" stroke="#3B2F1E" stroke-width="3"/><path class="flame" d="M30 45c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z"/><rect x="18" y="63" width="24" height="5" rx="2.5" fill="#3B2F1E"/></g></svg>`;
    const flowerSVG = `<svg viewBox="-50 -50 100 100" aria-hidden="true"><ellipse cx="2" cy="14" rx="40" ry="26" fill="rgba(20,17,58,.4)"/><ellipse cx="0" cy="10" rx="40" ry="26" fill="#7A4A2E"/><ellipse cx="0" cy="8" rx="34" ry="20" fill="#8E5A38"/>
      <path d="M-26 6q6-26 14-4M22 4q-4-24-14-2M-2 6q2-30 6-2" fill="none" stroke="#4E9479" stroke-width="5" stroke-linecap="round"/>
      ${[[-20, -12, '#F08A7E'], [16, -14, '#9B8AD1'], [0, -26, '#F5B841'], [-6, 2, '#F6EBD9'], [22, 6, '#F08A7E']].map(([x, y, c]) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-7" rx="5" ry="8" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="4" fill="#F5B841" stroke="#C98A1C" stroke-width="1.5"/></g>`).join('')}</svg>`;
    const stoneSVG = `<svg viewBox="-50 -50 100 100" aria-hidden="true"><path d="M-34 22c-8-18 2-40 24-44 20-4 40 8 42 26 2 14-6 24-24 26-18 2-36 2-42-8z" fill="rgba(20,17,58,.45)" transform="translate(3 5)"/>
      <path d="M-34 22c-8-18 2-40 24-44 20-4 40 8 42 26 2 14-6 24-24 26-18 2-36 2-42-8z" fill="#8F86B8"/><path d="M-22 4c0-12 10-20 22-20" fill="none" stroke="#C9C1E6" stroke-width="5" stroke-linecap="round"/>
      <path d="M-30 18c-6-14 2-34 20-38 18-3 34 6 36 22 2 12-6 20-20 22-16 2-30 2-36-6z" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="2.5" stroke-dasharray="5 6"/></svg>`;
    const ghostSVG = (d) => `<svg viewBox="-50 -50 100 100" aria-hidden="true"><g transform="rotate(${{ U: 0, R: 90, D: 180, L: 270 }[d]})"><path d="M0 40 L0 -26" stroke="#FFE28A" stroke-width="11" stroke-linecap="round" stroke-dasharray="2 15"/>
      <path d="M-22 -12 L0 -38 L22 -12" fill="none" stroke="#FFE28A" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;

    root.innerHTML = `<div class="wp wp-${mode}">
      <div class="wp-prompt"><button class="wick wp-wick" id="wpWick" aria-label="Wick: hear it again"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""></button>
        <div class="bubble" id="wpTxt"></div><button class="btn round cream" id="wpSay" aria-label="Hear it again">${El.icon('sound')}</button></div>
      <div class="wp-scene" id="wpScene"><div class="wp-garden" id="wpGarden"><div class="wp-hedge"></div><div class="wp-board" id="wpBoard"></div></div></div>
      <div class="wp-ctrl"><div class="wp-progrow"><div class="wp-prog" id="wpProg" aria-label="Your program"></div>
        <button class="btn round big glow wp-go" id="wpGo" aria-label="Go" data-qa="go">${El.icon('play')}</button></div>
        <div class="wp-tray" id="wpTray"></div></div>
      <div class="wp-fx" id="wpFx"></div></div>`;
    const $ = (id) => root.querySelector('#' + id);
    const txt = $('wpTxt'), board = $('wpBoard'), progEl = $('wpProg'), tray = $('wpTray'), goBtn = $('wpGo'), scene = $('wpScene'), garden = $('wpGarden'), fx = $('wpFx'), wpRoot = root.querySelector('.wp');
    $('wpSay').onclick = $('wpWick').onclick = () => { if (prompt) speak(prompt); const w = $('wpWick'); w.classList.remove('cheer'); void w.offsetWidth; w.classList.add('cheer'); };

    // board size: keep cells square inside the scene at any viewport
    const fit = () => { if (!P) return; const r = scene.getBoundingClientRect(), pad = 14, m = r.width < 520 ? 26 : 40; // m: room for the hedge and frame around the garden
      const cw = Math.max(40, Math.min(P.C === 3 ? 200 : 160, (r.width - (pad + m) * 2) / P.C, (r.height - (pad + m) * 2) / P.R));
      garden.style.width = cw * P.C + pad * 2 + 'px'; garden.style.height = cw * P.R + pad * 2 + 'px'; board.style.setProperty('--cw', cw + 'px'); };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit()) : null; if (ro) ro.observe(scene); else addEventListener('resize', fit);

    /* ---------------- puzzle model ---------------- */
    const K = (x, y) => x + ',' + y;
    const inside = (p, x, y) => x >= 0 && y >= 0 && x < p.C && y < p.R;
    const lanIdx = (p, x, y) => p.lan.findIndex(l => l.x === x && l.y === y);
    const full = (p) => (1 << p.lan.length) - 1;
    // distance (in steps) from every state (x, y, lit-mask) to "all lanterns lit"; Infinity where impossible
    function distTable(p) { const F = full(p), D = {}; const key = (x, y, m) => x + ',' + y + ',' + m;
      for (let m = 0; m <= F; m++) for (let y = 0; y < p.R; y++) for (let x = 0; x < p.C; x++) D[key(x, y, m)] = m === F ? 0 : Infinity;
      for (let it = 0, ch = true; ch && it < 200; it++) { ch = false;
        for (let m = 0; m < F; m++) for (let y = 0; y < p.R; y++) for (let x = 0; x < p.C; x++) { if (p.obs[K(x, y)]) continue; let best = D[key(x, y, m)];
          for (const d of DIRS) { const nx = x + DV[d][0], ny = y + DV[d][1]; if (!inside(p, nx, ny) || p.obs[K(nx, ny)]) continue; const li = lanIdx(p, nx, ny), m2 = li >= 0 ? m | (1 << li) : m; const v = 1 + D[key(nx, ny, m2)]; if (v < best) best = v; }
          if (best < D[key(x, y, m)]) { D[key(x, y, m)] = best; ch = true; } } }
      return (s) => D[key(s.x, s.y, s.m)]; }
    const step = (p, s, d) => { const nx = s.x + DV[d][0], ny = s.y + DV[d][1]; if (!inside(p, nx, ny)) return { bad: 'edge' }; const o = p.obs[K(nx, ny)]; if (o) return { bad: o };
      const li = lanIdx(p, nx, ny); return { x: nx, y: ny, m: li >= 0 ? s.m | (1 << li) : s.m, lit: li }; };
    // run the program exactly as built: ok, or where/why it stopped
    function simulate(p, flat) { let s = { x: p.sx, y: p.sy, m: 0 }; const F = full(p), trail = [];
      for (let i = 0; i < flat.length; i++) { if (s.m === F) return { ok: false, why: 'far', at: i, trail }; const n = step(p, s, flat[i].d); if (n.bad) return { ok: false, why: n.bad, at: i, trail, dir: flat[i].d }; trail.push(n); s = n; }
      return s.m === F ? { ok: true, trail } : { ok: false, why: 'short', at: flat.length, trail }; }
    // the step that went wrong: first step that leaves every shortest path (or the missing / extra step), plus the right next arrow
    function analyze(p, flat) { const dist = p.dist, F = full(p), sol = flatOf(p.sol); let s = { x: p.sx, y: p.sy, m: 0 }, onSol = true;
      const best = (s, i) => { const want = dist(s) - 1; if (onSol && sol[i] && !step(p, s, sol[i].d).bad && dist(step(p, s, sol[i].d)) === want) return sol[i].d; return DIRS.find(d => { const n = step(p, s, d); return !n.bad && dist(n) === want; }); };
      for (let i = 0; i < flat.length; i++) { if (s.m === F) return { i, kind: 'extra', s };
        const n = step(p, s, flat[i].d); if (n.bad || dist(n) !== dist(s) - 1) return { i, kind: 'wrong', s, right: best(s, i) };
        if (!sol[i] || sol[i].d !== flat[i].d) onSol = false; s = n; }
      return s.m === F ? null : { i: flat.length, kind: 'missing', s, right: best(s, flat.length) }; }

    // program nodes: {t:'a', d} or {t:'r', n, body:[d|null,...]}; flat = [{d, at:[node, inner]}]
    function flatOf(nodes) { const out = []; nodes.forEach((nd, i) => { if (nd.t === 'a') out.push({ d: nd.d, at: [i, -1] }); else for (let k = 0; k < nd.n; k++) nd.body.forEach((d, j) => { if (d) out.push({ d, at: [i, j], rep: k }); }); }); return out; }
    const size = (nodes) => nodes.reduce((a, nd) => a + (nd.t === 'a' ? 1 : 1 + nd.body.length), 0);
    const progStr = (nodes) => nodes.map(nd => nd.t === 'a' ? nd.d : `X${nd.n}(${nd.body.map(d => d || '_').join(',')})`).join(',');
    const clone = (nodes) => nodes.map(nd => nd.t === 'a' ? { t: 'a', d: nd.d } : { t: 'r', n: nd.n, body: nd.body.slice() });

    /* ---------------- puzzle generators (every puzzle is checked: its planned program is a shortest one) ---------------- */
    function blank(C, R) { return { C, R, obs: {}, lan: [], sx: 0, sy: 0 }; }
    const walkCells = (p, dirs) => { let x = p.sx, y = p.sy; const cells = [K(x, y)]; for (const d of dirs) { x += DV[d][0]; y += DV[d][1]; cells.push(K(x, y)); } return { cells, x, y }; };
    function monotone(C, R, n, kind) { // kind: 'straight' | 'turn'
      for (let t = 0; t < 400; t++) { const hx = rng.pick(['L', 'R']), vy = rng.pick(['U', 'D']); let a, b;
        if (kind === 'straight') { if (rng.next() < .6) { a = n; b = 0; } else { a = 0; b = n; } } else { a = rng.int(1, n - 1); b = n - a; }
        const dirs = rng.shuffle([...Array(a).fill(hx), ...Array(b).fill(vy)]); if (kind === 'turn' && dirs.every(d => d === dirs[0])) continue;
        const sx = hx === 'R' ? rng.int(0, C - 1 - a) : rng.int(a, C - 1), sy = vy === 'D' ? rng.int(0, R - 1 - b) : rng.int(b, R - 1);
        const ex = sx + (hx === 'R' ? a : -a), ey = sy + (vy === 'D' ? b : -b);
        if (sx < 0 || sy < 0 || sx >= C || sy >= R || ex < 0 || ey < 0 || ex >= C || ey >= R) continue; return { sx, sy, dirs }; }
      return null; }
    function detour(C, R, n) { // a walk around obstacles: the straight way is blocked
      for (let t = 0; t < 600; t++) { const p = blank(C, R); p.sx = rng.int(0, C - 1); p.sy = rng.int(0, R - 1); const dirs = []; let x = p.sx, y = p.sy; const seen = new Set([K(x, y)]); let okw = true;
        for (let i = 0; i < n; i++) { const opts = DIRS.filter(d => { const nx = x + DV[d][0], ny = y + DV[d][1]; return inside(p, nx, ny) && !seen.has(K(nx, ny)) && (!dirs.length || d !== OPP[dirs[dirs.length - 1]]); }); if (!opts.length) { okw = false; break; } const d = rng.pick(opts); dirs.push(d); x += DV[d][0]; y += DV[d][1]; seen.add(K(x, y)); }
        if (!okw || Math.abs(x - p.sx) + Math.abs(y - p.sy) >= n) continue;
        p.lan = [{ x, y }]; const path = new Set(walkCells(p, dirs).cells); let guard = 0;
        while (guard++ < 6) { const dist = distTable(p); const d0 = dist({ x: p.sx, y: p.sy, m: 0 }); if (d0 === n) break; if (d0 > n) { guard = 99; break; }
          // a shortest route: block one of its cells that is not on our walk
          let s = { x: p.sx, y: p.sy, m: 0 }; const cand = []; for (let k = 0; k < d0; k++) { const d = DIRS.find(dd => { const nn = step(p, s, dd); return !nn.bad && dist(nn) === dist(s) - 1; }); s = step(p, s, d); if (!path.has(K(s.x, s.y))) cand.push(K(s.x, s.y)); }
          if (!cand.length) { guard = 99; break; } p.obs[rng.pick(cand)] = rng.next() < .6 ? 'flower' : 'stone'; }
        if (guard >= 99) continue; const dist = distTable(p); if (dist({ x: p.sx, y: p.sy, m: 0 }) !== n || Object.keys(p.obs).length > 4) continue;
        return { p, dirs }; }
      return null; }
    function decorate(p, k, path) { const n0 = p.dist0; for (let t = 0, put = 0; t < 40 && put < k; t++) { const x = rng.int(0, p.C - 1), y = rng.int(0, p.R - 1), key = K(x, y);
        if (path.has(key) || p.obs[key] || lanIdx(p, x, y) >= 0) continue; p.obs[key] = rng.next() < .55 ? 'flower' : 'stone';
        if (distTable(p)({ x: p.sx, y: p.sy, m: 0 }) !== n0) delete p.obs[key]; else put++; } }
    const arrows = (dirs) => dirs.map(d => ({ t: 'a', d }));
    function finish(p, sol, deco) { p.sol = sol; const path = new Set(walkCells(p, flatOf(sol).map(f => f.d)).cells); p.dist0 = flatOf(sol).length; if (deco) decorate(p, deco, path); p.dist = distTable(p); return p; }

    // the garden is 5 wide x 4 tall on wide screens and 4 x 5 on tall (portrait phone) screens, so the cells stay big
    function makePuzzle(item) { const lv = lvl(), tall = scene.clientHeight > scene.clientWidth * 1.05, GC = tall ? 4 : 5, GR = tall ? 5 : 4;
      if (mode === 'step') { // 3x3 garden, one arrow to the lantern
        const p = blank(3, 3), d = item; let sx = 1, sy = 1;
        if (lv >= 3) { const opts = []; for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) if (inside(p, x + DV[d][0], y + DV[d][1]) && !(x === 1 && y === 1)) opts.push([x, y]); [sx, sy] = rng.pick(opts); }
        p.sx = sx; p.sy = sy; p.lan = [{ x: sx + DV[d][0], y: sy + DV[d][1] }];
        finish(p, arrows([d]), lv >= 2 ? (lv >= 3 ? 3 : 2) : lv >= 1 ? 1 : 0);
        p.tray = lv === 0 ? rng.shuffle([d, rng.pick(DIRS.filter(x => x !== d))]) : DIRS.slice(); p.cap = 1; return p; }
      if (mode === 'seq' || mode === 'debug') {
        const n = mode === 'debug' ? [2, 3, 4, 5][lv] : +String(item).replace(/\D/g, '') || 3, kind = mode === 'debug' ? (lv >= 3 && rng.next() < .5 ? 'o' : lv >= 1 ? 't' : rng.pick(['s', 't'])) : String(item).replace(/\d/g, '');
        for (let t = 0; t < 50; t++) { const p = blank(GC, GR);
          if (kind === 'o') { const g = detour(GC, GR, Math.max(3, n)); if (!g) continue; Object.assign(p, g.p); finish(p, arrows(g.dirs), lv >= 3 ? 1 : 0); }
          else { const g = monotone(GC, GR, n, kind === 's' ? 'straight' : 'turn'); if (!g) continue; p.sx = g.sx; p.sy = g.sy; const w = walkCells(p, g.dirs);
            if (kind === 'two') { const mid = rng.int(1, n - 2); let x = p.sx, y = p.sy; for (let k = 0; k <= mid; k++) { x += DV[g.dirs[k]][0]; y += DV[g.dirs[k]][1]; } p.lan = [{ x, y }, { x: w.x, y: w.y }]; }
            else p.lan = [{ x: w.x, y: w.y }];
            finish(p, arrows(g.dirs), lv >= 1 ? rng.int(1, 3) : rng.int(0, 1)); }
          if (p.dist({ x: p.sx, y: p.sy, m: 0 }) !== flatOf(p.sol).length) continue;
          p.tray = DIRS.slice(); p.cap = mode === 'debug' ? p.sol.length : Math.min(7, p.sol.length + 2);
          if (mode === 'debug') { const len = p.sol.length; const b = item === 'first' ? 0 : item === 'last' ? len - 1 : rng.int(1, Math.max(1, len - 2));
            const bad = rng.shuffle(DIRS.filter(d => d !== p.sol[b].d)).find(d => { const pr = clone(p.sol); pr[b].d = d; return !simulate(p, flatOf(pr)).ok; }); if (!bad) continue;
            p.bug = b; p.start = clone(p.sol); p.start[b].d = bad; }
          return p; }
        return null; }
      // loop: the repeat block shortens the path; the strip's slot limit makes the loop worth it
      for (let t = 0; t < 80; t++) { const p = blank(GC, GR); let sol;
        if (item === 'line' || item === 'line4') { const n = item === 'line4' ? 4 : 3, g = monotone(GC, GR, n, 'straight'); if (!g) continue; p.sx = g.sx; p.sy = g.sy; sol = [{ t: 'r', n, body: [g.dirs[0]] }]; }
        else if (item === 'turn') { const h = rng.pick(['L', 'R']), v = rng.pick(['U', 'D']), long = rng.next() < .6 ? h : v, other = long === h ? v : h, first = rng.next() < .5;
          const dirs = first ? [other, long, long, long] : [long, long, long, other]; let sx = rng.int(0, GC - 1), sy = rng.int(0, GR - 1); p.sx = sx; p.sy = sy; let okk = true, x = sx, y = sy; for (const d of dirs) { x += DV[d][0]; y += DV[d][1]; if (!inside(p, x, y)) okk = false; } if (!okk) continue;
          sol = first ? [{ t: 'a', d: other }, { t: 'r', n: 3, body: [long] }] : [{ t: 'r', n: 3, body: [long] }, { t: 'a', d: other }]; }
        else { const n = item === 'stairs2' ? 2 : 3, h = rng.pick(['L', 'R']), v = rng.pick(['U', 'D']), body = rng.next() < .5 ? [v, h] : [h, v];
          p.sx = h === 'R' ? rng.int(0, GC - 1 - n) : rng.int(n, GC - 1); p.sy = v === 'D' ? rng.int(0, GR - 1 - n) : rng.int(n, GR - 1); if (!inside(p, p.sx, p.sy)) continue; sol = [{ t: 'r', n, body }];
          if (item === 'stairs2') { const extra = rng.pick(DIRS); sol = rng.next() < .5 ? [{ t: 'a', d: extra }, ...sol] : [...sol, { t: 'a', d: extra }]; } }
        const f = flatOf(sol), w = walkCells(p, f.map(x => x.d)); if (!inside(p, w.x, w.y) || new Set(w.cells).size !== w.cells.length) continue; let okc = true; for (const c of w.cells) { const [x, y] = c.split(',').map(Number); if (!inside(p, x, y)) okc = false; } if (!okc) continue;
        p.lan = [{ x: w.x, y: w.y }]; finish(p, sol, lvl() >= 1 ? rng.int(1, 2) : 0); if (p.dist({ x: p.sx, y: p.sy, m: 0 }) !== f.length) continue;
        const rep = sol.find(nd => nd.t === 'r'); p.rep = { n: rep.n, k: rep.body.length }; p.tray = DIRS.slice(); const min = size(sol); p.min = min; p.cap = f.length > min + 1 ? min + 1 : min; return p; }
      return null; }

    /* ---------------- drawing ---------------- */
    let wickEl = null, lanEls = [];
    const place = (el, x, y) => { el.style.left = `calc(var(--cw) * ${x})`; el.style.top = `calc(var(--cw) * ${y})`; };
    function drawBoard() { board.innerHTML = ''; board.style.setProperty('--c', P.C); board.style.setProperty('--r', P.R);
      for (let y = 0; y < P.R; y++) for (let x = 0; x < P.C; x++) { const c = document.createElement('div'); c.className = 'cell' + ((x + y) % 2 ? ' alt' : ''); place(c, x, y); c.innerHTML = '<i></i>'; board.appendChild(c); }
      for (const [k, o] of Object.entries(P.obs)) { const [x, y] = k.split(',').map(Number); const e = document.createElement('div'); e.className = 'obj ' + o; e.innerHTML = o === 'flower' ? flowerSVG : stoneSVG; place(e, x, y); board.appendChild(e); }
      lanEls = P.lan.map(l => { const e = document.createElement('div'); e.className = 'obj lantern'; e.innerHTML = '<span class="halo"></span>' + lanternSVG; place(e, l.x, l.y); board.appendChild(e); return e; });
      const home = document.createElement('div'); home.className = 'obj home'; place(home, P.sx, P.sy); board.appendChild(home);
      wickEl = document.createElement('div'); wickEl.className = 'obj wickp'; wickEl.innerHTML = `<img src="${El.url('assets/img/wick-sm.webp')}" alt="">`; place(wickEl, P.sx, P.sy); board.appendChild(wickEl);
      fit(); }
    const clearTrail = () => { board.querySelectorAll('.paw,.ghost').forEach(e => e.remove()); ghost = null; };
    function resetBoard() { clearTrail(); place(wickEl, P.sx, P.sy); wickEl.classList.remove('bonk', 'flip', 'happy'); lanEls.forEach(e => e.classList.remove('lit')); }
    function showGhost(s, d) { const g = document.createElement('div'); g.className = 'obj ghost'; g.innerHTML = ghostSVG(d); place(g, s.x + DV[d][0] * .5, s.y + DV[d][1] * .5); board.appendChild(g); ghost = g; }
    function burst(el, n) { if (!el) return; const r = el.getBoundingClientRect(), R0 = fx.getBoundingClientRect(); for (let i = 0; i < (n || 12); i++) { const s = document.createElement('i'); s.className = 'spark';
      s.style.left = (r.left - R0.left + r.width / 2) + 'px'; s.style.top = (r.top - R0.top + r.height / 2) + 'px'; const a = Math.PI * 2 * i / (n || 12) + rng.next() * .4, d = 40 + rng.next() * 50;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px'); s.style.background = ['#F5B841', '#FFE28A', '#F08A7E', '#7CC4A4'][i % 4]; fx.appendChild(s); T(() => s.remove(), 900); } }

    // program strip: arrow tiles, repeat blocks (head + inner slots), empty slots up to the cap
    function drawProg(mark) { progEl.innerHTML = ''; progEl.classList.toggle('one', P.cap === 1);
      prog.forEach((nd, i) => {
        if (nd.t === 'a') { const b = document.createElement('button'); b.className = 'ptile'; b.dataset.i = i; b.innerHTML = arrowSVG(nd.d); b.setAttribute('aria-label', { U: 'up', D: 'down', L: 'left', R: 'right' }[nd.d]); b.dataset.d = nd.d;
          if (sel === i) b.classList.add('sel'); b.onclick = () => tapTile(i, -1); progEl.appendChild(b); }
        else { const g = document.createElement('div'); g.className = 'rblock k' + nd.body.length; g.dataset.i = i;
          const h = document.createElement('button'); h.className = 'rhead'; h.innerHTML = loopSVG(nd.n) + dots(nd.n); h.setAttribute('aria-label', `repeat ${nd.n}`); h.onclick = () => tapTile(i, -2); g.appendChild(h);
          nd.body.forEach((d, j) => { const b = document.createElement('button'); b.className = 'ptile in' + (d ? '' : ' empty'); b.dataset.i = i; b.dataset.j = j; if (d) { b.innerHTML = arrowSVG(d); b.dataset.d = d; b.setAttribute('aria-label', { U: 'up', D: 'down', L: 'left', R: 'right' }[d]); } else b.setAttribute('aria-label', 'empty repeat slot'); b.onclick = () => tapTile(i, j); g.appendChild(b); });
          progEl.appendChild(g); } });
      const used = size(prog); for (let k = used; k < P.cap; k++) { const e = document.createElement('span'); e.className = 'slot' + (k === used ? ' next' : ''); progEl.appendChild(e); }
      if (mark) mark(); }
    const tileEl = (at) => at[1] >= 0 ? progEl.querySelector(`.ptile[data-i="${at[0]}"][data-j="${at[1]}"]`) : progEl.querySelector(`.ptile[data-i="${at[0]}"]:not([data-j])`);
    function drawTray() { tray.innerHTML = ''; tray.className = 'wp-tray n' + (P.tray.length + (P.rep ? 1 : 0));
      for (const d of P.tray) { const b = document.createElement('button'); b.className = 'atile'; b.dataset.d = d; b.innerHTML = arrowSVG(d); b.setAttribute('aria-label', { U: 'up', D: 'down', L: 'left', R: 'right' }[d]); b.onclick = () => tapArrow(d, b); tray.appendChild(b); }
      if (P.rep) { const b = document.createElement('button'); b.className = 'atile rtile'; b.innerHTML = loopSVG(P.rep.n) + dots(P.rep.n) + `<span class="rmini">${'<i></i>'.repeat(P.rep.k)}</span>`; b.setAttribute('aria-label', `repeat ${P.rep.n}`); b.onclick = () => tapRepeat(b); tray.appendChild(b); } }
    const clearMarks = () => { root.querySelectorAll('.ptile.off,.ptile.hint,.ptile.run,.atile.hint,.slot.hint,.ptile.extra').forEach(e => e.classList.remove('off', 'hint', 'run', 'extra')); goBtn.classList.remove('hint'); };
    const edited = () => { clearMarks(); qaMark('prog', progStr(prog)); };

    /* ---------------- building the program ---------------- */
    function pop(el) { if (!el) return; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    function tapArrow(d, b) { if (busy) return; pop(b);
      if (mode === 'debug') { if (sel < 0) { host.sfx.wrong(); speak(WL.tapArrow); return; } prog[sel].d = d; sfx.add(d); speak(WL.dir[d]); const i = sel; sel = -1; drawProg(); pop(tileEl([i, -1])); edited(); return; }
      if (P.cap === 1) { prog = [{ t: 'a', d }]; sfx.add(d); speak(WL.dir[d]); drawProg(); pop(tileEl([0, -1])); edited(); return; }
      // fill the first empty slot of a repeat block first
      for (let i = prog.length - 1; i >= 0; i--) { const nd = prog[i]; if (nd.t === 'r') { const j = nd.body.indexOf(null); if (j >= 0) { nd.body[j] = d; sfx.add(d); speak(WL.dir[d]); drawProg(); pop(tileEl([i, j])); edited(); return; } } }
      if (size(prog) >= P.cap) { host.sfx.wrong(); speak(mode === 'loop' ? WL.fullLoop : WL.full); pulse(progEl); return; }
      prog.push({ t: 'a', d }); sfx.add(d); speak(WL.dir[d]); drawProg(); pop(tileEl([prog.length - 1, -1])); edited(); }
    function tapRepeat(b) { if (busy) return; pop(b); if (size(prog) + 1 + P.rep.k > P.cap) { host.sfx.wrong(); speak(WL.full); pulse(progEl); return; }
      prog.push({ t: 'r', n: P.rep.n, body: Array(P.rep.k).fill(null) }); sfx.loop(); speak(WL.rep[P.rep.n]); drawProg(); edited(); }
    function tapTile(i, j) { if (busy) return;
      if (mode === 'debug') { sel = sel === i ? -1 : i; host.sfx.tap(); drawProg(); if (sel >= 0) { speak(WL.p3sel); root.querySelectorAll('.atile').forEach(a => pop(a)); } return; }
      sfx.remove(); if (j === -2 || j === -1) prog.splice(i, 1); else prog[i].body[j] = null; drawProg(); edited(); }
    const pulse = (el) => { el.classList.remove('full'); void el.offsetWidth; el.classList.add('full'); };

    /* ---------------- running ---------------- */
    goBtn.onclick = () => run();
    function run() { if (busy) return; const flat = flatOf(prog);
      if (!prog.length) { host.sfx.wrong(); speak(WL.empty); pulse(progEl); return; }
      if (prog.some(nd => nd.t === 'r' && nd.body.includes(null))) { host.sfx.wrong(); speak(WL.fillRep); pulse(progEl); return; }
      const watch = mode === 'debug' && progStr(prog) === initial; // running the untouched buggy program is how you look for the bug: never a miss
      setBusy(true); sel = -1; drawProg(); clearMarks(); resetBoard(); sfx.go(); const tok = ++runTok; const res = simulate(P, flat); let s = { x: P.sx, y: P.sy };
      const at = (k) => { if (tok !== runTok || !alive) return false; return true; };
      const go = (k) => { if (!at(k)) return; root.querySelectorAll('.ptile.run').forEach(e => e.classList.remove('run'));
        if (k >= flat.length || (!res.ok && k === res.at && res.why !== 'short')) return done(k);
        const f = flat[k], el = tileEl(f.at); if (el) el.classList.add('run'); if (f.at[1] >= 0) { const blk = progEl.querySelector(`.rblock[data-i="${f.at[0]}"]`); if (blk) { blk.classList.add('running'); blk.dataset.k = f.rep + 1; } }
        const n = res.trail[k]; const paw = document.createElement('div'); paw.className = 'obj paw'; place(paw, s.x, s.y); paw.style.setProperty('--rot', { U: 0, R: 90, D: 180, L: 270 }[f.d] + 'deg'); board.insertBefore(paw, wickEl);
        if (f.d === 'L') wickEl.classList.add('flip'); else if (f.d === 'R') wickEl.classList.remove('flip');
        place(wickEl, n.x, n.y); s = n; host.sfx.step(k % 8);
        if (n.lit >= 0 && !lanEls[n.lit].classList.contains('lit')) { T(() => { lanEls[n.lit].classList.add('lit'); sfx.light(); burst(lanEls[n.lit], 10); }, 380); }
        let moved = false; const nextStep = () => { if (moved) return; moved = true; T(() => go(k + 1), 120); };
        T(nextStep, 2200); T(() => speak(WL.dir[f.d], nextStep, 2000), 0); };
      const done = (k) => { progEl.querySelectorAll('.rblock.running').forEach(b => { b.classList.remove('running'); delete b.dataset.k; });
        if (res.ok) return solvedRun(flat);
        // gentle stop where it went off: Wick leans toward the problem and stays there; the step that stopped glows
        const why = res.why; if (why !== 'short') { const el = tileEl(flat[k].at); if (el) el.classList.add('off'); }
        if (why === 'flower' || why === 'stone' || why === 'edge') { wickEl.style.setProperty('--bx', DV[flat[k].d][0] * 18 + '%'); wickEl.style.setProperty('--by', DV[flat[k].d][1] * 18 + '%'); wickEl.classList.add('bonk'); sfx.bump(); }
        else host.sfx.wrong();
        const reason = { flower: WL.flower, stone: WL.stone, edge: WL.edge, short: WL.short, far: WL.far }[why];
        if (watch) { speak([reason, WL.p3], () => setBusy(false), 7000); return; }
        misses++; help(flat, reason); };
      T(() => go(0), 420); }

    function help(flat, reason) { const a = analyze(P, flat) || { i: flat.length, kind: 'missing', s: { x: P.sx, y: P.sy, m: 0 } }; const lines = [reason];
      if (misses >= 3) { // 3) lay out a program that works and ask for Go
        prog = clone(P.sol); drawProg(); edited(); progEl.querySelectorAll('.ptile,.rhead').forEach(e => e.classList.add('hint')); goBtn.classList.add('hint'); lines.push(WL.model);
        speak(lines, () => { resetBoard(); setBusy(false); }, 9000); return; }
      const el = a.kind === 'missing' ? progEl.querySelector('.slot.next') : tileEl(flat[a.i].at);
      if (el) el.classList.add(a.kind === 'extra' ? 'extra' : 'hint');
      lines.push(a.kind === 'missing' ? WL.missing : a.kind === 'extra' ? WL.extra : WL.wrongStep);
      if (misses >= 2 && a.right) { // 2) trace the right next arrow on the board and in the tray
        showGhost(a.s, a.right); root.querySelectorAll(`.atile[data-d="${a.right}"]`).forEach(e => e.classList.add('hint')); lines.push(WL.thisWay, WL.dir[a.right]);
        if (mode === 'debug' && a.kind === 'wrong') sel = -1; }
      speak(lines, () => setBusy(false), 9000); }

    function solvedRun(flat) { const ft = misses === 0; if (ft) firstTry++; host.emit('mastery', { item: cur, correct: true, firstTry: ft });
      wickEl.classList.add('happy'); host.sfx.right(); burst(wickEl, 14); clearMarks(); qi++; host.emit('progress', { done: qi, total });
      const short = mode === 'loop' && size(prog) <= P.min, line = mode === 'debug' ? WL.fixed : P.lan.length > 1 ? WL.both : short ? WL.shortProg : rng.pick(WL.praise);
      if (short) { progEl.classList.add('short'); burst(progEl, 12); }
      speak(line, () => T(next, 450), 6000); }

    /* ---------------- round flow ---------------- */
    const POOL = { step: (lv) => DIRS.slice(), seq: (lv) => ['s2', 't2', 's3', 't3', 'o4', 't4', 'two4', 'o5', 't5'].slice(0, [2, 4, 6, 9][lv]),
      debug: (lv) => lv === 0 ? ['first', 'last'] : ['first', 'mid', 'last'], loop: (lv) => ['line', 'turn', 'stairs', 'line4', 'stairs2'].slice(0, [1, 2, 3, 5][lv]) };
    const plan = L.pick(cfg.skill, POOL[mode](lvl()), total, rng); let cur = null;
    function next() { setBusy(false); if (qi >= total) return finale(); host.emit('progress', { done: qi, total });
      cur = plan[qi]; let p = makePuzzle(cur); if (!p) { cur = POOL[mode](0)[0]; p = makePuzzle(cur); }
      P = p; misses = 0; sel = -1; prog = mode === 'debug' ? clone(P.start) : []; initial = progStr(prog); progEl.classList.remove('short');
      qaMark('sol', progStr(P.sol)); qaMark('bug', mode === 'debug' ? String(P.bug) : null); qaMark('prog', initial); qaMark('lv', String(lvl()));
      drawBoard(); drawProg(); drawTray(); wpRoot.classList.toggle('cap1', P.cap === 1);
      const first = qi === 0; const say = mode === 'step' ? [first ? WL.p1first : WL.p1, WL.p1] : mode === 'seq' ? (P.lan.length > 1 ? [WL.p2two, WL.p2two] : [first ? WL.p2first : WL.p2, WL.p2])
        : mode === 'debug' ? [first ? WL.p3first : WL.p3, WL.p3] : [first ? WL.p4first : WL.p4, WL.p4];
      setPrompt(say[1], say[0]); }
    function finale() { setBusy(true); qaMark('sol', null); host.emit('progress', { done: total, total }); wpRoot.classList.add('finale');
      lanEls.forEach(e => e.classList.add('lit')); wickEl && wickEl.classList.add('happy'); sfx.light(); burst(garden, 24);
      txt.textContent = WL.finale; speak(WL.finale, () => T(() => host.end({ total, done: total, firstTry }), 300), 6000); }
    if (QA) root._wpTest = { makePuzzle, simulate, analyze, flatOf, size, progStr, POOL, level: lvl }; // QA only: generator self-test
    T(next, 350);
    return { stop() { alive = false; runTok++; timers.forEach(clearTimeout); if (ro) ro.disconnect(); host.say(''); } };
  }
});
