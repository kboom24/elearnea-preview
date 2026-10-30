/* Wick's Night Garden (Nature realm, ages 4-9): the content and EVERY spoken line of the game, in one place.
   Used by the game (window.NGL) AND by the voice tools (require: tools/voice/build-manifest.js adds NGL.all() to the manifest,
   tools/voice/check.js verifies every line is there), so the manifest can't drift from the code.
   Science notes (NGSS K-LS1-1: what plants and animals need to survive; K-ESS2-2: animals change their surroundings to meet
   their needs, e.g. digging a burrow, building a nest; life cycle order is an early look at 3-LS1-1):
   - living things grow and need food/water/air; plants make their own food from light and water, so "food" is never a plant need;
   - every "yes" line states the fact, so each right answer teaches, and every model line (2nd miss) says the answer and why. */
(function (root) {
  'use strict';
  const NGL = {};
  /* ---------- lesson 1: living or not living (sorting) ---------- lv = first difficulty level the item appears at */
  NGL.LIVING = [
    { id: 'fox', a: 'A fox', kind: 'animal', lv: 0 }, { id: 'tree', a: 'A tree', kind: 'plant', lv: 0 }, { id: 'moth', a: 'A moth', kind: 'animal', lv: 0 },
    { id: 'rabbit', a: 'A rabbit', kind: 'animal', lv: 0 }, { id: 'flower', a: 'A flower', kind: 'plant', lv: 0 }, { id: 'owl', a: 'An owl', kind: 'animal', lv: 1 },
    { id: 'fish', a: 'A fish', kind: 'animal', lv: 1 }, { id: 'frog', a: 'A frog', kind: 'animal', lv: 1 }, { id: 'bee', a: 'A bee', kind: 'animal', lv: 1 },
    { id: 'mushroom', a: 'A mushroom', kind: 'fungus', lv: 2 }, { id: 'seed', a: 'A seed', kind: 'seed', lv: 2 }, { id: 'grass', a: 'Grass', kind: 'plant', lv: 2, is: 'is' }
  ].map(x => Object.assign({ living: true }, x));
  NGL.NOTLIVING = [
    { id: 'rock', a: 'A rock', lv: 0 }, { id: 'ball', a: 'A toy ball', lv: 0 }, { id: 'cup', a: 'A cup', lv: 0 }, { id: 'shoe', a: 'A shoe', lv: 0 },
    { id: 'spoon', a: 'A spoon', lv: 1 }, { id: 'hat', a: 'A hat', lv: 1 }, { id: 'car', a: 'A toy car', lv: 2, why: 'It can move, but it does not grow or eat.' },
    { id: 'sun', a: 'The sun', lv: 2, why: 'It shines, but it does not grow or eat.' }, { id: 'moon', a: 'The moon', lv: 2, why: 'It glows, but it does not grow or eat.' },
    { id: 'robot', a: 'A toy robot', lv: 3, why: 'It can walk, but it does not grow or eat.' }
  ].map(x => Object.assign({ living: false, kind: 'thing' }, x));
  const lwhy = (it) => it.why || (it.living ? (it.kind === 'animal' ? 'It grows, and it needs food and water.' : it.kind === 'seed' ? 'It can grow into a new plant!' : it.kind === 'fungus' ? 'It grows, and it needs water.' : 'It grows, and it needs water and light.') : 'It does not grow or eat.');
  const lis = (it) => `${it.a} is ${it.living ? 'living' : 'not living'}.`;
  NGL.sort = {
    intro: "Welcome to Wick's night garden! Living things grow, and need food or water. Is it living, or not living?",
    name: (it) => `${it.a}!`, ask: 'Living, or not living?',
    yes: (it) => `Yes! ${lis(it)} ${lwhy(it)}`, model: (it) => `${lis(it)} ${lwhy(it)}`,
    hint: 'Hmm. Does it grow? Does it need food or water?',
    living: 'Living', notLiving: 'Not living', end: 'You sorted the whole garden!'
  };
  /* ---------- lesson 2: what plants and animals need (matching) ---------- */
  NGL.NEEDS = ['water', 'light', 'food', 'air', 'shelter'];
  NGL.NEED_NAME = { water: 'Water', light: 'Light', food: 'Food', air: 'Air', shelter: 'Shelter' };
  // cue: what the picture shows (dry ground, dark box, empty bowl, shut jar, rain cloud); food pictures what THIS animal eats
  NGL.NEED_ITEMS = [
    { id: 'flower-water', who: 'flower', kind: 'plant', need: 'water', lv: 0, ask: 'The flower is drooping. What does it need?', yes: 'Yes! Plants need water to live.' },
    { id: 'sprout-light', who: 'sprout', kind: 'plant', need: 'light', lv: 0, ask: 'The little plant is in the dark. What does it need?', yes: 'Yes! Plants need light to grow.' },
    { id: 'rabbit-food', who: 'rabbit', kind: 'animal', need: 'food', food: 'carrot', lv: 0, ask: 'The rabbit is hungry. What does it need?', yes: 'Yes! Animals need food. Rabbits eat plants.' },
    { id: 'fox-water', who: 'fox', kind: 'animal', need: 'water', lv: 0, ask: 'The fox is thirsty. What does it need?', yes: 'Yes! Animals need water too.' },
    { id: 'bird-shelter', who: 'bird', kind: 'animal', need: 'shelter', lv: 1, ask: 'Rain is coming! What does the bird need?', yes: 'Yes! Animals need shelter, a safe home.' },
    { id: 'bee-food', who: 'bee', kind: 'animal', need: 'food', food: 'nectar', lv: 1, ask: 'The bee is hungry. What does it need?', yes: 'Yes! Bees drink sweet nectar from flowers.' },
    { id: 'tree-water', who: 'tree', kind: 'plant', need: 'water', lv: 1, ask: 'The tree has dry leaves. What does it need?', yes: 'Yes! Trees drink water with their roots.' },
    { id: 'flower-light', who: 'flower', kind: 'plant', need: 'light', lv: 1, ask: 'A box is hiding the flower. What does it need?', yes: 'Yes! Plants need light. Plants use light to make their food.' },
    { id: 'moth-air', who: 'moth', kind: 'animal', need: 'air', lv: 2, ask: 'The jar lid is shut tight! What does the moth need?', yes: 'Yes! Animals need air to breathe. Let it fly free!' },
    { id: 'mouse-shelter', who: 'mouse', kind: 'animal', need: 'shelter', lv: 2, ask: 'It is cold and windy. What does the mouse need?', yes: 'Yes! A cozy shelter keeps the mouse warm.' },
    { id: 'fish-water', who: 'fish', kind: 'animal', need: 'water', lv: 2, ask: 'The pond is drying up. What does the fish need?', yes: 'Yes! Fish need water to live and breathe.' },
    { id: 'owl-food', who: 'owl', kind: 'animal', need: 'food', food: 'berries', lv: 3, ask: 'The owl is hungry. What does it need?', yes: 'Yes! Animals need food to grow.' },
    { id: 'frog-air', who: 'frog', kind: 'animal', need: 'air', lv: 3, ask: 'The frog is in a shut box. What does it need?', yes: 'Yes! Frogs need air to breathe, just like you.' }
  ];
  NGL.needs = {
    intro: 'Plants and animals need things to live. Help the garden!',
    hint: { water: 'Look! The ground is so dry.', light: 'Look! It is very dark in there.', food: 'Listen! A rumbly, empty tummy.', air: 'Look! The lid is shut. Can it breathe?', shelter: 'Look! The rain and wind are coming.' },
    model: { water: 'Living things need water. Here it is!', light: 'Plants need light. Here it is!', food: 'Animals need food. Here it is!', air: 'Living things need air to breathe. Here it is!', shelter: 'Animals need shelter, a safe place. Here it is!' },
    plantFood: 'Plants make their own food from light and water!',
    end: 'You helped the whole garden grow!'
  };
  /* ---------- lesson 3: seed to flower life cycle (sequencing) ---------- */
  NGL.STAGES = ['seed', 'sprout', 'plant', 'bud', 'flower', 'fruit'];
  NGL.STAGE_COUNT = [3, 4, 5, 6]; // by difficulty level: seed-sprout-flower ... the full cycle with fruit and new seeds
  NGL.stagesAt = (lv) => ({ 3: ['seed', 'sprout', 'flower'], 4: ['seed', 'sprout', 'plant', 'flower'], 5: ['seed', 'sprout', 'plant', 'bud', 'flower'], 6: NGL.STAGES.slice() })[NGL.STAGE_COUNT[lv]];
  NGL.PLANTS = [
    { id: 'sunflower', name: 'sunflower', petal: '#F5B841', petalD: '#C98A1C', fruit: 'seedhead' },
    { id: 'apple', name: 'apple tree', petal: '#F7C6CF', petalD: '#D98A99', fruit: 'apple' },
    { id: 'pumpkin', name: 'pumpkin', petal: '#F7A23B', petalD: '#C2672E', fruit: 'pumpkin' },
    { id: 'bean', name: 'bean plant', petal: '#B9ABE3', petalD: '#8E7FC4', fruit: 'pod' },
    { id: 'poppy', name: 'poppy', petal: '#E0584F', petalD: '#A8372F', fruit: 'poppyhead' }
  ];
  NGL.cycle = {
    intro: 'Help the seed grow! What comes first?', next: 'What comes next?',
    grow: (p) => `Let's grow a ${p.name}!`,
    stage: { seed: 'A seed.', sprout: 'A sprout.', plant: 'A young plant.', bud: 'A bud.', flower: 'A flower!', fruit: 'Fruit, with new seeds!' },
    hintFirst: 'Everything starts very, very small.', hint: 'Look at the last one. What grows from it?',
    model: { seed: 'First comes the seed.', sprout: 'Next comes the sprout.', plant: 'Next comes the young plant.', bud: 'Next comes the bud.', flower: 'Next comes the flower.', fruit: 'Next comes the fruit.' },
    done: (p) => `The ${p.name} grew from a tiny seed!`,
    recap: { 3: 'Seed, sprout, flower!', 4: 'Seed, sprout, plant, flower!', 5: 'Seed, sprout, plant, bud, flower!', 6: 'Seed, sprout, plant, bud, flower, fruit! The fruit has new seeds, so it starts again!' },
    end: 'Your garden is in bloom!'
  };
  /* ---------- lesson 4: animal homes (matching, K-ESS2-2: animals change their surroundings to make homes) ---------- */
  NGL.HOMES = { hollow: 'tree hollow', pond: 'pond', hive: 'hive', burrow: 'burrow', nest: 'nest', den: 'den', web: 'web', lodge: 'lodge' };
  NGL.LOOKALIKE = { burrow: 'den', den: 'burrow' }; // both are holes in the ground: never shown together
  NGL.ANIMALS = [
    { id: 'owl', the: 'the owl', home: 'hollow', lv: 0, yes: 'Yes! An owl rests in a tree hollow.', hint: 'Owls sleep up high, inside a tree.', model: 'An owl lives in a tree hollow.' },
    { id: 'fish', the: 'the fish', home: 'pond', lv: 0, yes: 'Yes! A fish swims in the pond.', hint: 'Fish need water to swim.', model: 'A fish lives in a pond.' },
    { id: 'bee', the: 'the bee', home: 'hive', lv: 0, yes: 'Yes! Bees build a hive out of wax.', hint: 'Bees buzz home to make honey.', model: 'A bee lives in a hive.' },
    { id: 'rabbit', the: 'the rabbit', home: 'burrow', lv: 0, yes: 'Yes! A rabbit digs a burrow under the ground.', hint: 'Rabbits dig a hole in the ground.', model: 'A rabbit lives in a burrow.' },
    { id: 'bird', the: 'the bird', home: 'nest', lv: 1, yes: 'Yes! A bird builds a nest out of twigs.', hint: 'Birds lay their eggs in a cozy cup of twigs.', model: 'A bird lives in a nest.' },
    { id: 'fox', the: 'the fox', home: 'den', lv: 1, yes: 'Yes! A fox digs a den to keep its cubs safe.', hint: 'Foxes dig a cozy den in the hillside.', model: 'A fox lives in a den.' },
    { id: 'spider', the: 'the spider', home: 'web', lv: 2, yes: 'Yes! A spider spins a web out of silk.', hint: 'Spiders spin silky threads.', model: 'A spider lives on a web.' },
    { id: 'beaver', the: 'the beaver', home: 'lodge', lv: 2, yes: 'Yes! A beaver builds a lodge with sticks and mud.', hint: 'Beavers build with sticks in the water.', model: 'A beaver lives in a lodge.' },
    { id: 'frog', the: 'the frog', home: 'pond', lv: 3, yes: 'Yes! A frog lives in and near the pond.', hint: 'Frogs swim and hop by the water.', model: 'A frog lives by a pond.' }
  ];
  NGL.homes = { intro: 'The animals are going home for the night. Help them find their homes!', ask: (an) => `Where does ${an.the} live?`, end: 'Everyone is home, safe and cozy!' };
  /* ---------- shared ---------- */
  NGL.glow = 'Tap the glowing one.';
  /* every line the game can speak (for the voice manifest + check) */
  NGL.all = function () { const out = [], add = (text, type, screen, trigger) => out.push({ text, type, screen, trigger });
    const S = NGL.sort, N = NGL.needs, C = NGL.cycle, H = NGL.homes;
    add(S.intro, 'instruction', 'Night Garden: living or not', 'round starts'); add(S.ask, 'instruction', 'Night Garden: living or not', 'after each thing\'s name; replay');
    add(S.hint, 'feedback', 'Night Garden: living or not', '1st wrong basket'); add(S.end, 'praise', 'Night Garden: living or not', 'round ends');
    add(S.living, 'label', 'Night Garden: living or not', 'tap and hold the Living basket label'); add(S.notLiving, 'label', 'Night Garden: living or not', 'Not living basket label');
    for (const it of NGL.LIVING.concat(NGL.NOTLIVING)) { add(S.name(it), 'word', 'Night Garden: living or not', 'new thing to sort'); add(S.yes(it), 'praise', 'Night Garden: living or not', 'right basket (states the fact)'); add(S.model(it), 'feedback', 'Night Garden: living or not', '2nd wrong basket: Wick models the answer, the right basket glows'); }
    add(N.intro, 'instruction', 'Night Garden: needs', 'round starts'); add(N.plantFood, 'feedback', 'Night Garden: needs', 'food picked for a plant (1st miss)'); add(N.end, 'praise', 'Night Garden: needs', 'round ends');
    for (const k of NGL.NEEDS) { add(N.hint[k], 'feedback', 'Night Garden: needs', `1st miss (${k})`); add(N.model[k], 'feedback', 'Night Garden: needs', `2nd miss (${k}): the right need glows`); }
    for (const it of NGL.NEED_ITEMS) { add(it.ask, 'instruction', 'Night Garden: needs', 'new garden friend'); add(it.yes, 'praise', 'Night Garden: needs', 'right need (states the fact)'); }
    add(C.intro, 'instruction', 'Night Garden: life cycle', 'each new plant'); add(C.next, 'instruction', 'Night Garden: life cycle', 'after each right card'); add(C.hintFirst, 'feedback', 'Night Garden: life cycle', '1st miss on the first card');
    add(C.hint, 'feedback', 'Night Garden: life cycle', '1st miss'); add(C.end, 'praise', 'Night Garden: life cycle', 'round ends');
    for (const s of NGL.STAGES) { add(C.stage[s], 'word', 'Night Garden: life cycle', 'right card placed'); add(C.model[s], 'feedback', 'Night Garden: life cycle', '2nd miss: the right card glows'); }
    for (const p of NGL.PLANTS) { add(C.grow(p), 'instruction', 'Night Garden: life cycle', 'new plant'); add(C.done(p), 'praise', 'Night Garden: life cycle', 'plant fully grown'); }
    for (const n of Object.keys(C.recap)) add(C.recap[n], 'praise', 'Night Garden: life cycle', `recap of the ${n} stages`);
    add(H.intro, 'instruction', 'Night Garden: animal homes', 'round starts'); add(H.end, 'praise', 'Night Garden: animal homes', 'round ends');
    for (const an of NGL.ANIMALS) { add(H.ask(an), 'instruction', 'Night Garden: animal homes', 'new animal'); add(an.yes, 'praise', 'Night Garden: animal homes', 'right home (states how the animal makes/uses it)'); add(an.hint, 'feedback', 'Night Garden: animal homes', '1st wrong home'); add(an.model, 'feedback', 'Night Garden: animal homes', '2nd wrong home: the right home glows'); }
    add(NGL.glow, 'feedback', 'Night Garden', '3rd+ miss'); return out; };
  if (typeof module !== 'undefined' && module.exports) module.exports = NGL; else root.NGL = NGL;
})(typeof window !== 'undefined' ? window : this);
