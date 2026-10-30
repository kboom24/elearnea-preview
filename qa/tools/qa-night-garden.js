// Wick's Night Garden QA: full rounds of every lesson (ns-l1 sort, ns-l2 needs, ns-l3 cycle, ns-l4 homes) through to the results card,
// with deliberate misses: round 2 gets one miss (hint), round 3 gets two misses (Wick models the answer, the right choice glows).
// Real taps on the game's own buttons; the answer comes from the ?qa=1 data-want hook (absent in kid mode: checked too).
// Per lesson: no horizontal overflow, every target >= 64 CSS px and inside the viewport, 0 console errors, 0 outside requests, 0 failed
// requests, 0 voice misses (text with no manifest line), praise never cut short (the next question only starts after the praise clip ends),
// the Back control reachable. Also: map (Nature island open), the Nature realm path, the results card's Path link.
// iPad perf: frame times (rAF) sampled during play -> avg fps and p95 frame ms. One page at a time.
// Usage: node qa-night-garden.js <baseUrl> <outDir> [viewports=phone,ipad,desktop] [lessons=ns-l1,ns-l2,ns-l3,ns-l4]
const { VP, launch } = require('./lib');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3]; const VPS = (process.argv[4] || 'phone,ipad,desktop').split(',');
const LESSONS = (process.argv[5] || 'ns-l1,ns-l2,ns-l3,ns-l4').split(','); const origin = new URL(BASE).origin; const results = []; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function audit(MIN) {
  const W = document.documentElement.clientWidth, H = innerHeight, de = document.documentElement;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || s.pointerEvents === 'none') return false; } return true; };
  const nm = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : '');
  const t = [...document.querySelectorAll('.topbar a, .topbar button, #stage button, #stage a[href], #res.on button, #res.on a[href]')].filter(vis);
  const small = [], outside = [];
  for (const e of t) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < MIN - .5) small.push(`${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)}`); if (r.left < -.5 || r.right > W + .5 || r.top < -.5 || r.bottom > H + .5) outside.push(`${nm(e)} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`); }
  // overlap: the scene must not run under the tray (choices hidden behind the card)
  const sc = document.querySelector('#ngScene'), tr = document.querySelector('#ngTray'); let overlap = null;
  if (sc && tr && tr.children.length) { const kids = [...sc.querySelectorAll('.ng-card, .slot')].map(e => e.getBoundingClientRect()); const tb = tr.getBoundingClientRect(); const ov = kids.filter(k => k.bottom > tb.top + 2 && k.height); if (ov.length) overlap = `scene ${Math.round(Math.max(...ov.map(k => k.bottom)))} > tray ${Math.round(tb.top)}`; }
  const back = document.querySelector('#back'); const br = back && back.getBoundingClientRect();
  return { W, sw: de.scrollWidth, bsw: document.body.scrollWidth, n: t.length, small, outside, overlap, backOk: !!(br && br.width >= MIN - .5 && br.left >= 0 && br.top >= 0 && br.right <= W && br.bottom <= H) };
}
(async () => {
  const browser = await launch();
  for (const vpn of VPS) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: VP[vpn].width, height: VP[vpn].height } }, VP[vpn], { serviceWorkers: 'block' }));
    const page = await ctx.newPage(); let errs = [], ext = [], fails = [], aborted = 0;
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
    page.on('requestfailed', r => { const e = r.failure() && r.failure().errorText; if (/ERR_ABORTED/.test(e || '') && /\/voice\/(clips|mb)\//.test(r.url())) { aborted++; return; } fails.push(r.url() + ' ' + e); });
    page.on('response', r => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()); });
    const tapEl = async (h) => { const b = await h.boundingBox(); if (!b) throw new Error('no box'); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (VP[vpn].hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
    const shot = async (n) => page.screenshot({ path: path.join(OUT, `${n}-${vpn}.png`) });
    const waitFor = async (fn, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch (e) {} await sleep(100); } throw new Error('timeout: ' + what); };
    const resultsOn = () => page.isVisible('#res.on');
    const rec = (r) => { r.ok = r.ok && !errs.length && !ext.length && !fails.length; r.consoleErrors = errs.slice(); r.external = ext.slice(); r.failed = fails.slice(); results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${r.page} errors=${errs.length} ext=${ext.length} failed=${fails.length} ${r.note || ''}`); errs.forEach(e => console.log('   err:', e)); fails.forEach(e => console.log('   fail:', e)); };
    // map + realm: the Nature island is open and its path shows the four lessons
    { errs = []; ext = []; fails = []; let ok = true, note = '';
      try { await page.goto(BASE, { waitUntil: 'networkidle' }); await page.evaluate(() => localStorage.clear());
        await page.goto(BASE + 'map/', { waitUntil: 'networkidle' }); await sleep(500); const isle = await page.$('.isle.open[aria-label="Nature"]'); if (!isle) { ok = false; note += 'NO open Nature island; '; } await shot('map');
        await page.goto(BASE + 'realm/science/', { waitUntil: 'networkidle' }); await sleep(800); const n = await page.$$eval('.node', a => a.filter(x => !x.classList.contains('chest') && !x.closest('.soonrow')).length); const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        note += `natureIsland=${isle ? 'open' : 'MISSING'} pathStops=${n} overflow=${sw > 0 ? sw : 0}`; if (n !== 4 || sw > 0) ok = false; await shot('realm-science'); } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0]; }
      rec({ vp: vpn, page: 'map + realm/science', ok, note }); }
    // kid mode: no data-want marker without ?qa=1
    { errs = []; ext = []; fails = []; let ok = true, note = '';
      try { await page.goto(BASE + 'play/night-garden/?lesson=ns-l1', { waitUntil: 'networkidle' }); await page.waitForSelector('#ngTray .ng-choice', { timeout: 15000 }); await sleep(500); const m = await page.$eval('#stage', s => s.dataset.want || null); if (m) ok = false; note = `kidMode dataWant=${m}`; } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0]; }
      rec({ vp: vpn, page: 'ns-l1 kid-mode (no ?qa=1)', ok, note }); }
    for (const ls of LESSONS) {
      errs = []; ext = []; fails = []; aborted = 0; let note = '', ok = true; const aud = { small: new Set(), outside: new Set(), overflow: [], overlap: [], back: true, n: 0, samples: 0, misses: 0, models: 0, cut: 0 };
      const sample = async (tag) => { const a = await page.evaluate(audit, 64); aud.samples++; aud.n = Math.max(aud.n, a.n); a.small.forEach(x => aud.small.add(x)); a.outside.forEach(x => aud.outside.add(x)); if (a.overlap) aud.overlap.push((tag || '') + ' ' + a.overlap); if (!a.backOk) aud.back = false; if (a.sw > a.W || a.bsw > a.W) aud.overflow.push(`${a.sw}/${a.bsw}>${a.W}`); };
      const t0 = Date.now(); let q = 0, perf = null;
      try {
        await page.goto(BASE, { waitUntil: 'networkidle' }); await page.evaluate(() => localStorage.clear());
        await page.goto(BASE + `play/night-garden/?lesson=${ls}&qa=1`, { waitUntil: 'networkidle' });
        // praise watcher: a new data-want may only appear after the last praise line finished (ElVoice not speaking)
        await page.evaluate(() => { window.__ngCut = 0; const st = document.getElementById('stage'); new MutationObserver(() => { if (st.dataset.want && window.ElVoice && ElVoice.speaking && window.__ngPraise) window.__ngCut++; }).observe(st, { attributes: true, attributeFilter: ['data-want'] });
          window.__ngPraise = false; addEventListener('el:mastery', () => { window.__ngPraise = true; const iv = setInterval(() => { if (!ElVoice.speaking) { window.__ngPraise = false; clearInterval(iv); } }, 50); }); });
        if (vpn === 'ipad') await page.evaluate(() => { const f = window.__ngFrames = []; let last = performance.now(); const tick = (t) => { f.push(t - last); last = t; if (f.length < 100000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
        while (!(await resultsOn()) && Date.now() - t0 < 240000) {
          await waitFor(async () => await resultsOn() || await page.$eval('#stage', s => !!s.dataset.want && s.dataset.busy !== '1'), 30000, 'idle'); if (await resultsOn()) break;
          const want = await page.$eval('#stage', s => s.dataset.want); await sleep(200); await sample('q' + q); if (!q) await shot(`${ls}-play`);
          const right = await page.$(`#ngTray .ng-choice[data-id="${want}"]:not(.used)`); if (!right) throw new Error('no target for ' + want);
          const nMiss = q === 1 ? 1 : q === 2 ? 2 : 0;
          for (let m = 0; m < nMiss; m++) { const wr = await page.$(`#ngTray .ng-choice:not([data-id="${want}"]):not(.used)`); if (!wr) break; await tapEl(wr); aud.misses++;
            await sleep(450); await sample('miss'); if (m === 0 && q === 1) await shot(`${ls}-miss-hint`);
            await waitFor(() => page.$eval('#stage', s => s.dataset.busy !== '1'), 20000, 'idle after miss');
            if (m === 1) { const glow = await page.$(`#ngTray .ng-choice.hint[data-id="${want}"]`); if (glow) aud.models++; await shot(`${ls}-miss-model`); } }
          await tapEl(right); q++; if (q === 1) { await sleep(700); await shot(`${ls}-yes`); }
          // accepted = the answer marker is cleared at once by a right tap (a tap that missed the button leaves it set)
          await waitFor(async () => await resultsOn() || await page.$eval('#stage', s => s.dataset.want === undefined), 6000, 'accepted (want cleared)');
          if (q > 60) throw new Error('too many questions');
        }
        await page.waitForSelector('#res.on #toPath', { timeout: 15000 }); await sleep(900); await sample('results'); await shot(`${ls}-results`);
        if (vpn === 'ipad') perf = await page.evaluate(() => { const f = (window.__ngFrames || []).slice(5).filter(x => x < 1000); f.sort((a, b) => a - b); const avg = f.reduce((a, b) => a + b, 0) / f.length; return { frames: f.length, fps: +(1000 / avg).toFixed(1), p95: +f[Math.floor(f.length * .95)].toFixed(1), max: +f[f.length - 1].toFixed(1) }; });
        aud.cut = await page.evaluate(() => window.__ngCut || 0);
        const misses = await page.evaluate(() => (window.__voiceMisses || []).slice());
        const card = (await page.locator('#res .paper').innerText()).replace(/\s+/g, ' ').trim(), stars = await page.locator('#res .stars3 svg.on').count();
        // Path link goes back to the Nature realm with the stars saved
        const href = await page.$eval('#toPath', a => a.getAttribute('href')); const saved = await page.evaluate((l) => (JSON.parse(localStorage.getItem('elearnea:v1') || '{}').lessons || {})[l] || null, ls);
        if (aud.overflow.length || aud.small.size || aud.outside.size || aud.overlap.length || !aud.back || misses.length || aud.cut || !saved || !/realm\/science\/$/.test(href) || aud.models < 1) ok = false;
        note = `questions=${q} misses=${aud.misses} modelGlow=${aud.models} card="${card}" stars=${stars} saved=${JSON.stringify(saved)} path=${href.replace(/^.*elearnea-preview\//, '')} secs=${Math.round((Date.now() - t0) / 1000)} samples=${aud.samples} targets<=${aud.n}`
          + (aud.overflow.length ? ` OVERFLOW ${aud.overflow[0]}` : ' noOverflow') + (aud.small.size ? ` SMALL ${[...aud.small].join('; ')}` : ' allTargets>=64') + (aud.outside.size ? ` OUTSIDE ${[...aud.outside].join('; ')}` : ' allInside')
          + (aud.overlap.length ? ` OVERLAP ${aud.overlap.slice(0, 3).join('; ')}` : ' noOverlap') + ` back=${aud.back ? 'ok' : 'BAD'} voiceMisses=${misses.length}${misses.length ? ' [' + misses.join(' | ') + ']' : ''} praiseCut=${aud.cut}` + (aborted ? ` abortedClipLoads=${aborted}` : '') + (perf ? ` perf=${JSON.stringify(perf)}` : '');
      } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0] + ` q=${q}`; await shot(`${ls}-error`).catch(() => {}); }
      await sleep(200); rec({ vp: vpn, page: ls + ' night-garden', ok, note, perf, small: [...aud.small], outside: [...aud.outside], overlap: aud.overlap });
    }
    await ctx.close();
  }
  await browser.close(); fs.writeFileSync(path.join(OUT, `qa-results-night-garden-${VPS.join('-')}.json`), JSON.stringify(results, null, 2));
  console.log('SUMMARY', results.filter(r => r.ok).length + '/' + results.length + ' pass');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
