/* Sing-along games (Zoo Parade, Word Stage) voice lines for build-manifest.js: the SAME functions the games call
   (assets/games/sing-lines.js) run over content/songs.json, so the manifest can't drift from the code. */
const fs = require('fs'), path = require('path');
module.exports = function ({ add, APP }) {
  const SL = require(path.join(APP, 'assets/games/sing-lines.js'));
  const songs = JSON.parse(fs.readFileSync(path.join(APP, 'content/songs.json'), 'utf8'));
  const D = JSON.parse(fs.readFileSync(path.join(APP, 'content/early.json'), 'utf8')), SCHWA = [...new Set([...(D.schwaWords || []), 'panda'])];
  const ovF = path.join(APP, 'voice/ipa-overrides.json'), ov = fs.existsSync(ovF) ? JSON.parse(fs.readFileSync(ovF, 'utf8')) : {};
  let n = 0; for (const l of SL.all(songs)) { const it = add(l.text, { type: l.type, game: l.game.split('+')[0], prefix: 'sing', screen: l.screen, trigger: l.trigger }); if (!it) continue; n++;
    // weak final schwa (panda): regen.py renders these lines from the say.py ipa column with the final ə as ɑ (clear "ah"), like Little Lanterns
    const sw = SCHWA.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(l.text));
    if (sw.length && !it.schwaFix) { it.schwaFix = sw; if (ov[it.id] && ov[it.id].ipa) { it.renderIpa = ov[it.id].ipa; it.ipaNote = `final ə of "${sw.join('", "')}" rendered as ɑ (clear "ah"), Hexan 2026-10-29`; } } }
  return n;
};
