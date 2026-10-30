/* Realm path page: renders the lesson path for one realm from the JSON catalog. */
(async function () {
  'use strict';
  const realmId = document.body.dataset.realm;
  El.ui.sky(44); El.ui.speakable();
  const cat = await El.catalog(); const realm = cat.realms.find(r => r.id === realmId);
  document.title = 'Elearnea · ' + realm.name;
  document.getElementById('title').innerHTML = realm.name + ' ' + El.icon(realm.icon);
  if (El.isLittle()) { document.body.classList.add('little'); const tb = document.getElementById('title'); tb.innerHTML += `<span class="bandtag">${El.band() === 'tiny' ? 'Play together' : 'Little Lanterns'}</span>`; }
  document.getElementById('back').innerHTML = El.icon('back');
  document.getElementById('go').innerHTML = El.icon('play');
  El.ui.soundBtn(document.getElementById('snd'));
  const pct = El.realmProgress(cat, realmId);
  document.getElementById('lantern').innerHTML = `<svg viewBox="0 0 76 76"><defs><radialGradient id="lg"><stop offset="0" stop-color="#FFF2B8"/><stop offset="1" stop-color="#F5B841"/></radialGradient></defs><circle cx="38" cy="44" r="34" fill="#F5B841" opacity=".22"/><path d="M28 10h20M30 10a8 8 0 0 1 16 0" fill="none" stroke="#3B2F1E" stroke-width="4" stroke-linecap="round"/><rect x="18" y="16" width="40" height="8" rx="4" fill="#3B2F1E"/><rect x="21" y="24" width="34" height="38" rx="9" fill="url(#lg)" stroke="#3B2F1E" stroke-width="4"/><rect x="18" y="62" width="40" height="8" rx="4" fill="#3B2F1E"/></svg><b>${pct}%</b>`;
  const lantern = document.getElementById('lantern'); lantern.dataset.say = "Your lantern shows how much you've learned!";
  const state = El.pathState(cat, realmId);
  const path = document.getElementById('path');
  // rows top to bottom: treasure, coming-soon stops, then lessons from last to first (the path climbs from the bottom)
  const rows = [{ kind: 'chest' }, ...((El.isLittle() ? realm.comingSoonLittle : realm.comingSoon) || []).slice().reverse().map(s => ({ kind: 'soon', s })), ...state.slice().reverse().map(x => ({ kind: 'lesson', x }))];
  const n = rows.length, pts = [], tiles = []; let curEl = null, cur = null;
  const open = (x) => { El.sfx.tap(); const g = cat.games[x.ls.game.id]; const go = () => { location.href = El.url(g.path) + '?lesson=' + encodeURIComponent(x.ls.id); }; if (El.Voice.say(x.ls.say || x.ls.name, { rate: 1 })) setTimeout(go, 700); else go(); };
  const locked = () => { El.sfx.wrong(); El.Voice.say('Finish the glowing one first!', { rate: 1 }); El.ui.toast('Finish the glowing stop first!'); };
  rows.forEach((row, i) => {
    const el = document.createElement('div'); el.className = 'row' + (row.kind === 'soon' ? ' soonrow' : '');
    const k = n - 1 - i, xPct = (k % 2 ? 66 : 34) + 4 * Math.sin(k * 1.7); const left = xPct < 50; pts.push(xPct);
    const node = document.createElement('button'); node.className = 'node'; node.style.left = xPct + '%';
    if (row.kind === 'chest') { node.classList.add('chest'); node.innerHTML = El.icon('chest'); node.setAttribute('aria-label', 'Treasure'); node.onclick = () => { El.sfx.tap(); El.Voice.say('A treasure! Finish the path to open it.', { rate: 1 }); El.ui.toast('Treasure! Finish the path to open it.'); }; }
    else if (row.kind === 'soon') { node.classList.add('locked'); node.innerHTML = El.icon('lock'); node.setAttribute('aria-label', row.s.name + ' (coming soon)'); node.onclick = () => { El.sfx.tap(); El.Voice.say('Coming soon!', { rate: 1 }); El.ui.toast('🌙 ' + row.s.name + ': coming soon'); }; }
    else {
      const x = row.x; node.classList.add(x.st === 'locked' ? 'locked' : x.st === 'current' ? 'current' : x.st === 'done' ? 'done' : 'open');
      node.innerHTML = x.st === 'locked' ? El.icon('lock') : El.icon(x.ls.icon) + `<span class="st">${[0, 1, 2].map(s => El.icon('star', s < x.stars ? 'on' : '')).join('')}</span>`;
      node.setAttribute('aria-label', x.ls.name + (x.st === 'locked' ? ' (locked)' : ''));
      node.onclick = () => (x.st === 'locked' ? locked() : open(x));
      const g = cat.games[x.ls.game.id]; const t = document.createElement('button'); t.className = 'tile' + (x.st === 'locked' ? ' locked' : '');
      t._x = xPct; t._l = left; tiles.push(t); t.style.setProperty('--r', (left ? 3 : -3) + 'deg');
      t.innerHTML = `<img src="../../${g.tile}" alt="" loading="lazy"><span class="lbl">${x.ls.name}</span>`; t.setAttribute('aria-label', x.ls.name);
      t.onclick = node.onclick; el.appendChild(t);
      if (x.st === 'current') { curEl = el; cur = x; const m = document.createElement('img'); m.className = 'mini'; m.src = '../../assets/img/wick-sm.webp'; m.alt = ''; m.style.left = `calc(${xPct}% ${left ? '-' : '+'} 70px - 39px)`; el.appendChild(m); }
    }
    el.appendChild(node); path.appendChild(el);
  });
  // felt road behind the nodes
  const drawRoad = () => { const W = path.clientWidth, rh = path.querySelector('.row').offsetHeight, top = 16; const H = top + n * rh;
    let d = ''; pts.forEach((p, i) => { const x = p / 100 * W, y = top + i * rh + rh / 2; if (!i) d = `M${x} ${y}`; else { const px = pts[i - 1] / 100 * W, py = top + (i - 1) * rh + rh / 2; d += ` C${px} ${py + rh * .5} ${x} ${y - rh * .5} ${x} ${y}`; } });
    document.getElementById('road').outerHTML = `<svg id="road" class="road" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="#8C6A45" stroke-width="58" stroke-linecap="round" opacity=".55"/><path d="${d}" fill="none" stroke="#E8CFA2" stroke-width="44" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#C9A877" stroke-width="3" stroke-dasharray="10 12" stroke-linecap="round"/></svg>`; };
  const placeTiles = () => { const W = path.clientWidth; for (const t of tiles) { const tw = t.offsetWidth, nx = t._x / 100 * W; let x = t._l ? nx + 86 : nx - 86 - tw; x = Math.max(10, Math.min(W - tw - 10, x)); t.style.left = x + 'px'; } };
  drawRoad(); placeTiles(); addEventListener('resize', () => { drawRoad(); placeTiles(); });
  const sc = document.getElementById('scroller');
  requestAnimationFrame(() => { const target = curEl || path.lastElementChild; sc.scrollTop = Math.max(0, target.offsetTop - sc.clientHeight / 2 + target.offsetHeight / 2 + 40); });
  const go = document.getElementById('go'), bubble = document.getElementById('say');
  const next = cur || state.filter(x => x.st !== 'locked').slice(-1)[0];
  bubble.textContent = next ? (next.st === 'done' ? 'Play again: ' + next.ls.name : "Let's play: " + next.ls.name) : 'Coming soon!';
  go.setAttribute('aria-label', next ? 'Play ' + next.ls.name : 'Play'); go.onclick = () => next && open(next);
  document.getElementById('wick').onclick = () => { if (next) El.Voice.say(next.ls.say || next.ls.name, { rate: 1 }); const w = document.getElementById('wick'); w.classList.remove('cheer'); void w.offsetWidth; w.classList.add('cheer'); };
})();
