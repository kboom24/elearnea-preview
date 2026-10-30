/* Firefly Count (Math, ages 4-7). Counting (K.CC.B.4/5) and addition within 5/10 (K.OA.A.2/5, 1.OA.C.6).
   Count mode: tap every firefly into the jar (one-to-one counting, the voice counts along), then pick how many.
   Add mode: two jars + a big jar; pick how many altogether, or tap the jars to pour and count. Never fail: misses replay the count, then the answer glows.
   Contract: start(config, host) -> {stop}; host.emit('progress'|'mastery'); host.end(results). */
El.defineGame({
  id: 'firefly-count',
  start(cfg, host) {
    const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    const L = host.learn, rng = host.rng, root = host.root, total = cfg.rounds || 6, mode = cfg.mode || 'count';
    let alive = true, qi = 0, firstTry = 0, timers = [];
    const T = (fn, ms) => { const h = setTimeout(() => { if (alive) fn(); }, ms); timers.push(h); return h; };
    const maxN = () => cfg.levels[L.levelIndex(cfg.skill, cfg.levels.length)];
    const pool = () => { const m = maxN(), out = []; if (mode === 'count') { for (let n = 1; n <= m; n++) out.push(String(n)); } else { for (let a = 1; a < m; a++) for (let b = 1; a + b <= m; b++) out.push(a + '+' + b); } return out; };
    const plan = L.pick(cfg.skill, pool(), total, rng);
    root.innerHTML = `<div class="ff"><div class="ff-meadow"><div class="moon"></div>
      <svg class="grass" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0 120V70q20-40 30 0 12-50 24 0 10-34 22 2 14-46 26 0 10-30 22 4 16-52 30-2 10-28 24 4 12-44 26 0 12-34 24 2 14-48 28-2 10-30 22 4 14-40 28 0 12-36 24 2 10-26 20 6V120z" fill="#2F5B4E"/><path d="M0 120V92q30-30 50 4 30-34 60 0 30-30 60 2 30-34 60 0 30-30 60 2 30-30 60 0 30-26 50 2v20z" fill="#3F7A63"/></svg></div>
      <div class="ff-prompt"><button class="btn round sm cream" id="ffSay" aria-label="Hear it again">${El.icon('sound')}</button><div class="bubble" id="ffTxt"></div></div>
      <div class="ff-field" id="ffField"></div><div class="ff-jars" id="ffJars"></div><div class="ff-answers hidden" id="ffAns"></div>
      <button class="wick ff-wick" id="ffWick" aria-label="Wick"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""></button></div>`;
    const $ = (id) => root.querySelector('#' + id), field = $('ffField'), jars = $('ffJars'), ans = $('ffAns'), txt = $('ffTxt');
    let prompt = '';
    const speak = (t, o) => host.say(t, Object.assign({ rate: .95 }, o || {}));
    const setPrompt = (t, spoken) => { prompt = spoken || t; txt.textContent = t; speak(prompt); };
    $('ffSay').onclick = () => speak(prompt); $('ffWick').onclick = () => { const w = $('ffWick'); w.classList.remove('cheer'); void w.offsetWidth; w.classList.add('cheer'); speak(prompt); };
    const jarSVG = (id) => `<svg viewBox="0 0 120 146"><defs><radialGradient id="g${id}" cx="50%" cy="62%" r="55%"><stop offset="0" stop-color="#FFE9A0" stop-opacity=".95"/><stop offset="1" stop-color="#F5B841" stop-opacity="0"/></radialGradient></defs>
      <ellipse class="glow" cx="60" cy="92" rx="70" ry="66" fill="url(#g${id})" opacity="0"/>
      <path d="M26 34h68v8c10 6 14 16 14 28v52c0 12-8 20-20 20H32c-12 0-20-8-20-20V70c0-12 4-22 14-28z" fill="rgba(200,220,255,.16)" stroke="rgba(246,235,217,.85)" stroke-width="4"/>
      <path d="M22 18h76a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4z" fill="#6B5A4A" stroke="#3B2F1E" stroke-width="3"/>
      <path d="M24 60c-3 10-3 40 0 60" stroke="rgba(255,255,255,.5)" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`;
    function makeJar(cls, n) { const b = document.createElement('button'); b.className = 'jar ' + (cls || ''); const id = Math.random().toString(36).slice(2, 7); b.innerHTML = jarSVG(id) + '<div class="in"></div><div class="num"></div>'; b._n = 0; b.setAttribute('aria-label', 'Jar'); setFill(b, n || 0); return b; }
    function setFill(j, n) { j._n = n; const inn = j.querySelector('.in'); inn.innerHTML = '<i></i>'.repeat(n); j.querySelector('.glow').setAttribute('opacity', Math.min(1, n * .14).toFixed(2)); }
    function answers(correct, m, onPick) {
      const opts = new Set([correct]); const spread = L.difficulty(cfg.skill) > .5 ? 1 : 2; let g = 0;
      while (opts.size < 3 && g++ < 50) { const d = rng.int(1, spread + 1) * (rng.next() < .5 ? -1 : 1), v = correct + d; if (v >= 1 && v <= Math.max(m + 2, 5)) opts.add(v); }
      for (let v = 1; opts.size < 3; v++) opts.add(v);
      ans.innerHTML = ''; ans.classList.remove('hidden');
      rng.shuffle([...opts]).forEach(v => { const b = document.createElement('button'); b.className = 'btn ' + ['', 'teal', 'coral'][ans.children.length]; b.textContent = v; b.setAttribute('aria-label', W[v] || String(v)); b._v = v; b.onclick = () => onPick(b, v); ans.appendChild(b); });
    }
    function countAlong(jar, n, done) { const dots = jar.querySelectorAll('.in i'); let k = 0; const step = () => { if (k > 0 && dots[k - 1]) dots[k - 1].classList.remove('hl'); if (k >= n) { if (done) T(done, 300); return; } if (dots[k]) dots[k].classList.add('hl'); jar.querySelector('.num').textContent = k + 1; host.sfx.step(k); speak(W[k + 1], { rate: 1.1 }); k++; T(step, 650); }; step(); }
    function question() {
      if (qi >= total) { host.end({ total, done: total, firstTry }); return; }
      host.emit('progress', { done: qi, total });
      field.innerHTML = ''; jars.innerHTML = ''; ans.innerHTML = ''; ans.classList.add('hidden');
      const item = plan[qi]; let misses = 0;
      const pick = (correct, jar) => (b, v) => {
        if (b.classList.contains('no')) return;
        if (v === correct) {
          host.sfx.right(); jar.classList.add('lit'); jar.querySelector('.num').textContent = correct; b.classList.add('glow');
          speak(`Yes! ${W[correct]}!`); const wk = $('ffWick'); wk.classList.remove('cheer'); void wk.offsetWidth; wk.classList.add('cheer');
          const ft = misses === 0; if (ft) firstTry++; host.emit('mastery', { item, correct: true, firstTry: ft });
          [...ans.children].forEach(x => { x.onclick = null; }); qi++; T(question, 1500);
        } else {
          misses++; host.sfx.wrong(); b.classList.add('no');
          if (misses === 1) { speak("Let's count together."); T(() => countAlong(jar, correct, () => speak('How many?')), 900); }
          else { [...ans.children].forEach(x => { if (x._v === correct) x.classList.add('hint'); }); speak('Here it is!'); }
        }
      };
      if (mode === 'count') {
        const n = +item, jar = makeJar('', 0); jars.appendChild(jar);
        setPrompt('Tap the fireflies into the jar!', 'Tap each firefly to put it in the jar!');
        const fw = field.clientWidth, fh = field.clientHeight, spots = [];
        for (let i = 0; i < n; i++) { let x, y, g = 0; do { x = 10 + rng.next() * 80; y = 14 + rng.next() * 72; g++; } while (g < 40 && spots.some(s => Math.hypot((s[0] - x) * fw / 100, (s[1] - y) * fh / 100) < 92)); spots.push([x, y]); }
        let got = 0;
        spots.forEach(([x, y], i) => { const f = document.createElement('button'); f.className = 'fly drift'; f.style.left = x + '%'; f.style.top = y + '%'; f.style.setProperty('--dur', (3.5 + rng.next() * 3).toFixed(1) + 's'); f.style.setProperty('--dx', rng.int(-18, 18) + 'px'); f.style.setProperty('--dy', rng.int(-14, 14) + 'px'); f.style.animationDelay = (-rng.next() * 4).toFixed(1) + 's';
          f.innerHTML = '<span class="w1"></span><span class="w2"></span><span class="body"></span>'; f.setAttribute('aria-label', 'Firefly');
          f.onclick = () => { if (f._got) return; f._got = 1; got++; const jr = jar.getBoundingClientRect(), fr = field.getBoundingClientRect();
            f.classList.remove('drift'); f.classList.add('gone'); f.style.left = (jr.left + jr.width / 2 - fr.left) + 'px'; f.style.top = (jr.top + jr.height * .6 - fr.top) + 'px';
            host.sfx.step(got - 1); const k = got; T(() => { setFill(jar, k); jar.querySelector('.num').textContent = k; }, 420); speak(W[got], { rate: 1.15 });
            if (got === n) T(() => { setPrompt('How many fireflies?', 'How many fireflies are in the jar?'); jar.querySelector('.num').textContent = ''; answers(n, maxN(), pick(n, jar)); }, 1100); };
          field.appendChild(f); });
      } else {
        const [a, b] = item.split('+').map(Number), s = a + b;
        const ja = makeJar('small', a), jb = makeJar('small', b), big = makeJar('', 0);
        const plus = document.createElement('div'); plus.className = 'ff-sign'; plus.textContent = '+'; const eq = document.createElement('div'); eq.className = 'ff-sign'; eq.textContent = '=';
        ja.querySelector('.num').textContent = a; jb.querySelector('.num').textContent = b; big.querySelector('.num').textContent = '?';
        jars.append(ja, plus, jb, eq, big);
        setPrompt(`${a} and ${b} more. How many in all?`, `${W[a]} ${a === 1 ? "firefly" : "fireflies"} and ${W[b]} more. How many in all?`);
        let poured = false; const pour = () => { if (poured) return; poured = true; ja.classList.add('lit'); jb.classList.add('lit'); setFill(big, s); big.querySelector('.num').textContent = ''; countAlong(big, s, () => speak('How many in all?')); };
        ja.onclick = jb.onclick = () => { host.sfx.tap(); pour(); };
        answers(s, maxN(), (btn, v) => { if (v !== s && !poured && misses === 0) { misses++; host.sfx.wrong(); btn.classList.add('no'); speak("Let's pour them in and count."); T(pour, 700); return; } pick(s, big)(btn, v); });
      }
    }
    T(question, 300);
    return { stop() { alive = false; timers.forEach(clearTimeout); host.say(''); } };
  }
});
