/* Wick's Lantern Path: every line the game can speak (single list used by the game AND tools/voice/build-manifest.js,
   so the voice manifest can't drift from the code). Browser: window.WPLines. Node: module.exports. */
(function (root) {
  'use strict';
  const DIR = { U: 'Go up!', D: 'Go down!', L: 'Go left!', R: 'Go right!' };
  const REP = { 2: 'Repeat two times!', 3: 'Repeat three times!', 4: 'Repeat four times!' };
  const W = {
    dir: DIR, rep: REP,
    // prompts (first puzzle of a round gets the longer how-to line)
    p1first: 'Help me light the lantern! Pick an arrow. Then press Go!', p1: 'Which way to the lantern?',
    p2first: 'Make a path to the lantern. Then press Go!', p2: 'Make a path to the lantern!', p2two: 'Light both lanterns!',
    p3first: 'Oh no! One arrow is wrong. Find it and fix it!', p3: 'Find the wrong arrow and fix it!', p3sel: 'Now pick the right arrow.',
    p4first: 'Use the repeat block to make it short!', p4: 'Use the repeat block!',
    // building the program
    empty: 'Add some arrows first!', full: 'No more room!', fullLoop: 'No more room! Try the repeat block.', fillRep: 'Put an arrow in the repeat block!',
    tapArrow: 'First tap the arrow you want to fix.',
    // gentle stops (no crash, no lives)
    flower: 'A flowerbed is in the way!', stone: 'Oops! A stone is in the way.', edge: "Oops! That's the edge of the garden.",
    short: 'Oh! I did not reach the lantern.', far: 'Oops! I went too far.',
    // help that gets stronger: 1) the step that went wrong, 2) trace the right next arrow, 3) a program that works
    wrongStep: 'This arrow went the wrong way.', missing: 'Add one more arrow here.', extra: 'This arrow is one too many.',
    thisWay: 'This way!', model: 'Here is a path that works. Press Go!',
    // praise (plays to the end before the next puzzle)
    praise: ['You lit the lantern!', 'The lantern is glowing!', 'Your program works!'], both: 'Both lanterns are glowing!', fixed: 'You fixed it!',
    shortProg: 'A short program! Smart thinking!', finale: 'All the lanterns are glowing!'
  };
  // every line with its use, for the voice manifest
  W.all = function () { const out = [], add = (text, type, screen, trigger) => out.push({ text, type, screen, trigger });
    for (const k of 'UDLR') add(DIR[k], 'instruction', "Wick's Lantern Path", 'arrow tile added to the program; each step as Wick walks the program; help: the right next arrow');
    for (const n of [2, 3, 4]) add(REP[n], 'instruction', "Wick's Lantern Path loops", `repeat ${n} block added / starts running`);
    add(W.p1first, 'instruction', "Wick's Lantern Path one step", 'first puzzle'); add(W.p1, 'instruction', "Wick's Lantern Path one step", 'next puzzles; tap Wick / hear again');
    add(W.p2first, 'instruction', "Wick's Lantern Path sequences", 'first puzzle'); add(W.p2, 'instruction', "Wick's Lantern Path sequences", 'next puzzles'); add(W.p2two, 'instruction', "Wick's Lantern Path sequences", 'puzzle with two lanterns');
    add(W.p3first, 'instruction', "Wick's Lantern Path debugging", 'first puzzle'); add(W.p3, 'instruction', "Wick's Lantern Path debugging", 'next puzzles'); add(W.p3sel, 'instruction', "Wick's Lantern Path debugging", 'an arrow in the program is picked');
    add(W.tapArrow, 'instruction', "Wick's Lantern Path debugging", 'palette arrow tapped before picking a program arrow');
    add(W.p4first, 'instruction', "Wick's Lantern Path loops", 'first puzzle'); add(W.p4, 'instruction', "Wick's Lantern Path loops", 'next puzzles');
    for (const k of ['empty', 'full', 'fullLoop', 'fillRep']) add(W[k], 'feedback', "Wick's Lantern Path", k === 'empty' ? 'Go with no arrows' : k === 'fillRep' ? 'Go with an empty repeat block' : 'program strip is full');
    for (const k of ['flower', 'stone', 'edge', 'short', 'far']) add(W[k], 'feedback', "Wick's Lantern Path run", 'Wick stops gently where the program went off');
    for (const k of ['wrongStep', 'missing', 'extra', 'thisWay', 'model']) add(W[k], 'feedback', "Wick's Lantern Path help", 'after a run that did not work (help grows each try)');
    for (const t of W.praise) add(t, 'praise', "Wick's Lantern Path", 'lantern lit');
    for (const k of ['both', 'fixed', 'shortProg', 'finale']) add(W[k], 'praise', "Wick's Lantern Path", k === 'finale' ? 'round ends' : 'puzzle solved');
    return out; };
  if (typeof module !== 'undefined' && module.exports) module.exports = W; else root.WPLines = W;
})(typeof window !== 'undefined' ? window : this);
