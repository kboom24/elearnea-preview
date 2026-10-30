# Animal sound effects: sources and licenses

Real animal recordings used by Little Lanterns (Lantern Barn: "Who says that?" and the under-2 barn door). Every file comes from **Freesound**, and each author released it under **CC0 1.0 Universal (public domain dedication)**: https://creativecommons.org/publicdomain/zero/1.0/ . No attribution is required and commercial use is allowed; the authors are credited here anyway. No paid assets, no attribution-required licenses.

Processing (2026-10-30, Elearnea CEO bot): downloaded the Freesound HQ preview of each CC0 sound, cut one call (< 2 s), 90 Hz high-pass / 11 kHz low-pass, silence trim (30 ms pad, 5 ms fade in, 60 ms fade out), -16 LUFS with a soft peak limiter, then mp3 (mono 24 kHz 64 kbps) + opus (32 kbps), same as the voice clips. Tools: /home/box/elearnea/voice/sfx/tools/. Machine-readable list with all measurements: `sfx.json` (this folder); the voice manifest lists them under `sfx`.

| file | animal | Freesound sound (what it is) | author | license | cut from | duration | loudness (mp3) | AudioSet check: top label (prob) |
|---|---|---|---|---|---|---|---|---|
| `cow.mp3` / `.opus` | cow | [#867553 COW_MOO](https://freesound.org/people/calebmills99/sounds/867553/) (a large cow mooing at the State Fair of Texas (Dallas, US)) | calebmills99 | CC0 1.0 | 0.00 s | 1.94 s | -16.4 LUFS, true peak -3.4 dBFS | Cattle, bovinae (0.97) |
| `duck.mp3` / `.opus` | duck | [#456770 Mallard Duck Quack Flying Away.wav](https://freesound.org/people/WavJunction.com/sounds/456770/) (mallard duck quacking and flying away) | WavJunction.com | CC0 1.0 | 5.86 s | 1.84 s | -16.4 LUFS, true peak -2.0 dBFS | Quack (0.83) |
| `cat.mp3` / `.opus` | cat | [#724088 Coco cat meow 17 y-o](https://freesound.org/people/FreqWincy/sounds/724088/) (a 17-year-old long-haired tuxedo cat meowing) | FreqWincy | CC0 1.0 | 4.09 s | 1.41 s | -16.4 LUFS, true peak -2.4 dBFS | Cat (0.90) |
| `dog.mp3` / `.opus` | dog | [#180977 Barking Dog](https://freesound.org/people/SuperStudioBR/sounds/180977/) (a West Highland terrier barking happily (Rio de Janeiro, BR)) | SuperStudioBR | CC0 1.0 | 24.63 s | 1.58 s | -16.4 LUFS, true peak -4.6 dBFS | Dog (0.58) |
| `sheep.mp3` / `.opus` | sheep | [#414541 Sheep Baa](https://freesound.org/people/emilyws/sounds/414541/) (sheep baas (New Zealand)) | emilyws | CC0 1.0 | 3.17 s | 1.35 s | -16.4 LUFS, true peak -3.0 dBFS | Sheep (0.83) |
| `pig.mp3` / `.opus` | pig | [#840658 Pigs grunt and oink](https://freesound.org/people/Cl%C3%A9ment_Baudet/sounds/840658/) (pigs grunting and oinking on a farm in Ourches, Drôme (FR)) | Clément_Baudet | CC0 1.0 | 11.48 s | 0.93 s | -16.6 LUFS, true peak -2.0 dBFS | Oink (0.54) |
| `frog.mp3` / `.opus` | frog | [#852657 Pacific Tree Frogs in Secluded Pond, Petrolia, CA](https://freesound.org/people/CVLTIV8R/sounds/852657/) (Pacific tree frogs in a pond, Petrolia, CA (US)) | CVLTIV8R | CC0 1.0 | 9.06 s | 1.83 s | -16.4 LUFS, true peak -2.8 dBFS | Frog (0.96) |
| `bird.mp3` / `.opus` | bird | [#582178 bird tweets 01.wav](https://freesound.org/people/denalwa/sounds/582178/) (a bird tweeting) | denalwa | CC0 1.0 | 9.28 s | 1.23 s | -16.4 LUFS, true peak -2.9 dBFS | Bird (0.63) |
| `owl.mp3` / `.opus` | owl | [#558397 owl_hooting_000102_0145S3 002-070 000-002 037-044.wav](https://freesound.org/people/Gerent/sounds/558397/) (an owl hooting at night) | Gerent | CC0 1.0 | 0.97 s | 1.10 s | -16.4 LUFS, true peak -3.6 dBFS | Owl (0.96) |

Not yet checked by a human ear. The drum (loud/quiet, clapping) and the elephant/mouse sounds are still synthesized in the browser (assets/js/sfx-animals.js).
