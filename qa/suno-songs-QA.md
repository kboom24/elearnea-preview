# Suno sing-along QA (2026-10-30)

Fast run (`qa/tools/qa-songs.js ... fast`): 7 lessons (ll-r8, zp-1..3, ws-1..3) x p375 / t768 / d1280 = 21/21 PASS.
0 console errors, 0 external requests, 0 failed loads, 0 small/outside targets, 0 overflow, voiceOverMusic=0, Bella intro ends before music.
(d1280 zp-3 first timed out under box load; re-run PASS.)

Real-time sync (`... sync d1280 zp-1,ws-1`), |music clock - lyric time| at highlight:
- zp-1 (Read It, Sing It!, 110 s): p99 start 22.6 / middle 22.0 / end 33.4 ms, max 33.4, n=205 -> PASS
- ws-1 (Read It, 204.8 s): p99 start 23.7 / middle 19.5 / end 16.6 ms, max 27.1, n=545 -> PASS

Screenshots: /workspace/qa/suno/{fast-a,fast-b,fast-c,sync}/
