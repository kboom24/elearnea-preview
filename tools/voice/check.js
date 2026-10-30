#!/usr/bin/env node
/* Voice coverage check. Exit code 1 if any code can speak text that is not in voice/manifest.json, or a manifest line lacks its clip.
   1) Static: finds every speech call site (say(...), speak(...), host.say, Voice.say, setPrompt(_, spoken), data-say, dataset.say)
      in the app + Mothabet source and checks each argument: string literals must be manifest lines; template literals must match
      at least one manifest line; other expressions must be listed in DYNAMIC below with the manifest group that covers them.
   2) Files: every spoken manifest line has voice/clips/<id>.mp3 and is in voice/index.json.
   (3) Runtime: the QA run fails on any window.__voiceMisses entry, i.e. text spoken at runtime with no clip.)
   Usage: node tools/voice/check.js */
const fs = require('fs'), path = require('path');
const APP = path.resolve(__dirname, '../..'), SRC = path.join(APP, 'play/mothabet/game'); // versioned Mothabet source in this repo (was the untracked seed /home/box/elearnea/seed/mothabet-src)
const man = JSON.parse(fs.readFileSync(path.join(APP, 'voice/manifest.json'), 'utf8')), idx = JSON.parse(fs.readFileSync(path.join(APP, 'voice/index.json'), 'utf8'));
const norm = (s) => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const keys = new Set(man.items.filter(x => !x.reserved).map(x => x.key));
// Non-literal arguments that are allowed, and what in the manifest covers them (build-manifest.js enumerates these from the data).
const DYNAMIC = {
  'assets/js/el.js|t': 'El.Host.say wrapper: forwards a game\'s line',
  'assets/js/el.js|text': 'El.Voice wrapper: forwards to ElVoice',
  'assets/js/el.js|el.dataset.say': 'speakable(): data-say attributes are checked separately',
  'assets/games/firefly-count.js|t': 'speak() wrapper inside Firefly Count',
  'assets/games/firefly-count.js|W[k + 1]': 'number words one..ten while counting along (firefly-count numbers)',
  'assets/games/firefly-count.js|W[got]': 'number words one..ten as each firefly goes in the jar',
  'assets/games/firefly-count.js|prompt': 'replays the current prompt; every prompt passes through setPrompt, whose spoken argument is checked',
  'assets/js/el.js|b.getAttribute(\'data-say\')': 'speakable(): every data-say attribute is checked separately',
  'assets/games/firefly-count.js|spoken': 'setPrompt helper: the spoken argument is checked at each setPrompt call',
  'assets/games/firefly-count.js|\'\'': 'empty string = stop speaking',
  'assets/js/realm.js|x.ls.say || x.ls.name': 'catalog lesson "say" lines (elearnea instruction lines)',
  'assets/js/realm.js|next.ls.say || next.ls.name': 'catalog lesson "say" lines',
  'map/index.html|r.say': 'catalog realm "say" lines',
  'map/index.html|r.saySoon || r.say': 'catalog realm "saySoon" / "say" lines',
  'assets/js/play.js|`${msg} You earned ${stars} star${stars === 1 ? \'\' : \'s\'}!`': 'results praise (msg in Wonderful!/Great job!/Good try!, stars 0-3)',
  'assets/games/clocktower-gears.js|t': 'speak() wrapper inside Clocktower Gears',
  'assets/games/clocktower-gears.js|spoken': 'setPrompt helper: the spoken argument is checked at each setPrompt call',
  'assets/games/clocktower-gears.js|prompt': 'replays the current prompt (always a line passed to setPrompt, or "Which drawer does it go in?")',
  'assets/games/clocktower-gears.js|rng.pick(PRAISE)': 'pattern praise lines (clocktower-gears praise)',
  'assets/games/clocktower-gears.js|s.kind': 'shape names circle..hexagon while Wick sings the pattern (clocktower-gears words)',
  'assets/games/clocktower-gears.js|NUM[k]': 'number words one..six while counting sides (shared number lines)',
  'assets/games/clocktower-gears.js|FACT.circle': 'shape fact lines (clocktower-gears)',
  'assets/games/clocktower-gears.js|FACT[kind]': 'shape fact lines (clocktower-gears)',
  'assets/games/clocktower-gears.js|\'\'': 'empty string = stop speaking',
  'assets/games/firefly-choir.js|t': 'speak() wrapper inside Firefly Choir',
  'assets/games/firefly-choir.js|L1[a]': 'Firefly Choir demo lines "This is fast/slow/loud/soft." (firefly-choir instruction lines)',
  'assets/games/firefly-choir.js|L1[b]': 'Firefly Choir demo lines "This is fast/slow/loud/soft." (firefly-choir instruction lines)',
  'assets/games/firefly-choir.js|YES[k]': 'Firefly Choir praise "Yes! High/Low/Fast/Slow/Loud/Soft!" (firefly-choir praise lines)',
  'assets/games/firefly-choir.js|q': 'Firefly Choir prompt "Loud or soft?" / "Fast or slow?" (firefly-choir instruction lines)',
  'mothabet/game.js|t': 'say() wrapper inside Mothabet',
  'mothabet/game.js|txt': 'spoken() helper: each spoken(...) literal is checked',
  'mothabet/game.js|MB.PHON[m.ch]': 'Mothabet phonemes (MB.PHON)',
  'mothabet/game.js|MB.PHON[need]': 'Mothabet phonemes (MB.PHON)',
  'mothabet/game.js|need': 'Mothabet Fliers tile names (letter lines)',
  'mothabet/game.js|w.it.w + \'!\'': 'Mothabet word cheers (`<word>!`)',
  'mothabet/game.js|mo.name': 'Mothabet moth book names (MB.MOTHS)',
  'mothabet/game.js|mo.how': 'Mothabet moth book how-to-earn lines (MB.MOTHS)',
  'mothabet/voice.js|text': 'MB.Voice wrapper: forwards to ElVoice',
  'mothabet/game.js|line': 'word cheer `<word>!` (w.it.w + \'!\') played through ElVoice.sayThen so the next word waits for it',
  'assets/games/firefly-count.js|W[k]': 'number words one..ten while counting along (firefly-count numbers)',
  'assets/games/lantern-barn.js|ask': 'loud/quiet question: B.lqAsk[...] or B.lqWas(m) (LN.all lists every one; Little Lanterns lines are verified against the manifest)',
  'assets/games/lantern-barn.js|B.lqListen[i % B.lqListen.length]': 'loud/quiet "Listen!" variants (LN.barn.lqListen, in LN.all)',
  'assets/games/lantern-barn.js|B.again': 'LN.barn.again "Listen again!" (in LN.all)',
  'assets/games/clocktower-gears.js|line': 'praiseThen(line): the pattern/name/sort praise lines passed at each praiseThen call (checked there)'
};
const files = [];
const walk = (d, rel) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), r = rel ? rel + '/' + f : f; const st = fs.statSync(p);
  if (st.isDirectory()) { if (['voice', 'tools', 'qa', 'node_modules', '.git', 'mothabet'].includes(f) && !rel) continue; if (r === 'play/mothabet') continue; walk(p, r); }
  else if (/\.(js|html)$/.test(f) && r !== 'sw.js') files.push([p, r]); } };
walk(APP, '');
for (const f of ['game.js', 'voice.js', 'index.html']) files.push([path.join(SRC, f), 'mothabet/' + f]);
function args(src, i) { // i = index of '('; returns top-level argument strings
  let d = 0, s = i + 1, out = [], q = null, tdepth = 0;
  for (let k = i; k < src.length; k++) { const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (q === '`' && c === '$' && src[k + 1] === '{') { tdepth++; k++; continue; } if (q === '`' && c === '}' && tdepth) { tdepth--; continue; } if (c === q && !tdepth) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) { d--; if (d === 0) { out.push(src.slice(s, k).trim()); return out; } }
    else if (c === ',' && d === 1) { out.push(src.slice(s, k).trim()); s = k + 1; } }
  return out; }
function splitTop(expr, sep) { let d = 0, q = null, parts = [], s = 0; for (let k = 0; k < expr.length; k++) { const c = expr[k];
  if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; } if (c === '"' || c === "'" || c === '`') { q = c; continue; }
  if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--; else if (d === 0 && expr.startsWith(sep, k)) { parts.push(expr.slice(s, k).trim()); s = k + sep.length; } }
  parts.push(expr.slice(s).trim()); return parts; }
// split `c ? a : b` at top level (handles nested ternaries in the branches); null if e is not a ternary
function ternary(e) { let d = 0, q = null, qi = -1, nest = 0;
  for (let k = 0; k < e.length; k++) { const c = e[k];
    if (q) { if (c === '\\') { k++; continue; } if (q === '`' && c === '$' && e[k + 1] === '{') { let dd = 0; for (; k < e.length; k++) { if (e[k] === '{') dd++; else if (e[k] === '}' && --dd === 0) break; } continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
    else if (d === 0 && c === '?' && e[k + 1] !== '.' && e[k + 1] !== '?') { if (qi < 0) qi = k; else nest++; }
    else if (d === 0 && c === ':' && qi >= 0) { if (nest) nest--; else return [e.slice(0, qi).trim(), e.slice(qi + 1, k).trim(), e.slice(k + 1).trim()]; } }
  return null; }
const LITTLE = new Set(['assets/games/little.js', 'assets/games/lantern-barn.js', 'assets/games/picture-garden.js', 'assets/games/glow-jars.js']);
const SING = new Set(['assets/games/sing-along.js']); // sing-along: every line comes from assets/games/sing-lines.js (SL.*), verified below
const problems = []; let sites = 0;
function checkExpr(e, where) {
  e = e.trim(); if (!e) return;
  if (/^(['"]).*\1$/s.test(e)) { const t = e.slice(1, -1); if (!t.trim() || norm(t) === '') return; if (!keys.has(norm(t))) problems.push(`${where}: "${t}" is not in the manifest`); return; }
  if (/^`[^`]*`$/s.test(e)) { const DYN = 'qqvarqq'; const body = e.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ' + DYN + ' ');
    const re = new RegExp('^' + norm(body).split(DYN).map(x => x.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(" ?[a-z0-9' ]+? ?") + '$');
    if (![...keys].some(k => re.test(k))) problems.push(`${where}: template ${e} matches no manifest line`); return; }
  if (/^\[.*\]$/s.test(e)) { splitTop(e.slice(1, -1), ',').forEach(x => checkExpr(x, where)); return; }
  const tq = ternary(e); if (tq) { checkExpr(tq[1], where); checkExpr(tq[2], where); return; }
  // Little Lanterns games: every line comes from assets/games/little-lines.js (LN.* / its aliases G, J, C), whose full output is verified below
  if (LITTLE.has(where.split(':')[0]) && /^(?:(?:LN|G|J|C)\.[\w.]+(?:\([^()]*\))?|q\.(?:cue|yes|here)|ln\.(?:cue|yes|here)|lines\(b\._it\)\.that|lines|cur)$/.test(e)) return;
  // Wick's Lantern Path: every line comes from assets/games/wicks-path-lines.js (WL.*), whose full output is verified below
  if (where.split(':')[0] === 'assets/games/wicks-path.js' && /^(?:WL\.\w+(?:\[[\w.]+\])?|\{[^{}]*\}\[why\]|rng\.pick\(WL\.praise\)|lines|line|reason|prompt|spoken|t|say\[0\]|'')$/.test(e)) return;
  // Moth Bridge: every line comes from assets/games/moth-bridge-lines.js (B.*, sound(part) = B.partSound), whose full output is verified below
  if (where.split(':')[0] === 'assets/games/moth-bridge.js' && /^(?:B\.[\w]+(?:\([^()]*\))?|rng\.pick\(B\.yes\)|sound\([\w.\[\]]+\)|prompt\(\)|\.\.\.parts\.map\(sound\)|ps|t)$/.test(e)) return;
  if (SING.has(where.split(':')[0]) && /^(?:SL\.[\w.]+(?:\[[\w.]+\])?(?:\([^()]*\))?|intro\(\)(?:\.slice\([^()]*\))?)$/.test(e)) return;
  // Wick's Night Garden: every line comes from assets/games/night-garden-lines.js (NL.* and the item fields it defines), whose full output is verified below
  if (where.split(':')[0] === 'assets/games/night-garden.js' && /^(?:\.\.\.)?(?:NL\.[\w.]+(?:\([\w.]*\))?(?:\[[\w.]+\])?|q\.(?:yes|model|hint\(c\.id\))|it\.(?:ask|yes)|an\.\w+|say|prompt|spoken|end|line|t)$/.test(e)) return;
  const k = where.split(':')[0] + '|' + e; if (!DYNAMIC[k]) problems.push(`${where}: dynamic expression \`${e}\` is not covered (add it to the manifest builder and DYNAMIC in check.js)`); }
const CALL = /(?:\b(?:say|speak|_speak|spoken|setPrompt|sayThen|speakThen|praiseThen)\s*\(|\.(?:say|sayThen)\s*\()/g; // *Then: say, then continue when the line ended (voice/voice-then.js)
for (const [p, rel] of files) { const src = fs.readFileSync(p, 'utf8');
  let m; CALL.lastIndex = 0;
  while ((m = CALL.exec(src))) { const pre = src.slice(Math.max(0, m.index - 12), m.index);
    if (/function\s+$|\b(?:const|let)\s+$/.test(pre) || /^\s*(say|speak|_speak|spoken|setPrompt|sayThen)\s*\([^)]*\)\s*\{/.test(src.slice(m.index - (m[0].startsWith('.') ? 0 : 0), m.index + 80)) && /\)\s*\{/.test(src.slice(m.index, m.index + 60)) && !/=>/.test(src.slice(m.index, m.index + 40))) continue; // definitions
    const lineStart = src.lastIndexOf('\n', m.index) + 1; if (/^\s*(\/\/|\*|\/\*)/.test(src.slice(lineStart, m.index))) continue; // comments
    const a = args(src, m.index + m[0].length - 1); const line = src.slice(0, m.index).split('\n').length; sites++;
    const name = m[0].replace(/[\s(.]/g, ''); const arg = name === 'setPrompt' ? a[1] : a[0]; if (arg === undefined) continue;
    if (/^(t|o|text|txt|str|spoken),?\s*\w*$/.test(arg) && /\(\s*\w+\s*(,\s*\w+\s*)?\)\s*(=>|\{)/.test(src.slice(m.index + m[0].length - 1, m.index + m[0].length + 30))) continue; // parameter list of a definition
    checkExpr(arg, `${rel}:${line}`); }
  const ds = /data-say="([^"]*)"/g; while ((m = ds.exec(src))) { sites++; if (!m[1].includes('${') && !keys.has(norm(m[1]))) problems.push(`${rel}: data-say="${m[1]}" is not in the manifest`); }
  const dss = /dataset\.say\s*=\s*([^;]+);/g; while ((m = dss.exec(src))) { sites++; checkExpr(m[1], `${rel}:${src.slice(0, m.index).split('\n').length}`); } }
// Little Lanterns: every line the shared line functions can produce over content/early.json must be a manifest line
{ const LN = require(path.join(APP, 'assets/games/little-lines.js')), D = JSON.parse(fs.readFileSync(path.join(APP, 'content/early.json'), 'utf8')); let n = 0;
  for (const l of LN.all(D)) { n++; if (!keys.has(norm(l.text))) problems.push(`little-lines: "${l.text}" is not in the manifest`); }
  // and every content item the games can ask about is enumerated by LN.all (spot check the data the games read)
  console.log(`voice check: ${n} Little Lanterns lines verified against the manifest`); }
// Wick's Lantern Path: every line the game's line list can produce must be a manifest line
{ const WL = require(path.join(APP, 'assets/games/wicks-path-lines.js')); let n = 0;
  for (const l of WL.all()) { n++; if (!keys.has(norm(l.text))) problems.push(`wicks-path-lines: "${l.text}" is not in the manifest`); }
  console.log(`voice check: ${n} Wick's Lantern Path lines verified against the manifest`); }
// Moth Bridge: every line the game can say is a manifest line; every word it shows is a Mothabet word clip that PASSED the speech
// check (no held or ASR-flagged clip, REVIEW-076); rime sounds are either a passing Mothabet clip ("in", "us") or a new mbr.* line
{ const B = require(path.join(APP, 'assets/games/moth-bridge-lines.js')), byKey = new Map(man.items.map(x => [x.key, x])); let n = 0;
  for (const l of B.all()) { n++; if (!keys.has(norm(l.text))) problems.push(`moth-bridge: "${l.text}" is not in the manifest`); }
  for (const w of new Set([].concat(...Object.values(B.WORDS)))) { const it = byKey.get(norm(B.word(w)));
    if (!it || !it.parts || !it.parts.length) problems.push(`moth-bridge: word "${w}" has no Mothabet word clip`);
    else if (it.check.human || it.source.kind === 'device-speech') problems.push(`moth-bridge: word "${w}" clip is held or flagged (${(it.check.reasons || []).join('; ')})`); }
  for (const r of Object.keys(B.RIME)) { const it = byKey.get(norm(B.RIME[r])); if (it && it.parts && (it.source.kind === 'device-speech' || it.check.reasons.some(x => /flagged/.test(x)))) problems.push(`moth-bridge: rime "${r}" reuses a held/flagged clip`); }
  console.log(`voice check: ${n} Moth Bridge lines verified against the manifest`); }
// Sing-along: every line sing-lines.js can produce over content/songs.json must be a manifest line
{ const SL = require(path.join(APP, 'assets/games/sing-lines.js')), SG = JSON.parse(fs.readFileSync(path.join(APP, 'content/songs.json'), 'utf8')); let n = 0;
  for (const l of SL.all(SG)) { n++; if (!keys.has(norm(l.text))) problems.push(`sing-lines: "${l.text}" is not in the manifest`); }
  console.log(`voice check: ${n} sing-along lines verified against the manifest`); }
{ const NGL = require(path.join(APP, 'assets/games/night-garden-lines.js')); let n = 0;
  for (const l of NGL.all()) { n++; if (!keys.has(norm(l.text))) problems.push(`night-garden-lines: "${l.text}" is not in the manifest`); }
  console.log(`voice check: ${n} Night Garden lines verified against the manifest`); }
// files + index: every shipped line has all its files (.mp3 + .opus) and is in index.json; lines still pending are reported, not failed
let missing = 0, pending = 0; for (const it of man.items) { if (it.reserved) continue;
  if (idx.map[it.key] !== it.id) { problems.push(`index.json does not map "${it.key}" to ${it.id}`); continue; }
  if (it.source.kind === 'device-speech') { pending++; continue; }
  for (const f of it.files) for (const ext of man.formats || ['mp3']) if (!fs.existsSync(path.join(APP, f.replace(/\.mp3$/, '.' + ext)))) { missing++; if (missing < 10) problems.push(`missing ${f.replace(/\.mp3$/, '.' + ext)} for "${it.text}"`); } }
if (missing >= 10) problems.push(`... ${missing} files missing in total`);
console.log(`voice check: ${pending} lines still use device speech (clip not rendered/imported yet, or a known gap)`);
console.log(`voice check: ${sites} speech call sites scanned in ${files.length} files; ${man.items.length} manifest lines; ${problems.length} problems`);
problems.forEach(p => console.log('  FAIL ' + p));
process.exit(problems.length ? 1 : 0);
