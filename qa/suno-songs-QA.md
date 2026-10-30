# Suno sing-along QA (2026-10-30)

Fast run (`qa/tools/qa-songs.js ... fast`): 7 lessons (ll-r8, zp-1..3, ws-1..3) x p375 / t768 / d1280 = 21/21 PASS.
0 console errors, 0 external requests, 0 failed loads, 0 small/outside targets, 0 overflow, voiceOverMusic=0, Bella intro ends before music.
(d1280 zp-3 first timed out under box load; re-run PASS.)

Real-time sync (`... sync d1280 zp-1,ws-1`), |music clock - lyric time| at highlight:
- zp-1 (Read It, Sing It!, 110 s): p99 start 22.6 / middle 22.0 / end 33.4 ms, max 33.4, n=205 -> PASS
- ws-1 (Read It, 204.8 s): p99 start 23.7 / middle 19.5 / end 16.6 ms, max 27.1, n=545 -> PASS

Screenshots: /workspace/qa/suno/{fast-a,fast-b,fast-c,sync}/

## Read It, Sing It: whole-song moments + official lyrics (fix/read-it-sing-it, 2026-10-30)
Hexan: "currently nothing happens in it other than the song playing". Kid-mode repro (`qa/tools/repro-song.js`, live site, no autoplay flag, p375 + d1280):
no crash; the old moments did appear, but only 10 in 110 s. That left dead stretches (the intro, every chorus line, owl, sneeze, the last 23 s), and the spell tiles came up 5-7 s early.
Fix and design: docs/SING-ALONG.md. Screenshots: /home/box/elearnea/qa/read-it-sing-it/{fast1..6,sync1..6}/

Fast (every moment type, real taps, one deliberate miss): all PASS, 0 console errors / outside requests / failed loads / small or outside targets / overflow, voiceOverMusic=0.
- zp-1: p375, t768, d1280
- ll-r8: p375, t768, d1280
- zp-2: d1280
- zp-3: p375, d1280
- ws-1: p375, t768, d1280
- ws-2: p375, t768
- ws-3: d1280

Real time (an eager kid tapping whatever the song asks for), lyric drift = music clock at highlight minus lyric time:
- zp-1 d1280: p99 16.6 / 16.4 / 17.4 ms, max 17.4, n=205. Longest stretch with nothing to tap: 2.27 s.
- zp-1 p375 (QA_RT_SHOTS=0): p99 16.5 / 16.5 / 16.2 ms, max 16.5. Longest stretch with nothing to tap: 2.73 s. Runs that take screenshots mid-song show one word ~100-140 ms late, right after each screenshot (the screenshot stalls the page).
- ws-1 d1280: p99 19.5 / 25.2 / 16.7 ms, max 81.3, n=546. Longest stretch with nothing to tap: 2.73 s; it was 8.6 s before the spell tiles moved to 1.5 s before their letters.
