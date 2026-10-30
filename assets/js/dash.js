/* Grown-ups dashboard. Two data sources with one view model:
   - SAMPLE: a made-up learner, generated in the browser, always labeled "Demo data".
   - DEVICE: this browser's own saved progress (El.store, no names, no account).
   Nothing is sent anywhere; the portfolio export is built and printed/downloaded on this device. */
(function () {
  'use strict';
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const STD = {
    'CCSS.ELA-LITERACY.RF.K.3.A': 'Letter–sound match (consonants)',
    'CCSS.ELA-LITERACY.RF.K.3.B': 'Short and long vowel sounds',
    'CCSS.ELA-LITERACY.RF.K.3.C': 'Read high-frequency words by sight',
    'CCSS.ELA-LITERACY.RF.K.2.D': 'Hear and say each sound in short words',
    'CCSS.ELA-LITERACY.RF.1.3.A': 'Consonant digraphs (sh, ch, th)',
    'CCSS.ELA-LITERACY.RF.1.3.B': 'Decode one-syllable words',
    'CCSS.ELA-LITERACY.RF.1.3.G': 'Grade 1 irregular words',
    'CCSS.ELA-LITERACY.L.1.2.D': 'Spell common spelling patterns',
    'CCSS.MATH.CONTENT.K.CC.A.3': 'Numbers 0–20',
    'CCSS.MATH.CONTENT.K.CC.B.4': 'Counting and how many',
    'CCSS.MATH.CONTENT.K.CC.B.5': 'Count to answer “how many?”',
    'CCSS.MATH.CONTENT.K.OA.A.2': 'Addition within 10',
    'CCSS.MATH.CONTENT.K.OA.A.5': 'Add within 5 fluently',
    'CCSS.MATH.CONTENT.1.OA.C.6': 'Add within 20 (fluent within 10)',
    'CCSS.MATH.CONTENT.K.G.A.2': 'Name shapes (any size or turn)',
    'CCSS.MATH.CONTENT.K.G.B.4': 'Compare shapes: sides and corners',
    'CCSS.MATH.PRACTICE.MP7': 'Patterns: look for structure (practice standard)',
    // Head Start ELOF goals (Little Lanterns lessons are aligned to these goals; this is not an assessment that a goal is met)
    'ELOF.IT-LC 1': 'Attends to and responds to communication (infant/toddler)',
    'ELOF.IT-LC 7': 'Understands more and more words (infant/toddler)',
    'ELOF.IT-LC 9': 'Attends to and repeats rhymes and songs (infant/toddler)',
    'ELOF.IT-C 2': 'Cause and effect (infant/toddler)',
    'ELOF.IT-C 8': 'Sense of number and quantity (infant/toddler)',
    'ELOF.IT-C 10': 'Matching and sorting (infant/toddler)',
    'ELOF.P-LC 1': 'Attends to communication and language (preschool)',
    'ELOF.P-LC 6': 'Understands and uses a wide variety of words (preschool)',
    'ELOF.P-LIT 1': 'Hears smaller sound parts: rhyme, beats (preschool)',
    'ELOF.P-LIT 3': 'Letters of the alphabet (preschool; shape matching only here)',
    'ELOF.P-MATH 2': 'Recognizes how many in a small set (preschool)',
    'ELOF.P-MATH 4': 'Compares numbers: more and fewer (preschool)',
    'ELOF.P-MATH 9': 'Identifies and describes shapes (preschool)',
    // NGSS (science): Nature realm
    'NGSS.K-LS1-1': 'What plants and animals need to live (K)',
    'NGSS.K-ESS2-2': 'Animals and plants change their surroundings, e.g. homes (K)',
    'NGSS.3-LS1-1': 'Life cycles: seed to flower (early look at grade 3)'
  };
  const short = (c) => c.replace('CCSS.ELA-LITERACY.', 'ELA ').replace('CCSS.MATH.CONTENT.', 'Math ').replace('CCSS.MATH.PRACTICE.', 'Math practice ').replace('ELOF.', 'ELOF ').replace('NGSS.', 'NGSS ');
  const esc = (s) => String(s).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  const DAY = 864e5;
  const dayNum = (t) => { const d = new Date(t); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
  const fromDay = (n) => { const d = new Date(n * DAY); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
  const mondayOf = (n) => { const wd = (fromDay(n).getDay() + 6) % 7; return n - wd; };
  const fmtDate = (d, o) => d.toLocaleDateString('en-US', o || { month: 'short', day: 'numeric' });
  const mins = (sec) => Math.round(sec / 60);
  const hm = (sec) => { const m = mins(sec); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

  /* ---------- sample learner (deterministic, relative to today) */
  function sample(cat) {
    const r = El.rng(20261029), today = El.Learn.today();
    const lessons = { 'rd-l1': 3, 'rd-l2': 3, 'rd-l3': 2, 'rd-l4': 2, 'rd-l5': 1, 'ma-l1': 3, 'ma-l2': 3, 'ma-l3': 2 };
    const log = [];
    for (let k = 20; k >= 0; k--) { const n = today - k, wd = (fromDay(n).getDay() + 6) % 7; if (wd === 6 || (wd === 5 && r.next() < .5)) continue;
      const sessions = wd === 5 ? 1 : 1 + r.int(0, 2), pool = Object.keys(lessons);
      for (let s = 0; s < sessions; s++) { const l = pool[El.clamp(Math.floor((20 - k) / 21 * pool.length) + r.int(-2, 1), 0, pool.length - 1)];
        const a = r.int(62, 98), sec = r.int(240, 780); log.push({ t: fromDay(n).getTime() + (15 + s * 2) * 3600e3 + r.int(0, 50) * 60e3, l, s: a >= 90 ? 3 : a >= 70 ? 2 : 1, a, n: 8, sec }); } }
    const skills = {}; for (const ls of Object.values(cat.lessons)) if (lessons[ls.id]) skills[ls.skill] = { acc: .62 + .12 * lessons[ls.id] + r.next() * .06, seen: 8 + r.int(0, 10), solid: 0 };
    for (const s of Object.values(skills)) s.solid = Math.round(s.seen * Math.min(1, s.acc - .15));
    return { kind: 'sample', name: 'Maya', initial: 'M', grade: 'K–1', lessons: Object.fromEntries(Object.entries(lessons).map(([k, v]) => [k, { stars: v }])), log, skills, streak: 4 };
  }
  /* ---------- this device */
  function device(cat) {
    const d = El.store.load(), skills = {};
    for (const [key, r] of Object.entries(d.srs)) { const sk = key.split('|')[0]; const s = skills[sk] = skills[sk] || { acc: null, seen: 0, solid: 0 }; s.seen++; if (r[0] >= 3) s.solid++; }
    for (const sk of Object.keys(d.skills)) { const s = skills[sk] = skills[sk] || { acc: null, seen: 0, solid: 0 }; s.acc = El.Learn.accRecent(sk); }
    let log = (d.log || []).slice();
    if (!log.length) for (const [id, l] of Object.entries(d.lessons)) if (l.last) log.push({ t: fromDay(l.last).getTime() + 12 * 3600e3, l: id, s: l.stars, a: l.best, n: 0, sec: 0, old: true });
    return { kind: 'device', name: 'This device', initial: '', grade: '', lessons: d.lessons, log, skills, streak: El.Learn.streakNow() };
  }

  /* ---------- derived numbers */
  function model(cat, src) {
    const today = El.Learn.today(), mon = mondayOf(today);
    const week = DAYS.map((n, i) => ({ n, day: mon + i, sec: 0, plays: 0 }));
    for (const e of src.log) { const k = dayNum(e.t) - mon; if (k >= 0 && k < 7) { week[k].sec += e.sec | 0; week[k].plays++; } }
    const realms = cat.realms.map(rm => { const list = cat.order[rm.id] || []; const stars = list.reduce((a, ls) => a + ((src.lessons[ls.id] || {}).stars | 0), 0);
      return { rm, live: rm.status === 'open' && list.length > 0, pct: list.length ? Math.round(100 * stars / (list.length * 3)) : 0 }; });
    const stds = {}; for (const ls of Object.values(cat.lessons)) for (const c of ls.standards) { const s = stds[c] = stds[c] || { code: c, lessons: [], played: 0, strong: 0 }; s.lessons.push(ls); const st = (src.lessons[ls.id] || {}).stars | 0; if (st) s.played++; if (st >= 3) s.strong++; }
    for (const s of Object.values(stds)) s.status = s.strong === s.lessons.length ? 'ok' : s.played ? 'go' : 'no';
    return { today, mon, week, realms, stds: Object.values(stds), total: week.reduce((a, w) => a + w.sec, 0) };
  }

  /* ---------- weekly plan: every day Mon–Sun gets a label and an activity */
  function plan(cat, src) {
    const next = (rid) => { const list = cat.order[rid] || []; return list.find(ls => !((src.lessons[ls.id] || {}).stars > 0)) || list[list.length - 1]; };
    const review = (rid) => { const played = (cat.order[rid] || []).filter(ls => (src.lessons[ls.id] || {}).stars > 0); return played.sort((a, b) => (src.lessons[a.id].stars - src.lessons[b.id].stars))[0] || next(rid); };
    const col = (rid) => (cat.realms.find(r => r.id === rid) || {}).color || '#9B8AD1';
    const L = (ls, what, m) => ({ ls, title: what || ls.name, m, color: col(ls.realm), tile: cat.games[ls.game.id].tile });
    const rd = next('reading'), ma = next('math');
    // Little Lanterns: much shorter sessions (under 2: a few minutes, played together)
    const k = El.band() === 'tiny' ? .2 : El.isLittle() ? 1 / 3 : 1, mm = (m) => Math.max(3, Math.round(m * k));
    return [L(rd, 'New: ' + rd.name, mm(15)), L(ma, 'New: ' + ma.name, mm(15)), L(review('reading'), 'Review: ' + review('reading').name, mm(10)), L(review('math'), 'Review: ' + review('math').name, mm(10)), L(rd, 'Practice: ' + rd.name, mm(15)),
      { title: 'Free play: any open game', m: mm(10), color: '#F5B841', icon: 'star' }, { title: 'Rest day: read a picture book together', m: 0, color: '#9B8AD1', icon: 'book' }];
  }

  /* ---------- render */
  let CAT, MODE = 'sample';
  const $ = (id) => document.getElementById(id);
  function render() {
    const src = MODE === 'sample' ? sample(CAT) : device(CAT), m = model(CAT, src), now = new Date();
    document.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === MODE)));
    const bn = $('banner'); bn.classList.toggle('real', MODE !== 'sample');
    bn.querySelector('.tagd').textContent = MODE === 'sample' ? 'Demo data' : 'This device';
    bn.querySelector('p').textContent = MODE === 'sample' ? 'You are looking at a made-up sample learner so you can see how this dashboard works. None of this is real progress.' : 'Real progress saved in this browser only (no account, no name). Play a few lessons and it fills in here.';
    $('who').innerHTML = MODE === 'sample' ? `<span class="av">${src.initial}</span><span><b>${src.name} (sample)</b><small>Grade ${src.grade}</small></span>` : `<span class="av" style="background:var(--teal)">${El.icon('star')}</span><span><b>This device</b><small>Saved in this browser</small></span>`;
    // progress by realm
    $('realms').innerHTML = m.realms.map(({ rm, live, pct }) => `<div class="r${live ? '' : ' dim'}"><span class="ic" style="background:${rm.color}55">${El.icon(rm.icon)}</span><span class="nm">${esc(rm.name)}</span>${live ? `<span class="bar" role="img" aria-label="${pct}%"><i style="width:${pct}%;background:${rm.color}"></i></span><span class="pc">${pct}%</span>` : '<span class="bar"></span><span class="soon">Soon</span>'}</div>`).join('');
    // time this week, Mon..Sun
    const max = Math.max(20 * 60, ...m.week.map(w => w.sec));
    $('time').innerHTML = `<div class="big">${hm(m.total)}</div><div class="sub">This week (${fmtDate(fromDay(m.mon))} – ${fmtDate(fromDay(m.mon + 6))}) · ${m.week.reduce((a, w) => a + w.plays, 0)} sessions · ${src.streak} day streak</div>
      <div class="chart">${m.week.map(w => `<div class="col${w.day === m.today ? ' today' : ''}"><em>${w.sec ? mins(w.sec) + 'm' : ''}</em><i style="height:${Math.round(100 * w.sec / max)}%" title="${w.n}: ${mins(w.sec)} min"></i></div>`).join('')}</div>
      <div class="days">${m.week.map(w => `<span class="${w.day === m.today ? 'today' : ''}">${w.n}</span>`).join('')}</div>`;
    // standards
    const order = { ok: 0, go: 1, no: 2 }, lab = { ok: 'Strong', go: 'Practicing', no: 'Not started' };
    $('stds').innerHTML = m.stds.sort((a, b) => order[a.status] - order[b.status]).map(s => `<div class="std"><div><b>${esc(STD[s.code] || short(s.code))}</b><small>${short(s.code)}</small></div><span class="chip ${s.status}">${lab[s.status]}</span></div>`).join('');
    // weekly plan
    const p = plan(CAT, src);
    $('plan').innerHTML = p.map((x, i) => { const n = m.mon + i; return `<div class="pd${n === m.today ? ' today' : ''}"><div class="dn">${DAYS[i]}</div><div class="dt">${fmtDate(fromDay(n))}</div>
      <div class="tile" style="${x.tile ? `background-image:url(${El.url(x.tile)})` : `background:${x.color}44`}" role="img" aria-label="${esc(x.title)}">${x.tile ? '' : El.icon(x.icon)}</div>
      <div class="txt"><div class="nm">${esc(x.title)}</div><div class="mn"><i style="background:${x.color}"></i>${x.m ? x.m + ' min' : 'Off'}</div></div></div>`; }).join('');
    // skills by realm
    let sh = ''; for (const rm of CAT.realms) { const sks = rm.skills || []; if (!sks.length) continue;
      sh += `<tr><td colspan="4" style="font:700 1rem var(--display);padding-top:14px"><span class="dot" style="background:${rm.color}"></span>${esc(rm.name)}</td></tr>`;
      for (const sk of sks) { const s = src.skills[sk.id], ls = sk.lessons[0], st = (src.lessons[ls.id] || {}).stars | 0, solid = s && s.seen ? Math.round(100 * s.solid / s.seen) : 0;
        sh += `<tr><td>${esc(sk.name)}<br>${sk.standards.map(c => `<span class="tag" title="${esc(STD[c] || '')}">${short(c)}</span>`).join('')}</td><td>${sk.grade}</td>
          <td>${s && s.seen ? `${s.solid} of ${s.seen} solid<div class="mbar"><i style="width:${solid}%"></i></div>` : '<span class="empty">Not started</span>'}</td>
          <td><span class="mini">${[0, 1, 2].map(k => El.icon('star', k < st ? 'on' : '')).join('')}</span>${s && s.acc != null ? `<br><small>${Math.round(s.acc * 100)}% first try</small>` : ''}</td></tr>`; } }
    $('skills').innerHTML = `<table class="t"><tr><th>Skill and standards</th><th>Grade</th><th>Mastery</th><th>Stars</th></tr>${sh}</table>`;
    // recent activity
    const rec = src.log.slice().sort((a, b) => b.t - a.t).slice(0, 8);
    $('recent').innerHTML = rec.length ? `<table class="t"><tr><th>When</th><th>Lesson</th><th>Result</th><th class="hide-sm">Time</th></tr>${rec.map(e => { const ls = CAT.lessons[e.l] || { name: e.l, realm: '' }, rm = CAT.realms.find(r => r.id === ls.realm) || {};
      return `<tr><td>${fmtDate(new Date(e.t), { weekday: 'short', month: 'short', day: 'numeric' })}</td><td><span class="dot" style="background:${rm.color || '#ccc'}"></span>${esc(rm.name || '')}: ${esc(ls.name)}</td><td><span class="mini">${[0, 1, 2].map(k => El.icon('star', k < e.s ? 'on' : '')).join('')}</span>${e.n ? ` <small>${e.a}% first try</small>` : ''}</td><td class="hide-sm">${e.sec ? mins(e.sec) + ' min' : '–'}</td></tr>`; }).join('')}</table>`
      : '<div class="empty">No lessons played on this device yet. Hand the device to your child and open the map!</div>';
    $('recent-note').textContent = MODE === 'sample' ? 'Sample activity for the last three weeks.' : 'Time is counted from when a lesson opens to when its results show.';
    window.__dash = { mode: MODE, src, m, plan: p };
  }

  /* ---------- homeschool portfolio record (built on this device; print / save as PDF / download .html) */
  function record() {
    const src = MODE === 'sample' ? sample(CAT) : device(CAT), m = model(CAT, src), now = new Date(), log = src.log.slice().sort((a, b) => a.t - b.t);
    const first = log.length ? new Date(log[0].t) : now, totalSec = log.reduce((a, e) => a + (e.sec | 0), 0), done = Object.values(src.lessons).filter(l => l.stars > 0).length;
    const ev = (c) => { const ids = new Set(CAT.lessons ? Object.values(CAT.lessons).filter(l => l.standards.includes(c)).map(l => l.id) : []); const es = log.filter(e => ids.has(e.l)); return { n: es.length, best: es.reduce((a, e) => Math.max(a, e.a | 0), 0), last: es.length ? new Date(es[es.length - 1].t) : null }; };
    const lab = { ok: 'Strong', go: 'Practicing', no: 'Not started' };
    const byDay = {}; for (const e of log) { const k = dayNum(e.t); byDay[k] = (byDay[k] || 0) + (e.sec | 0); }
    return `<h1>Learning record</h1><div>Elearnea preview · prepared on this device</div>
      ${MODE === 'sample' ? '<div class="wm">SAMPLE DATA: a made-up learner for demonstration. Not a real record.</div>' : ''}
      <div class="meta"><div><b>Learner:</b> ${MODE === 'sample' ? 'Maya (sample)' : '____________________'}</div><div><b>Grade level:</b> ${MODE === 'sample' ? 'K–1' : '__________'}</div>
      <div><b>Period:</b> ${fmtDate(first, { year: 'numeric', month: 'short', day: 'numeric' })} – ${fmtDate(now, { year: 'numeric', month: 'short', day: 'numeric' })}</div><div><b>Generated:</b> ${now.toLocaleString('en-US')}</div>
      <div><b>Sessions:</b> ${log.length}</div><div><b>Total time:</b> ${hm(totalSec)}${MODE !== 'sample' && log.some(e => !e.sec) ? ' (some sessions untimed)' : ''}</div><div><b>Lessons completed:</b> ${done} of ${Object.keys(CAT.lessons).length}</div><div><b>Subjects:</b> Reading, Math</div></div>
      <h2>Standards practiced</h2><table><tr><th>Standard</th><th>Description</th><th>Status</th><th>Sessions</th><th>Best first-try</th><th>Last practiced</th></tr>
      ${m.stds.map(s => { const e = ev(s.code); return `<tr><td>${short(s.code)}</td><td>${esc(STD[s.code] || '')}</td><td>${lab[s.status]}</td><td>${e.n}</td><td>${e.n ? e.best + '%' : '–'}</td><td>${e.last ? fmtDate(e.last, { year: 'numeric', month: 'short', day: 'numeric' }) : '–'}</td></tr>`; }).join('')}</table>
      <h2>Lessons</h2><table><tr><th>Subject</th><th>Lesson</th><th>Grade</th><th>Stars</th></tr>${CAT.realms.flatMap(rm => (CAT.order[rm.id] || []).map(ls => `<tr><td>${esc(rm.name)}</td><td>${esc(ls.name)}</td><td>${ls.grade}</td><td>${(src.lessons[ls.id] || {}).stars | 0} / 3</td></tr>`)).join('')}</table>
      <h2>Daily time log</h2><table><tr><th>Date</th><th>Day</th><th>Minutes</th></tr>${Object.keys(byDay).map(Number).sort().map(k => `<tr><td>${fmtDate(fromDay(k), { year: 'numeric', month: 'short', day: 'numeric' })}</td><td>${DAYS_LONG[(fromDay(k).getDay() + 6) % 7]}</td><td>${mins(byDay[k]) || '–'}</td></tr>`).join('') || '<tr><td colspan="3">No sessions yet.</td></tr>'}</table>
      <h2>Session log</h2><table><tr><th>Date</th><th>Subject: lesson</th><th>Items</th><th>First-try</th><th>Stars</th><th>Minutes</th></tr>${log.map(e => { const ls = CAT.lessons[e.l] || { name: e.l }, rm = CAT.realms.find(r => r.id === ls.realm) || { name: '' }; return `<tr><td>${fmtDate(new Date(e.t), { year: 'numeric', month: 'short', day: 'numeric' })}</td><td>${esc(rm.name)}: ${esc(ls.name)}</td><td>${e.n || '–'}</td><td>${e.n ? e.a + '%' : '–'}</td><td>${e.s}</td><td>${e.sec ? mins(e.sec) : '–'}</td></tr>`; }).join('') || '<tr><td colspan="6">No sessions yet.</td></tr>'}</table>
      <h2>Notes and work samples</h2><div style="min-height:90px;border:1px solid #d8d2e6;border-radius:6px"></div>
      <p class="fine">Generated in the browser from progress stored on this device. Standards codes refer to the Common Core State Standards. This is a parent-kept record, not an official transcript.</p>`;
  }
  function openRecord() { $('record').innerHTML = record(); $('recModal').classList.add('on'); $('recModal').scrollTop = 0; }
  function download() {
    const css = [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).filter(t => /\.record|@font-face/.test(t) && !/url\(/.test(t)).join('\n'); } catch (e) { return ''; } }).join('\n');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Learning record</title><style>:root{--indigo:#1E1B4B;--gold:#F5B841;--coral:#F08A7E;--coral-d:#C25F54;--display:system-ui,sans-serif;--ui:system-ui,sans-serif}body{margin:0;padding:20px;background:#f3eee4}${css}@media print{body{background:#fff;padding:0}.record{box-shadow:none}}</style></head><body><div class="record">${record()}</div></body></html>`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = `learning-record-${MODE === 'sample' ? 'sample-' : ''}${(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()}.html`;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }

  El.Dash = { async open() {
    CAT = await El.catalog(); document.body.className = 'dash'; render();
    document.querySelectorAll('.seg button').forEach(b => b.onclick = () => { MODE = b.dataset.mode; render(); });
    $('exportB').onclick = openRecord; $('recClose').onclick = () => $('recModal').classList.remove('on');
    $('recPrint').onclick = () => { document.body.classList.add('printing'); setTimeout(() => { window.print(); }, 50); };
    window.addEventListener('afterprint', () => document.body.classList.remove('printing'));
    $('recDl').onclick = download;
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('recModal').classList.remove('on'); });
    document.querySelectorAll('.side nav a').forEach(a => a.addEventListener('click', () => { document.querySelectorAll('.side nav a').forEach(x => x.classList.toggle('on', x === a)); }));
  }, render, record };
})();
