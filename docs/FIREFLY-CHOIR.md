# Firefly Choir (Art & Music realm opener, ages 4-9)
Module `assets/games/firefly-choir.js` (+ `.css`), page `play/firefly-choir/`, realm page `realm/art-music/`, tile `assets/img/tile-choir.svg` (original SVG).
All music is synthesized in the browser with WebAudio: a soft "firefly bell" (sine + quiet octave triangle, low-pass, 12 ms attack, 140 ms release)
and a wooden "tok" for rhythms, both through a gentle limiter (DynamicsCompressor, threshold -6 dB). Spoken prompts are Kokoro af_bella clips (speed 0.76)
from the voice manifest. No outside requests.

Pre-reader design: a big Play button starts each lesson (that first tap unlocks the AudioContext on iPad/iPhone). Every task is shown first (Wick's demo:
glowing answer + sound, a pointing hand on the drum / the right firefly), then voiced. Picture answers: up/down fireflies, rabbit/snail, big firefly with
sound waves/sleepy tiny firefly, a moon drum, gold/teal note fireflies. No lives or timers. 1st miss: soft wobble + "Listen again." (sound replays).
2nd miss: the answer glows and is modelled (echo: "Tap with the lights." guided play-along). Stars come only from first-try answers (El.Learn),
spaced review + ~80% adaptive difficulty via `El.Learn.levelIndex`. Path unlocks lesson by lesson (existing realm rule).

| Lesson | What the child does | Adaptive | Standards (catalog `standards`) | Pattern-math goal |
|---|---|---|---|---|
| am-l1 High or low? | Wick's lantern sings a home note, then the purple firefly sings again, higher or lower (it rises/falls). Tap the HIGH firefly (top of the flower) or the LOW firefly (grass). | interval 19 -> 12 -> 7 -> 4 semitones | NCAS MU:Pr4.2.Ka (contrasts high/low), MU:Pr4.2.1a (melodic contour) | - |
| am-l2 Fast, slow, loud, soft | A firefly sings a tune; tap rabbit (fast) / snail (slow), or big glowing firefly (loud) / sleepy tiny firefly (soft). One contrast at a time first, mixed later. | tempos 0.16/0.70 s -> 0.26/0.40 s per note; volumes 0.34/0.045 -> 0.25/0.11 | MU:Pr4.2.Ka (loud/soft contrasts), MU:Cr1.1.Ka (beat) | - |
| am-l3 Echo the rhythm | Wick taps a rhythm on the moon drum while big dots (iconic notation, spaced by time) light up; the child taps it back on the drum. | patterns 3 taps steady -> 5-6 taps with ti-ti; timing tolerance 45% -> 38% -> 32% -> 28% | MU:Cr1.1.Ka (beat), MU:Pr4.2.1b (perform rhythm patterns from iconic notation) | steady beat / repeating units |
| am-l4 Song patterns | An 8-spot song branch with ABAB or AABB (A = sol G5 gold, B = mi E5 teal); tap the firefly that comes next until the song is full, then press Play and the repeating melody sings. | given spots 6 -> 4 -> 2 (ABAB) | MU:Cr1.1.Kb (make musical ideas / motives) | ABAB, AABB repeating patterns: CCSS Math MP7 |

Echo judging (`El.fireflyChoirJudge(target, taps, tol, beatMs)`): the tap count must match; the child's intervals are fitted to the target with one
least-squares tempo scale (allowed 0.45x-2.2x of the 520 ms beat, so a child may echo faster or slower), then every interval must be within `tol`
of the target ratio. Tap times are `performance.now()` in the pointerdown handler. Taps during Wick's demo or while judging are not counted.

QA: `qa/tools/qa-firefly-choir.js` (see qa/tools/README.md); results and screenshots in /home/box/elearnea/qa/firefly-choir/.
