/* Lily Pad Hop (Reading, sight words, ages 4-7; K RF.K.3c, grade 1 RF.1.3g). Hear a word, tap the lily pad that shows it, and the frog hops on.
   Adaptive: more pads and look-alike words (the/they/then) as difficulty rises. Spaced repetition picks due and unmastered words first.
   With no on-device voice, the target word is shown on a sign (visual matching) so it still works. Never fail: after 2 misses the right pad glows. */
El.defineGame({
  id: 'lily-pad',
  start(cfg, host) {
    const L = host.learn, rng = host.rng, root = host.root, total = cfg.rounds || 8;
    const list = cfg.catalog.wordLists[cfg.list].words, conf = cfg.catalog.confusables || {};
    let alive = true, qi = 0, firstTry = 0; const timers = [];
    const T = (fn, ms) => { const h = setTimeout(() => { if (alive) fn(); }, ms); timers.push(h); return h; };
    const plan = L.pick(cfg.skill, list.slice(), total, rng);
    const padSVG = `<svg viewBox="0 0 230 200"><path d="M115 100 L190 40 A105 92 0 1 1 150 18 Z" fill="#5FA77F"/><path d="M115 100 L190 40 A105 92 0 1 1 150 18 Z" fill="none" stroke="#3E7F5C" stroke-width="5"/><path d="M115 100 L40 70M115 100 L60 160M115 100 L150 175M115 100 L200 120" stroke="#4E9479" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>`;
    const lily = `<svg class="lily" viewBox="0 0 60 50"><path d="M30 46C18 40 8 30 10 16c8 4 14 10 20 22 6-12 12-18 20-22 2 14-8 24-20 30z" fill="#F08A7E"/><path d="M30 44c-6-10-6-22 0-34 6 12 6 24 0 34z" fill="#F7B3A8"/><circle cx="30" cy="34" r="4" fill="#F5B841"/></svg>`;
    const frogSVG = `<svg viewBox="0 0 140 112"><ellipse cx="70" cy="80" rx="56" ry="30" fill="#5DAA5A"/><ellipse cx="70" cy="86" rx="34" ry="20" fill="#E6E29A"/>
      <circle cx="42" cy="40" r="22" fill="#5DAA5A"/><circle cx="98" cy="40" r="22" fill="#5DAA5A"/><circle cx="42" cy="40" r="13" fill="#fff"/><circle cx="98" cy="40" r="13" fill="#fff"/>
      <circle cx="45" cy="42" r="7" fill="#1E1B4B"/><circle cx="95" cy="42" r="7" fill="#1E1B4B"/><circle cx="47" cy="39" r="2.4" fill="#fff"/><circle cx="97" cy="39" r="2.4" fill="#fff"/>
      <path d="M48 70c12 10 32 10 44 0" fill="none" stroke="#2E5E32" stroke-width="5" stroke-linecap="round"/><circle cx="34" cy="66" r="6" fill="#F08A7E" opacity=".6"/><circle cx="106" cy="66" r="6" fill="#F08A7E" opacity=".6"/>
      <path d="M18 100c-8 2-14 6-12 10h30zM122 100c8 2 14 6 12 10h-30z" fill="#4E9A4B"/></svg>`;
    root.innerHTML = `<div class="lp"><div class="lp-pond"></div>
      <svg class="lp-reeds" viewBox="0 0 400 80" preserveAspectRatio="none"><path d="M10 80V20l6 60M30 80V5l5 75M370 80V12l6 68M388 80V28l5 52" stroke="#3F7A63" stroke-width="7" stroke-linecap="round"/><ellipse cx="30" cy="12" rx="5" ry="12" fill="#8C6A45"/><ellipse cx="370" cy="18" rx="5" ry="12" fill="#8C6A45"/></svg>
      <div class="lp-top"><button class="btn round cream hear" id="lpHear" aria-label="Hear the word">${El.icon('sound')}</button><div class="lp-sign hide" id="lpSign"></div></div>
      <div class="lp-field" id="lpField"></div><div class="log"></div><div class="frog" id="lpFrog">${frogSVG}</div>
      <button class="wick lp-wick" id="lpWick" aria-label="Wick"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""></button></div>`;
    const $ = (id) => root.querySelector('#' + id), field = $('lpField'), sign = $('lpSign'), frog = $('lpFrog');
    let target = '';
    const sayWord = () => { const ok = host.say(`Find... ${target}`, { rate: .85 }); if (!ok) sign.classList.remove('hide'); return ok; };
    $('lpHear').onclick = sayWord; $('lpWick').onclick = () => { const w = $('lpWick'); w.classList.remove('cheer'); void w.offsetWidth; w.classList.add('cheer'); sayWord(); };
    function distractors(word, k) { const d = L.difficulty(cfg.skill), out = []; const add = (w) => { if (w && w !== word && !out.includes(w) && out.length < k) out.push(w); };
      if (d > .45) rng.shuffle((conf[word] || []).slice()).forEach(add); rng.shuffle(list.slice()).forEach(add); return out; }
    function hop(pad, cb) { const fr = frog.getBoundingClientRect(), pr = pad.getBoundingClientRect(); const dx = pr.left + pr.width / 2 - (fr.left + fr.width / 2), dy = pr.top + pr.height * .42 - (fr.top + fr.height * .7);
      host.sfx.hop(); const a = frog.animate([{ transform: 'translateX(-50%) translate(0,0) scale(1)' }, { transform: `translateX(-50%) translate(${dx / 2}px, ${dy / 2 - 90}px) scale(1.12)` }, { transform: `translateX(-50%) translate(${dx}px, ${dy}px) scale(.85)` }], { duration: 620, easing: 'ease-in-out', fill: 'forwards' });
      a.onfinish = () => { host.sfx.splash(); cb && cb(); }; frog._a = a; }
    function question() {
      if (qi >= total) { host.end({ total, done: total, firstTry }); return; }
      host.emit('progress', { done: qi, total });
      if (frog._a) { frog._a.cancel(); frog._a = null; }
      field.innerHTML = ''; target = plan[qi]; sign.textContent = target; sign.classList.add('hide');
      const d = L.difficulty(cfg.skill), k = d < .35 ? 2 : 3; const words = rng.shuffle([target, ...distractors(target, k)]);
      const n = words.length, spots = n === 3 ? [[24, 30], [76, 34], [50, 72]] : [[25, 24], [75, 26], [27, 70], [73, 72]];
      let misses = 0, done = false;
      words.forEach((w, i) => { const p = document.createElement('button'); p.className = 'pad'; p.style.left = spots[i][0] + '%'; p.style.top = spots[i][1] + '%'; p.setAttribute('aria-label', w);
        p.innerHTML = `<span class="in" style="--d:${(3.4 + rng.next() * 1.6).toFixed(1)}s">${padSVG}<span class="word">${w}</span>${lily}<span class="ring"></span></span>`;
        p.onclick = () => { if (done || p.classList.contains('no')) return;
          if (w === target) { done = true; p.classList.add('yes'); p.classList.remove('hint'); hop(p, () => { host.sfx.right(); host.say(`${target}! Yes!`, { rate: .95 }); });
            const ft = misses === 0; if (ft) firstTry++; host.emit('mastery', { item: target, correct: true, firstTry: ft }); const wk = $('lpWick'); wk.classList.remove('cheer'); void wk.offsetWidth; wk.classList.add('cheer'); qi++; T(question, 1900); }
          else { misses++; host.sfx.wrong(); p.classList.add('no'); host.say([`That says ${w}.`, `Find... ${target}`], { rate: .9 });
            if (misses >= 2) { sign.classList.remove('hide'); field.querySelectorAll('.pad').forEach(x => { if (x.getAttribute('aria-label') === target) x.classList.add('hint'); }); } } };
        field.appendChild(p); });
      T(sayWord, 350);
    }
    T(question, 250);
    return { stop() { alive = false; timers.forEach(clearTimeout); } };
  }
});
