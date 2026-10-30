// Mothabet integration QA (branch mothabet/integration): lesson deep links, El.Learn records, Elearnea results + Path, dashboard, consent key, QA gate.
// One page at a time. Usage: node qa-mothabet-integration.js <baseUrl> <outDir> [viewports=phone,ipad,desktop]
const { launch } = require('./lib'); // QA_PLAYWRIGHT / QA_CHROME override the defaults
const fs = require('fs'), path = require('path');
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3]; const VPS = (process.argv[4] || 'phone,ipad,desktop').split(',');
const VP = { phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, ipad: { width: 1024, height: 1366, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, desktop: { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 } };
const origin = new URL(BASE).origin; const results = []; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
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
    const store = () => page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
    const s1 = await (async () => { await page.goto(BASE + 'realm/reading/', { waitUntil: 'networkidle' }); return null; })();
    await step('realm-before', async () => { await sleep(700); await shot('realm-before'); return 'nodes=' + await page.locator('button.node').count() + ' firstSoundsStarsOn=' + await page.locator('button.node[aria-label="First sounds"] .st .on').count(); });
    let plan;
    await step('rd-l1-lesson-card', async () => { await page.goto(BASE + 'play/mothabet/?lesson=rd-l1&qa=1', { waitUntil: 'networkidle' });
      await waitFor(async () => (await frame().evaluate(() => window.__qa && window.__qa.scene())) === 'goal', 8000, 'lesson card');
      plan = await waitFor(() => frame().evaluate(() => window.__qa.plan()), 4000, 'plan'); await sleep(600); await shot('rd-l1-lesson-card');
      const pool = await frame().evaluate(() => window.__qa.MB.STAGES.s[0].items.map(i => i.w)); const bad = plan.words.filter(w => !pool.includes(w));
      if (plan.local || bad.length || plan.words.length !== 10 || new Set(plan.words).size !== 10) throw new Error('plan ' + JSON.stringify(plan));
      const go = await frame().evaluate(() => window.__qa.button('bGo')); if (!go || !go.enabled) throw new Error('Go not ready');
      const close = await frame().evaluate(() => window.__qa.button('bX')); const inList = await frame().evaluate(() => { const s = window.__qa; return null; });
      return `stage=s1 words=${plan.words.join(',')} d=${plan.d} (El.Learn) local=${plan.local}`; });
    await step('rd-l1-play', async () => { const fe = await page.$('iframe'); const box = await fe.boundingBox(); const b = await frame().evaluate(() => window.__qa.button('bGo'));
      const p = await frame().evaluate(({ b }) => window.__qa.toScreen(b.x + b.w / 2, b.y + b.h / 2), { b }); await tapXY(box.x + p.x, box.y + p.y);
      await waitFor(async () => (await frame().evaluate(() => window.__qa.scene())) === 'play', 5000, 'play scene'); await waitFor(() => frame().evaluate(() => window.__qa.state().phase === 'word'), 8000, 'first word');
      await sleep(900); await shot('rd-l1-play'); let n = 0, wrongDone = false;
      while (n++ < 30) { const sc = await frame().evaluate(() => window.__qa.scene()); if (sc !== 'play') break; const st = await frame().evaluate(() => window.__qa.state());
        if (st.phase === 'word') { if (st.idx === 1 && !wrongDone) { wrongDone = true; await frame().evaluate(() => window.__qa.place(false)); await sleep(300); } await frame().evaluate(() => window.__qa.solveWord()); if (n === 4) { await sleep(500); await shot('rd-l1-play-mid'); } }
        await sleep(1500); }
      const sc = await frame().evaluate(() => window.__qa.scene()); if (sc !== 'lesson') throw new Error('round did not end, scene=' + sc); return 'rounds loop=' + n + ' wrongOnWord2=' + wrongDone; });
    await step('rd-l1-results', async () => { await page.waitForSelector('#toPath', { state: 'visible', timeout: 6000 }); await sleep(900); await shot('rd-l1-results');
      const txt = await page.locator('.paper').innerText(); const d = JSON.parse((await store())['elearnea:v1'] || '{}');
      const keys = Object.keys(d.srs || {}).filter(k => k.startsWith('rd.letter-sounds|')); const ls = (d.lessons || {})['rd-l1'];
      const firstMiss = keys.filter(k => d.srs[k][3] > 0).length; const prog = await page.evaluate(() => { const el = document.querySelector('.dots, #dots, .progress'); return el ? el.innerHTML.length : -1; });
      if (keys.length !== 10 || !ls || !ls.stars || firstMiss !== 1) throw new Error('El.Learn ' + JSON.stringify({ keys: keys.length, ls, firstMiss }));
      return `card="${txt.replace(/\s+/g, ' ').trim()}" srsWords=${keys.length} (${keys.map(k => k.split('|')[1]).join(',')}) missRecorded=${firstMiss} lesson=${JSON.stringify(ls)} skillD=${d.skills['rd.letter-sounds'].d.toFixed(3)}`; });
    await step('consent-key', async () => { const s = await store(); const own = JSON.parse(s['elearnea:mothabet:consent'] || 'null');
      if ('playtoom:consent' in s || 'playversy:consent' in s) throw new Error('Playtoom consent key written'); if (!own || own.childDirected !== true || own.analytics !== false) throw new Error('own key ' + JSON.stringify(own));
      const fr = await frame().evaluate(() => window.HX ? window.HX.consent.get() : { err: 'no HX', url: location.href, keys: Object.keys(window).filter(k => /^(HX|MB|Elearnea)/.test(k)) }); if (!fr.childDirected) throw new Error('frame consent ' + JSON.stringify(fr));
      return `keys=${Object.keys(s).join(',')} own=${JSON.stringify(own)} engine=${JSON.stringify(fr)}`; });
    await step('back-to-path', async () => { await tap(page.locator('#toPath')); await page.waitForURL(/realm\/reading\/?$/, { timeout: 6000 }); await page.waitForLoadState('networkidle'); await sleep(900); await shot('realm-after');
      const on = await page.locator('button.node[aria-label="First sounds"] .st .on').count(); if (!on) throw new Error('no stars on First sounds node');
      return 'url=' + page.url().replace(origin, '') + ' rd-l1 starIconsOn=' + on; });
    await step('dashboard-device', async () => { await page.goto(BASE + 'grown-ups/', { waitUntil: 'networkidle' }); await sleep(500); const q = await page.$eval('#q', q => q.textContent);
      const [x, y] = q.match(/\d+/g).map(Number); await tap(page.locator(`#opts .btn:text-is("${x * y}")`)); await sleep(1200); await tap(page.locator('.seg button[data-mode=device]')); await sleep(700);
      const d = await page.evaluate(() => ({ skills: [...document.querySelectorAll('#skills tr')].map(r => r.innerText.replace(/\s+/g, ' ')).filter(t => /sound|letter/i.test(t)), recent: [...document.querySelectorAll('#recent tr')].map(r => r.innerText.replace(/\s+/g, ' ')).slice(0, 2) }));
      await page.locator('#skills').scrollIntoViewIfNeeded().catch(() => {}); await sleep(300); await shot('dashboard-device');
      if (!d.recent.length) throw new Error('no recent rows'); return 'skillRows=' + JSON.stringify(d.skills) + ' recent=' + JSON.stringify(d.recent); });
    for (const [ls, band, si] of [['rd-l3', 's', 5], ['rd-l5', 's', 7], ['rd-l7', 'f', 0]]) await step(ls + '-no-qa-hook', async () => { await page.goto(BASE + `play/mothabet/?lesson=${ls}`, { waitUntil: 'networkidle' });
      const p = await waitFor(() => frame().evaluate(() => window.ElearneaBridge.plan && { words: window.ElearneaBridge.plan.items.map(i => i.w), stage: window.ElearneaBridge.plan.items.map(i => i.stage), local: !!window.ElearneaBridge.plan.local }), 8000, 'plan');
      await sleep(800); if (ls !== 'rd-l5') await shot(ls + '-lesson-card'); const qa = await frame().evaluate(() => typeof window.__qa); const want = await frame().evaluate(({ band, si }) => MB.STAGES[band][si].id, { band, si });
      if (qa !== 'undefined' || p.local || p.stage.some(s => s !== want)) throw new Error(JSON.stringify({ qa, p, want })); return `__qa=${qa} stage=${want} words=${p.words.join(',')}`; });
    await ctx.close();
  }
  await browser.close(); fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 2));
  console.log('SUMMARY', results.filter(r => r.ok).length + '/' + results.length + ' pass');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
