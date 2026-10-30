// Elearnea in-game QA: plays full rounds of Lily Pad Hop (rd-l2), Firefly Count (ma-l1 count, ma-l3 add) and Clocktower Gears
// (ma-l5 pattern, ma-l6 name, ma-l7 sort) through to the results card. Real taps on the game's own buttons; the answer is read from the
// DOM the child sees (Lily Pad: the word sign; Firefly: the fireflies / the "a and b more" prompt), and from Clocktower's ?qa=1
// data-want hook. Per lesson: no horizontal overflow, every interactive target >= 64 CSS px and inside the viewport, 0 console errors,
// 0 outside requests. One page at a time. Usage: node qa-ingame.js <baseUrl> <outDir> [viewports=phone,ipad,desktop] [lessons=all]
const { VP, launch } = require('./lib');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3]; const VPS = (process.argv[4] || 'phone,ipad,desktop').split(',');
const ALL = ['rd-l2', 'ma-l1', 'ma-l3', 'ma-l5', 'ma-l6', 'ma-l7']; const LESSONS = process.argv[5] && process.argv[5] !== 'all' ? process.argv[5].split(',') : ALL;
const GAME = { 'rd-l2': 'lily-pad', 'ma-l1': 'firefly-count', 'ma-l3': 'firefly-count', 'ma-l5': 'clocktower-gears', 'ma-l6': 'clocktower-gears', 'ma-l7': 'clocktower-gears' };
const MIN = 64; const origin = new URL(BASE).origin; const results = []; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function audit(MIN) { // in page: overflow + interactive targets (game stage + top bar)
  const W = document.documentElement.clientWidth, H = innerHeight, de = document.documentElement;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || s.pointerEvents === 'none') return false; } return true; };
  const nm = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : e.textContent.trim() ? `"${e.textContent.trim().slice(0, 12)}"` : '');
  const t = [...document.querySelectorAll('.topbar a, .topbar button, #stage button, #stage a[href], #stage [role=button]')].filter(vis);
  const small = [], outside = [];
  for (const e of t) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < MIN - .5) small.push(`${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)}`); if (r.left < -.5 || r.right > W + .5 || r.top < -.5 || r.bottom > H + .5) outside.push(`${nm(e)} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`); }
  return { W, sw: de.scrollWidth, bsw: document.body.scrollWidth, n: t.length, small, outside };
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
    const tapEl = async (h) => { const b = await h.boundingBox(); if (!b) throw new Error('no box'); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (VP[vpn].hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
    const shot = async (n) => page.screenshot({ path: path.join(OUT, `${n}-${vpn}.png`) });
    const waitFor = async (fn, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch (e) {} await sleep(120); } throw new Error('timeout: ' + what); };
    const resultsOn = () => page.isVisible('#res.on');
    for (const ls of LESSONS) {
      errs = []; ext = []; fails = []; let note = '', ok = true; const aud = { small: new Set(), outside: new Set(), overflow: [], n: 0, samples: 0 };
      const sample = async () => { const a = await page.evaluate(audit, MIN); aud.samples++; aud.n = Math.max(aud.n, a.n); a.small.forEach(x => aud.small.add(x)); a.outside.forEach(x => aud.outside.add(x)); if (a.outside.length && !aud.outShot) { aud.outShot = `${ls}-outside-${vpn}.png`; await shot(`${ls}-outside`); } if (a.sw > a.W || a.bsw > a.W) aud.overflow.push(`${a.sw}/${a.bsw}>${a.W}`); };
      const t0 = Date.now(); let rounds = 0;
      try {
        await page.evaluate(() => localStorage.clear()).catch(() => {});
        await page.goto(BASE + `play/${GAME[ls]}/?lesson=${ls}` + (GAME[ls] === 'clocktower-gears' ? '&qa=1' : ''), { waitUntil: 'networkidle' }); await sleep(900);
        while (!(await resultsOn()) && Date.now() - t0 < 200000) {
          if (GAME[ls] === 'lily-pad') {
            await waitFor(async () => (await page.$$('#lpField .pad')).length > 0 || await resultsOn(), 8000, 'pads'); if (await resultsOn()) break;
            const target = await page.$eval('#lpSign', s => s.textContent); await sample(); if (!rounds) await shot(`${ls}-play`);
            if (rounds === 1) { const wrong = await page.$(`#lpField .pad:not([aria-label="${target}"])`); await tapEl(wrong); await sleep(900); await sample(); aud.missed = 1; }
            const pad = await page.$(`#lpField .pad[aria-label="${target}"]`); await tapEl(pad); rounds++;
            await waitFor(async () => await resultsOn() || (await page.$eval('#lpSign', s => s.textContent).catch(() => target)) !== target || rounds >= 99, 6000, 'next word');
          } else if (GAME[ls] === 'firefly-count') {
            await waitFor(async () => (await page.$$('#ffField .fly:not(.gone), #ffJars .jar')).length > 0 || await resultsOn(), 8000, 'question'); if (await resultsOn()) break;
            await sleep(300); await sample(); if (!rounds) await shot(`${ls}-play`);
            const flies = await page.$$('#ffField .fly:not(.gone)'); let want;
            if (flies.length) { want = flies.length; for (const f of flies) { await tapEl(f); await sleep(180); } }
            else { const t = await page.$eval('#ffTxt', e => e.textContent); const m = t.match(/(\d+) and (\d+)/); want = +m[1] + +m[2]; }
            await waitFor(async () => (await page.$$('#ffAns:not(.hidden) .btn')).length >= 3, 6000, 'answers'); await sleep(250); await sample(); if (rounds === 1) await shot(`${ls}-answers`);
            const btn = (await page.$$('#ffAns .btn')); let hit = null; for (const b of btn) if ((await b.textContent()).trim() === String(want)) hit = b; const oldJar = await page.$('#ffJars .jar');
            if (rounds === 1) { let wr = null; for (const b of btn) if ((await b.textContent()).trim() !== String(want)) wr = b; await tapEl(wr); await sleep(1600); await sample(); await shot(`${ls}-miss`); aud.missed = 1; }
            await tapEl(hit); rounds++;
            await waitFor(async () => await resultsOn() || await oldJar.evaluate(e => !e.isConnected), 6000, 'next question'); // the next question rebuilds the jars
          } else { // clocktower: data-want / data-busy from ?qa=1
            await waitFor(async () => await resultsOn() || await page.$eval('#stage', s => !!s.dataset.want && s.dataset.busy !== '1'), 25000, 'idle'); if (await resultsOn()) break;
            const want = await page.$eval('#stage', s => s.dataset.want); await sleep(250); await sample(); if (!rounds) await shot(`${ls}-play`);
            const b = await page.$(`#stage button.chip[aria-label="${want}"], #stage button.card[aria-label="${want}"], #stage button.drawer[aria-label="${want} drawer"]`); if (!b) throw new Error('no target for ' + want);
            if (rounds === 1) { const wr = await page.$(`#stage button.chip:not([aria-label="${want}"]), #stage button.card:not([aria-label="${want}"]), #stage button.drawer:not([aria-label="${want} drawer"])`); await tapEl(wr); aud.missed = 1;
              await sleep(600); await sample(); await shot(`${ls}-miss`); await waitFor(() => page.$eval('#stage', s => s.dataset.busy !== '1'), 20000, 'idle after miss'); }
            await tapEl(b); rounds++;
            await waitFor(async () => await resultsOn() || await page.$eval('#stage', s => s.dataset.busy === '1' || !s.dataset.want), 6000, 'accepted');
          }
          if (rounds > 20) throw new Error('too many rounds');
        }
        await page.waitForSelector('#res.on #toPath', { timeout: 10000 }); await sleep(900); await sample(); await shot(`${ls}-results`);
        const card = (await page.locator('#res .paper').innerText()).replace(/\s+/g, ' ').trim(), stars = await page.locator('#res .stars3 svg.on').count();
        if (aud.overflow.length || aud.small.size || aud.outside.size) ok = false;
        note = `rounds=${rounds} oneMiss=${aud.missed ? 'yes' : 'no'} card="${card}" stars=${stars} samples=${aud.samples} targets<=${aud.n} secs=${Math.round((Date.now() - t0) / 1000)}` + (aud.overflow.length ? ` OVERFLOW ${aud.overflow[0]}` : ' noOverflow') + (aud.small.size ? ` SMALL ${[...aud.small].join('; ')}` : ' allTargets>=64') + (aud.outside.size ? ` OUTSIDE ${[...aud.outside].join('; ')} shot=${aud.outShot}` : ' allInside');
      } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0] + ` rounds=${rounds}`; await shot(`${ls}-error`).catch(() => {}); }
      await sleep(300); const r = { vp: vpn, page: ls + ' ' + GAME[ls], ok: ok && !errs.length && !ext.length && !fails.length, consoleErrors: errs.slice(), external: ext.slice(), failed: fails.slice(), note, small: [...aud.small], outside: [...aud.outside] };
      results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${r.page} errors=${errs.length} ext=${ext.length} failed=${fails.length} ${note}`); errs.forEach(e => console.log('   err:', e)); fails.forEach(e => console.log('   fail:', e));
    }
    await ctx.close();
  }
  await browser.close(); fs.writeFileSync(path.join(OUT, `qa-results-ingame-${VPS.join('-')}.json`), JSON.stringify(results, null, 2));
  console.log('SUMMARY', results.filter(r => r.ok).length + '/' + results.length + ' pass');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
