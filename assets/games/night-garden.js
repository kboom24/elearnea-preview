/* Wick's Night Garden (Nature realm opener, ages 4-9, NGSS K-LS1-1 + K-ESS2-2). Original Elearnea game: Wick's lantern lights up
   the night garden, and every action IS the science (no filler minigames):
   - sort   (ns-l1): living or not living? Tap the garden bed (living) or the wooden crate (not living). Tricky items at higher levels
                     (a seed is living; the sun, the moon and a toy robot move or glow but are not living).
   - needs  (ns-l2): a plant or animal shows what is missing (dry ground, a dark box, an empty tummy, a shut jar, rain coming): match the need
                     (water, light, food, air, shelter). Plants never need "food": picking it teaches that plants make their own food from light.
   - cycle  (ns-l3): put the life cycle in order: tap the cards seed -> sprout -> young plant -> bud -> flower -> fruit (3 to 6 stages by level).
   - homes  (ns-l4): help each animal home for the night (owl -> tree hollow, fish -> pond, bee -> hive, rabbit -> burrow ...); each right answer
                     says how the animal makes or uses its home (K-ESS2-2).
   Adaptive (El.Learn difficulty, ~80% first-try): more choices, trickier items, longer cycles. Spaced review: El.Learn.pick over the items.
   Gentle misses: 1st = wobble + a spoken hint; 2nd = Wick models the answer and the right choice glows; never a fail state, no timers.
   Every praise/feedback line plays to its end before the game moves on: speak() waits for the voice.js onend callback, guarded by a run
   token so a stale callback (after Again, Back or a newer line) can never advance the game. All lines: assets/games/night-garden-lines.js.
   Contract: start(config, host) -> {stop}; host.emit('progress'|'mastery'); host.end(results). On-device only, no network beyond app files. */
El.defineGame({
  id: 'night-garden',
  start(cfg, host) {
    const L = host.learn, rng = host.rng, root = host.root, mode = cfg.mode || 'sort', NL = window.NGL, A = window.NGA;
    let alive = true, run = 0, qi = 0, firstTry = 0, attempts = 0, busy = false, prompt = [], timers = [];
    const QA = /[?&]qa=1(&|$)/.test(location.search), qaMark = (k, v) => { if (!QA) return; if (v == null) delete root.dataset[k]; else root.dataset[k] = v; };
    const setBusy = (b) => { busy = b; qaMark('busy', b ? '1' : '0'); };
    const T = (fn, ms) => { const h = setTimeout(() => { if (alive) fn(); }, ms); timers.push(h); return h; };
    const lvl = L.levelIndex(cfg.skill, 4);
    // speak(line | [lines], cb, minMs): cb runs once, when the clip has played to its end (voice.js onend), and only if no newer
    // question/round/stop happened meanwhile (run token). With no voice at all, cb waits minMs so the child can still see the result.
    const speak = (t, cb, minMs) => { const tok = run, t0 = Date.now(); let fired = false;
      const ok = host.say(t, { rate: 1, onend: () => { if (fired) return; fired = true; if (!alive || tok !== run || !cb) return; const wait = ok ? 0 : Math.max(0, (minMs || 0) - (Date.now() - t0)); if (wait) T(() => { if (tok === run) cb(); }, wait); else cb(); } });
      return ok; };
    const setPrompt = (shown, spoken, cb) => { prompt = spoken; txt.textContent = shown; return speak(spoken, cb, 400); };

    root.innerHTML = `<div class="ng ng-${mode}">
      <div class="ng-bg" aria-hidden="true"><i class="moon"></i><svg class="hills" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0 70q60-40 130-14t140-10 130 6v68H0z" fill="#2C5A55"/><path d="M0 92q80-30 170-6t230-8v42H0z" fill="#356F60"/><path d="M0 108q100-18 200-2t200-4v18H0z" fill="#2A4D47"/></svg>
        <svg class="ferns l" viewBox="0 0 100 200"><path d="M40 200C40 140 30 90 6 40M40 160c-14-8-26-6-34 0M38 130c-12-10-24-10-32-4M34 100C24 90 14 88 6 92M46 170c12-10 26-12 36-6M44 140c10-12 22-14 32-10M40 110c8-12 18-16 28-14" fill="none" stroke="#3F7A63" stroke-width="7" stroke-linecap="round"/><circle cx="74" cy="60" r="12" fill="#F08A7E"/><circle cx="74" cy="60" r="5" fill="#F5B841"/></svg>
        <svg class="ferns r" viewBox="0 0 100 200"><path d="M60 200c0-60 10-110 34-160M60 160c14-8 26-6 34 0M62 130c12-10 24-10 32-4M66 100c10-10 20-12 28-8M54 170c-12-10-26-12-36-6M56 140c-10-12-22-14-32-10" fill="none" stroke="#4E9479" stroke-width="7" stroke-linecap="round"/><circle cx="24" cy="70" r="10" fill="#9B8AD1"/><circle cx="24" cy="70" r="4" fill="#F6EBD9"/></svg></div>
      <div class="ng-prompt"><button class="wick ng-wick" id="ngWick" aria-label="Wick: hear it again"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""></button>
        <div class="bubble" id="ngTxt"></div><button class="btn round cream" id="ngSay" aria-label="Hear it again">${El.icon('sound')}</button></div>
      <div class="ng-scene" id="ngScene"></div>
      <div class="ng-tray" id="ngTray"></div><div class="ng-fx" id="ngFx"></div></div>`;
    const $ = (id) => root.querySelector('#' + id), txt = $('ngTxt'), scene = $('ngScene'), tray = $('ngTray'), fx = $('ngFx');
    const cheer = () => { const w = $('ngWick'); w.classList.remove('cheer'); void w.offsetWidth; w.classList.add('cheer'); };
    const replay = () => { if (!prompt || (Array.isArray(prompt) && !prompt.length)) return; host.sfx.tap(); speak(prompt); };
    $('ngSay').onclick = replay; $('ngWick').onclick = () => { cheer(); replay(); };

    /* ---------------- sound + fx ---------------- */
    const tone = (o) => host.sfx.tone && host.sfx.tone(o);
    const sfx = { soft() { tone({ type: 'triangle', freq: 330, to: 262, dur: .22, vol: .07 }); },
      grow(k) { const f = 392 * Math.pow(2, [0, 2, 4, 7, 9, 12][k % 6] / 12); tone({ freq: f, dur: .35, vol: .12 }); tone({ type: 'triangle', freq: f * 2, dur: .2, vol: .04, delay: .05 }); },
      chime() { [0, 4, 7, 12, 16].forEach((s, i) => tone({ freq: 523.25 * Math.pow(2, s / 12), dur: .6, vol: .09, delay: i * .12 })); } };
    const COLORS = ['#F5B841', '#7CC4A4', '#F08A7E', '#9B8AD1', '#FFE28A'];
    function burst(el, n) { if (!el) return; const fr = fx.getBoundingClientRect(), r = el.getBoundingClientRect(), cx = r.left + r.width / 2 - fr.left, cy = r.top + r.height / 2 - fr.top; n = n || 12;
      for (let i = 0; i < n; i++) { const s = document.createElement('i'); const a = i / n * Math.PI * 2 + rng.next() * .4, d = 46 + rng.next() * 56; s.className = 'spark' + (i % 3 ? '' : ' star');
        s.style.left = cx + 'px'; s.style.top = cy + 'px'; s.style.setProperty('--x', (Math.cos(a) * d).toFixed(0) + 'px'); s.style.setProperty('--y', (Math.sin(a) * d).toFixed(0) + 'px'); if (i % 3) s.style.background = COLORS[i % COLORS.length]; fx.appendChild(s); T(() => s.remove(), 900); } }
    function wobble(el) { el.classList.remove('wob'); void el.offsetWidth; el.classList.add('wob'); sfx.soft(); }
    // fly a copy of a picture from one element onto another (transform only; completion is timer-driven so reduced motion is fine)
    function fly(from, to, html, ms) { if (!from || !to) return; const fr = fx.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect(); const c = document.createElement('div'); c.className = 'ng-fly'; c.innerHTML = html;
      const sz = Math.min(a.width, a.height); c.style.width = c.style.height = sz + 'px'; c.style.left = (a.left - fr.left + (a.width - sz) / 2) + 'px'; c.style.top = (a.top - fr.top + (a.height - sz) / 2) + 'px'; c.style.transitionDuration = (ms || 520) + 'ms'; fx.appendChild(c);
      const tz = Math.min(b.width, b.height) * .8, dx = b.left - fr.left + (b.width - tz) / 2 - parseFloat(c.style.left), dy = b.top - fr.top + (b.height - tz) / 2 - parseFloat(c.style.top);
      requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transform = `translate(${dx}px, ${dy}px) scale(${(tz / sz).toFixed(3)})`; c.style.opacity = '.0'; })); T(() => c.remove(), (ms || 520) + 80); }

    /* ---------------- one question: choices, gentle misses, praise to the end ---------------- */
    // q: { want, choices: [{id, el}], hint(choiceId) -> line, model -> line, yes -> line, right(el, done) }
    function ask(q) { let misses = 0; setBusy(false); qaMark('want', q.want);
      for (const c of q.choices) c.el.onclick = () => { if (busy || !alive) return;
        if (c.id === q.want) { setBusy(true); qaMark('want', null); const ft = misses === 0; attempts++; if (ft) firstTry++; host.emit('mastery', { item: q.item, correct: true, firstTry: ft });
          q.choices.forEach(x => x.el.classList.remove('hint', 'no')); c.el.classList.add('got'); cheer(); host.sfx.right(); burst(c.el, 14);
          q.right(c.el, () => speak(q.yes, () => { run++; q.after ? q.after() : next(); }, 1800)); return; }
        misses++; wobble(c.el); c.el.classList.add('no'); setBusy(true);
        if (misses === 1) speak(q.hint(c.id), () => setBusy(false), 900);
        else if (misses === 2) { q.choices.forEach(x => { if (x.id === q.want) x.el.classList.add('hint'); }); speak(q.model, () => setBusy(false), 900); }
        else speak(NL.glow, () => setBusy(false), 500); };
    }
    const choice = (id, cls, inner, label) => { const b = document.createElement('button'); b.className = 'ng-choice ' + cls; b.dataset.id = id; b.innerHTML = inner; b.setAttribute('aria-label', label); return b; };
    const card = (html, cls) => { const d = document.createElement('div'); d.className = 'ng-card ' + (cls || ''); d.innerHTML = `<span class="glow"></span>${html}`; return d; };
    const pick = (pool, n) => L.pick(cfg.skill, pool.map(x => x.id), n, rng).map(id => pool.find(x => x.id === id));

    /* ---------------- plans ---------------- */
    let plan = [], total = cfg.rounds || 8;
    if (mode === 'sort') { const lv = NL.LIVING.filter(x => x.lv <= lvl), nl = NL.NOTLIVING.filter(x => x.lv <= lvl), h = Math.ceil(total / 2);
      // balanced: half living, half not; the trickiest unlocked items are guaranteed a place at levels 2+
      const a = pick(lv, h), b = pick(nl, total - h); plan = rng.shuffle(a.concat(b));
      for (let i = 1; i < plan.length; i++) if (plan[i] === plan[i - 1]) { const j = (i + 2) % plan.length; [plan[i], plan[j]] = [plan[j], plan[i]]; } }
    else if (mode === 'needs') { const pool = NL.NEED_ITEMS.filter(x => x.lv <= lvl); plan = pick(pool, total); }
    else if (mode === 'homes') { const pool = NL.ANIMALS.filter(x => x.lv <= lvl); plan = pick(pool, total); }
    else { total = cfg.rounds || 3; plan = rng.shuffle(NL.PLANTS.slice()).slice(0, total); }
    for (let i = 1; i < plan.length; i++) if (plan[i] === plan[i - 1] && plan.length > 2) { const j = (i + 1) % plan.length; [plan[i], plan[j]] = [plan[j], plan[i]]; }

    function next() { run++; setBusy(true); if (qi >= total) return finale(); host.emit('progress', { done: qi, total }); scene.innerHTML = ''; tray.innerHTML = ''; tray.className = 'ng-tray';
      const item = plan[qi]; qi++; ({ sort: sortQ, needs: needsQ, cycle: cycleQ, homes: homesQ })[mode](item, qi === 1); }
    function finale() { run++; setBusy(true); qaMark('want', null); host.emit('progress', { done: total, total }); root.querySelector('.ng').classList.add('bloom'); sfx.chime(); burst(scene, 22);
      const end = { sort: NL.sort.end, needs: NL.needs.end, cycle: NL.cycle.end, homes: NL.homes.end }[mode]; txt.textContent = end; prompt = end;
      speak(end, () => T(() => host.end({ total: attempts, done: attempts, firstTry }), 300), 2200); }

    /* ---------------- lesson 1: living or not living ---------------- */
    let bins = null;
    function sortQ(it, first) {
      const spot = card(A.pic(it.id), 'big arrive'); scene.appendChild(spot);
      if (!bins) bins = { living: choice('living', 'bin bed', `<span class="bin-in"></span><span class="badge">${A.pic('flower')}${A.pic('rabbit')}</span><b>${NL.sort.living}</b>`, NL.sort.living),
        not: choice('not', 'bin crate', `<span class="bin-in"></span><span class="badge">${A.pic('rock')}${A.pic('cup')}</span><b>${NL.sort.notLiving}</b>`, NL.sort.notLiving) };
      tray.classList.add('bins'); tray.append(bins.living, bins.not); [bins.living, bins.not].forEach(b => b.classList.remove('got', 'hint', 'no'));
      const want = it.living ? 'living' : 'not', say = [NL.sort.name(it), NL.sort.ask];
      ask({ item: it.id, want, choices: [{ id: 'living', el: bins.living }, { id: 'not', el: bins.not }], hint: () => NL.sort.hint, model: NL.sort.model(it), yes: NL.sort.yes(it),
        right(el, done) { const sv = spot.querySelector('svg'); fly(sv, el.querySelector('.bin-in'), A.pic(it.id), 560); spot.classList.add('gone');
          T(() => { const m = document.createElement('span'); m.className = 'mini'; m.innerHTML = A.pic(it.id); const inn = el.querySelector('.bin-in'); inn.appendChild(m); while (inn.children.length > 6) inn.firstChild.remove(); done(); }, 520); } });
      const shown = `${NL.sort.name(it)} ${NL.sort.ask}`;
      setBusy(true); if (first) setPrompt(shown, [NL.sort.intro, ...say], () => setBusy(false)); else setPrompt(shown, say, () => setBusy(false));
    }

    /* ---------------- lesson 2: what plants and animals need ---------------- */
    function needsQ(it, first) {
      const who = it.who === 'sprout' ? 'sprout' : it.who;
      const cue = { water: '<i class="cue dry"></i>', light: '<i class="cue dark"></i>', food: '<i class="cue bowl"></i>', air: '<i class="cue jar"></i>', shelter: '<i class="cue rain"><b></b><b></b><b></b></i>' }[it.need];
      const spot = card(`<span class="who ${it.need === 'water' && it.kind === 'plant' ? 'droop' : ''}">${A.pic(who)}</span>${cue}`, 'big arrive need-' + it.need); scene.appendChild(spot);
      const n = lvl === 0 ? 2 : lvl === 1 ? 3 : 4; let opts = [it.need];
      const pref = it.kind === 'plant' ? ['food', 'water', 'light', 'shelter'] : ['water', 'food', 'shelter', 'light', 'air'];
      for (const k of rng.shuffle(pref.slice()).sort((a, b) => (it.kind === 'plant' && lvl >= 1 ? (b === 'food') - (a === 'food') : 0))) { if (opts.length >= n) break; if (!opts.includes(k) && (k !== 'air' || lvl >= 2)) opts.push(k); }
      opts = rng.shuffle(opts);
      const choices = opts.map(k => ({ id: k, el: choice(k, 'need', `${A.pic(k, { food: it.food })}<b>${NL.NEED_NAME[k]}</b>`, NL.NEED_NAME[k]) }));
      tray.classList.add('needs', 'n' + choices.length); choices.forEach(c => tray.appendChild(c.el));
      ask({ item: it.id, want: it.need, choices, hint: (picked) => it.kind === 'plant' && picked === 'food' ? NL.needs.plantFood : NL.needs.hint[it.need], model: NL.needs.model[it.need], yes: it.yes,
        right(el, done) { fly(el.querySelector('svg'), spot, A.pic(it.need, { food: it.food }), 560); T(() => { spot.classList.add('happy'); burst(spot, 16); sfx.grow(3); done(); }, 560); } });
      setBusy(true); if (first) setPrompt(it.ask, [NL.needs.intro, it.ask], () => setBusy(false)); else setPrompt(it.ask, it.ask, () => setBusy(false));
    }

    /* ---------------- lesson 3: life cycle in order ---------------- */
    function cycleQ(p, first) {
      const stages = NL.stagesAt(lvl), N = stages.length; let k = 0;
      const path = document.createElement('div'); path.className = 'ng-cycle n' + N; scene.appendChild(path);
      const slots = stages.map((s, i) => { const d = document.createElement('div'); d.className = 'slot' + (i === 0 ? ' next' : ''); d.innerHTML = `<span class="ring"></span><span class="pin">${i + 1}</span>`; path.appendChild(d); return d; });
      const cards = rng.shuffle(stages.slice()); tray.classList.add('cycle', 'n' + N);
      const els = cards.map(s => { const b = choice(s, 'stage', A.pic(NGA.stagePic(s), p), NL.cycle.stage[s]); tray.appendChild(b); return { id: s, el: b }; });
      const step = () => { const s = stages[k], left = els.filter(c => !c.el.classList.contains('used'));
        ask({ item: s, want: s, choices: left, hint: () => (k === 0 ? NL.cycle.hintFirst : NL.cycle.hint), model: NL.cycle.model[s], yes: NL.cycle.stage[s],
          right(el, done) { const slot = slots[k]; fly(el.querySelector('svg'), slot, A.pic(NGA.stagePic(s), p), 480); el.classList.add('used');
            T(() => { slot.classList.remove('next'); slot.classList.add('full'); slot.insertAdjacentHTML('beforeend', A.pic(NGA.stagePic(s), p)); sfx.grow(k); k++; if (slots[k]) slots[k].classList.add('next'); done(); }, 480); },
          after() { if (k < N) { txt.textContent = 'What comes next?'; prompt = NL.cycle.next; step(); return; }
            setBusy(true); path.classList.add('grown'); burst(path, 20); const line = [NL.cycle.recap[N], NL.cycle.done(p)]; txt.textContent = NL.cycle.done(p); prompt = line; speak(line, () => { run++; next(); }, 2600); } }); };
      txt.textContent = 'What comes first?'; setBusy(true); setPrompt('What comes first?', first ? [NL.cycle.grow(p), NL.cycle.intro] : [NL.cycle.grow(p), NL.cycle.intro], () => setBusy(false)); step(); setBusy(true);
    }

    /* ---------------- lesson 4: animal homes ---------------- */
    function homesQ(an, first) {
      const spot = card(A.pic(an.id), 'big arrive'); scene.appendChild(spot);
      const n = lvl === 0 ? 2 : lvl === 1 ? 3 : 4, all = Object.keys(NL.HOMES); const opts = [an.home];
      for (const h of rng.shuffle(all.slice())) { if (opts.length >= n) break; if (opts.includes(h) || NL.LOOKALIKE[an.home] === h || opts.some(o => NL.LOOKALIKE[o] === h)) continue; opts.push(h); }
      const choices = rng.shuffle(opts).map(h => ({ id: h, el: choice(h, 'home', `${A.pic(h)}<b>${NL.HOMES[h]}</b>`, NL.HOMES[h]) }));
      tray.classList.add('homes', 'n' + choices.length); choices.forEach(c => tray.appendChild(c.el));
      ask({ item: an.id, want: an.home, choices, hint: () => an.hint, model: an.model, yes: an.yes,
        right(el, done) { fly(spot.querySelector('svg'), el, A.pic(an.id), 600); spot.classList.add('gone'); T(() => { const m = document.createElement('span'); m.className = 'resident'; m.innerHTML = A.pic(an.id); el.appendChild(m); sfx.grow(4); done(); }, 600); } });
      const line = NL.homes.ask(an); setBusy(true); if (first) setPrompt(line, [NL.homes.intro, line], () => setBusy(false)); else setPrompt(line, line, () => setBusy(false));
    }

    T(next, 300);
    return { stop() { alive = false; run++; timers.forEach(clearTimeout); host.say(''); } };
  }
});
