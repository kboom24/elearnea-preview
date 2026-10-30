// Sing-along QA (Zoo Parade, Word Stage). One page at a time.
//   node qa-songs.js <baseUrl> <outDir> fast [viewports=p375,t768,d1280] [lessons=ll-r8,zp-1,ws-1,zp-2,ws-2,zp-3,ws-3]
//     Plays every moment of the song by seeking the music to each moment (real taps on the cards/tiles; one deliberate miss on moment 2),
//     through the finale to the results card. Checks: 0 console errors, 0 outside requests, no 4xx, no horizontal overflow, every target
//     >= 64 px (>= 96 px Little Lanterns) and inside the viewport, no ?qa=1 marker without the flag, results card reached with stars.
//   node qa-songs.js <baseUrl> <outDir> sync [viewport=d1280] [lessons=zp-1,ws-1]
//     Plays each song in REAL TIME start to finish. Lyric sync: for every word highlight, drift = music clock (audio.currentTime) at the
//     moment the word lit up minus the word's lyric time; pass = |drift| p99 < 150 ms at the start, middle and end of the song.
//     Voice: no Bella clip may play while the music is playing, and her intro must finish ('ended') before the music starts.
const { launch } = require('./lib'); const fs = require('fs'), path = require('path');
const BASE = process.argv[2].replace(/\/?$/, '/'), OUT = process.argv[3], MODE = process.argv[4] || 'fast';
const VPD = { p375: { width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, t768: { width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, d1280: { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 } };
const VPS = (process.argv[5] || (MODE === 'sync' ? 'd1280' : 'p375,t768,d1280')).split(',');
const LESSONS = (process.argv[6] || (MODE === 'sync' ? 'zp-1,ws-1' : 'll-r8,zp-1,ws-1,zp-2,ws-2,zp-3,ws-3')).split(',');
const GAME = (l) => /^ws-/.test(l) ? 'word-stage' : 'zoo-parade', LITTLE = (l) => /^ll-/.test(l);
const origin = new URL(BASE).origin, sleep = (ms) => new Promise(r => setTimeout(r, ms)); fs.mkdirSync(OUT, { recursive: true }); const results = [];
const INIT = () => { const L = window.__media = []; const P = HTMLMediaElement.prototype, play = P.play;
  P.play = function () { const el = this, src = String(el.currentSrc || el.src || ''); if (!el.__qa) { el.__qa = 1; ['ended', 'pause', 'playing'].forEach(ev => el.addEventListener(ev, () => L.push({ ev, src: String(el.currentSrc || el.src || ''), t: performance.now(), muted: el.muted, ct: el.currentTime }))); }
    L.push({ ev: 'play', src, t: performance.now(), muted: el.muted }); return play.apply(this, arguments); }; };
function audit(MIN) { const W = document.documentElement.clientWidth, H = innerHeight, de = document.documentElement;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0 || s.pointerEvents === 'none') return false; } return true; };
  const nm = (e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.') + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : '');
  const t = [...document.querySelectorAll('.topbar a, .topbar button, #stage button, #res.on button, #res.on a[href]')].filter(vis).filter(e => !e.disabled && !e.closest('.out'));
  const small = [], outside = []; for (const e of t) { const r = e.getBoundingClientRect(); if (Math.min(r.width, r.height) < MIN - .5) small.push(`${nm(e)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    // shelf chips scroll sideways inside the shelf (only the visible part has to be on screen)
    if (e.classList.contains('sa-chip')) continue; if (r.left < -.5 || r.right > W + .5 || r.top < -.5 || r.bottom > H + .5) outside.push(`${nm(e)} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`); }
  return { W, sw: de.scrollWidth, bsw: document.body.scrollWidth, small, outside }; }
(async () => {
  const browser = await launch();
  for (const vpn of VPS) { const vp = VPD[vpn];
    for (const ls of LESSONS) {
      const ctx = await browser.newContext(Object.assign({ viewport: { width: vp.width, height: vp.height } }, vp, { serviceWorkers: 'block' })); await ctx.addInitScript(INIT);
      const page = await ctx.newPage(); const errs = [], ext = [], fails = []; let note = '', ok = true; const aud = { small: new Set(), outside: new Set(), overflow: [] };
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('pageerror: ' + e.message));
      page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) ext.push(u); });
      page.on('requestfailed', r => { const e = (r.failure() || {}).errorText || ''; if (/ERR_ABORTED/.test(e) && /\/(voice|assets\/music)\//.test(r.url())) return; fails.push(r.url() + ' ' + e); });
      page.on('response', r => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()); });
      const tap = async (h) => { const b = await h.boundingBox(); if (!b) return false; const x = b.x + b.width / 2, y = b.y + b.height / 2; if (vp.hasTouch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); return true; };
      const shot = (n) => page.screenshot({ path: path.join(OUT, `${ls}-${n}-${vpn}.png`) });
      const sample = async () => { const a = await page.evaluate(audit, LITTLE(ls) ? 96 : 64); a.small.forEach(x => aud.small.add(x)); a.outside.forEach(x => aud.outside.add(x)); if (a.sw > a.W || a.bsw > a.W) aud.overflow.push(`${a.sw}/${a.bsw}>${a.W}`); };
      const waitFor = async (fn, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = await fn(); if (v) return v; } catch (e) {} await sleep(100); } throw new Error('timeout: ' + what); };
      const T0 = Date.now();
      try {
        await page.goto(BASE, { waitUntil: 'networkidle' });
        await page.evaluate((little) => { localStorage.clear(); localStorage.setItem('elearnea:v1', JSON.stringify({ set: { voice: true, sound: true, rate: 1, band: little ? 'little' : 'explorer', little: 'little' } })); }, LITTLE(ls));
        // kid mode first: no QA marker anywhere without ?qa=1
        if (MODE === 'fast' && vpn === VPS[0]) { await page.goto(BASE + `play/${GAME(ls)}/?lesson=${ls}`, { waitUntil: 'load' }); await page.waitForSelector('#saGo'); const hook = await page.evaluate(() => !!window.__sing || document.querySelectorAll('[data-ok]').length); if (hook) { ok = false; note += 'QA hook present in kid mode; '; } }
        await page.goto(BASE + `play/${GAME(ls)}/?lesson=${ls}&qa=1`, { waitUntil: 'load' }); await page.waitForSelector('#saGo'); await sleep(400); await sample(); await shot('start');
        await tap(await page.$('#saGo'));
        await waitFor(() => page.evaluate(() => { const a = window.__sing.audio(); return a && !a.paused && !a.muted && a.currentTime > .05; }), 40000, 'music starts after the intro');
        const ev = await page.evaluate(() => window.__sing.song().events.filter(e => !(e.type === 'roll' && e.open == null)));
        const dur = await page.evaluate(() => window.__sing.song().dur);
        const shotDone = {}; let missDone = false; const shotOnce = async (k) => { if (!shotDone[k]) { shotDone[k] = 1; await shot(k); } };
        const seek = (t) => page.evaluate((t) => { window.__sing.audio().currentTime = t; }, t);
        const tapOk = async (sel, ms) => { const h = await page.waitForSelector(sel, { timeout: ms || 5000 }); await tap(h); };
        // every moment of the song, by type (real taps; one deliberate miss on the 2nd scored moment)
        const playMoment = async (e, i) => {
          if (e.type === 'pick' || e.type === 'read') { await seek(e.open + .15); await page.waitForSelector('.sa-opt[data-ok]', { timeout: 5000 }); await sleep(700);
            if (!missDone && i >= 2) { const wrong = await page.$('.sa-opt:not([data-ok])'); if (wrong) { await tap(wrong); missDone = true; await sleep(250); } }
            if (e.deco) { await seek(e.deco.t + .05); await sleep(500); }
            await sample(); await shotOnce(e.type + (e.deco ? '-rhyme' : '')); await tapOk('.sa-opt[data-ok]'); await sleep(600); }
          else if (e.type === 'spell') { await seek(e.open + .15); await page.waitForSelector('.sa-tile', { timeout: 5000 }); await sleep(600); await sample(); if (e.word.length >= 4) await shotOnce('spell');
            if (!missDone && i >= 2) { const wrong = await page.$('.sa-tile:not([data-ok]):not(.used)'); if (wrong) { await tap(wrong); missDone = true; await sleep(250); } }
            for (let k = 0; k < e.word.length; k++) { const b = await page.$('.sa-spell .sa-tile[data-ok]'); if (!b) break; await tap(b); await sleep(180); }
            await sleep(300); if (e.word.length >= 4) await shotOnce('built');
            if (e.sneeze) { await seek(e.sneeze + .3); await page.waitForSelector('.sa-catch .sa-tile[data-ok]', { timeout: 5000 }); await sleep(900); await sample(); await shotOnce('sneeze');
              for (let k = 0; k < e.word.length; k++) { const b = await page.$('.sa-catch .sa-tile[data-ok]'); if (!b) break; await tap(b); await sleep(200); } await sleep(300); await shotOnce('caught'); } }
          else if (e.type === 'sound') { for (const it of e.items) { await seek(it.snd + .05); await sleep(450); await sample(); await shotOnce('sound'); await tapOk('.sa-lt[data-ok]'); await sleep(400); } }
          else if (e.type === 'flip') { for (const w of e.words) { await seek(w.t + .05); await sleep(450); await sample(); await shotOnce('flip'); await tapOk('.sa-flip[data-ok]'); await sleep(700); } await shotOnce('flipped'); }
          else if (e.type === 'track') { await seek(e.words[Math.min(1, e.words.length - 1)][1] + .05); await sleep(400); await sample(); await shotOnce('track-' + (e.theme || 'bubble')); await tapOk('.sa-word[data-ok]'); await sleep(250); }
          else if (e.type === 'roll') { await seek(e.times[0] + .05); await sleep(400); await tapOk('.sa-rc[data-ok]'); await seek(e.times[e.times.length - 1] + .1); await sleep(400); await sample(); await shotOnce('roll'); }
          else if (e.type === 'stars') { await seek(e.open + .2); await sleep(600); await sample(); await tapOk('.sa-star[data-ok]'); await sleep(300); await shotOnce('stars'); }
          else if (e.type === 'beat') { await seek(e.open + .2); await sleep(400); await sample(); await tapOk('.sa-drum'); await sleep(250); await shotOnce('beat'); } };
        let dead = { max: 0, at: 0 };
        if (MODE === 'fast') {
          for (let i = 0; i < ev.length; i++) await playMoment(ev[i], i);
          await seek(dur - 1.5);
        } else {
          // real time, an eager kid: taps whatever the song is asking for every ~0.45 s; samples targets; measures the longest stretch with nothing to tap
          let last = null; const t0 = Date.now(); let shotsAt = [20, 60, 75, 79.5];
          while (Date.now() - t0 < (dur + 40) * 1000) {
            const st = await page.evaluate(() => { const a = window.__sing.audio(); const live = [...document.querySelectorAll('#saPlay button')].filter(b => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b);
                return r.width > 0 && !b.disabled && !b.classList.contains('used') && !b.classList.contains('gone') && !b.classList.contains('wait') && cs.visibility !== 'hidden' && +cs.opacity > .2; }).length;
              return { t: window.__sing.t(), ended: a.ended || !!document.querySelector('#res.on'), live, ok: !!document.querySelector('#saPlay [data-ok]') }; });
            if (st.ended) break;
            if (st.live) last = null; else if (st.t > 1.5) { if (last == null) last = st.t; else if (st.t - last > dead.max) dead = { max: +(st.t - last).toFixed(2), at: +last.toFixed(1) }; }
            if (st.ok) { const h = await page.$('#saPlay [data-ok]'); if (h) await tap(h).catch(() => {}); }
            if (shotsAt.length && st.t >= shotsAt[0]) { shotsAt.shift(); await shot('rt-' + Math.round(st.t)); }
            if (Math.random() < .08) await sample();
            await sleep(450); }
          note += `longest stretch with nothing to tap ${dead.max}s (at ${dead.at}s); `; if (dead.max > 3) ok = false;
        }
        await waitFor(() => page.isVisible('#res.on'), MODE === 'fast' ? 40000 : (dur + 60) * 1000, 'results card'); await sleep(900); await sample(); await shot('results');
        const res = await page.evaluate(() => ({ stars: document.querySelectorAll('#res .stars3 .on').length, text: document.querySelector('#res p').textContent, shelf: document.querySelectorAll('.sa-chip').length }));
        const rec = await page.evaluate((l) => (JSON.parse(localStorage.getItem('elearnea:v1')).lessons || {})[l], ls);
        note += `moments=${ev.length} results="${res.text}" stars=${res.stars} shelf=${res.shelf} rec=${rec ? rec.stars : 'none'}; `;
        if (!rec || !rec.stars) { ok = false; note += 'no lesson record; '; }
        // voice vs music
        const media = await page.evaluate(() => window.__media);
        const isM = (x) => /assets\/music\//.test(x.src), isV = (x) => /\/voice\//.test(x.src);
        const musicStart = media.find(x => isM(x) && x.ev === 'playing' && !x.muted); const introEnds = media.filter(x => isV(x) && x.ev === 'ended' && musicStart && x.t < musicStart.t);
        let musicOn = false, over = 0; for (const x of media) { if (isM(x) && !x.muted) { if (x.ev === 'playing') musicOn = true; if (x.ev === 'pause' || x.ev === 'ended') musicOn = false; } if (isV(x) && x.ev === 'playing' && musicOn) over++; }
        const lastIntroPlay = media.filter(x => isV(x) && x.ev === 'playing' && musicStart && x.t < musicStart.t).pop(), lastIntroEnd = introEnds.pop();
        const introOk = lastIntroPlay && lastIntroEnd && lastIntroEnd.t >= lastIntroPlay.t;
        note += `voiceOverMusic=${over} introEndedBeforeMusic=${!!introOk}; `; if (over || !introOk) ok = false;
        if (MODE === 'sync') { const log = await page.evaluate(() => window.__sing.log); const d = log.map(x => ({ s: x.s, d: (x.ct - x.s) * 1000, de: (x.t - x.s) * 1000 }));
          const third = dur / 3, part = (a, b) => d.filter(x => x.s >= a && x.s < b).map(x => Math.abs(x.d)).sort((p, q) => p - q);
          const st = (a) => a.length ? { n: a.length, med: +a[a.length >> 1].toFixed(1), p99: +a[Math.min(a.length - 1, Math.floor(a.length * .99))].toFixed(1), max: +a[a.length - 1].toFixed(1) } : { n: 0 };
          const S = { start: st(part(0, third)), middle: st(part(third, 2 * third)), end: st(part(2 * third, 1e9)), all: st(part(0, 1e9)) };
          fs.writeFileSync(path.join(OUT, `sync-${ls}-${vpn}.json`), JSON.stringify({ summary: S, words: d }, null, 0));
          note += `sync drift ms (|music clock - lyric time| at highlight): start p99 ${S.start.p99} / middle ${S.middle.p99} / end ${S.end.p99}, max ${S.all.max}, n=${S.all.n}; `;
          if (!(S.all.p99 < 150) || S.all.n < 50) ok = false; }
      } catch (e) { ok = false; note += 'EXC ' + e.message.split('\n')[0]; try { await shot('error'); } catch (x) {} }
      const r = { vp: vpn, lesson: ls, mode: MODE, ok: ok && !errs.length && !ext.length && !fails.length && !aud.small.size && !aud.outside.size && !aud.overflow.length, secs: Math.round((Date.now() - T0) / 1000),
        consoleErrors: errs, external: ext, failed: fails, small: [...aud.small], outside: [...aud.outside], overflow: aud.overflow.slice(0, 3), note };
      results.push(r); console.log(`${r.ok ? 'PASS' : 'FAIL'} ${vpn} ${ls} ${r.secs}s errors=${errs.length} ext=${ext.length} failed=${fails.length} small=${aud.small.size} outside=${aud.outside.size} overflow=${aud.overflow.length} ${note}`);
      if (aud.small.size || aud.outside.size) console.log('   small:', [...aud.small].slice(0, 6).join(' | '), ' outside:', [...aud.outside].slice(0, 6).join(' | '));
      if (errs.length || fails.length) console.log('   ', errs.slice(0, 3).join(' | '), fails.slice(0, 3).join(' | '));
      await ctx.close(); } }
  await browser.close(); fs.writeFileSync(path.join(OUT, `qa-results-songs-${MODE}.json`), JSON.stringify(results, null, 1));
  process.exit(results.every(r => r.ok) ? 0 : 1);
})();
