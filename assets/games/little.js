/* Little Lanterns kit (ages 0-4): shared layout + round flow for the early-learner games. Used inside a game module's start(cfg, host).
   Zero reading required: every prompt is voiced, and tapping Wick repeats it, pictures only, one huge target for the youngest,
   very large touch targets (>= 96 px), no fail states (a miss gets a gentle wiggle, a spoken hint, then the answer glows),
   no timers or countdowns. Mastery goes through the shared engine via host.emit('mastery') (first-try right = mastery evidence).
   kit = El.Little.setup(host, cfg, {scene, tip})
     kit.speak(lines)             speak + remember for "hear it again"; kit.say(lines, onend)
     kit.options(list, render)    -> big picture buttons in the answer row (render(item) returns inner HTML)
     kit.single(html)             -> one huge picture button (play-together / under-2 mode)
     kit.run(plan, ask)           ask(item, i, finish) ... finish(firstTry) records mastery and moves on; ends with host.end()
     kit.yes(btn) / kit.soft(btn) / kit.hint(btn), kit.T(fn, ms), kit.stop() */
(function () {
  'use strict';
  const El = window.El;
  El.Little = {
    setup(host, cfg, o) {
      o = o || {}; const root = host.root; let alive = true, timers = [], cur = null;
      root.innerHTML = `<div class="ll ll-${o.scene || 'garden'}${cfg.mode === 'tiny' ? ' tiny' : ''}"><div class="ll-bg">${o.bg || ''}</div>
        <div class="ll-top"><button class="ll-wick" id="llWick" aria-label="Hear it again"><img src="${El.url('assets/img/wick-sm.webp')}" alt=""><span class="ear">${El.icon('sound')}</span></button><div class="ll-bubble" id="llTxt" aria-live="polite"></div></div>
        <div class="ll-show" id="llShow"></div><div class="ll-opts" id="llOpts"></div>
        ${o.tip ? `<div class="ll-tip"><b>Grown-up tip:</b> ${o.tip}</div>` : ''}</div>`;
      const $ = (id) => root.querySelector('#' + id), wick = $('llWick'), txt = $('llTxt'), show = $('llShow'), opts = $('llOpts');
      const T = (fn, ms) => { const h = setTimeout(() => { if (alive) fn(); }, ms); timers.push(h); return h; };
      const say = (lines, onend) => host.say(lines, { rate: 1, onend: onend ? () => { if (alive) onend(); } : undefined });
      const bounce = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
      const kit = {
        root, show, opts, T, say, host,
        speak(lines, label) { cur = lines; txt.textContent = label || ''; txt.classList.toggle('on', !!label); bounce(wick, 'cheer'); return say(lines); },
        // cue(fn): a custom prompt sequence (e.g. a sound effect, then a spoken question); Wick replays it
        cue(fn, label) { cur = fn; txt.textContent = label || ''; txt.classList.toggle('on', !!label); bounce(wick, 'cheer'); fn(); },
        replay() { if (!cur) return; bounce(wick, 'cheer'); if (typeof cur === 'function') cur(); else say(cur); },
        btn(html, cls, label) { const b = document.createElement('button'); b.className = 'll-card ' + (cls || ''); b.innerHTML = html; if (label) b.setAttribute('aria-label', label); return b; },
        options(list, render, label) { opts.innerHTML = ''; opts.dataset.n = list.length; return list.map(it => { const b = kit.btn(render(it), '', label ? label(it) : ''); b._it = it; opts.appendChild(b); return b; }); },
        single(html, label) { opts.innerHTML = ''; opts.dataset.n = 1; const b = kit.btn(html, 'huge', label); opts.appendChild(b); return b; },
        yes(b) { host.sfx.right(); if (b) { b.classList.add('yes'); bounce(b, 'boing'); sparkle(b); } bounce(wick, 'cheer'); },
        soft(b) { softTone(); if (b) bounce(b, 'wiggle'); },
        hint(b) { if (b) b.classList.add('hint'); },
        mark(b) { if (b) b.dataset.ok = '1'; }, // QA marker on the right answer (automated full-round tests)
        lock() { opts.querySelectorAll('.ll-card').forEach(b => { b.onclick = null; b.classList.add('done'); }); },
        // plan: items; ask(item, index, finish): finish(firstTry, {noMastery}) records and goes to the next item
        run(plan, ask) { let qi = 0, first = 0; const total = plan.length;
          const next = () => { if (!alive) return; host.emit('progress', { done: qi, total }); if (qi >= total) { T(() => host.end({ total, done: total, firstTry: first }), 600); return; }
            const item = plan[qi]; let fin = false;
            ask(item, qi, (ft, m) => { if (fin) return; fin = true; if (ft) first++; if (!(m && m.noMastery)) host.emit('mastery', { item: item.id || item, correct: true, firstTry: !!ft }); qi++; T(next, (m && m.wait) || 1700); }); };
          T(next, 350); },
        stop() { alive = false; timers.forEach(clearTimeout); host.say(''); },
        get alive() { return alive; }
      };
      wick.onclick = () => kit.replay();
      function softTone() { const c = El.audio && El.audio(); if (!c) return; const t = c.currentTime, osc = c.createOscillator(), g = c.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(420, t); osc.frequency.linearRampToValueAtTime(360, t + .25);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.08, t + .03); g.gain.exponentialRampToValueAtTime(.0008, t + .3); osc.connect(g); g.connect(c.destination); osc.start(t); osc.stop(t + .35); }
      function sparkle(b) { const r = b.getBoundingClientRect(), rr = root.getBoundingClientRect(); for (let i = 0; i < 10; i++) { const s = document.createElement('i'); s.className = 'll-spark'; const a = i / 10 * Math.PI * 2, d = 60 + (i % 3) * 22;
        s.style.left = (r.left - rr.left + r.width / 2) + 'px'; s.style.top = (r.top - rr.top + r.height / 2) + 'px'; s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px'); s.style.background = ['#F5B841', '#7CC4A4', '#F08A7E', '#9B8AD1', '#F6EBD9'][i % 5];
        root.appendChild(s); setTimeout(() => s.remove(), 900); } }
      return kit;
    },
    // pick n distinct items from pool (excluding `not`), deterministic with rng
    data() { return this._d || (this._d = fetch(El.url('content/early.json'), { cache: 'no-cache' }).then(r => r.json())); },
    others(rng, pool, n, not) { return rng.shuffle(pool.filter(x => !not.includes(x))).slice(0, n); },
    // 2 choices while learning, 3 once the shared engine's difficulty passes the midpoint (adaptive ~80% first-try)
    nChoices(L, skill, min, max) { return Math.min(max || 3, (min || 2) + L.levelIndex(skill, (max || 3) - (min || 2) + 1)); }
  };
})();
