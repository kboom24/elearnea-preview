# Elearnea QA scripts

These are headless Chrome checks for the preview site. Each script opens **one page at a time** and plays or inspects every viewport in turn:
- phone: 390x844 (touch)
- iPad: 1024x1366 (touch)
- desktop: 1280x800
- extra, by name only: `phone375` (375x667) and `tablet768` (768x1024)

A step fails on any console error, any request outside the site's origin, or any 4xx/5xx or failed load. Screenshots and a `qa-results*.json` file go to the output directory you pass in. Keep that directory outside the repo: `qa/.gitignore` ignores images, logs and result files.

## Run
```bash
PID=$(qa/tools/serve.sh 8780)                 # serve this checkout at /elearnea-preview/
/home/box/games/tools/qa-slot.sh node qa/tools/qa-ingame.js http://127.0.0.1:8780/elearnea-preview/ /tmp/qa-out phone,ipad,desktop
kill $PID                                      # stop your own server
```
- **Always wrap runs in `qa-slot.sh`** on the shared box. It queues for a QA slot. Elearnea holds at most 2 slots, and each job must stay under 15 minutes. To chunk a long run, pass fewer viewports per job (third argument), or fewer lessons (fourth argument, `qa-ingame.js` only).
- **Settings:**
  - `QA_PLAYWRIGHT`: path to the `playwright-core` module. Default: the shared box copy, then a normal `require('playwright-core')`.
  - `QA_CHROME`: path to the browser. Default: `/usr/bin/google-chrome`.
- **`?qa=1`:** game QA hooks exist only with `?qa=1` on the play page URL:
  - Mothabet: `window.__qa` inside its frame. The adapter forwards `?qa=1` to the frame.
  - Clocktower Gears: `data-want` / `data-busy` on `#stage`.
  - Wick's Lantern Path: `data-sol` (a program that works, e.g. `R,X3(U)`), `data-bug`, `data-prog`, `data-busy`, `data-lv` on `#stage`, plus the generator self-test `#stage._wpTest`. `qa-wicks-path.js` checks they are all absent without the flag.
  - Moth Bridge: `data-want` (`tap:<i>`, `slide`, `pick:<word>`, `seg:<letter>`), `data-miss` (a wrong choice for the deliberate miss), `data-word` and `data-busy` on `#stage`. `qa-ingame.js` checks they are absent without `?qa=1`.
  - Little Lanterns: the kit marks the right card with `data-ok`, only with `?qa=1`. `qa-ingame.js` checks the marker is absent in kid mode.
  - Without the flag the hooks are absent, and `qa-mothabet-integration.js` checks that they are.
- **Service workers** are blocked in every context, so each run sees the files as served.

## Scripts
| Script | Covers |
|---|---|
| `qa-mothabet-integration.js` | Mothabet lessons: El.Learn word pick/records, Elearnea results card, Path back with stars, dashboard rows, consent key, `__qa` absent without `?qa=1` (rd-l3/l5/l7) |
| `qa-mothabet-polish.js` | Integration checks plus one sound button and one pause in lessons, the sound button muting the game (gain 0, speech blocked, muted after reload), unreached words unrecorded, 0 attempted gives no record, `__qa.state()` safe before play |
| `qa-stars-grid.js` | Mothabet star cap (4 attempted gives 2 stars, 5 attempted gives 3; card, record and path agree), plus no horizontal overflow on the games, realms and map |
| `qa-overflow-pages.js` | Landing, waitlist, grown-ups gate, dashboard (sample and device), portfolio record, plus the regression pages: scrollWidth <= clientWidth, every control inside the viewport, no clipped text. The waitlist form is **never** submitted. Age band switch: grown-ups "Who is playing" (>= 44px, saves the band) and the map's lantern switch in both bands (>= 64px; targets under 96px in Little Lanterns are listed). |
| `qa-ingame.js` | Full rounds through to the results card. K-3 games: Lily Pad Hop (rd-l2), Moth Bridge (rd-b1 onset-rime, rd-b2 short a, rd-b3 mixed vowels, rd-b4 segmenting; rd-b3/b4 start at difficulty .6 for 3 cards and a tray distractor; real lantern drag on odd rounds, lantern tap/auto-slide on even rounds; exit-tab zone and picture-art checks), Firefly Count (ma-l1 count, ma-l3 add), Clocktower Gears (ma-l5/l6/l7). Little Lanterns, ages 0-4: Lantern Barn, Picture Garden and Glow Jars, every `ll-*` lesson, with the age band set as a parent would. One deliberate miss on round 2 where the mode has choices. Real taps; targets inside the viewport and >= 64 CSS px (>= 96 for Little Lanterns, top bar and results buttons included); no overflow. Fourth argument: `all`, `k3`, `early`, or a list of lesson ids. Also runs the praise probe (see `praise-probe.js`); the note ends with `voice: …`. |
| `qa-wicks-path.js` | Wick's Lantern Path (Logic & Coding): map island open, Logic realm path (4 lessons) and launch in kid mode (no QA hooks), full rounds of lg-l1..lg-l4 with real taps, a deliberate miss, the help path (step glows, traced arrow, program that works; debugging: free watch run first), short-program cheer, grown-ups CSTA labels. Fifth argument: a JSON plan of lessons per viewport. |
| `qa-voice.js` | The ElVoice `onend` contract on the map page: exactly one `onend` per `say()` for a natural end, a duplicate `ended`, `stop()`, a newer `say()`, a stalled clip (watchdog at duration + 1.5 s, advancing once) and a failed clip |
| `praise-probe.js` | Used by `qa-ingame.js`. An init script (all frames) logs every voice clip (start, natural `ended`, or cut by pause / a new clip) and every game advance (`el:progress`, `el:end`). Fails a lesson if a praise line (manifest type `praise`, or Mothabet's word cheer) did not play to its end, if any clip was still playing when the next item appeared (40 ms grace), or if no voice was heard. `otherCut` counts prompts the child cut by tapping, which is allowed. Games wait for praise through `ElVoice.sayThen` (`voice/voice-then.js`): the clip's `ended` + 300 ms, with a watchdog of clip duration + 1.5 s. |
| `qa-praise-taps.js` | Impatient taps during praise: Lantern Barn (ll-r1), Picture Garden (ll-r2), Glow Jars (ll-m1), Lily Pad Hop (rd-l2). After each right answer it taps every card / pad, the right one again and Wick for ~1.6 s. Pass: every praise line plays to its end, each `el:progress` moves `done` by exactly 1 (no skip, no double advance), the results card is reached, 0 console errors, 0 outside requests |
| `lib.js` | Shared launch, settings and viewports |
| `serve.sh` | Static server for this checkout under `/elearnea-preview/` |

Scripts that start from a fresh profile expect empty storage. Each opens a new browser context per viewport.
