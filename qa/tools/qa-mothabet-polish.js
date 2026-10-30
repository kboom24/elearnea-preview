// Mothabet polish QA (branch mothabet/polish): integration checks + one sound/one pause, sound button mutes the game, attempted-only scoring.
// Base: Mothabet integration QA (branch mothabet/integration): lesson deep links, El.Learn records, Elearnea results + Path, dashboard, consent key, QA gate.
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

    const goTap = async () => { const fe = await page.$('iframe'); const box = await fe.boundingBox(); const b = await frame().evaluate(() => window.__qa.button('bGo'));
      const p = await frame().evaluate(({ b }) => window.__qa.toScreen(b.x + b.w / 2, b.y + b.h / 2), { b }); await tapXY(box.x + p.x, box.y + p.y);
      await waitFor(async () => (await frame().evaluate(() => window.__qa.scene())) === 'play', 5000, 'play scene'); await waitFor(() => frame().evaluate(() => window.__qa.state().phase === 'word'), 8000, 'first word'); };
    const openLesson = async (ls) => { await page.goto(BASE + `play/mothabet/?lesson=${ls}&qa=1`, { waitUntil: 'networkidle' });
      await waitFor(async () => (await frame().evaluate(() => window.__qa && window.__qa.scene())) === 'goal', 8000, 'lesson card'); await waitFor(() => frame().evaluate(() => window.__qa.plan()), 4000, 'plan'); };
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
      const st0 = await frame().evaluate(() => window.__qa.state()); const keys0 = 'scene,base,phase,idx,word,tiles,filled,need,score,combo,time,moths,voice';
      if (st0.phase !== 'idle' || Object.keys(st0).join() !== keys0 || st0.moths.length || st0.idx !== -1) throw new Error('state() before play ' + JSON.stringify(st0));
      const m0 = await frame().evaluate(() => window.__qa.muted()); await page.locator('iframe').focus().catch(() => {}); await frame().evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyM', key: 'm', bubbles: true }))); await sleep(200);
      const m1 = await frame().evaluate(() => window.__qa.muted()); if (m0 !== m1 || m0) throw new Error('engine KeyM changed mute or started muted ' + m0 + '->' + m1);
      return `stage=s1 words=${plan.words.join(',')} d=${plan.d} (El.Learn) local=${plan.local} KeyM=no-op muted=${m1} stateBeforePlay=${JSON.stringify(st0)}`; });
    await step('rd-l1-play', async () => { const fe = await page.$('iframe'); const box = await fe.boundingBox(); const b = await frame().evaluate(() => window.__qa.button('bGo'));
      const p = await frame().evaluate(({ b }) => window.__qa.toScreen(b.x + b.w / 2, b.y + b.h / 2), { b }); await tapXY(box.x + p.x, box.y + p.y);
      await waitFor(async () => (await frame().evaluate(() => window.__qa.scene())) === 'play', 5000, 'play scene'); await waitFor(() => frame().evaluate(() => window.__qa.state().phase === 'word'), 8000, 'first word');
      await sleep(900); await shot('rd-l1-play');
      { const fe = await page.$('iframe'); const fb = await fe.boundingBox(); const hud = await frame().evaluate(() => window.__qa.hud()), sc = await frame().evaluate(() => window.__qa.scale()), z = await frame().evaluate(() => window.__qa.zone());
        const parentSound = await page.locator('button[aria-label^="Sound"]:visible').count(), parentPause = await page.locator('[aria-label*="ause" i]:visible').count();
        const pauses = hud.filter(b => b.icon === 'pause'), sounds = hud.filter(b => b.style === 'sound');
        if (parentSound !== 1 || sounds.length || pauses.length !== 1 || parentPause) throw new Error('controls ' + JSON.stringify({ parentSound, frameSound: sounds.length, framePause: pauses.length, parentPause }));
        const vw = await frame().evaluate(() => window.__qa.view()), p = pauses[0], css = { x: fb.x + vw.ox + p.x * sc, y: fb.y + vw.oy + p.y * sc, w: p.w * sc, h: p.h * sc }, VW = VP[vpn].width;
        if (Math.round(fb.width) !== VW || vw.iw !== VW) throw new Error('frame width ' + fb.width + ' iw=' + vw.iw + ' viewport=' + VW);
        if (css.x < 0 || css.x + css.w > VW + 0.5) throw new Error('pause off-screen ' + JSON.stringify(css));
        const bars = await page.evaluate(() => ['#back', '#snd'].map(q => { const r = document.querySelector(q).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
        const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; const zc = { x: z.x, y: z.y, w: z.w, h: z.h };
        if (css.w < 63.5 || css.h < 63.5) throw new Error('pause too small ' + JSON.stringify(css)); if (bars.some(b => hit(css, b))) throw new Error('pause overlaps top bar'); if (hit(p, zc)) throw new Error('pause in exit zone');
        global.__controls = `parentSound=1 frameSound=0 pause=1 (${Math.round(css.w)}x${Math.round(css.h)} CSS px at y=${Math.round(css.y)}, frameTop=${Math.round(fb.y)}, bar bottom=${Math.round(Math.max(...bars.map(b => b.y + b.h)))}) exitZoneClear onScreen(right=${Math.round(css.x + css.w)}<=${VW})`; }
      { const g = () => frame().evaluate(() => ({ ctx: HX.Audio.ctx ? HX.Audio.ctx.state : 'none', gain: HX.Audio.master ? +HX.Audio.master.gain.value.toFixed(3) : null, muted: HX.Audio.muted, voice: MB.Voice.enabled }));
        const a0 = await g(); await tap(page.locator('#snd')); await sleep(500); const a1 = await g(); await tap(page.locator('#snd')); await sleep(500); const a2 = await g();
        if (a0.gain == null || a0.muted || !a1.muted || a1.gain > 0.01 || a1.voice || a2.muted || a2.gain < 0.5) throw new Error('in-play mute ' + JSON.stringify({ a0, a1, a2 }));
        global.__controls += ` inPlayMute: gain ${a0.gain}->${a1.gain}->${a2.gain} (ctx ${a0.ctx})`; }
      let n = 0, wrongDone = false;
      while (n++ < 30) { const sc = await frame().evaluate(() => window.__qa.scene()); if (sc !== 'play') break; const st = await frame().evaluate(() => window.__qa.state());
        if (st.phase === 'word') { if (st.idx === 1 && !wrongDone) { wrongDone = true; await frame().evaluate(() => window.__qa.place(false)); await sleep(300); } await frame().evaluate(() => window.__qa.solveWord()); if (n === 4) { await sleep(500); await shot('rd-l1-play-mid'); } }
        await sleep(1500); }
      const sc = await frame().evaluate(() => window.__qa.scene()); if (sc !== 'lesson') throw new Error('round did not end, scene=' + sc); return 'rounds loop=' + n + ' wrongOnWord2=' + wrongDone + ' ' + global.__controls; });
    await step('rd-l1-results', async () => { await page.waitForSelector('#toPath', { state: 'visible', timeout: 6000 }); await sleep(900); await shot('rd-l1-results');
      const txt = await page.locator('.paper').innerText(); const d = JSON.parse((await store())['elearnea:v1'] || '{}');
      const keys = Object.keys(d.srs || {}).filter(k => k.startsWith('rd.letter-sounds|')); const ls = (d.lessons || {})['rd-l1'];
      const firstMiss = keys.filter(k => d.srs[k][3] > 0).length; const prog = await page.evaluate(() => { const el = document.querySelector('.dots, #dots, .progress'); return el ? el.innerHTML.length : -1; });
      if (keys.length !== 10 || !ls || !ls.stars || firstMiss !== 1 || !/9 of 10/.test(txt)) throw new Error('El.Learn ' + JSON.stringify({ keys: keys.length, ls, firstMiss }));
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

    await step('sound-button-mutes-game', async () => { await openLesson('rd-l1'); const q = (f) => frame().evaluate(f);
      if (await q(() => window.__qa.muted())) throw new Error('starts muted'); await tap(page.locator('#snd')); await sleep(400);
      const off = { muted: await q(() => window.__qa.muted()), voice: await q(() => window.__qa.voiceOn()), said: await q(() => window.__qa.MB.Voice.say('Go!')) , gain: await q(() => HX.Audio.master ? HX.Audio.master.gain.value : 'noctx') };
      if (!off.muted || off.voice || off.said) throw new Error('mute did not reach game ' + JSON.stringify(off)); await shot('sound-off');
      await page.reload({ waitUntil: 'networkidle' }); await waitFor(async () => (await q(() => window.__qa && window.__qa.scene())) === 'goal', 8000, 'card after reload');
      const boot = await q(() => window.__qa.muted()); if (!boot) throw new Error('reload: game not muted at boot');
      await tap(page.locator('#snd')); await sleep(400); const on = { muted: await q(() => window.__qa.muted()), voice: await q(() => window.__qa.voiceOn()) }; if (on.muted || !on.voice) throw new Error('unmute ' + JSON.stringify(on));
      return `off=${JSON.stringify(off)} mutedAtBootAfterReload=${boot} on=${JSON.stringify(on)}`; });
    await step('unreached-words-unrecorded', async () => { await openLesson('rd-l3'); await goTap(); const q = (f) => frame().evaluate(f);
      for (let k = 0; k < 3; k++) { await waitFor(() => q(() => window.__qa.state().phase === 'word'), 6000, 'word ' + k); await q(() => window.__qa.solveWord()); await sleep(300); }
      await waitFor(() => q(() => window.__qa.state().phase === 'word' && window.__qa.state().idx === 3), 6000, 'word 4'); await q(() => window.__qa.place(true)); await waitFor(() => q(() => window.__qa.state().filled > 0), 4000, 'first tile placed');
      const live = await q(() => window.__qa.state().word); await q(() => window.__qa.endNow()); await page.waitForSelector('#toPath', { state: 'visible', timeout: 6000 }); await sleep(800); await shot('unreached-results');
      const txt = (await page.locator('.paper').innerText()).replace(/\s+/g, ' ').trim(); const d = JSON.parse((await store())['elearnea:v1']); const keys = Object.keys(d.srs).filter(k => k.startsWith('rd.blending-cvc|')); const ls = d.lessons['rd-l3'];
      const plan = await q(() => window.__qa.plan()); const unreached = plan.words.slice(4).filter(w => keys.includes('rd.blending-cvc|' + w));
      const liveRec = d.srs['rd.blending-cvc|' + live]; const want = 2; // starsFor(3/4 = 75%, 4, 4) = 2
      if (keys.length !== 4 || unreached.length || !liveRec || liveRec[3] !== 1 || !/3 of 4/.test(txt) || !ls || ls.stars !== want) throw new Error(JSON.stringify({ keys, unreached, liveRec, txt, ls }));
      return `planned=10 recorded=${keys.length} (3 finished + '${live}' as a miss) unreachedRecorded=0 card="${txt}" stars=${ls.stars} (from attempted 3/4)`; });
    await step('zero-attempted', async () => { const before = JSON.parse((await store())['elearnea:v1']); await openLesson('rd-l5'); await goTap(); await frame().evaluate(() => window.__qa.endNow());
      await page.waitForSelector('#toPath', { state: 'visible', timeout: 6000 }); await sleep(800); await shot('zero-attempted-results');
      const txt = (await page.locator('.paper').innerText()).replace(/\s+/g, ' ').trim(); const on = await page.locator('.paper .stars3 .on').count(); const d = JSON.parse((await store())['elearnea:v1']);
      const keys = Object.keys(d.srs).filter(k => k.startsWith('rd.digraphs|'));
      if (keys.length || d.lessons['rd-l5'] || d.log.length !== before.log.length || on || !/Tap Again/.test(txt)) throw new Error(JSON.stringify({ keys, l: d.lessons['rd-l5'], log: [before.log.length, d.log.length], on, txt }));
      await tap(page.locator('#again')); await waitFor(async () => (await frame().evaluate(() => window.__qa && window.__qa.scene())) === 'goal', 8000, 'again -> card');
      return `card="${txt}" starsOn=0 srs=0 lessonRecord=none logUnchanged=${d.log.length} again->lessonCard`; });
    for (const [ls, band, si] of [['rd-l3', 's', 5], ['rd-l5', 's', 7], ['rd-l7', 'f', 0]]) await step(ls + '-no-qa-hook', async () => { await page.goto(BASE + `play/mothabet/?lesson=${ls}`, { waitUntil: 'networkidle' });
      const p = await waitFor(() => frame().evaluate(() => window.ElearneaBridge.plan && { words: window.ElearneaBridge.plan.items.map(i => i.w), stage: window.ElearneaBridge.plan.items.map(i => i.stage), local: !!window.ElearneaBridge.plan.local }), 8000, 'plan');
      await sleep(800); if (ls !== 'rd-l5') await shot(ls + '-lesson-card'); const qa = await frame().evaluate(() => typeof window.__qa); const want = await frame().evaluate(({ band, si }) => MB.STAGES[band][si].id, { band, si });
      if (qa !== 'undefined' || p.local || p.stage.some(s => s !== want)) throw new Error(JSON.stringify({ qa, p, want })); return `__qa=${qa} stage=${want} words=${p.words.join(',')}`; });
    await ctx.close();
  }
  await browser.close(); fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 2));
  console.log('SUMMARY', results.filter(r => r.ok).length + '/' + results.length + ' pass');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
