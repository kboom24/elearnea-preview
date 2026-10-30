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
## 02:38 status (resume here)
- done: wording overrides (moth/bee/car/pumpkin/recap-3) in night-garden-lines.js; passing retry clips copied to voice/clips (ng.look-a-moth, ng.a-buzzy-bee, ng.a-toy-car, ng.the-pumpkin-grew-from-a-tiny-seed, ng.seed-then-sprout-then-flower); orphan clips removed; manifest rebuilt; check.js 0 problems; moon moved
- waiting: round 2 (cup/ball) -> /tmp/ng/retry/score2.log. If a candidate passes: change NGL item `name` for cup/ball to it, rebuild manifest, cp /tmp/ng/retry/out/{mp3,opus}/<cand>.* voice/clips/<newid>.*
- then: asr-check the ng range again (find indices: node -e on manifest, game==='night-garden'), rebuild manifest -> held list = lines still flagged
- then: full QA (server pid in /tmp/ng/serve.pid, port 8871): qa/night-garden/elslot.sh node qa/tools/qa-night-garden.js http://127.0.0.1:8871/elearnea-preview/ /home/box/elearnea/qa/night-garden phone  (then ipad, desktop separately, each <15 min)
- 02:40 queued full QA chain: /tmp/ng/qa-all.sh -> /tmp/ng/qa-all.log
## 02:44 resume
- old waiting jobs killed (their outer `timeout 900` counted queue time); single chain /tmp/ng/chain.sh (pid 3790248): tts round 2 -> QA phone, ipad, desktop. log /tmp/ng/qa-all.log
- 02:50 merged origin/main f7ce709 (conflicts sw.js/manifest/index resolved: theirs + rebuild, SW v12); switched speak() to host.sayThen + run token; NEED asr re-run on ng range (merge dropped ng asr records)
- 03:04 chain still queued (other Elearnea builders hold 3 jobs; elslot.sh waits for <2). clip 200 check: 365/365 ok (curl, server 8871)

## 03:34 resume
- Old chain pid 3790248 is gone; live chain = /tmp/ng/chain.sh pid 3869122 (started 03:14), still queued at "tts round2" (Elearnea slots held by moth-bridge x2 + map-labels). Server 3695401 :8871 alive.
- origin/main still f7ce709 (merged). Pushed game/night-garden @ 97acc0c (first push, no force).
- Remaining: round2 cup/ball → apply → ASR ng range → held list → QA phone/ipad/desktop → visuals → commit/push → kill server 3695401 + chain.
- 03:46 still queued at tts round2 (Elearnea slots busy)
- 03:57 old chain 3869122 held the shared TTS flock while queued (blocked 3 other jobs) → killed my own PIDs, added 'elslot.sh --wait', restarted chain pid 4051730 (gate first, then flock+qa-slot).
- 04:17 chain 4051730 still gated (Elearnea jobs running: many)
- 04:19 elslot v2: gate on Elearnea-HELD slot locks (<2) instead of counting queued waiters; restarted chain pid 4189040. NOTE another builder (loudquiet, pid 4092520) runs my elslot.sh — edit it only via atomic mv.
- 04:24 chain 4189040 alive (gated, elslot v2). The cmdline noise in qa-all.log lines 101-107 came from the killed v1 orphan 4051735; v2 has no cmdline read and every readlink is 2>/dev/null, so no new noise (checked). Future elslot edits: atomic mv only.
- 04:33 still gated at tts round2 (Elearnea holds 2+ slots)
- 04:51 round2: ball → 'A bouncy ball!' PASS (1.0); cup3-5 all FLAG. Round3 cup (Look, a cup!/Here is a cup!/A cup for tea!/A cup!) queued: /tmp/ng/round3.sh pid 429421, runs after chain. Phone QA started 04:42 (gated wait). ng manifest range still 2197-2374, el 30-34.
- 05:01 phone QA still gated/running
- 05:02 PHONE QA 6/6 PASS (0 err/0 ext, targets>=64, voiceMisses 0, praiseCut 0); phone screenshots reviewed, no visual fixes needed. iPad running.
- 05:11 iPad 5/6: ns-l3 FAIL 'accepted (want cleared)' q=1 = QA race (short cycle praise finished during the slow iPad screenshot, so the next want was already set; game state correct in screenshot). Fix: game marks data-ask counter (qa only), QA accepts want-cleared OR ask moved on. iPad perf l1 55.9fps p95 16.8, l2 54.5/16.8, l4 53.0/16.8. Rerun ipad after desktop; ball/cup edits deferred until the chain ends (don't change voice mid-QA).
- 05:14 CEO: main now ab84135 — do NOT merge origin/main again, leave SW at v12 (CEO resolves sw/catalog/manifest at merge). Desktop still gated. Perf meter: shot() now flags screenshot windows; frames during shots are reported apart (shotFrames/shotMax), gameplay max no longer capped at <1000, +hitches50/100. Plan: desktop → round3 → ball/cup edits + manifest → ASR 2197-2374 + 30-34 → ipad rerun → commit/push → kill server/chain.
- 05:24 DESKTOP 6/6 PASS, screenshots reviewed OK. Ball applied: name 'A bouncy ball!' (ng.a-bouncy-ball, ball3 clip, ASR 1.0), removed ng.a-toy-ball clips, manifest rebuilt, check.js 0 problems. Round3 (cup) gated since 05:23.
- 05:35 Round3 cup: 'Here is a cup!' scored 0.75 but heard 'Here is a cop' (key noun wrong); all others FLAG → dropped cup from the sort items (not-living now rock, ball, shoe, spoon, hat, car, sun, moon, robot; cup picture stays on the bin badge, no voice). Removed 3 cup clips. ng lines now 175 (manifest 2197-2371), el 30-34. chain2 pid 875797: ASR ng+el (+flagged recheck) then iPad rerun.
- 05:44 ASR: ng 175 + el 5 checked; 8 flagged on the first pass, all 8 pass the padded/beam re-check → 0 Night Garden lines held (global held stays 15, none NG). Borderline: 'A bud.' heard 'Labid' (0.67), 'Next comes the bud.' heard '...bod' (0.75) → human ear check suggested. check.js 0 problems. iPad rerun in progress.
