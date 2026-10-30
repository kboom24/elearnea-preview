#!/usr/bin/env node
/* Builds voice/manifest.json: EVERY line the app can speak, with where/when it plays, its type, its clip file, the current
   source (provider/voice) and whether it needs a human ear check. Re-run after changing any spoken text, game word list or
   catalog. It keeps the per-line render/source/check results of the previous manifest (matched by key).
   Then writes voice/index.json (runtime lookup: normalized text key -> id) and VOICE-MANIFEST.md (human-readable).
   Usage: node tools/voice/build-manifest.js            (paths are relative to the app repo) */
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const APP = path.resolve(__dirname, '../..'), SRC = path.join(APP, 'play/mothabet/game'); // versioned Mothabet source in this repo (was the untracked seed /home/box/elearnea/seed/mothabet-src)
const OUT = path.join(APP, 'voice/manifest.json'), INDEX = path.join(APP, 'voice/index.json');
const MD = process.env.VOICE_MD || path.resolve(APP, '../VOICE-MANIFEST.md'); // VOICE_MD / EL_CSV env: branch-local outputs (keep the shared files untouched)
// Standard voice (Hexan, 2026-10-29): Kokoro-82M (Apache-2.0), voice af_bella. Mothabet clips come from the separate Mothabet Bella batch
// (script: MB_CSV, files: MB_DIR, copied into app/voice/mb/ by import-mothabet.js); every other line is rendered from this manifest with say.py.
const norm = (s) => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const VOICE = { kind: 'kokoro', voice: 'af_bella', label: 'kokoro af_bella', model: 'Kokoro-82M', license: 'Apache-2.0', speed: 0.76, speedNote: 'standard speed 0.76 for all lines (Hexan 2026-10-29; was 0.88)' };
const MB_CSV = process.env.MB_CSV || '/workspace/mothabet-voice/mothabet-voice-script.csv';
const MB_DIR = process.env.MB_DIR || '/home/box/elearnea/voice/mothabet/bella-076';
// Per-clip source + ASR status for every Mothabet clip the app uses (written by /home/box/elearnea/voice/tools/mb-status.py):
// file, dir, set, status (pass | fixed | flagged | unverified), reason, text, ipa, speed. 'flagged' clips are held back (device speech) until a human listens.
const MB_STATUS_F = process.env.MB_STATUS || '/home/box/elearnea/voice/mothabet/clip-status.tsv';
const MB_STATUS = {}; if (fs.existsSync(MB_STATUS_F)) { const ls = fs.readFileSync(MB_STATUS_F, 'utf8').split(/\r?\n/).filter(Boolean); const h = ls.shift().split('\t'); for (const l of ls) { const c = l.split('\t'); MB_STATUS[c[0]] = Object.fromEntries(h.map((k, i) => [k, c[i] || ''])); } }
const FIRST_NOTE = 'wording approved by Hexan 2026-10-29';
const EL_CSV = process.env.EL_CSV || path.resolve(APP, '../voice/elearnea-lines.csv');
function readCsv(f) { const t = fs.readFileSync(f, 'utf8'); const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some(x => x !== '')) rows.push(row); row = []; } else cur += c; }
  if (cur || row.length) { row.push(cur); rows.push(row); } const h = rows.shift(); return rows.map(r => Object.fromEntries(h.map((k, i) => [k, r[i]]))); }
const mbRows = fs.existsSync(MB_CSV) ? readCsv(MB_CSV) : [];
const mbByText = {}; for (const r of mbRows) { const k = r.type + '|' + norm(r.text_to_speak); if (!mbByText[k]) mbByText[k] = r.filename; }
const mbFile = (type, text) => mbByText[type + '|' + norm(text)] || null;
const mbRow = Object.fromEntries(mbRows.map(r => [r.filename, r]));
const usedMb = new Set();

// ---- load Mothabet data (words.js + learn.js) in a sandbox
const ctx = { window: {}, console }; ctx.window.window = ctx.window; ctx.window.HX = { Daily: { key: () => '2026-10-29' }, RNG: () => ({ next: Math.random, pick: a => a[0], shuffle: a => a, int: a => a }) }; ctx.HX = ctx.window.HX;
vm.createContext(ctx); for (const f of ['words.js', 'learn.js']) vm.runInContext(fs.readFileSync(`${SRC}/${f}`, 'utf8'), ctx);
const MB = ctx.window.MB;
const cat = JSON.parse(fs.readFileSync(`${APP}/content/catalog.json`, 'utf8'));
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { items: [] }; const prevBy = new Map(prev.items.map(x => [x.key, x]));

const items = new Map(), ids = new Set();
const slug = (s) => s.replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function mkId(prefix, key) { let s = slug(key) || 'x'; if (s.length > 44) s = s.slice(0, 36).replace(/-$/, '') + '-' + crypto.createHash('sha1').update(key).digest('hex').slice(0, 6); let id = `${prefix}.${s}`, n = 2; while (ids.has(id)) id = `${prefix}.${s}-${n++}`; ids.add(id); return id; }
/* add(text, {type, game, screen, trigger, render, ipa, example, needsId, prefix, reserved}) */
function add(text, m) { const key = m.reserved ? 'reserved ' + m.needsId : norm(text); if (!key) return;
  const use = { game: m.game, screen: m.screen, trigger: m.trigger };
  let it = items.get(key);
  if (!it) { const p = prevBy.get(key);
    it = { id: p && p.id && !ids.has(p.id) ? (ids.add(p.id), p.id) : mkId(m.prefix || m.game, key), key, text, render: m.render || text, type: m.type, uses: [],
      ...(m.ipa ? { ipa: m.ipa } : {}), ...(m.note ? { note: m.note } : {}), ...(m.example ? { example: m.example } : {}), ...(m.needsId ? { audioNeedsId: m.needsId } : {}), ...(m.reserved ? { reserved: true } : {}), ...(m.parts !== undefined ? { parts: m.parts } : {}),
      file: null, source: p && p.source ? p.source : { kind: 'device-speech' }, check: { human: false, reasons: [] }, _prev: p };
    items.set(key, it); }
  if (m.parts && !it.parts) it.parts = m.parts;
  if (!it.uses.some(u => u.game === use.game && u.screen === use.screen && u.trigger === use.trigger)) it.uses.push(use);
  return it; }
const NW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/* ================= Elearnea shell: landing, map, realm paths, play shell ================= */
const G = 'elearnea';
for (const s of cat.subjects) { const r = s.realm;
  add(r.say, { type: 'instruction', game: G, prefix: 'el', screen: 'World map', trigger: `tap the ${r.name} island` });
  for (const sk of r.skills || []) for (const ls of sk.lessons) add(ls.say || ls.name, { type: 'instruction', game: G, prefix: 'el', screen: `${r.name} realm path`, trigger: `tap lesson stop "${ls.name}" (also tap Wick when it is the current stop)` }); }
add("Hi! I'm Wick. Tap a land to play!", { type: 'instruction', game: G, prefix: 'el', screen: 'World map', trigger: 'tap Wick' });
add('Days in a row', { type: 'label', game: G, prefix: 'el', screen: 'World map / realm HUD', trigger: 'tap the streak pill' });
add('Your stars', { type: 'label', game: G, prefix: 'el', screen: 'World map / realm HUD', trigger: 'tap the stars pill' });
add('Your backpack', { type: 'label', game: G, prefix: 'el', screen: 'World map', trigger: 'tap the backpack button' });
add('Back to the map', { type: 'label', game: G, prefix: 'el', screen: 'Realm path top bar', trigger: 'tap the back button' });
add('Back to the path', { type: 'label', game: G, prefix: 'el', screen: 'Game results card', trigger: 'tap Path' });
add('Again!', { type: 'label', game: G, prefix: 'el', screen: 'Game results card', trigger: 'tap Again' });
add('Sound on!', { type: 'label', game: G, prefix: 'el', screen: 'Any page with the sound button', trigger: 'turn sound on' });
add('Finish the glowing one first!', { type: 'feedback', game: G, prefix: 'el', screen: 'Realm path', trigger: 'tap a locked stop' });
add('A treasure! Finish the path to open it.', { type: 'instruction', game: G, prefix: 'el', screen: 'Realm path', trigger: 'tap the treasure chest' });
add('Coming soon!', { type: 'feedback', game: G, prefix: 'el', screen: 'World map / realm path', trigger: 'tap a coming-soon island or stop' });
add("Your lantern shows how much you've learned!", { type: 'instruction', game: G, prefix: 'el', screen: 'Realm path', trigger: 'tap the lantern' });
for (const msg of ['Wonderful!', 'Great job!', 'Good try!']) for (let s = 0; s <= 3; s++) add(`${msg} You earned ${s} star${s === 1 ? '' : 's'}!`, { type: 'praise', game: G, prefix: 'el', render: `${msg} You earned ${NW[s]} star${s === 1 ? '' : 's'}!`, screen: 'Game results card (Lily Pad Hop, Firefly Count)', trigger: 'round ends' });

/* ================= Lily Pad Hop ================= */
const L = 'lily-pad-hop';
const lw = new Set(); Object.values(cat.wordLists).forEach(l => l.words.forEach(w => lw.add(w))); Object.values(cat.confusables).forEach(a => a.forEach(w => lw.add(w))); Object.keys(cat.confusables).forEach(w => lw.add(w));
for (const w of [...lw].sort()) {
  add(`Find... ${w}`, { type: 'instruction', game: L, prefix: 'lily', render: `Find... ${w}.`, screen: 'Lily Pad Hop round', trigger: 'new round starts; tap the frog/ear to hear it again; 2nd half of the wrong-pad line' });
  add(`${w}! Yes!`, { type: 'praise', game: L, prefix: 'lily', screen: 'Lily Pad Hop round', trigger: 'correct pad tapped (frog hops)' });
  add(`That says ${w}.`, { type: 'feedback', game: L, prefix: 'lily', screen: 'Lily Pad Hop round', trigger: `wrong pad tapped (followed by "Find... <target>")` }); }

/* ================= Firefly Count ================= */
const F = 'firefly-count';
for (const [t, tr] of [['Tap each firefly to put it in the jar!', 'count round starts'], ['How many fireflies are in the jar?', 'all fireflies are in the jar'], ["Let's count together.", 'wrong answer (count-along starts)'],
  ['How many?', 'after the count-along'], ['Here it is!', '2nd wrong answer: the right number glows'], ['How many in all?', 'add round: after the count-along'], ["Let's pour them in and count.", 'add round: wrong answer']])
  add(t, { type: 'instruction', game: F, prefix: 'ff', screen: 'Firefly Count round', trigger: tr });
for (let n = 1; n <= 10; n++) { add(NW[n], { type: 'number', game: F, prefix: 'ff', screen: 'Firefly Count round', trigger: 'each firefly tapped into the jar / count-along' });
  add(`Yes! ${NW[n]}!`, { type: 'praise', game: F, prefix: 'ff', screen: 'Firefly Count round', trigger: 'correct answer' }); }
for (let a = 1; a < 10; a++) for (let b = 1; a + b <= 10; b++) add(`${NW[a]} ${a === 1 ? 'firefly' : 'fireflies'} and ${NW[b]} more. How many in all?`, { type: 'instruction', game: F, prefix: 'ff', screen: 'Firefly Count add round (Add within 5/10)', trigger: 'add round starts' });

/* ================= Clocktower Gears (Math: patterns, shape names, shape sort) ================= */
const CG = 'clocktower-gears', CGS = ['circle', 'square', 'triangle', 'rectangle', 'hexagon'];
const CGFACT = { circle: 'Round, with no corners. A circle!', square: 'Four sides, all the same. A square!', triangle: 'Three sides. A triangle!', rectangle: 'Four sides. Two long, two short. A rectangle!', hexagon: 'Six sides. A hexagon!' };
for (const [t, sc, tr, ty] of [['Fix the gears! What comes next?', 'pattern round', 'first pattern of the round'], ['What comes next?', 'pattern round', 'each next pattern; after Wick sings the pattern'],
  ['Listen to the pattern.', 'pattern round', '1st wrong gear (Wick then sings the shapes along the gears)', 'feedback'], ['This one fits!', 'pattern round', '2nd wrong gear: the right shape glows', 'feedback'],
  ['Yes! The gears turn!', 'pattern round', 'pattern fixed (random praise)', 'praise'], ['You fixed the pattern!', 'pattern round', 'pattern fixed (random praise)', 'praise'],   ["Let's count the sides.", 'shape rounds', 'find: 2nd wrong shape / sort: 1st wrong drawer (count-along starts)', 'feedback'], ['Which drawer does it go in?', 'sort round', 'each new shape; after the count-along'],
  ['Put the shape in its drawer!', 'sort round', 'first shape of the round'], ['This is a hexagon. It has six sides!', 'sort round', 'first hexagon of the round']])
  add(t, { type: ty || 'instruction', game: CG, prefix: 'cg', screen: 'Clocktower Gears ' + sc, trigger: tr });
for (const s of CGS) {
  add(s, { type: 'word', game: CG, prefix: 'cg', screen: 'Clocktower Gears pattern round', trigger: 'Wick sings the pattern: each gear\'s shape name' });
  add(`Find the ${s}!`, { type: 'instruction', game: CG, prefix: 'cg', screen: 'Clocktower Gears find round', trigger: 'new shape to find; after a wrong shape; after the count-along' });
  add(`That's a ${s}.`, { type: 'feedback', game: CG, prefix: 'cg', screen: 'Clocktower Gears find round', trigger: '1st wrong shape (names the shape tapped)' });
  add(`Yes! A ${s}!`, { type: 'praise', game: CG, prefix: 'cg', screen: 'Clocktower Gears find/sort round', trigger: 'right shape / right drawer' });
  add(CGFACT[s], { type: 'instruction', game: CG, prefix: 'cg', screen: 'Clocktower Gears find/sort round', trigger: 'count-along ends (sides counted with highlights)' }); }
for (let n = 1; n <= 6; n++) add(NW[n], { type: 'number', game: CG, prefix: 'cg', screen: 'Clocktower Gears find/sort round', trigger: 'count-along: each side highlighted' });
add('Here it is!', { type: 'feedback', game: CG, prefix: 'cg', screen: 'Clocktower Gears sort round', trigger: '2nd wrong drawer: the right drawer glows' });

/* ================= Mothabet (clips: the Mothabet Bella batch, mapped by the Mothabet voice-script CSV) ================= */
const M = 'mothabet';
const IPA = { a: 'æ', b: 'bə', c: 'kə', d: 'də', e: 'ɛ', f: 'fːːː', g: 'ɡə', h: 'hə', i: 'ɪ', j: 'dʒə', l: 'lːːː', m: 'mːːː', n: 'nːːː', o: 'ɑ', p: 'pə', qu: 'kwə', r: 'ɹː', s: 'sːːː', t: 'tə', u: 'ʌ', v: 'vːːː', w: 'wə', x: 'ks', y: 'jə', z: 'zːːː', sh: 'ʃːːː', ch: 'tʃə', th: 'θː', ng: 'ɪŋ', ee: 'iː', k: 'kə' };
const EX = { a: 'apple', e: 'egg', i: 'igloo', o: 'octopus', u: 'up', g: 'gift', y: 'yak', c: 'cat', qu: 'queen', x: 'box', th: 'thin', ng: 'ring', ee: 'tree' };
const exampleFor = (t) => EX[t] || (MB.ITEMS.find(it => it.w.startsWith(t)) || {}).w || '';
const P = (...xs) => xs.every(Boolean) ? xs : null; // all parts must exist in the Mothabet script, else null (= gap)
const ph = (tile) => mbRow['ph_' + tile + '.mp3'] ? 'ph_' + tile + '.mp3' : null;
const wf = (w) => mbFile('word', w), pr = (t) => mbFile('prompt', t);
for (const [tile, p] of Object.entries(MB.PHON)) { const ipa = IPA[tile] || null, r = ipa ? `[[ ${ipa} ]]` : p;
  add(p, { type: 'phoneme', game: M, prefix: 'mb.ph', render: r, ipa, example: `/${tile}/ as in "${exampleFor(tile)}"`, needsId: 'ph_' + tile, parts: P(ph(tile)), screen: 'Mothabet play (Phonics/Sprouts)', trigger: 'a letter moth is tapped; or the hint button' });
  add(`Try this one. ${p}.`, { type: 'instruction', game: M, prefix: 'mb.hint', render: `Try this one. ${r}.`, ipa, example: `/${tile}/ as in "${exampleFor(tile)}"`, parts: P(pr('Try this one.'), ph(tile)), screen: 'Mothabet play (Phonics/Sprouts)', trigger: 'auto hint after the child is stuck' }); }
// AUDIO-NEEDS.md phonemes the current code never speaks (reserved for later stages: vowel teams etc.).
const RES = { th_v: ['ð', 'this'], ck: ['k', 'duck'], wh: ['w', 'when'], ll: ['lːːː', 'bell'], ea: ['iː', 'leaf'], ai: ['eɪ', 'rain'], ay: ['eɪ', 'play'], oa: ['oʊ', 'boat'], ow: ['oʊ', 'snow'], oo: ['uː', 'moon'], oo_s: ['ʊ', 'book'], ar: ['ɑːɹ', 'star'], ir_er_ur: ['ɜːɹ', 'her'], or: ['ɔːɹ', 'corn'], a_e: ['eɪ', 'cake'], i_e: ['aɪ', 'kite'], o_e: ['oʊ', 'home'], u_e: ['juː', 'cube'], e_e: ['iː', 'these'] };
for (const [k, [ipa, ex]] of Object.entries(RES)) if (!MB.PHON[k]) add(`${k} as in ${ex}`, { type: 'phoneme', game: M, prefix: 'mb.ph-reserved', render: `[[ ${ipa} ]]`, ipa, example: `as in "${ex}"`, needsId: 'ph_' + k, reserved: true, parts: P(ph(k)), screen: '(not spoken by current code)', trigger: 'reserved in AUDIO-NEEDS.md for later stages' });
const LN = { a: 'A.', i: 'I.', qu: 'Q U.' };
const tiles = new Set(); MB.ITEMS.forEach(it => it.band === 'f' && it.tiles.forEach(t => tiles.add(t)));
for (const t of [...tiles].sort()) add(t, { type: 'letter', game: M, prefix: 'mb.letter', render: LN[t] || (t.length === 1 ? t.toUpperCase() + '.' : t.toUpperCase().split('').join(' ') + '.'), parts: MB_STATUS[`l_${t}.mp3`] ? [`l_${t}.mp3`] : null, note: MB_STATUS[`l_${t}.mp3`] ? 'Elearnea-rendered letter name (letters/lines.csv)' : undefined, screen: 'Mothabet play (Spelling/Fliers)', trigger: 'hint button: says the letter(s) needed next' });
for (const it of MB.ITEMS) { const w = it.w, st = `Mothabet ${it.band === 's' ? 'Phonics' : 'Spelling'} stage ${it.stage}`;
  add(`${w}!`, { type: 'word', game: M, prefix: 'mb.word', parts: P(wf(w)), screen: st, trigger: 'word completed (said with a cheer)' });
  if (it.kind === 'first') add(`Find the first sound in the word... ${w}... ${w}.`, { type: 'instruction', game: M, prefix: 'mb.prompt', parts: [`p_first_w_${w}.mp3`], note: FIRST_NOTE, screen: st, trigger: 'new word card (one Elearnea-rendered clip per word, no concatenation)' });
  if (it.kind === 'first' || it.kind === 'last') {
    if (it.kind === 'last') add(`Find the last sound in... ${w}.`, { type: 'instruction', game: M, prefix: 'mb.prompt', parts: P(pr('Find the last sound in...'), wf(w)), screen: st, trigger: 'new word card' });
    add(`${w}. ${w}.`, { type: 'word', game: M, prefix: 'mb.word2', parts: P(wf(w), wf(w)), screen: st, trigger: 'tap the picture card to hear the word again' }); }
  else if (it.kind === 'build') { add(`Build... ${w}.`, { type: 'instruction', game: M, prefix: 'mb.prompt', parts: P(pr('Build...'), wf(w)), screen: st, trigger: 'new word card' });
    add(`${w}.`, { type: 'word', game: M, prefix: 'mb.word', parts: P(wf(w)), screen: st, trigger: 'tap the picture card to hear the word again' }); }
  else { const s = MB.SENT[w] || null;
    if (s) add(`${w}. ${s} ${w}.`, { type: 'sentence', game: M, prefix: 'mb.sent', parts: P(wf(w), mbFile('sentence', s), wf(w)), screen: st, trigger: 'new word card / tap the card to hear it again' });
    else add(`${w}. Spell, ${w}.`, { type: 'instruction', game: M, prefix: 'mb.spell', parts: P(wf(w), pr('Spell...'), wf(w)), screen: st, trigger: 'new word card / tap the card to hear it again' }); } }
for (const [t, sc, tr, ty] of [['Play!', 'Mothabet title', 'tap Play'], ['Phonics', 'Mothabet title / mode picker', 'tap Phonics'], ['Spelling', 'Mothabet title / mode picker', 'tap Spelling'], ['Daily jar', 'Mothabet title', 'tap Daily jar'],
  ['Moth book', 'Mothabet title / results', 'tap Moth book'], ['Go!', 'Mothabet goal card', 'tap Go'], ['Again!', 'Mothabet results', 'tap Again'], ['Next', 'Mothabet results', 'tap Next'], ['Home', 'Mothabet results', 'tap Home'], ['Try it!', 'Mothabet tutorial', 'tap Try it'],
  ['Earn a star on the stage before to open this one.', 'Mothabet stage picker', 'tap a locked stage', 'feedback'], ['This is the reading speed.', 'Mothabet grown-ups settings', 'change reading speed', 'instruction'],
  ['Look for the glowing moth.', 'Mothabet play (Spelling)', 'auto hint after the child is stuck', 'instruction'], ['The daily jar. Everyone gets the same ten words today.', 'Mothabet goal card', 'daily jar opens', 'instruction'],
  ['Catch the letter moths. Put them in the jar.', 'Mothabet goal card', 'stage opens', 'instruction'], ["Good try! Let's catch some moths.", 'Mothabet results', 'round ends with 0 words', 'praise'],
  ['Wonderful! You caught all your words!', 'Mothabet results', 'round ends with 10+ words (count shown on screen)', 'praise'], ['Great job! You caught some words!', 'Mothabet results', 'round ends with 1-9 words (count shown on screen)', 'praise']])
  add(t, { type: ty || 'label', game: M, prefix: 'mb.ui', parts: P(pr(t)), screen: sc, trigger: tr });
// Moth book text is written for reading; `render` makes it speakable for engines that need it (the Mothabet batch used its own text).
const MON = { Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' };
const letters = (t) => t.toUpperCase().split('').join(' ');
function speakable(t) { return t
  .replace(/\(([A-Z][a-z]{2})-([A-Z][a-z]{2})\)/g, (x, a, b) => `(${MON[a]} to ${MON[b]})`)
  .replace(/\b([a-z])_e\b/g, (x, v) => `${v.toUpperCase()}, silent E`)
  .replace(/"([a-z]{1,3})"/g, (x, b) => letters(b))
  .replace(/\b([a-z]{1,2})-moth\b/g, (x, b) => `${letters(b)} moth`)
  .replace(/\bBossy-R ([a-z]{2})\b/g, (x, b) => `Bossy R, ${letters(b)},`)
  .replace(/\bShort-([a-z])\b/g, (x, b) => `Short ${b.toUpperCase()}`)
  .replace(/\b([A-Z]{2}) team\b/g, (x, b) => `${b.split('').join(' ')} team`)
  .replace(/\b([a-z])-blend\b/g, (x, b) => `${b.toUpperCase()} blend`)
  .replace(/(\d+)-night/g, '$1 night').replace(/\bx(\d+)/g, 'times $1'); }
for (const m of MB.MOTHS) { add(m.name, { type: 'label', game: M, prefix: 'mb.moth', render: speakable(m.name), parts: P(mbFile('moth', m.name)), screen: 'Mothabet moth book', trigger: 'tap a collected moth' });
  add(m.how, { type: 'instruction', game: M, prefix: 'mb.moth-how', render: speakable(m.how), parts: P(mbFile('moth', m.how)), screen: 'Mothabet moth book', trigger: 'tap a moth not collected yet (how to earn it)' }); }

/* ================= Little Lanterns (ages 0-4): Lantern Barn, Picture Garden, Glow Jars + map age switch ================= */
require('./early-lines.js')({ add, APP });

/* ================= finalize ================= */
const exists = (rel) => fs.existsSync(path.join(APP, rel));
const reviewTxt = Object.keys(MB_STATUS).length ? '' : ['REVIEW.md'].map(f => path.join(MB_DIR, f)).filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
const qaFail = {}; { const f = path.join(MB_DIR, 'qa-report.tsv'); if (fs.existsSync(f)) for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/).slice(1)) { const c = l.split('\t'); if (c[5] === 'FAIL') qaFail[c[0]] = `batch QA heard "${c[3]}" for "${c[2]}"`; } }
const reviewFlag = (f) => { if (qaFail[f]) return qaFail[f]; if (!reviewTxt) return null; const base = f.replace(/\.mp3$/, ''); const line = reviewTxt.split('\n').find(l => new RegExp(`\\b${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\.mp3|\\.opus)?\\b`).test(l)); return line ? line.trim().slice(0, 160) : null; };
const elRows = [];
const out = [...items.values()].map(it => { const p = it._prev; delete it._prev; delete it.file;
  if (it.parts !== undefined || it.uses[0].game === 'mothabet') {
    // Mothabet line: played as a sequence of Mothabet Bella clips (copied to app/voice/mb/ by import-mothabet.js)
    if (it.parts) { it.files = it.parts.map(f => 'voice/mb/' + f); it.parts.forEach(f => usedMb.add(f));
      const sts = it.parts.map(f => MB_STATUS[f] || {}), sets = [...new Set(sts.map(x => x.set || 'mothabet-bella'))];
      // Hexan 2026-10-29: a short single word (w_*) or letter name (l_*) flagged only by ASR still PLAYS and is listed for a human listen
      // (Whisper is unreliable on isolated words); longer flagged clips (sentences, prompts, moth lines) are held back -> device speech.
      const shortClip = (f) => /^(w|l)_/.test(f);
      const held = [...new Set(it.parts.filter(f => (MB_STATUS[f] || {}).status === 'flagged' && !shortClip(f)))];
      it.source = !it.files.every(exists) ? { kind: 'device-speech', pending: 'Mothabet clips not imported yet' }
        : held.length ? { kind: 'device-speech', fallback: 'ASR-flagged clip held back: plays device speech until a human listens', held, wouldPlay: { label: VOICE.label, set: sets.join('+') } }
        : { kind: VOICE.kind, voice: VOICE.voice, label: VOICE.label, speed: VOICE.speed, set: sets.join('+'), csv: sets.includes('mothabet-bella-076') || sets.includes('mothabet-bella-phonemes') ? path.basename(MB_CSV) : sts[0].csv || '' };
      const fx = [...new Set(it.parts.filter(f => (MB_STATUS[f] || {}).status === 'fixed'))]; if (fx.length) it.source.respelled = fx.map(f => `${f}: "${MB_STATUS[f].text}"${MB_STATUS[f].ipa ? ' ipa ' + MB_STATUS[f].ipa : ''} @${MB_STATUS[f].speed}`);
      const ip = [...new Set(it.parts.filter(f => (MB_STATUS[f] || {}).ipa && (MB_STATUS[f] || {}).status !== 'fixed'))]; if (ip.length) it.source.ipaOverride = ip.map(f => `${f}: ${MB_STATUS[f].ipa}`); }
    else { it.parts = null; it.files = []; it.source = { kind: 'device-speech', gap: it.reserved ? 'reserved line' : 'no clip for this line in the Mothabet voice script' }; } }
  else { const f = `voice/clips/${it.id}.mp3`; it.files = [f]; elRows.push([path.basename(f), it.render.replace(/\[\[.*?\]\]/g, '').trim(), it.id]);
    it.source = exists(f) ? { kind: VOICE.kind, voice: VOICE.voice, label: VOICE.label, set: 'elearnea-lines', csv: path.basename(EL_CSV) } : { kind: 'device-speech', pending: 'not rendered with say.py yet' }; }
  const reasons = [];
  if (it.ipa || /\[\[/.test(it.render) || it.type === 'phoneme') reasons.push('phoneme: needs an ear check (pure sound, no extra vowel)');
  if (it.type === 'letter') reasons.push('letter name: check it is said as the letter, not a word');
  if (it.renderIpa) reasons.push(`weak-schwa fix (${(it.schwaFix || []).join(', ')} rendered with a final ɑ): listen that it ends in a clear "ah"`);
  for (const f of [...new Set(it.parts || [])]) { const st = MB_STATUS[f]; if (st && (st.status === 'flagged' || st.status === 'unverified')) reasons.push(`${f}: ${st.status === 'flagged' ? (/^(w|l)_/.test(f) ? 'ASR-flagged short word/letter, still plays: human listen needed' : 'ASR-flagged, held back (device speech)') : st.status}: ${st.reason}`); else if (!st) { const r = reviewFlag(f); if (r) reasons.push(`${f}: ${r}`); } }
  // speech-recognition results only count for the voice that is shipping now
  if (p && p.check && p.check.asr && p.check.asr.voice === VOICE.voice && JSON.stringify(p.files || []) === JSON.stringify(it.files)) { it.check.asr = p.check.asr; if (!p.check.asr.ok) reasons.push(`speech-recognition check heard "${p.check.asr.heard}"`); }
  // policy (Hexan 2026-10-29): a clip still ASR-flagged after the respelling retries is held back -> device speech until a human listens
  if (it.parts === undefined && it.check.asr && !it.check.asr.ok && it.source.kind === VOICE.kind) it.source = { kind: 'device-speech', fallback: 'ASR-flagged clip held back: plays device speech until a human listens', held: it.files.map(f => path.basename(f)), wouldPlay: { label: VOICE.label, voice: VOICE.voice, set: 'elearnea-lines' } };
  it.check.human = reasons.length > 0; it.check.reasons = reasons; return it; });
const byGame = {}, byType = {}; for (const it of out) { const g = it.uses[0].game; byGame[g] = (byGame[g] || 0) + 1; byType[it.type] = (byType[it.type] || 0) + 1; }
const has = (x) => x.source.kind === VOICE.kind;
const manifest = { version: 2, generated: new Date().toISOString(),
  about: 'Every spoken line in the Elearnea app (single source of truth). Code speaks text; voice/voice.js normalizes it to a key, finds the line id in voice/index.json (generated from this file) and plays the line\'s files in order. Build: tools/voice/build-manifest.js. Render: tools/voice/regen.py. Mothabet clips: tools/voice/import-mothabet.js. Coverage check: tools/voice/check.js.',
  normalize: "lowercase; curly apostrophes -> '; every character other than a-z 0-9 ' and space -> space; collapse spaces; trim",
  render: "`render` is the text a TTS engine should read. Inline IPA uses [[ ... ]] (Piper syntax), only on phoneme lines, which come from the Mothabet batch.",
  voice: VOICE, credits: 'Voice: Kokoro-82M by hexgrad (Apache-2.0), voice af_bella.',
  formats: ['opus', 'mp3'], clipFormat: 'each file ships as .mp3 and .opus (same name); voice.js plays .opus where the browser supports Ogg Opus, else .mp3',
  mothabetMapping: { csv: MB_CSV, clipsFrom: MB_DIR, clipStatus: MB_STATUS_F, extraSets: { 'elearnea-first-sound': '/home/box/elearnea/voice/mothabet/first-sound/lines.csv', 'elearnea-letters': '/home/box/elearnea/voice/mothabet/letters/lines.csv', 'elearnea-fixes': '/home/box/elearnea/voice/mothabet/fixes-076/fixes.tsv (respelling retries)', 'mothabet-bella-phonemes': 'ph_* from the original Mothabet Bella batch (pure sounds; not speed-dependent; unverified)' }, copiedTo: 'app/voice/mb/', rule: 'each Mothabet line = sequence of script clips, e.g. "sun. The sun is hot. sun." = w_sun + s_sun + w_sun; "Find the first sound in the word... sun... sun." = p_first_w_sun (one Elearnea-rendered clip, wording approved by Hexan 2026-10-29); "Find the last sound in... sun." = p_last + w_sun; "Try this one. sss." = p_try + ph_s', scriptClips: mbRows.length, usedByCode: usedMb.size },
  elearneaCsv: EL_CSV,
  counts: { total: out.length, spoken: out.filter(x => !x.reserved).length, reserved: out.filter(x => x.reserved).length, byGame, byType, needsHumanCheck: out.filter(x => x.check.human).length,
    withClip: out.filter(has).length, heldForHumanCheck: out.filter(x => x.source.fallback).length, playingButFlaggedShort: out.filter(x => !x.source.fallback && (x.parts || []).some(f => (MB_STATUS[f] || {}).status === 'flagged')).length, unverifiedPhonemes: out.filter(x => (x.parts || []).some(f => (MB_STATUS[f] || {}).status === 'unverified')).length, pending: out.filter(x => !has(x) && x.source.pending).length, gaps: out.filter(x => !x.reserved && x.source.gap).length },
  items: out };
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 1));
// CSV for say.py (filename,text) = every non-Mothabet line; ids are the file names, so a provider swap is just a re-render
fs.mkdirSync(path.dirname(EL_CSV), { recursive: true });
const q = (v) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
fs.writeFileSync(EL_CSV, 'filename,text\n' + elRows.map(r => `${q(r[0])},${q(r[1])}`).join('\n') + '\n');
// runtime index: every spoken key -> id; files only for lines whose clips are all present (others fall back to device speech)
const map = {}, files = {}; for (const it of out) { if (it.reserved) continue; map[it.key] = it.id; if (has(it)) files[it.id] = it.files.map(f => f.replace(/^voice\//, '').replace(/\.mp3$/, '')); }
for (const [id, fl] of Object.entries(files)) if (fl.length === 1 && fl[0] === 'clips/' + id) files[id] = 1; // default path, saves bytes
fs.writeFileSync(INDEX, JSON.stringify({ v: 2, voice: VOICE.label, generated: manifest.generated, formats: manifest.formats, map, files }));
require('./write-md.js')(manifest, MD);
console.log(JSON.stringify(manifest.counts));
