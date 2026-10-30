/* Mothabet: learning content. Original sentences; word lists follow the public-domain Dolch/Fry sight-word lists
   and a systematic-phonics sequence (sounds -> blending -> digraphs -> sight words; then blends, silent-e, vowel teams, r-controlled, tricky words).
   Item: {id, w (the word), tiles ([letters or digraph tiles]), kind ('first'|'last'|'build'|'spell'), pic (picture key|null), s (sentence|null), pats ([mastery pattern ids])} */
(function (root) {
  'use strict';
  const MB = root.MB = root.MB || {};
  // Sentences: the word appears in the sentence; the HUD shows it blanked out (___) as a context clue for Fliers.
  const SENT = {};
  function addS(block) { block.trim().split('\n').forEach(l => { const i = l.indexOf('|'); if (i > 0) SENT[l.slice(0, i).trim()] = l.slice(i + 1).trim(); }); }
  addS(`
a|I see a moth.
and|The moon and the stars glow.
away|The moth flew away.
big|The moon is big and round.
blue|The sky is dark blue.
can|I can catch a moth.
come|Come and see the jar.
down|The leaf fell down.
find|Can you find the moth?
for|This jar is for you.
funny|The frog made a funny face.
go|Let us go to the garden.
help|Can you help me?
here|The moth is here.
I|I like the night.
in|The light is in the jar.
is|The jar is full.
it|Look at it glow.
jump|The frog can jump.
little|A little moth sat on a leaf.
look|Look at the moon.
make|We make a wish.
me|Sit with me.
my|This is my jar.
not|The moth is not sad.
one|I see one star.
play|We play in the garden.
red|The flower is red.
run|I can run fast.
said|Mom said good night.
see|I see the moon.
the|The moth is in the jar.
three|I see three moths.
to|We go to the garden.
two|I have two hands.
up|The moth flew up.
we|We like to read.
where|Where is the moth?
yellow|The lantern is yellow.
you|I can see you.
all|All the moths glow.
am|I am happy.
are|The stars are out.
at|Look at the moth.
ate|The bug ate a leaf.
be|I will be kind.
black|The cat is black.
brown|The log is brown.
but|I am small but fast.
came|The moth came back.
did|I did it!
do|What do you see?
eat|I eat my lunch.
four|A cat has four legs.
get|Go and get the jar.
good|You did a good job.
have|I have a lantern.
he|He is my friend.
into|The moth flew into the jar.
like|I like moths.
must|We must be quiet.
new|I have a new book.
no|No, thank you.
now|Go to bed now.
on|The moth sat on a leaf.
our|This is our garden.
out|The stars are out.
please|Please pass the jar.
pretty|The flower is pretty.
ran|The dog ran home.
ride|I ride my bike.
saw|I saw a moth.
say|What did you say?
she|She has a red hat.
so|The moth is so soft.
soon|The sun will rise soon.
that|Look at that moth.
there|The moth is over there.
they|They like to play.
this|This moth is gold.
too|I want to come too.
under|The cat is under the bed.
want|I want a snack.
was|The night was dark.
well|You read so well.
went|We went to the park.
what|What is in the jar?
white|The moon is white.
who|Who is at the door?
will|I will read a book.
with|Come with me.
yes|Yes, I can do it.
after|We read after dinner.
again|Read it again.
an|I ate an apple.
any|Do you have any glue?
as|Be as quiet as a moth.
ask|Ask a grown-up for help.
by|The moth flew by.
could|I could see the moon.
every|I read every night.
fly|Moths can fly.
from|The moth came from the garden.
give|Give the dog a bone.
going|We are going home.
had|I had a good day.
has|She has a kite.
her|I gave her a hug.
him|I gave him a book.
his|That is his hat.
how|How do moths fly?
just|It is just right.
know|I know the answer.
let|Let me try.
live|Moths live in the garden.
may|You may go now.
of|I have a jar of light.
old|This book is old.
once|Once upon a time, a moth woke up.
open|Open the jar.
over|The moth flew over the wall.
put|Put the cup on the table.
round|The moon is round.
some|Can I have some?
stop|Stop at the red light.
take|Take a big breath.
thank|Thank you for the gift.
them|I gave them a wave.
then|Spell it, then say it.
think|I think it will rain.
walk|We walk to school.
were|We were happy.
when|When can we go?
always|I always brush my teeth.
around|The moth flew around the lamp.
because|I smiled because I was happy.
been|Where have you been?
before|Wash your hands before lunch.
best|You are my best friend.
both|I use both hands.
buy|We buy milk at the shop.
call|Call me later.
cold|The night is cold.
does|Does the moth glow?
fast|The fox ran fast.
first|I was first in line.
five|I have five fingers.
found|I found a shell.
gave|Dad gave me a hug.
goes|The moth goes to the light.
green|The leaf is green.
its|The moth flaps its wings.
made|I made a card.
many|There are many stars.
off|Turn off the light.
or|Do you want milk or juice?
pull|Pull the rope.
read|I like to read.
right|You got it right!
sing|We sing a song.
sit|Sit on the rug.
sleep|Owls sleep in the day.
tell|Tell me a story.
their|The kids rode their bikes.
these|These are my shoes.
those|Those are my socks.
upon|Once upon a time.
us|Come with us.
use|Use a pencil.
very|The moth is very soft.
wash|Wash your hands.
which|Which one do you want?
why|Why is the sky dark?
wish|Make a wish.
work|I work hard.
would|I would like a snack.
write|I can write my name.
your|Is this your hat?
about|This book is about moths.
better|I feel better now.
bring|Bring your coat.
carry|I can carry the jar.
clean|My hands are clean.
cut|Cut the paper.
done|I am done!
draw|I like to draw.
drink|Drink some water.
eight|A spider has eight legs.
fall|Leaves fall in autumn.
far|The moon is far away.
full|The jar is full.
got|I got a new book.
grow|Plants grow in the sun.
hold|Hold my hand.
hot|The soup is hot.
hurt|My knee hurt.
if|Ask if you can go.
keep|Keep the jar safe.
kind|Be kind to others.
laugh|The joke made me laugh.
light|The lantern gives light.
long|The snake is long.
much|Thank you very much.
myself|I did it myself.
never|Never give up.
only|I have only one.
own|I have my own room.
pick|Pick a card.
seven|There are seven days in a week.
shall|Shall we play?
show|Show me your picture.
six|I am six years old.
small|The moth is small.
start|Start the race.
ten|I can count to ten.
today|Today is a good day.
together|We sing together.
try|Try again.
warm|The blanket is warm.
friend|My friend is kind.
people|Many people came.
says|The sign says stop.
should|You should rest.
school|We go to school.
enough|I have enough.
thought|I thought so.
busy|The bees are busy.
eye|Close one eye.
whole|I ate the whole apple.
water|Moths drink water too.
father|My father reads to me.
mother|My mother sings to me.
brother|My brother is tall.
sister|My sister likes moths.
answer|I know the answer.
school|We go to school.
sat|The cat sat on the mat.
pin|Pin it to the wall.
hot|The sun is hot.
cup|Fill the cup.
bed|Go to bed.
fig|A fig is a fruit.
rug|The dog sleeps on the rug.
mix|Mix the paint.
jog|We jog in the park.
web|A spider spins a web.
hen|The hen lays an egg.
lid|Put the lid on the jar.
fun|The game is fun.
nap|The cat takes a nap.
stop|Stop at the red light.
frog|The frog can jump.
clap|Clap your hands.
flag|Wave the flag.
step|Take one step.
drum|Bang the drum.
trip|We took a trip.
swim|Fish can swim.
crab|The crab is red.
sled|We ride the sled.
plum|A plum is purple.
grin|She has a big grin.
spin|The top can spin.
snap|Snap your fingers.
glad|I am glad you came.
nest|The bird sits in its nest.
ship|The ship sails on the sea.
shop|We shop for food.
chop|Chop the wood.
chat|We chat at lunch.
then|Then we go home.
when|When is lunch?
rich|The soil is rich.
path|Walk on the path.
moth|The moth glows in the dark.
thick|The book is thick.
check|Check your work.
duck|The duck swims.
fish|The fish swims.
cake|We ate cake.
name|My name is on the jar.
game|This game is fun.
bike|I ride my bike.
kite|My kite flies high.
time|It is time for bed.
home|We are going home.
bone|The dog has a bone.
rope|Jump the rope.
note|I wrote a note.
cube|An ice cube is cold.
cute|The puppy is cute.
tube|The paint is in a tube.
nine|I am nine.
lake|We swim in the lake.
gate|Close the gate.
hope|I hope you win.
rain|The rain is wet.
tail|The dog wags its tail.
wait|Wait for me.
paint|I paint a moth.
snail|The snail is slow.
train|The train is fast.
day|Have a nice day.
stay|Stay with me.
gray|The cloud is gray.
tree|The moth sits in the tree.
seed|Plant a seed.
feet|I have two feet.
sheep|The sheep says baa.
week|A week has seven days.
sea|The sea is blue.
team|We are a team.
leaf|The leaf is green.
dream|I had a nice dream.
boat|The boat floats.
road|The road is long.
coat|Put on your coat.
soap|Wash with soap.
snow|The snow is cold.
slow|The snail is slow.
moon|The moon is bright.
food|The food is yummy.
book|Read a book.
car|The car is red.
star|I see a star.
park|We play at the park.
farm|Cows live on a farm.
bird|The bird can sing.
girl|The girl reads a book.
fern|A fern grows in the shade.
corn|We ate corn.
fork|Eat with a fork.
horse|The horse can run.
turn|It is my turn.
burn|The candles burn.
`);
  addS(`
van|The van is full of toys.
kit|I have a paint kit.
dot|Put a dot on the page.
hum|Bees hum in the garden.
pet|My pet is a little fish.
tub|The duck is in the tub.
wig|The clown has a red wig.
fox|The fox ran into the woods.
flip|Can you flip the pancake?
drip|Water can drip from a leaf.
skip|I like to skip to school.
slip|Do not slip on the ice.
plan|We have a plan for the day.
clip|Clip the note to the bag.
best|You are my best friend.
hand|Hold my hand.
smell|I smell the flowers.
stamp|Put a stamp on the card.
shed|The rake is in the shed.
chest|The gold is in the chest.
bench|We sat on the bench.
teeth|I brush my teeth at night.
cash|He paid with cash.
plane|The plane flew over the hill.
smile|You have a big smile.
stone|I found a smooth stone.
flute|She can play the flute.
shape|A star is a shape.
slide|We went down the slide.
globe|Find our home on the globe.
mule|The mule can carry a big load.
nail|Tap the nail with a hammer.
mail|The mail came today.
chain|The swing has a long chain.
clay|We made a pot out of clay.
tray|Put the cups on the tray.
rail|Hold the rail on the steps.
pay|I will pay for the snack.
beach|We dig in the sand at the beach.
peach|The peach is soft and sweet.
queen|The queen has a crown.
sweet|The berries are sweet.
wheel|The bike has a flat wheel.
seat|Please take a seat.
meal|Dinner is my best meal.
toad|A toad sat by the pond.
float|Leaves float on the water.
blow|Blow out the candles.
spoon|Eat the soup with a spoon.
cook|Dad likes to cook eggs.
foot|Put your foot in the boot.
coach|Our coach blew the whistle.
roof|A bird sat on the roof.
barn|The cows sleep in the barn.
shark|A shark swims in the sea.
skirt|She has a blue skirt.
shirt|My shirt has a pocket.
storm|The storm made a big noise.
nurse|The nurse helped me feel better.
scarf|Wear a scarf when it is cold.
chirp|The baby birds chirp.
listen|Please listen to the story.
cats|The two cats nap in the sun.
dogs|The dogs ran to the park.
wishes|She made three wishes.
foxes|The foxes play in the snow.
jumping|The frog is jumping in the pond.
playing|We are playing a game.
reading|I am reading a book.
sleeping|The baby is sleeping.
jumped|The cat jumped on the bed.
helped|I helped Mom bake a cake.
played|We played tag outside.
looked|I looked up at the stars.
sunset|The sky is pink at sunset.
bedtime|It is bedtime, so sleep tight.
cupcake|I ate a cupcake at the party.
rainbow|A rainbow came after the rain.
starfish|A starfish has five arms.
sandbox|We dig in the sandbox.
goldfish|The goldfish swims in a bowl.
popcorn|We ate popcorn at the movie.
bathtub|The bathtub is full of bubbles.
snowman|We made a snowman in the yard.
inside|Come inside, it is raining.
outside|Let us go outside to play.
sunlight|The plant needs sunlight.
bedroom|My bedroom has a blue rug.
rabbit|The rabbit hops in the grass.
kitten|The kitten likes to play.
basket|The eggs are in the basket.
picnic|We had a picnic in the park.
garden|We grow beans in the garden.
lantern|The lantern glows at night.
pencil|Write your name with a pencil.
window|Look out the window.
magnet|The magnet sticks to the fridge.
napkin|Wipe your mouth with a napkin.
muffin|I had a muffin for breakfast.
button|Push the red button.
puppet|The puppet can talk and sing.
tunnel|The train went into the tunnel.
each|Each child has a book.
other|The other moth is gold.
more|Can I have more milk?
word|Read the word out loud.
number|Pick a number from one to ten.
than|A bus is bigger than a car.
part|This is my part of the puzzle.
place|This is a good place to sit.
year|I am six this year.
thing|What is that thing?
most|I like the red one most.
land|The bird will land on the branch.
animal|A whale is a big animal.
house|Our house has a red door.
letter|I wrote a letter to Grandma.
learn|We learn new words each day.
`);
  MB.SENT = SENT;

  // ---- stage specs. Tile strings: words split by '-' use those tiles; otherwise one tile per letter.
  // first/last items are "word:target".
  const SPROUTS = [
    { id: 's1', name: 'First sounds', sub: 's a t p i n', kind: 'first', list: 'sun:s sock:s ant:a apple:a tent:t top:t pig:p pan:p pot:p igloo:i insect:i net:n nut:n nest:n' },
    { id: 's2', name: 'More sounds', sub: 'c k e h r m d', kind: 'first', list: 'cat:c cup:c king:k kite:k egg:e elf:e hat:h hen:h rat:r ring:r moon:m mop:m map:m dog:d duck:d drum:d' },
    { id: 's3', name: 'Sound garden', sub: 'g o u l f b', kind: 'first', list: 'gift:g goat:g octopus:o ox:o umbrella:u up:u leaf:l log:l leg:l fish:f fan:f fox:f bat:b bed:b bug:b bus:b bell:b' },
    { id: 's4', name: 'Tricky sounds', sub: 'j z w v y x qu', kind: 'first', list: 'jam:j jug:j zip:z zero:z web:w worm:w van:v vase:v yoyo:y yak:y queen:qu box:x# fox:x# six:x#' },
    { id: 's11', name: 'End sounds', sub: 'last sounds', kind: 'first', list: 'cat:t# hat:t# net:t# pig:g# bug:g# jug:g# sun:n# hen:n# pan:n# map:p# cup:p# mop:p# bed:d# web:b# bus:s# jam:m#' },
    { id: 's5', name: 'Blend it', sub: 'short a, i', kind: 'build', list: 'cat hat bat map pan van jam rat fan bag cap can pig six zip lip wig pin lid bib' },
    { id: 's6', name: 'Blend more', sub: 'short o, u, e', kind: 'build', list: 'dog log box fox mop pot top cup bug bus nut sun rug jug mug hut pup bed hen net web leg pen ten jet' },
    { id: 's7', name: 'Shh and chh', sub: 'sh ch th', kind: 'build', list: 'sh-i-p f-i-sh d-i-sh sh-e-ll sh-ee-p sh-o-p sh-e-d c-a-sh ch-i-ck ch-i-n ch-e-s-t b-e-n-ch m-o-th b-a-th t-ee-th' },
    { id: 's8', name: 'Ring and duck', sub: 'ck ng qu', kind: 'build', list: 'd-u-ck s-o-ck r-o-ck l-o-ck s-a-ck s-t-i-ck k-i-ng r-i-ng w-i-ng qu-ee-n qu-i-l-t' },
    { id: 's12', name: 'Frog and drum', sub: 'blends', kind: 'build', list: 'f-r-o-g c-r-a-b f-l-a-g d-r-u-m s-l-e-d n-e-s-t t-e-n-t h-a-n-d l-a-m-p' },
    { id: 's9', name: 'Heart words', sub: 'sight words 1', kind: 'spell', list: 'a I is it in up go me my we see the to and can look you said big one two red blue come down find for here jump not' },
    { id: 's10', name: 'Heart words 2', sub: 'sight words 2', kind: 'spell', list: 'am at be do he no on so all are ate eat get was saw say she new now our out ran yes who too did came like that this they will with want went what have good black brown' }
  ];
  const FLIERS = [
    { id: 'f1', name: 'Short vowels', sub: 'cvc words', list: 'sat pin hot cup bed fig rug mix jog web hen lid fun nap van kit dot hum pet tub wig fox' },
    { id: 'f2', name: 'Blends', sub: 'st fl tr cl ...', list: 'stop frog clap flag step drum trip swim crab sled plum grin spin snap glad nest flip drip skip slip plan clip best hand smell stamp' },
    { id: 'f3', name: 'Digraphs', sub: 'sh ch th ck', list: 'ship shop chop chat that then this when much rich wish path with moth thick check duck fish shed chest bench teeth cash' },
    { id: 'f4', name: 'Silent e', sub: 'a_e i_e o_e u_e', list: 'cake make name game lake gate plane shape bike kite time ride five nine smile slide home bone rope note hope stone globe cube cute tube flute mule' },
    { id: 'f5', name: 'Rain and play', sub: 'ai ay', list: 'rain tail wait paint snail train nail mail chain rail day play stay may gray away say clay tray pay' },
    { id: 'f6', name: 'Green leaf', sub: 'ee ea', list: 'tree seed feet green sleep sheep week keep queen sweet wheel eat read sea team leaf dream clean beach peach seat meal' },
    { id: 'f7', name: 'Boat and moon', sub: 'oa ow oo', list: 'boat road coat soap toad float coach snow grow slow show own blow moon food soon spoon roof book look good cook foot' },
    { id: 'f8', name: 'Star words', sub: 'ar ir er or ur', list: 'car star park farm far start barn shark scarf bird girl first skirt shirt chirp her fern corn fork horse storm turn burn hurt nurse' },
    { id: 'f9', name: 'Grade 1 words', sub: 'sight words', list: 'after again an any as ask by could every fly from give going had has him his how just know let live of old once open over put round some take thank them think walk were' },
    { id: 'f10', name: 'Grade 2 words', sub: 'sight words', list: 'always around because been before best both buy call cold does fast found gave goes its made many off or pull right sing sit tell their these those upon us use very wash which why work would write your' },
    { id: 'f11', name: 'Grade 3 words', sub: 'sight words', list: 'about better bring carry clean cut done draw drink eight fall full got hold if kind laugh light long myself never only pick seven shall small today together try warm' },
    { id: 'f12', name: 'Tricky words', sub: 'heart words', list: 'said says friend people there where should school enough thought busy eye whole water father mother brother sister answer listen' },
    { id: 'f13', name: 'Word endings', sub: '-s -es -ing -ed', list: 'cats dogs wishes foxes jumping playing reading sleeping jumped helped played looked' },
    { id: 'f14', name: 'Two-part words', sub: 'compound words', list: 'sunset bedtime cupcake rainbow starfish sandbox goldfish popcorn bathtub snowman inside outside sunlight bedroom' },
    { id: 'f15', name: 'Two beats', sub: 'two-syllable words', list: 'rabbit kitten basket picnic garden lantern pencil window magnet napkin muffin button puppet tunnel' },
    { id: 'f16', name: 'Fry words', sub: 'high-frequency', list: 'each other more word number than part place year thing most land animal house letter learn' }
  ];

  // ---- mastery patterns -> collectible moths
  const VOW = 'aeiou';
  function patsFor(w, tiles, band, stage) {
    const p = new Set();
    if (band === 's') {
      if (stage.kind === 'first' || stage.kind === 'last') p.add('L:' + tiles[0]);
      else if (stage.kind === 'build') { for (const t of tiles) if (t.length > 1) p.add('D:' + t); const v = tiles.find(t => VOW.includes(t)); if (v && tiles.length === 3 && !tiles.some(t => t.length > 1)) p.add('V:' + v); }
    } else {
      const id = stage.id;
      if (id === 'f1') { const v = [...w].find(c => VOW.includes(c)); if (v) p.add('V:' + v); }
      if (id === 'f2') { const b = w.slice(0, 2), e = w.slice(-2); if (/^s[tpnwlkm]/.test(w)) p.add('B:s'); else if (/^[bcfgps]l/.test(w)) p.add('B:l'); else if (/^[bcdfgpt]r/.test(w)) p.add('B:r'); else if (/st$|mp$|nd$/.test(e)) p.add('B:s'); void b; }
      if (id === 'f3') for (const d of ['sh', 'ch', 'th', 'ck']) if (w.includes(d)) p.add('D:' + d);
      if (id === 'f4') { const m = /([aeiou])[^aeiou]e$/.exec(w); if (m) p.add('E:' + m[1]); }
      if (id === 'f5' || id === 'f6' || id === 'f7') for (const t of ['ai', 'ay', 'ee', 'ea', 'oa', 'ow', 'oo']) if (w.includes(t)) p.add('T:' + t);
      if (id === 'f8') for (const t of ['ar', 'ir', 'er', 'or', 'ur']) if (w.includes(t)) p.add('R:' + t);
    }
    return [...p];
  }
  function build(band, stages) {
    const items = [];
    stages.forEach((st, si) => {
      st.band = band; st.index = si; st.items = [];
      const words = st.list.split(/\s+/).filter(Boolean);
      const sightSets = (st.kind === 'spell' || /^f(9|10|11|12)$/.test(st.id)) ? Math.ceil(words.length / 10) : 0;
      words.forEach((raw, wi) => {
        let w = raw, tiles, kind = st.kind || 'spell', target = null;
        if (st.kind === 'first') { const [ww, t] = raw.split(':'); w = ww; const last = t.endsWith('#'); target = t.replace('#', ''); kind = last ? 'last' : 'first'; tiles = [target]; }
        else if (raw.includes('-')) { tiles = raw.split('-'); w = tiles.join(''); }
        else tiles = band === 'f' || kind === 'spell' ? [...w] : [...w];
        const it = { id: band + ':' + st.id + ':' + w, w, tiles, kind, band, stage: st.id, pic: band === 's' && kind !== 'spell' ? w : null, s: SENT[w] || null };
        it.pats = patsFor(w, tiles, band, st);
        if (sightSets) it.pats.push('W:' + st.id + ':' + Math.min(sightSets - 1, Math.floor(wi / 10)));
        st.items.push(it); items.push(it);
      });
    });
    return items;
  }
  MB.STAGES = { s: SPROUTS, f: FLIERS };
  MB.ITEMS = build('s', SPROUTS).concat(build('f', FLIERS));
  MB.ITEM = {}; MB.ITEMS.forEach(i => { MB.ITEM[i.id] = i; });
  MB.BANDS = { s: { id: 's', name: 'Phonics', sub: 'ages 4-6', kid: 'Sprouts' }, f: { id: 'f', name: 'Spelling', sub: 'ages 6-9', kid: 'Fliers' } };

  // Phoneme cues for Web Speech (approximations; recorded clips are a content request, see ENGINE-REQUESTS/known issues).
  // Phoneme cues for Web Speech: phonetic spellings of the SOUND (never the letter name). Approximations until recorded clips exist (AUDIO-NEEDS.md).
  MB.PHON = { a: 'aah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'hhuh', i: 'ih', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', o: 'ah', p: 'puh', q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', u: 'uh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz',
    sh: 'shhh', ch: 'chuh', th: 'thhh', ck: 'kuh', ng: 'ing', qu: 'kwuh', ee: 'eee', ll: 'lll' };
  MB.KEYWORD = { a: 'apple', b: 'bat', c: 'cat', d: 'dog', e: 'egg', f: 'fish', g: 'gift', h: 'hat', i: 'igloo', j: 'jam', k: 'king', l: 'leaf', m: 'moon', n: 'net', o: 'octopus', p: 'pig', q: 'queen', r: 'ring', s: 'sun', t: 'top', u: 'umbrella', v: 'van', w: 'web', x: 'box', y: 'yoyo', z: 'zip' };
})(window);
