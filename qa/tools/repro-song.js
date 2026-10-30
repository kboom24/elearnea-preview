// Repro: kid mode (no ?qa=1), no autoplay flag, real time. Logs what the play area shows every 2 s; screenshots every 10 s.
//   node repro-song.js <baseUrl> <outDir> <vp:p375|d1280> <lesson> [secs]
const L = require('./lib'); const fs = require('fs'), path = require('path');
const [BASE0, OUT, VPN, LS, SECS] = process.argv.slice(2); const BASE = BASE0.replace(/\/?$/, '/');
const VPD = { p375: { width: 375, height: 667, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, d1280: { width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 } };
(async () => { fs.mkdirSync(OUT, { recursive: true }); const vp = VPD[VPN];
  const browser = await L.chromium.launch({ executablePath: L.CHROME, headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext(Object.assign({ viewport: { width: vp.width, height: vp.height } }, vp)); const page = await ctx.newPage();
  const errs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', e => errs.push('pageerror ' + e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.goto(BASE + `play/${/^ws/.test(LS) ? 'word-stage' : 'zoo-parade'}/?lesson=${LS}`, { waitUntil: 'load' }); await page.waitForSelector('#saGo');
  const b = await (await page.$('#saGo')).boundingBox(); if (vp.hasTouch) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  const t0 = Date.now(), log = [];
  while (Date.now() - t0 < (+SECS || 140) * 1000) {
    const s = await page.evaluate(() => { const a = [...document.querySelectorAll('audio')]; const p = document.querySelector('#saPlay'); const r = p.getBoundingClientRect();
      return { play: p.innerText.replace(/\s+/g, ' ').slice(0, 80), playBox: [r.top|0, r.height|0], kids: p.children.length, lyr: document.querySelector('#saCur').innerText.slice(0, 60), card: document.querySelector('#saStart').className + ':' + document.querySelector('#saStart').dataset.kind, res: !!document.querySelector('#res.on') }; });
    const secs = Math.round((Date.now() - t0) / 1000); log.push(Object.assign({ secs }, s)); console.log(secs, JSON.stringify(s));
    if (secs % 10 < 2) await page.screenshot({ path: path.join(OUT, `${LS}-${VPN}-${String(secs).padStart(3, '0')}.png`) });
    if (s.res) break; await new Promise(r => setTimeout(r, 2000)); }
  console.log('ERRS', errs); fs.writeFileSync(path.join(OUT, `log-${LS}-${VPN}.json`), JSON.stringify({ log, errs }, null, 1)); await browser.close(); })();
