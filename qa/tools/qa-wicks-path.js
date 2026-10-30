// Wick's Lantern Path QA (Logic & Coding): map island open, Logic realm path shows and launches the 4 lessons, kid mode has no QA hooks,
// full rounds to the results card with real taps, a deliberate miss, the full help path (step that went wrong -> traced arrow -> a program
// that works; in debugging: the free "watch" run of the untouched program first), and the grown-ups standards labels (CSTA).
// Per step: 0 console errors, 0 outside requests, 0 failed responses, 0 voice misses / pending lines, targets >= 64 CSS px inside the viewport,
// no horizontal overflow. Usage: node qa/tools/qa-wicks-path.js <base url> <out dir> [phone,ipad,desktop] [plan json]
//   plan default: {"phone":["lg-l1","lg-l2"],"ipad":["lg-l3"],"desktop":["lg-l4"]}; the first lesson per viewport also runs the help path
//   (QA_HELP_ALL=1: every lesson). Viewports: phone, ipad, desktop, ipad-land (1366x1024).
const path = require('path'), fs = require('fs'); const { launch, VP } = require('./lib.js'); const PROBE = require('./praise-probe'); // praise lines must play to their end before the next garden
const BASE = (process.argv[2] || 'http://127.0.0.1:8780/elearnea-preview/').replace(/\/?$/, '/'), OUT = process.argv[3] || '/tmp/qa-wicks-path';
const VPS = (process.argv[4] || 'phone,ipad,desktop').split(','), PLAN = process.argv[5] ? JSON.parse(process.argv[5]) : { phone: ['lg-l1', 'lg-l2'], ipad: ['lg-l3'], desktop: ['lg-l4'] };
// env: QA_HELP_ALL=1 runs the help path in every lesson round (not only the first per viewport); QA_SHOT_TAG=<prefix> prefixes screenshot names
const HELP_ALL = process.env.QA_HELP_ALL === '1', TAG = process.env.QA_SHOT_TAG || '', VPX = Object.assign({ 'ipad-land': { width: 1366, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }, VP);
const NAMES = { 'lg-l1': 'First step', 'lg-l2': 'Lantern path', 'lg-l3': 'Fix the path', 'lg-l4': 'Repeat it' }, OPP = { U: 'D', D: 'U', L: 'R', R: 'L' };
const QA_KEYS = ['sol', 'bug', 'busy', 'prog', 'lv'];
fs.mkdirSync(OUT, { recursive: true }); const origin = new URL(BASE).origin; const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const results = []; const PRAISE = PROBE.praiseSet(path.join(__dirname, '..', '..', 'voice', 'manifest.json'));
function audit() { const W = document.documentElement.clientWidth, H = innerHeight, de = document.documentElement;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || s.pointerEvents === 'none') return false; } return true; };
  const nm = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : '');
  const t = [...document.querySelectorAll('.topbar a, .topbar button, #stage button, #res.on button, #res.on a[href], .foot button, #path .node, #path .tile, #world .isle')].filter(vis);
  const small = [], outside = []; for (const e of t) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < 63.5) small.push(`${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (!e.closest('#path') && (r.left < -.5 || r.right > W + .5 || r.top < -.5 || r.bottom > H + .5)) outside.push(nm(e)); }
  const g = document.querySelector('.wp-garden'), sc = document.querySelector('.wp-scene'); let gardenOut = '';
  if (g && sc) { const a = g.getBoundingClientRect(), b = sc.getBoundingClientRect(); if (a.left < b.left - .5 || a.right > b.right + .5 || a.top < b.top - .5 || a.bottom > b.bottom + .5) gardenOut = 'garden outside scene'; }
  return { overflow: Math.max(de.scrollWidth, document.body.scrollWidth) - W, small, outside, gardenOut, n: t.length }; }
(async () => { const browser = await launch();
  for (const vpn of VPS) { const V = VPX[vpn];
    const ctx = await browser.newContext(Object.assign({}, V, { viewport: { width: V.width, height: V.height }, serviceWorkers: 'block' })); await ctx.addInitScript(PROBE.init); const page = await ctx.newPage();
    let errs = [], ext = [], fails = [], clips = { ok: 0, bad: 0 };
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
    page.on('requestfailed', r => { const e = (r.failure() || {}).errorText || ''; if (/ERR_ABORTED/.test(e) && /\/voice\/(clips|mb)\//.test(r.url())) return; fails.push('failed ' + e + ' ' + r.url()); });
    page.on('response', r => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()); if (/\/voice\/clips\//.test(r.url())) { if (r.status() < 300 || r.status() === 304) clips.ok++; else clips.bad++; } });
    const tap = async (sel) => { const h = typeof sel === 'string' ? await page.$(sel) : sel; if (!h) throw new Error('no element ' + sel); const b = await h.boundingBox(); if (!b) throw new Error('no box ' + sel);
      const x = b.x + b.width / 2, y = b.y + b.height / 2; if (V.hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await sleep(140); };
    const shot = (n) => page.screenshot({ path: path.join(OUT, `${TAG}${n}-${vpn}.png`) });
    const waitFor = async (fn, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch (e) {} await sleep(120); } throw new Error('timeout: ' + what); };
    const step = async (name, fn) => { errs = []; ext = []; fails = []; clips = { ok: 0, bad: 0 }; const aud = { small: new Set(), outside: new Set(), overflow: 0, garden: '' }; let note = '', ok = true;
      const sample = async () => { const a = await page.evaluate(audit); a.small.forEach(x => aud.small.add(x)); a.outside.forEach(x => aud.outside.add(x)); aud.overflow = Math.max(aud.overflow, a.overflow); if (a.gardenOut) aud.garden = a.gardenOut; };
      try { note = await fn(sample) || ''; await sample(); } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0]; }
      const vm = await page.evaluate(() => ({ miss: (window.__voiceMisses || []).length, missList: (window.__voiceMisses || []).slice(0, 5), pend: (window.__voicePending || []).length, pendList: (window.__voicePending || []).slice(0, 5) })).catch(() => ({ miss: 0, pend: 0 }));
      const r = { vp: vpn, step: name, ok: ok && !errs.length && !ext.length && !fails.length && !vm.miss && !vm.pend && !aud.small.size && !aud.outside.size && aud.overflow <= 0 && !aud.garden && !clips.bad,
        consoleErrors: errs.slice(), external: ext.slice(), failed: fails.slice(), clips: Object.assign({}, clips), voiceMisses: vm.missList || [], voicePending: vm.pendList || [], small: [...aud.small], outside: [...aud.outside], overflow: aud.overflow, garden: aud.garden, note };
      results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${name} errors=${errs.length} ext=${ext.length} failed=${fails.length} clips=${clips.ok}/${clips.ok + clips.bad} misses=${vm.miss} pending=${vm.pend} small=${JSON.stringify(r.small)} outside=${JSON.stringify(r.outside)} overflow=${aud.overflow} ${aud.garden} ${note}`); };
    const ds = () => page.$eval('#stage', s => Object.assign({}, s.dataset));
    const idle = () => waitFor(async () => (await page.isVisible('#res.on')) || (await page.$eval('#stage', s => !!s.dataset.sol && s.dataset.busy === '0')), 40000, 'idle');
    const flat = (sol) => sol.match(/X\d\([^)]*\)|[UDLR]/g);
    const build = async (sol) => { for (const tk of flat(sol)) { if (tk[0] === 'X') { await tap('#wpTray .rtile'); for (const d of tk.match(/\((.*)\)/)[1].split(',')) await tap(`#wpTray .atile[data-d="${d}"]`); } else await tap(`#wpTray .atile[data-d="${tk}"]`); } };
    const clear = async () => { for (let k = 0; k < 12; k++) { const t = await page.$('#wpProg .rhead') || await page.$('#wpProg .ptile:not(.empty)'); if (!t) return; await tap(t); } };
    const dots = () => page.$$eval('#dots i.on', a => a.length);
    const firstDir = (sol) => { const t = flat(sol)[0]; return t[0] === 'X' ? t.match(/\((\w)/)[1] : t; };
    const wrongArrow = async (sol) => { const tray = await page.$$eval('#wpTray .atile[data-d]', a => a.map(e => e.dataset.d)); const want = OPP[firstDir(sol)]; return tray.includes(want) ? want : tray.find(d => d !== firstDir(sol)); };
    const go = async () => { await tap('#wpGo'); await sleep(500); await idle(); };

    // 1) map: the Logic & Coding island is open
    await step('map', async (sample) => { await page.goto(BASE + 'map/', { waitUntil: 'networkidle' }); await sleep(700); await sample(); await shot('map');
      const isle = await page.$$eval('#world .isle', a => a.map(e => e.className + '|' + e.getAttribute('aria-label'))); const lg = isle.find(x => /Logic/.test(x)); if (!lg || !/\bopen\b/.test(lg)) throw new Error('logic island not open: ' + lg); return 'logicIsle=' + lg.split('|')[0]; });
    // 2) realm path: 4 lessons, launches a lesson (kid mode: no QA hooks on the stage)
    await step('realm-logic', async (sample) => { await page.goto(BASE + 'realm/logic/', { waitUntil: 'networkidle' }); await sleep(900); await sample(); await shot('realm-logic');
      const tiles = await page.$$eval('#path .tile .lbl', a => a.map(e => e.textContent)); for (const n of Object.values(NAMES)) if (!tiles.includes(n)) throw new Error('missing tile ' + n + ' in ' + tiles);
      const title = await page.$eval('#title', e => e.textContent); return `title="${title.trim()}" tiles=${JSON.stringify(tiles)}`; });
    await step('realm-launch-kid-mode', async (sample) => { const t = await page.$('#path .tile:not(.locked)'); const lbl = await t.$eval('.lbl', e => e.textContent); await t.scrollIntoViewIfNeeded(); await tap(t);
      await page.waitForURL(/play\/wicks-path\/\?lesson=lg-l/, { timeout: 15000 }); await page.waitForSelector('#wpTray .atile', { timeout: 15000 }); await sleep(1200); await sample();
      const before = await ds(); await tap('#wpTray .atile'); await tap('#wpGo'); await sleep(2500); const after = await ds(); const hook = await page.$eval('#stage', s => !!s._wpTest);
      const leak = QA_KEYS.filter(k => k in before || k in after); if (leak.length || hook) throw new Error('QA hooks without ?qa=1: ' + leak + (hook ? ' _wpTest' : ''));
      await shot('kid-mode-launch'); return `launched "${lbl}" ${page.url().split('/play/')[1]} stageDataAttrs(noQaFlag)=${JSON.stringify(Object.keys(after))} qaHooksAbsent=true`; });
    // 3) full rounds
    for (const [li, ls] of (PLAN[vpn] || []).entries()) {
      await step('round-' + ls, async (sample) => { await page.goto(BASE + `play/wicks-path/?lesson=${ls}&qa=1`, { waitUntil: 'networkidle' }); await page.evaluate(() => { window.__voiceMisses && (window.__voiceMisses.length = 0); });
        let puzzles = 0, helpOk = '', missOk = '', watchOk = '', shortOk = ''; const helpRun = li === 0 || HELP_ALL;
        for (let guard = 0; guard < 14; guard++) { await idle(); if (await page.isVisible('#res.on')) break; const d = await ds(), sol = d.sol, n0 = await dots(); await sample(); if (puzzles === 0) await shot(`${ls}-start`);
          if (ls === 'lg-l3') { const bug = +d.bug, toks = sol.split(','), right = toks[bug];
            if (helpRun && puzzles === 0) { // watch run (free), then a wrong fix three times: hint -> traced arrow -> model
              await go(); const hints0 = await page.$$eval('.ptile.hint,.ghost', a => a.length); await shot('debug-watch-run'); watchOk = `watchRunNoHelp=${hints0 === 0}`; if (hints0) throw new Error('help shown after the free watch run');
              const cur = (await ds()).prog.split(','); const wrong = ['U', 'R', 'D', 'L'].find(x => x !== right && x !== cur[bug] && x !== OPP[right]) || OPP[right];
              await tap(`#wpProg .ptile[data-i="${bug}"]`); await shot('debug-picked'); await tap(`#wpTray .atile[data-d="${wrong}"]`);
              await go(); const h1 = await page.$$eval('.ptile.hint,.slot.hint,.ptile.extra', a => a.length); await shot('help1-step-glows');
              await go(); const g2 = await page.$$eval('.ghost', a => a.length), a2 = await page.$$eval('.atile.hint', a => a.length); await shot('help2-traced-arrow');
              await go(); const p3 = (await ds()).prog, m3 = await page.$$eval('.wp-go.hint', a => a.length); await shot('help3-model');
              if (!h1 || !g2 || !a2 || p3 !== sol || !m3) throw new Error(`help path: step=${h1} ghost=${g2} trayHint=${a2} model=${p3 === sol} goHint=${m3}`); helpOk = 'helpPath=ok';
              await tap('#wpGo'); }
            else if (puzzles === 1) { const wrong = ['U', 'R', 'D', 'L'].find(x => x !== right && x !== toks[bug]); await tap(`#wpProg .ptile[data-i="${bug}"]`); await tap(`#wpTray .atile[data-d="${wrong === OPP[right] ? wrong : OPP[right]}"]`);
              const tryProg = (await ds()).prog; await go(); missOk = `deliberateMiss(prog=${tryProg})`; if ((await ds()).sol === sol) { await tap(`#wpProg .ptile[data-i="${bug}"]`); await tap(`#wpTray .atile[data-d="${right}"]`); await tap('#wpGo'); } }
            else { await tap(`#wpProg .ptile[data-i="${bug}"]`); await tap(`#wpTray .atile[data-d="${right}"]`); await sample(); await tap('#wpGo'); } }
          else if (helpRun && puzzles === 0) { const w = await wrongArrow(sol); await tap(`#wpTray .atile[data-d="${w}"]`);
            await go(); const h1 = await page.$$eval('.ptile.hint,.slot.hint,.ptile.extra', a => a.length); await shot('help1-step-glows');
            await go(); const g2 = await page.$$eval('.ghost', a => a.length), a2 = await page.$$eval('.atile.hint', a => a.length); await shot('help2-traced-arrow');
            await go(); const p3 = (await ds()).prog, m3 = await page.$$eval('.wp-go.hint', a => a.length); await shot('help3-model');
            if (!h1 || !g2 || !a2 || p3 !== sol || !m3) throw new Error(`help path: step=${h1} ghost=${g2} trayHint=${a2} model=${p3 === sol} goHint=${m3}`); helpOk = 'helpPath=ok'; await tap('#wpGo'); }
          else if (puzzles === 1) { const w = await wrongArrow(sol); await tap(`#wpTray .atile[data-d="${w}"]`); await go(); missOk = 'deliberateMiss'; await shot(`${ls}-miss`);
            if ((await ds()).sol === sol && !(await page.isVisible('#res.on'))) { await clear(); await build(sol); await tap('#wpGo'); } }
          else { await build(sol); await sample(); if (puzzles === 2) await shot(`${ls}-built`); await tap('#wpGo'); await sleep(900); if (puzzles === 2) await shot(`${ls}-running`); }
          await waitFor(async () => (await page.isVisible('#res.on')) || (await dots()) > n0, 40000, 'solved');
          if (ls === 'lg-l4' && await page.$('#wpProg.short')) shortOk = 'shortProgramCheer'; puzzles++; if (puzzles === 3) await shot(`${ls}-solved`); }
        await waitFor(() => page.isVisible('#res.on'), 30000, 'results'); await sleep(1500); await sample(); await shot(`${ls}-results`);
        const card = await page.$eval('#res .paper p', e => e.textContent), rec = await page.evaluate((ls) => (JSON.parse(localStorage.getItem('elearnea:v1')).lessons || {})[ls], ls);
        if (!rec || !rec.stars) throw new Error('no stars saved'); const sk = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('elearnea:v1')).srs).filter(k => /^lg\./.test(k)).length);
        const pv = await PROBE.check(page, PRAISE); if (!pv.ok) throw new Error('voice: ' + pv.note);
        return `voice: ${pv.note} | puzzles=${puzzles} "${card}" saved=${JSON.stringify(rec)} srsItems=${sk} ${helpOk} ${watchOk} ${missOk} ${shortOk}`; }); }
    // 4) grown-ups: CSTA standards labels (sample learner) and this device's Logic & Coding records
    if (vpn === VPS[VPS.length - 1]) await step('grown-ups-standards', async (sample) => { await page.goto(BASE + 'grown-ups/', { waitUntil: 'networkidle' }); await sleep(600);
      const q = await page.$eval('#q', q => q.textContent); const [x, y] = q.match(/\d+/g).map(Number); await tap(page.locator(`#opts .btn:text-is("${x * y}")`).first().elementHandle ? await page.locator(`#opts .btn:text-is("${x * y}")`).first().elementHandle() : null); await sleep(1200);
      const txt = await page.$eval('#stds', e => e.textContent); const need = ['CSTA 1A-AP-08', 'CSTA 1A-AP-10', 'CSTA 1A-AP-11', 'CSTA 1A-AP-14', 'Programs with sequences and simple loops', 'Debug: find and fix errors in a program']; const miss = need.filter(n => !txt.includes(n)); await shot('grown-ups-standards');
      if (miss.length) throw new Error('standards labels missing: ' + miss); return 'cstaLabels=ok'; });
    await ctx.close(); }
  await browser.close(); fs.writeFileSync(path.join(OUT, `qa-results-${VPS.join('-')}.json`), JSON.stringify(results, null, 1));
  console.log(`SUMMARY ${results.filter(r => r.ok).length}/${results.length} pass`); process.exit(results.every(r => r.ok) ? 0 : 1); })();
