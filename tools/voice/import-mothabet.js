#!/usr/bin/env node
/* Copies the Mothabet Bella clips that the code actually uses (per voice/manifest.json "parts", mapped from the Mothabet
   voice-script CSV) from the batch folder into app/voice/mb/ (.mp3 + .opus), then rebuilds the manifest/index.
   Usage: node tools/voice/import-mothabet.js [srcDir=/home/box/elearnea/voice/mothabet/bella] */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const APP = path.resolve(__dirname, '../..'), SRC = process.argv[2] || process.env.MB_DIR || '/home/box/elearnea/voice/mothabet/bella', DST = path.join(APP, 'voice/mb');
const man = JSON.parse(fs.readFileSync(path.join(APP, 'voice/manifest.json'), 'utf8'));
const need = new Set(); for (const it of man.items) for (const f of it.parts || []) need.add(f.replace(/\.mp3$/, ''));
fs.mkdirSync(DST, { recursive: true }); let copied = 0; const missing = [];
const find = (base, ext) => [path.join(SRC, base + '.' + ext), path.join(SRC, ext, base + '.' + ext)].find(f => fs.existsSync(f));
for (const b of need) for (const ext of ['mp3', 'opus']) { const f = find(b, ext); if (f) { fs.copyFileSync(f, path.join(DST, b + '.' + ext)); copied++; } else missing.push(b + '.' + ext); }
console.log(`copied ${copied} files for ${need.size} clips; missing ${missing.length}${missing.length ? ': ' + missing.slice(0, 20).join(', ') + (missing.length > 20 ? ' ...' : '') : ''}`);
execFileSync('node', [path.join(__dirname, 'build-manifest.js')], { stdio: 'inherit', env: Object.assign({}, process.env, { MB_DIR: SRC }) });
