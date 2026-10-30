// Firefly Choir QA (Art & Music, am-l1..am-l4): plays every lesson through to the results card with REAL taps (touch on phone/iPad,
// mouse on desktop), using the ?qa=1 hooks on #stage (data-want / data-busy / data-phase / data-judge). One deliberate miss on round 2.
// Echo: the drum is tapped at the target rhythm with +-12% jitter (must pass), and the deliberate miss taps too few beats.
// Also: the pure echo judge on synthetic cases (tolerance), the realm path (art-music open, 4 stops), the map island open,
// targets >= 64 CSS px inside the viewport, no horizontal overflow, 0 console errors, 0 outside requests, 0 voice misses,
// audio peak below 0 dBFS (analyser on the destination), kid mode (no ?qa=1) has no hooks.
// Usage: node qa-firefly-choir.js <baseUrl> <outDir> [viewports=phone,ipad,desktop,ipadL,phoneL] [lessons=am-l1,am-l2,am-l3,am-l4]
const { VP, launch } = require('./lib');
const fs = require('fs'), path = require('path');
VP.ipadL = { width: 1366, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
VP.phoneL = { width: 844, height: 390, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3]; const VPS = (process.argv[4] || 'phone,ipad,desktop').split(',');
const LESSONS = (process.argv[5] || 'am-l1,am-l2,am-l3,am-l4').split(','); const origin = new URL(BASE).origin; const results = []; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function audit() { const W = document.documentElement.clientWidth, H = innerHeight, de = document.documentElement;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || s.pointerEvents === 'none') return false; } return true; };
  const nm = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.'));
  const t = [...document.querySelectorAll('.topbar a, .topbar button, #stage button, #res.on button, #res.on a[href]')].filter(vis); const small = [], outside = [];
  for (const e of t) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < 63.5) small.push(`${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)}`); if (r.left < -.5 || r.right > W + .5 || r.top < -.5 || r.bottom > H + .5) outside.push(`${nm(e)} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`); }
  // pattern spots / echo dots must be visible inside the viewport too
  for (const e of document.querySelectorAll('.pt-branch .spot, .ec-dots i')) { const r = e.getBoundingClientRect(); if (r.left < -.5 || r.right > W + .5 || r.top < -.5 || r.bottom > H + .5) outside.push(nm(e) + ' (song/rhythm)'); }
  return { W, sw: de.scrollWidth, n: t.length, small, outside, minTarget: Math.min(...t.map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); })) }; }
const PEAK = `(() => { window.__peak = 0; const C = window.AudioContext || window.webkitAudioContext; const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dst, ...a) { if (dst instanceof AudioDestinationNode) { const c = dst.context; if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 2048; orig.call(c.__an, dst); const buf = new Float32Array(2048);
    setInterval(() => { c.__an.getFloatTimeDomainData(buf); for (const v of buf) if (Math.abs(v) > window.__peak) window.__peak = Math.abs(v); }, 20); } return orig.call(this, c.__an, ...a); } return orig.call(this, dst, ...a); }; })();`;
(async () => {
  const browser = await launch();
  for (const vpn of VPS) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: VP[vpn].width, height: VP[vpn].height } }, VP[vpn], { serviceWorkers: 'block' }));
    await ctx.addInitScript(PEAK);
    const page = await ctx.newPage(); let errs = [], ext = [], fails = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
    page.on('requestfailed', r => { const e = r.failure() && r.failure().errorText; if (/ERR_ABORTED/.test(e || '') && /\/voice\/(clips|mb)\//.test(r.url())) return; fails.push(r.url() + ' ' + e); });
    page.on('response', r => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()); });
    const touch = VP[vpn].hasTouch;
    const tapXY = async (x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
    const center = async (sel) => { const b = await (await page.$(sel)).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
    const tap = async (sel) => { const [x, y] = await center(sel); await tapXY(x, y); };
    const shot = async (n) => page.screenshot({ path: path.join(OUT, `${n}-${vpn}.png`) });
    const st = () => page.evaluate(() => { const s = document.getElementById('stage').dataset; return { busy: s.busy, phase: s.phase, want: s.want, judge: s.judge, res: document.querySelector('#res.on') ? 1 : 0, dots: document.querySelectorAll('#dots i.on').length }; });
    const rec = (r) => { results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${r.page} errors=${(r.consoleErrors || []).length} ext=${(r.external || []).length} failed=${(r.failed || []).length} ${r.note || ''}`); };
    // 0) judge unit cases (pure function on the page)
    if (vpn === VPS[0]) { errs = []; await page.goto(BASE + 'play/firefly-choir/?lesson=am-l3', { waitUntil: 'networkidle' });
      const u = await page.evaluate(() => { const J = El.fireflyChoirJudge, at = (p, b, jit) => { const t = [0]; p.forEach((v, i) => t.push(t[t.length - 1] + v * b * (1 + (jit ? jit[i] : 0)))); return t; };
        const P = [1, .5, .5, 1]; const cases = [
          ['exact', J(P, at(P, 520), .28).ok, true], ['jitter +-15% (tol .28)', J(P, at(P, 520, [.15, -.15, .15, -.12]), .28).ok, true],
          ['faster tempo (x0.6) same rhythm', J(P, at(P, 312), .28).ok, true], ['slower tempo (x1.7) same rhythm', J(P, at(P, 884), .28).ok, true],
          ['too slow (x3)', J(P, at(P, 1560), .28).ok, false], ['steady taps for ta ti-ti ta ta', J(P, at([1, 1, 1, 1], 400), .28).ok, false],
          ['long/short swapped', J([2, 1, 1], at([1, 1, 2], 520), .38).ok, false], ['one tap short', J(P, at(P, 520).slice(0, 4), .45).ok, false], ['one tap extra', J(P, at([1, .5, .5, 1, 1], 520), .45).ok, false],
          ['jitter 40% fails at tol .28', J(P, at(P, 520, [.4, -.4, .4, 0]), .28).ok, false], ['jitter 40% passes at tol .45 (age 4 start)', J([1, 1], at([1, 1], 520, [.3, -.3]), .45).ok, true]];
        return cases.map(([n, got, want]) => ({ n, got, want, ok: got === want })); });
      rec({ vp: vpn, page: 'echo judge unit cases', ok: u.every(c => c.ok) && !errs.length, cases: u, note: `${u.filter(c => c.ok).length}/${u.length}` }); }
    // 1) map + realm path
    { errs = []; ext = []; fails = []; let ok = true, note = '';
      try { await page.goto(BASE, { waitUntil: 'networkidle' }); await page.evaluate(() => localStorage.clear()); await page.goto(BASE + 'map/', { waitUntil: 'networkidle' }); await page.waitForSelector('.isle'); await sleep(400);
        const isle = await page.$$eval('.isle', a => a.map(b => b.className + '|' + b.getAttribute('aria-label'))); const art = isle.find(s => /Art/.test(s)) || ''; if (!/\bopen\b/.test(art)) ok = false; note += `map art isle="${art}" `; await shot('fc-map');
        await page.goto(BASE + 'realm/art-music/', { waitUntil: 'networkidle' }); await page.waitForSelector('.node'); await sleep(500);
        const nodes = await page.$$eval('.row .tile', a => a.map(t => t.getAttribute('aria-label'))); note += `path=${JSON.stringify(nodes)}`; if (nodes.length !== 4) ok = false; await shot('fc-realm');
        const a = await page.evaluate(() => ({ W: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth })); if (a.sw > a.W) { ok = false; note += ' OVERFLOW'; }
      } catch (e) { ok = false; note += 'EXC ' + e.message.split('\n')[0]; }
      rec({ vp: vpn, page: 'map + art-music realm', ok: ok && !errs.length && !ext.length && !fails.length, consoleErrors: errs.slice(), external: ext.slice(), failed: fails.slice(), note }); }
    // 2) kid mode: no hooks without ?qa=1
    { errs = []; await page.goto(BASE + 'play/firefly-choir/?lesson=am-l1', { waitUntil: 'networkidle' }); await sleep(400); const ds = await page.evaluate(() => Object.keys(document.getElementById('stage').dataset));
      rec({ vp: vpn, page: 'kid mode (no ?qa=1)', ok: !ds.length && !errs.length, note: 'stage dataset=' + JSON.stringify(ds) }); }
    // 3) lessons
    for (const ls of LESSONS) {
      errs = []; ext = []; fails = []; let ok = true, note = ''; const aud = { small: new Set(), outside: new Set(), overflow: 0, min: 1e9 }; const t0 = Date.now(); let actions = 0, misses = 0, echoes = [];
      const sample = async () => { const a = await page.evaluate(audit); a.small.forEach(x => aud.small.add(x)); a.outside.forEach(x => aud.outside.add(x)); if (a.sw > a.W) aud.overflow++; aud.min = Math.min(aud.min, a.minTarget); };
      try {
        await page.goto(BASE, { waitUntil: 'networkidle' }); await page.evaluate(() => localStorage.clear());
        await page.goto(BASE + `play/firefly-choir/?lesson=${ls}&qa=1`, { waitUntil: 'networkidle' }); await page.waitForSelector('#fcGo'); await sleep(300); await sample(); await shot(`${ls}-start`);
        await tap('#fcGo'); let shotMid = false, lastKey = '';
        while (Date.now() - t0 < 240000) {
          const s = await st(); if (s.res) break;
          if (s.busy !== '0' || !['choose', 'echo', 'build', 'play'].includes(s.phase)) { await sleep(120); continue; }
          const round = s.dots; // rounds completed so far
          const key = `${round}|${s.phase}|${s.want}`; const deliberate = round === 1 && !misses;
          if (!shotMid && round === 1) { await sample(); await shot(`${ls}-play`); shotMid = true; }
          if (s.phase === 'choose') { const sel = ls === 'am-l1' ? (w) => w === 'high' ? '#hlHi' : '#hlLo' : (w) => '#c-' + w; const other = { high: 'low', low: 'high', fast: 'slow', slow: 'fast', loud: 'soft', soft: 'loud' }[s.want];
            if (deliberate) { misses++; await tap(sel(other)); } else await tap(sel(s.want)); }
          else if (s.phase === 'build') { if (deliberate) { misses++; await tap(s.want === 'A' ? '#pB' : '#pA'); } else await tap(s.want === 'A' ? '#pA' : '#pB'); }
          else if (s.phase === 'play') { if (key === lastKey) { await sleep(150); continue; } await tap('#pPlay'); }
          else if (s.phase === 'echo') { if (s.judge) { await sleep(150); continue; } // judged: wait for the game to move on (busy, then a fresh attempt clears the mark)
            const iv = s.want.split(',').map(Number); const [x, y] = await center('#ecDrum'); const n = deliberate ? Math.max(1, iv.length - 1) : iv.length + 1; if (deliberate) misses++;
            
            const tt = Date.now(); let acc = 0; const plan = [0]; iv.forEach((v, i) => { acc += v * (1 + (i % 2 ? -.12 : .12) * (i % 3 === 2 ? 0.5 : 1)); plan.push(acc); });
            for (let i = 0; i < n; i++) { const wait = tt + plan[i] - Date.now(); if (wait > 0) await sleep(wait); await tapXY(x, y); }
            const j = await (async () => { const t1 = Date.now(); while (Date.now() - t1 < 4000) { const v = await page.evaluate(() => document.getElementById('stage').dataset.judge); if (v) return JSON.parse(v); await sleep(80); } return null; })();
            echoes.push({ round, want: s.want, taps: n, deliberate, ok: j && j.ok, why: j && j.why, worst: j && j.worst != null ? +j.worst.toFixed(3) : null });
            if (!deliberate && !(j && j.ok)) { ok = false; note += ` ECHO-REJECTED(${s.want}:${j && j.why})`; } if (deliberate && j && j.ok) { ok = false; note += ' ECHO-MISS-ACCEPTED'; } }
          lastKey = key; actions++; await sleep(250); if (actions % 4 === 0) await sample(); }
        await page.waitForSelector('#res.on', { timeout: 20000 }); await sleep(900); await sample(); await shot(`${ls}-results`);
        const res = await page.evaluate(() => ({ h: document.querySelector('#res h2').textContent, p: document.querySelector('#res p').textContent, stars: document.querySelectorAll('#res .stars3 svg.on').length, misses: (window.__voiceMisses || []).length, peak: window.__peak, rec: JSON.parse(localStorage.getItem('elearnea:v1') || '{}').lessons }));
        note += ` results="${res.h} ${res.p}" stars=${res.stars} misses=${misses} voiceMisses=${res.misses} peak=${(res.peak || 0).toFixed(3)} secs=${((Date.now() - t0) / 1000).toFixed(0)}`;
        if (!res.rec || !res.rec[ls]) { ok = false; note += ' NO-LESSON-RECORD'; } if (res.misses) ok = false; if (res.peak >= 1) { ok = false; note += ' CLIPPING'; }
        if (aud.small.size || aud.outside.size || aud.overflow) { ok = false; } note += ` minTarget=${Math.round(aud.min)}`;
      } catch (e) { ok = false; note += ' EXC ' + e.message.split('\n')[0]; await shot(`${ls}-error`).catch(() => {}); }
      rec({ vp: vpn, page: ls, ok: ok && !errs.length && !ext.length && !fails.length, consoleErrors: errs.slice(), external: ext.slice(), failed: fails.slice(), small: [...aud.small], outside: [...aud.outside], overflow: aud.overflow, echoes, note }); }
    await ctx.close(); }
  await browser.close();
  const pass = results.filter(r => r.ok).length; fs.writeFileSync(path.join(OUT, `qa-results-${VPS.join('_')}.json`), JSON.stringify({ when: new Date().toISOString(), pass, total: results.length, results }, null, 1));
  console.log(`${pass}/${results.length} passed`); process.exit(pass === results.length ? 0 : 1);
})();
