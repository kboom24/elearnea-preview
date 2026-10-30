/* Wick's Lantern Path (Logic & Coding) voice lines for build-manifest.js. The lines come from the SAME list the game speaks from
   (assets/games/wicks-path-lines.js), so the manifest can't drift from the code.
   Words that end in a weak schwa get `schwaFix` (regen.py fills say.py's ipa column with the final ə swapped for ɑ, so they end in a clear
   "ah"); the IPA actually used is read back from voice/ipa-overrides.json. SCHWA lists such words; the current lines use none
   (checked with voice/tools/ipa-fix.py, see the branch report), so it is empty but wired. */
const fs = require('fs'), path = require('path');
const SCHWA = [];
module.exports = function ({ add, APP }) {
  const WL = require(path.join(APP, 'assets/games/wicks-path-lines.js'));
  const ovF = path.join(APP, 'voice/ipa-overrides.json'), ov = fs.existsSync(ovF) ? JSON.parse(fs.readFileSync(ovF, 'utf8')) : {};
  let n = 0;
  for (const l of WL.all()) {
    const it = add(l.text, { type: l.type, game: 'wicks-path', prefix: 'wp', screen: l.screen, trigger: l.trigger }); if (!it) continue; n++;
    const sw = SCHWA.filter(w => new RegExp(`\\b${w}\\b`, 'i').test(l.text));
    if (sw.length) { it.schwaFix = sw; if (ov[it.id] && ov[it.id].ipa) { it.renderIpa = ov[it.id].ipa; it.ipaNote = `final ə of "${sw.join('", "')}" rendered as ɑ (clear "ah"), Hexan 2026-10-29`; } }
  }
  return n;
};
