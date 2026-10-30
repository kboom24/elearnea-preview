#!/usr/bin/env node
/* Copies the Mothabet Bella clips that the code actually uses (per voice/manifest.json "parts", mapped from the Mothabet
   voice-script CSV) from the batch folder into app/voice/mb/ (.mp3 + .opus), then rebuilds the manifest/index.
   Since 2026-10-29 (speed 0.76) each clip's source folder comes from /home/box/elearnea/voice/mothabet/clip-status.tsv
   (written by /home/box/elearnea/voice/tools/mb-status.py): bella-076 (re-render), fixes-076 (respelling retries),
   first-sound/bella, letters/bella, and the original bella/ batch for ph_* phonemes only.
   Usage: node tools/voice/import-mothabet.js [srcDir=/home/box/elearnea/voice/mothabet/bella-076] */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const APP = path.resolve(__dirname, '../..'), SRC = process.argv[2] || process.env.MB_DIR || '/home/box/elearnea/voice/mothabet/bella-076', DST = path.join(APP, 'voice/mb');
const man = JSON.parse(fs.readFileSync(path.join(APP, 'voice/manifest.json'), 'utf8'));
const STF = process.env.MB_STATUS || '/home/box/elearnea/voice/mothabet/clip-status.tsv', DIR = {};
if (fs.existsSync(STF)) { const ls = fs.readFileSync(STF, 'utf8').split(/\r?\n/).filter(Boolean); const h = ls.shift().split('\t'); for (const l of ls) { const c = l.split('\t'); DIR[c[0].replace(/\.mp3$/, '')] = c[h.indexOf('dir')]; } }
const need = new Set(); for (const it of man.items) for (const f of it.parts || []) need.add(f.replace(/\.mp3$/, ''));
fs.mkdirSync(DST, { recursive: true }); let copied = 0; const missing = [];
const find = (base, ext) => [...(DIR[base] ? [path.join(DIR[base], ext, base + '.' + ext)] : []), path.join(SRC, base + '.' + ext), path.join(SRC, ext, base + '.' + ext)].find(f => fs.existsSync(f));
for (const b of need) for (const ext of ['mp3', 'opus']) { const f = find(b, ext); if (f) { fs.copyFileSync(f, path.join(DST, b + '.' + ext)); copied++; } else missing.push(b + '.' + ext); }
console.log(`copied ${copied} files for ${need.size} clips; missing ${missing.length}${missing.length ? ': ' + missing.slice(0, 20).join(', ') + (missing.length > 20 ? ' ...' : '') : ''}`);
execFileSync('node', [path.join(__dirname, 'build-manifest.js')], { stdio: 'inherit', env: Object.assign({}, process.env, { MB_DIR: SRC }) });
