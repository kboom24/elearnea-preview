# Mothabet: audio clip needs (for sourcing; not a 1.0.0 blocker)
Status 1.0.0: no recorded clips ship (decided; see Budget). Speech uses the device's own Web Speech voices (on-device, no network), with phonetic
spellings for sounds (`MB.PHON` in words.js, e.g. "buh", never the letter name where a sound is meant) and a full visual fallback
(picture hints, look-cover-spell word card, "_un" first-sound cue) when no voice exists. Recorded clips replace speech 1:1 when they land.

## Who records
One warm, clear adult voice (US English, General American), recorded and checked by a reading specialist. Pure phonemes must be
clipped (no schwa: "b" not "buh") for continuous sounds (m s f l n r v z sh th) held ~0.6 s; stop sounds (b c d g k p t) as short as possible.

## Technical spec (every clip)
- Format: Ogg Opus 48 kHz mono, 32-48 kbps (ship) + 24-bit 48 kHz WAV masters (archive). Optional AAC .m4a fallback for old Safari.
- Loudness: -16 LUFS integrated (±1), true peak <= -1 dBTP. 20 ms fade-in/out, trim silence to <= 30 ms head / 80 ms tail.
- Noise floor below -60 dBFS, no reverb, no music. Normalise per clip.
- Naming: lowercase ASCII, no spaces. Folder `assets/audio/`.
  - `ph_<id>.opus`   phoneme  (ids below)
  - `w_<word>.opus`  word, said once, neutral falling intonation
  - `s_<word>.opus`  sentence (Fliers words and heart words) from `MB.SENT` (exact text in words.js)
  - `p_<id>.opus`    prompt line
- Budget: ~49 phonemes + ~500 words + ~370 sentences + ~20 prompts is about 940 clips, ~7-8 MB at ~8 KB each: over the 5 MB game cap.
- **Decision (COMMANDER, 2026-10-29): lazy-loading audio packs is NOT approved; the no-external-calls rule stands.** 1.0.0 ships Web Speech
  (on-device voices) + the visual fallback only. If clips are sourced later, they must fit inside the bundle: phonemes + prompts + Sprouts words
  (~300 clips, ~2.3 MB at 32 kbps) is the realistic first set; Fliers words/sentences stay on Web Speech unless the cap changes.

## 1. Phonemes (49 clips: 26 single sounds + 18 digraphs/teams + 5 long vowels)
Single sounds (26): ph_a (short a, "apple"), ph_b, ph_c (=k), ph_d, ph_e (short e, "egg"), ph_f, ph_g (hard g, "gift"), ph_h, ph_i (short i, "igloo"),
ph_j, ph_k, ph_l, ph_m, ph_n, ph_o (short o, "octopus"), ph_p, ph_qu (kw), ph_r, ph_s, ph_t, ph_u (short u, "up"), ph_v, ph_w, ph_x (ks), ph_y (consonant y, "yak"), ph_z.
Digraphs and teams (18): ph_sh, ph_ch, ph_th (voiceless "thin") + ph_th_v (voiced "this"), ph_ck, ph_ng, ph_wh, ph_ll, ph_ee, ph_ea, ph_ai, ph_ay, ph_oa, ph_ow (as in "snow"),
ph_oo (long, "moon") + ph_oo_s (short, "book"), ph_ar, ph_ir_er_ur (one clip, "her"), ph_or.
Long vowels for silent-e (5): ph_a_e, ph_i_e, ph_o_e, ph_u_e, ph_e_e.

## 2. Words (w_<word>), by stage

**Phonics (Sprouts)**
- s1 First sounds (14): sun, sock, ant, apple, tent, top, pig, pan, pot, igloo, insect, net, nut, nest
- s2 More sounds (16): cat, cup, king, kite, egg, elf, hat, hen, rat, ring, moon, mop, map, dog, duck, drum
- s3 Sound garden (17): gift, goat, octopus, ox, umbrella, up, leaf, log, leg, fish, fan, fox, bat, bed, bug, bus, bell
- s4 Tricky sounds (14): jam, jug, zip, zero, web, worm, van, vase, yoyo, yak, queen, box, fox, six
- s11 End sounds (16): cat, hat, net, pig, bug, jug, sun, hen, pan, map, cup, mop, bed, web, bus, jam
- s5 Blend it (20): cat, hat, bat, map, pan, van, jam, rat, fan, bag, cap, can, pig, six, zip, lip, wig, pin, lid, bib
- s6 Blend more (25): dog, log, box, fox, mop, pot, top, cup, bug, bus, nut, sun, rug, jug, mug, hut, pup, bed, hen, net, web, leg, pen, ten, jet
- s7 Shh and chh (15): ship, fish, dish, shell, sheep, shop, shed, cash, chick, chin, chest, bench, moth, bath, teeth
- s8 Ring and duck (11): duck, sock, rock, lock, sack, stick, king, ring, wing, queen, quilt
- s12 Frog and drum (9): frog, crab, flag, drum, sled, nest, tent, hand, lamp
- s9 Heart words (30): a, I, is, it, in, up, go, me, my, we, see, the, to, and, can, look, you, said, big, one, two, red, blue, come, down, find, for, here, jump, not
- s10 Heart words 2 (40): am, at, be, do, he, no, on, so, all, are, ate, eat, get, was, saw, say, she, new, now, our, out, ran, yes, who, too, did, came, like, that, this, they, will, with, want, went, what, have, good, black, brown

**Spelling (Fliers)**
- f1 Short vowels (22): sat, pin, hot, cup, bed, fig, rug, mix, jog, web, hen, lid, fun, nap, van, kit, dot, hum, pet, tub, wig, fox
- f2 Blends (26): stop, frog, clap, flag, step, drum, trip, swim, crab, sled, plum, grin, spin, snap, glad, nest, flip, drip, skip, slip, plan, clip, best, hand, smell, stamp
- f3 Digraphs (23): ship, shop, chop, chat, that, then, this, when, much, rich, wish, path, with, moth, thick, check, duck, fish, shed, chest, bench, teeth, cash
- f4 Silent e (28): cake, make, name, game, lake, gate, plane, shape, bike, kite, time, ride, five, nine, smile, slide, home, bone, rope, note, hope, stone, globe, cube, cute, tube, flute, mule
- f5 Rain and play (20): rain, tail, wait, paint, snail, train, nail, mail, chain, rail, day, play, stay, may, gray, away, say, clay, tray, pay
- f6 Green leaf (22): tree, seed, feet, green, sleep, sheep, week, keep, queen, sweet, wheel, eat, read, sea, team, leaf, dream, clean, beach, peach, seat, meal
- f7 Boat and moon (23): boat, road, coat, soap, toad, float, coach, snow, grow, slow, show, own, blow, moon, food, soon, spoon, roof, book, look, good, cook, foot
- f8 Star words (25): car, star, park, farm, far, start, barn, shark, scarf, bird, girl, first, skirt, shirt, chirp, her, fern, corn, fork, horse, storm, turn, burn, hurt, nurse
- f9 Grade 1 words (36): after, again, an, any, as, ask, by, could, every, fly, from, give, going, had, has, him, his, how, just, know, let, live, of, old, once, open, over, put, round, some, take, thank, them, think, walk, were
- f10 Grade 2 words (39): always, around, because, been, before, best, both, buy, call, cold, does, fast, found, gave, goes, its, made, many, off, or, pull, right, sing, sit, tell, their, these, those, upon, us, use, very, wash, which, why, work, would, write, your
- f11 Grade 3 words (30): about, better, bring, carry, clean, cut, done, draw, drink, eight, fall, full, got, hold, if, kind, laugh, light, long, myself, never, only, pick, seven, shall, small, today, together, try, warm
- f12 Tricky words (20): said, says, friend, people, there, where, should, school, enough, thought, busy, eye, whole, water, father, mother, brother, sister, answer, listen
- f13 Word endings (12): cats, dogs, wishes, foxes, jumping, playing, reading, sleeping, jumped, helped, played, looked
- f14 Two-part words (14): sunset, bedtime, cupcake, rainbow, starfish, sandbox, goldfish, popcorn, bathtub, snowman, inside, outside, sunlight, bedroom
- f15 Two beats (14): rabbit, kitten, basket, picnic, garden, lantern, pencil, window, magnet, napkin, muffin, button, puppet, tunnel
- f16 Fry words (16): each, other, more, word, number, than, part, place, year, thing, most, land, animal, house, letter, learn

Total: 597 word items, 497 unique words = 497 word clips (a word in two stages shares one clip).
Sentences (s_<word>): 432 lines, exact text in MB.SENT (words.js).

- Homophones need their sentence clip to be played with them: there/their, read, too/two, no/know, buy/by, eight/ate, sea/see, right/write, one/won, four/for, would/wood.

## 3. Sentences (s_<word>)
Every Fliers word has one (count above); exact text in `MB.SENT` (words.js). Read naturally at ~140 wpm.

## 4. Prompts (p_<id>)
p_first ("Find the first sound in..."), p_last ("Find the last sound in..."), p_build ("Build..."), p_spell ("Spell..."), p_try ("Try this one."),
p_glow ("Look for the glowing moth."), p_jar ("The daily jar. Everyone gets the same ten words today."), p_go ("Catch the letter moths. Put them in the jar."),
p_great_n (results lines, 3 variants), p_locked ("Earn a star on the stage before to open this one."), and button labels: p_play, p_phonics, p_spelling, p_dailyjar, p_mothbook, p_again, p_next, p_home, p_tryit.
