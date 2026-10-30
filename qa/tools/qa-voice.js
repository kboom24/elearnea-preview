// ElVoice onend contract (voice/voice.js): exactly one onend per say(): natural end, a duplicate 'ended' event, stop() mid-line, a newer
// say(), a clip that stalls (watchdog: duration / rate + 1.5 s), and a clip that fails to load (device fallback). Runs on the map page (it
// speaks only when tapped). One page, desktop viewport. Usage: node qa-voice.js <baseUrl> <outDir>
const { VP, launch } = require('./lib');
const fs = require('fs'), path = require('path');
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3]; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await launch(); const ctx = await browser.newContext(Object.assign({}, VP.desktop, { viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' }));
  const page = await ctx.newPage(); const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push(e.message));
  await page.goto(BASE + 'map/', { waitUntil: 'networkidle' }); await page.waitForFunction(() => window.ElVoice && ElVoice.ready, null, { timeout: 15000 });
  const res = await page.evaluate(async () => {
    const V = ElVoice, el = V._el(), sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const lines = Object.keys(V.map).filter(k => V.urls(k).length === 1).slice(0, 40), A = lines[0], B = lines[1];
    let starts = 0; el.addEventListener('play', () => starts++);
    const say = (t) => { const c = { n: 0, t0: performance.now(), t: 0 }; V.say(t, { onend: () => { c.n++; c.t = Math.round(performance.now() - c.t0); } }); return c; };
    const until = async (f, ms) => { const t0 = performance.now(); while (!f() && performance.now() - t0 < ms) await sleep(50); };
    const out = {};
    // 1. natural end, then a duplicate 'ended' event
    let c = say(A); await until(() => c.n, 15000); const dur = Math.round(el.duration * 1000); el.dispatchEvent(new Event('ended')); await sleep(400);
    out.natural = { onend: c.n, ms: c.t, clipMs: dur, ok: c.n === 1 && c.t >= dur - 50 && c.t < dur + 1400 };
    // 2. stop() mid-line
    c = say(A); await sleep(250); V.stop(); await sleep(300); out.stop = { onend: c.n, ok: c.n === 1 }; await sleep(100);
    // 3. a newer say() interrupts
    c = say(A); await sleep(250); const c2 = say(B); await until(() => c2.n, 15000); await sleep(300); out.superseded = { onendA: c.n, onendB: c2.n, ok: c.n === 1 && c2.n === 1 };
    // 4. stall: the first clip of a two-clip line is paused so it never ends; the watchdog must advance once, then the line ends once
    starts = 0; c = { n: 0, t0: performance.now() }; V.say([A, B], { onend: () => { c.n++; c.t = Math.round(performance.now() - c.t0); } });
    await until(() => el.duration > 0, 5000); const d1 = el.duration * 1000; await sleep(200); el.pause(); const t0 = performance.now();
    await until(() => starts >= 2, d1 + 4000); const adv = Math.round(performance.now() - t0 + 200); await until(() => c.n, 20000); await sleep(1800);
    out.stall = { firstClipMs: Math.round(d1), advancedAtMs: adv, clipStarts: starts, onend: c.n, ok: c.n === 1 && starts === 2 && adv >= d1 + 1000 && adv <= d1 + 2600 };
    // 5. a clip that fails to load -> device fallback (none in headless) -> onend once
    const urls = V.urls; V.urls = () => [location.origin + '/no-such-clip.mp3']; c = say(A); await until(() => c.n, 5000); await sleep(400); V.urls = urls; out.error = { onend: c.n, ok: c.n === 1 };
    // 6. watchdog after a real end: the line ends naturally; no second onend arrives later (the timer is cleared)
    c = say(A); await until(() => c.n, 15000); await sleep(dur + 2200); out.noLateDog = { onend: c.n, ok: c.n === 1 };
    return { A, B, out };
  });
  const fails = Object.entries(res.out).filter(([, v]) => !v.ok).map(([k]) => k), unexpected = errs.filter(e => !/404|no-such-clip|File not found/.test(e));
  for (const [k, v] of Object.entries(res.out)) console.log(`${v.ok ? 'PASS' : 'FAIL'} voice ${k} ${JSON.stringify(v)}`);
  console.log('lines:', JSON.stringify([res.A, res.B]), 'consoleErrors(other than the deliberate 404):', unexpected.length); unexpected.forEach(e => console.log('   err:', e));
  fs.writeFileSync(path.join(OUT, 'qa-results-voice.json'), JSON.stringify(res, null, 2));
  console.log('SUMMARY', (Object.keys(res.out).length - fails.length) + '/' + Object.keys(res.out).length + ' pass' + (unexpected.length ? ' (console errors)' : ''));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
