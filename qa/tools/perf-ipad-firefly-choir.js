// iPad Pro timing for Firefly Choir. Adapted from a COPY of /home/box/games/tools/perf-ipad.template.js (same method and pass bar;
// the shared template is not edited). Run ONLY under qa-slot.sh --perf. One page at a time, a cold context per lesson:
// boot = navigation until the lesson's Start button is shown; then Start is tapped (real touch) and, after 1.2 s, a 3 s rAF sample is taken
// during live gameplay (Wick's demo + the first item: glowing/pulsing fireflies, synthesized notes, voice clips, the demo hand).
// Bar (as the template): avg >= 30 fps, p95 frame <= 50 ms, boot <= 5000 ms, 0 console errors, 0 external requests.
// Usage: node perf-ipad-firefly-choir.js <out.json>     (serves this checkout itself on a random local port)
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http'); const { launch } = require('./lib');
const ROOT = path.resolve(__dirname, '../..'), outF = process.argv[2] || '/home/box/elearnea/qa/firefly-choir/perf-ipad.json';
const la = () => os.loadavg().map(x => +x.toFixed(2)); const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.opus': 'audio/ogg', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]).replace(/^\/elearnea-preview/, ''); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port, base = `http://127.0.0.1:${port}/elearnea-preview/`; const browser = await launch();
  const res = { game: 'firefly-choir', measuredAt: new Date().toISOString(), slot: 'qa-slot.sh --perf', cpus: os.cpus().length, note: 'headless Chrome + SwiftShader software GL: LOWER BOUND, not device-representative', runs: [] };
  for (const [w, h] of [[1024, 1366], [1366, 1024]]) for (const ls of ['am-l1', 'am-l2', 'am-l3', 'am-l4']) {
    const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' }); const pg = await c.newPage();
    const errs = [], ext = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push(e.message));
    pg.on('request', q => { const u = q.url(); if (!u.startsWith(`http://127.0.0.1:${port}/`) && !/^(data|blob):/.test(u)) ext.push(u); });
    const r = { viewport: `${w}x${h}`, dpr: 2, lesson: ls };
    try {
      r.loadStart = la(); const t0 = Date.now(); await pg.goto(base + `play/firefly-choir/?lesson=${ls}&qa=1`); await pg.waitForSelector('#fcGo', { state: 'visible', timeout: 15000 }); r.bootToGameMs = Date.now() - t0;
      const b = await (await pg.$('#fcGo')).boundingBox(); await pg.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await sleep(1200);
      r.phase = await pg.evaluate(() => document.getElementById('stage').dataset.phase); r.loadSample = la();
      const s = await pg.evaluate(ms => new Promise(res => { const ts = [], t0 = performance.now(); const step = t => { ts.push(t); if (t - t0 < ms) requestAnimationFrame(step); else res(ts); }; requestAnimationFrame(step); }), 3000);
      const d = []; for (let i = 1; i < s.length; i++) d.push(s[i] - s[i - 1]); const span = s[s.length - 1] - s[0], srt = d.slice().sort((a, b) => a - b);
      Object.assign(r, { sampleMs: Math.round(span), avgFps: +(d.length * 1000 / span).toFixed(1), p95FrameMs: +(srt[Math.floor(srt.length * .95)] || 0).toFixed(1), worstFrameMs: +(srt[srt.length - 1] || 0).toFixed(1) });
      r.status = 'ok';
    } catch (e) { r.status = 'error'; r.error = String(e && e.message || e); }
    r.loadEnd = la(); r.consoleErrors = errs.length; r.externalRequests = ext.length;
    r.pass = r.status === 'ok' && r.phase !== 'start' && r.avgFps >= 30 && r.p95FrameMs <= 50 && r.bootToGameMs <= 5000 && !errs.length && !ext.length;
    console.log(`IPAD ${r.viewport}@2x ${ls} ${r.pass ? 'PASS' : 'FAIL'} boot ${r.bootToGameMs} ms, phase ${r.phase}, ${r.avgFps} fps avg, p95 ${r.p95FrameMs} ms, worst ${r.worstFrameMs} ms, errors ${errs.length}, ext ${ext.length} [load ${r.loadSample}]${r.error ? ' ' + r.error : ''}`);
    res.runs.push(r); await c.close(); }
  res.criteria = 'gameplay avg >= 30 fps, p95 frame <= 50 ms, boot <= 5000 ms, 0 console errors, 0 external requests (as /home/box/games/tools/perf-ipad.template.js)';
  res.pass = res.runs.every(r => r.pass); fs.writeFileSync(outF, JSON.stringify(res, null, 2)); console.log(res.pass ? 'PERF PASS' : 'PERF FAIL'); await browser.close(); srv.close(); process.exit(res.pass ? 0 : 1);
})();
