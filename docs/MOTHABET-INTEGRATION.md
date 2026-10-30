# Mothabet as a first-class Elearnea game

Branch `mothabet/integration`. This covers how Mothabet (copied from Mothabet 1.0.0, engine Hexan 1.2.1) plugs into Elearnea's shared game contract, and the decisions behind it.

## 1. Progress through the shared contract, with one source of truth for learning

**Decision: El.Learn (`assets/js/el.js`) is the ONLY spaced-repetition and difficulty system for Mothabet lessons.**
Mothabet's own scheduler (`MB.recordWord`, `MB.adapt`, `MB.pickRound`, mastery points) is not used in lesson mode.

Why El.Learn:
- It is what Elearnea reads everywhere: the realm path stars (`lessonDone`), the grown-ups dashboard (skills from `srs` and `skills`, the activity log), and every other game. A second scheduler inside the frame would be invisible to all of these, and the two would drift apart.
- El.Learn was generalised from Mothabet's own `learn.js`, with the same Leitner boxes (1/3/7/14/30 days), the same +0.025/−0.1 difficulty rule and the same picker shape. Choosing it loses no learning behaviour; it only moves that behaviour to the shared layer.
- Keys are per skill: `rd.letter-sounds|sun`, `rd.blending-cvc|cat`, and so on. The same word practised in two skills counts as two separate items, which is right, because "first sound of *sun*" and "spell *sun*" are different skills.

Flow, one round (protocol in `play/mothabet/game/bridge.js`, adapter in `assets/games/mothabet.js`):
1. The play page `play/mothabet/?lesson=rd-l1` runs `El.Host`. The adapter opens the frame `game/index.html?lesson=1&band=s&stage=0&stageId=s1`.
2. The frame posts `ready` with the stage's word pool.
3. The adapter calls `host.learn.pick(skill, pool, 10)` and `host.learn.difficulty(skill)`, then posts `start {words, d}`.
4. The frame plays those words at difficulty `d`, held fixed for the round. El.Learn adapts `d` after each word, and the next round uses the new value.
5. On each planned word's FIRST attempt, the frame posts `word {item, firstTry}`. The adapter turns this into `host.emit('mastery')`, which runs `El.Learn.record` (Leitner box + difficulty). Easier retries of a missed word are played, but not recorded a second time. `progress {done, total}` drives the shell's progress.
6. At round end the frame posts `results`. The adapter calls `host.end({total, done, firstTry})`, which runs `lessonDone` (path stars, dashboard log) and shows Elearnea's own results card (Again / Path). Stars come from `El.Learn.starsFor`, the same rule as every other game.

### The 90-second round: only attempted words count
The round stays 90 s. When the timer ends:
- **Finished planned words** are recorded once each (first attempt) and count toward the score.
- **The word on screen at the buzzer** counts as attempted, and is recorded as a miss, only if the child had already placed or missed a moth. If the child hadn't touched it yet, it counts as not reached.
- **Words never reached** are not sent to El.Learn (neither a hit nor a miss) and are not part of the total.
- `host.end` gets `total = done = attempted`, so the card reads "X of *attempted* right on the first try" and `starsFor` scores attempted words only.
- **0 attempted words:** `host.end` skips `lessonDone`. That means no stars, no lesson record, no dashboard log entry and no streak touch. The results card still shows: 0 stars, "Good try!" (an existing voice line), "Tap Again to play", and the Again / Path buttons, without the win chime.

The frame's local save (`hexan:elearnea-mothabet`) still keeps settings (voice, music) and harmless round counters. It does not schedule anything in lesson mode. `El.store.reset()` already clears it.

Fallback: if no parent answers within 2 s (the frame opened on its own), the frame picks the stage's words itself, so the page never hangs.

## 2. Reading-path lessons launch straight into their word set

Each Mothabet lesson in `content/catalog.json` has `{band, stageId, stage}`. `stageId` wins; `stage` (an index) is the fallback.

| Lesson | Skill | Mothabet stage |
|---|---|---|
| rd-l1 First sounds | rd.letter-sounds | s1 First sounds |
| rd-l3 Blend it | rd.blending-cvc | s5 Blend it |
| rd-l5 Shh and chh | rd.digraphs | s7 Shh and chh |
| rd-l7 Spell short words | rd.spelling-cvc | f1 Short vowels |

Lesson mode (`?lesson=1`) starts on a new `lesson` base scene. It never shows Mothabet's title. On top of it sits one card: the stage name, a jar and a big **Go!** button, with no reading needed. It speaks the existing line "Catch the letter moths. Put them in the jar.", and Go enables once El.Learn's words have arrived. The tap on Go also unlocks audio on iOS.

- There is no close button. Elearnea's top bar is the way out.
- The pause menu's "Menu" returns to the card.

### Controls in lessons: one sound button, one pause
- **Sound:** Elearnea's top-bar sound button is the only sound control. Mothabet's own HUD mute is not created in lesson mode (`hud: {mute: false}`), and the engine's KeyM toggle is a no-op there.
  - At boot the frame reads Elearnea's stored setting (`elearnea:v1` `set.sound`/`set.voice`, the same rule as `El.ui.soundBtn`).
  - `El.ui.soundBtn` fires an `el:sound` event. The adapter forwards it as `{type:'sound', on}`. The frame then calls `HX.Audio.setMuted` (which covers sfx and music through the master gain), sets `MB.Voice.enabled`, and stops any speech in progress.
- **Pause:** Elearnea's shell has no pause, so Mothabet keeps exactly one: its HUD pause, shown only during play. It is at least 64 CSS px (`hudFix`), it sits in the frame below Elearnea's top bar, and it stays clear of the top-centre exit zone. QA checks all of this.
- On finish, Elearnea's results card offers **Path**, back to `realm/reading/`, where the lesson's stars show.

## 3. Playtoom leftovers

- **Consent key:** `hexan.js` stays byte-identical to the shared engine copy. A game-level shim, `play/mothabet/game/el-consent.js`, loads before it and, for this frame's own `Storage.prototype` only, redirects `playtoom:consent` / `playversy:consent` to the Elearnea-owned key `elearnea:mothabet:consent`. That key is seeded on first visit as child-directed + under-age, with no analytics and no ads, and these flags are forced on every read, so a stored value can never switch them on. The engine never reads, migrates or deletes a Playtoom key, and other pages are unaffected. We do NOT delete any `playtoom:consent` an earlier preview may have left on the shared github.io origin, because that key is not ours to remove.
- **Portal bridge:** `HX.createGame({ bridge: false })` turns off the engine's Playtoom portal listener (`HX.Bridge`) in this frame. Before, it already could not connect (`portalOrigins: []`); now it does not listen at all.
- **Analytics:** `HX.track` stays local only. Consent is child-directed, so events are blocked before any sink, and the default sink is `console.debug`. There is no network.
- **`window.PLAYTOOM_BRAND`** in `game/index.html` is the engine's config API name. It carries only local fonts and no Playtoom branding. It is kept so that the engine doesn't need editing.
- **Debug hook:** `window.__qa` is defined only when the frame URL has `?qa=1`, and the adapter forwards `?qa=1` from the play page. Without it, `typeof window.__qa === 'undefined'`, which QA verifies. QA scripts must open `play/mothabet/?lesson=…&qa=1`.

### Daily Jar and Moth Book: hidden in Elearnea

Both live only on Mothabet's own title screen, which Elearnea lesson mode never shows. Neither is linked from anywhere in Elearnea.
- **Daily Jar:** hidden. It is "the same 10 words for everyone today", with a jar number, a score to compare and its own streak. That is a social, competitive feature, and it is text-led ("Daily Jar #29", "Done today: 7/10 · 540"). Its fixed word list also bypasses El.Learn, which would break the single source of truth, and its streak duplicates Elearnea's.
- **Moth Book:** hidden. The collection is visual, but it depends on reading: names, "how to earn" lines and progress text. It is driven by Mothabet mastery points, a second progress model that lesson mode no longer feeds, and its 120 "how to earn" lines are not recorded, so they fall back to device speech. Elearnea already rewards with path stars, Wick and treasure chests. If a collection is wanted later, it should hang off El.Learn mastery and use recorded lines.
- Mothabet's own grown-ups screen is unreachable for the same reason. Elearnea's grown-ups dashboard is the one.

## Where the Mothabet source lives

**`play/mothabet/game/` in this repo is the one Mothabet source.** Edit it there.

The seed (`/home/box/elearnea/seed/mothabet-src`) is retired. `tools/sync-mothabet.sh` now just prints "retired", with a pointer to `play/mothabet/game/`, and exits. It reads, writes and deletes nothing. The seed folder itself is left in place, but it is frozen and not maintained.

Known gap: `tools/voice/check.js` and `build-manifest.js` still scan the seed for Mothabet speech, and by decision they are not changed on this branch. Until they are pointed at `play/mothabet/game/`, a new spoken line added only in the repo copy won't be caught. To check by hand, copy the repo folder over a temporary seed (see the QA notes) and run `check.js`.

## Voice

No new spoken lines. The lesson card reuses "Catch the letter moths. Put them in the jar." and "Go!", and the results card uses the shell's existing lines. `node tools/voice/check.js`, run against this branch's Mothabet source, reports 0 problems.
