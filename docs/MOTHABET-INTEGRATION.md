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
6. At round end the frame posts `results`. The adapter calls `host.end({total, done, firstTry})`, which runs `lessonDone` (path stars, dashboard log) and shows Elearnea's own results card (Again / Path). Stars come from `El.Learn.starsFor`, the same rule as every other game. Planned words not reached before the 90 s timer count as not right on the first try.

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

`play/mothabet/game/` in this repo is now the versioned source. The untracked seed (`/home/box/elearnea/seed/mothabet-src`) lacks the integration (bridge protocol, consent shim, lesson mode, QA gate). `tools/sync-mothabet.sh` therefore refuses to copy over it unless `MB_SYNC_FORCE=1` is set, and it lists the files that differ. Port seed changes (for example voice prompt wording) by hand.

Note: `tools/voice/check.js` and `build-manifest.js` still scan the seed. They are left untouched on this branch, because another worker's voice change is editing them. Once that lands, point them at `play/mothabet/game/`.

## Voice

No new spoken lines. The lesson card reuses "Catch the letter moths. Put them in the jar." and "Go!", and the results card uses the shell's existing lines. `node tools/voice/check.js`, run against this branch's Mothabet source, reports 0 problems.
