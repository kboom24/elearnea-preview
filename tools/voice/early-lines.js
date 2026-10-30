/* Little Lanterns (ages 0-4) voice lines for build-manifest.js. The lines come from the SAME functions the games call
   (assets/games/little-lines.js) run over content/early.json, so the manifest can't drift from the code.
   Words that end in a weak schwa (content/early.json "schwaWords", e.g. banana, umbrella) get `schwaFix`: regen.py fills the say.py
   ipa column for those lines with the word's final ə swapped for ɑ (Kokoro G2P via voice/tools/ipa-fix.py), so they end in a clear "ah".
   The IPA actually used is saved in voice/ipa-overrides.json and copied onto the line here (`ipa`, `ipaNote`). */
const fs = require('fs'), path = require('path');
module.exports = function ({ add, APP }) {
  const LN = require(path.join(APP, 'assets/games/little-lines.js'));
  const D = JSON.parse(fs.readFileSync(path.join(APP, 'content/early.json'), 'utf8'));
  const ovF = path.join(APP, 'voice/ipa-overrides.json'), ov = fs.existsSync(ovF) ? JSON.parse(fs.readFileSync(ovF, 'utf8')) : {};
  // recorded animal sound effects (CC0, assets/sfx/animals/sfx.json): every Lantern Barn line that plays right after an animal's sound notes
  // which file, its Freesound source and license (the manifest also lists all of them under `sfx`)
  const rd = (d) => { const f = path.join(APP, `assets/sfx/${d}/sfx.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).items : []; };
  const SFX = rd('animals'), LQS = rd('loudquiet').concat(SFX); // loud/quiet sounds (cow and dog reuse the animal files)
  const sfxNote = (x) => `after sound effect ${x.files[0]} (${x.source.site} #${x.source.soundId} by ${x.source.author}, ${x.source.license}, ${x.source.url})`;
  const animalOf = {}; for (const a of D.animals) for (const t of [LN.barn.says(a), LN.barn.who(a), LN.barn.yes(a), LN.barn.that(a)]) animalOf[t] = a.id;
  const lqOf = {}; for (const p of D.loudquiet || []) for (const [m, ld] of [[p.loud, true], [p.quiet, false]]) for (const t of [LN.barn.lqThing(m, ld), LN.barn.lqWas(m), LN.barn.lqSame(m, true), LN.barn.lqSame(m, false)]) lqOf[t] = m.sfx;
  let n = 0;
  for (const l of LN.all(D)) {
    const game = l.game.split('+')[0];
    const it = add(l.text, { type: l.type, game, prefix: 'll', screen: l.screen, trigger: l.trigger }); if (!it) continue; n++;
    const fx = animalOf[l.text] && SFX.find(x => x.id === animalOf[l.text]) || lqOf[l.text] && LQS.find(x => x.id === lqOf[l.text]); if (fx) it.sfx = sfxNote(fx);
    const sw = (D.schwaWords || []).filter(w => new RegExp(`\\b${w}\\b`, 'i').test(l.text));
    if (sw.length) { it.schwaFix = sw; if (ov[it.id] && ov[it.id].ipa) { it.renderIpa = ov[it.id].ipa; it.ipaNote = `final ə of "${sw.join('", "')}" rendered as ɑ (clear "ah"), Hexan 2026-10-29`; } }
  }
  return n;
};
