# Elearnea QA scripts

These are headless Chrome checks for the preview site. Each script opens **one page at a time** and plays or inspects every viewport in turn:
- phone: 390x844 (touch)
- iPad: 1024x1366 (touch)
- desktop: 1280x800

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
  - Without the flag the hooks are absent, and `qa-mothabet-integration.js` checks that they are.
- **Service workers** are blocked in every context, so each run sees the files as served.

## Scripts
| Script | Covers |
|---|---|
| `qa-mothabet-integration.js` | Mothabet lessons: El.Learn word pick/records, Elearnea results card, Path back with stars, dashboard rows, consent key, `__qa` absent without `?qa=1` (rd-l3/l5/l7) |
| `qa-mothabet-polish.js` | Integration checks plus one sound button and one pause in lessons, the sound button muting the game (gain 0, speech blocked, muted after reload), unreached words unrecorded, 0 attempted gives no record, `__qa.state()` safe before play |
| `qa-stars-grid.js` | Mothabet star cap (4 attempted gives 2 stars, 5 attempted gives 3; card, record and path agree), plus no horizontal overflow on the games, realms and map |
| `qa-overflow-pages.js` | Landing, waitlist, grown-ups gate, dashboard (sample and device), portfolio record, plus the regression pages: scrollWidth <= clientWidth, every control inside the viewport, no clipped text. The waitlist form is **never** submitted. |
| `qa-ingame.js` | Full rounds through to the results card of Lily Pad Hop (rd-l2), Firefly Count (ma-l1 count, ma-l3 add) and Clocktower Gears (ma-l5/l6/l7). One deliberate miss on round 2. Real taps; targets >= 64 CSS px and inside the viewport; no overflow. |
| `lib.js` | Shared launch, settings and viewports |
| `serve.sh` | Static server for this checkout under `/elearnea-preview/` |

Scripts that start from a fresh profile expect empty storage. Each opens a new browser context per viewport.
