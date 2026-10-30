// Elearnea horizontal-overflow QA: landing, waitlist, grown-ups (gate, dashboard sample + device, portfolio record) + regression pages
// (games, realms, map). Per page: document/body scrollWidth <= clientWidth, every visible control/input inside the viewport, no clipped text.
// One page at a time. Usage: node qa-overflow-pages.js <baseUrl> <outDir> [viewports=phone,ipad,desktop]
const { launch } = require('./lib'); // QA_PLAYWRIGHT / QA_CHROME override the defaults
const fs = require('fs'), path = require('path');
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3]; const VPS = (process.argv[4] || 'phone,ipad,desktop').split(',');
const VP = { phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, ipad: { width: 1024, height: 1366, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, desktop: { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 } };
const origin = new URL(BASE).origin; const results = []; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const REGRESSION = [['lily-pad', 'play/lily-pad/?lesson=rd-l2'], ['firefly-count', 'play/firefly-count/?lesson=ma-l1'], ['mothabet', 'play/mothabet/?lesson=rd-l1&qa=1'], ['clocktower-gears', 'play/clocktower-gears/?lesson=ma-l5'], ['realm-reading', 'realm/reading/'], ['realm-math', 'realm/math/'], ['map', 'map/']];
function measure() { // runs in the page
  const W = document.documentElement.clientWidth, de = document.documentElement, b = document.body;
  const vis = (e) => { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || +s.opacity === 0) return false; } return true; };
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.classList.length ? '.' + [...e.classList].join('.') : '')) + (e.textContent ? ' "' + e.textContent.trim().slice(0, 24) + '"' : '');
  // inside a horizontal scroller (overflow-x auto/scroll) a control may legitimately sit beyond the edge until scrolled; flag those separately
  const scroller = (e) => { for (let p = e.parentElement; p && p !== b; p = p.parentElement) { const s = getComputedStyle(p).overflowX; if (s === 'auto' || s === 'scroll') return p; } return null; };
  const ctrls = [...document.querySelectorAll('a[href], button, input, select, textarea, label, iframe, .node, .pad, .tile, [role=button]')].filter(vis);
  const out = [], inScroller = [];
  for (const e of ctrls) { const r = e.getBoundingClientRect(); if (r.left < -0.5 || r.right > W + 0.5) (scroller(e) ? inScroller : out).push(name(e) + `[${Math.round(r.left)},${Math.round(r.right)}]`); }
  // clipped text: an element with its own text whose content is wider than its box and the overflow is not visible (or ellipsis)
  const clipped = [];
  for (const e of document.querySelectorAll('body *')) { if (!vis(e) || !e.childNodes.length) continue; const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
    const cs = getComputedStyle(e); if ((cs.overflowX !== 'visible' || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1 && e.tagName !== 'TEXTAREA' && e.tagName !== 'SELECT') clipped.push(name(e) + ` ${e.scrollWidth}>${e.clientWidth}`);
    const r = e.getBoundingClientRect(); if (r.right > W + 0.5 || r.left < -0.5) { const rng = document.createRange(); rng.selectNodeContents(e); const tr = rng.getBoundingClientRect(); if (tr.width && (tr.right > W + 0.5 || tr.left < -0.5) && !scroller(e)) clipped.push(name(e) + ` text[${Math.round(tr.left)},${Math.round(tr.right)}]`); } }
  return { W, sw: de.scrollWidth, cw: de.clientWidth, bsw: b.scrollWidth, n: ctrls.length, out, inScroller, clipped: [...new Set(clipped)].slice(0, 12) };
}
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
    const shot = async (n, full) => page.screenshot({ path: path.join(OUT, `${n}-${vpn}.png`), fullPage: !!full });
    const step = async (name, fn) => { errs = []; ext = []; fails = []; let note = '', ok = true; try { note = (await fn()) || ''; } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0]; }
      await sleep(300); const r = { vp: vpn, page: name, ok: ok && !errs.length && !ext.length && !fails.length, consoleErrors: errs.slice(), external: ext.slice(), failed: fails.slice(), note };
      results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${name} errors=${errs.length} ext=${ext.length} failed=${fails.length} ${note}`); errs.forEach(e => console.log('   err:', e)); ext.forEach(e => console.log('   ext:', e)); fails.forEach(e => console.log('   fail:', e)); };
    const check = async (label, full) => { const r = await page.evaluate(measure); await shot(label, full);
      const info = r.inScroller.length ? ` inHScroller=${r.inScroller.length} (${r.inScroller.slice(0, 3).join('; ')})` : '';
      if (r.sw > r.cw || r.bsw > r.cw || r.out.length || r.clipped.length) throw new Error(JSON.stringify(r)); return `scrollWidth=${r.sw}<=${r.cw} body=${r.bsw} controlsInside=${r.n}/${r.n} clippedText=0${info}`; };
    await step('landing', async () => { await page.goto(BASE, { waitUntil: 'networkidle' }); await sleep(900); return check('landing', true); });
    await step('waitlist', async () => { await page.goto(BASE + 'waitlist/', { waitUntil: 'networkidle' }); await sleep(900); return check('waitlist', true); });
    await step('grown-ups-gate', async () => { await page.goto(BASE + 'grown-ups/', { waitUntil: 'networkidle' }); await sleep(600); return check('grown-ups-gate'); });
    await step('dashboard-sample', async () => { const q = await page.$eval('#q', q => q.textContent); const [x, y] = q.match(/\d+/g).map(Number); await tap(page.locator(`#opts .btn:text-is("${x * y}")`)); await sleep(1200);
      if (!await page.isVisible('#area')) throw new Error('gate did not open'); const base = await check('dashboard-sample', true);
      // section tabs: phone (<=480px) = 3 + 2 grid, second row centred; every tab >= 44px tall with its label unclipped
      const t = await page.evaluate(() => [...document.querySelectorAll('.side nav a')].map(a => { const r = a.getBoundingClientRect(), n = a.parentElement.getBoundingClientRect(); return { t: Math.round(r.top), l: r.left - n.left, rr: n.right - r.right, h: r.height, clip: a.scrollWidth > a.clientWidth + 1, txt: a.textContent.trim() }; }));
      const rows = [...new Set(t.map(x => x.t))].sort((a, b) => a - b).map(y => t.filter(x => x.t === y));
      if (t.some(x => x.h < 44 || x.clip)) throw new Error('tabs ' + JSON.stringify(t));
      if (VP[vpn].width <= 480) { const r2 = rows[1] || []; const gap = r2.length ? Math.abs(r2[0].l - r2[r2.length - 1].rr) : 99;
        if (rows.length !== 2 || rows[0].length !== 3 || r2.length !== 2 || gap > 2) throw new Error('phone tabs not 3+2 centred ' + JSON.stringify(rows.map(r => r.map(x => x.txt)))); }
      return base + ` tabs=${rows.map(r => r.length).join('+')} minTabH=${Math.round(Math.min(...t.map(x => x.h)))} labelsClipped=0`; });
    await step('dashboard-device', async () => { await tap(page.locator('.seg button[data-mode=device]')); await sleep(700); return check('dashboard-device', true); });
    await step('portfolio-record', async () => { await tap(page.locator('.seg button[data-mode=sample]')); await sleep(400); await tap(page.locator('#exportB')); await sleep(700); const r = await check('portfolio-record', false); await tap(page.locator('#recClose')); return r; });
    // age band switch (Little Lanterns): grown-ups "Who is playing" (parent-facing, >= 44px) and the map's picture switch (kid-facing, >= 64px;
    // in the Little Lanterns band the youngest-band rule is 96px, reported as `under96` so the map owner can see it)
    const sizes = (sel) => page.$$eval(sel, a => a.filter(e => e.getBoundingClientRect().width).map(e => { const r = e.getBoundingClientRect(); return { n: (e.id ? '#' + e.id : e.className || e.tagName) + (e.dataset.band ? '[' + e.dataset.band + ']' : ''), w: Math.round(r.width), h: Math.round(r.height), clip: e.scrollWidth > e.clientWidth + 1 }; }));
    await step('grown-ups-age-switch', async () => { const ok = await page.$('#ageC'); if (!ok) throw new Error('no #ageC');
      await page.locator('#ageC').scrollIntoViewIfNeeded(); await sleep(400); await shot('grown-ups-age-switch'); const base = await check('grown-ups-age-switch-page', true);
      const b = await sizes('.ages button'); if (b.length !== 3 || b.some(x => x.h < 44 || x.w < 44 || x.clip)) throw new Error('age buttons ' + JSON.stringify(b));
      const sec = await page.$$eval('section.c', a => a.map(x => x.id)); const settingsOk = sec.includes('settingsC');
      await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), tap(page.locator('.ages button[data-band=little]'))]); await sleep(500);
      const band = await page.evaluate(() => JSON.parse(localStorage.getItem('elearnea:v1')).set);
      if (band.band !== 'little' || band.little !== 'little') throw new Error('band not saved ' + JSON.stringify(band));
      return base + ` ageButtons=${b.map(x => x.w + 'x' + x.h).join(',')} saved=little/little sections=${sec.join(',')}` + (settingsOk ? '' : ' NOTE #settingsC section missing'); });
    for (const band of ['little', 'explorer']) await step('map-band-' + band, async () => { await page.goto(BASE + 'map/', { waitUntil: 'networkidle' }); await sleep(800);
      const btn = page.locator(`#band button[data-band=${band}]`); await tap(btn); await sleep(900);
      const st = await page.evaluate(() => ({ L: document.getElementById('bandL').getAttribute('aria-pressed'), E: document.getElementById('bandE').getAttribute('aria-pressed'), little: document.body.classList.contains('little'), set: JSON.parse(localStorage.getItem('elearnea:v1') || '{}').set }));
      if ((band === 'little') !== st.little || st.L !== String(band === 'little') || st.E !== String(band !== 'little')) throw new Error('switch state ' + JSON.stringify(st));
      const base = await check('map-band-' + band); const b = await sizes('#band button'); if (b.some(x => x.h < 64 || x.w < 64 || x.clip)) throw new Error('band buttons ' + JSON.stringify(b));
      const all = await sizes('header button, header a[href], #band button, #world button, .bar button, .bar a[href]'); const u96 = all.filter(x => Math.min(x.w, x.h) < 96).map(x => `${x.n} ${x.w}x${x.h}`);
      return base + ` bandButtons=${b.map(x => x.w + 'x' + x.h).join(',')}` + (band === 'little' ? ` under96=${u96.length}${u96.length ? ' (' + u96.join('; ') + ')' : ''}` : ''); });
    for (const [name, url] of REGRESSION) await step('regress-' + name, async () => { await page.goto(BASE + url, { waitUntil: 'networkidle' }); await sleep(1500);
      let extra = ''; if (name === 'mothabet') { const fr = page.frame({ url: /mothabet\/game/ }); const t0 = Date.now(); let v = null; while (Date.now() - t0 < 8000 && !v) { try { v = await fr.evaluate(() => window.__qa && window.__qa.scene() === 'goal' && window.__qa.view()); } catch (e) {} if (!v) await sleep(150); }
        if (!v || v.iw !== VP[vpn].width) throw new Error('mothabet frame width ' + JSON.stringify(v)); extra = ' frameInnerWidth=' + v.iw; }
      return (await check('regress-' + name)) + extra; });
    await ctx.close();
  }
  await browser.close(); fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 2));
  console.log('SUMMARY', results.filter(r => r.ok).length + '/' + results.length + ' pass');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
