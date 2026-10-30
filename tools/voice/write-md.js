// Writes the human-readable VOICE-MANIFEST.md from the manifest object (generated; edit build-manifest.js, not this file's output).
const fs = require('fs');
module.exports = function (m, file) {
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const games = { elearnea: 'Elearnea shell (landing, map, realm paths, results card)', 'lily-pad-hop': 'Lily Pad Hop', 'firefly-count': 'Firefly Count', mothabet: 'Mothabet' };
  const src = (it) => it.source.kind === 'kokoro' ? 'kokoro af_bella' : it.source.gap ? `device speech (GAP: ${it.source.gap})` : `device speech (pending: ${it.source.pending || ''})`;
  let s = `# Elearnea voice manifest\n\nGenerated ${m.generated} by \`app/tools/voice/build-manifest.js\`. **Single source of truth** for every spoken line. Machine-readable: \`app/voice/manifest.json\`; runtime lookup (generated): \`app/voice/index.json\`.\n\n`;
  s += `## Voice\n- Standard voice: **Kokoro-82M (Apache-2.0), voice af_bella** (Hexan, 2026-10-29). Credit: "Voice: Kokoro-82M by hexgrad (Apache-2.0), voice af_bella."\n- Pre-generated files only: no runtime TTS, no external requests. Files: \`.opus\` + \`.mp3\` per clip (voice.js picks Opus where supported).\n- Fallback for a line with no clip yet: the device's own on-device speech voice (never network voices).\n\n`;
  s += `## How it works\n- Every spoken line goes through ONE module, \`app/voice/voice.js\` (\`window.ElVoice\`; \`El.Voice\` and Mothabet's \`MB.Voice\` are thin wrappers). Code calls \`say(text)\`; the module normalizes the text to a key, finds the line **id** in the index and plays that line's files in order.\n- Elearnea lines (shell, Lily Pad Hop, Firefly Count): one file each, \`app/voice/clips/<id>.{opus,mp3}\`, rendered from \`/home/box/elearnea/voice/elearnea-lines.csv\` (filename = id).\n- Mothabet lines: a sequence of clips from the Mothabet Bella batch, mapped through the Mothabet voice-script CSV (\`${m.mothabetMapping.csv}\`), copied to \`app/voice/mb/\`. ${m.mothabetMapping.rule}.\n- Switching provider later = re-render the files from this manifest (same names), no game code changes.\n\n`;
  s += `## Commands\n\`\`\`\ncd /home/box/elearnea/app\nnode tools/voice/build-manifest.js        # rebuild manifest + index + CSV + this file after any text change\nnode tools/voice/import-mothabet.js       # copy the Mothabet Bella clips the code uses into app/voice/mb/ (+ rebuild)\n/home/box/games/tools/qa-slot.sh python3 tools/voice/regen.py          # render missing Elearnea lines with Kokoro af_bella via voice/tools/say.py (--all = re-render all)\nnode tools/voice/check.js                 # FAILS if code can speak text not in the manifest, or a shipped line is missing a file\n\`\`\`\n\n`;
  const c = m.counts; s += `## Totals\n- Lines: **${c.total}** (${c.spoken} spoken by the current code + ${c.reserved} reserved Mothabet phonemes from AUDIO-NEEDS.md)\n- With Bella clips shipped: ${c.withClip}; pending render/import: ${c.pending}; gaps (no clip planned in any script): ${c.gaps}; needing a human ear check: ${c.needsHumanCheck}\n- Mothabet script clips: ${m.mothabetMapping.scriptClips} (${m.mothabetMapping.usedByCode} used by the current code)\n\n| Game (first use) | Lines |\n|---|---|\n`;
  for (const [g, n] of Object.entries(c.byGame)) s += `| ${games[g] || g} | ${n} |\n`;
  s += `\n| Type | Lines |\n|---|---|\n`; for (const [t, n] of Object.entries(c.byType).sort((a, b) => b[1] - a[1])) s += `| ${t} | ${n} |\n`;
  const counts = {}; for (const it of m.items) for (const u of it.uses) { const k = u.game + '|' + it.type; counts[k] = (counts[k] || 0) + 1; }
  s += `\n### Lines by game and type (a line used in two games counts in both)\n| Game | Type | Lines |\n|---|---|---|\n`; for (const [k, n] of Object.entries(counts).sort()) { const [g, t] = k.split('|'); s += `| ${games[g] || g} | ${t} | ${n} |\n`; }
  const gaps = m.items.filter(x => x.source.gap && !x.reserved);
  s += `\n## Gaps: lines with no clip in any script (${gaps.length})\nThese play with device speech until a Bella clip is made.\n\n| id | text | where |\n|---|---|---|\n`; for (const it of gaps) s += `| \`${it.id}\` | ${esc(it.text)} | ${esc(it.uses.map(u => u.screen + ': ' + u.trigger).join('; '))} |\n`;
  const hc = m.items.filter(x => x.check.human);
  s += `\n## Needs a human ear check (${hc.length})\n| id | text | example | why |\n|---|---|---|---|\n`;
  for (const it of hc) s += `| \`${it.id}\` | ${esc(it.text)} | ${esc(it.example || '')} | ${esc(it.check.reasons.join('; '))} |\n`;
  for (const g of Object.keys(games)) { const list = m.items.filter(it => it.uses.some(u => u.game === g)); if (!list.length) continue;
    s += `\n## ${games[g]} (${list.length} lines)\n| id | text | type | where / when | file(s) | source | check |\n|---|---|---|---|---|---|---|\n`;
    for (const it of list) { const u = it.uses.filter(x => x.game === g).map(x => `${x.screen}: ${x.trigger}`).join('<br>');
      const fl = it.files.length ? it.files.map(f => `\`${f.replace(/^voice\//, '')}\``).join(' + ') : '–';
      s += `| \`${it.id}\` | ${esc(it.text)}${it.render !== it.text && !it.parts ? `<br><small>reads: ${esc(it.render)}</small>` : ''} | ${it.type} | ${esc(u)} | ${fl} | ${esc(src(it))} | ${it.check.human ? 'yes' : ''} |\n`; } }
  fs.writeFileSync(file, s);
};
