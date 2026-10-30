# Sing-along games: Zoo Parade ("Read It, Sing It!") and Word Stage ("Read It")

Songs by Hexan, made with Suno. Commercial rights unconfirmed, so they stay in the noindex preview only.
Code: `assets/games/sing-along.js` (+ `.css`), lines `assets/games/sing-lines.js`, data `content/songs.json` built by `tools/songs/build-songs.py`.

## 2026-10-30: "nothing happens in it other than the song playing" (Hexan)
I couldn't reproduce a crash: in kid mode (real time, no autoplay flag) at 375 and 1280 px the old moments did appear.
The real problem was that the song had only 10 short moments for 110 s:
- **Long dead stretches.** Nothing happened during the intro, any chorus line, the owl line or the sneeze line, or the last 23 s.
- **Early spell tiles.** The tiles showed 5–7 s before their letters were sung, then nothing reacted to the music.
- **Cards vanishing on tap.** A tapped card left the screen after 0.45 s, leaving the play area empty until the next moment.

To a parent, that looks like "just the song".

### Now: the whole song is one moment after another (no gaps; the longest real-time stretch with nothing to tap is measured by QA)
| Lyric | Moment | Lesson |
|---|---|---|
| Ready, little readers? Point and sing! / Here comes the zoo... | **track**: each word is a bubble that lights as it's sung; tap it for a star | print goes left to right, one spoken word = one written word (RF.K.1.A/B) |
| Cat has a hat... | **pick** the cat; when "hat" is sung, a hat with its word lands on the cat | word ↔ picture; cat / hat rhyme (RF.K.2.A) |
| She reads "CAT" | **read**: the word in a book, tap its picture (hat is the look-alike) | read a CVC word (RF.K.3) |
| Duck says "QUACK!" | **pick** the duck; it quacks (recorded CC0 sound) | word ↔ picture |
| D-U-C-K! / C-A-T / B-E-A-R / F-R-O-G / B-E-A-R | **spell**: each slot glows as the song sings its letter, and its tile glows too; tap in time | letter names in order (RF.K.1.D, L.K.2.D) |
| Read it, sing it... / Words have sounds... (all choruses) | **track** (balloons, bubbles, stars) | follow the print |
| Frog finds a log | **pick** the frog; the log lands under it | frog / log rhyme |
| He reads "FROG" | **read** | read a word |
| ...wears his book like a cinnamon bun | **pick** the book | word ↔ picture |
| A says "ah!" and B says "buh!" | **sound**: A, B (+1 other letter for Explorers). The sound pops up in a speech bubble as it's sung; tap the letter that makes it | letter-sound (RF.K.3.A) |
| Owl reads upside down, "Whooo wrote that, huh?" | **flip**: "owl" and "who" appear upside down; tap to turn them the right way up (the owl hoots) | print has a right way up (RF.K.1) |
| Panda spells "P-A-N-D-A" | **spell** panda | letter order |
| Then sneezes the letters, "Achoo!" | the built letters burst across the floor; **catch** them in order to rebuild PANDA | letter order again (practice) |
| Cat, duck, frog, bear, hooray! | **roll call**: four picture+word cards light as they're named; tap each | recap |
| We read together every day! | **track** | |
| music outro | **stars**: your collected words float as stars; tap to catch them | word ↔ picture recap |

Scored (El.Learn mastery, progress dots, stars) = pick, read, spell, sound: 14 in Read It, Sing It.
Practice moments (track, flip, roll, stars, beat, catch) never score and never fail.

Missed taps follow the same pattern everywhere:
- After a short wait, the answer glows (sooner for Little Lanterns). When the moment ends, it's modelled.
- A word that hasn't been sung yet just wiggles ("wait for it").
- Praise is silent and varied: a chime, sparkles, and a pop-up word from Yes! / Great! / Super! / You got it! / Wow! / Yay! / Nice! / Ta-da!, with no repeat twice in a row. Bella never talks over the music.

Every picture shows its word (docs/WORD-LABELS.md). The only exception is the "words" (reading) lessons: there, the read-moment labels appear when the child taps.

### Word Stage ("Read It", 205 s)
It had the same problem: 19 moments, with stretches of up to 16 s with nothing to do.
- `build-songs.py fill_gaps()` now fills every gap of 2 s or more with **track** moments for the lyric lines inside it.
- Where there are no reliable words (the music-note stretches, including the 1:57–2:12 bridge), it adds a **beat** moment: tap the drum on the beat, and a star appears for each tap within 160 ms of a beat (steady beat).

### Lyrics
- **Read It, Sing It!** The shown text is Hexan's official lyric sheet (`/home/box/elearnea/music/suno/lyrics/read-it-sing-it.txt`).
  - Timings are the recogniser's, aligned word by word with difflib: 208 of 210 words match exactly; "a" (wordy) and "da!" are placed between their neighbours.
  - Spelled words are one letter box per letter.
- **Read It.** Still the recogniser's text; there's no lyric sheet yet, and its bridge still shows music notes.

### Data (content/songs.json, per song: `events`, in play order, each with `open`/`close` in song seconds)
`track {words:[[text,start,end]], theme}`, `pick {word, t, deco?:{pic,t}, sfx?}`, `read {word, t}`, `spell {word, letters:[t], sneeze?}`,
`sound {items:[{l, t, snd}]}`, `flip {words:[{w,t}]}`, `roll {words, times}` (no `open` = old passive roll call),
`stars {}`, `beat {}`. Read It, Sing It! comes from `plan` in build-songs.py: each moment opens `lead` before its cue or when the previous one may end, and closes when the next opens.

### Robustness
- The game loop catches a bad frame instead of dying.
- If the music stops by itself (a phone call, or another app takes the audio), the pause card shows, so the song and the game stay together.

### QA
`qa/tools/qa-songs.js`:
- **fast**: every moment type, with real taps and a deliberate miss.
- **sync**: real time, an eager kid tapping whatever the song asks for. It checks lyric drift and the longest stretch with nothing to tap (must be 3 s or less).

`qa/tools/repro-song.js` is the kid-mode repro used for Hexan's report.
