/* Little Lanterns: EVERY line the early-learner games speak, in one place. The games call these functions; the voice manifest builder
   (tools/voice/early-lines.js) runs the same functions over content/early.json to list every line, and tools/voice/check.js verifies
   that each one is in the manifest. Change wording here only, then rebuild the manifest and render the new clips. */
(function (root) {
  'use strict';
  const NW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const LN = {
    NW,
    common: { here: 'Here it is!', countTogether: "Let's count together.", n: (k) => NW[k], yesN: (k) => `Yes! ${NW[k]}!` },
    map: { little: 'Little Lanterns! Games for little ones.', explorer: 'Explorers! Games for big kids.' },
    barn: {
      knock: 'Knock knock! Tap the door!', says: (a) => `The ${a.name} says ${a.sound}!`,
      listen: 'Listen!', who: (a) => `Who says ${a.sound}?`, yes: (a) => `Yes! The ${a.name} says ${a.sound}!`, that: (a) => `That's the ${a.name}!`, hereA: (a) => `Here's the ${a.name}!`,
      // loud or quiet (content/early.json "loudquiet": 8 pairs; m = one side of a pair). Lines vary from round to round.
      lqListen: ['Listen!', 'Shh... listen!', 'Listen carefully!'], lqAsk: ['Was that loud, or quiet?', 'Loud, or quiet?', 'Hmm... loud, or quiet?'],
      lqWas: (m) => `Was the ${m.name} loud, or quiet?`, lqThing: (m, loud) => `Yes! That was ${loud ? 'loud' : 'quiet'}, ${m.like}!`,
      lqSame: (m, loud) => `Yes! A ${loud ? 'loud' : 'quiet'} ${m.sound}!`, again: 'Listen again!',
      clap: (c) => `Let's clap... ${c.word}!`, turn: (c) => `Your turn! Clap... ${c.word}.`, claps: (c) => `${c.word} has ${NW[c.n]} clap${c.n === 1 ? '' : 's'}!`, together: "Let's clap it together."
    },
    garden: {
      tap: 'Tap the picture!', look: (w) => `Look! ${w.a}!`,
      where: (w) => `Where is the ${w.name}?`, yesW: (w) => `Yes! The ${w.name}!`, thatW: (w) => `That's the ${w.name}.`, hereW: (w) => `Here's the ${w.name}!`,
      color: (c) => `Tap the ${c.name} balloon!`, yesC: (c) => `Yes! ${c.name}!`, thatC: (c) => `That one is ${c.name}.`,
      shape: (s) => `Find the ${s.name}!`, yesS: (s) => `Yes! A ${s.name}!`, thatS: (s) => `That's a ${s.name}.`,
      rhyme: (r) => `Which one rhymes with ${r.a}? ${r.b}, or ${r.c}?`, yesR: (r) => `Yes! ${r.a}, ${r.b}. They rhyme!`, listenR: (r) => `Listen: ${r.a}, ${r.b}. They rhyme!`,
      same: 'Find the same shape!', match: 'Yes! They match!', lookAgain: 'Look again!'
    },
    jars: {
      tap: 'Tap the jar!', bye: 'Bye bye, fireflies!', matches: 'Find the jar that matches!',
      which: (k) => `Which jar has ${NW[k]} ${k === 1 ? 'firefly' : 'fireflies'}?`, more: 'Which jar has more?', yesMore: 'Yes! That jar has more!', thisMore: 'This jar has more!'
    }
  };
  // every line, with where/when it plays (for the voice manifest). D = content/early.json
  LN.all = function (D) {
    const out = [], add = (text, game, screen, trigger, type) => out.push({ text, game, screen, trigger, type: type || 'instruction' });
    const B = LN.barn, G = LN.garden, J = LN.jars, C = LN.common;
    add(LN.map.little, 'elearnea', 'World map', 'tap the Little Lanterns (ages 0-4) switch', 'label'); add(LN.map.explorer, 'elearnea', 'World map', 'tap the Explorers (ages 4-9) switch', 'label');
    const lb = 'lantern-barn', pg = 'picture-garden', gj = 'glow-jars';
    add(B.knock, lb, 'Lantern Barn (under 2, play together)', 'round starts');
    for (const a of D.animals) { add(B.says(a), lb, 'Lantern Barn (under 2)', 'barn door opens and the animal makes its sound', 'feedback'); add(B.who(a), lb, 'Lantern Barn: who says that?', 'after "Listen!" and the recorded animal sound (assets/sfx/animals); tap Wick to hear it again');
      add(B.yes(a), lb, 'Lantern Barn: who says that?', 'right animal tapped', 'praise'); add(B.that(a), lb, 'Lantern Barn: who says that?', 'another animal tapped (then the sound replays)', 'feedback'); add(B.hereA(a), lb, 'Lantern Barn: who says that?', 'second miss: the right animal glows', 'feedback'); }
    add(B.listen, lb, 'Lantern Barn (animals, loud/quiet)', 'before each sound');
    const lq = 'Lantern Barn: loud or quiet', snd = (m) => `the ${m.name} sound (assets/sfx/loudquiet)`;
    B.lqListen.forEach(t => { if (t !== B.listen) add(t, lb, lq, 'before the sound (varies by round)'); }); B.lqAsk.forEach(t => add(t, lb, lq, 'after the sound (things rounds; varies by round); tap Wick to hear it again'));
    for (const pr of D.loudquiet || []) for (const [m, isLoud] of [[pr.loud, true], [pr.quiet, false]]) {
      add(B.lqThing(m, isLoud), lb, lq, `${isLoud ? 'loud' : 'quiet'} round: ${m.name} picture tapped after ${snd(m)}`, 'praise');
      add(B.lqWas(m), lb, lq, `same-sound round: after ${snd(m)} played loud or quiet; tap Wick to hear it again`);
      add(B.lqSame(m, true), lb, lq, `same-sound round: loud ${m.name} picture tapped after the LOUD ${snd(m)}`, 'praise'); add(B.lqSame(m, false), lb, lq, `same-sound round: quiet ${m.name} picture tapped after the QUIET ${snd(m)}`, 'praise'); }
    add(B.again, lb, lq, 'first miss (the sound plays again)', 'feedback');
    for (const c of D.claps) { add(B.clap(c), lb, 'Lantern Barn: clap the beats', 'Wick claps the word on the drum (model)'); add(B.turn(c), lb, 'Lantern Barn: clap the beats', "child's turn to clap"); add(B.claps(c), lb, 'Lantern Barn: clap the beats', 'right number of claps (or after the 2nd model)', 'praise'); }
    add(B.together, lb, 'Lantern Barn: clap the beats', 'wrong number of claps (Wick models it again)', 'feedback');
    add(C.here, pg + '+' + lb, 'Picture Garden / Lantern Barn / Glow Jars', 'second miss: the answer glows', 'feedback');
    add(G.tap, pg, 'Picture Garden (under 2, play together)', 'round starts');
    for (const w of D.words) { if (D.tinyWords.includes(w.id)) add(G.look(w), pg, 'Picture Garden (under 2)', 'picture tapped', 'feedback');
      add(G.where(w), pg, 'Picture Garden: first words', 'new question; tap Wick to hear it again'); add(G.yesW(w), pg, 'Picture Garden: first words', 'right picture tapped', 'praise'); add(G.thatW(w), pg, 'Picture Garden: first words', 'another picture tapped (then the question repeats)', 'feedback'); add(G.hereW(w), pg, 'Picture Garden: first words', 'second miss: the right picture glows', 'feedback'); }
    for (const c of D.colors) { add(G.color(c), pg, 'Picture Garden: colors', 'new question'); add(G.yesC(c), pg, 'Picture Garden: colors', 'right balloon tapped', 'praise'); add(G.thatC(c), pg, 'Picture Garden: colors', 'another balloon tapped', 'feedback'); }
    for (const s of D.shapes) { add(G.shape(s), pg, 'Picture Garden: shapes', 'new question'); add(G.yesS(s), pg, 'Picture Garden: shapes', 'right shape tapped', 'praise'); add(G.thatS(s), pg, 'Picture Garden: shapes', 'another shape tapped', 'feedback'); }
    for (const r of D.rhymes) { [].concat(r.c).forEach(c => add(G.rhyme(Object.assign({}, r, { c })), pg, 'Picture Garden: rhyme time', 'new question (names both pictures; the other picture varies)')); add(G.yesR(r), pg, 'Picture Garden: rhyme time', 'rhyming picture tapped', 'praise'); add(G.listenR(r), pg, 'Picture Garden: rhyme time', 'other picture tapped (the rhyme glows)', 'feedback'); }
    add(G.same, pg, 'Picture Garden: letter shapes', 'new question'); add(G.match, pg, 'Picture Garden: letter shapes', 'matching letter shape tapped', 'praise'); add(G.lookAgain, pg, 'Picture Garden: letter shapes', 'first miss', 'feedback');
    add(J.tap, gj, 'Glow Jars (under 2, play together)', 'round starts'); add(J.bye, gj, 'Glow Jars (under 2)', 'after the third firefly flies out');
    for (let k = 1; k <= 5; k++) { add(C.n(k), gj, 'Glow Jars', 'a firefly flies out / counting along', 'number'); add(C.yesN(k), gj, 'Glow Jars: match / how many', 'right jar tapped', 'praise'); }
    add(J.matches, gj, 'Glow Jars: match', 'new question'); for (let k = 1; k <= 3; k++) add(J.which(k), gj, 'Glow Jars: how many (1-3 at a glance)', 'new question');
    add(J.more, gj, 'Glow Jars: which has more', 'new question'); add(J.yesMore, gj, 'Glow Jars: which has more', 'jar with more tapped', 'praise'); add(J.thisMore, gj, 'Glow Jars: which has more', 'second miss: the bigger jar glows', 'feedback');
    add(C.countTogether, gj, 'Glow Jars', 'first miss (count-along starts)', 'feedback');
    return out;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = LN; else { root.El = root.El || {}; root.El.LittleLines = LN; }
})(typeof window !== 'undefined' ? window : globalThis);
