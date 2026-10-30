/* Sing-along games (Zoo Parade, Word Stage): EVERY line Bella speaks, in one place. Bella only talks before the song starts, while it is
   paused and after it ends (never over the music). The games call these; tools/voice/song-lines.js runs the same functions over
   content/songs.json to list every line in the voice manifest, and tools/voice/check.js verifies them. */
(function (root) {
  'use strict';
  const SL = {
    title: { 'zoo-parade': 'Here comes the zoo parade!', 'word-stage': 'Welcome to the word stage!' },
    // how to play, per lesson mode (said once before the music starts; tap Wick to hear it again)
    how: {
      pictures: ['When you hear a word in the song, tap its picture.', 'Then put the letters in a row, just like the song.'],
      letters: ['Tap the picture you hear in the song.', 'Then find the letters, in order.'],
      words: ['Now you read! Tap the word you hear in the song.', 'Then spell it with the letters.'],
      little: ['Listen to the song, and tap the picture you hear!', 'Then tap the letters.']
    },
    go: "Ready? Let's sing!",
    paused: 'Paused. Tap play to keep singing!',
    end: 'What a song! Look at all the words you read.',
    tapWord: 'Tap a word to hear it!',
    // a collected word on the shelf, tapped after the song (or while paused): Bella reads it, the label lights up
    word: (w) => `${w}.`,
    letter: (l) => `${l.toUpperCase()}.`
  };
  // every word a shelf chip can hold = every song moment's word
  SL.words = (songs) => { const s = new Set(); for (const S of Object.values(songs.songs)) for (const e of S.events) if (e.word) s.add(e.word); return [...s].sort(); };
  SL.all = (songs) => { const out = [], add = (text, game, screen, trigger, type) => out.push({ text, game, screen, trigger, type: type || 'instruction' });
    const g = 'zoo-parade+word-stage';
    for (const [k, v] of Object.entries(SL.title)) add(v, k, 'Sing-along start card', 'Play tapped (before the music); tap Wick to hear it again');
    for (const [m, ls] of Object.entries(SL.how)) for (const l of ls) add(l, g, `Sing-along start (${m} lessons)`, 'Play tapped, after the title line; tap Wick before the song to hear it again');
    add(SL.go, g, 'Sing-along start', 'right before the music starts');
    add(SL.paused, g, 'Sing-along pause card', 'pause button tapped (music stops first)', 'feedback');
    add(SL.end, g, 'Sing-along finale', 'song ended (then the results card)', 'praise');
    add(SL.tapWord, g, 'Sing-along finale / pause card', 'after the end line; while paused');
    for (const w of SL.words(songs)) add(w.length === 1 ? SL.letter(w) : SL.word(w), g, 'Sing-along word shelf', 'a collected word chip tapped while the music is stopped (its label lights up)', w.length === 1 ? 'letter' : 'word');
    return out; };
  if (typeof module !== 'undefined' && module.exports) module.exports = SL; else { root.El = root.El || {}; root.El.SingLines = SL; }
})(typeof window !== 'undefined' ? window : globalThis);
