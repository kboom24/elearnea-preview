/* Moth Bridge (Reading, ages 5-7) voice lines for build-manifest.js. The lines come from assets/games/moth-bridge-lines.js, the same
   module the game speaks from, so the manifest can't drift from the code. Sounds and words land on Mothabet's existing items (same key:
   "kuh", "cat!") and keep their Mothabet clips; only the prompts, praise and the rime sounds without a Mothabet clip are new
   (voice/clips/mbr.*.mp3, device speech until rendered: see docs/MOTH-BRIDGE.md VOICE-NEEDS). */
const path = require('path');
module.exports = function ({ add, APP }) {
  const B = require(path.join(APP, 'assets/games/moth-bridge-lines.js'));
  let n = 0;
  for (const l of B.all()) { if (add(l.text, { type: l.type, game: 'moth-bridge', prefix: 'mbr', screen: l.screen, trigger: l.trigger })) n++; }
  return n;
};
