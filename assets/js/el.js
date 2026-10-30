/* Elearnea core (phase 1). On-device only: no network calls except same-origin app files, no trackers, no PII.
   - El.Learn: shared learning engine, adapted from Mothabet's learn.js (Leitner 1/3/7/14/30-day spaced repetition,
     adaptive difficulty with an ~80% first-try equilibrium, due-review interleaving), generalised to any skill/item.
   - El.Voice: adapted from Mothabet's voice.js (Web Speech, ON-DEVICE voices only, visual fallback when none).
   - El.Host: the shared game contract. A game module is { id, start(config, host) -> { stop?() } } and talks back only through
     host.emit('progress', {done, total}), host.emit('mastery', {item, correct, firstTry}) and host.end(results). */
(function (root) {
  'use strict';
  const El = root.El = {};
  const SCRIPT = document.currentScript && document.currentScript.src;
  El.base = SCRIPT ? SCRIPT.replace(/assets\/js\/el\.js.*$/, '') : './';
  El.url = (p) => El.base + p;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  El.clamp = clamp;
  El.rng = function (seed) { let a = (seed >>> 0) || ((Math.random() * 2 ** 32) >>> 0); const next = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    return { next, int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), pick: (arr) => arr[Math.floor(next() * arr.length)], shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; } }; };

  /* ------------------------------------------------------------ storage (localStorage, memory fallback) */
  const KEY = 'elearnea:v1'; let mem = null;
  function blank() { return { v: 1, srs: {}, skills: {}, lessons: {}, days: {}, log: [], streak: { last: 0, cur: 0, best: 0 }, set: { voice: true, sound: true, rate: 1, band: 'explorer', little: 'little' }, demoUnlock: false }; }
  El.store = {
    data: null,
    load() { if (this.data) return this.data; let d = null; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = mem; } this.data = Object.assign(blank(), d || {}); this.data.set = Object.assign(blank().set, this.data.set || {}); return this.data; },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { mem = this.data; } },
    reset() { const keep = this.load().set; this.data = blank(); this.data.set = keep; this.save(); try { localStorage.removeItem('hexan:elearnea-mothabet'); } catch (e) {} }
  };

  /* ------------------------------------------------------------ learning engine (from Mothabet learn.js) */
  const INTERVAL = [0, 1, 3, 7, 14, 30];
  const dayNum = (dt) => { const d = dt || new Date(); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  const L = El.Learn = {
    INTERVAL, today: () => dayNum(),
    skill(id) { const d = El.store.load(); return d.skills[id] = Object.assign({ d: .25, recent: [], rounds: 0 }, d.skills[id] || {}); },
    srs(skill, item) { return El.store.load().srs[skill + '|' + item] || [0, 0, 0, 0, 0]; }, // [box, dueDay, right, wrong, seen]
    box(skill, item) { return L.srs(skill, item)[0]; },
    // Same rule as MB.recordWord: a first-try right answer moves up one Leitner box (when new or due); a miss goes back to box 1, due tomorrow.
    record(skill, item, perfect) { const d = El.store.load(), today = L.today(), r = L.srs(skill, item).slice(); r[4]++;
      if (perfect) { r[2]++; if (r[0] === 0 || r[1] <= today) { r[0] = Math.min(5, r[0] + 1); r[1] = today + INTERVAL[r[0]]; } } else { r[3]++; r[0] = 1; r[1] = today + 1; }
      d.srs[skill + '|' + item] = r; L.adapt(skill, perfect); return r; },
    // Same rule as MB.adapt: +0.025 on a first-try success, -0.1 on a miss/help, so difficulty settles where ~80% are first-try right.
    adapt(skill, perfect) { const p = L.skill(skill); p.d = clamp(p.d + (perfect ? .025 : -.1), 0, 1); p.recent.push(perfect ? 1 : 0); if (p.recent.length > 30) p.recent.shift(); },
    accRecent(skill) { const p = L.skill(skill); return p.recent.length ? p.recent.reduce((a, b) => a + b, 0) / p.recent.length : null; },
    difficulty(skill) { return L.skill(skill).d; },
    levelIndex(skill, n) { return clamp(Math.floor(L.difficulty(skill) * n), 0, n - 1); },
    // Round picker (as MB.pickRound): due reviews first (lowest box first), then unmastered (box < 3), then the rest; reviews interleaved from slot 2.
    pick(skill, pool, n, rng) { rng = rng || El.rng(); const today = L.today();
      const due = rng.shuffle(pool.filter(it => { const r = L.srs(skill, it); return r[0] >= 1 && r[1] <= today; })).sort((a, b) => L.box(skill, a) - L.box(skill, b)).slice(0, Math.ceil(n / 3));
      const key = (it) => { const b = L.box(skill, it), r = L.srs(skill, it); return (b >= 4 ? 40 : b >= 3 ? 20 : 0) + (r[1] > today ? 6 : 0) + rng.next() * 3; };
      const rest = pool.filter(it => !due.includes(it)).sort((a, b) => key(a) - key(b));
      const head = rest.slice(0, Math.max(0, n - due.length)); due.forEach((it, k) => head.splice(Math.min(head.length, 1 + k * 3), 0, it));
      while (head.length < n && pool.length) head.push(rng.pick(pool)); return head.slice(0, n); },
    mastery(skill, pool) { if (!pool.length) return 0; return pool.filter(it => L.box(skill, it) >= 3).length / pool.length; },
    touchStreak() { const d = El.store.load(), t = L.today(), s = d.streak; if (s.last === t) return; s.cur = s.last === t - 1 ? s.cur + 1 : 1; s.last = t; s.best = Math.max(s.best, s.cur); },
    streakNow() { const s = El.store.load().streak; return s.last >= L.today() - 1 ? s.cur : 0; },
    lesson(id) { return El.store.load().lessons[id] || null; },
    lessonDone(id, res) { const d = El.store.load(), cur = d.lessons[id] || { stars: 0, plays: 0, best: 0 };
      cur.plays++; cur.stars = Math.max(cur.stars, res.stars | 0); cur.best = Math.max(cur.best, res.acc | 0); cur.last = L.today(); d.lessons[id] = cur;
      const day = d.days[L.today()] = d.days[L.today()] || { plays: 0, items: 0, secs: 0 }; day.plays++; day.items += res.total | 0; day.secs = (day.secs | 0) + (res.secs | 0);
      // activity log for the grown-ups dashboard / portfolio (lesson ids and numbers only; no names, no free text)
      d.log = d.log || []; d.log.push({ t: Date.now(), l: id, s: res.stars | 0, a: res.acc | 0, n: res.total | 0, sec: res.secs | 0 }); if (d.log.length > 300) d.log.splice(0, d.log.length - 300);
      L.touchStreak(); El.store.save(); return cur; },
    totalStars() { return Object.values(El.store.load().lessons).reduce((a, l) => a + (l.stars | 0), 0); },
    starsFor(acc, done, total) { if (!done) return 0; const a = acc / 100; return done >= total && a >= .9 ? 3 : a >= .7 ? 2 : 1; }
  };

  /* ------------------------------------------------------------ voice: a thin wrapper over the shared voice module (voice/voice.js).
     All speech goes through ElVoice: recorded clips listed in voice/manifest.json first, this device's on-device voice as fallback. */
  const V = El.Voice = {
    get core() { return root.ElVoice || null; },
    get ok() { return El.store.load().set.voice && !!(this.core && this.core.available); },
    get clips() { return !!(this.core && this.core.ready); },
    init() { if (this.core) this.core.init(); },
    onChange(f) { if (this.core) this.core.onChange(f); },
    // say(text | [line, line], {rate, pitch, onend}) -> false when nothing can be heard (callers show a visual cue).
    say(text, o) { o = o || {}; const set = El.store.load().set;
      if (!set.voice || !this.core || !text) { this.stop(); if (o.onend) setTimeout(o.onend, 10); return false; }
      this.core.rate = set.rate || 1; return this.core.say(text, o); },
    stop() { if (this.core) this.core.stop(); }
  };
  root.addEventListener('pagehide', () => V.stop());

  /* ------------------------------------------------------------ synthesized sound (WebAudio, no files) */
  let AC = null;
  const ac = () => { if (!AC) { const C = root.AudioContext || root.webkitAudioContext; if (!C) return null; AC = new C(); } if (AC.state === 'suspended') AC.resume().catch(() => {}); return AC; };
  root.addEventListener('pointerdown', () => { if (El.store.load().set.sound) ac(); }, { capture: true, passive: true });
  function tone(o) { if (!El.store.load().set.sound) return; const c = ac(); if (!c) return; const t = c.currentTime + (o.delay || 0), g = c.createGain(), osc = c.createOscillator();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.freq, t); if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol || .15, t + .015); g.gain.exponentialRampToValueAtTime(.0008, t + o.dur);
    osc.connect(g); g.connect(c.destination); osc.start(t); osc.stop(t + o.dur + .05); }
  El.audio = () => (El.store.load().set.sound ? ac() : null); // shared AudioContext for game sound modules (null when sound is off)
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
  El.sfx = {
    tap() { tone({ freq: 740, to: 880, dur: .08, vol: .08 }); },
    step(k) { const f = 523.25 * Math.pow(2, PENTA[Math.min(k, 9)] / 12); tone({ freq: f, dur: .3, vol: .16 }); tone({ type: 'triangle', freq: f * 2, dur: .18, vol: .05, delay: .03 }); },
    right() { [0, 4, 7, 12].forEach((s, i) => tone({ freq: 659.25 * Math.pow(2, s / 12), dur: .42, vol: .13, delay: i * .07 })); },
    wrong() { tone({ type: 'triangle', freq: 300, to: 210, dur: .22, vol: .12 }); },
    hop() { tone({ freq: 300, to: 720, dur: .18, vol: .12 }); },
    splash() { tone({ type: 'triangle', freq: 900, to: 300, dur: .25, vol: .06 }); },
    win() { [12, 7, 4, 0, 4, 7, 12, 16].forEach((s, i) => tone({ freq: 392 * Math.pow(2, s / 12), dur: .5, vol: .1, delay: i * .1 })); },
    tone // raw synth voice for game-specific sounds (respects the sound setting)
  };

  /* ------------------------------------------------------------ icons (inline SVG, original) */
  const I = {
    back: '<path d="M30 12 14 26l16 14" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 26h20" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>',
    home: '<path d="M8 25 26 9l18 16" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 23v19h10V31h6v11h10V23" fill="currentColor"/>',
    sound: '<path d="M8 19h8l11-9v32l-11-9H8z" fill="currentColor"/><path d="M33 18c3 2 4 5 4 8s-1 6-4 8M38 12c5 4 7 9 7 14s-2 10-7 14" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>',
    mute: '<path d="M8 19h8l11-9v32l-11-9H8z" fill="currentColor"/><path d="m34 20 10 12m0-12L34 32" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    lock: '<rect x="11" y="22" width="30" height="22" rx="6" fill="currentColor"/><path d="M17 22v-6a9 9 0 0 1 18 0v6" fill="none" stroke="currentColor" stroke-width="6"/><circle cx="26" cy="32" r="3.5" fill="#fff" opacity=".85"/>',
    play: '<path d="M17 10v32l26-16z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>',
    star: '<path d="m26 5 6.4 13.3 14.6 2-10.6 10.2 2.6 14.5L26 38.1 13 45l2.6-14.5L5 20.3l14.6-2z" fill="currentColor"/>',
    flame: '<path d="M26 5c3 9 13 13 13 25a13 13 0 0 1-26 0c0-6 3-9 5-12 1 4 3 6 5 6-2-7 0-13 3-19z" fill="#F08A7E"/><path d="M26 25c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 0 2 1 3 2 3 0-3 0-5 1-7z" fill="#F5B841"/>',
    book: '<path d="M6 12c7-2 14-1 20 4v28c-6-5-13-6-20-4z" fill="currentColor"/><path d="M46 12c-7-2-14-1-20 4v28c6-5 13-6 20-4z" fill="currentColor" opacity=".78"/>',
    numbers: '<rect x="6" y="6" width="18" height="18" rx="4" fill="#F5B841"/><rect x="28" y="6" width="18" height="18" rx="4" fill="#7CC4A4"/><rect x="6" y="28" width="18" height="18" rx="4" fill="#F08A7E"/><rect x="28" y="28" width="18" height="18" rx="4" fill="#9B8AD1"/><text x="15" y="21" font-size="14" font-weight="900" text-anchor="middle" fill="#2A2152" font-family="Nunito,sans-serif">1</text><text x="37" y="21" font-size="14" font-weight="900" text-anchor="middle" fill="#2A2152" font-family="Nunito,sans-serif">2</text><text x="15" y="43" font-size="14" font-weight="900" text-anchor="middle" fill="#2A2152" font-family="Nunito,sans-serif">3</text><text x="37" y="43" font-size="14" font-weight="900" text-anchor="middle" fill="#fff" font-family="Nunito,sans-serif">4</text>',
    leaf: '<path d="M10 42C8 22 22 8 44 8c0 22-14 36-34 34z" fill="currentColor"/><path d="M12 40 34 18" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>',
    palette: '<path d="M26 6C14 6 5 14 5 25c0 10 8 19 18 19 3 0 4-2 3-4-1-3 1-5 4-5h5c6 0 11-5 11-11C46 13 37 6 26 6z" fill="currentColor"/><circle cx="15" cy="23" r="3.5" fill="#F08A7E"/><circle cx="21" cy="14" r="3.5" fill="#F5B841"/><circle cx="32" cy="14" r="3.5" fill="#7CC4A4"/><circle cx="38" cy="23" r="3.5" fill="#9B8AD1"/>',
    globe: '<circle cx="26" cy="26" r="19" fill="#5DA9D6"/><path d="M15 15c5 1 7 5 5 8s2 6 6 5 3 7-1 9c-6-1-11-6-12-12 0-4 1-7 2-10zM31 9c4 2 3 6 7 7 3 1 5 4 5 8-3 1-6-1-8-3s-6-1-6-5 0-5 2-7z" fill="#7CC4A4"/>',
    puzzle: '<path d="M9 17h9a5 5 0 1 1 10 0h9v9a5 5 0 1 0 0 10v9H28a5 5 0 1 0-10 0H9V35a5 5 0 1 1 0-10z" fill="currentColor"/>',
    ear: '<path d="M16 22a12 12 0 0 1 24 0c0 8-8 9-8 16a7 7 0 0 1-12 3" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M22 22a6 6 0 0 1 12 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    moth: '<ellipse cx="26" cy="27" rx="3.5" ry="11" fill="#2A2152"/><path d="M24 22C17 9 5 11 6 20c1 7 8 9 18 6zM28 22c7-13 19-11 18-2-1 7-8 9-18 6zM24 29c-7 2-13 6-10 11 3 4 8 1 10-6zM28 29c7 2 13 6 10 11-3 4-8 1-10-6z" fill="currentColor"/>',
    frog: '<ellipse cx="26" cy="31" rx="18" ry="12" fill="currentColor"/><circle cx="17" cy="18" r="7" fill="currentColor"/><circle cx="35" cy="18" r="7" fill="currentColor"/><circle cx="17" cy="18" r="3" fill="#2A2152"/><circle cx="35" cy="18" r="3" fill="#2A2152"/><path d="M17 33c5 4 13 4 18 0" fill="none" stroke="#2A2152" stroke-width="3" stroke-linecap="round"/>',
    pencil: '<path d="m10 42 3-10 23-23 7 7-23 23z" fill="currentColor"/><path d="m10 42 3-10 7 7z" fill="#F6EBD9"/>',
    firefly: '<circle cx="26" cy="30" r="13" fill="#F5B841" opacity=".35"/><circle cx="26" cy="30" r="7" fill="#FFE28A"/><ellipse cx="19" cy="17" rx="6" ry="9" fill="#F6EBD9" opacity=".85" transform="rotate(-25 19 17)"/><ellipse cx="33" cy="17" rx="6" ry="9" fill="#F6EBD9" opacity=".85" transform="rotate(25 33 17)"/>',
    plus: '<path d="M26 10v32M10 26h32" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>',
    clock: '<circle cx="26" cy="26" r="19" fill="currentColor"/><path d="M26 14v13l8 5" fill="none" stroke="#2A2152" stroke-width="4.5" stroke-linecap="round"/>',
    chest: '<rect x="7" y="22" width="38" height="22" rx="4" fill="#B5733A"/><path d="M7 24c0-10 8-14 19-14s19 4 19 14z" fill="#8E5427"/><rect x="22" y="22" width="8" height="10" rx="2" fill="#F5B841"/>',
    backpack: '<path d="M19 13v-2a7 7 0 0 1 14 0v2" fill="none" stroke="#2A2152" stroke-width="4"/><rect x="9" y="13" width="34" height="34" rx="11" fill="#B5733A"/><path d="M9 26c0-8 6-13 17-13s17 5 17 13v3H9z" fill="#8E5427"/><rect x="16" y="32" width="20" height="11" rx="4" fill="#D9A066"/><rect x="23" y="25" width="6" height="8" rx="2" fill="#F5B841"/>',
    gear: '<path d="M26 16a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" fill="none" stroke="currentColor" stroke-width="7"/><path d="M26 4v8M26 40v8M4 26h8M40 26h8M10 10l6 6M36 36l6 6M42 10l-6 6M16 36l-6 6" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>',
    again: '<path d="M40 22a15 15 0 1 0-2 13" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><path d="M42 10v13H29" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
    map: '<path d="M6 12l13-5 14 5 13-5v33l-13 5-14-5-13 5z" fill="currentColor"/><path d="M19 7v33M33 12v33" stroke="#2A2152" stroke-width="3" opacity=".35"/>',
    shapes: '<circle cx="16" cy="16" r="10" fill="#F08A7E"/><rect x="28" y="6" width="19" height="19" rx="2" fill="#7CC4A4"/><path d="M26 28 38 47H14z" fill="#F5B841" stroke="#F5B841" stroke-width="3" stroke-linejoin="round"/>',
    moon: '<path d="M33 7a19 19 0 1 0 12 26A16 16 0 0 1 33 7z" fill="currentColor"/>',
    arrow: '<path d="M26 6 44 25H33v21H19V25H8z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>',
    steps: '<path d="M8 44h12V32h12V20h12V8" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="44" cy="8" r="6" fill="#F5B841"/>',
    bug: '<ellipse cx="26" cy="30" rx="16" ry="17" fill="#F08A7E"/><path d="M26 13v34" stroke="#2A2152" stroke-width="3"/><circle cx="26" cy="12" r="8" fill="#2A2152"/><circle cx="19" cy="26" r="3.5" fill="#2A2152"/><circle cx="33" cy="26" r="3.5" fill="#2A2152"/><circle cx="20" cy="37" r="3" fill="#2A2152"/><circle cx="32" cy="37" r="3" fill="#2A2152"/>',
    loop: '<path d="M14 30a14 14 0 1 1 6 10" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M6 24l8 9 9-8" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  El.icon = (n, cls) => `<svg viewBox="0 0 52 52" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${I[n] || I.star}</svg>`;

  /* ------------------------------------------------------------ age bands (parent-set in the grown-ups area; picture switch on the map).
     Stored on this device only (no birthday, no name). 'explorer' = ages 4-9 (K-3); 'little' = Little Lanterns, ages 2-4;
     'tiny' = Little Lanterns, under 2, play-together lessons (a grown-up plays with the child). */
  El.BANDS = { explorer: { name: 'Explorers', ages: '4–9' }, little: { name: 'Little Lanterns', ages: '2–4' }, tiny: { name: 'Little Lanterns', ages: 'under 2, play together' } };
  El.band = () => { const s = El.store.load().set; return s.band === 'little' ? (s.little === 'tiny' ? 'tiny' : 'little') : 'explorer'; };
  El.isLittle = () => El.band() !== 'explorer';
  El.setBand = (b) => { const s = El.store.load().set; if (b === 'explorer') s.band = 'explorer'; else { s.band = 'little'; if (b === 'tiny' || b === 'little') s.little = b; } El.store.save(); CAT = null; };
  // a lesson's bands: lesson.bands, else its skill's bands, else ['explorer']
  const inBand = (ls, b) => (ls.bands || ['explorer']).includes(b);

  /* ------------------------------------------------------------ catalog */
  let CAT = null;
  El.catalog = async function () { if (CAT) return CAT; const r = await fetch(El.url('content/catalog.json'), { cache: 'no-cache' }); const c = await r.json();
    c.realms = c.subjects.map(s => Object.assign({ subject: s.id }, s.realm)); c.lessons = {}; c.order = {}; c.orderAll = {}; c.band = El.band();
    // c.order[realm] = the path for the current age band; c.orderAll[realm] = every lesson (grown-ups records)
    for (const rm of c.realms) { c.order[rm.id] = []; c.orderAll[rm.id] = []; for (const sk of rm.skills || []) for (const ls of sk.lessons) { Object.assign(ls, { skill: sk.id, skillName: sk.name, realm: rm.id, bands: ls.bands || sk.bands || ['explorer'] }); c.lessons[ls.id] = ls; c.orderAll[rm.id].push(ls); if (inBand(ls, c.band)) c.order[rm.id].push(ls); } }
    return (CAT = c); };
  // Path state: done (has stars), current (first not done & unlocked), open, locked. A lesson unlocks when the previous one has a star.
  El.pathState = function (cat, realmId) { const list = cat.order[realmId] || [], d = El.store.load(); let prevDone = true, cur = null;
    return list.map((ls, i) => { const rec = d.lessons[ls.id]; const done = !!(rec && rec.stars > 0); const open = i === 0 || prevDone || d.demoUnlock || i < 2;
      let st = done ? 'done' : open ? 'open' : 'locked'; if (!done && open && !cur) { cur = ls.id; st = 'current'; } prevDone = done; return { ls, st, stars: rec ? rec.stars : 0 }; }); };
  El.realmProgress = function (cat, realmId) { const s = El.pathState(cat, realmId); if (!s.length) return 0; return Math.round(100 * s.reduce((a, x) => a + x.stars, 0) / (s.length * 3)); };

  /* ------------------------------------------------------------ UI helpers */
  El.ui = {
    sky(n) { const s = document.createElement('div'); s.className = 'stars'; const r = El.rng(7); let h = '';
      for (let i = 0; i < (n || 46); i++) h += `<i class="${i % 7 === 0 ? 's' : ''}" style="left:${(r.next() * 100).toFixed(1)}%;top:${(r.next() * 100).toFixed(1)}%;animation-delay:${(r.next() * 3).toFixed(2)}s"></i>`;
      s.innerHTML = h; document.body.prepend(s);
      const f = document.createElement('div'); f.className = 'fireflies'; h = ''; for (let i = 0; i < 12; i++) h += `<i style="left:${(r.next() * 100).toFixed(1)}%;top:${(r.next() * 100).toFixed(1)}%;animation-duration:${(6 + r.next() * 6).toFixed(1)}s;animation-delay:-${(r.next() * 6).toFixed(1)}s"></i>`;
      f.innerHTML = h; document.body.prepend(f); },
    toast(text, ms) { let t = document.getElementById('el-toast'); if (!t) { t = document.createElement('div'); t.id = 'el-toast'; t.className = 'toast'; t.innerHTML = '<div class="bubble"></div>'; document.body.appendChild(t); }
      t.firstChild.textContent = text; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), ms || 2600); },
    // picture-first: every button with data-say speaks its label for non-readers
    speakable(rootEl) { (rootEl || document).addEventListener('click', (e) => { const b = e.target.closest('[data-say]'); if (b) V.say(b.getAttribute('data-say'), { rate: 1 }); }, true); },
    soundBtn(btn) { const d = El.store.load(); const paint = () => { const on = d.set.voice || d.set.sound; btn.innerHTML = El.icon(on ? 'sound' : 'mute'); btn.setAttribute('aria-label', on ? 'Sound on' : 'Sound off'); };
      paint(); btn.addEventListener('click', () => { const on = !(d.set.voice || d.set.sound); d.set.voice = d.set.sound = on; El.store.save(); paint(); if (on) { El.sfx.tap(); V.say('Sound on!'); } else V.stop(); root.dispatchEvent(new CustomEvent('el:sound', { detail: { on } })); }); }
  };

  /* ------------------------------------------------------------ game host (shared contract) */
  El.games = {};
  El.defineGame = (mod) => { El.games[mod.id] = mod; return mod; };
  El.Host = {
    async run(gameId, stage, ui) {
      const cat = await El.catalog(); const q = new URLSearchParams(location.search);
      let ls = cat.lessons[q.get('lesson')]; if (!ls || ls.game.id !== gameId) ls = Object.values(cat.lessons).find(l => l.game.id === gameId);
      const mod = El.games[gameId]; const back = El.url('realm/' + ls.realm + '/');
      const config = Object.assign({ lesson: ls.id, skill: ls.skill, grade: ls.grade, standards: ls.standards, bands: ls.bands, little: !ls.bands.includes('explorer'), catalog: cat }, ls.game.config);
      let inst = null, stats = { done: 0, total: 0, first: 0 }, t0 = Date.now();
      const host = {
        root: stage, say: (t, o) => V.say(t, o), sfx: El.sfx, learn: L, rng: El.rng(), voiceOk: () => V.ok,
        emit(type, ev) {
          if (type === 'progress') { stats.done = ev.done; stats.total = ev.total; ui.progress && ui.progress(ev.done, ev.total); }
          else if (type === 'mastery') { L.record(config.skill, String(ev.item), !!ev.firstTry); El.store.save(); }
          root.dispatchEvent(new CustomEvent('el:' + type, { detail: ev }));
        },
        end(res) {
          // nothing attempted (e.g. the timer ran out before the first word was touched): no stars, no lesson record, no log entry
          if (!res.total) { root.dispatchEvent(new CustomEvent('el:end', { detail: Object.assign({ stars: 0, acc: 0, empty: true }, res) })); ui.results && ui.results({ stars: 0, acc: 0, res: Object.assign({ empty: true }, res), rec: null, again: () => { t0 = Date.now(); stage.innerHTML = ''; inst = mod.start(config, host); }, back }); return; }
          const acc = res.total ? Math.round(100 * res.firstTry / res.total) : 0; const stars = res.stars != null ? res.stars : L.starsFor(acc, res.done != null ? res.done : res.total, res.total);
          const secs = Math.min(1800, Math.round((Date.now() - t0) / 1000)); t0 = Date.now(); const rec = L.lessonDone(config.lesson, { stars, acc, total: res.total, secs }); root.dispatchEvent(new CustomEvent('el:end', { detail: Object.assign({ stars, acc }, res) }));
          ui.results && ui.results({ stars, acc, res, rec, again: () => { t0 = Date.now(); stage.innerHTML = ''; inst = mod.start(config, host); }, back }); }
      };
      ui.setBack && ui.setBack(back); ui.title && ui.title(ls);
      inst = mod.start(config, host); return { ls, config, host, stop: () => inst && inst.stop && inst.stop() };
    }
  };

  /* ------------------------------------------------------------ boot */
  V.init();
  if ('serviceWorker' in navigator && location.protocol === 'https:') { root.addEventListener('load', () => { navigator.serviceWorker.register(El.url('sw.js')).catch(() => {}); }); }
})(window);
