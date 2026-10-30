// Elearnea in-game QA: plays full rounds of Lily Pad Hop (rd-l2), Firefly Count (ma-l1 count, ma-l3 add) and Clocktower Gears
// (ma-l5 pattern, ma-l6 name, ma-l7 sort) through to the results card. Real taps on the game's own buttons; the answer is read from the
// DOM the child sees (Lily Pad: the word sign; Firefly: the fireflies / the "a and b more" prompt), and from Clocktower's ?qa=1
// data-want hook. Per lesson: no horizontal overflow, every interactive target >= 64 CSS px and inside the viewport, 0 console errors,
// 0 outside requests. Little Lanterns (ages 0-4: Lantern Barn, Picture Garden, Glow Jars, every lesson ll-*) are played the same way, using
// the kit's data-ok marker on the right card, with the age band set as a parent would; their targets must be >= 96 CSS px.
// One page at a time. Usage: node qa-ingame.js <baseUrl> <outDir> [viewports=phone,ipad,desktop] [lessons=all]
const { VP, launch } = require('./lib'); const PROBE = require('./praise-probe'); // praise/feedback lines must play to their end before the next item
const fs = require('fs'), path = require('path');
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3]; const VPS = (process.argv[4] || 'phone,ipad,desktop').split(',');
const LL = { 'll-r0': 'lantern-barn', 'll-r00': 'picture-garden', 'll-r1': 'lantern-barn', 'll-r2': 'picture-garden', 'll-r3': 'lantern-barn', 'll-r4': 'picture-garden', 'll-r5': 'picture-garden',
  'll-r6': 'lantern-barn', 'll-r7': 'picture-garden', 'll-m0': 'glow-jars', 'll-m1': 'glow-jars', 'll-m2': 'picture-garden', 'll-m3': 'glow-jars', 'll-m4': 'glow-jars' };
const TINY = ['ll-r0', 'll-r00', 'll-m0']; // under-2 play-together lessons (band 'tiny')
const MBR = { 'rd-b1': 'moth-bridge', 'rd-b2': 'moth-bridge', 'rd-b3': 'moth-bridge', 'rd-b4': 'moth-bridge' }; // Moth Bridge (reading, ages 5-7): blend onset-rime, CVC short a, mixed vowels, segmenting
const ALL = ['rd-l2', ...Object.keys(MBR), 'ma-l1', 'ma-l3', 'ma-l5', 'ma-l6', 'ma-l7', ...Object.keys(LL)]; const PICK = { early: ALL.filter(l => l in LL), k3: ALL.filter(l => !(l in LL)) }; const LESSONS = !process.argv[5] || process.argv[5] === 'all' ? ALL : PICK[process.argv[5]] || process.argv[5].split(',');
const GAME = { 'rd-l2': 'lily-pad', ...MBR, 'ma-l1': 'firefly-count', 'ma-l3': 'firefly-count', 'ma-l5': 'clocktower-gears', 'ma-l6': 'clocktower-gears', 'ma-l7': 'clocktower-gears', ...LL };
const MIN = (ls) => ls in LL ? 96 : 64; const origin = new URL(BASE).origin; const results = []; fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms)); const PRAISE = PROBE.praiseSet(path.join(__dirname, '../../voice/manifest.json'));
function audit(MIN) { // in page: overflow + interactive targets (game stage + top bar)
  const W = document.documentElement.clientWidth, H = innerHeight, de = document.documentElement;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || s.pointerEvents === 'none') return false; } return true; };
  const nm = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].join('.')) + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : e.textContent.trim() ? `"${e.textContent.trim().slice(0, 12)}"` : '');
  const t = [...document.querySelectorAll('.topbar a, .topbar button, #stage button, #stage a[href], #stage [role=button], #res.on button, #res.on a[href]')].filter(vis);
  const small = [], outside = [];
  for (const e of t) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < MIN - .5) small.push(`${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)}`); if (r.left < -.5 || r.right > W + .5 || r.top < -.5 || r.bottom > H + .5) outside.push(`${nm(e)} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`); }
  // Firefly Count: each drifting firefly's whole reach (size + drift amplitude, scaled like the game) must stay inside the field
  const ffOut = []; const field = document.getElementById('ffField');
  if (field) { const fr = field.getBoundingClientRect(); for (const f of field.querySelectorAll('.fly.drift')) { const r = f.getBoundingClientRect(), sc = r.width / 84, cs = getComputedStyle(f);
    const dx = Math.abs(parseFloat(cs.getPropertyValue('--dx')) || 0), dy = Math.abs(parseFloat(cs.getPropertyValue('--dy')) || 0);
    const cx = f.offsetLeft + f.offsetWidth / 2, cy = f.offsetTop + f.offsetHeight / 2, hx = sc * (42 + dx), hy = sc * (42 + dy);
    if (cx - hx < -.5 || cy - hy < -.5 || cx + hx > field.clientWidth + .5 || cy + hy > field.clientHeight + .5 || fr.left < -.5 || fr.right > W + .5) ffOut.push(`fly@${Math.round(cx)},${Math.round(cy)} reach ${Math.round(hx)}x${Math.round(hy)} field ${field.clientWidth}x${field.clientHeight}`); } }
  // exit-tab zone (top-centre 60x48 CSS px below the safe-area top): no button may sit there; Moth Bridge picture cards must have art
  const zone = { l: W / 2 - 30, r: W / 2 + 30, t: 0, b: 48 }; for (const e of t) { const r = e.getBoundingClientRect(); if (r.left < zone.r && r.right > zone.l && r.top < zone.b && r.bottom > zone.t && e.closest('#stage')) outside.push('EXIT-ZONE ' + nm(e)); }
  for (const c of document.querySelectorAll('#stage .mbr-card')) if (!c.querySelector('svg.pic') || c.querySelector('svg.pic').childElementCount < 2) outside.push('NO-PICTURE ' + c.dataset.w);
  return { W, sw: de.scrollWidth, bsw: document.body.scrollWidth, n: t.length, small, outside, ffOut, flies: field ? field.querySelectorAll('.fly.drift').length : 0 };
}
(async () => {
  const browser = await launch();
  for (const vpn of VPS) {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: VP[vpn].width, height: VP[vpn].height } }, VP[vpn], { serviceWorkers: 'block' }));
    await ctx.addInitScript(PROBE.init); const page = await ctx.newPage(); let errs = [], ext = [], fails = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('pageerror', e => errs.push('pageerror: ' + e.message));
    page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
    // a voice clip load cancelled because a newer line replaced it (net::ERR_ABORTED on voice/*) is normal speech behaviour, not a failure
    let aborted = 0, abortedAt = [], lessonT0 = Date.now(); page.on('requestfailed', r => { const e = r.failure() && r.failure().errorText; if (/ERR_ABORTED/.test(e || '') && /\/voice\/(clips|mb)\//.test(r.url())) { aborted++; abortedAt.push(r.url().split('/voice/')[1] + '@' + ((Date.now() - lessonT0) / 1000).toFixed(1) + 's'); return; } fails.push(r.url() + ' ' + e); });
    page.on('response', r => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()); });
    const tapEl = async (h) => { const b = await h.boundingBox(); if (!b) throw new Error('no box'); const x = b.x + b.width / 2, y = b.y + b.height / 2; if (VP[vpn].hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
    const shot = async (n) => page.screenshot({ path: path.join(OUT, `${n}-${vpn}.png`) });
    const waitFor = async (fn, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch (e) {} await sleep(120); } throw new Error('timeout: ' + what); };
    const resultsOn = () => page.isVisible('#res.on');
    // kid mode (no ?qa=1): the Little Lanterns kit must not mark the right card
    for (const ls of LESSONS.filter(l => ['ll-r1', 'll-r2', 'll-m1'].includes(l))) { errs = []; ext = []; fails = []; let note = '', ok = true;
      try { await page.goto(BASE, { waitUntil: 'networkidle' }); await page.evaluate(() => { localStorage.clear(); localStorage.setItem('elearnea:v1', JSON.stringify({ set: { voice: true, sound: true, rate: 1, band: 'little', little: 'little' } })); });
        await page.goto(BASE + `play/${GAME[ls]}/?lesson=${ls}`, { waitUntil: 'networkidle' }); await page.waitForSelector('#llOpts .ll-card', { timeout: 15000 }); await sleep(600);
        const marked = await page.$$eval('[data-ok]', a => a.length); if (marked) { ok = false; } note = `kidMode cards=${await page.$$eval('#llOpts .ll-card', a => a.length)} dataOk=${marked}`; } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0]; }
      const r = { vp: vpn, page: ls + ' kid-mode (no ?qa=1)', ok: ok && !errs.length && !ext.length && !fails.length, consoleErrors: errs.slice(), external: ext.slice(), failed: fails.slice(), note }; results.push(r);
      console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${r.page} errors=${errs.length} ext=${ext.length} failed=${fails.length} ${note}`); }
    for (const ls of LESSONS.filter(l => l === 'rd-b1' || l === 'rd-b4')) { errs = []; ext = []; fails = []; let note = '', ok = true;
      try { await page.goto(BASE, { waitUntil: 'networkidle' }); await page.evaluate(() => localStorage.clear());
        await page.goto(BASE + `play/moth-bridge/?lesson=${ls}`, { waitUntil: 'networkidle' }); await page.waitForSelector('#stage .moth', { timeout: 15000 }); await sleep(1500);
        const marks = await page.$eval('#stage', s => Object.keys(s.dataset).join(',')); if (marks) ok = false; note = `kidMode moths=${await page.$$eval('#stage .moth', a => a.length)} stageData="${marks}"`; } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0]; }
      const r = { vp: vpn, page: ls + ' kid-mode (no ?qa=1)', ok: ok && !errs.length && !ext.length && !fails.length, consoleErrors: errs.slice(), external: ext.slice(), failed: fails.slice(), note }; results.push(r);
      console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${r.page} errors=${errs.length} ext=${ext.length} failed=${fails.length} ${note}`); }
    for (const ls of LESSONS) {
      errs = []; ext = []; fails = []; aborted = 0; abortedAt = []; lessonT0 = Date.now(); let note = '', ok = true; const aud = { small: new Set(), outside: new Set(), overflow: [], n: 0, samples: 0 };
      const sample = async () => { const a = await page.evaluate(audit, MIN(ls)); aud.samples++; aud.n = Math.max(aud.n, a.n); a.small.forEach(x => aud.small.add(x)); a.outside.forEach(x => aud.outside.add(x)); aud.flies = (aud.flies || 0) + (a.flies || 0); (a.ffOut || []).forEach(x => aud.outside.add('FIREFLY-BOUNDS ' + x)); if (a.outside.length && !aud.outShot) { aud.outShot = `${ls}-outside-${vpn}.png`; await shot(`${ls}-outside`); } if (a.sw > a.W || a.bsw > a.W) aud.overflow.push(`${a.sw}/${a.bsw}>${a.W}`); };
      const t0 = Date.now(); let rounds = 0;
      try {
        await page.goto(BASE, { waitUntil: 'networkidle' }); // same origin (the landing page, so no favicon 404): fresh storage, then the age band a parent would pick for this lesson
        await page.evaluate((band) => { localStorage.clear(); if (band) localStorage.setItem('elearnea:v1', JSON.stringify({ set: { voice: true, sound: true, rate: 1, band: 'little', little: band } })); }, ls in LL ? (TINY.includes(ls) ? 'tiny' : 'little') : null);
        // Moth Bridge rd-b3/rd-b4 start at a learned-in difficulty (.6): 3 picture cards with one-sound look-alikes, an extra moth in the segmenting tray
        if (ls === 'rd-b3' || ls === 'rd-b4') await page.evaluate((sk) => { localStorage.setItem('elearnea:v1', JSON.stringify({ set: { voice: true, sound: true, rate: 1, band: 'explorer', little: 'little' }, skills: { [sk]: { d: .6, recent: [], rounds: 0 } } })); }, ls === 'rd-b3' ? 'rd.blend-vowels' : 'rd.segment-sounds');
        await page.goto(BASE + `play/${GAME[ls]}/?lesson=${ls}` + (GAME[ls] === 'clocktower-gears' || GAME[ls] === 'moth-bridge' || ls in LL ? '&qa=1' : ''), { waitUntil: 'networkidle' }); await sleep(900);
        while (!(await resultsOn()) && Date.now() - t0 < 200000) {
          if (ls in LL) { // Little Lanterns kit: one huge card (tiny), a drum to clap on, or picture cards with data-ok on the right one
            const st = await waitFor(() => page.evaluate(() => { if (document.querySelector('#res.on')) return 'end'; const d = document.querySelector('#llOpts .lb-drum');
              if (d) return d.dataset.turn === '1' ? 'drum' : null; const h = document.querySelector('#llOpts .ll-card.huge'); if (h) return h.classList.contains('open') ? null : 'huge';
              const ok = document.querySelector('#llOpts .ll-card[data-ok="1"]:not(.done)'); return ok ? 'cards' : null; }), 30000, 'LL turn');
            if (st === 'end') break; await sleep(200); await sample(); if (!rounds) await shot(`${ls}-play`);
            if (st === 'huge') { await tapEl(await page.$('#llOpts .ll-card.huge')); rounds++; if (rounds === 2) { await sleep(500); await shot(`${ls}-tap`); } await sleep(700); }
            else if (st === 'drum') { const d = await page.$('#llOpts .lb-drum'), n = +(await d.getAttribute('data-n')); for (let k = 0; k < n; k++) { await tapEl(d); await sleep(380); } rounds++;
              await waitFor(async () => await resultsOn() || await d.evaluate(e => !e.isConnected || e.dataset.turn !== '1'), 15000, 'drum judged'); }
            else { const ok = await page.$('#llOpts .ll-card[data-ok="1"]:not(.done)');
              // variety: what this round shows (loud/quiet pair + round type + quiet level; card labels; where the right card is)
              aud.rounds = aud.rounds || []; aud.rounds.push(await page.evaluate(() => { const o = document.getElementById('llOpts'), cards = [...o.querySelectorAll('.ll-card')];
                return { pair: o.dataset.pair || null, kind: o.dataset.kind || null, level: o.dataset.level || null, sig: cards.map(c => c.getAttribute('aria-label') || c.innerHTML.length).join('|'), at: cards.findIndex(c => c.dataset.ok === '1'),
                  show: (document.getElementById('llShow') || {}).innerHTML ? document.getElementById('llShow').innerHTML.length : 0, pics: cards.map(c => !!c.querySelector('svg.pic') && !c.innerHTML.includes('d="M60.0 12.0L')) }; }));
              if (rounds === 1) { const wr = await page.$('#llOpts .ll-card:not([data-ok])'); if (wr) { await tapEl(wr); aud.missed = 1; await sleep(700); await sample(); await shot(`${ls}-miss`); await sleep(1500); } }
              await tapEl(ok); rounds++; if (rounds === 1) { await sleep(400); await shot(`${ls}-yes`); }
              await waitFor(async () => await resultsOn() || await ok.evaluate(e => !e.isConnected), 30000, 'next card set'); }
            if (rounds > 40) throw new Error('too many rounds'); continue;
          }
          if (GAME[ls] === 'moth-bridge') { // ?qa=1: #stage data-want = tap:<i> | slide | pick:<word> | seg:<letter>, data-miss = a wrong choice, data-busy
            const st = await waitFor(async () => await resultsOn() ? { end: 1 } : page.$eval('#stage', s => s.dataset.want && s.dataset.busy !== '1' ? { want: s.dataset.want, miss: s.dataset.miss, word: s.dataset.word } : null), 30000, 'moth bridge idle'); if (st.end) break;
            const [kind, arg] = st.want.split(':'); if (!aud.words) { aud.words = []; aud.steps = {}; } if (aud.words[aud.words.length - 1] !== st.word) aud.words.push(st.word); rounds = aud.words.length;
            if (kind === 'pick' || kind === 'seg') await waitFor(() => page.evaluate(() => ![...document.querySelectorAll('#mbCards > button')].some(c => c.getAnimations().some(x => x.animationName === 'popin' && x.playState === 'running'))), 3000, 'cards settled'); // measure targets after their pop-in
            aud.steps[kind] = (aud.steps[kind] || 0) + 1; aud.maxOpts = Math.max(aud.maxOpts || 0, await page.$$eval('#mbCards > button', a => a.length)); await sleep(150); if (aud.steps[kind] === 1 || kind === 'pick') await sample(); if (aud.steps[kind] === 1) await shot(`${ls}-${kind}`);
            const before = st.want + '|' + st.word;
            if (kind === 'tap') await tapEl(await page.$(`#mbPlanks .plank:nth-child(${+arg + 1}) .moth`));
            else if (kind === 'slide') { const lan = await page.$('#mbLantern'), tr = await (await page.$('#mbSlide')).boundingBox(), b = await lan.boundingBox();
              if (rounds % 2) { const y = b.y + b.height / 2; await page.mouse.move(b.x + b.width / 2, y); await page.mouse.down(); for (let k = 1; k <= 16; k++) { await page.mouse.move(b.x + b.width / 2 + (tr.width - b.width) * k / 16 + 4, y); await sleep(60); } await page.mouse.up(); aud.drags = (aud.drags || 0) + 1; }
              else { await tapEl(lan); aud.autoSlides = (aud.autoSlides || 0) + 1; } }
            else if (kind === 'pick' || kind === 'seg') { const sel = (v) => kind === 'pick' ? `#mbCards .mbr-card[data-w="${v}"]` : `#mbCards .moth[data-l="${v}"]:not(.placed)`;
              if (rounds === 2 && !aud.missed && st.miss) { await tapEl(await page.$(sel(st.miss))); aud.missed = 1; await sleep(700); await sample(); await shot(`${ls}-miss`);
                await waitFor(() => page.$eval('#stage', s => s.dataset.busy !== '1'), 30000, 'idle after miss'); continue; }
              await tapEl(await page.$(sel(arg))); }
            await waitFor(async () => await resultsOn() || await page.$eval('#stage', (s, b) => (s.dataset.want || '') + '|' + (s.dataset.word || '') !== b || s.dataset.busy === '1', before), 12000, 'step accepted');
            if (aud.words.length > 12) throw new Error('too many rounds'); continue;
          }
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
        if (GAME[ls] === 'firefly-count' && ls === 'ma-l1') { // bounds stress: 40 fresh count rounds at the top level (up to 10 fireflies), same stage and CSS
          const st = await page.evaluate(async () => { const stage = document.getElementById('stage'), mod = El.games['firefly-count'], sleep = (ms) => new Promise(r => setTimeout(r, ms)); document.getElementById('res').classList.remove('on');
            const host = { root: stage, say: () => true, sayThen: (t, o, then) => { setTimeout(() => then && then('ended'), 10); return { heard: false }; }, sfx: El.sfx, learn: El.Learn, rng: El.rng(), voiceOk: () => false, emit() {}, end() {} }; let flies = 0, bad = [];
            for (let t = 0; t < 40; t++) { const inst = mod.start({ mode: 'count', rounds: 1, levels: [10], skill: 'qa.ff-stress' }, host); await sleep(380);
              const field = document.getElementById('ffField'); for (const f of field.querySelectorAll('.fly.drift')) { flies++; const r = f.getBoundingClientRect(), sc = r.width / 84, cs = getComputedStyle(f);
                const dx = Math.abs(parseFloat(cs.getPropertyValue('--dx')) || 0), dy = Math.abs(parseFloat(cs.getPropertyValue('--dy')) || 0), cx = f.offsetLeft + f.offsetWidth / 2, cy = f.offsetTop + f.offsetHeight / 2;
                if (cx - sc * (42 + dx) < -.5 || cy - sc * (42 + dy) < -.5 || cx + sc * (42 + dx) > field.clientWidth + .5 || cy + sc * (42 + dy) > field.clientHeight + .5) bad.push(`${Math.round(cx)},${Math.round(cy)} d${dx},${dy} in ${field.clientWidth}x${field.clientHeight}`); }
              inst.stop(); }
            const fr = document.getElementById('ffField').getBoundingClientRect(); return { flies, bad: bad.slice(0, 5), nBad: bad.length, fieldInViewport: fr.left >= -.5 && fr.right <= innerWidth + .5 && fr.top >= -.5 && fr.bottom <= innerHeight + .5 }; });
          await shot(`${ls}-bounds-stress`); aud.stress = st; if (st.nBad || !st.fieldInViewport) aud.outside.add('FIREFLY-STRESS ' + JSON.stringify(st)); }
        if (aud.overflow.length || aud.small.size || aud.outside.size) ok = false; const pv = await PROBE.check(page, PRAISE); if (!pv.ok) ok = false; aud.praise = pv.note;
        if (aud.rounds && aud.rounds.length >= 2) { const R = aud.rounds, same = R.slice(1).filter((r, k) => r.sig === R[k].sig && r.show === R[k].show).length; // the very same screen twice in a row
          let v = ` variety: rounds=${R.length} sameAsPrev=${same}`; if (same) aud.outside.add('REPEATED-ROUND x' + same);
          if (ls === 'll-r3') { const six = R.slice(0, 6), pairs = new Set(six.map(r => r.pair)), back2back = R.slice(1).filter((r, k) => r.pair === R[k].pair).length, kinds = [...new Set(R.map(r => r.kind))], lv = R.map(r => r.level), at = new Set(R.map(r => r.at));
            v += ` pairs=${six.map(r => r.pair).join(',')} distinct6=${pairs.size} backToBack=${back2back} kinds=${kinds.join('/')} levels=${lv.join(',')} rightAt=${[...at].join('/')} allPics=${R.every(r => r.pics.every(Boolean))}`;
            if (pairs.size < 5 || back2back || kinds.length < 2 || !R.every(r => r.pics.every(Boolean))) aud.outside.add('LOUDQUIET-VARIETY ' + v); }
          aud.variety = v; }
        note = (GAME[ls] === 'moth-bridge' ? `cards/tray=${aud.maxOpts || 0} words=${(aud.words || []).join(',')} steps=${JSON.stringify(aud.steps || {})} drags=${aud.drags || 0} autoSlides=${aud.autoSlides || 0} ` : '') + (GAME[ls] === 'firefly-count' ? `fliesChecked=${aud.flies}` + (aud.stress ? ` stress=${aud.stress.flies}flies/${aud.stress.nBad}out fieldInViewport=${aud.stress.fieldInViewport}` : '') + ' ' : '') + (aborted ? `abortedClipLoads=${aborted} [${abortedAt.join(' ')}] ` : '') + `rounds=${rounds} oneMiss=${aud.missed ? 'yes' : 'no'} card="${card}" stars=${stars} samples=${aud.samples} targets<=${aud.n} secs=${Math.round((Date.now() - t0) / 1000)}` + (aud.overflow.length ? ` OVERFLOW ${aud.overflow[0]}` : ' noOverflow') + (aud.small.size ? ` SMALL ${[...aud.small].join('; ')}` : ' allTargets>=' + MIN(ls)) + (aud.outside.size ? ` OUTSIDE ${[...aud.outside].join('; ')} shot=${aud.outShot}` : ' allInside');
        note += (aud.variety || '') + ' | voice: ' + aud.praise;
      } catch (e) { ok = false; note = 'EXC ' + e.message.split('\n')[0] + ` rounds=${rounds}`; await shot(`${ls}-error`).catch(() => {}); }
      await sleep(300); const r = { vp: vpn, page: ls + ' ' + GAME[ls], ok: ok && !errs.length && !ext.length && !fails.length, consoleErrors: errs.slice(), external: ext.slice(), failed: fails.slice(), note, small: [...aud.small], outside: [...aud.outside] };
      results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${r.page} errors=${errs.length} ext=${ext.length} failed=${fails.length} ${note}`); errs.forEach(e => console.log('   err:', e)); fails.forEach(e => console.log('   fail:', e));
    }
    await ctx.close();
  }
  await browser.close(); fs.writeFileSync(path.join(OUT, `qa-results-ingame-${VPS.join('-')}.json`), JSON.stringify(results, null, 2));
  console.log('SUMMARY', results.filter(r => r.ok).length + '/' + results.length + ' pass');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
