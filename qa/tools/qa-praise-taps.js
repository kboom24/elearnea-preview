// Praise vs. impatient taps: in Lantern Barn (ll-r1), Picture Garden (ll-r2), Glow Jars (ll-m1) and Lily Pad Hop (rd-l2), after each right
// answer the script taps everything it can for ~1.6 s while the praise plays (the other cards / pads, the right card again, Wick / the hear
// button). Pass: every praise line plays to its end (praise-probe), no clip is still playing when the next item appears, each el:progress
// moves `done` by exactly 1 (no skipped item, no double advance), the round reaches the results card, 0 console errors, 0 outside requests.
// One page at a time. Usage: node qa-praise-taps.js <baseUrl> <outDir> [viewports=phone] [lessons=ll-r1,ll-r2,ll-m1,rd-l2]
const { VP, launch } = require('./lib'); const PROBE = require('./praise-probe'); const fs = require('fs'), path = require('path');
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3]; const VPS = (process.argv[4] || 'phone').split(',');
const LESSONS = (process.argv[5] || 'll-r1,ll-r2,ll-m1,rd-l2').split(','); const GAME = { 'll-r1': 'lantern-barn', 'll-r2': 'picture-garden', 'll-m1': 'glow-jars', 'rd-l2': 'lily-pad' };
const PRAISE = PROBE.praiseSet(path.join(__dirname, '../../voice/manifest.json')); const origin = new URL(BASE).origin; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); let pass = 0;
const tapAt = async (page, h) => { try { const b = await h.boundingBox(); if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); } catch (e) {} };
(async () => {
  const browser = await launch();
  for (const vpn of VPS) for (const ls of LESSONS) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: VP[vpn].width, height: VP[vpn].height } }, VP[vpn], { serviceWorkers: 'block' }));
    await ctx.addInitScript(PROBE.init); const page = await ctx.newPage(); const errs = [], ext = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(String(e)));
    page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
    let ok = true, note = '', rounds = 0, spam = 0; const t0 = Date.now();
    try {
      await page.goto(BASE, { waitUntil: 'networkidle' });
      await page.evaluate((ll) => { localStorage.clear(); if (ll) localStorage.setItem('elearnea:v1', JSON.stringify({ set: { voice: true, sound: true, rate: 1, band: 'little', little: 'little' } })); }, ls.startsWith('ll-'));
      await page.goto(BASE + `play/${GAME[ls]}/?lesson=${ls}` + (ls.startsWith("ll-") ? "&qa=1" : ""), { waitUntil: 'networkidle' }); await sleep(900);
      const resultsOn = () => page.$('#res.on').then(Boolean);
      while (!(await resultsOn()) && Date.now() - t0 < 180000) {
        let right, others, extra;
        if (ls === 'rd-l2') { await page.waitForSelector('#lpField .pad', { timeout: 10000 }).catch(() => {}); if (await resultsOn()) break;
          const tg = await page.$eval('#lpSign', s => s.textContent).catch(() => null); if (!tg) { await sleep(200); continue; }
          right = await page.$(`#lpField .pad[aria-label="${tg}"]`); others = () => page.$$(`#lpField .pad:not([aria-label="${tg}"])`); extra = () => page.$$('#stage button');
          await sleep(500); await tapAt(page, right); rounds++;
          const s0 = Date.now(); while (Date.now() - s0 < 1600) { for (const h of [...await others(), ...await extra()]) { await tapAt(page, h); spam++; await sleep(90); if (Date.now() - s0 >= 1600) break; } await tapAt(page, right); }
          const t1 = Date.now(); while (Date.now() - t1 < 12000 && !(await resultsOn()) && (await page.$eval('#lpSign', s => s.textContent).catch(() => tg)) === tg) await sleep(150);
        } else {
          const st = await page.waitForFunction(() => document.querySelector('#res.on') ? 'end' : document.querySelector('#llOpts .ll-card[data-ok="1"]:not(.done)') ? 'cards' : null, null, { timeout: 30000 }).then(h => h.jsonValue());
          if (st === 'end') break; await sleep(300);
          right = await page.$('#llOpts .ll-card[data-ok="1"]:not(.done)'); await tapAt(page, right); rounds++;
          const s0 = Date.now(); while (Date.now() - s0 < 1600) { for (const h of [...await page.$$('#llOpts .ll-card'), await page.$('#llWick')]) { if (h) { await tapAt(page, h); spam++; } await sleep(90); if (Date.now() - s0 >= 1600) break; } }
          await page.waitForFunction((e) => !e.isConnected || document.querySelector('#res.on'), right, { timeout: 15000 });
        }
        if (rounds > 30) throw new Error('too many rounds');
      }
      if (!(await resultsOn())) { ok = false; note += ' NO-RESULTS'; }
      await page.screenshot({ path: path.join(OUT, `${vpn}-${ls}-taps-end.png`) });
      const adv = []; for (const f of page.frames()) { try { const v = await f.evaluate(() => window.__vp ? window.__vp.adv : []); adv.push(...v); } catch (e) {} }
      const pr = adv.filter(a => a.type === 'progress').map(a => a.done).filter(d => d != null); let bad = [];
      for (let i = 1; i < pr.length; i++) if (pr[i] !== pr[i - 1] + 1) bad.push(`${pr[i - 1]}->${pr[i]}`);
      if (bad.length) { ok = false; note += ` PROGRESS-JUMP ${bad.join(',')}`; }
      const pv = await PROBE.check(page, PRAISE); if (!pv.ok) ok = false; note += ` progress=${pr.join(',')} | voice: ${pv.note}`;
    } catch (e) { ok = false; note += ' ERROR ' + String(e.message || e).split('\n')[0]; }
    if (errs.length) { ok = false; note += ` CONSOLE ${errs.slice(0, 3).join(' / ')}`; } if (ext.length) { ok = false; note += ` OUTSIDE ${ext.slice(0, 3).join(' ')}`; }
    if (ok) pass++; console.log(`${ok ? 'PASS' : 'FAIL'} ${vpn} ${ls} ${GAME[ls]} errors=${errs.length} ext=${ext.length} rounds=${rounds} spamTaps=${spam} secs=${Math.round((Date.now() - t0) / 1000)}${note}`);
    await ctx.close();
  }
  console.log(`SUMMARY ${pass}/${VPS.length * LESSONS.length} pass`); await browser.close(); process.exit(pass === VPS.length * LESSONS.length ? 0 : 1);
})();
