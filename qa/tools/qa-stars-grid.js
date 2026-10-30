// Elearnea stars-grid QA (branch mothabet/stars-grid): Mothabet 3-star minimum (5 attempted) + no horizontal overflow on shared pages.
// One page at a time. Usage: node qa-stars-grid.js <baseUrl> <outDir> [viewports=phone,ipad,desktop]
const { launch } = require('./lib'); // QA_PLAYWRIGHT / QA_CHROME override the defaults
const fs = require('fs'), path = require('path');
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3]; const VPS = (process.argv[4] || 'phone,ipad,desktop').split(',');
const VP = { phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, ipad: { width: 1024, height: 1366, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, desktop: { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 } };
const origin = new URL(BASE).origin; const results = []; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PAGES = [['lily-pad', 'play/lily-pad/?lesson=rd-l2'], ['firefly-count', 'play/firefly-count/?lesson=ma-l1'], ['mothabet', 'play/mothabet/?lesson=rd-l1&qa=1'], ['realm-reading', 'realm/reading/'], ['realm-math', 'realm/math/'], ['map', 'map/']];
(async () => {
  const browser = await launch();
  for (const vpn of VPS) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: VP[vpn].width, height: VP[vpn].height } }, VP[vpn], { serviceWorkers: 'block' }));
    const page = await ctx.newPage(); let errs = [], ext = [], fails = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
    page.on('requestfailed', r => fails.push(r.url() + ' ' + (r.failure() && r.failure().errorText)));
    page.on('response', r => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()); });
    const tap = async (loc) => { if (VP[vpn].hasTouch) await loc.tap({ timeout: 4000 }); else await loc.click({ timeout: 4000 }); };
    const tapXY = async (x, y) => { if (VP[vpn].hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
    const shot = async (n) => page.screenshot({ path: path.join(OUT, `${n}-${vpn}.png`) });
    const step = async (name, fn) => { errs = []; ext = []; fails = []; let note = '', ok = true; try { note = (await fn()) || ''; } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0]; }
      await sleep(300); const r = { vp: vpn, page: name, ok: ok && !errs.length && !ext.length && !fails.length, consoleErrors: errs.slice(), external: ext.slice(), failed: fails.slice(), note };
      results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${name} errors=${errs.length} ext=${ext.length} failed=${fails.length} ${note}`); errs.forEach(e => console.log('   err:', e)); fails.forEach(e => console.log('   fail:', e)); };
    const frame = () => page.frame({ url: /mothabet\/game/ });
    const waitFor = async (fn, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch (e) {} await sleep(150); } throw new Error('timeout: ' + what); };
    const store = async () => JSON.parse(await page.evaluate(() => localStorage.getItem('elearnea:v1')) || '{}');
    // ---- horizontal overflow on shared pages
    for (const [name, url] of PAGES) await step('overflow-' + name, async () => { await page.goto(BASE + url, { waitUntil: 'networkidle' }); await sleep(1500);
      const r = await page.evaluate(() => { const W = innerWidth, de = document.documentElement;
        const ctrls = [...document.querySelectorAll('a, button, iframe, .pad, .node, .tile')].filter(e => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return r.width && r.height && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0 && !e.closest('.modal:not(.on), [hidden]'); });
        const out = ctrls.filter(e => { const r = e.getBoundingClientRect(); return r.left < -0.5 || r.right > W + 0.5; }).map(e => { const r = e.getBoundingClientRect(); return (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + `[${Math.round(r.left)},${Math.round(r.right)}]`; });
        return { W, sw: de.scrollWidth, cw: de.clientWidth, bsw: document.body.scrollWidth, n: ctrls.length, out }; });
      let extra = '';
      if (name === 'mothabet') { await waitFor(async () => (await frame().evaluate(() => window.__qa && window.__qa.scene())) === 'goal', 8000, 'lesson card'); const v = await frame().evaluate(() => window.__qa.view());
        if (v.iw !== r.W) r.out.push('frame innerWidth ' + v.iw); extra = ` frameInnerWidth=${v.iw}`; }
      await shot('page-' + name);
      if (r.sw > r.cw || r.bsw > r.W || r.out.length) throw new Error(JSON.stringify(r)); return `scrollWidth=${r.sw}<=clientWidth=${r.cw} body=${r.bsw} controlsInside=${r.n}/${r.n}${extra}`; });
    // ---- Mothabet stars cap: 4 attempted all correct -> 2 stars; 5 attempted all correct -> 3 stars; card == El.Learn record == path
    const lessonRound = async (solveN) => { await waitFor(async () => (await frame().evaluate(() => window.__qa && window.__qa.scene())) === 'goal', 8000, 'lesson card'); await waitFor(() => frame().evaluate(() => window.__qa.plan()), 4000, 'plan');
      const fe = await page.$('iframe'); const box = await fe.boundingBox(); const b = await frame().evaluate(() => window.__qa.button('bGo')); const v = await frame().evaluate(() => window.__qa.view());
      await tapXY(box.x + v.ox + (b.x + b.w / 2) * v.scale, box.y + v.oy + (b.y + b.h / 2) * v.scale);
      await waitFor(async () => (await frame().evaluate(() => window.__qa.scene())) === 'play', 5000, 'play');
      for (let k = 0; k < solveN; k++) { await waitFor(() => frame().evaluate((k) => window.__qa.state().phase === 'word' && window.__qa.state().idx === k, k), 8000, 'word ' + k); await frame().evaluate(() => window.__qa.solveWord()); }
      await waitFor(() => frame().evaluate((n) => window.__qa.state().phase === 'word' && window.__qa.state().idx === n, solveN), 8000, 'next word untouched');
      if (solveN === 4 && vpn === 'phone') { const hud = await frame().evaluate(() => window.__qa.hud()), v2 = await frame().evaluate(() => window.__qa.view()); const p = hud.find(h => h.icon === 'pause'); const right = box.x + v2.ox + (p.x + p.w) * v2.scale; await shot('mothabet-play'); if (right > VP[vpn].width + .5 || v2.iw !== VP[vpn].width) throw new Error('pause off-screen right=' + right + ' iw=' + v2.iw); }
      await frame().evaluate(() => window.__qa.endNow()); await page.waitForSelector('#toPath', { state: 'visible', timeout: 6000 }); await sleep(900);
      const txt = (await page.locator('.paper').innerText()).replace(/\s+/g, ' ').trim(), on = await page.locator('.paper .stars3 svg.on').count(), d = await store(), last = d.log[d.log.length - 1];
      return { txt, on, last, best: d.lessons['rd-l1'].stars }; };
    await step('stars-4-attempted-all-correct', async () => { await page.goto(BASE + 'play/mothabet/?lesson=rd-l1&qa=1', { waitUntil: 'networkidle' }); const r = await lessonRound(4); await shot('stars-4-results');
      if (!/4 of 4/.test(r.txt) || r.on !== 2 || r.last.s !== 2 || r.last.l !== 'rd-l1' || r.best !== 2) throw new Error(JSON.stringify(r)); return `card="${r.txt}" cardStars=2 log.s=${r.last.s} lessonStars=${r.best}`; });
    await step('stars-5-attempted-all-correct', async () => { await tap(page.locator('#again')); const r = await lessonRound(5); await shot('stars-5-results');
      if (!/5 of 5/.test(r.txt) || r.on !== 3 || r.last.s !== 3 || r.best !== 3) throw new Error(JSON.stringify(r)); return `card="${r.txt}" cardStars=3 log.s=${r.last.s} lessonStars=${r.best}`; });
    await step('path-stars-agree', async () => { await tap(page.locator('#toPath')); await page.waitForURL(/realm\/reading\/?$/, { timeout: 6000 }); await page.waitForLoadState('networkidle'); await sleep(800);
      const on = await page.locator('button.node[aria-label="First sounds"] .st .on').count(); if (on !== 3) throw new Error('path stars ' + on); await shot('path-after-stars'); return 'First sounds node stars=3 (= best lesson record)'; });
    await step('zero-attempted-still-no-record', async () => { const before = await store(); await page.goto(BASE + 'play/mothabet/?lesson=rd-l5&qa=1', { waitUntil: 'networkidle' });
      await waitFor(async () => (await frame().evaluate(() => window.__qa && window.__qa.scene())) === 'goal', 8000, 'card'); await waitFor(() => frame().evaluate(() => window.__qa.plan()), 4000, 'plan');
      const fe = await page.$('iframe'); const box = await fe.boundingBox(); const b = await frame().evaluate(() => window.__qa.button('bGo')); const v = await frame().evaluate(() => window.__qa.view());
      await tapXY(box.x + v.ox + (b.x + b.w / 2) * v.scale, box.y + v.oy + (b.y + b.h / 2) * v.scale); await waitFor(() => frame().evaluate(() => window.__qa.state().phase === 'word'), 8000, 'word');
      await frame().evaluate(() => window.__qa.endNow()); await page.waitForSelector('#toPath', { state: 'visible', timeout: 6000 }); await sleep(600);
      const d = await store(), on = await page.locator('.paper .stars3 svg.on').count(); if (d.lessons['rd-l5'] || d.log.length !== before.log.length || on) throw new Error(JSON.stringify({ l: d.lessons['rd-l5'], on }));
      return 'stars=0 no lesson record, log unchanged'; });
    await ctx.close();
  }
  await browser.close(); fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 2));
  console.log('SUMMARY', results.filter(r => r.ok).length + '/' + results.length + ' pass');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
