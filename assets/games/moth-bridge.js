/* Moth Bridge (Reading, ages 5-7): the step after Mothabet's letter sounds. Sound-moths land on a bridge, the child taps each one
   to hear its sound (left to right), slides the lantern under them to push the sounds together, then picks the picture word.
   Modes (lesson config.mode): onset   RF.K.2.C  blend onset + rime (c + at)
                               short-a RF.K.2.D / RF.K.3.A  blend 3 sounds, short a CVC
                               mixed   RF.1.2.B / RF.K.3.B  blend 3 sounds, mixed short vowels
                               segment RF.1.2.D / RF.K.2.D  the reverse: hear the word, tap each sound in order onto the bridge
   Every tap says a sound or a word, so all the play is phonics practice. Misses are gentle: 1st = hear the sounds again (the
   lantern slides them as a model), 2nd = the answer glows and is said. Feedback/praise lines finish (voice onend) before the next
   word; every callback is guarded by a run token so an interrupted line can't start a stale step. Spaced repetition: El.Learn only. */
El.defineGame({
  id: 'moth-bridge',
  start(cfg, host) {
    const B = El.BridgeLines, L = host.learn, rng = host.rng, root = host.root, mode = cfg.mode || 'short-a';
    const seg = mode === 'segment', total = cfg.rounds || (mode === 'mixed' ? 8 : 6);
    const pool = B.WORDS[mode] || B.WORDS['short-a'], allW = [...new Set([].concat(...Object.values(B.WORDS)))];
    let alive = true, qi = 0, firstTry = 0, run = 0, busy = false, phase = '';
    const timers = []; const T = (fn, ms) => { const h = setTimeout(() => { if (alive) fn(); }, ms); timers.push(h); return h; };
    const QA = /[?&]qa=1(&|$)/.test(location.search), qa = (k, v) => { if (!QA) return; if (v == null) delete root.dataset[k]; else root.dataset[k] = v; };
    const setBusy = (b) => { busy = b; root.classList.toggle('mbr-busy', b); qa('busy', b ? '1' : null); };
    // say + finish callback: runs once, only if this item's run is still current; a watchdog covers a voice that never ends
    const say = (t, cb) => { const my = run; let fired = false; const n = Array.isArray(t) ? t.length : 1;
      const fin = () => { if (fired) return; fired = true; if (alive && my === run && cb) cb(); };
      const ok = host.say(t, { rate: .95, onend: fin }); if (cb) T(fin, ok ? 4000 + 1600 * n : 450); return ok; };
    const plan = L.pick(cfg.skill, pool.slice(), total, rng);
    const mothSVG = (hue) => `<svg viewBox="0 0 140 110" aria-hidden="true"><path d="M62 30c-6-14-14-22-20-26M78 30c6-14 14-22 20-26" fill="none" stroke="#2A2152" stroke-width="3.5" stroke-linecap="round"/><circle cx="42" cy="4" r="4.5" fill="#F5B841"/><circle cx="98" cy="4" r="4.5" fill="#F5B841"/>
      <path d="M66 46C48 14 10 12 6 34c-3 18 22 30 60 22z" fill="${hue[0]}"/><path d="M74 46c18-32 56-34 60-12 3 18-22 30-60 22z" fill="${hue[0]}"/>
      <path d="M66 58c-28 2-46 18-38 34 8 14 30 4 40-24zM74 58c28 2 46 18 38 34-8 14-30 4-40-24z" fill="${hue[1]}"/>
      <circle cx="30" cy="34" r="8" fill="#F6EBD9" opacity=".55"/><circle cx="110" cy="34" r="8" fill="#F6EBD9" opacity=".55"/><ellipse cx="70" cy="56" rx="9" ry="30" fill="#5B4E7A"/><circle cx="66" cy="36" r="3" fill="#fff"/><circle cx="74" cy="36" r="3" fill="#fff"/></svg>`;
    const HUES = [['#F5B841', '#F08A7E'], ['#7CC4A4', '#5DA9D6'], ['#9B8AD1', '#F4A9A0'], ['#F08A7E', '#F5B841']];
    const lanternSVG = `<svg viewBox="0 0 60 80" aria-hidden="true"><path d="M22 10h16M30 4v6" stroke="#2A2152" stroke-width="4" stroke-linecap="round"/><rect x="14" y="12" width="32" height="10" rx="4" fill="#8E5427"/>
      <path d="M16 22h28l4 40H12z" fill="#F5B841"/><path d="M22 28h16l2 28H20z" fill="#FFF4C8"/><ellipse cx="30" cy="46" rx="5" ry="8" fill="#F08A7E"/><rect x="10" y="62" width="40" height="10" rx="4" fill="#8E5427"/></svg>`;
    root.innerHTML = `<div class="mbr${seg ? ' seg' : ''}"><div class="mbr-sky"></div><div class="mbr-river"></div>
      <div class="mbr-top"><button class="btn round cream mbr-hear" id="mbHear" aria-label="Hear it again">${El.icon('sound')}</button><div class="mbr-show" id="mbShow"></div></div>
      <div class="mbr-mid"><div class="mbr-span" id="mbSpan"><div class="mbr-bridge"><svg class="mbr-arch" viewBox="0 0 600 160" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 150C120 40 480 40 600 150v10H0z" fill="#8E5427"/><path d="M0 138C120 28 480 28 600 138" fill="none" stroke="#B5733A" stroke-width="22"/><path d="M0 138C120 28 480 28 600 138" fill="none" stroke="#D99A5B" stroke-width="5" stroke-dasharray="2 34"/>
        <path d="M40 120V76M120 82V44M200 64V30M300 58V24M400 64V30M480 82V44M560 120V76" stroke="#6A3D1B" stroke-width="8" stroke-linecap="round"/><path d="M40 76C150 10 450 10 560 76" fill="none" stroke="#6A3D1B" stroke-width="6" stroke-linecap="round"/></svg>
        <div class="mbr-planks" id="mbPlanks"></div></div>
        <div class="mbr-slide" id="mbSlide"><div class="mbr-track"><i></i></div><button class="mbr-lantern" id="mbLantern" aria-label="Slide the sounds together">${lanternSVG}</button></div></div></div>
      <div class="mbr-cards" id="mbCards"></div>
      <button class="wick mbr-wick" id="mbWick" aria-label="Wick"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""></button></div>`;
    const $ = (id) => root.querySelector('#' + id), planks = $('mbPlanks'), cards = $('mbCards'), show = $('mbShow'), lantern = $('mbLantern'), slideEl = $('mbSlide'), span = $('mbSpan');
    let word = '', parts = [], moths = [], slots = [], heard = 0, misses = 0, slotMiss = 0, pos = 0, sung = [];
    const cheer = () => { const w = $('mbWick'); w.classList.remove('cheer'); void w.offsetWidth; w.classList.add('cheer'); };
    const sound = (p) => B.partSound(p);
    const moth = (p, i) => { const b = document.createElement('button'); b.className = 'moth' + (p.length > 1 ? ' wide' : ''); b.dataset.l = p; b.setAttribute('aria-label', 'sound ' + p);
      b.innerHTML = mothSVG(HUES[i % HUES.length]) + `<b>${p}</b>`; return b; };
    const wiggle = (el) => { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); };
    function buildBridge(n) { planks.innerHTML = ''; planks.dataset.n = n; slots = []; for (let i = 0; i < n; i++) { const s = document.createElement('div'); s.className = 'plank'; planks.appendChild(s); slots.push(s); } }
    function resetSlide() { lantern.style.transition = 'none'; lantern.style.left = '0px'; void lantern.offsetWidth; lantern.style.transition = ''; slideEl.classList.remove('on', 'done'); planks.classList.remove('together'); sung = parts.map(() => false); }
    const prompt = () => seg ? (pos === 0 ? B.first : pos === parts.length - 1 ? B.last : B.next) : '';
    function hearAgain() { if (busy || !word) return; if (seg) { say([B.word(word), prompt()]); return; }
      const ps = moths.filter(m => m.classList.contains('lit')).map(m => sound(m.dataset.l)); if (phase === 'pick') say([...parts.map(sound), B.which]); else if (ps.length) say(ps); else say(B.hear); }
    $('mbHear').onclick = hearAgain; $('mbWick').onclick = () => { cheer(); hearAgain(); };

    // ---------- the lantern slider: passing under each moth says its sound; reaching the end pushes the sounds together
    const xs = () => { const tr = slideEl.getBoundingClientRect(); return { tr, max: tr.width - lantern.offsetWidth, cs: moths.map(m => { const r = m.getBoundingClientRect(); return r.left + r.width / 2 - tr.left - lantern.offsetWidth / 2; }) }; };
    function passTo(x, g) { moths.forEach((m, i) => { if (!sung[i] && x >= g.cs[i] - 6) { sung[i] = true; m.classList.add('sing'); host.say(sound(m.dataset.l), { rate: 1.1 }); host.sfx.step(i + 2); } }); }
    let drag = null;
    lantern.addEventListener('pointerdown', (e) => { if (busy || phase !== 'slide') return; e.preventDefault(); lantern.setPointerCapture && lantern.setPointerCapture(e.pointerId); const g = xs(); drag = { x0: e.clientX, l0: parseFloat(lantern.style.left) || 0, g, moved: 0 }; lantern.style.transition = 'none'; });
    lantern.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x0; drag.moved = Math.max(drag.moved, Math.abs(dx)); const x = Math.max(0, Math.min(drag.g.max, drag.l0 + dx)); lantern.style.left = x + 'px'; passTo(x, drag.g); if (x >= drag.g.max - 4) { const d = drag; drag = null; lantern.style.transition = ''; slid(d.g); } });
    const up = () => { if (!drag) return; const d = drag; drag = null; lantern.style.transition = ''; if (d.moved < 10) autoSlide(() => afterSlide()); };
    lantern.addEventListener('pointerup', up); lantern.addEventListener('pointercancel', up);
    lantern.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && phase === 'slide' && !busy) { e.preventDefault(); autoSlide(() => afterSlide()); } });
    function slid() { if (phase !== 'slide') return; phase = 'slid'; setBusy(true); slideEl.classList.add('done'); planks.classList.add('together'); host.sfx.step(6); T(afterSlide, 900); }
    // model slide (a tap on the lantern, or a hint): glide under each moth, say each sound to the end, then push them together
    function autoSlide(then) { const my = ++run; setBusy(true); phase = 'model'; slideEl.classList.remove('done'); planks.classList.remove('together'); sung = parts.map(() => false);
      lantern.style.transition = 'none'; lantern.style.left = '0px'; void lantern.offsetWidth; lantern.style.transition = 'left .38s ease-in-out'; const g = xs(); let i = 0;
      const step = () => { if (!alive || my !== run) return; if (i >= moths.length) { lantern.style.left = g.max + 'px'; T(() => { if (my !== run) return; slideEl.classList.add('done'); planks.classList.add('together'); T(() => { if (my === run) then(); }, 600); }, 380); return; }
        const m = moths[i], k = i; lantern.style.left = Math.max(0, g.cs[k]) + 'px'; T(() => { if (my !== run) return; sung[k] = true; m.classList.add('sing'); say(sound(m.dataset.l), () => { i++; T(step, 120); }); }, 380); };
      step(); }
    function afterSlide() { if (seg) return; phase = 'pick'; setBusy(false); qa('want', 'pick:' + word); if (!cards.childElementCount) showCards(); else say(B.which); }

    // ---------- blend: land, tap each moth, slide, pick the picture
    function distractors(k) { const d = L.difficulty(cfg.skill), out = [], add = (w) => { if (w && w !== word && !out.includes(w) && out.length < k && ![word, ...out].some(o => (B.SAME[o] || []).includes(w))) out.push(w); };
      const near = (w) => w.length === word.length && ((w[0] === word[0]) + (w[1] === word[1]) + (w[2] === word[2])) >= 2; // cat~hat~cap: only one sound differs
      if (d > .5) rng.shuffle(allW.filter(near)).forEach(add);
      rng.shuffle(pool.filter(w => !near(w))).forEach(add); rng.shuffle(allW.filter(w => !near(w))).forEach(add); return out; }
    function showCards() { const d = L.difficulty(cfg.skill), k = d < .35 ? 1 : 2, ws = rng.shuffle([word, ...distractors(k)]); cards.innerHTML = '';
      ws.forEach(w => { const c = document.createElement('button'); c.className = 'mbr-card'; c.dataset.w = w; c.setAttribute('aria-label', 'picture'); c.innerHTML = `<span class="in">${El.wordPic(w)}</span>`; c.onclick = () => pick(c, w); cards.appendChild(c); });
      if (QA) qa('miss', ws.find(w => w !== word)); cards.classList.add('show'); say(B.which); }
    function pick(c, w) { if (busy || phase !== 'pick' || c.classList.contains('no')) return;
      if (w === word) { phase = 'fb'; setBusy(true); qa('want', null); c.classList.add('yes'); c.classList.remove('hint'); cards.querySelectorAll('.mbr-card').forEach(x => { if (x !== c) x.classList.add('fade'); });
        const ft = misses === 0; if (ft) firstTry++; host.emit('mastery', { item: word, correct: true, firstTry: ft }); host.sfx.right(); cheer(); planks.classList.add('cross');
        say(ft ? [B.word(word), rng.pick(B.yes)] : [B.word(word)], () => { qi++; T(next, 450); }); return; }
      misses++; host.sfx.wrong(); c.classList.add('no'); wiggle(c); setBusy(true); phase = 'fb';
      const left = [...cards.querySelectorAll('.mbr-card:not(.no)')];
      if (misses === 1 && left.length > 1) say([B.word(w), B.again], () => autoSlide(() => { phase = 'pick'; setBusy(false); qa('want', 'pick:' + word); qa('miss', left.find(x => x.dataset.w !== word).dataset.w); say(B.which); }));
      else { qa('miss', null); say(B.word(w), () => autoSlide(() => { const r = cards.querySelector(`[data-w="${word}"]`); r.classList.add('hint'); cards.querySelectorAll('.mbr-card').forEach(x => { if (x !== r) x.classList.add('no'); });
        say([B.word(word), B.here], () => { phase = 'pick'; setBusy(false); qa('want', 'pick:' + word); }); })); } }
    function blendItem() { buildBridge(parts.length); moths = parts.map((p, i) => moth(p, i)); heard = 0; resetSlide(); setBusy(true); phase = 'land';
      moths.forEach((m, i) => { m.onclick = () => tapMoth(m, i); T(() => { slots[i].appendChild(m); m.classList.add('land'); host.sfx.step(i); }, 250 + i * 420); });
      T(() => { phase = 'tap'; moths[0].classList.add('next'); qa('want', 'tap:0'); if (qi < 2) say(qi === 0 ? [B.intro, B.hear] : B.hear, () => setBusy(false)); else setBusy(false); }, 450 + parts.length * 420); }
    function tapMoth(m, i) { if (busy && phase !== 'tap') return; if (seg) return;
      if (phase === 'tap') { if (i !== heard) { host.say(sound(m.dataset.l)); wiggle(moths[heard]); return; }
        setBusy(false); m.classList.remove('next'); m.classList.add('lit'); heard++; host.sfx.tap && host.sfx.tap();
        if (heard < moths.length) { host.say(sound(m.dataset.l)); moths[heard].classList.add('next'); qa('want', 'tap:' + heard); }
        else { phase = 'slide'; slideEl.classList.add('on'); qa('want', 'slide'); say([sound(m.dataset.l), B.slide]); }
        return; }
      if (!busy) host.say(sound(m.dataset.l)); }

    // ---------- segment: hear the word, tap its sounds in order onto the bridge
    function segItem() { buildBridge(parts.length); moths = []; resetSlide(); show.innerHTML = `<div class="mbr-pic">${El.wordPic(word)}</div>`; show.classList.add('on'); pos = 0; slotMiss = 0;
      const d = L.difficulty(cfg.skill), extra = d > .5 ? rng.shuffle('abdefghilmnoprstuw'.split('').filter(x => !parts.includes(x))).slice(0, 1) : [];
      const tray = rng.shuffle([...parts, ...extra]); cards.innerHTML = ''; cards.classList.add('show', 'tray');
      tray.forEach((p, i) => { const m = moth(p, i); m.classList.add('land'); m.onclick = () => segTap(m); cards.appendChild(m); });
      setBusy(true); phase = 'seg'; qa('want', 'seg:' + parts[0]); segMissMark();
      say(qi < 2 ? [B.word(word), B.order, B.first] : [B.word(word), B.first], () => setBusy(false)); }
    function segMissMark() { if (!QA) return; const w = [...cards.querySelectorAll('.moth')].find(m => m.dataset.l !== parts[pos]); qa('miss', w ? w.dataset.l : null); }
    function segTap(m) { if (busy || phase !== 'seg' || m.classList.contains('placed')) return; const p = m.dataset.l;
      if (p === parts[pos]) { m.classList.remove('hint'); const a = m.getBoundingClientRect(); slots[pos].appendChild(m); m.classList.add('placed', 'lit'); const b2 = m.getBoundingClientRect();
        m.animate([{ transform: `translate(${a.left - b2.left}px, ${a.top - b2.top}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,1.3,.5,1)' }); moths.push(m);
        host.sfx.tap && host.sfx.tap(); pos++; slotMiss = 0;
        if (pos < parts.length) { qa('want', 'seg:' + parts[pos]); segMissMark(); say([sound(p), prompt()]); return; }
        phase = 'fb'; setBusy(true); qa('want', null); qa('miss', null); cards.querySelectorAll('.moth:not(.placed)').forEach(x => x.classList.add('fade'));
        const ft = misses === 0; if (ft) firstTry++; host.emit('mastery', { item: word, correct: true, firstTry: ft });
        say(sound(p), () => autoSlide(() => { host.sfx.right(); cheer(); planks.classList.add('cross'); say([B.word(word), B.yesSeg], () => { qi++; T(next, 450); }); })); return; }
      misses++; slotMiss++; host.sfx.wrong(); wiggle(m); setBusy(true);
      if (slotMiss === 1) say([sound(p), B.again, B.word(word), prompt()], () => setBusy(false));
      else { const r = [...cards.querySelectorAll('.moth')].find(x => x.dataset.l === parts[pos] && !x.classList.contains('placed')); r.classList.add('hint'); say([B.here, sound(parts[pos])], () => setBusy(false)); } }

    function next() { run++; qa('miss', null); qa('want', null);
      if (qi >= total) { setBusy(true); host.emit('progress', { done: total, total }); T(() => host.end({ total, done: total, firstTry }), 300); return; }
      host.emit('progress', { done: qi, total }); word = plan[qi]; parts = B.parts(word, mode); misses = 0; cards.innerHTML = ''; cards.classList.remove('show', 'tray'); planks.classList.remove('cross', 'together');
      qa('word', word); if (seg) segItem(); else { show.innerHTML = ''; show.classList.remove('on'); blendItem(); } }
    T(next, 300);
    return { stop() { alive = false; run++; timers.forEach(clearTimeout); } };
  }
});
