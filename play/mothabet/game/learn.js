/* Mothabet: learning engine. Leitner spaced repetition (1/3/7/14/30 days), adaptive difficulty (~80% first-try target),
   mastery points -> 120 collectible moths, round picker, Daily Jar seed. Everything is stored on-device (HX.Save, localStorage). */
(function (root) {
  'use strict';
  const MB = root.MB;
  const INTERVAL = [0, 1, 3, 7, 14, 30]; // days until the next review, by Leitner box
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
  MB.clamp = clamp; MB.lerp = lerp;
  MB.dayNum = function (key) { const [y, m, d] = (key || HX.Daily.key()).split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  MB.today = () => MB.dayNum();
  MB.JAR_EPOCH = MB.dayNum('2026-10-01'); // Daily Jar #1 = 1 Oct 2026
  MB.jarNo = (key) => MB.dayNum(key) - MB.JAR_EPOCH + 1;
  MB.h32 = function (s, seed) { let h = (seed || 0x811c9dc5) >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15; return h >>> 0; };

  /* ---------------- save shape ---------------- */
  MB.data = function (save) {
    const d = save.data; const m = d.mb = d.mb || {};
    m.prof = m.prof || {}; for (const b of ['s', 'f']) m.prof[b] = Object.assign({ d: b === 's' ? .22 : .28, stars: {}, best: {}, rounds: 0, words: 0, perfect: 0, recent: [] }, m.prof[b] || {});
    m.srs = m.srs || {};   // id -> [box, dueDay, right, wrong, seen]
    m.pts = m.pts || {};   // pattern -> mastery points
    m.moths = m.moths || {}; // mothId -> day caught
    m.days = m.days || {}; // dayNum -> {r: rounds, w: words, c: firstTryCorrect, s: seconds}
    m.streak = Object.assign({ last: 0, cur: 0, best: 0 }, m.streak || {});
    m.jar = m.jar || {};   // 'band:YYYY-MM-DD' -> {score, right, marks}
    m.set = Object.assign({ voice: true, rate: 1, music: true, band: 's' }, m.set || {});
    m.stats = Object.assign({ rounds: 0, started: 0, words: 0, perfectRounds: 0, bestCombo: 0, hints: 0, jarsDone: 0, bands: {} }, m.stats || {});
    m.seen = m.seen || {}; // onboarding flags
    return m;
  };

  /* ---------------- SRS ---------------- */
  MB.srs = function (m, id) { return m.srs[id] || [0, 0, 0, 0, 0]; };
  MB.recordWord = function (m, item, perfect, today) {
    const r = MB.srs(m, item.id).slice(); r[4]++;
    if (perfect) { r[2]++; if (r[0] === 0 || r[1] <= today) { r[0] = Math.min(5, r[0] + 1); r[1] = today + INTERVAL[r[0]]; } }
    else { r[3]++; r[0] = 1; r[1] = today + 1; }
    m.srs[item.id] = r; return r;
  };
  MB.boxOf = (m, id) => (m.srs[id] || [0])[0];

  /* ---------------- adaptive difficulty ---------------- */
  // A perfect word nudges difficulty up a little, a helped/missed word pulls it down 4x as much: equilibrium at 80% first-try.
  MB.adapt = function (prof, perfect) { prof.d = clamp(prof.d + (perfect ? .025 : -.1), 0, 1); prof.recent.push(perfect ? 1 : 0); if (prof.recent.length > 30) prof.recent.shift(); };
  MB.accRecent = (prof) => prof.recent.length ? prof.recent.reduce((a, b) => a + b, 0) / prof.recent.length : null;
  MB.tuning = function (d, item, retry) {
    const one = item.tiles.length === 1;
    let decoys = Math.round(one ? lerp(2, 6, d) : lerp(1, 5, d)), speed = lerp(24, 78, d);
    if (item.tiles.length >= 6) decoys = Math.min(decoys, 3);
    if (retry) { decoys = Math.max(1, Math.floor(decoys / 2)); speed *= .65; }
    return { decoys, speed, confuse: d > .45 ? clamp((d - .45) * 1.6, 0, 1) : 0 };
  };

  /* ---------------- decoys ---------------- */
  const CONF = { b: 'dpq', d: 'bpq', p: 'bdq', q: 'pdb', m: 'nw', n: 'mu', u: 'nv', w: 'mv', v: 'wuy', a: 'eou', e: 'aio', i: 'elj', o: 'aue', s: 'zc', z: 's', c: 'ks', k: 'c', f: 'vt', t: 'fl', g: 'jq', j: 'gi', l: 'it', h: 'nk', r: 'n', y: 'vg', x: 'k',
    sh: 'chth', ch: 'shth', th: 'shch', ck: 'ng', ng: 'ck', qu: 'ck', ee: 'ea', ll: 'ck' };
  const ALPHA = 'abcdefghijklmnoprstuvwyz'.split('');
  MB.decoys = function (item, n, confuse, rng) {
    const out = [], have = new Set(item.tiles);
    const digraph = item.tiles.some(t => t.length > 1), dg = ['sh', 'ch', 'th', 'ck', 'ng'];
    let guard = 0;
    while (out.length < n && guard++ < 200) {
      let c;
      if (rng.next() < confuse) { const src = rng.pick(item.tiles); const set = CONF[src] || ''; if (set.length) { if (src.length > 1) { const opts = dg.filter(x => x !== src); c = rng.pick(opts); } else c = rng.pick(set.split('')); } }
      if (!c) c = digraph && rng.next() < .35 ? rng.pick(dg) : rng.pick(ALPHA);
      if (have.has(c)) continue; if (out.length < 2 && !confuse && item.tiles.some(t => (CONF[t] || '').includes(c)) && guard < 60) continue; // low levels: avoid mirror letters
      have.add(c); out.push(c);
    }
    return out;
  };

  /* ---------------- round picker ---------------- */
  MB.stageItems = (band, si) => MB.STAGES[band][si].items;
  MB.pickRound = function (m, band, si, rng, n) {
    n = n || 10; const today = MB.today(), prof = m.prof[band], d = prof.d, st = MB.STAGES[band];
    const cur = MB.stageItems(band, si).slice();
    // reviews: due items from this and earlier stages of the band (box >= 1), lowest box first
    const due = []; for (let k = 0; k <= si; k++) for (const it of st[k].items) { const r = m.srs[it.id]; if (r && r[0] >= 1 && r[1] <= today) due.push(it); }
    rng.shuffle(due); due.sort((a, b) => MB.boxOf(m, a.id) - MB.boxOf(m, b.id));
    const reviews = due.filter(it => it.stage !== st[si].id).slice(0, si ? 3 : 0);
    // current stage: unmastered first (box < 3), length-matched to difficulty, then the rest
    const lens = cur.map(i => i.tiles.length), minL = Math.min(...lens), maxL = Math.max(...lens), tl = lerp(minL, maxL, d);
    const key = (it) => { const b = MB.boxOf(m, it.id); return (b >= 4 ? 40 : b >= 3 ? 20 : 0) + Math.abs(it.tiles.length - tl) * 2 + rng.next() * 3 + (m.srs[it.id] && m.srs[it.id][1] > today ? 6 : 0); };
    cur.sort((a, b) => key(a) - key(b));
    const pick = []; const add = (it) => { if (pick.length < n && !pick.includes(it)) pick.push(it); };
    cur.slice(0, n - reviews.length).forEach(add); reviews.forEach(add); cur.forEach(add);
    for (let k = si - 1; k >= 0 && pick.length < n; k--) rng.shuffle(st[k].items.slice()).forEach(add);
    // interleave reviews (not first)
    const head = pick.filter(i => !reviews.includes(i)), rv = pick.filter(i => reviews.includes(i));
    rv.forEach((it, k) => head.splice(Math.min(head.length, 2 + k * 3), 0, it));
    return head.slice(0, n);
  };
  // Daily Jar: the same 10 words for every player on a date (per band), fixed difficulty so scores compare.
  const JAR_IDS = { s: ['s1', 's2', 's3', 's4', 's11', 's5', 's6', 's7', 's8', 's12'], f: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f13', 'f14', 'f15'] };
  MB.JAR_STAGES = { s: JAR_IDS.s.map(id => MB.STAGES.s.findIndex(x => x.id === id)), f: JAR_IDS.f.map(id => MB.STAGES.f.findIndex(x => x.id === id)) };
  MB.pickJar = function (band, key) {
    const rng = HX.RNG('mothabet-jar|' + band + '|' + key); const pool = [];
    for (const si of MB.JAR_STAGES[band]) pool.push(...MB.STAGES[band][si].items);
    const out = []; const sh = rng.shuffle(pool.slice());
    // a gentle ramp: sort the 10 picks by stage then length
    for (const it of sh) { if (out.length >= 10) break; if (out.some(o => o.w === it.w)) continue; out.push(it); }
    out.sort((a, b) => (a.tiles.length - b.tiles.length) || (a.stage < b.stage ? -1 : 1));
    return out;
  };
  MB.JAR_D = { s: .35, f: .4 };

  /* ---------------- moths (120) ---------------- */
  const LADJ = { s: 'Silky', a: 'Amber', t: 'Tiny', p: 'Plum', i: 'Inky', n: 'Nutmeg', c: 'Cocoa', k: 'Kiwi', e: 'Ember', h: 'Honey', r: 'Rosy', m: 'Minty', d: 'Dusky', g: 'Ginger', o: 'Opal', u: 'Umber', l: 'Lilac', f: 'Fern', b: 'Berry', j: 'Jade', z: 'Zesty', w: 'Willow', v: 'Velvet', y: 'Yarrow', qu: 'Quilted', x: 'Xylo' };
  const PAL = ['#f5b335', '#f07a6a', '#8fd6b4', '#a993d6', '#f3e3c3', '#e87fa0', '#7cc8c8', '#ffd34d', '#c9e27a', '#f29e4c'];
  const PATS = ['dots', 'eyes', 'bands', 'veins', 'stars', 'moons'];
  function mk(id, name, glyph, how, need, kind, extra) { const h = MB.h32(id, 7); return Object.assign({ id, name, glyph, how, need, kind, col: PAL[h % PAL.length], col2: PAL[(h >>> 5) % PAL.length], pat: PATS[(h >>> 9) % PATS.length] }, extra || {}); }
  const MOTHS = [];
  const STAR_MAX = (MB.STAGES.s.length + MB.STAGES.f.length) * 3, STAR_N = [5, 10, 15, 20, 25, 30, 40, 50, 60, 66, 72, 78, STAR_MAX]; // last = every star on both paths
  const allPats = new Set(); MB.ITEMS.forEach(i => i.pats.forEach(p => allPats.add(p)));
  const patCount = {}; MB.ITEMS.forEach(i => i.pats.forEach(p => { patCount[p] = (patCount[p] || 0) + 1; }));
  MB.patCount = patCount;
  const need = (p) => p.startsWith('W:') ? Math.min(7, patCount[p]) : p.startsWith('L:') ? Math.min(3, patCount[p] + 1) : Math.min(4, patCount[p] + 2);
  const order = [...allPats];
  for (const p of order) {
    const [k, v, w] = p.split(':');
    if (k === 'L') MOTHS.push(mk('m:' + p, `${LADJ[v] || 'Night'} ${v}-moth`, v, `Master the "${v}" sound`, need(p), 'learn', { pat0: p }));
    else if (k === 'D') MOTHS.push(mk('m:' + p, v === 'sh' ? 'Shh-moth' : v === 'th' ? 'Thistle th-moth' : v === 'ch' ? 'Chirpy ch-moth' : `${v.toUpperCase()} moth`, v, `Master words with "${v}"`, need(p), 'learn', { pat0: p }));
    else if (k === 'V') MOTHS.push(mk('m:' + p, `Short-${v} moth`, v, `Blend short "${v}" words`, need(p), 'learn', { pat0: p }));
    else if (k === 'B') MOTHS.push(mk('m:' + p, { s: 'Swish s-blend moth', l: 'Lull l-blend moth', r: 'Rumble r-blend moth' }[v], v + '+', `Spell ${v}-blend words`, need(p), 'learn', { pat0: p }));
    else if (k === 'E') MOTHS.push(mk('m:' + p, `Golden Silent-E moth (${v}_e)`, v + '_e', `Spell ${v}_e words`, need(p), 'learn', { pat0: p, col: '#ffd34d', col2: '#f5b335' }));
    else if (k === 'T') MOTHS.push(mk('m:' + p, `${v.toUpperCase()} team moth`, v, `Spell "${v}" vowel-team words`, need(p), 'learn', { pat0: p }));
    else if (k === 'R') MOTHS.push(mk('m:' + p, `Bossy-R ${v} moth`, v, `Spell "${v}" words`, need(p), 'learn', { pat0: p }));
    else if (k === 'W') { const st = MB.STAGES[v[0]].find(s => s.id === v); MOTHS.push(mk('m:' + p, `${st.name} moth ${+w + 1}`, '♥', `Master heart words in "${st.name}" (set ${+w + 1})`, need(p), 'learn', { pat0: p })); }
  }
  [2, 3, 5, 7, 14, 21, 30, 50, 100].forEach(n => MOTHS.push(mk('m:streak' + n, `${n}-night flame moth`, String(n), `Play ${n} days in a row`, n, 'streak', { col: '#f29e4c', col2: '#ffd34d', pat: 'bands' })));
  [1, 5, 10, 25].forEach(n => MOTHS.push(mk('m:jar' + n, `Jar keeper ${n}`, '◐', `Finish ${n} Daily Jar${n > 1 ? 's' : ''}`, n, 'jar', { pat: 'moons' })));
  [['rounds1', 'First flight', 'Finish your first round', 1], ['rounds10', 'Ten-round moth', 'Finish 10 rounds', 10], ['rounds50', 'Fifty-round moth', 'Finish 50 rounds', 50], ['words100', 'Hundred-word moth', 'Catch 100 words', 100], ['words500', 'Bookworm moth', 'Catch 500 words', 500], ['words1000', 'Library moth', 'Catch 1000 words', 1000], ['perfect', 'Perfect-night moth', 'A round with every word right first try', 1], ['bands', 'Two-garden moth', 'Play Phonics and Spelling', 2]]
    .forEach(([id, n, how, k]) => MOTHS.push(mk('m:' + id, n, '★', how, k, 'milestone')));
  [['spring', 'Blossom moth', 'Play in spring (Mar-May)'], ['summer', 'Midsummer moth', 'Play in summer (Jun-Aug)'], ['autumn', 'Harvest-moon moth', 'Play in autumn (Sep-Nov)'], ['winter', 'Frost moth', 'Play in winter (Dec-Feb)']]
    .forEach(([id, n, how]) => MOTHS.push(mk('m:season-' + id, n, '❀', how, 1, 'season')));
  [3, 6, 10].forEach(n => MOTHS.push(mk('m:combo' + n, `Combo x${n} moth`, 'x' + n, `${n} perfect words in a row`, n, 'combo')));
  MOTHS.push(mk('m:alpha', 'Alphabet Queen', 'az', 'Catch all 26 letter moths', 26, 'meta', { col: '#ffd34d', col2: '#a993d6', pat: 'stars' }));
  STAR_N.forEach(n => MOTHS.push(mk('m:stars' + n, `Starlight moth ${n}`, '✦', `Earn ${n} stars on the garden path`, n, 'stars', { pat: 'stars' })));
  MB.MOTHS = MOTHS; MB.MOTH = {}; MOTHS.forEach(x => { MB.MOTH[x.id] = x; });
  MB.mothCount = () => MOTHS.length;

  MB.totalStars = (m) => ['s', 'f'].reduce((a, b) => a + Object.values(m.prof[b].stars).reduce((x, y) => x + (y | 0), 0), 0);
  MB.season = (date) => { const mo = (date || new Date()).getMonth(); return mo >= 2 && mo <= 4 ? 'spring' : mo >= 5 && mo <= 7 ? 'summer' : mo >= 8 && mo <= 10 ? 'autumn' : 'winter'; };
  // Award everything newly earned. Returns array of moth defs.
  MB.awardMoths = function (m, ctx) {
    const got = []; const give = (id) => { if (!m.moths[id] && MB.MOTH[id]) { m.moths[id] = MB.today(); got.push(MB.MOTH[id]); } };
    for (const x of MOTHS) if (x.kind === 'learn' && (m.pts[x.pat0] || 0) >= x.need) give(x.id);
    for (const n of [2, 3, 5, 7, 14, 21, 30, 50, 100]) if (m.streak.best >= n) give('m:streak' + n);
    for (const n of [1, 5, 10, 25]) if (m.stats.jarsDone >= n) give('m:jar' + n);
    const s = m.stats; if (s.rounds >= 1) give('m:rounds1'); if (s.rounds >= 10) give('m:rounds10'); if (s.rounds >= 50) give('m:rounds50');
    if (s.words >= 100) give('m:words100'); if (s.words >= 500) give('m:words500'); if (s.words >= 1000) give('m:words1000');
    if (s.perfectRounds >= 1) give('m:perfect'); if (Object.keys(s.bands).length >= 2) give('m:bands');
    if (s.rounds >= 1) give('m:season-' + MB.season());
    for (const n of [3, 6, 10]) if (s.bestCombo >= n) give('m:combo' + n);
    if (MOTHS.filter(x => x.pat0 && x.pat0.startsWith('L:')).every(x => m.moths[x.id])) give('m:alpha');
    const ts = MB.totalStars(m); for (const n of STAR_N) if (ts >= n) give('m:stars' + n);
    return got;
  };
  MB.mothProgress = function (m, x) { // 0..1 toward catching
    if (m.moths[x.id]) return 1; const s = m.stats;
    const v = x.kind === 'learn' ? (m.pts[x.pat0] || 0) : x.kind === 'streak' ? m.streak.best : x.kind === 'jar' ? s.jarsDone : x.kind === 'combo' ? s.bestCombo : x.kind === 'stars' ? MB.totalStars(m) :
      x.kind === 'meta' ? MOTHS.filter(y => y.pat0 && y.pat0.startsWith('L:') && m.moths[y.id]).length : x.kind === 'season' ? 0 :
      ({ 'm:rounds1': s.rounds, 'm:rounds10': s.rounds, 'm:rounds50': s.rounds, 'm:words100': s.words, 'm:words500': s.words, 'm:words1000': s.words, 'm:perfect': s.perfectRounds, 'm:bands': Object.keys(s.bands).length })[x.id] || 0;
    return clamp(v / x.need, 0, .99);
  };
  // day streak (any finished round counts)
  MB.touchStreak = function (m) { const t = MB.today(), s = m.streak; if (s.last === t) return false; s.cur = s.last === t - 1 ? s.cur + 1 : 1; s.last = t; s.best = Math.max(s.best, s.cur); return true; };
  MB.streakNow = (m) => { const t = MB.today(); return m.streak.last >= t - 1 ? m.streak.cur : 0; };

  /* ---------------- stars ---------------- */
  MB.STAR_RULES = [
    { key: 'six', text: 'Catch 6 words', test: (r) => r.done >= 6 },
    { key: 'ten', text: 'Catch all 10 words', test: (r) => r.done >= 10 },
    { key: 'glow', text: '8 words right first try', test: (r) => r.perfect >= 8 }
  ];
})(window);
