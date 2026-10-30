/* Moth Bridge (Reading, ages 5-7): words, sounds and every spoken line. Shared by the game (window.El.BridgeLines) and the voice
   manifest builder / checker (module.exports), so the manifest can't drift from what the game says.
   Sounds reuse Mothabet's phoneme clips (key = Mothabet's speakable spelling, e.g. "kuh" -> voice/mb/ph_c); whole words reuse
   Mothabet's word clips ("cat!" -> voice/mb/w_cat). Only words whose clip passed the speech check are used (none of the held or
   ASR-flagged clips in voice/mothabet/REVIEW-076.md). Rimes have no Mothabet clip except "in" and "us": the rest are new lines
   spelled the way Mothabet spells its sounds ("att", "ugg"...), so each has its own manifest key (w_at, w_up are ASR-flagged). */
(function (root) {
  'use strict';
  // one sound per letter (CVC words only use these)
  const PH = { a: 'aah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'hhuh', i: 'ih', j: 'juh', l: 'lll', m: 'mmm', n: 'nnn', o: 'ah', p: 'puh', r: 'rrr', s: 'sss', t: 'tuh', u: 'uh', w: 'wuh' };
  // rime -> spoken text: reused Mothabet word clips where one passed (in, us), else a new line (VOICE-NEEDS)
  const RIME = { at: 'att', ap: 'app', an: 'ann', ug: 'ugg', op: 'opp', og: 'ogg', ig: 'igg', in: 'in', un: 'unn', us: 'us', up: 'upp' };
  // lesson word lists (every word: passing Mothabet word clip + a picture a child knows without reading)
  const WORDS = {
    onset: ['cat', 'hat', 'bat', 'rat', 'cap', 'map', 'can', 'fan', 'pan', 'bug', 'mug', 'rug', 'mop', 'top', 'dog', 'log', 'pig', 'wig', 'pin', 'sun', 'bus', 'cup'],
    'short-a': ['cat', 'hat', 'bat', 'rat', 'cap', 'map', 'bag', 'can', 'fan', 'jam', 'pan'],
    mixed: ['cat', 'map', 'bag', 'leg', 'web', 'pig', 'wig', 'pin', 'lip', 'dog', 'log', 'mop', 'pot', 'top', 'bug', 'bus', 'cup', 'mug', 'rug', 'sun'],
    segment: ['cat', 'map', 'bag', 'leg', 'web', 'pig', 'pin', 'dog', 'mop', 'pot', 'bug', 'bus', 'cup', 'sun']
  };
  // pictures a child could name either way never share a screen (a cap is also a hat; a mug is also a cup)
  const SAME = { cap: ['hat'], hat: ['cap'], cup: ['mug'], mug: ['cup'], pot: ['pan', 'can'], pan: ['pot'], can: ['pot'] };
  const L = {
    PH, RIME, WORDS, SAME,
    sound: (letter) => PH[letter],                 // a letter moth's sound
    rime: (r) => RIME[r],                          // a rime moth's sound (onset-rime lesson)
    word: (w) => w + '!',                          // the whole word (Mothabet's word cheer clip)
    // parts a word is split into for a lesson: onset-rime = [c, at]; otherwise one part per letter
    parts: (w, mode) => mode === 'onset' ? [w[0], w.slice(1)] : w.split(''),
    partSound: (p) => p.length === 1 ? PH[p] : RIME[p],
    hear: 'Tap each moth to hear its sound.', slide: 'Now slide them together!', which: 'Which picture is it?',
    again: 'Listen again!', here: 'Here it is!', intro: 'Help the moths cross the bridge!',
    order: 'Tap the sounds in order.', first: 'What sound comes first?', next: 'What sound comes next?', last: 'What is the last sound?',
    yes: ['You blended it!', 'Over the bridge!'], yesSeg: 'You found every sound!'
  };
  // every line the game can say, for the manifest builder and check.js (new = not in the manifest before Moth Bridge)
  L.all = function () { const out = [], add = (text, type, screen, trigger) => out.push({ text, type, screen, trigger });
    for (const k of Object.keys(PH)) add(PH[k], 'phoneme', 'Moth Bridge', `a ${k} moth is tapped, lands or is slid over`);
    for (const r of Object.keys(RIME)) add(RIME[r], 'phoneme', 'Moth Bridge (onset-rime)', `the -${r} rime moth is tapped or slid over`);
    const ws = [...new Set([].concat(...Object.values(WORDS)))]; for (const w of ws) add(L.word(w), 'word', 'Moth Bridge', 'the word after a blend, a picked picture, or the segmenting prompt');
    add(L.intro, 'instruction', 'Moth Bridge', 'first round starts');
    add(L.hear, 'instruction', 'Moth Bridge (blend)', 'moths have landed on the bridge');
    add(L.slide, 'instruction', 'Moth Bridge (blend)', 'every moth has been heard');
    add(L.which, 'instruction', 'Moth Bridge (blend)', 'the moths were slid together');
    add(L.again, 'feedback', 'Moth Bridge', 'wrong picture or wrong sound (first miss)');
    add(L.here, 'feedback', 'Moth Bridge', 'second miss: the answer glows');
    add(L.order, 'instruction', 'Moth Bridge (segment)', 'a word to take apart is shown');
    add(L.first, 'instruction', 'Moth Bridge (segment)', 'ask for the first sound'); add(L.next, 'instruction', 'Moth Bridge (segment)', 'ask for the middle sound');
    add(L.last, 'instruction', 'Moth Bridge (segment)', 'ask for the last sound');
    for (const y of L.yes) add(y, 'praise', 'Moth Bridge (blend)', 'right picture');
    add(L.yesSeg, 'praise', 'Moth Bridge (segment)', 'every sound placed');
    return out; };
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
  if (root && root.El) root.El.BridgeLines = L;
})(typeof window !== 'undefined' ? window : null);
