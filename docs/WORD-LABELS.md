# Word labels and path pictures (2026-10-30)

Hexan: *"the pictures should also have words or the names either under or when they select so kids go associating the animals or pictures you show with the name, the spelling and how they sound."*

## Word labels in games
Every picture used as a choice carries its name in big lowercase letters under the picture (Fredoka, ink on cream; cream on the dark jar cards).
The label **glows and bounces while Bella says it**: during the praise line after a right answer, and during the next line after a tap or a hint
("That's the dog!", "Here's the cat!"). The glow starts with the line and is removed in the line's own `onend` (ElVoice exactly-once contract),
so it never changes when the game advances; praise still goes through `kit.praise` / `ElVoice.sayThen` (never cut off).

Little Lanterns kit API (`assets/games/little.js`): `kit.labels('show' | 'reveal' | 'off', wordOf)` before `kit.options()`; `kit.word(text)` for
model pictures; `kit.say(lines, onend, gap, isPraise, glowEls)`; `kit.speak(lines, label, glowEls)`. Default: `show` for items that are picture
names in `El.pics` (or objects with `word` / `name` / `m.name`).

| Game / mode | Lesson | Labels | Why |
|---|---|---|---|
| Lantern Barn: who says that? (`animals`) | ll-r1 | **reveal** on tap / with the answer | the skill is picking the animal by its sound; a label would let a reader skip listening |
| Lantern Barn: loud or quiet (`loudquiet`) | ll-r3 | **show** | the names (elephant / mouse) are not the answer; loud vs quiet is |
| Lantern Barn: clap the beats (`clap`) | ll-r6 | **show** (model word glows while Bella says it) | the skill is counting beats in the word |
| Lantern Barn: peekaboo (`tiny`) | ll-r0 | **show** when the door opens | naming, play together |
| Picture Garden: look and name (`tiny`) | ll-r00 | **show** | naming, play together |
| Picture Garden: first words (`words`) | ll-r2 | **reveal** | the skill is finding the picture Bella names |
| Picture Garden: colors | ll-r4 | **reveal** (color word) | the skill is the color name |
| Picture Garden: shapes | ll-m2 | **reveal** | the skill is the shape name |
| Picture Garden: rhyme time | ll-r5 | **show** (model + both choices) | the question names both pictures; seeing cat / hat also shows the shared ending |
| Picture Garden: letter shapes | ll-r7 | **off** | visual letter-shape matching, no names |
| Glow Jars: match / how many / more | ll-m1, ll-m3, ll-m4 | **reveal** (number word, e.g. "three") | the count is the answer; still no numerals on screen |
| Glow Jars: firefly jar (`tiny`) | ll-m0 | none | one jar, counted aloud |
| Clocktower Gears: find the shape (`name`) | ma-l6 | **reveal** on the tapped card; the answer's name shows under the hub gear | the skill is the shape name |
| Clocktower Gears: shape drawers (`sort`) | ma-l7 | **show** on the drawer fronts | sorting by looking; the names teach the words |
| Lily Pad Hop, Mothabet | rd-* | already words | — |

Merge note for `fix/loudquiet-variety`: its items are `{ m, style }` objects, which the default `wordOf` labels with `m.name` (show). Its
picture is a `<span class="lq">`; `.ll-card.has-word > span:first-child` gets the same top-aligned box as an svg so the label has room.

## Path pictures
- `tools/make-tiles.js` writes one tile per Little Lanterns lesson (`assets/img/tile-ll-*.svg`) plus `tile-soon.svg` for coming-soon stops
  (the realm page draws the stop's own icon on it). Catalog lessons point at their tile with `"tile"`; `"tag"` adds a sticker for Explorer
  lessons that share a game picture (Mothabet "s a t p", Lily Pad "and · go", Firefly "2 + 3", ...).
- Root cause of the blank cards: `pics.js` `cut()` added a second `transform` attribute to pieces that were already rotated, so
  `tile-barn.svg` was invalid XML and `<img>` showed nothing (Who says that?, Loud or quiet, Clap the beats). `cut()` now wraps the edge copy
  in a `<g>`, and make-tiles fails on any duplicate attribute.
