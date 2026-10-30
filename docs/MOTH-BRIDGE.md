# Moth Bridge (Reading, ages 5-7)

This is the step after Mothabet's letter sounds. Sound-moths land on a bridge. The child taps each one, left to right, to hear its sound. Then the child slides the lantern under the moths to push the sounds together, and picks the picture of the word. The reverse round takes a word apart: the child hears the word, sees its picture, and taps its sounds onto the bridge in order.

**Fun that teaches (Hexan's rule):** every interaction is a phonics step.
- A moth tap plays a sound.
- The slide blends the sounds.
- A picture pick names a word.
- A tray tap plays a sound.

Nothing on screen needs reading. Answers are pictures, and the letters are only on the moths.

## Lessons (content/catalog.json, reading realm)

| Lesson | Skill (El.Learn) | Mode | Grade | Standards | Rounds | Placed |
|---|---|---|---|---|---|---|
| rd-b1 Moth bridge: c + at | rd.blend-sounds | `onset`: onset + rime, 2 moths (c + at) | K | RF.K.2.C, RF.K.3.A | 6 | after rd-l2, right before Mothabet "Blend it" (rd-l3) |
| rd-b2 Moth bridge: c-a-t | rd.blend-sounds | `short-a`: 3 sounds, short a CVC | K | RF.K.2.D, RF.K.3.A, RF.K.3.B | 6 | after rd-b1 |
| rd-b3 Moth bridge: a e i o u | rd.blend-vowels | `mixed`: 3 sounds, all five short vowels | 1 | RF.1.2.B, RF.K.3.B | 8 | after Mothabet "Blend it" (rd-l3) |
| rd-b4 Moth bridge: tap the sounds | rd.segment-sounds | `segment`: hear the word, tap each sound in order | 1 | RF.1.2.D, RF.K.2.D | 6 | right before Mothabet "Spell short words" (rd-l7) |

The realm path is now: rd-l1 letter sounds, rd-l2, **rd-b1, rd-b2**, rd-l3 Mothabet blend, **rd-b3**, rd-l4, rd-l5, rd-l6, **rd-b4**, rd-l7 Mothabet spelling.

## Word lists (assets/games/moth-bridge-lines.js)

Every word uses a Mothabet word clip that passed the check, plus a picture a child can name without reading.

| Lesson | Words |
|---|---|
| onset (rd-b1) | cat hat bat rat (-at), cap map (-ap), can fan pan (-an), bug mug rug (-ug), mop top (-op), dog log (-og), pig wig (-ig), pin (-in), sun (-un), bus (-us), cup (-up) |
| short-a (rd-b2) | cat hat bat rat cap map bag can fan jam pan |
| mixed (rd-b3) | cat map bag leg web pig wig pin lip dog log mop pot top bug bus cup mug rug sun |
| segment (rd-b4) | cat map bag leg web pig pin dog mop pot bug bus cup sun (no repeated letters) |

## Play

**Blend modes**
1. The moths land on the planks. The first moth pulses. The child taps each moth in order, and each says its sound. A tap out of order says that moth's sound and nudges the right one.
2. "Now slide them together!" The child drags the lantern. Passing under each moth plays its sound. At the end, the moths huddle together. A tap on the lantern (or Enter) runs the same slide automatically.
3. "Which picture is it?" The child picks from 2 picture cards, or 3 once difficulty is at least .35. Above difficulty .5, the distractors are look-alikes that differ by one sound (cat, hat, cap). Pairs a child could name either way never share a screen: cap/hat, cup/mug, pot/pan/can.
4. **Right:** the word, then praise ("You blended it!" or "Over the bridge!"), and the moths fly across. The next word starts only after the line ends: voice onend plus a run token, with a watchdog.
5. **Miss 1:** the child hears the word they picked, then "Listen again!". The lantern replays the slide as a model, and the question is asked again.
6. **Miss 2:** the model plays, then the right card glows: "cat! Here it is!". The child taps the glowing card.

**Segment mode**
1. The picture is shown and the word is said: "Tap the sounds in order. What sound comes first?"
2. Every tray moth says its sound when tapped. Above difficulty .5, the tray has one extra moth as a distractor.
3. **Right:** the moth flies to its plank, followed by "What sound comes next?" or "What is the last sound?".
4. **Miss 1:** the tapped sound plays, then "Listen again!", the word, and the question again.
5. **Miss 2:** the right moth glows: "Here it is!" plus its sound.
6. **Done:** the lantern slides the placed sounds back together, followed by "pig! You found every sound!".

**Mastery:** `emit('mastery', {item: word, firstTry})` goes to El.Learn, which is the only SRS: `L.pick` for word choice and `L.difficulty` for the number of cards and distractors.

**Layout**
- Targets: moths 84-148 px, cards 104-168 px, lantern 72x78, hear button 76 (68 on short screens).
- The hear button sits on the left. Nothing is in the exit-tab zone.

## Voice

| What | Clips |
|---|---|
| Sounds (reused) | Mothabet phoneme clips voice/mb/ph_{a,b,c,d,e,f,g,h,i,j,l,m,n,o,p,r,s,t,u,w}. These are "unverified" phonemes: ASR can't judge pure sounds, so they need a human ear check, but they play. |
| Words (reused) | Mothabet word clips voice/mb/w_{cat hat bat rat cap map can fan pan bug mug rug mop top dog log pig wig pin sun bus cup bag jam leg web lip pot}. All passed the speech check (check.human false). |
| Rimes (reused) | w_in, w_us (passed) for -in and -us. |
| Lines (reused) | "Listen again!" (ll.listen-again), "Here it is!" (ff.here-it-is). |
| Avoided | Every held or ASR-flagged clip in voice/mothabet/REVIEW-076.md. Flagged words left out: bed did hen her hum hut jet jug kit net nut pen tub van zip. Flagged rimes left out: w_at, w_an, w_up, plus am and ox. The -at, -an and -up rimes are new lines instead. |

`tools/voice/check.js` enforces this. It fails if any Moth Bridge word has no passing Mothabet clip, or if a rime reuses a held or flagged clip. It also checks every line from `B.all()` against the manifest.

## VOICE-NEEDS (for Voice & Audio; not rendered, device speech until then)

Render these with say.py into `voice/clips/<file>.mp3` (+ .opus). Ids come from voice/manifest.json, and the CSV row is in the branch-local elearnea-lines.csv. Rimes are sounds, not letter names: a short vowel plus a held or clipped end, with no extra "uh".

| File | Exact text | Use |
|---|---|---|
| el.help-the-moths-cross-the-bridge.mp3 | Help the moths cross the bridge! | lesson "say" line (rd-b1..b4) + first round intro |
| mbr.tap-each-moth-to-hear-its-sound.mp3 | Tap each moth to hear its sound. | blend: moths have landed (rounds 1-2) |
| mbr.now-slide-them-together.mp3 | Now slide them together! | blend: every moth heard, the lantern lights up |
| mbr.which-picture-is-it.mp3 | Which picture is it? | blend: after the slide, and re-asked after a miss |
| mbr.tap-the-sounds-in-order.mp3 | Tap the sounds in order. | segment: rounds 1-2 |
| mbr.what-sound-comes-first.mp3 | What sound comes first? | segment: first plank |
| mbr.what-sound-comes-next.mp3 | What sound comes next? | segment: middle plank |
| mbr.what-is-the-last-sound.mp3 | What is the last sound? | segment: last plank |
| mbr.you-blended-it.mp3 | You blended it! | praise: right picture on the first try |
| mbr.over-the-bridge.mp3 | Over the bridge! | praise: right picture on the first try |
| mbr.you-found-every-sound.mp3 | You found every sound! | segment: word complete |
| mbr.att.mp3 | att | rime /æt/ (cat, hat, bat, rat) |
| mbr.app.mp3 | app | rime /æp/ (cap, map) |
| mbr.ann.mp3 | ann | rime /æn/ (can, fan, pan) |
| mbr.ugg.mp3 | ugg | rime /ʌg/ (bug, mug, rug) |
| mbr.opp.mp3 | opp | rime /ɑp/ (mop, top) |
| mbr.ogg.mp3 | ogg | rime /ɑg/ (dog, log) |
| mbr.igg.mp3 | igg | rime /ɪg/ (pig, wig) |
| mbr.unn.mp3 | unn | rime /ʌn/ (sun) |
| mbr.upp.mp3 | upp | rime /ʌp/ (cup) |

The rime texts use Mothabet-style spellings ("att", not "at") so each rime has its own manifest key. "at", "an" and "up" are already Mothabet word items with flagged clips. If say.py mis-reads a spelling, give it an IPA override (the regen.py ipa column).

## Files
- `assets/games/moth-bridge.js` / `.css`: the game (`El.defineGame('moth-bridge')`).
- `assets/games/moth-bridge-lines.js`: words, sounds and every spoken line. It is shared by the game, `tools/voice/bridge-lines.js` (manifest builder) and `check.js`.
- `assets/games/moth-bridge-pics.js`: 21 new original paper-cut pictures (bat rat cap map bag can fan jam pan leg web wig pin lip mop pot top bug bus mug rug). cat, hat, dog, pig, cup, sun and log come from `assets/js/pics.js`.
- `play/moth-bridge/index.html`, `assets/img/tile-bridge.svg` (from `tools/make-tiles.js`).
- QA: `qa/tools/qa-ingame.js` covers rd-b1..rd-b4. It does real taps, a real lantern drag on odd rounds and a lantern tap (auto-slide) on even rounds, and one deliberate miss on round 2 (picture or segment tray). It also checks the exit-tab zone, that every card has its picture, and that `?qa=1` hooks are absent in kid mode.
