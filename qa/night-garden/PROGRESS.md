# Wick's Night Garden — progress / resume notes
Branch game/night-garden from 8c0eaf9, worktree /home/box/elearnea/wt-night-garden.
- [x] worktree created (Fri Oct 30 ~01:55 PDT)
## Plan (02:05)
- game id `night-garden`, page play/night-garden/, files assets/games/night-garden{.js,.css,-lines.js,-art.js}, realm/science/index.html, tile assets/img/tile-night-garden.svg
- lessons ns-l1 sort (skill ns.living), ns-l2 needs (ns.needs), ns-l3 cycle (ns.lifecycle), ns-l4 homes (ns.homes); NGSS.K-LS1-1 / K-ESS2-2 (+3-LS1-1 intro on cycle)
- all spoken lines in night-garden-lines.js (NGL.all()) -> build-manifest.js section + check.js clause
- QA script qa/tools/qa-night-garden.js (data-want/data-busy with ?qa=1), out /home/box/elearnea/qa/night-garden/
- [x] M1 committed (code, catalog, tiles, manifest wiring; check.js 0 problems; 178 ng lines pending render) ~02:25
- [ ] QA script qa/tools/qa-night-garden.js + smoke screenshots
- [ ] render voice (regen.py via flock+qa-slot), ASR check, hold fails
- [ ] full QA 3 viewports, perf ipad, fix visuals, merge origin/main, push
regen: flock pid 3691352 (waits for Elearnea <2 jobs), log /tmp/ng/regen.log
server pid 3695401 port 8871 (kill when done)
- [x] voice rendered 183 (02:15), ASR: 7 ng flagged
## 02:31 status
- fixed: root class clash (.ng-cycle) -> root now `ng ng-m-<mode>`; QA accept check waits for data-want cleared
- smoke phone (before fix): ns-l1/l2/l4 PASS, ns-l3 failed (layout bug, fixed, rerun needed). shots /tmp/ng/smoke
- ASR flagged 7: a-moth, a-bee, a-toy-ball, a-cup, a-toy-car, pumpkin-done, recap-3. Retry clips in /tmp/ng/retry/out (say.py, 0.76, af_bella)
  passing: "Look, a moth!" (moth2), "A buzzy bee!" (bee3), "A toy car." (car1), "The pumpkin grew from a tiny seed." (pump1), "Seed, then sprout, then flower!" (rec2)
  round 2 for cup/ball queued -> /tmp/ng/retry/score2.log (cands2.csv)
- TODO: item `say` overrides in night-garden-lines.js, copy passing clips to voice/clips/<newid>.{mp3,opus}, rebuild manifest (VOICE_MD/EL_CSV in /tmp/ng), asr-check new ids, hold any still failing
- TODO: moon overlaps replay button on phone -> move moon
- TODO: full QA 3 viewports via qa/night-garden/elslot.sh node qa/tools/qa-night-garden.js http://127.0.0.1:8871/elearnea-preview/ /home/box/elearnea/qa/night-garden <vp>
